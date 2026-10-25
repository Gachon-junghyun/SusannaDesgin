"""수산나 픽 «모델링» 일꾼 — 블렌더 안에서 돕니다 (F26-n · 2026-10-25, `supabase/migrations/0022_maker_render.sql`).

    blender -b --factory-startup --python scripts/maker-render/blender_worker.py      (보통은 run.py 가 띄웁니다)

하는 일: Supabase 에 «그릴 것 있나»를 물어보고(`claim_maker_render`), 있으면 그 모양(글자·로고 외곽선 mm, 판, 벽)을
실제 크기로 지어 EEVEE 로 한 장 그리고, JPG 를 같은 줄에 넣습니다(`finish_maker_render`). **PC 가 물어보러 나갑니다 — 포트를 안 엽니다.**

🔴 받는 것은 숫자·경로 문자열·색뿐이고, 경로는 아래 `parse_path` 가 M·L·C·Q·Z 만 읽습니다. **받은 글자를 코드로 실행하지 않습니다.**
🔴 실측(2026-10-25, RTX 3080): 켜 둔 상태에서 한 장 약 0.3초. 처음 한 장은 셰이더 준비로 약 2.5초 — 그래서 켜자마자 빈 장면을 한 번 그려 둡니다.
환경변수: MAKER_SB_URL · MAKER_SB_ANON · MAKER_RENDER_KEY (run.py 가 `.env.local` 에서 읽어 넘깁니다).
"""
import base64
import json
import math
import os
import re
import tempfile
import time
import urllib.request

import bpy
import mathutils

URL = os.environ["MAKER_SB_URL"].rstrip("/")
ANON = os.environ["MAKER_SB_ANON"]
KEY = os.environ["MAKER_RENDER_KEY"]
OUT = os.path.join(tempfile.gettempdir(), "maker_render_out.jpg")
RES = (1280, 720)


def rpc(name, body, timeout=20):
    req = urllib.request.Request(
        f"{URL}/rest/v1/rpc/{name}",
        data=json.dumps(body).encode("utf-8"),
        headers={"apikey": ANON, "Authorization": f"Bearer {ANON}", "Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=timeout) as r:
        raw = r.read()
    return json.loads(raw) if raw else None


# ------------------------------------------------------------------ 경로 → 커브

CMD = re.compile(r"[MLCQZmlcqz]")


def parse_path(d):
    """SVG 경로(메이커가 만든 절대 좌표 M·L·C·Q·Z) → 닫힌 조각들. 조각 = [(점, 들어오는 손잡이, 나가는 손잡이)]"""
    toks = re.findall(r"[MLCQZmlcqz]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?", d or "")
    subs, cur, i, cmd, last = [], None, 0, None, (0.0, 0.0)

    def num():
        nonlocal i
        v = float(toks[i]); i += 1
        return v

    while i < len(toks):
        t = toks[i]
        if CMD.fullmatch(t):
            cmd = t.upper(); i += 1
            if cmd == "Z":
                if cur and len(cur) > 1:
                    if math.dist(cur[0][0], cur[-1][0]) < 1e-6:
                        cur[0][1] = cur[-1][1]
                        cur.pop()
                    subs.append(cur)
                cur = None
            continue
        if cmd == "M":
            if cur and len(cur) > 1:
                subs.append(cur)
            last = (num(), num()); cur = [[last, last, last]]; cmd = "L"
        elif cmd == "L":
            p = (num(), num()); cur.append([p, p, p]); last = p
        elif cmd == "C":
            c1 = (num(), num()); c2 = (num(), num()); p = (num(), num())
            cur[-1][2] = c1; cur.append([p, c2, p]); last = p
        elif cmd == "Q":
            q = (num(), num()); p = (num(), num())
            c1 = (last[0] + 2 / 3 * (q[0] - last[0]), last[1] + 2 / 3 * (q[1] - last[1]))
            c2 = (p[0] + 2 / 3 * (q[0] - p[0]), p[1] + 2 / 3 * (q[1] - p[1]))
            cur[-1][2] = c1; cur.append([p, c2, p]); last = p
        else:
            i += 1
    if cur and len(cur) > 1:
        subs.append(cur)
    return subs


_mats = {}


def mat(hexc, rough=0.55, metal=0.0):
    k = (hexc, rough, metal)
    if k in _mats:
        return _mats[k]
    h = (hexc or "#888888").lstrip("#")
    h = h if len(h) == 6 else "888888"
    rgb = [((int(h[j:j + 2], 16) / 255) ** 2.2) for j in (0, 2, 4)]
    m = bpy.data.materials.new(f"m{len(_mats)}"); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*rgb, 1); b.inputs["Roughness"].default_value = rough; b.inputs["Metallic"].default_value = metal
    _mats[k] = m
    return m


def curve_obj(name, paths, w, h, depth, color):
    """아이템 좌표(mm, 왼쪽 위 0,0) 의 경로들 → 가운데 기준 2D 커브(m) → 앞뒤로 depth/2 씩 두께"""
    cu = bpy.data.curves.new(name, "CURVE"); cu.dimensions = "2D"; cu.fill_mode = "BOTH"
    cu.extrude = max(0.0005, depth / 2000.0); cu.resolution_u = 6
    for d in paths:
        for sub in parse_path(d):
            sp = cu.splines.new("BEZIER"); sp.bezier_points.add(len(sub) - 1); sp.use_cyclic_u = True
            for bp, (p, hin, hout) in zip(sp.bezier_points, sub):
                f = lambda q: ((q[0] - w / 2) / 1000.0, -(q[1] - h / 2) / 1000.0, 0.0)
                bp.co = f(p); bp.handle_left = f(hin); bp.handle_right = f(hout)
                bp.handle_left_type = bp.handle_right_type = "FREE"
    ob = bpy.data.objects.new(name, cu); bpy.context.scene.collection.objects.link(ob)
    cu.materials.append(mat(color))
    return ob


def place(ob, x, y, wall_h, front_y, rot):
    ob.rotation_euler = (math.pi / 2, math.radians(rot or 0), 0)
    ob.location = (x / 1000.0, front_y, (wall_h - y) / 1000.0)


def box(name, w, h, d, cx, cy, cz, color):
    me = bpy.data.meshes.new(name)
    x0, x1, y0, y1, z0, z1 = cx - w / 2, cx + w / 2, cy - d / 2, cy + d / 2, cz - h / 2, cz + h / 2
    v = [(x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0), (x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1)]
    f = [(0, 1, 2, 3), (4, 7, 6, 5), (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)]
    me.from_pydata(v, [], f); me.materials.append(mat(color, 0.8))
    ob = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(ob)
    return ob


# ------------------------------------------------------------------ 장면

def setup():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = "BLENDER_EEVEE"
    sc.eevee.taa_render_samples = 24
    sc.render.resolution_x, sc.render.resolution_y = RES; sc.render.resolution_percentage = 100
    sc.render.image_settings.file_format = "JPEG"; sc.render.image_settings.quality = 84
    sc.view_settings.view_transform = "Standard"  # 손님이 고른 색(도료 번호)이 바래지 않게
    w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True
    w.node_tree.nodes["Background"].inputs[0].default_value = (0.85, 0.87, 0.9, 1)
    w.node_tree.nodes["Background"].inputs[1].default_value = 0.55
    sun = bpy.data.lights.new("sun", "SUN"); sun.energy = 2.6; sun.angle = math.radians(6)
    so = bpy.data.objects.new("sun", sun); sc.collection.objects.link(so); so.rotation_euler = (math.radians(55), math.radians(-25), math.radians(-20))
    cam = bpy.data.cameras.new("cam"); cam.lens = 50
    co = bpy.data.objects.new("cam", cam); sc.collection.objects.link(co); sc.camera = co


def clear():
    for ob in list(bpy.data.objects):
        if ob.type in ("CURVE", "MESH") or (ob.type == "LIGHT" and ob.name != "sun"):
            bpy.data.objects.remove(ob, do_unlink=True)
    for l in list(bpy.data.lights):
        if l.users == 0:
            bpy.data.lights.remove(l)
    for c in list(bpy.data.curves):
        if c.users == 0:
            bpy.data.curves.remove(c)
    for m in list(bpy.data.meshes):
        if m.users == 0:
            bpy.data.meshes.remove(m)


def build(p):
    clear()
    wall = p.get("wall") or {}
    W, H = float(wall.get("w", 8000)), float(wall.get("h", 4000))
    kind = p.get("kind") or {}
    depth = float(kind.get("depth") or 20)
    standoff = float(kind.get("standoff") or 0)
    items = [it for it in p.get("items", []) if isinstance(it, dict)][:200]
    xs0 = [float(it["x"]) - float(it["w"]) / 2 for it in items]; xs1 = [float(it["x"]) + float(it["w"]) / 2 for it in items]
    ys0 = [float(it["y"]) - float(it["h"]) / 2 for it in items]; ys1 = [float(it["y"]) + float(it["h"]) / 2 for it in items]
    bx0, bx1, by0, by1 = min(xs0), max(xs1), min(ys0), max(ys1)
    bw, bh = bx1 - bx0, by1 - by0
    # 벽 — 간판 둘레보다 넉넉하게(벽 끝이 화면에 안 걸리게)
    cx, cz = (bx0 + bx1) / 2000.0, (H - (by0 + by1) / 2) / 1000.0
    box("wall", max(bw * 4, 6000) / 1000.0, max(bh * 6, 4000) / 1000.0, 0.2, cx, 0.1, cz, wall.get("color") or "#e6e3dc")

    plates = []
    board = p.get("board")
    if isinstance(board, dict):
        bt = 40.0
        box("board", board["w"] / 1000.0, board["h"] / 1000.0, bt / 1000.0, (board["x"] + board["w"] / 2) / 1000.0, -bt / 2000.0, (H - board["y"] - board["h"] / 2) / 1000.0, board.get("color") or "#1b1d1c")
        plates.append((board["x"], board["y"], board["x"] + board["w"], board["y"] + board["h"], bt))
    for k, it in enumerate(items):
        if it.get("type") != "plate":
            continue
        tp = float(it.get("bodyMm") or 60)  # 판 몸통 깊이 — 뮤제드폴 90 = 몰딩 30 + 프레임 60(제안서 DETAIL)
        ob = curve_obj(f"plate{k}", [q.get("d", "") for q in it.get("paths", [])], float(it["w"]), float(it["h"]), tp, it.get("fill") or "#1b1d1c")
        place(ob, float(it["x"]), float(it["y"]), H, -tp / 2000.0, it.get("rot"))
        x, y, w, h = float(it["x"]), float(it["y"]), float(it["w"]), float(it["h"])
        top = (H - (y - h / 2)) / 1000.0
        cm, chh = float(it.get("corniceMm") or 0), float(it.get("corniceH") or 50)
        rect_wall = not it.get("rot") and (it.get("mount") or "wall") == "wall"
        if cm > 0 and rect_wall:
            # 코니스(처마) — 판 위 끝에서 벽으로부터 cm 만큼 나온 판. 앞면 높이 chh (제안서 SIDE VIEW 200)
            box(f"cor{k}", w / 1000.0, chh / 1000.0, cm / 1000.0, x / 1000.0, -cm / 2000.0, top - chh / 2000.0, it.get("fill") or "#1b1d1c")
            # 간접등 — 코니스 아래, 판 앞면 바로 앞. 아래로 판 얼굴을 비춥니다(3000K 쪽 따뜻한 빛)
            n = int(it.get("lights") or 0)
            for j in range(max(0, min(12, n))):
                lx = (x - w / 2 + w * (j + 0.5) / n) / 1000.0
                ly = -(tp + (cm - tp) * 0.35) / 1000.0
                lz = top - chh / 1000.0 - 0.006
                box(f"lt{k}_{j}", 0.1, 0.008, 0.03, lx, ly, lz, "#2a2a2a")
                L = bpy.data.lights.new(f"L{k}_{j}", "SPOT"); L.energy = 18; L.color = (1.0, 0.78, 0.52)
                L.spot_size = math.radians(115); L.spot_blend = 0.85; L.shadow_soft_size = 0.03
                lo = bpy.data.objects.new(f"L{k}_{j}", L); bpy.context.scene.collection.objects.link(lo)
                lo.location = (lx, ly, lz - 0.01); lo.rotation_euler = (math.radians(-12), 0, 0)
        bm = float(it.get("borderMm") or 0)
        if it.get("border") and bm > 0 and rect_wall:
            # 몰딩 — 판 앞면에서 12mm 튀어나온 가는 테(제안서 정면도의 안쪽 선). 코니스가 있으면 위 테는 코니스 띠 바로 아래
            fy = -(tp + 6) / 1000.0; t = 12 / 1000.0; c = it.get("border")
            itop = top - (chh / 1000.0 if cm > 0 else bm / 1000.0)
            ibot = (H - (y + h / 2) + bm) / 1000.0
            ix, iz, izc = (w - 2 * bm) / 1000.0, itop - ibot, (itop + ibot) / 2
            box(f"mt{k}", ix, t, t, x / 1000.0, fy, itop, c); box(f"mb{k}", ix, t, t, x / 1000.0, fy, ibot, c)
            box(f"ml{k}", t, iz, t, x / 1000.0 - ix / 2, fy, izc, c); box(f"mr{k}", t, iz, t, x / 1000.0 + ix / 2, fy, izc, c)
        plates.append((float(it["x"]) - float(it["w"]) / 2, float(it["y"]) - float(it["h"]) / 2, float(it["x"]) + float(it["w"]) / 2, float(it["y"]) + float(it["h"]) / 2, tp))

    for k, it in enumerate(items):
        if it.get("type") not in ("text", "logo"):
            continue
        x, y = float(it["x"]), float(it["y"])
        base = 0.0
        on_plate = False
        for (a0, b0, a1, b1, t) in plates:
            if a0 <= x <= a1 and b0 <= y <= b1:
                base = max(base, t); on_plate = True
        gap = 0.0 if on_plate else standoff  # 판 위 글자는 판에 바로 붙습니다(뮤제드폴 5mm 아크릴)
        by_color = {}
        for q in it.get("paths", []):
            by_color.setdefault(q.get("color") or "#1b1d1c", []).append(q.get("d", ""))
        for j, (color, ds) in enumerate(by_color.items()):
            ob = curve_obj(f"t{k}_{j}", ds, float(it["w"]), float(it["h"]), depth, color)
            place(ob, x, y, H, -(base + gap + depth / 2) / 1000.0, it.get("rot"))

    # 카메라 — 간판을 정면에서 18° 오른쪽, 살짝 아래에서 봅니다. 가로 1.45배가 화면에 들어오게
    sc = bpy.context.scene
    cam = sc.camera
    hf = 2 * math.atan(18 / cam.data.lens)
    fitw = (bw / 1000.0) * 1.45 / 2 / math.tan(hf / 2)
    fith = (bh / 1000.0) * 1.9 / 2 / math.tan(hf / 2 * RES[1] / RES[0])
    dist = max(fitw, fith, 1.2)
    a = math.radians(18)
    tx, tz = cx, cz
    cam.location = (tx + dist * math.sin(a), -dist * math.cos(a), tz - dist * 0.08)
    # 카메라 -Z 가 간판 가운데를 보게
    look = mathutils.Vector((tx - cam.location[0], 0 - cam.location[1], tz - cam.location[2]))
    cam.rotation_euler = look.to_track_quat("-Z", "Y").to_euler()


def render_b64():
    bpy.context.scene.render.filepath = OUT
    bpy.ops.render.render(write_still=True)
    with open(OUT, "rb") as f:
        return base64.b64encode(f.read()).decode("ascii")


def main():
    setup()
    # 셰이더 준비 — 첫 손님이 2.5초를 기다리지 않게
    build({"wall": {"w": 4000, "h": 2000}, "items": [{"type": "text", "x": 2000, "y": 1000, "w": 500, "h": 200, "paths": [{"d": "M0,0L500,0L500,200L0,200Z", "color": "#1b1d1c"}]}]})
    render_b64()
    print("[모델링 일꾼] 준비됨", flush=True)
    idle_since = time.time()
    while True:
        try:
            rows = rpc("claim_maker_render", {"p_key": KEY}) or []
        except Exception as e:  # 인터넷이 잠깐 끊겨도 일꾼은 안 죽습니다
            print("[모델링 일꾼] 물어보기 실패:", e, flush=True)
            time.sleep(3)
            continue
        if not rows:
            time.sleep(0.25 if time.time() - idle_since < 120 else 2.0)
            continue
        row = rows[0]
        t0 = time.perf_counter()
        try:
            build(row["payload"])
            jpg = render_b64()
            ms = int((time.perf_counter() - t0) * 1000)
            rpc("finish_maker_render", {"p_key": KEY, "p_id": row["id"], "p_jpg": jpg, "p_ms": ms, "p_error": ""})
            print(f"[모델링 일꾼] 그림 {row['id'][:8]} {ms}ms {len(jpg) // 1024}KB", flush=True)
        except Exception as e:
            print("[모델링 일꾼] 그리기 실패:", e, flush=True)
            try:
                rpc("finish_maker_render", {"p_key": KEY, "p_id": row["id"], "p_jpg": None, "p_ms": None, "p_error": str(e)[:400]})
            except Exception:
                pass
        idle_since = time.time()


main()
