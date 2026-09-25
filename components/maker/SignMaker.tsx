"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { fontGroups, specimenFonts } from "@/config/fonts";
import {
  boardColors,
  faceColors,
  INCOMING_LOGO_KEY,
  ledColors,
  MAKER_STORAGE_KEY,
  makerKinds,
  sideColors,
  trimColors,
  walls,
} from "@/config/maker";
import {
  composeJpeg,
  defaultDesign,
  download,
  fabricationSvg,
  fmtMm,
  judgeItem,
  kindOf,
  LEVEL_LABEL,
  newId,
  summarize,
  worst,
  type Design,
  type FontRef,
  type GlyphOv,
  type Item,
  type Level,
  type LogoItem,
  type Measured,
  type Note,
  type Placed,
  type TextItem,
} from "@/lib/maker/design";
import { fabCheck, type FabResult } from "@/lib/maker/fab";
import {
  fontDisplayName,
  layoutLines,
  listLocalFonts,
  loadFontBlob,
  loadFontUrl,
  localFontsSupported,
  type LocalFont,
  type Outline,
} from "@/lib/maker/fonts";
import { apply, homography, mapPath, mul, rotateAt, scaleAt, translate, type Affine, type Pt } from "@/lib/maker/geom";
import { bbox, imageDataOf, layersFromImage, toPathD, traceGray, type Contour } from "@/lib/maker/trace";

import Stage, { type Calib, type RItem, type RPath, type View } from "./Stage";

/**
 * 수산나 메이커 — 간판 에디터 본체 (F26 · 2026-09-25).
 *
 * 🔴 **모드 둘, 부품 하나.** 관리자(`/admin/maker`)와 손님(`/maker`)이 같은 부품을 씁니다 —
 * 두 벌로 만들면 고장도 두 벌입니다(F5 의 간편 폼 `idPrefix` 사고와 같은 이유).
 * 갈리는 건 셋뿐입니다: 글꼴 목록(관리자는 이 PC 글꼴·파일까지) · 내보내기(관리자는 SVG) · 마지막 버튼.
 *
 * 배치의 출처(2026-09-25 조사): Figma 커뮤니티 «Design Editor UI Design»(CC BY 4.0)의 «왼쪽 넣기 · 가운데 캔버스 ·
 * 오른쪽 속성» 3단 + 편집기 공통의 눈금자·확대. 기능의 출처: 채널간판 메이커 4곳 공통의 주간/야간·치수선,
 * 부위별 색(앞면·옆면·트림), SignMonkey 의 «가게 사진 + 십자선 축척 보정 + 가리기 판», Kings of Neon 의
 * «사진은 서버에 안 올린다», 포토샵의 회전·왜곡(네 점) — 마지막은 사람이 직접 짚었습니다.
 *
 * 🔴 **손님이 올린 가게 사진·로고는 이 브라우저 밖으로 안 나갑니다** — 견적을 «보낼 때» 미리보기 그림으로 첨부될 뿐입니다.
 */

type Mode = "admin" | "customer";
type TextOut = { key: string; outline: Outline; fontName: string };

const STORE = (mode: Mode) => `susanna-maker-draft-v2-${mode}`;

function loadDraft(mode: Mode): Design {
  try {
    const raw = localStorage.getItem(STORE(mode));
    if (raw) {
      const d = JSON.parse(raw) as Design;
      if (d && Array.isArray(d.items)) return { ...defaultDesign(), ...d, wall: d.wall === "photo" || !walls.some((w) => w.key === d.wall) ? "white" : d.wall };
    }
  } catch {
    /* 저장소가 막힌 브라우저 — 기본값으로 */
  }
  return defaultDesign();
}

/** 글자 한 자의 꾸밈 → 아핀 (글자 중심 기준 크기·회전 뒤 이동) */
function glyphAffine(g: { x0: number; y0: number; w: number; h: number }, ov?: GlyphOv): Affine | null {
  if (!ov || (!ov.dx && !ov.dy && (ov.scale ?? 1) === 1 && !ov.rot)) return null;
  const cx = g.x0 + g.w / 2, cy = g.y0 + g.h / 2;
  return mul(translate(ov.dx ?? 0, ov.dy ?? 0), mul(rotateAt(ov.rot ?? 0, cx, cy), scaleAt(ov.scale ?? 1, cx, cy)));
}

export default function SignMaker({ mode }: { mode: Mode }) {
  const router = useRouter();
  const admin = mode === "admin";

  /* ---------------------------------------------------------- 디자인 + 되돌리기 */
  const [hist, setHist] = useState(() => ({ past: [] as Design[], now: loadDraft(mode), future: [] as Design[] }));
  const d = hist.now;
  const dragBase = useRef<Design | null>(null);

  const commit = useCallback((next: Design | ((p: Design) => Design)) => {
    setHist((h) => {
      const n = typeof next === "function" ? next(h.now) : next;
      const base = dragBase.current ?? h.now;
      dragBase.current = null;
      return { past: [...h.past.slice(-80), base], now: n, future: [] };
    });
  }, []);
  /** 끄는 중 — 되돌리기 목록에 안 쌓고 화면만 바꿉니다. 손을 떼면 `commit` */
  const live = useCallback((next: (p: Design) => Design) => {
    setHist((h) => {
      if (!dragBase.current) dragBase.current = h.now;
      return { ...h, now: next(h.now) };
    });
  }, []);
  const undo = () => setHist((h) => (h.past.length ? { past: h.past.slice(0, -1), now: h.past[h.past.length - 1], future: [h.now, ...h.future] } : h));
  const redo = () => setHist((h) => (h.future.length ? { past: [...h.past, h.now], now: h.future[0], future: h.future.slice(1) } : h));
  const patchDesign = (patch: Partial<Design>) => commit((p) => ({ ...p, ...patch }));

  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(STORE(mode), JSON.stringify(d));
      } catch {
        /* 용량 초과(큰 로고) — 저장만 건너뜁니다 */
      }
    }, 400);
    return () => clearTimeout(t);
  }, [d, mode]);

  const setItem = (id: string, patch: Partial<Item>, isLive = false) => {
    const f = (p: Design): Design => ({ ...p, items: p.items.map((it) => (it.id === id ? ({ ...it, ...patch } as Item) : it)) });
    if (isLive) live(f);
    else commit(f);
  };

  /* ---------------------------------------------------------- 화면 상태 */
  const [selected, setSelected] = useState<string | null>(d.items[0]?.id ?? null);
  const [glyph, setGlyph] = useState<number | null>(null);
  const [warpMode, setWarpMode] = useState(false);
  const [night, setNight] = useState(false);
  const [ledOn, setLedOn] = useState(true);
  const [dims, setDims] = useState(true);
  const [photo, setPhoto] = useState<{ url: string; w: number; h: number } | null>(null);
  const [calib, setCalib] = useState<Calib | null>(null);
  const [calibMm, setCalibMm] = useState("2100");
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [canvasPx, setCanvasPx] = useState({ w: 800, h: 500 });
  const [view, setView] = useState<View>({ x: -d.wallW * 0.06, y: -d.wallH * 0.1, w: d.wallW * 1.12 });
  const svgRef = useRef<SVGSVGElement>(null);
  const fitted = useRef(false);
  const kind = kindOf(d);

  const select = (id: string | null) => {
    setSelected(id);
    setGlyph(null);
    if (!id) setWarpMode(false);
  };

  const fit = useCallback(
    (wallW = d.wallW, wallH = d.wallH, px = canvasPx) => {
      const aspect = px.w / px.h;
      const w = Math.max(wallW * 1.1, wallH * 1.16 * aspect);
      const h = w / aspect;
      setView({ x: (wallW - w) / 2, y: (wallH - h) / 2, w });
    },
    [d.wallW, d.wallH, canvasPx],
  );

  /* ---------------------------------------------------------- 글꼴 → 외곽선 */
  const [texts, setTexts] = useState<Map<string, TextOut>>(new Map());
  const [fontErr, setFontErr] = useState<Map<string, string>>(new Map());
  const [localFonts, setLocalFonts] = useState<LocalFont[] | null>(null);
  const fileFonts = useRef(new Map<string, Blob>());
  const logoSrc = useRef(new Map<string, ImageData>());

  const fontLabel = useCallback((f: FontRef) => (f.src === "lib" ? specimenFonts.find((s) => s.slug === f.slug)?.name ?? f.slug : f.name), []);

  useEffect(() => {
    let alive = true;
    for (const it of d.items) {
      if (it.type !== "text") continue;
      const key = JSON.stringify([it.lines, it.font]);
      if (texts.get(it.id)?.key === key) continue;
      (async () => {
        try {
          const f = it.font;
          let font;
          if (f.src === "lib") {
            const s = specimenFonts.find((x) => x.slug === f.slug);
            if (!s) throw new Error("목록에 없는 글꼴입니다");
            font = await loadFontUrl(s.file);
          } else if (f.src === "local") {
            const lf = (localFonts ?? []).find((x) => x.key === f.key);
            if (!lf) throw new Error("이 PC 글꼴 목록을 다시 불러오세요 (새로고침하면 목록이 비워집니다)");
            font = await loadFontBlob(f.key, await lf.get());
          } else {
            const b = fileFonts.current.get(f.key);
            if (!b) throw new Error("올린 글꼴 파일이 이 탭에 없습니다 — 다시 올려 주세요");
            font = await loadFontBlob(f.key, b);
          }
          const outline = layoutLines(font, it.lines);
          if (!alive) return;
          setTexts((m) => new Map(m).set(it.id, { key, outline, fontName: f.src === "lib" ? fontLabel(f) : fontDisplayName(font) }));
          setFontErr((m) => {
            const n = new Map(m);
            n.delete(it.id);
            return n;
          });
        } catch (e) {
          if (alive) setFontErr((m) => new Map(m).set(it.id, (e as Error).message));
        }
      })();
    }
    return () => {
      alive = false;
    };
  }, [d.items, texts, localFonts, fontLabel]);

  /* ---------------------------------------------------------- 반듯한 모양 (판정·제작용 SVG 의 원본) */
  type Local = { size: Measured; paths: RPath[]; glyphBoxes: Record<number, Pt[]>; lines?: Outline["lines"]; letterH: number };
  const locals = useMemo(() => {
    const m = new Map<string, Local>();
    for (const it of d.items) {
      if (it.type === "patch") {
        m.set(it.id, { size: { w: it.w, h: it.h }, paths: [{ d: `M0,0L${it.w},0L${it.w},${it.h}L0,${it.h}Z`, color: it.color }], glyphBoxes: {}, letterH: 0 });
      } else if (it.type === "logo") {
        const k = it.w / Math.max(1, it.srcW);
        m.set(it.id, {
          size: { w: it.w, h: it.srcH * k },
          paths: it.layers.map((l) => ({ d: mapPath(l.d, (p) => [p[0] * k, p[1] * k]), color: l.color })),
          glyphBoxes: {},
          letterH: it.srcH * k,
        });
      } else {
        const t = texts.get(it.id);
        if (!t) continue;
        const glyphBoxes: Record<number, Pt[]> = {};
        const paths: RPath[] = t.outline.glyphs.map((g) => {
          const ov = it.glyphs?.[g.i];
          const A = glyphAffine(g, ov);
          const corners: Pt[] = [[g.x0, g.y0], [g.x0 + g.w, g.y0], [g.x0 + g.w, g.y0 + g.h], [g.x0, g.y0 + g.h]];
          glyphBoxes[g.i] = A ? corners.map((c) => apply(A, c)) : corners;
          return { d: A ? mapPath(g.d, (p) => apply(A, p)) : g.d, color: ov?.color ?? it.face, glyph: g.i };
        });
        m.set(it.id, { size: { w: t.outline.w, h: t.outline.h }, paths, glyphBoxes, lines: t.outline.lines, letterH: Math.max(...it.lines.map((l) => l.heightMm)) });
      }
    }
    return m;
  }, [d.items, texts]);

  /* ---------------------------------------------------------- 벽 위로 (회전·원근) */
  const ritems: RItem[] = useMemo(
    () =>
      d.items.flatMap((it): RItem[] => {
        const L = locals.get(it.id);
        if (!L) return [];
        const { w, h } = L.size;
        const rect: Pt[] = [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]];
        const H = it.warp && it.warp.length === 4 ? homography(rect, it.warp as Pt[]) : null;
        const R = rotateAt(it.rot ?? 0, 0, 0);
        const toWorld = (p: Pt): Pt => {
          const c: Pt = [p[0] - w / 2, p[1] - h / 2];
          const q = H ? H(c) : apply(R, c);
          return [q[0] + it.x, q[1] + it.y];
        };
        const bars: Pt[][] = [];
        if (it.type === "text" && d.bar && (kind.lit === "front" || kind.lit === "both") && L.lines)
          for (const lb of L.lines) {
            const pad = lb.h * 0.25, bh = lb.h * 0.32, cy = lb.y0 + lb.h / 2;
            const r4: Pt[] = [[lb.x0 - pad, cy - bh / 2], [lb.x0 + lb.w + pad, cy - bh / 2], [lb.x0 + lb.w + pad, cy + bh / 2], [lb.x0 - pad, cy + bh / 2]];
            bars.push(r4.map(toWorld));
          }
        const glyphQuads: Record<number, Pt[]> = {};
        for (const [k, q] of Object.entries(L.glyphBoxes)) glyphQuads[Number(k)] = q.map(toWorld);
        const corners: Pt[] = [[0, 0], [w, 0], [w, h], [0, h]];
        return [
          {
            id: it.id,
            type: it.type,
            size: L.size,
            world: L.paths.map((q) => ({ ...q, d: mapPath(q.d, toWorld) })),
            quad: corners.map(toWorld),
            cx: it.x,
            cy: it.y,
            letterH: L.letterH,
            bars,
            glyphQuads,
            warped: !!H || !!it.rot,
          },
        ];
      }),
    [d.items, d.bar, locals, kind.lit],
  );

  /** 바탕판 (T5) — 글자 폭을 먼저 재고 판을 거기 맞춥니다(SIGNTYPES.md §8-3 «바탕판을 먼저 정하지 마라») */
  const board = useMemo(() => {
    if (!kind.backboard) return null;
    const s = ritems.filter((q) => q.type !== "patch");
    if (!s.length) return null;
    const xs = s.flatMap((q) => q.quad.map((v) => v[0])), ys = s.flatMap((q) => q.quad.map((v) => v[1]));
    const lh = Math.max(200, ...s.map((q) => q.letterH));
    const pad = d.boardPad ?? 0.8, mx = lh * pad, my = lh * pad * 0.5;
    return { x: Math.min(...xs) - mx, y: Math.min(...ys) - my, w: Math.max(...xs) - Math.min(...xs) + mx * 2, h: Math.max(...ys) - Math.min(...ys) + my * 2 };
  }, [kind.backboard, ritems, d.boardPad]);

  const overall: Measured | null = useMemo(() => {
    if (board) return { w: board.w, h: board.h };
    const s = ritems.filter((q) => q.type !== "patch");
    if (!s.length) return null;
    const xs = s.flatMap((q) => q.quad.map((v) => v[0])), ys = s.flatMap((q) => q.quad.map((v) => v[1]));
    return { w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
  }, [ritems, board]);

  /* ---------------------------------------------------------- 판정 (조금 늦게 — 모양이 바뀐 것만) */
  const [fabs, setFabs] = useState<Map<string, FabResult | null>>(new Map());
  const fabKey = d.items
    .filter((it) => it.type !== "patch")
    .map((it) => {
      const L = locals.get(it.id);
      return `${it.id}:${L?.size.w.toFixed(0)}x${L?.size.h.toFixed(0)}:${L?.paths.reduce((s, q) => s + q.d.length, 0)}`;
    })
    .join("|");
  useEffect(() => {
    const t = setTimeout(() => {
      const m = new Map<string, FabResult | null>();
      for (const it of d.items) {
        if (it.type === "patch") continue;
        const L = locals.get(it.id);
        if (!L || !L.paths.length) continue;
        m.set(it.id, fabCheck(L.paths.map((q) => q.d).join(""), { x0: 0, y0: 0, w: L.size.w, h: L.size.h }, 1));
      }
      setFabs(m);
    }, 450);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 모양이 «바뀐 것»만 봅니다(위치 이동은 판정과 무관)
  }, [fabKey]);

  const notes = useMemo(() => {
    const m = new Map<string, Note[]>();
    for (const it of d.items) {
      if (it.type === "patch") continue;
      const t = it.type === "text" ? texts.get(it.id) : null;
      const minLetter = it.type === "text" ? Math.min(...it.lines.map((l) => l.heightMm)) : locals.get(it.id)?.size.h;
      const n = judgeItem(it, kind, fabs.get(it.id) ?? null, { minLetterMm: minLetter, missing: t?.outline.missing });
      const fe = fontErr.get(it.id);
      if (fe) n.unshift({ level: "no", text: fe });
      m.set(it.id, n);
    }
    return m;
  }, [d.items, texts, fabs, kind, fontErr, locals]);

  const allNotes = [...notes.values()].flat();
  if (overall && overall.w > 10000) allNotes.push({ level: "check", text: `전체 가로 ${fmtMm(overall.w)} — 벽면 간판은 보통 10m 까지입니다(지자체 조례로 다름).` });
  const verdict: Level = allNotes.length ? worst(allNotes) : "ok";

  /* ---------------------------------------------------------- 벽 */
  const wallDef = walls.find((w) => w.key === d.wall) ?? walls[0];
  const wall = d.wall === "photo" && photo ? { color: "#d9d9d6", ink: "#ffffff", photo: photo.url } : { color: wallDef.color, ink: wallDef.ink };

  function pickWall(key: string) {
    commit((p) => ({ ...p, wall: key, ...(p.wall === "photo" ? { wallW: 8000, wallH: 4000 } : {}) }));
    if (d.wall === "photo") fit(8000, 4000);
  }

  async function onPhoto(file: File) {
    const url = URL.createObjectURL(file);
    const im = new Image();
    im.src = url;
    await im.decode();
    setPhoto({ url, w: im.naturalWidth, h: im.naturalHeight });
    // 처음엔 «사진 가로 = 8m» 로 어림합니다 — 축척 보정(십자선) 전까지는 어림입니다
    const W = 8000, Hh = (W * im.naturalHeight) / im.naturalWidth;
    commit((p) => ({ ...p, wall: "photo", grid: false, wallW: W, wallH: Hh, items: p.items.map((it) => ({ ...it, x: (it.x * W) / p.wallW, y: (it.y * Hh) / p.wallH })) }));
    fit(W, Hh);
    setCalib({});
  }

  function applyCalib() {
    const mm = Number(calibMm);
    if (!calib?.a || !calib.b || !(mm > 0)) return;
    const cur = Math.hypot(calib.b[0] - calib.a[0], calib.b[1] - calib.a[1]);
    if (cur < 1) return;
    const k = mm / cur;
    // 벽이 k 배로 «실제 크기»가 됩니다. 간판의 mm 크기는 그대로 두고 자리만 같은 사진 위치로 옮깁니다
    commit((p) => ({ ...p, wallW: p.wallW * k, wallH: p.wallH * k, items: p.items.map((it) => ({ ...it, x: it.x * k, y: it.y * k })) }));
    fit(d.wallW * k, d.wallH * k);
    setCalib(null);
  }

  /* ---------------------------------------------------------- 넣기 */
  /**
   * 새로 넣는 것의 세로 자리 — 이미 있는 것들 **아래 빈자리**에 둡니다. 가운데에 겹쳐 놓으면
   * 손님은 «덮어썼다»로 읽습니다(2026-09-25 화면 확인: 로고가 상호 글자 위에 얹혔습니다).
   */
  function freeY(h: number) {
    const s = d.items.filter((it) => it.type !== "patch");
    if (!s.length) return d.wallH * 0.4;
    // 글꼴을 아직 못 받은 글자도 세야 합니다 — 막 연 화면에서 로고가 건너오면 글자 외곽선이 아직 없습니다
    const bottom = Math.max(
      ...s.map((it) => {
        const r = ritems.find((q) => q.id === it.id);
        if (r) return Math.max(...r.quad.map((v) => v[1]));
        const hh = it.type === "text" ? it.lines.reduce((a, l) => a + l.heightMm * 1.35, 0) : 0;
        return it.y + hh / 2;
      }),
    );
    const y = bottom + h / 2 + Math.max(120, h * 0.3);
    return y + h / 2 < d.wallH ? y : d.wallH * 0.4;
  }

  function addText() {
    const it: TextItem = {
      id: newId(),
      type: "text",
      lines: [{ text: "가게 이름", heightMm: 400, tracking: 0 }],
      font: { src: "lib", slug: "kcc-ganpan" },
      face: "#1b1d1c",
      x: d.wallW / 2,
      y: freeY(400),
    };
    commit((p) => ({ ...p, items: [...p.items, it] }));
    select(it.id);
  }

  function addPatch() {
    const it: Item = { id: newId(), type: "patch", x: d.wallW / 2, y: d.wallH * 0.3, w: d.wallW * 0.4, h: d.wallH * 0.12, color: "#d9d7d0" };
    commit((p) => ({ ...p, items: [...p.items, it] }));
    select(it.id);
  }

  // 로고는 비동기(파일 읽기·SVG 따기에서 건너옴)로 들어와서, 그 순간의 «빈자리» 계산을 참조로 건넵니다
  const freeYRef = useRef<((h: number) => number) | null>(null);
  useEffect(() => {
    freeYRef.current = freeY;
  });

  const addLogo = useCallback((name: string, traced: { layers: LogoItem["layers"]; srcW: number; srcH: number }, id = newId()) => {
    setHist((hh) => {
      const p = hh.now;
      const w = Math.min(p.wallW * 0.35, 1500);
      const h = (w * traced.srcH) / Math.max(1, traced.srcW);
      const it: LogoItem = { id, type: "logo", name, ...traced, w, x: p.wallW / 2, y: freeYRef.current?.(h) ?? p.wallH * 0.62 };
      return { past: [...hh.past, p], now: { ...p, items: [...p.items, it] }, future: [] };
    });
    setSelected(id);
  }, []);

  // «SVG 따기» 에서 보낸 로고 받기 — 같은 브라우저 안의 저장소로만 건너옵니다
  useEffect(() => {
    try {
      const raw = localStorage.getItem(INCOMING_LOGO_KEY);
      if (!raw) return;
      localStorage.removeItem(INCOMING_LOGO_KEY);
      const got = JSON.parse(raw) as { name: string; layers: LogoItem["layers"]; srcW: number; srcH: number };
      if (got?.layers?.length) addLogo(got.name || "로고", got);
    } catch {
      /* 저장소가 막힘 — 로고를 여기서 다시 올리면 됩니다 */
    }
  }, [addLogo]);

  async function onLogo(file: File) {
    setErr("");
    setBusy("로고를 선으로 따는 중…");
    try {
      const img = await imageDataOf(file, 900);
      const id = newId();
      logoSrc.current.set(id, img);
      const traced = retrace(img, "ink", false, 2);
      if (!traced) throw new Error("로고에서 선을 찾지 못했습니다. 배경이 밝고 로고가 진한 그림이 잘 됩니다.");
      addLogo(file.name.replace(/\.[^.]+$/, ""), traced, id);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy("");
    }
  }

  function relogo(it: LogoItem, m: "ink" | "colors", invert: boolean, k: number) {
    const img = logoSrc.current.get(it.id);
    if (!img) {
      setErr("원본 그림이 이 탭에 없습니다(새로고침하면 사라집니다) — 로고를 다시 올리거나 «SVG 따기»에서 다듬어 보내세요.");
      return;
    }
    const t = retrace(img, m, invert, k);
    if (t) setItem(it.id, t);
  }

  function remove(id: string) {
    commit((p) => ({ ...p, items: p.items.filter((it) => it.id !== id) }));
    select(null);
  }

  function duplicate(id: string) {
    const it = d.items.find((x) => x.id === id);
    if (!it) return;
    const c = { ...structuredClone(it), id: newId(), x: it.x + 150, y: it.y + 150 } as Item;
    commit((p) => ({ ...p, items: [...p.items, c] }));
    select(c.id);
  }

  function reorder(id: string, dir: 1 | -1) {
    commit((p) => {
      const i = p.items.findIndex((x) => x.id === id), j = i + dir;
      if (i < 0 || j < 0 || j >= p.items.length) return p;
      const items = [...p.items];
      [items[i], items[j]] = [items[j], items[i]];
      return { ...p, items };
    });
  }

  /* ---------------------------------------------------------- 글자 한 자 */
  const setGlyphOv = (id: string, i: number, patch: Partial<GlyphOv> | null) => {
    const it = d.items.find((x) => x.id === id);
    if (!it || it.type !== "text") return;
    const g = { ...(it.glyphs ?? {}) };
    if (patch === null) delete g[i];
    else g[i] = { ...g[i], ...patch };
    setItem(id, { glyphs: g });
  };

  /* ---------------------------------------------------------- 키보드 */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
        return;
      }
      if (mod && e.key.toLowerCase() === "d" && selected) {
        e.preventDefault();
        duplicate(selected);
        return;
      }
      if (e.key === "Escape") {
        if (glyph !== null) setGlyph(null);
        else select(null);
        return;
      }
      if (!selected) return;
      const it = d.items.find((x) => x.id === selected);
      if (!it) return;
      if ((e.key === "Delete" || e.key === "Backspace") && glyph === null) {
        e.preventDefault();
        remove(selected);
      }
      const step = e.shiftKey ? 100 : 10;
      const mv: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
      const v = mv[e.key];
      if (!v) return;
      e.preventDefault();
      if (glyph !== null && it.type === "text") {
        const ov = it.glyphs?.[glyph] ?? {};
        setGlyphOv(it.id, glyph, { dx: (ov.dx ?? 0) + v[0], dy: (ov.dy ?? 0) + v[1] });
      } else setItem(it.id, { x: it.x + v[0], y: it.y + v[1] });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  /* ---------------------------------------------------------- 끌기·크기·회전·원근 */
  const gestureBase = useRef<Item | null>(null);
  const baseOf = (id: string) => (gestureBase.current?.id === id ? gestureBase.current : (gestureBase.current = d.items.find((x) => x.id === id) ?? null));
  const endGesture = (done: boolean) => {
    if (done) gestureBase.current = null;
  };

  function onResize(id: string, f: number, done: boolean) {
    const base = baseOf(id);
    if (!base) return;
    const k = Math.max(0.1, Math.min(10, f));
    const warp = base.warp ? base.warp.map((q) => [q[0] * k, q[1] * k] as [number, number]) : base.warp;
    let patch: Partial<Item>;
    if (base.type === "text") patch = { lines: base.lines.map((l) => ({ ...l, heightMm: Math.max(20, Math.round((l.heightMm * k) / 5) * 5) })), warp };
    else if (base.type === "logo") patch = { w: Math.max(50, Math.round(base.w * k)), warp };
    else patch = { w: Math.max(50, base.w * k), h: Math.max(20, base.h * k), warp };
    setItem(id, patch, !done);
    endGesture(done);
  }

  function onRotate(id: string, deg: number, done: boolean) {
    const base = baseOf(id);
    if (!base) return;
    if (base.warp) {
      // 원근이 걸린 것은 네 점을 통째로 돌립니다 — 기준은 윗변의 지금 각도
      const w = base.warp;
      const cur = (Math.atan2(w[1][1] - w[0][1], w[1][0] - w[0][0]) * 180) / Math.PI;
      const R = rotateAt(deg - cur, 0, 0);
      setItem(id, { warp: w.map((q) => apply(R, q as Pt) as [number, number]) }, !done);
    } else setItem(id, { rot: Math.round(deg * 10) / 10 }, !done);
    endGesture(done);
  }

  function onWarp(id: string, corner: number, p: Pt, done: boolean) {
    const base = baseOf(id);
    const r = ritems.find((q) => q.id === id);
    if (!base || !r) return;
    const w = (base.warp ?? r.quad.map((q) => [q[0] - base.x, q[1] - base.y])).map((q) => [q[0], q[1]]) as [number, number][];
    w[corner] = [p[0] - base.x, p[1] - base.y];
    setItem(id, { warp: w, rot: 0 }, !done);
    endGesture(done);
  }

  /* ---------------------------------------------------------- 내보내기 · 견적 */
  const sizes = useMemo(() => new Map(ritems.map((s) => [s.id, s.size])), [ritems]);
  const ledName = ledColors.find((l) => l.hex === d.led)?.name ?? d.led;
  const wallName = d.wall === "photo" ? "가게 사진" : wallDef.name;
  const summary = () =>
    summarize(d, {
      fontName: (it) => texts.get(it.id)?.fontName ?? fontLabel(it.font),
      sizes,
      notes,
      overall,
      wallName,
      ledName,
    });
  const placed = (): Placed[] =>
    d.items.flatMap((it) => {
      if (it.type === "patch") return [];
      const L = locals.get(it.id);
      return L ? [{ it, paths: L.paths.map(({ d: pd, color }) => ({ d: pd, color })), size: L.size }] : [];
    });
  const footer = () => [
    `${kind.name}${kind.needsLed ? ` · 조명 ${ledName}` : ""}${overall ? ` · 가로 ${fmtMm(overall.w)} × 세로 ${fmtMm(overall.h)}` : ""} · ${LEVEL_LABEL[verdict]}`,
    "SUSANNA MAKER · 시안입니다. 화면의 색·밝기는 실제와 다르고, 치수·위치는 현장 실측 후 확정합니다.",
  ];

  async function snapshot(width: number) {
    const was = selected;
    select(null);
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(null))));
    try {
      return await composeJpeg(svgRef.current!, photo && d.wall === "photo" ? { src: photo.url } : { color: wall.color }, footer(), width);
    } finally {
      setSelected(was);
    }
  }

  async function exportJpeg() {
    setBusy("그림을 만드는 중…");
    try {
      download(`간판시안_${stamp()}.jpg`, await snapshot(2000));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy("");
    }
  }

  async function toQuote() {
    setBusy("견적서에 붙일 그림을 만드는 중…");
    try {
      const jpg = await snapshot(1400);
      sessionStorage.setItem(MAKER_STORAGE_KEY, JSON.stringify({ summary: summary(), svg: fabricationSvg(placed()), jpg }));
      router.push("/quote?maker=1");
    } catch (e) {
      setErr(`견적 폼으로 넘기지 못했습니다: ${(e as Error).message}`);
      setBusy("");
    }
  }

  function retrace(img: ImageData, m: "ink" | "colors", invert: boolean, k: number) {
    const layers = layersFromImage(img, m, { invert, k });
    const traced = layers.map((l) => ({ l, cs: traceGray(l.gray) })).filter((t) => t.cs.length);
    const all: Contour[] = traced.flatMap((t) => t.cs);
    if (!all.length) return null;
    const bb = bbox(all);
    return { layers: traced.map((t) => ({ name: t.l.name, color: t.l.color, d: toPathD(t.cs, 1, -bb.x0, -bb.y0) })), srcW: bb.w, srcH: bb.h };
  }

  /* ---------------------------------------------------------- 화면 */
  const sel = d.items.find((x) => x.id === selected) ?? null;
  const selText = sel?.type === "text" ? texts.get(sel.id) : null;
  const zoomPct = Math.round(((d.wallW * 1.1) / view.w) * 100);
  const zoomBy = (f: number) => setView((v) => ({ x: v.x + (v.w - v.w * f) / 2, y: v.y + ((v.w - v.w * f) * (canvasPx.h / canvasPx.w)) / 2, w: v.w * f }));

  return (
    <div className="grid gap-0 lg:h-full lg:grid-cols-[230px_minmax(0,1fr)_290px] 2xl:grid-cols-[260px_minmax(0,1fr)_320px]">
      {/* ───────── 가운데: 무대 ───────── */}
      <section className="order-1 flex min-w-0 flex-col lg:order-2 lg:min-h-0">
        <div className="flex flex-wrap items-center gap-2 border-b border-line bg-white px-3 py-2">
          <Seg value={night ? "night" : "day"} onChange={(v) => setNight(v === "night")} options={[{ v: "day", label: "주간" }, { v: "night", label: "야간" }]} />
          {night && kind.needsLed && <Check label="조명 켜기" checked={ledOn} onChange={setLedOn} />}
          <Check label="치수" checked={dims} onChange={setDims} />
          <Check label="격자" checked={d.grid !== false} onChange={(v) => patchDesign({ grid: v })} />
          <span className="mx-1 h-5 w-px bg-line" />
          <ToolBtn onClick={() => zoomBy(1.25)} label="축소">−</ToolBtn>
          <button type="button" onClick={() => fit()} className="h-8 min-w-14 border border-line px-2 text-[12px] font-bold hover:bg-paper" title="화면에 맞춤">
            {zoomPct}%
          </button>
          <ToolBtn onClick={() => zoomBy(0.8)} label="확대">+</ToolBtn>
          <span className="ml-auto flex gap-1">
            <ToolBtn onClick={undo} disabled={!hist.past.length} label="되돌리기 (Ctrl+Z)">↶</ToolBtn>
            <ToolBtn onClick={redo} disabled={!hist.future.length} label="다시 하기 (Ctrl+Y)">↷</ToolBtn>
          </span>
        </div>

        <div className="relative h-[62vh] min-h-[340px] lg:h-auto lg:min-h-0 lg:flex-1">
          <Stage
            design={d}
            kind={kind}
            items={ritems}
            wall={wall}
            night={night}
            ledOn={ledOn}
            dims={dims}
            selected={selected}
            glyph={glyph}
            warpMode={warpMode}
            board={board}
            calib={calib}
            view={view}
            onView={setView}
            onMeasure={(w, h) => {
              setCanvasPx((c) => (c.w === w && c.h === h ? c : { w, h }));
              // 처음 한 번은 벽 전체가 보이게 맞춥니다
              if (!fitted.current) {
                fitted.current = true;
                fit(d.wallW, d.wallH, { w, h });
              }
            }}
            svgRef={svgRef}
            onSelect={select}
            onGlyph={(id, g) => {
              setSelected(id);
              setGlyph(g);
            }}
            onMove={(id, x, y, done) => setItem(id, { x, y }, !done)}
            onResize={onResize}
            onRotate={onRotate}
            onWarp={onWarp}
            onCalibPoint={(pt) => setCalib((c) => (!c ? c : !c.a || c.b ? { a: pt } : { a: c.a, b: pt }))}
          />
          {busy && (
            <p className="absolute inset-x-0 top-8 z-20 mx-auto w-fit bg-ink px-4 py-2 text-[13px] font-bold text-white" role="status">
              {busy}
            </p>
          )}
        </div>

        {calib && (
          <div className="border-t border-line bg-white px-4 py-3 text-[14px] leading-relaxed">
            <p className="font-bold">사진의 실제 크기 맞추기</p>
            <p className="mt-1 text-ink-500">사진에서 길이를 아는 곳 두 끝을 차례로 누르세요. 출입문 높이(보통 2,100mm)가 가장 쉽습니다.</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="text-[13px] font-bold">{calib.a ? (calib.b ? "두 점을 찍었습니다" : "두 번째 점을 누르세요") : "첫 번째 점을 누르세요"}</span>
              <input inputMode="numeric" value={calibMm} onChange={(e) => setCalibMm(e.target.value.replace(/[^\d]/g, ""))} className="w-24 border border-line px-2 py-1 text-right" aria-label="두 점 사이 실제 길이(mm)" />
              <span className="text-[13px]">mm</span>
              <button type="button" onClick={applyCalib} disabled={!calib.a || !calib.b} className="bg-brand-700 px-3 py-1.5 text-[13px] font-bold text-white disabled:opacity-40">
                맞추기
              </button>
              <button type="button" onClick={() => setCalib(null)} className="px-2 py-1.5 text-[13px] font-bold text-ink-500 underline">
                건너뛰기
              </button>
            </div>
          </div>
        )}
        {err && (
          <p className="border-t border-line bg-white px-4 py-2 text-[14px] font-bold text-accent-600" role="alert">
            {err}
          </p>
        )}
        <p className="border-t border-line bg-white px-4 py-2 text-[12px] leading-relaxed text-ink-500">
          Ctrl+휠 확대 · 빈 곳을 끌면 이동 · 글자를 두 번 누르면 한 자씩 · Ctrl+D 복제 · 화면의 색·밝기는 실제와 다르고, 야간 모습은 점등 «표현»입니다.
        </p>
      </section>

      {/* ───────── 왼쪽: 넣기 · 벽 · 레이어 ───────── */}
      <aside className="order-2 border-line bg-white lg:order-1 lg:min-h-0 lg:overflow-y-auto lg:border-r">
        <Panel title="넣기">
          <div className="grid grid-cols-3 gap-px bg-line">
            <AddBtn onClick={addText} label="글자" sub="가게 이름" />
            <label className="flex cursor-pointer flex-col items-center gap-0.5 bg-white px-2 py-3 text-center hover:bg-brand-50">
              <span className="text-[14px] font-black">로고</span>
              <span className="text-[11px] text-ink-500">그림 올리기</span>
              <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => e.target.files?.[0] && onLogo(e.target.files[0])} />
            </label>
            <AddBtn onClick={addPatch} label="가리기" sub="기존 간판 덮기" />
          </div>
          <p className="mt-2 text-[12px] leading-relaxed text-ink-500">로고는 이 브라우저 안에서 선으로 바뀝니다. 선을 자세히 다듬으려면 왼쪽 «SVG 따기»로.</p>
        </Panel>

        <Panel title="벽">
          <div className="grid grid-cols-3 gap-1.5">
            {walls.map((w) => (
              <button key={w.key} type="button" onClick={() => pickWall(w.key)} aria-pressed={d.wall === w.key} className="text-left">
                <span className={`block h-10 border ${d.wall === w.key ? "border-brand-700 ring-2 ring-brand" : "border-line"}`} style={{ background: w.color }} />
                <span className={`mt-0.5 block text-[11px] font-bold ${d.wall === w.key ? "text-brand-700" : ""}`}>{w.name}</span>
              </button>
            ))}
          </div>
          <label className="mt-3 flex cursor-pointer items-center justify-center border border-brand-700 px-3 py-2.5 text-[14px] font-bold text-brand-700 hover:bg-brand-50">
            가게 사진 올리기
            <input type="file" accept="image/*" className="sr-only" onChange={(e) => e.target.files?.[0] && onPhoto(e.target.files[0])} />
          </label>
          {d.wall === "photo" && photo && !calib && (
            <button type="button" onClick={() => setCalib({})} className="mt-2 w-full px-3 py-2 text-[13px] font-bold text-ink-500 underline">
              사진 크기 다시 맞추기
            </button>
          )}
          {d.wall !== "photo" && (
            <div className="mt-3 grid grid-cols-2 gap-2 text-[12px]">
              <label className="block">
                <span className="font-bold">벽 가로 (mm)</span>
                <NumIn
                  value={d.wallW}
                  min={1000}
                  max={40000}
                  step={100}
                  onChange={(v) => {
                    patchDesign({ wallW: v });
                    fit(v, d.wallH);
                  }}
                />
              </label>
              <label className="block">
                <span className="font-bold">벽 세로 (mm)</span>
                <NumIn
                  value={d.wallH}
                  min={500}
                  max={20000}
                  step={100}
                  onChange={(v) => {
                    patchDesign({ wallH: v });
                    fit(d.wallW, v);
                  }}
                />
              </label>
            </div>
          )}
          <p className="mt-2 text-[12px] leading-relaxed text-ink-500">가게 사진은 이 브라우저 안에서만 씁니다. 견적을 보낼 때 미리보기 그림으로만 붙습니다.</p>
        </Panel>

        <Panel title="레이어">
          <ul className="divide-y divide-line">
            {[...d.items].reverse().map((it) => (
              <li key={it.id} className={`flex items-center ${selected === it.id ? "bg-brand-100" : "hover:bg-paper"}`}>
                <button type="button" onClick={() => select(it.id)} className={`flex min-w-0 flex-1 items-center gap-2 px-2 py-2 text-left text-[13px] ${selected === it.id ? "font-bold text-brand-700" : ""}`}>
                  <span className="w-8 shrink-0 text-[10px] font-bold tracking-wider text-ink-500">{it.type === "text" ? "글자" : it.type === "logo" ? "로고" : "가림"}</span>
                  <span className="truncate">{it.type === "text" ? it.lines.map((l) => l.text).join(" / ") : it.type === "logo" ? it.name : "가리기 판"}</span>
                  {it.type !== "patch" && <Dot level={worst(notes.get(it.id) ?? [])} />}
                </button>
                <button type="button" onClick={() => reorder(it.id, 1)} className="px-1.5 text-[12px] text-ink-500 hover:text-ink" aria-label="앞으로">▲</button>
                <button type="button" onClick={() => reorder(it.id, -1)} className="px-1.5 text-[12px] text-ink-500 hover:text-ink" aria-label="뒤로">▼</button>
              </li>
            ))}
            {!d.items.length && <li className="px-2 py-3 text-[13px] text-ink-500">아직 없습니다. 위에서 글자를 넣어 보세요.</li>}
          </ul>
        </Panel>
      </aside>

      {/* ───────── 오른쪽: 선택한 것 · 간판 · 판정 ───────── */}
      <aside className="order-3 border-line bg-white lg:min-h-0 lg:overflow-y-auto lg:border-l">
        {sel && (
          <Panel
            title={sel.type === "text" ? "글자" : sel.type === "logo" ? "로고" : "가리기 판"}
            action={
              <span className="flex gap-3">
                <button type="button" onClick={() => duplicate(sel.id)} className="text-[12px] font-bold text-ink-500 underline">복제</button>
                <button type="button" onClick={() => remove(sel.id)} className="text-[12px] font-bold text-ink-500 underline">지우기</button>
              </span>
            }
          >
            <TransformProps it={sel} warpMode={warpMode} onWarpMode={setWarpMode} onChange={(patch) => setItem(sel.id, patch)} />
            {sel.type === "text" && (
              <TextProps
                it={sel}
                admin={admin}
                glyphs={selText?.outline.glyphs ?? []}
                glyph={glyph}
                onGlyph={setGlyph}
                onGlyphOv={(i, patch) => setGlyphOv(sel.id, i, patch)}
                onChange={(patch) => setItem(sel.id, patch)}
                localFonts={localFonts}
                onLoadLocal={async () => {
                  try {
                    setLocalFonts(await listLocalFonts());
                  } catch (e) {
                    setErr(`이 PC 글꼴을 못 불러왔습니다: ${(e as Error).message}`);
                  }
                }}
                onFontFile={(file) => {
                  const key = `file:${file.name}:${file.size}`;
                  fileFonts.current.set(key, file);
                  setItem(sel.id, { font: { src: "file", key, name: file.name } });
                }}
                fontLabel={fontLabel}
              />
            )}
            {sel.type === "logo" && <LogoProps it={sel} onChange={(patch) => setItem(sel.id, patch)} onRetrace={(m, inv, k) => relogo(sel, m, inv, k)} />}
            {sel.type === "patch" && (
              <Field label="색 (사진 속 벽과 비슷하게)">
                <input type="color" value={sel.color} onChange={(e) => setItem(sel.id, { color: e.target.value })} className="h-9 w-full cursor-pointer border border-line" />
              </Field>
            )}
          </Panel>
        )}

        <Panel title="간판 종류 · 제작">
          <ul className="space-y-0.5">
            {makerKinds.map((k) => (
              <li key={k.key}>
                <button type="button" onClick={() => patchDesign({ kind: k.key, depth: undefined })} aria-pressed={d.kind === k.key} className={`w-full px-3 py-2 text-left ${d.kind === k.key ? "bg-brand-100" : "hover:bg-paper"}`}>
                  <span className={`text-[14px] font-bold ${d.kind === k.key ? "text-brand-700" : ""}`}>
                    <span className="mr-1.5 text-[11px] tracking-wider text-ink-500">{k.code}</span>
                    {k.name}
                  </span>
                  {d.kind === k.key && <span className="mt-0.5 block text-[12px] leading-relaxed text-ink-500">{k.hint}</span>}
                </button>
              </li>
            ))}
          </ul>
          {kind.needsLed && (
            <Field label="조명 색">
              <Swatches items={ledColors.map((c) => ({ name: c.name, hex: c.hex }))} value={d.led} onPick={(hex) => patchDesign({ led: hex })} glow />
            </Field>
          )}
          {kind.depthMm > 10 && (
            <>
              <Field label="옆면 색">
                <Swatches items={sideColors.map((c) => ({ name: c.name, hex: c.hex }))} value={d.side} onPick={(hex) => patchDesign({ side: hex })} />
              </Field>
              <Field label={`옆면 깊이 · ${d.depth ?? kind.depthMm}mm`}>
                <input type="range" min={10} max={200} step={5} value={d.depth ?? kind.depthMm} onChange={(e) => patchDesign({ depth: Number(e.target.value) })} className="w-full accent-brand" aria-label="옆면 깊이" />
              </Field>
              <Field label="보는 쪽 (옆면이 보이는 방향)">
                <Seg
                  value={d.view ?? "below"}
                  onChange={(v) => patchDesign({ view: v as Design["view"] })}
                  options={[
                    { v: "front", label: "정면" },
                    { v: "below", label: "아래" },
                    { v: "above", label: "위" },
                    { v: "left", label: "왼쪽" },
                    { v: "right", label: "오른쪽" },
                  ]}
                />
              </Field>
              <Field label="트림 (앞면 테두리)">
                <Swatches items={trimColors.map((c) => ({ name: c.name, hex: c.hex }))} value={d.trim ?? ""} onPick={(hex) => patchDesign({ trim: hex })} emptyLabel="없음" />
              </Field>
            </>
          )}
          {(kind.lit === "front" || kind.lit === "both") && !kind.backboard && (
            <Field label="뒤 바 (전기선 가림)">
              <div className="flex items-center gap-3">
                <Check label="넣기" checked={!!d.bar} onChange={(v) => patchDesign({ bar: v })} />
                {d.bar && <input type="color" value={d.barColor ?? "#2b2f2e"} onChange={(e) => patchDesign({ barColor: e.target.value })} className="h-8 w-14 cursor-pointer border border-line" aria-label="바 색" />}
              </div>
            </Field>
          )}
          {kind.backboard && (
            <>
              <Field label="바탕판 색">
                <Swatches items={boardColors.map((c) => ({ name: c.name, hex: c.hex }))} value={d.board} onPick={(hex) => patchDesign({ board: hex })} />
              </Field>
              <Field label={`바탕판 여백 · 글자 높이의 ${(d.boardPad ?? 0.8).toFixed(1)}배`}>
                <input type="range" min={0.2} max={2} step={0.1} value={d.boardPad ?? 0.8} onChange={(e) => patchDesign({ boardPad: Number(e.target.value) })} className="w-full accent-brand" aria-label="바탕판 여백" />
              </Field>
            </>
          )}
        </Panel>

        <Panel title="만들 수 있나">
          <p className={`text-[15px] font-black ${verdict === "ok" ? "text-brand-700" : verdict === "check" ? "text-ink" : "text-accent-600"}`}>{LEVEL_LABEL[verdict]}</p>
          {overall && <p className="mt-1 text-[13px] text-ink-500">전체 가로 {fmtMm(overall.w)} × 세로 {fmtMm(overall.h)}</p>}
          <ul className="mt-2 space-y-1.5">
            {allNotes
              .filter((n) => n.level !== "ok" || admin)
              .map((n, i) => (
                <li key={i} className="flex gap-2 text-[13px] leading-relaxed">
                  <Dot level={n.level} />
                  <span>{n.text}</span>
                </li>
              ))}
          </ul>
          <p className="mt-3 text-[12px] leading-relaxed text-ink-500">
            {admin
              ? "판정 기준: 절곡 채널 획 38mm↑ · 조명 글자 높이 203mm↑ · 속공간 30mm↑ (/sign-proof 와 같은 자). 회전·원근은 판정에 안 들어갑니다."
              : "견적을 보내시면 담당자가 제작 방식과 치수를 다시 확인해 연락드립니다."}
          </p>
          <div className="mt-4 space-y-2">
            {admin ? (
              <>
                <button type="button" onClick={exportJpeg} className="w-full bg-brand-700 px-4 py-3 font-bold text-white hover:bg-brand-600">
                  시안 그림 내려받기 (JPG)
                </button>
                <button type="button" onClick={() => download(`간판_제작용_${stamp()}.svg`, fabricationSvg(placed()))} className="w-full border border-brand-700 px-4 py-2.5 font-bold text-brand-700 hover:bg-brand-50">
                  제작용 외곽선 (SVG · mm)
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await navigator.clipboard.writeText(summary());
                    setBusy("요약을 복사했습니다");
                    setTimeout(() => setBusy(""), 1200);
                  }}
                  className="w-full px-4 py-2 text-[14px] font-bold text-ink-500 underline"
                >
                  사양 요약 복사
                </button>
              </>
            ) : (
              <>
                <button type="button" onClick={toQuote} className="w-full bg-brand-700 px-4 py-3.5 text-[16px] font-black text-white hover:bg-brand-600">
                  이 디자인으로 무료 견적 받기
                </button>
                <button type="button" onClick={exportJpeg} className="w-full px-4 py-2 text-[14px] font-bold text-ink-500 underline">
                  미리보기 그림 저장
                </button>
              </>
            )}
          </div>
        </Panel>
      </aside>
    </div>
  );
}

/* ================================================================ 속성 패널 */

function TransformProps({ it, warpMode, onWarpMode, onChange }: { it: Item; warpMode: boolean; onWarpMode: (v: boolean) => void; onChange: (p: Partial<Item>) => void }) {
  const deg = Math.round(((it.rot ?? 0) + 540) % 360) - 180;
  return (
    <div className="mb-4 border-b border-line pb-4">
      <div className="flex items-center gap-2 text-[13px]">
        <span className="w-10 shrink-0 font-bold">회전</span>
        <input type="range" min={-180} max={180} step={1} value={deg} onChange={(e) => onChange({ rot: Number(e.target.value), warp: null })} className="flex-1 accent-brand" aria-label="회전" />
        <span className="w-10 text-right tabular-nums">{deg}°</span>
      </div>
      <div className="mt-2 flex gap-1.5">
        <button type="button" onClick={() => onWarpMode(!warpMode)} aria-pressed={warpMode} className={`flex-1 border px-2 py-2 text-[12px] font-bold ${warpMode ? "border-accent bg-accent text-ink" : "border-line hover:bg-paper"}`}>
          {warpMode ? "원근 맞추는 중 — 네 점을 끄세요" : "원근 맞추기 (네 점)"}
        </button>
        {(it.warp || it.rot) && (
          <button
            type="button"
            onClick={() => {
              onChange({ warp: null, rot: 0 });
              onWarpMode(false);
            }}
            className="border border-line px-2 py-2 text-[12px] font-bold hover:bg-paper"
          >
            반듯하게
          </button>
        )}
      </div>
      {warpMode && <p className="mt-1.5 text-[11px] leading-relaxed text-ink-500">벽면이 비스듬한 사진에 간판 면을 맞출 때 씁니다(포토샵 «왜곡»). 보이는 모양만 바뀌고 판정·제작 치수는 반듯한 모양 그대로입니다.</p>}
    </div>
  );
}

function TextProps({
  it,
  admin,
  glyphs,
  glyph,
  onGlyph,
  onGlyphOv,
  onChange,
  localFonts,
  onLoadLocal,
  onFontFile,
  fontLabel,
}: {
  it: TextItem;
  admin: boolean;
  glyphs: Outline["glyphs"];
  glyph: number | null;
  onGlyph: (g: number | null) => void;
  onGlyphOv: (i: number, patch: Partial<GlyphOv> | null) => void;
  onChange: (p: Partial<TextItem>) => void;
  localFonts: LocalFont[] | null;
  onLoadLocal: () => void;
  onFontFile: (f: File) => void;
  fontLabel: (f: FontRef) => string;
}) {
  const [q, setQ] = useState("");
  const setLine = (i: number, patch: Partial<TextItem["lines"][number]>) => onChange({ lines: it.lines.map((l, j) => (j === i ? { ...l, ...patch } : l)) });
  // KCC간판체를 맨 앞에 — 소상공인 간판용으로 만든 글꼴이라 손님 첫 선택으로 가장 안전합니다
  const lib = [...specimenFonts].sort((a, b) => (a.slug === "kcc-ganpan" ? -1 : b.slug === "kcc-ganpan" ? 1 : 0));
  const ov = glyph !== null ? it.glyphs?.[glyph] ?? {} : null;

  return (
    <div className="space-y-3">
      {it.lines.map((l, i) => (
        <div key={i} className="space-y-1.5">
          <div className="flex gap-1.5">
            <input value={l.text} onChange={(e) => setLine(i, { text: e.target.value.slice(0, 30) })} className="min-w-0 flex-1 border border-line px-2.5 py-2 text-[15px]" aria-label={`${i + 1}번째 줄 글자`} />
            {it.lines.length > 1 && (
              <button type="button" onClick={() => onChange({ lines: it.lines.filter((_, j) => j !== i) })} className="px-2 text-[13px] text-ink-500" aria-label={`${i + 1}번째 줄 빼기`}>
                ✕
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 text-[13px]">
            <span className="w-14 shrink-0 font-bold">글자 높이</span>
            <div className="w-24">
              <NumIn value={l.heightMm} min={50} max={3000} step={10} onChange={(v) => setLine(i, { heightMm: v })} />
            </div>
            <span>mm</span>
          </div>
          <div className="flex items-center gap-2 text-[13px]">
            <span className="w-14 shrink-0 font-bold">자간</span>
            <input type="range" min={-150} max={400} step={10} value={l.tracking} onChange={(e) => setLine(i, { tracking: Number(e.target.value) })} className="flex-1 accent-brand" aria-label="자간" />
          </div>
        </div>
      ))}
      {it.lines.length < 3 && (
        <button type="button" onClick={() => onChange({ lines: [...it.lines, { text: "보조 문구", heightMm: Math.round((it.lines[0]?.heightMm ?? 400) * 0.35), tracking: 0 }] })} className="text-[13px] font-bold text-brand-700 underline">
          + 줄 추가 (업종·전화 등)
        </button>
      )}

      <Field label="앞면 색 (전체)">
        <Swatches items={faceColors.map((c) => ({ name: c.name, hex: c.hex }))} value={it.face} onPick={(hex) => onChange({ face: hex })} />
        <input type="color" value={it.face} onChange={(e) => onChange({ face: e.target.value })} className="mt-1.5 h-8 w-full cursor-pointer border border-line" aria-label="앞면 색 직접 고르기" />
      </Field>

      {/* 글자 한 자씩 — 해외 메이커의 «글자별 색»을 위치·크기·회전까지 넓혔습니다 */}
      <Field label="글자 한 자씩 (캔버스에서 두 번 눌러도 됩니다)">
        <div className="flex flex-wrap gap-1">
          {glyphs.map((g) => {
            const on = glyph === g.i, custom = !!it.glyphs?.[g.i];
            return (
              <button key={g.i} type="button" onClick={() => onGlyph(on ? null : g.i)} aria-pressed={on} className={`h-9 min-w-9 border px-1 text-[15px] font-bold ${on ? "border-accent bg-accent text-ink" : custom ? "border-brand-700 text-brand-700" : "border-line hover:bg-paper"}`}>
                {g.ch}
              </button>
            );
          })}
        </div>
        {ov && glyph !== null && (
          <div className="mt-2 space-y-2 border border-line p-2.5">
            <Swatches items={faceColors.map((c) => ({ name: c.name, hex: c.hex }))} value={ov.color ?? ""} onPick={(hex) => onGlyphOv(glyph, { color: hex })} />
            <Slider label="크기" unit="%" min={40} max={200} step={5} value={Math.round((ov.scale ?? 1) * 100)} onChange={(v) => onGlyphOv(glyph, { scale: v / 100 })} />
            <Slider label="회전" unit="°" min={-45} max={45} step={1} value={ov.rot ?? 0} onChange={(v) => onGlyphOv(glyph, { rot: v })} />
            <Slider label="위아래" unit="mm" min={-400} max={400} step={5} value={ov.dy ?? 0} onChange={(v) => onGlyphOv(glyph, { dy: v })} />
            <Slider label="좌우" unit="mm" min={-400} max={400} step={5} value={ov.dx ?? 0} onChange={(v) => onGlyphOv(glyph, { dx: v })} />
            <div className="flex justify-between text-[12px]">
              <span className="text-ink-500">화살표 키로도 옮깁니다</span>
              <button type="button" onClick={() => onGlyphOv(glyph, null)} className="font-bold text-ink-500 underline">
                이 글자 처음대로
              </button>
            </div>
          </div>
        )}
      </Field>

      <Field label={`글꼴 · 지금 «${fontLabel(it.font)}»`}>
        <div className="max-h-56 overflow-y-auto border border-line">
          {fontGroups.map((g) => (
            <div key={g.key}>
              <p className="sticky top-0 bg-paper px-2 py-1 text-[11px] font-bold tracking-wider text-ink-500">{g.label}</p>
              {lib
                .filter((f) => f.group === g.key)
                .map((f) => {
                  const on = it.font.src === "lib" && it.font.slug === f.slug;
                  return (
                    <button key={f.slug} type="button" onClick={() => onChange({ font: { src: "lib", slug: f.slug } })} aria-pressed={on} className={`block w-full px-2.5 py-1.5 text-left text-[14px] ${on ? "bg-brand-100 font-bold text-brand-700" : "hover:bg-paper"}`}>
                      {f.name}
                      {f.slug === "kcc-ganpan" && <span className="ml-1.5 text-[11px] text-ink-500">간판용</span>}
                    </button>
                  );
                })}
            </div>
          ))}
        </div>
        {!admin && <p className="mt-1.5 text-[12px] leading-relaxed text-ink-500">간판에 써도 되는 무료 글꼴만 모았습니다(인쇄·상호·웹 사용 가능 확인).</p>}
      </Field>

      {admin && (
        <Field label="관리자 글꼴 (이 브라우저에서만)">
          {localFontsSupported() ? (
            localFonts ? (
              <>
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`이 PC 글꼴 ${localFonts.length}개에서 찾기`} className="w-full border border-line px-2 py-1.5 text-[13px]" />
                <div className="mt-1 max-h-44 overflow-y-auto border border-line">
                  {localFonts
                    .filter((f) => !q || f.fullName.toLowerCase().includes(q.toLowerCase()) || f.family.toLowerCase().includes(q.toLowerCase()))
                    .slice(0, 200)
                    .map((f) => {
                      const on = it.font.src === "local" && it.font.key === f.key;
                      return (
                        <button key={f.key} type="button" onClick={() => onChange({ font: { src: "local", key: f.key, name: f.fullName } })} className={`block w-full px-2.5 py-1 text-left text-[13px] ${on ? "bg-brand-100 font-bold text-brand-700" : "hover:bg-paper"}`}>
                          {f.fullName}
                        </button>
                      );
                    })}
                </div>
              </>
            ) : (
              <button type="button" onClick={onLoadLocal} className="w-full border border-line px-3 py-2 text-[13px] font-bold hover:bg-paper">
                이 PC 에 설치된 글꼴 불러오기
              </button>
            )
          ) : (
            <p className="text-[12px] text-ink-500">이 PC 글꼴 목록은 크롬·엣지에서만 됩니다. 아래에서 파일을 올리세요.</p>
          )}
          <label className="mt-1.5 flex cursor-pointer items-center justify-center border border-line px-3 py-2 text-[13px] font-bold hover:bg-paper">
            글꼴 파일 올리기 (TTF·OTF·WOFF)
            <input type="file" accept=".ttf,.otf,.woff,.woff2" className="sr-only" onChange={(e) => e.target.files?.[0] && onFontFile(e.target.files[0])} />
          </label>
          <p className="mt-1.5 text-[12px] leading-relaxed text-ink-500">여기 글꼴은 서버에 안 올라가고 손님 화면에도 안 보입니다. 손님 간판에 쓰기 전에 그 글꼴의 상업·BI 사용 조건을 확인하세요.</p>
        </Field>
      )}
    </div>
  );
}

function LogoProps({ it, onChange, onRetrace }: { it: LogoItem; onChange: (p: Partial<LogoItem>) => void; onRetrace: (m: "ink" | "colors", inv: boolean, k: number) => void }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-[13px]">
        <span className="w-14 shrink-0 font-bold">가로</span>
        <div className="w-24">
          <NumIn value={it.w} min={50} max={10000} step={10} onChange={(v) => onChange({ w: v })} />
        </div>
        <span>mm</span>
      </div>
      <Field label="선 따기 방식">
        <div className="grid grid-cols-2 gap-1.5 text-[12px] font-bold">
          <button type="button" onClick={() => onRetrace("ink", false, 2)} className="border border-line px-2 py-2 hover:bg-paper">한 색 (진한 로고)</button>
          <button type="button" onClick={() => onRetrace("ink", true, 2)} className="border border-line px-2 py-2 hover:bg-paper">한 색 (밝은 로고)</button>
          <button type="button" onClick={() => onRetrace("colors", false, 2)} className="border border-line px-2 py-2 hover:bg-paper">두 색</button>
          <button type="button" onClick={() => onRetrace("colors", false, 3)} className="border border-line px-2 py-2 hover:bg-paper">세 색</button>
        </div>
      </Field>
      <Field label="색 (층마다 따로 만듭니다)">
        <ul className="space-y-1.5">
          {it.layers.map((l, i) => (
            <li key={i} className="flex items-center gap-2 text-[13px]">
              <input type="color" value={l.color} onChange={(e) => onChange({ layers: it.layers.map((x, j) => (j === i ? { ...x, color: e.target.value } : x)) })} className="h-8 w-12 cursor-pointer border border-line" aria-label={`${l.name} 색`} />
              <span>{l.name}</span>
            </li>
          ))}
        </ul>
      </Field>
    </div>
  );
}

/* ================================================================ 작은 부품 */

function Panel({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="border-b border-line">
      <header className="flex items-center justify-between px-4 pb-1 pt-3">
        <h2 className="text-[12px] font-black tracking-[0.08em] text-ink-500">{title}</h2>
        {action}
      </header>
      <div className="px-4 pb-4 pt-1.5">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-3 first:mt-0">
      <p className="mb-1.5 text-[12px] font-bold text-ink-500">{label}</p>
      {children}
    </div>
  );
}

function Slider({ label, unit, min, max, step, value, onChange }: { label: string; unit: string; min: number; max: number; step: number; value: number; onChange: (v: number) => void }) {
  return (
    <label className="flex items-center gap-2 text-[12px]">
      <span className="w-10 shrink-0 font-bold">{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="flex-1 accent-brand" />
      <span className="w-14 text-right tabular-nums">
        {value}
        {unit}
      </span>
    </label>
  );
}

function Swatches({ items, value, onPick, glow, emptyLabel = "같게" }: { items: { name: string; hex: string }[]; value: string; onPick: (hex: string) => void; glow?: boolean; emptyLabel?: string }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((c) => {
        const on = c.hex === value;
        return (
          <button
            key={c.name}
            type="button"
            title={c.name}
            aria-label={c.name}
            aria-pressed={on}
            onClick={() => onPick(c.hex)}
            className={`h-8 min-w-8 border px-1 text-[11px] font-bold ${on ? "border-brand-700 ring-2 ring-brand" : "border-line"}`}
            style={c.hex ? { background: c.hex, boxShadow: glow ? `0 0 10px ${c.hex}` : undefined, color: lum(c.hex) > 0.6 ? "#0f1a19" : "#fff" } : undefined}
          >
            {!c.hex ? emptyLabel : ""}
          </button>
        );
      })}
    </div>
  );
}

function Seg({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { v: string; label: string }[] }) {
  return (
    <div className="flex flex-wrap border border-line" role="group">
      {options.map((o) => (
        <button key={o.v} type="button" aria-pressed={value === o.v} onClick={() => onChange(o.v)} className={`px-2.5 py-1.5 text-[12px] font-bold ${value === o.v ? "bg-ink text-white" : "hover:bg-paper"}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-1.5 text-[12px] font-bold">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="accent-brand" />
      {label}
    </label>
  );
}

function ToolBtn({ onClick, disabled, label, children }: { onClick: () => void; disabled?: boolean; label: string; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={label} title={label} className="h-8 w-8 border border-line text-[16px] font-bold hover:bg-paper disabled:opacity-30">
      {children}
    </button>
  );
}

function AddBtn({ onClick, label, sub }: { onClick: () => void; label: string; sub: string }) {
  return (
    <button type="button" onClick={onClick} className="flex flex-col items-center gap-0.5 bg-white px-2 py-3 text-center hover:bg-brand-50">
      <span className="text-[14px] font-black">{label}</span>
      <span className="text-[11px] text-ink-500">{sub}</span>
    </button>
  );
}

function NumIn({ value, min, max, step, onChange }: { value: number; min: number; max: number; step: number; onChange: (v: number) => void }) {
  const [txt, setTxt] = useState(String(Math.round(value)));
  const [prev, setPrev] = useState(value);
  if (prev !== value) {
    setPrev(value);
    setTxt(String(Math.round(value)));
  }
  const apply = () => {
    const v = Number(txt);
    if (Number.isFinite(v) && txt !== "") onChange(Math.max(min, Math.min(max, Math.round(v / step) * step)));
    else setTxt(String(Math.round(value)));
  };
  return <input inputMode="numeric" value={txt} onChange={(e) => setTxt(e.target.value.replace(/[^\d]/g, ""))} onBlur={apply} onKeyDown={(e) => e.key === "Enter" && apply()} className="w-full min-w-0 border border-line px-2 py-1 text-right" />;
}

function Dot({ level }: { level: Level }) {
  const c = level === "ok" ? "bg-brand" : level === "check" ? "bg-ink-500" : "bg-accent";
  return <span aria-label={LEVEL_LABEL[level]} className={`mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full ${c}`} />;
}

function lum(hex: string) {
  const n = parseInt(hex.replace("#", ""), 16);
  return (((n >> 16) & 255) * 0.299 + ((n >> 8) & 255) * 0.587 + (n & 255) * 0.114) / 255;
}

const stamp = () => {
  const t = new Date();
  return `${t.getFullYear()}${String(t.getMonth() + 1).padStart(2, "0")}${String(t.getDate()).padStart(2, "0")}`;
};
