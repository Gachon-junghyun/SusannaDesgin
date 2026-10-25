"""수산나 픽 «모델링» 일꾼 띄우기 — 이 PC 에서 (F26-n · 2026-10-25).

    python scripts/maker-render/run.py          # 블렌더를 켜 두고 손님 요청을 기다립니다(죽으면 3초 뒤 다시 띄움)
    python scripts/maker-render/run.py --key    # 일꾼 열쇠를 새로 만들어 .env.local 에 넣고, DB 에 넣을 sha256 만 보여 줍니다

읽는 것: 저장소 루트 `.env.local` 의 NEXT_PUBLIC_SUPABASE_URL · NEXT_PUBLIC_SUPABASE_ANON_KEY · MAKER_RENDER_KEY
(`.env*` 는 깃에 안 올라갑니다). 블렌더는 MAKER_BLENDER 가 있으면 그것, 없으면 %LOCALAPPDATA%\\Programs\\Blender 에서 가장 새 것.
🔴 열쇠 원문은 화면·로그·DB 어디에도 내보내지 않습니다 — DB 에는 해시만(`0022` 머리말 «열쇠 넣기»).
"""
import glob
import hashlib
import os
import secrets
import subprocess
import sys
import time

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
ENV = os.path.join(ROOT, ".env.local")
HERE = os.path.dirname(os.path.abspath(__file__))


def read_env():
    out = {}
    if os.path.exists(ENV):
        for line in open(ENV, encoding="utf-8"):
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                out[k.strip()] = v.strip().strip('"').strip("'")
    return out


def blender():
    b = os.environ.get("MAKER_BLENDER")
    if b and os.path.exists(b):
        return b
    found = sorted(glob.glob(os.path.expandvars(r"%LOCALAPPDATA%\Programs\Blender\*\blender.exe")))
    if not found:
        sys.exit("블렌더를 못 찾았습니다 — MAKER_BLENDER 에 blender.exe 경로를 넣으세요.")
    return found[-1]


def make_key():
    env = read_env()
    if env.get("MAKER_RENDER_KEY"):
        key = env["MAKER_RENDER_KEY"]
        print("이미 열쇠가 있습니다(.env.local). 그 해시:")
    else:
        key = secrets.token_hex(32)
        with open(ENV, "a", encoding="utf-8") as f:
            f.write(f"\n# 수산나 픽 모델링 일꾼 열쇠 (0022) — 원문은 여기만. DB 에는 sha256 만\nMAKER_RENDER_KEY={key}\n")
        print("새 열쇠를 .env.local 에 넣었습니다. DB 에 넣을 해시:")
    print(hashlib.sha256(key.encode("utf-8")).hexdigest())


def main():
    if "--key" in sys.argv:
        return make_key()
    env = read_env()
    need = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "MAKER_RENDER_KEY"]
    miss = [k for k in need if not env.get(k)]
    if miss:
        sys.exit(f".env.local 에 없습니다: {', '.join(miss)} (열쇠는 --key 로 만듭니다)")
    child_env = dict(os.environ, MAKER_SB_URL=env[need[0]], MAKER_SB_ANON=env[need[1]], MAKER_RENDER_KEY=env[need[2]], PYTHONIOENCODING="utf-8")
    exe = blender()
    while True:
        print(f"[모델링 일꾼] 블렌더 띄움: {exe}", flush=True)
        p = subprocess.run([exe, "-b", "--factory-startup", "--python", os.path.join(HERE, "blender_worker.py")], env=child_env)
        print(f"[모델링 일꾼] 블렌더가 끝났습니다(코드 {p.returncode}) — 3초 뒤 다시 띄웁니다", flush=True)
        time.sleep(3)


if __name__ == "__main__":
    main()
