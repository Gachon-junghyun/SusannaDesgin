"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { fontGroups, specimenFonts } from "@/config/fonts";
import {
  boardColors,
  faceColors,
  INCOMING_LOGO_KEY,
  INCOMING_PALETTE_KEY,
  ledColors,
  MAKER_GESTURE_HINT_KEY,
  MAKER_HELP_EVENT,
  MAKER_PHONE_QUERY,
  MAKER_STORAGE_KEY,
  makerKinds,
  makerProKey,
  MAKER_SHARE_MAX_BYTES,
  makerTour,
  makerTourKey,
  makerTourPhone,
  MESH_SIZES,
  PINCH_SNAP_DEG,
  plateColors,
  plateMounts,
  plateShapes,
  refStyles,
  sideColors,
  trimColors,
  wallColors,
  walls,
  type RefStyle,
  type TourStep,
} from "@/config/maker";
import {
  composeJpeg,
  defaultDesign,
  download,
  fabricationSvg,
  fmtMm,
  inkOn,
  isSign,
  judgeItem,
  kindOf,
  LEVEL_LABEL,
  newId,
  summarize,
  wallFill,
  wallLabel,
  worst,
  type Design,
  type FontRef,
  type GlyphOv,
  type GlyphPath,
  type Item,
  type Level,
  type LogoItem,
  type Measured,
  type Note,
  type Placed,
  type ImageItem,
  type PlateItem,
  type TextItem,
} from "@/lib/maker/design";
import { takeForEditor } from "@/lib/maker/handoff";
import { INCOMING_ITEMS_KEY } from "@/config/logo";
import { pickSpots, readLabel, recommend, skyShare, toneOn, type Rec } from "@/lib/maker/palette";
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
import {
  apply,
  homography,
  invert,
  linkedNodes,
  mapPath,
  meshMap,
  meshNew,
  meshNode,
  mul,
  nodesOf,
  parsePath,
  platePath,
  rectPath,
  rotateAt,
  scaleXYAt,
  serializePath,
  skewXAt,
  subdivide,
  translate,
  type Affine,
  type Box,
  type Mesh,
  type Pt,
} from "@/lib/maker/geom";
import { bbox, imageDataOf, layersFromImage, toPathD, traceGray, type Contour } from "@/lib/maker/trace";
import { createMakerShare, deleteMakerShare, listMakerShares, type ShareItem } from "@/app/admin/maker/actions";
import { getMakerAssets } from "@/app/admin/maker/assets/actions";
import { parseAssetSvg } from "@/lib/maker/asset-svg";
import type { MakerAsset } from "@/lib/maker/assets";

import MakerTour from "./MakerTour";
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

/** `view` = 공유 링크(F26-b)로 받은 디자인을 «보기 전용»으로 엽니다 — 옮기기·고치기·초안 저장이 없습니다 */
type Mode = "admin" | "customer" | "view";
type TextOut = { key: string; outline: Outline; fontName: string };

/** 공유 링크 한 건의 정보 — `app/maker/s/[token]/page.tsx` 가 넘깁니다 */
export type ShareInfo = { token: string; title: string; expiresAt: string; canEdit: boolean };

const STORE = (mode: "admin" | "customer") => `susanna-maker-draft-v2-${mode}`;

/** 저장소·공유 링크에서 온 디자인을 지금 모양에 맞춥니다. 사진은 저장하지 않으므로 사진 벽은 흰 벽으로 */
function normalize(raw: unknown): Design | null {
  const d = raw as Design | null;
  if (!d || !Array.isArray(d.items)) return null;
  return { ...defaultDesign(), ...d, wall: d.wall === "color" || walls.some((w) => w.key === d.wall) ? d.wall : "white" };
}

function loadDraft(mode: "admin" | "customer"): Design {
  try {
    const raw = localStorage.getItem(STORE(mode));
    if (raw) return normalize(JSON.parse(raw)) ?? defaultDesign();
  } catch {
    /* 저장소가 막힌 브라우저 — 기본값으로 */
  }
  return defaultDesign();
}

/**
 * 글자 한 자의 꾸밈 → 아핀 (글자 중심 기준 크기·회전 뒤 이동).
 * PRO(2026-09-26) 칸이 둘 붙었습니다 — 가로·세로 따로 늘리기(`sx`·`sy`)와 기울이기(`skew`). 순서는
 * 늘리기 → 기울이기 → 회전 → 이동 이라 «기울인 뒤 돌린» 모양이 됩니다(글자를 먼저 눕혀 놓고 돌리는 것과 같음).
 */
function glyphAffine(g: { x0: number; y0: number; w: number; h: number }, ov?: GlyphOv): Affine | null {
  if (!ov) return null;
  const k = ov.scale ?? 1, sx = (ov.sx ?? 1) * k, sy = (ov.sy ?? 1) * k;
  if (!ov.dx && !ov.dy && sx === 1 && sy === 1 && !ov.rot && !ov.skew) return null;
  const cx = g.x0 + g.w / 2, cy = g.y0 + g.h / 2;
  return mul(translate(ov.dx ?? 0, ov.dy ?? 0), mul(rotateAt(ov.rot ?? 0, cx, cy), mul(skewXAt(ov.skew ?? 0, cy), scaleXYAt(sx, sy, cx, cy))));
}

type GlyphBox = Outline["glyphs"][number];

/**
 * 글자 한 자가 벽에 가기까지의 사슬 (PRO, F26-g). 아이템 좌표로:
 *   고친 외곽(편집 공간) → `pre`(지금 글자 상자로 늘림) → 격자 왜곡 `M` → 꾸밈 아핀 `A`  =  `post(pre(p))`
 * 그 뒤에 아이템 전체의 격자 왜곡과 회전·원근이 붙습니다(`toWorldOf`). 점 편집·격자 손잡이는 이 사슬을 거꾸로 짚습니다(`invert`).
 */
function glyphChain(g: GlyphBox, ov?: GlyphOv) {
  const edit = ov?.path && ov.path.ch === g.ch ? ov.path : null;
  const pre = edit ? (p: Pt): Pt => [g.x0 + (p[0] * g.w) / Math.max(1e-6, edit.w), g.y0 + (p[1] * g.h) / Math.max(1e-6, edit.h)] : (p: Pt) => p;
  const box: Box = { x0: g.x0, y0: g.y0, w: g.w, h: g.h };
  const M = meshMap(box, ov?.mesh);
  const A = glyphAffine(g, ov);
  const post = (p: Pt): Pt => (A ? apply(A, M(p)) : M(p));
  return { d0: edit ? edit.d : g.d, edit, pre, post, box, A };
}

/** 고친 적 없는 글자를 편집 공간으로 옮겨 «고칠 외곽»을 만듭니다 — 상자 왼쪽 위가 0,0 */
const editPathOf = (g: GlyphBox, ov?: GlyphOv): GlyphPath =>
  ov?.path && ov.path.ch === g.ch ? ov.path : { d: mapPath(g.d, (p) => [p[0] - g.x0, p[1] - g.y0]), ch: g.ch, w: g.w, h: g.h };

/** 아이템 좌표(왼쪽 위 0,0 · mm) → 벽 좌표. 회전 또는 네 점 원근 — 무대 그림·PRO 되짚기가 같은 함수를 씁니다 */
function toWorldOf(it: Item, w: number, h: number): (p: Pt) => Pt {
  const rect: Pt[] = [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]];
  const H = it.warp && it.warp.length === 4 ? homography(rect, it.warp as Pt[]) : null;
  const R = rotateAt(it.rot ?? 0, 0, 0);
  return (p: Pt): Pt => {
    const c: Pt = [p[0] - w / 2, p[1] - h / 2];
    const q = H ? H(c) : apply(R, c);
    return [q[0] + it.x, q[1] + it.y];
  };
}

/**
 * 판을 다는 철물 (아이템 좌표, 벽이 왼쪽 기준 — 오른쪽이면 좌우를 뒤집습니다).
 * 돌출(T6): 벽 받침 + 까치발 둘 · 걸이(T8): 벽 받침 + 가로 팔 + 봉 둘. 치수는 그림용 어림입니다(제작 도면 아님).
 */
function plateHardware(it: PlateItem): string[] {
  const { w, h } = it;
  const out: string[] = [];
  if (it.mount === "blade") {
    const arm = 130, t = Math.max(18, Math.min(34, h * 0.03));
    out.push(rectPath(-arm - 40, h * 0.08, 40, h * 0.84));
    const ys = h < 320 ? [h / 2] : [h * 0.2, h * 0.8];
    for (const y of ys) out.push(rectPath(-arm, y - t / 2, arm + 12, t));
  } else if (it.mount === "hang") {
    const drop = Math.max(160, h * 0.28), reach = 220;
    out.push(rectPath(-reach - 40, -drop - 120, 40, 240));
    out.push(rectPath(-reach, -drop - 22, reach + w * 0.92, 44));
    for (const x of [w * 0.2, w * 0.8]) out.push(rectPath(x - 8, -drop, 16, drop + 12));
  }
  return it.side === "right" ? out.map((d) => mapPath(d, (p) => [w - p[0], p[1]])) : out;
}

/**
 * 점 정리(PRO) 의 해상도·허용 오차. 로고 따기 기본값(1,200px · 0.55px)을 글자 한 자에 쓰면 너무 촘촘하게 맞춰
 * **점이 오히려 늘었습니다**(2026-09-26 실측: 고운바탕 «나» 91 → 185). 글자 높이를 이 픽셀로 칠하고 이 오차로 맞춥니다.
 * 고른 값(같은 날 다섯 쌍을 재 봄, 고운바탕 «수·나·자»): 520/0.55 → 201·185·219 · 300/0.8 → 103·92·131 · **160/1.5 → 68·61·83** ·
 * 120/1.8 → 61·51·71. 160/1.5 에서 여섯 글자를 원본과 나란히 놓고 봐도 모양 차이가 눈에 안 띄었습니다. 120/1.8 은 점이 더 적지만 모양을 눈으로 확인하지 않아 안 갔습니다.
 * ⚠️ 바탕체는 세리프 모서리마다 기준점이 서서 **절반 가까이까지만** 줄어듭니다(고딕은 더 줄어듭니다).
 */
const SIMPLIFY_PX = 160;
const SIMPLIFY_TOL = 1.5;

/** 모양이 «바뀌었나» 를 싸게 가르는 해시 — 점 하나를 옮겨도 문자열 길이는 같을 수 있습니다 */
function hashStr(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

export default function SignMaker({ mode, initial, share }: { mode: Mode; initial?: unknown; share?: ShareInfo }) {
  const router = useRouter();
  const admin = mode === "admin";
  const viewOnly = mode === "view";

  /* ---------------------------------------------------------- 디자인 + 되돌리기 */
  const [hist, setHist] = useState(() => ({
    past: [] as Design[],
    now: mode === "view" ? (normalize(initial) ?? defaultDesign()) : loadDraft(mode),
    future: [] as Design[],
  }));
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
    // 보기 전용은 초안을 안 남깁니다 — 받은 디자인이 손님의 «만들던 것»을 덮으면 안 됩니다
    if (mode === "view") return;
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
  const [selected, setSelected] = useState<string | null>(viewOnly ? null : (d.items[0]?.id ?? null));
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
  /* 프로젝트 에셋 (F26-j) — 관리자만. 서명 URL 은 6시간 살아서 디자인에 저장하지 않고 여기(메모리)에만 둡니다 */
  const [assets, setAssets] = useState<MakerAsset[] | null>(null);
  const [assetErr, setAssetErr] = useState("");
  const [assetProject, setAssetProject] = useState("");
  const [assetUrls, setAssetUrls] = useState<Map<string, string>>(() => new Map());
  const [canvasPx, setCanvasPx] = useState({ w: 800, h: 500 });
  const [view, setView] = useState<View>({ x: -d.wallW * 0.06, y: -d.wallH * 0.1, w: d.wallW * 1.12 });
  const svgRef = useRef<SVGSVGElement>(null);
  const fitted = useRef(false);
  const kind = kindOf(d);

  /*
   * 폰 화면 (2026-09-26 사람 요청 — *"인스타처럼 네비게이션 바 왔다갔다, 두 손가락, 이상하게 막 드래그 안 되게"*).
   * 768px 미만이면 3단을 버리고 «무대 가득 + 아래 탭 + 올라오는 시트»로 그립니다. **부품은 PC 와 같고 배치만 갈립니다**
   * (F26 «모드 둘, 부품 하나» — 두 벌로 만들면 고장도 두 벌). 디자인 결은 피그마 UI3(둥근 떠 있는 단추·활성 칸 채움·굵은 슬라이더)와
   * 인스타 편집기(분류 알약·아이콘 타일)를 수산나 청록 안에서 따랐습니다(2026-09-26 크롬으로 직접 봄 — 인스타 원본은 로그인 벽이라 커뮤니티 재현본).
   */
  const phone = useMedia(MAKER_PHONE_QUERY);
  const coarse = useMedia("(pointer: coarse)");
  const [tab, setTab] = useState<PhoneTab | null>(null);
  const [hint, setHint] = useState(false);

  const select = (id: string | null) => {
    if (viewOnly) return;
    setSelected(id);
    setGlyph(null);
    if (!id) setWarpMode(false);
  };

  /* ---------------------------------------------------------- 처음 온 사람 안내 (F26-a) */
  const [tour, setTour] = useState(false);
  useEffect(() => {
    // 본 적 없으면 화면이 자리 잡은 뒤 한 번 띄웁니다. 상단 막대 «도움말»은 언제든 다시 엽니다
    // 보기 전용(공유 링크)엔 안 띄웁니다 — 안내가 가리키는 편집 칸들이 없습니다
    if (mode === "view") return;
    let t = 0;
    try {
      if (!localStorage.getItem(makerTourKey(mode, phone))) t = window.setTimeout(() => setTour(true), 700);
    } catch {
      /* 저장소가 막힌 브라우저 — 매번 띄우면 귀찮으니 안 띄웁니다. «도움말»로 봅니다 */
    }
    const open = () => setTour(true);
    window.addEventListener(MAKER_HELP_EVENT, open);
    return () => {
      clearTimeout(t);
      window.removeEventListener(MAKER_HELP_EVENT, open);
    };
  }, [mode, phone]);
  const endTour = () => {
    setTour(false);
    if (mode === "view") return;
    try {
      localStorage.setItem(makerTourKey(mode, phone), new Date().toISOString());
    } catch {
      /* 저장소가 막힘 — 다음에 또 뜨지 않게 할 방법이 없을 뿐입니다 */
    }
  };
  /** 단계마다 화면 준비 — 오른쪽 «글자» 칸이 있어야 보이는 단계는 첫 글자를 골라 둡니다 */
  const prepareTour = (s: TourStep) => {
    setWarpMode(false);
    setTab(null); // 폰 — 시트가 열려 있으면 안내가 가리키는 탭·무대를 덮습니다
    if (!s.needsText) return;
    const cur = d.items.find((x) => x.id === selected);
    if (cur?.type === "text") return;
    const t = d.items.find((x) => x.type === "text");
    if (t) select(t.id);
  };

  const fit = useCallback(
    (wallW = d.wallW, wallH = d.wallH, px = canvasPx) => {
      // 폰은 무대 위쪽 약 100px 에 닫기·되돌리기·주야간 단추가 떠 있어, 벽을 그 밑 빈 곳 가운데에 둡니다
      const top = phone ? 104 : 0, bottom = phone ? 12 : 0;
      const usable = Math.max(60, px.h - top - bottom);
      const w = Math.max(wallW * 1.1, (wallH * 1.16 * px.w) / usable);
      const k = w / px.w; // 화면 1px 의 mm
      setView({ x: (wallW - w) / 2, y: wallH / 2 - (top + usable / 2) * k, w });
    },
    [d.wallW, d.wallH, canvasPx, phone],
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
      const key = JSON.stringify([it.lines, it.font, !!it.vertical]);
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
          const outline = layoutLines(font, it.lines, 0.35, !!it.vertical);
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
      } else if (it.type === "plate") {
        m.set(it.id, { size: { w: it.w, h: it.h }, paths: [{ d: platePath(it.shape, it.w, it.h), color: it.fill }], glyphBoxes: {}, letterH: Math.min(it.w, it.h) * 0.3 });
      } else if (it.type === "image") {
        const h = (it.w * it.srcH) / Math.max(1, it.srcW);
        m.set(it.id, { size: { w: it.w, h }, paths: [{ d: `M0,0L${it.w},0L${it.w},${h}L0,${h}Z`, color: "transparent" }], glyphBoxes: {}, letterH: 0 });
      } else if (it.type === "logo") {
        const k = it.w / Math.max(1, it.srcW);
        m.set(it.id, {
          size: { w: it.w, h: it.srcH * k },
          paths: it.layers.map((l) => ({ d: mapPath(l.d, (p) => [p[0] * k, p[1] * k]), color: l.color })),
          glyphBoxes: {},
          letterH: it.letterMm ?? it.srcH * k,
        });
      } else {
        const t = texts.get(it.id);
        if (!t) continue;
        const glyphBoxes: Record<number, Pt[]> = {};
        // PRO — 글자 전체 격자 왜곡은 글자 한 자의 꾸밈 «뒤»에 먹입니다(아이템 상자 기준)
        const IM = meshMap({ x0: 0, y0: 0, w: t.outline.w, h: t.outline.h }, it.mesh);
        const paths: RPath[] = t.outline.glyphs.map((g) => {
          const ov = it.glyphs?.[g.i];
          const ch = glyphChain(g, ov);
          const corners: Pt[] = [[g.x0, g.y0], [g.x0 + g.w, g.y0], [g.x0 + g.w, g.y0 + g.h], [g.x0, g.y0 + g.h]];
          glyphBoxes[g.i] = corners.map((c) => IM(ch.post(c)));
          const plain = !ch.edit && !ov?.mesh && !ch.A && !it.mesh;
          return { d: plain ? g.d : mapPath(ch.d0, (p) => IM(ch.post(ch.pre(p)))), color: ov?.color ?? it.face, glyph: g.i };
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
        const toWorld = toWorldOf(it, w, h);
        const H = it.warp && it.warp.length === 4;
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
            image: it.type === "image" ? { href: assetUrls.get(it.asset) ?? null } : undefined,
            plate:
              it.type === "plate"
                ? { fill: it.fill, border: it.border || undefined, borderW: it.border ? (it.borderMm ?? 30) : 0, hardware: plateHardware(it).map((hd) => mapPath(hd, toWorld)) }
                : undefined,
          },
        ];
      }),
    [d.items, d.bar, locals, kind.lit, assetUrls],
  );

  /** 바탕판 (T5) — 글자 폭을 먼저 재고 판을 거기 맞춥니다(SIGNTYPES.md §8-3 «바탕판을 먼저 정하지 마라») */
  const board = useMemo(() => {
    if (!kind.backboard) return null;
    const s = ritems.filter((q) => q.type === "text" || q.type === "logo");
    if (!s.length) return null;
    const xs = s.flatMap((q) => q.quad.map((v) => v[0])), ys = s.flatMap((q) => q.quad.map((v) => v[1]));
    const lh = Math.max(200, ...s.map((q) => q.letterH));
    const pad = d.boardPad ?? 0.8, mx = lh * pad, my = lh * pad * 0.5;
    return { x: Math.min(...xs) - mx, y: Math.min(...ys) - my, w: Math.max(...xs) - Math.min(...xs) + mx * 2, h: Math.max(...ys) - Math.min(...ys) + my * 2 };
  }, [kind.backboard, ritems, d.boardPad]);

  const overall: Measured | null = useMemo(() => {
    if (board) return { w: board.w, h: board.h };
    const s = ritems.filter((q) => q.type !== "patch" && q.type !== "image");
    if (!s.length) return null;
    const xs = s.flatMap((q) => q.quad.map((v) => v[0])), ys = s.flatMap((q) => q.quad.map((v) => v[1]));
    return { w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
  }, [ritems, board]);

  /* ---------------------------------------------------------- 판정 (조금 늦게 — 모양이 바뀐 것만) */
  const [fabs, setFabs] = useState<Map<string, FabResult | null>>(new Map());
  const fabKey = d.items
    .filter(isSign)
    .map((it) => {
      const L = locals.get(it.id);
      return `${it.id}:${L?.size.w.toFixed(0)}x${L?.size.h.toFixed(0)}:${hashStr(L?.paths.map((q) => q.d).join("") ?? "")}`;
    })
    .join("|");
  useEffect(() => {
    const t = setTimeout(() => {
      const m = new Map<string, FabResult | null>();
      for (const it of d.items) {
        if (!isSign(it)) continue;
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
      if (!isSign(it)) continue;
      const t = it.type === "text" ? texts.get(it.id) : null;
      const minLetter = it.type === "text" ? Math.min(...it.lines.map((l) => l.heightMm)) : (it.letterMm ?? locals.get(it.id)?.size.h);
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
  // 치수선·눈금·격자 색(ink)은 벽 밝기로 가릅니다 — 벽 색을 손님이 고르면서 «흰 벽엔 먹, 어두운 벽엔 흰색»을 표로 둘 수 없게 됐습니다
  const wall =
    d.wall === "photo" && photo ? { color: wallFill(d), ink: "#ffffff", photo: photo.url } : { color: wallFill(d), ink: inkOn(wallFill(d)) };

  function pickWall(key: string, color?: string) {
    commit((p) => ({ ...p, wall: key, ...(color ? { wallColor: color } : {}), ...(p.wall === "photo" ? { wallW: 8000, wallH: 4000 } : {}) }));
    if (d.wall === "photo") fit(8000, 4000);
  }

  async function onPhoto(file: File) {
    const url = URL.createObjectURL(file);
    const im = new Image();
    im.src = url;
    await im.decode();
    photoFile.current = file;
    placePhoto(url, im.naturalWidth, im.naturalHeight);
    // 건물 사진이 들어오면 색도 같이 뽑습니다(사람 요청 «건물을 넣으면 퍼스널 색을 뽑게») — 사진은 이 탭 밖으로 안 나갑니다
    pickPalette(file);
  }

  /** 사진을 벽으로 — 올린 파일이든 «건물 색 찾기»에서 넘어온 것이든 같은 길 */
  function placePhoto(url: string, w: number, h: number) {
    setPhoto({ url, w, h });
    // 처음엔 «사진 가로 = 8m» 로 어림합니다 — 축척 보정(십자선) 전까지는 어림입니다
    const W = 8000, Hh = (W * h) / Math.max(1, w);
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
        const hh = it.type === "text" ? it.lines.reduce((a, l) => a + l.heightMm * 1.35, 0) : it.type === "plate" ? it.h : 0;
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
    if (phone) setTab("text"); // 폰 — 넣자마자 문구를 고치게 «글자» 시트로
  }

  function addPatch() {
    const it: Item = { id: newId(), type: "patch", x: d.wallW / 2, y: d.wallH * 0.3, w: d.wallW * 0.4, h: d.wallH * 0.12, color: "#d9d7d0" };
    commit((p) => ({ ...p, items: [...p.items, it] }));
    select(it.id);
  }

  /* ---------------------------------------------------------- 프로젝트 에셋 (F26-j · 2026-09-26) — 관리자만 */
  async function loadAssets() {
    if (mode !== "admin") return;
    setAssetErr("");
    const r = await getMakerAssets();
    if (!r.ok) {
      setAssetErr(r.error);
      setAssets([]);
      return;
    }
    setAssets(r.items);
    setAssetUrls(new Map(r.items.flatMap((a) => (a.url ? [[a.id, a.url] as [string, string]] : []))));
    setAssetProject((cur) => (cur && r.items.some((a) => a.project === cur) ? cur : (r.items[r.items.length - 1]?.project ?? "")));
  }

  /** SVG 는 로고(색 바꾸기·판정 가능), PNG·JPG 는 그림(실사 출력) — 🔴 그림은 판정·제작용 SVG 에 안 들어갑니다 */
  async function addAsset(a: MakerAsset) {
    if (!a.url) return setErr("이 에셋의 주소를 못 받았습니다 — «새로고침»을 눌러 보세요.");
    setErr("");
    try {
      if (a.kind === "svg") {
        const txt = await (await fetch(a.url)).text();
        addLogo(a.name, parseAssetSvg(txt));
        return;
      }
      const srcW = a.width || 1000, srcH = a.height || 1000;
      const w = Math.min(d.wallW * 0.35, 2000), h = (w * srcH) / srcW;
      const it: ImageItem = { id: newId(), type: "image", asset: a.id, name: a.name, srcW, srcH, w, x: d.wallW / 2, y: freeY(h) };
      commit((p) => ({ ...p, items: [...p.items, it] }));
      select(it.id);
    } catch (e) {
      setErr(`에셋을 넣지 못했습니다: ${(e as Error).message}`);
    }
  }

  // 관리자 — 처음 한 번 목록과 주소를 받아 둡니다(초안에 이미 올린 그림이 있으면 바로 보이게)
  useEffect(() => {
    if (mode !== "admin") return;
    let alive = true;
    getMakerAssets()
      .then((r) => {
        if (!alive) return;
        if (!r.ok) {
          setAssetErr(r.error);
          setAssets([]);
          return;
        }
        setAssets(r.items);
        setAssetUrls(new Map(r.items.flatMap((a) => (a.url ? [[a.id, a.url] as [string, string]] : []))));
        setAssetProject(r.items[r.items.length - 1]?.project ?? "");
      })
      .catch((e: Error) => alive && setAssetErr(e.message));
    return () => {
      alive = false;
    };
  }, [mode]);

  /* ---------------------------------------------------------- 판 · 레퍼런스 스타일 (2026-09-26) */
  function addPlate() {
    const it: PlateItem = { id: newId(), type: "plate", shape: "rect", mount: "wall", side: "left", fill: "#1b1d1c", border: "", borderMm: 30, w: 1600, h: 500, x: d.wallW / 2, y: freeY(500) };
    commit((p) => ({ ...p, items: [...p.items, it] }));
    select(it.id);
  }

  /**
   * 레퍼런스 스타일 한 벌을 차립니다. 지금 벽의 **글자·판을 이 스타일로 바꾸고**(로고·가리기 판은 둡니다), 상호는 첫 글자 줄에서 가져옵니다.
   * 판 크기는 상호 글자 수에 맞춰 늘립니다(판이 글자보다 작으면 글자가 판 밖으로 나갑니다). 되돌리기 한 번이면 전으로 갑니다.
   */
  function applyStyle(s: RefStyle, nameOverride?: string) {
    const t0 = d.items.find((x): x is TextItem => x.type === "text");
    const name = nameOverride?.trim() || t0?.lines[0]?.text.trim() || "가게 이름";
    const sub = t0?.lines[1]?.text.trim() || "업종 · 전화";
    const n = [...name.replace(/\s/g, "")].length;
    const H = s.text.heightMm, tr = (s.text.tracking ?? 0) / 1000;
    const cx = d.wallW / 2, cy = d.wallH * 0.42;
    const lines = [{ text: name, heightMm: H, tracking: s.text.tracking ?? 0 }];
    if (s.subRatio) lines.push({ text: sub, heightMm: Math.max(50, Math.round((H * s.subRatio) / 5) * 5), tracking: 0 });
    const face = s.tone && d.palette?.length ? toneOn(d.palette[0]) : s.text.face;
    const items: Item[] = [];
    if (s.plate) {
      let { w, h } = s.plate;
      if (s.text.vertical) h = Math.max(h, n * H * 1.2 + H * 1.1);
      else w = Math.max(w, n * H * (1.02 + tr) + H * (s.plate.shape === "oval" ? 2.2 : 1.4));
      if (s.subRatio && !s.text.vertical) h = Math.max(h, H * (1 + s.subRatio) + H * 1.3);
      items.push({ id: newId(), type: "plate", shape: s.plate.shape, mount: s.plate.mount, side: "left", fill: s.plate.fill, border: s.plate.border ?? "", borderMm: s.plate.borderMm ?? 30, w: Math.round(w), h: Math.round(h), x: cx, y: cy });
    }
    const text: TextItem = { id: newId(), type: "text", lines, font: { src: "lib", slug: s.text.font }, face, vertical: s.text.vertical, x: cx, y: cy };
    items.push(text);
    commit((p) => ({ ...p, kind: s.kind, depth: undefined, items: [...p.items.filter((x) => x.type === "logo" || x.type === "patch"), ...items] }));
    select(text.id);
  }

  /* ---------------------------------------------------------- 건물 색 (퍼스널 컬러, F26-f) */
  const photoFile = useRef<File | null>(null);
  /** 뽑은 색마다 사진에서 차지한 비율 — 디자인에는 색 값만 남기고 비율은 이 탭에만 둡니다 */
  const [palShare, setPalShare] = useState<number[]>([]);
  /** 하늘로 보고 뺀 부분(사진의 %) — 화면에 알립니다(조용히 빼면 «색이 왜 이것뿐?» 이 됩니다) */
  const [skyCut, setSkyCut] = useState(0);

  async function pickPalette(file?: File | null) {
    const src = file ?? photoFile.current;
    if (!src) return;
    setErr("");
    try {
      const img = await imageDataOf(src, 600);
      // «건물 색 찾기»(F26-h)와 같은 자로 뽑습니다 — 하늘은 사진 위 가장자리에 이어진 덩어리만 빼고(흰 타일 벽을 하늘로 빼던
      // 옛 방식 `extractPalette` 의 고장), 사진 아래 바닥·도로는 비중을 낮춥니다. 두 화면이 다른 색을 말하면 안 됩니다
      const sw = pickSpots(img, 6, "area", true);
      if (!sw.length) return setErr("사진에서 건물 색을 뽑지 못했습니다 — 건물 벽이 크게 나온 사진으로 해 보세요.");
      setPalShare(sw.map((s) => s.share));
      setSkyCut(Math.round(skyShare(img) * 100));
      commit((p) => ({ ...p, palette: sw.map((s) => s.hex) }));
    } catch (e) {
      setErr(`사진을 읽지 못했습니다: ${(e as Error).message}`);
    }
  }

  const recs: Rec[] = useMemo(() => recommend((d.palette ?? []).map((hex, i) => ({ hex, share: palShare[i] ?? 1 / (i + 2) }))), [d.palette, palShare]);

  /** 뽑은 색 하나 — 고른 것에 입힙니다(글자면 앞면 · 판이면 판 색). 아무것도 안 골랐으면 벽 색으로 */
  function pickSwatch(hex: string) {
    if (sel?.type === "text") return setItem(sel.id, { face: hex });
    if (sel?.type === "plate") return setItem(sel.id, { fill: hex });
    if (d.wall !== "photo") pickWall("color", hex);
  }

  /**
   * 추천 한 안을 입힙니다(F26-i). 판을 권하는 안인데 벽에 판이 없으면 **현판 틀로 새로 차리고**(판·글자를 그 색으로),
   * 판이 이미 있으면 색만 바꿉니다(판 색 · 포인트는 판 테두리). 판 없는 안(톤온톤)은 글자 색만 — 사진 벽이 아니면 벽도 건물 색으로.
   */
  function applyRec(r: Rec, name?: string) {
    const hasPlate = d.items.some((x) => x.type === "plate");
    if (r.plate && !hasPlate) {
      const base = refStyles.find((s) => s.key === "hyeonpan")!;
      applyStyle(
        { ...base, plate: { ...base.plate!, fill: r.plate, border: r.point ?? "", borderMm: r.point ? 28 : undefined }, text: { ...base.text, font: "noto-sans-kr", face: r.face } },
        name,
      );
      // 🔴 벽 판단은 «최신» 상태로 — 건물 색 찾기에서 넘어올 땐 방금 사진 벽을 깔았는데 `d` 는 아직 옛 벽이라, 사진을 덮어썼습니다(2026-09-26 실측)
      commit((p) => (p.wall === "photo" ? p : { ...p, wall: "color", wallColor: r.wall }));
      return;
    }
    if (!d.items.some((x) => x.type === "text")) {
      const base = refStyles.find((s) => s.key === "letters")!;
      applyStyle({ ...base, text: { ...base.text, face: r.face } }, name);
      // 🔴 벽 판단은 «최신» 상태로 — 건물 색 찾기에서 넘어올 땐 방금 사진 벽을 깔았는데 `d` 는 아직 옛 벽이라, 사진을 덮어썼습니다(2026-09-26 실측)
      commit((p) => (p.wall === "photo" ? p : { ...p, wall: "color", wallColor: r.wall }));
      return;
    }
    const target = sel?.type === "text" ? sel.id : null;
    commit((p) => ({
      ...p,
      ...(p.wall !== "photo" ? { wall: "color", wallColor: r.wall } : {}),
      items: p.items.map((it) => {
        if (it.type === "text" && (!target || it.id === target)) return { ...it, face: r.face };
        if (it.type === "plate" && r.plate) return { ...it, fill: r.plate, border: r.point ?? it.border, borderMm: r.point ? (it.borderMm ?? 28) : it.borderMm };
        return it;
      }),
    }));
  }

  /* ---------------------------------------------------------- PRO 모드 (F26-g) */
  const [pro, setPro] = useState(() => {
    if (mode === "view") return false;
    try {
      return localStorage.getItem(makerProKey(mode)) === "1";
    } catch {
      return false;
    }
  });
  const [proTool, setProTool] = useState<"glyph" | "points" | "mesh">("glyph");
  const [meshScope, setMeshScope] = useState<"glyph" | "item">("glyph");
  const [meshN, setMeshN] = useState(2);
  /** 점 편집 — 마지막으로 잡은 기준점(이 점의 조절점만 보입니다). `key` 가 지금 «아이템:글자» 와 다르면 없는 것으로 봅니다 */
  const [activeNode, setActiveNode] = useState<{ key: string; i: number } | null>(null);
  const setProOn = (v: boolean) => {
    if (mode === "view") return;
    setPro(v);
    setWarpMode(false);
    if (!v) setProTool("glyph");
    try {
      localStorage.setItem(makerProKey(mode), v ? "1" : "0");
    } catch {
      /* 저장소가 막힘 — 이번 탭에서만 켜집니다 */
    }
  };

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

  // «건물 색 찾기»(F26-h)에서 넘어온 사진·색 받기 — 사진은 같은 탭 안의 메모리로만, 색은 저장소로도 건너옵니다
  useEffect(() => {
    if (mode === "view") return;
    const h = takeForEditor();
    let pal: string[] | null = h?.palette ?? null;
    try {
      const raw = localStorage.getItem(INCOMING_PALETTE_KEY);
      if (raw) {
        localStorage.removeItem(INCOMING_PALETTE_KEY);
        pal = pal ?? (JSON.parse(raw) as string[]);
      }
    } catch {
      /* 저장소가 막힘 — 같은 탭 안에서 넘어온 값만 씁니다 */
    }
    if (h?.photo) {
      const ph = h.photo;
      placePhoto(ph.url, ph.w, ph.h);
      // «가게 사진에서 뽑기» 가 다시 쓸 수 있게 파일로도 들고 있습니다(blob: 주소는 같은 문서라 열립니다)
      fetch(ph.url)
        .then((r) => r.blob())
        .then((b) => (photoFile.current = new File([b], ph.name, { type: b.type })))
        .catch(() => {});
    }
    if (pal?.length) {
      const got = pal;
      setPalShare([]);
      setSkyCut(0);
      commit((p) => ({ ...p, palette: got }));
    }
    // «이 안으로 간판 만들기»(F26-i) — 그 색으로 판·글자를 차립니다
    if (h?.rec) {
      const rc = h.rec;
      applyRec({ key: rc.plate ? "hyeonpan" : "tone", label: "", why: "", wall: pal?.[0] ?? "#e6e3dc", plate: rc.plate, face: rc.face, point: rc.point, ratio: 0 }, rc.name);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 처음 한 번만(넘어온 것을 꺼내 비웁니다)
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

  // «로고 만들기»(F26-k)에서 보낸 로고 한 벌·세 벌 받기 — 판(배지)·로고(심벌)·글자 아이템 묶음. 같은 브라우저 저장소로만 건너옵니다.
  // 🔴 벽의 글자·로고·판을 **바꿉니다**(가리기·그림은 둡니다) — «레퍼런스 스타일»과 같은 약속이고, 되돌리기 한 번이면 전으로 갑니다.
  // 벽이 좁으면 넓힙니다(사진 벽은 그대로) — 화면 맞춤은 무대가 처음 재어질 때(`onMeasure`) 넓힌 벽으로 합니다.
  useEffect(() => {
    if (mode === "view") return;
    let got: { kind?: string; groups: { name: string; w: number; h: number; items: Item[] }[] } | null = null;
    try {
      const raw = localStorage.getItem(INCOMING_ITEMS_KEY);
      if (!raw) return;
      localStorage.removeItem(INCOMING_ITEMS_KEY);
      got = JSON.parse(raw);
    } catch {
      return;
    }
    const groups = got?.groups?.filter((g) => Array.isArray(g.items) && g.items.length) ?? [];
    if (!groups.length) return;
    const gap = Math.max(700, Math.max(...groups.map((g) => g.w)) * 0.35); // 치수선 글자가 옆 안에 겹치지 않게
    const total = groups.reduce((a, g) => a + g.w, 0) + gap * (groups.length - 1);
    const tallest = Math.max(...groups.map((g) => g.h));
    const kindKey = got?.kind;
    commit((p) => {
      const photoWall = p.wall === "photo";
      const W = photoWall ? p.wallW : Math.max(p.wallW, Math.ceil((total * 1.25) / 1000) * 1000);
      const H = photoWall ? p.wallH : Math.max(p.wallH, Math.ceil((tallest * 2) / 500) * 500);
      let x = W / 2 - total / 2;
      const y = H * 0.45;
      const placed: Item[] = [];
      for (const g of groups) {
        const cx = x + g.w / 2;
        for (const it of g.items) placed.push({ ...it, id: newId(), x: cx + it.x, y: y + it.y } as Item);
        x += g.w + gap;
      }
      const kind = kindKey && makerKinds.some((k) => k.key === kindKey) ? kindKey : p.kind;
      return { ...p, kind, wallW: W, wallH: H, items: [...p.items.filter((it) => it.type === "patch" || it.type === "image"), ...placed] };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 처음 한 번만(넘어온 것을 꺼내 비웁니다)
  }, []);

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
      if (viewOnly) return; // 보기 전용 — 되돌리기·지우기·옮기기 단축키가 없습니다
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

  /** 처음 모양(`base`)을 `f` 배로 — 손잡이 끌기와 두 손가락이 같은 셈을 씁니다 */
  function scaled(base: Item, f: number): Partial<Item> {
    const k = Math.max(0.1, Math.min(10, f));
    const warp = base.warp ? base.warp.map((q) => [q[0] * k, q[1] * k] as [number, number]) : base.warp;
    if (base.type === "text") return { lines: base.lines.map((l) => ({ ...l, heightMm: Math.max(20, Math.round((l.heightMm * k) / 5) * 5) })), warp };
    if (base.type === "logo" || base.type === "image") return { w: Math.max(50, Math.round(base.w * k)), warp };
    return { w: Math.max(50, base.w * k), h: Math.max(20, base.h * k), warp };
  }

  function onResize(id: string, f: number, done: boolean) {
    const base = baseOf(id);
    if (!base) return;
    setItem(id, scaled(base, f), !done);
    endGesture(done);
  }

  /**
   * 두 손가락 — 크기와 회전을 한 번에(사람 결정 2026-09-26 «크기+회전, 0°·90° 에 자석»).
   * 크기만 바꾸려다 손이 조금 비틀려 간판이 1~2° 기우는 게 제일 흔한 사고라, 반듯한 각도 근처(`PINCH_SNAP_DEG`)에서는 붙입니다.
   * 원근이 걸린 것은 네 점을 통째로 돌립니다(`onRotate` 와 같은 규칙).
   */
  function onPinch(id: string, f: number, dDeg: number, done: boolean) {
    const base = baseOf(id);
    if (!base) return;
    const patch = scaled(base, f);
    const snap = (deg: number) => {
      const n = ((deg % 360) + 360) % 360;
      for (const t of [0, 90, 180, 270, 360]) if (Math.abs(n - t) <= PINCH_SNAP_DEG) return t % 360;
      return n;
    };
    if (base.warp) {
      const w = (patch.warp ?? base.warp) as [number, number][];
      const cur = (Math.atan2(base.warp[1][1] - base.warp[0][1], base.warp[1][0] - base.warp[0][0]) * 180) / Math.PI;
      const R = rotateAt(snap(cur + dDeg) - cur, 0, 0);
      patch.warp = w.map((q) => apply(R, q as Pt) as [number, number]);
    } else patch.rot = Math.round(snap((base.rot ?? 0) + dDeg) * 10) / 10;
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

  /* ---------------------------------------------------------- PRO — 끌기 (무대는 벽 좌표만 줍니다 · 여기서 되짚습니다) */

  /** 고른 글자 아이템의 «아이템 좌표 → 벽» 사슬 (글자 전체 격자 왜곡 포함) */
  function itemChain(it: TextItem) {
    const t = texts.get(it.id), L = locals.get(it.id);
    if (!t || !L) return null;
    const box: Box = { x0: 0, y0: 0, w: L.size.w, h: L.size.h };
    const W = toWorldOf(it, L.size.w, L.size.h);
    const IM = meshMap(box, it.mesh);
    return { t, L, box, W, IM, F: (p: Pt) => W(IM(p)) };
  }

  /** 글자 한 자 끌기 — 끈 거리를 «꾸밈 전» 좌표로 되짚어 dx·dy 에 더합니다(회전·원근·격자가 걸려 있어도 손을 따라옵니다) */
  function onGlyphDrag(id: string, gi: number, start: Pt, cur: Pt, done: boolean) {
    const base = baseOf(id);
    if (!base || base.type !== "text") return;
    const c = itemChain(base);
    if (!c) return;
    const g = c.t.outline.glyphs.find((x) => x.i === gi);
    const guess: Pt = g ? [g.x0 + g.w / 2, g.y0 + g.h / 2] : [c.box.w / 2, c.box.h / 2];
    const a = invert(c.F, start, guess), b = invert(c.F, cur, guess);
    // 눌렀다 뗐을 뿐이면(한 번도 안 움직였으면) 되돌리기 목록에 빈 칸을 쌓지 않습니다
    if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 0.5 && !dragBase.current) {
      if (done) endGesture(true);
      return;
    }
    const ov = base.glyphs?.[gi] ?? {};
    const next: GlyphOv = { ...ov, dx: Math.round((ov.dx ?? 0) + b[0] - a[0]), dy: Math.round((ov.dy ?? 0) + b[1] - a[1]) };
    setItem(id, { glyphs: { ...(base.glyphs ?? {}), [gi]: next } }, !done);
    endGesture(done);
  }

  /** 점 하나 끌기 — 편집 공간으로 되짚어 그 점(과 붙은 조절점·겹친 시작점)을 옮깁니다 */
  function onNodeDrag(i: number, p: Pt, done: boolean) {
    if (!selected || glyph === null) return;
    const base = baseOf(selected);
    if (!base || base.type !== "text") return;
    const c = itemChain(base);
    const g = c?.t.outline.glyphs.find((x) => x.i === glyph);
    if (!c || !g) return;
    const ov = base.glyphs?.[glyph];
    const ep = editPathOf(g, ov);
    const ch = glyphChain(g, ov);
    const pre = (q: Pt): Pt => [g.x0 + (q[0] * g.w) / Math.max(1e-6, ep.w), g.y0 + (q[1] * g.h) / Math.max(1e-6, ep.h)];
    const F = (q: Pt) => c.F(ch.post(pre(q)));
    const segs = parsePath(ep.d);
    const n = nodesOf(segs)[i];
    if (!n) return;
    const key = `${selected}:${glyph}`;
    if (n.anchor && (activeNode?.key !== key || activeNode.i !== i)) setActiveNode({ key, i });
    const from = segs[n.seg].p[n.pt];
    const to = invert(F, p, from);
    const dx = to[0] - from[0], dy = to[1] - from[1];
    for (const k of linkedNodes(segs, n)) {
      const q = segs[k.seg].p[k.pt];
      segs[k.seg].p[k.pt] = [q[0] + dx, q[1] + dy];
    }
    setItem(selected, { glyphs: { ...(base.glyphs ?? {}), [glyph]: { ...ov, path: { ...ep, d: serializePath(segs) } } } }, !done);
    endGesture(done);
  }

  /** 격자점 하나 끌기 — 이 글자(`meshScope = glyph`) 또는 글자 전체의 격자 */
  function onMeshDrag(i: number, p: Pt, done: boolean) {
    if (!selected) return;
    const base = baseOf(selected);
    if (!base || base.type !== "text") return;
    const c = itemChain(base);
    if (!c) return;
    const setOff = (m: Mesh, box: Box, G: (q: Pt) => Pt): Mesh => {
      const ii = i % (m.cols + 1), jj = Math.floor(i / (m.cols + 1));
      const cur = meshNode(box, m, ii, jj);
      const to = invert(G, p, cur);
      const off = m.off.map((o) => [o[0], o[1]] as [number, number]);
      off[i] = [(to[0] - (box.x0 + (ii / m.cols) * box.w)) / box.w, (to[1] - (box.y0 + (jj / m.rows) * box.h)) / box.h];
      return { ...m, off };
    };
    if (meshScope === "item" || glyph === null) {
      const m = base.mesh ?? meshNew(meshN);
      setItem(selected, { mesh: setOff(m, c.box, c.W) }, !done);
    } else {
      const g = c.t.outline.glyphs.find((x) => x.i === glyph);
      if (!g) return;
      const ov = base.glyphs?.[glyph] ?? {};
      const A = glyphAffine(g, ov);
      const m = ov.mesh ?? meshNew(meshN);
      const mesh = setOff(m, { x0: g.x0, y0: g.y0, w: g.w, h: g.h }, (q) => c.F(A ? apply(A, q) : q));
      setItem(selected, { glyphs: { ...(base.glyphs ?? {}), [glyph]: { ...ov, mesh } } }, !done);
    }
    endGesture(done);
  }

  /** 점 나누기 — 고른 글자의 외곽 점을 두 배로 */
  function subdivideGlyph() {
    if (sel?.type !== "text" || glyph === null) return;
    const g = texts.get(sel.id)?.outline.glyphs.find((x) => x.i === glyph);
    if (!g) return;
    const ov = sel.glyphs?.[glyph];
    const ep = editPathOf(g, ov);
    setGlyphOv(sel.id, glyph, { path: { ...ep, d: serializePath(subdivide(parsePath(ep.d))) } });
  }

  /**
   * 점 정리 — 글자를 캔버스에 칠한 뒤 **로고 따기와 같은 벡터화기**(`traceGray`, vclean 을 옮긴 것)로 다시 땁니다.
   * 🔴 왜: 바탕·붓 글꼴은 곡선을 잘게 쪼갠 점으로 저장돼 한 글자에 기준점이 수백 개입니다(2026-09-26 실측 — 고운바탕 «나» 를
   * 305% 로 봐도 점 네모가 글자를 덮음). 코너를 살리고 곡선은 3차 베지어로 맞춰 **적은 점의 매끈한 외곽**이 됩니다. 모양은 거의 그대로입니다.
   */
  function simplifyGlyph() {
    if (sel?.type !== "text" || glyph === null) return;
    const g = texts.get(sel.id)?.outline.glyphs.find((x) => x.i === glyph);
    if (!g) return;
    const ov = sel.glyphs?.[glyph];
    const ep = editPathOf(g, ov);
    const k = SIMPLIFY_PX / Math.max(1, ep.h), pad = 12;
    const cv = document.createElement("canvas");
    cv.width = Math.ceil(ep.w * k) + pad * 2;
    cv.height = Math.ceil(ep.h * k) + pad * 2;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.setTransform(k, 0, 0, k, pad, pad);
    ctx.fillStyle = "#000";
    ctx.fill(new Path2D(ep.d), "evenodd");
    const layer = layersFromImage(ctx.getImageData(0, 0, cv.width, cv.height), "ink")[0];
    const cs = layer ? traceGray(layer.gray, { tol: SIMPLIFY_TOL }) : [];
    if (!cs.length) return setErr("이 글자의 외곽을 다시 따지 못했습니다.");
    setGlyphOv(sel.id, glyph, { path: { ...ep, d: toPathD(cs, 1 / k, -pad / k, -pad / k) } });
  }

  /** 격자 칸 수 바꾸기 — 그 범위의 격자를 새로 깝니다(이미 휜 모양은 풀립니다) */
  function setMeshSize(n: number) {
    setMeshN(n);
    if (sel?.type !== "text") return;
    if (meshScope === "item" || glyph === null) setItem(sel.id, { mesh: meshNew(n) });
    else setGlyphOv(sel.id, glyph, { mesh: meshNew(n) });
  }

  /* ---------------------------------------------------------- 내보내기 · 견적 */
  const sizes = useMemo(() => new Map(ritems.map((s) => [s.id, s.size])), [ritems]);
  const ledName = ledColors.find((l) => l.hex === d.led)?.name ?? d.led;
  const wallName = wallLabel(d);
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
      if (it.type === "patch" || it.type === "image") return [];
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
      // 공유 링크로 받은 디자인이면 어느 링크인지 요약에 붙입니다 — 대표님이 문의를 받고 그 링크를 바로 엽니다
      // (맨 앞에 둡니다 — 폼이 긴 요약을 뒤에서 자릅니다)
      const from = share ? `공유 링크: ${location.origin}/maker/s/${share.token}
` : "";
      // 디자인 JSON 도 같이 건넵니다 — 견적을 «보낼 때» 서버가 이걸로 방(보기 전용 링크)을 만들어 담당자에게 붙입니다(0017).
      // 공유와 같은 거르개(shareable)를 지납니다: 가게 사진은 빠지고, 올린 글꼴 글자는 외곽선으로 굳습니다.
      // 글꼴을 아직 불러오는 중이거나 너무 크면 디자인은 빼고 JPG·SVG 만 갑니다(견적은 막지 않습니다)
      const s = shareable();
      const design = "error" in s || new TextEncoder().encode(JSON.stringify(s.design)).length > MAKER_SHARE_MAX_BYTES ? undefined : s.design;
      sessionStorage.setItem(MAKER_STORAGE_KEY, JSON.stringify({ summary: from + summary(), svg: fabricationSvg(placed()), jpg, design, title: share?.title || firstText }));
      router.push("/quote?maker=1");
    } catch (e) {
      setErr(`견적 폼으로 넘기지 못했습니다: ${(e as Error).message}`);
      setBusy("");
    }
  }

  /* ---------------------------------------------------------- 공유 링크 (F26-b) */
  const [shareOut, setShareOut] = useState<{ url: string; expires: string; notes: string[] } | null>(null);
  const [shares, setShares] = useState<{ items: ShareItem[]; at: number } | null>(null);
  const [shareTitle, setShareTitle] = useState("");
  const firstText = d.items.find((x): x is TextItem => x.type === "text")?.lines[0]?.text ?? "";

  /**
   * 공유할 디자인. ① **가게 사진은 안 보냅니다** — 사진 벽은 흰 벽으로, 사진 속 간판을 덮던 «가리기 판»도 뺍니다
   * (사진은 서버에 두지 않습니다 — 개인정보·용량, 두려면 처리방침부터). ② **이 PC 글꼴·올린 글꼴로 쓴 글자는
   * 모양(외곽선)으로 굳힙니다** — 받는 사람 브라우저엔 그 글꼴이 없어 못 그립니다. 글꼴 파일은 안 나갑니다.
   * 사람 결정(2026-09-25): *"관리자가 이미 그 글꼴을 사용했다면 가능할 가능성이 매우 높으니 그냥 사용 가능하게"*.
   */
  function shareable(): { design: Design; baked: number; photo: boolean } | { error: string } {
    const photo = d.wall === "photo";
    let baked = 0;
    const items: Item[] = [];
    for (const it of d.items) {
      if (photo && it.type === "patch") continue;
      if (it.type !== "text" || it.font.src === "lib") {
        items.push(it);
        continue;
      }
      const L = locals.get(it.id), t = texts.get(it.id);
      if (!L || !t) return { error: "글꼴을 아직 불러오는 글자가 있습니다(새로고침하면 이 PC 글꼴 목록이 비워집니다) — 벽에 글자가 다 보인 뒤 다시 누르세요." };
      const byColor = new Map<string, string>();
      for (const q of L.paths) byColor.set(q.color, (byColor.get(q.color) ?? "") + q.d);
      items.push({
        id: it.id,
        type: "logo",
        name: `${it.lines.map((l) => l.text).join(" / ")} · ${t.fontName}`,
        layers: [...byColor].map(([color, pd], i) => ({ name: `글자 색 ${i + 1}`, d: pd, color })),
        srcW: L.size.w,
        srcH: L.size.h,
        w: L.size.w,
        x: it.x,
        y: it.y,
        rot: it.rot,
        warp: it.warp,
        letterMm: Math.min(...it.lines.map((l) => l.heightMm)),
      });
      baked++;
    }
    return { design: { ...d, wall: photo ? "white" : d.wall, items }, baked, photo };
  }

  async function makeShare() {
    setErr("");
    const s = shareable();
    if ("error" in s) return setErr(s.error);
    if (!s.design.items.some((it) => it.type !== "patch")) return setErr("벽에 올린 글자·로고가 없습니다.");
    const bytes = new TextEncoder().encode(JSON.stringify(s.design)).length;
    if (bytes > MAKER_SHARE_MAX_BYTES) return setErr(`디자인이 너무 큽니다(${Math.round(bytes / 1000)}KB) — 로고를 «SVG 따기»에서 매끄럽게 다듬어 점을 줄여 주세요.`);
    setBusy("공유 링크를 만드는 중…");
    try {
      const r = await createMakerShare(s.design, shareTitle.trim() || firstText);
      if (!r.ok) return setErr(r.error);
      const url = `${location.origin}/maker/s/${r.share.token}`;
      const notes: string[] = [];
      if (s.photo) notes.push("가게 사진은 안 들어갑니다 — 받는 사람은 같은 크기의 흰 벽으로 봅니다.");
      if (s.baked) notes.push(`이 PC 글꼴로 쓴 글자 ${s.baked}개는 모양 그대로(외곽선) 들어갑니다 — 받는 쪽에서 글자를 고칠 수는 없습니다.`);
      let copied = true;
      try {
        await navigator.clipboard.writeText(url);
      } catch {
        copied = false;
      }
      setShareOut({ url, expires: ymd(r.share.expires_at), notes: copied ? notes : ["주소를 눌러 직접 복사하세요.", ...notes] });
      setShares((l) => (l ? { ...l, items: [r.share, ...l.items] } : l));
    } catch (e) {
      setErr(`공유 링크를 만들지 못했습니다: ${(e as Error).message}`);
    } finally {
      setBusy("");
    }
  }

  async function loadShares() {
    setErr("");
    const r = await listMakerShares();
    if (!r.ok) return setErr(r.error);
    setShares({ items: r.items, at: Date.now() });
  }

  async function removeShare(x: ShareItem) {
    if (!confirm(`«${x.title || "이름 없음"}» 링크를 끊을까요? 받은 사람은 더 이상 못 엽니다. 되돌릴 수 없습니다.`)) return;
    const r = await deleteMakerShare(x.id);
    if (!r.ok) return setErr(r.error ?? "끊지 못했습니다.");
    setShares((l) => (l ? { ...l, items: l.items.filter((y) => y.id !== x.id) } : l));
    if (shareOut?.url.endsWith(x.token)) setShareOut(null);
  }

  /** 공유받은 디자인을 이 브라우저의 손님 초안으로 옮겨 `/maker` 에서 이어 고칩니다 */
  function continueEdit() {
    try {
      const had = localStorage.getItem(STORE("customer"));
      if (had && !confirm("이 브라우저에서 만들던 간판 디자인이 있습니다. 받은 디자인으로 바꿀까요?")) return;
      localStorage.setItem(STORE("customer"), JSON.stringify(d));
      router.push("/maker");
    } catch {
      setErr("브라우저 저장소가 막혀 있어 옮기지 못했습니다.");
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

  /** PRO — 무대에 띄울 점·조절선·격자 (벽 좌표). 끌면 `onNodeDrag`·`onMeshDrag` 가 같은 사슬을 거꾸로 짚습니다 */
  const proOverlay = (() => {
    if (!pro || viewOnly || sel?.type !== "text" || proTool === "glyph") return null;
    const c = itemChain(sel);
    if (!c) return null;
    const g = glyph !== null ? c.t.outline.glyphs.find((x) => x.i === glyph) : undefined;
    const ov = glyph !== null ? sel.glyphs?.[glyph] : undefined;
    if (proTool === "points") {
      if (!g) return null;
      const ch = glyphChain(g, ov);
      const F = (q: Pt) => c.F(ch.post(ch.pre(q)));
      const segs = parsePath(ch.d0);
      const nodes = nodesOf(segs);
      // 조절점은 «잡은 기준점» 것만 — 일러스트레이터와 같은 약속. 다 띄우면 한 글자에 수백 개가 글자를 덮습니다
      const act = activeNode && activeNode.key === `${sel.id}:${glyph}` && nodes[activeNode.i]?.anchor ? activeNode.i : null;
      const vis = new Set<number>();
      if (act !== null)
        for (const k of linkedNodes(segs, nodes[act])) {
          const idx = nodes.findIndex((n) => n.seg === k.seg && n.pt === k.pt);
          if (idx >= 0) vis.add(idx);
        }
      const handles: [Pt, Pt][] = [];
      let idx = 0, cur: Pt = [0, 0];
      for (const s of segs) {
        if (s.c === "C") {
          if (vis.has(idx)) handles.push([F(cur), F(s.p[0])]);
          if (vis.has(idx + 1)) handles.push([F(s.p[1]), F(s.p[2])]);
        } else if (s.c === "Q" && vis.has(idx)) handles.push([F(cur), F(s.p[0])], [F(s.p[0]), F(s.p[1])]);
        idx += s.p.length;
        if (s.p.length) cur = s.p[s.p.length - 1];
      }
      return {
        nodes: nodes.map((n, k) => ({ p: F(segs[n.seg].p[n.pt]), anchor: n.anchor, hidden: !n.anchor && !vis.has(k), on: k === act })),
        handles,
      };
    }
    const gb = meshScope === "glyph" && g ? g : null;
    const m = gb ? (ov?.mesh ?? meshNew(meshN)) : (sel.mesh ?? meshNew(meshN));
    const box: Box = gb ? { x0: gb.x0, y0: gb.y0, w: gb.w, h: gb.h } : c.box;
    const A = gb ? glyphAffine(gb, ov) : null;
    // 🔴 글자 전체 격자의 점은 «그 격자 자신»을 또 지나면 안 됩니다 — 움직인 점을 다시 휘어 두 번 먹고, 끈 거리보다
    //    4~5배 멀리 튀었습니다(2026-09-26 실측). 글자 한 자 격자는 그 위에 글자 전체 격자가 얹히므로 `c.F` 가 맞습니다.
    const G = gb ? (q: Pt) => c.F(A ? apply(A, q) : q) : c.W;
    const pts: Pt[] = [];
    for (let j = 0; j <= m.rows; j++) for (let i = 0; i <= m.cols; i++) pts.push(G(meshNode(box, m, i, j)));
    return { nodes: [], handles: [], mesh: { pts, cols: m.cols, rows: m.rows } };
  })();
  const zoomPct = Math.round(((d.wallW * 1.1) / view.w) * 100);
  const zoomBy = (f: number) => setView((v) => ({ x: v.x + (v.w - v.w * f) / 2, y: v.y + ((v.w - v.w * f) * (canvasPx.h / canvasPx.w)) / 2, w: v.w * f }));

  /** 가게 사진 고름 — 폰은 시트를 닫아 무대와 «실제 크기 맞추기» 줄이 보이게 합니다 */
  const onPhotoPick = (f: File) => {
    setTab(null);
    onPhoto(f);
  };

  // 폰 — 두 손가락 안내 말풍선은 처음 한 번만(보기 전용은 확대만 되므로 같은 말이 맞습니다)
  useEffect(() => {
    if (!phone) return;
    try {
      if (localStorage.getItem(MAKER_GESTURE_HINT_KEY)) return;
    } catch {
      return;
    }
    const a = window.setTimeout(() => setHint(true), 1200), b = window.setTimeout(() => setHint(false), 9000);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, [phone]);
  const dismissHint = () => {
    setHint(false);
    try {
      localStorage.setItem(MAKER_GESTURE_HINT_KEY, new Date().toISOString());
    } catch {
      /* 저장소가 막힘 — 다음에 한 번 더 뜰 뿐입니다 */
    }
  };

  // 폰 — 무대 밖(탭 바·시트 머리)에서 아래로 당겨도 «당겨서 새로고침»이 안 되게. 페이지 확대(접근성)는 막지 않습니다
  useEffect(() => {
    if (!phone) return;
    const el = document.documentElement, before = el.style.overscrollBehavior;
    el.style.overscrollBehavior = "none";
    return () => {
      el.style.overscrollBehavior = before;
    };
  }, [phone]);

  /** 폰 탭 열기 — 같은 탭을 다시 누르면 닫습니다. 글자·글꼴은 고른 글자가 있어야 보여서 첫 글자를 골라 둡니다 */
  const openTab = (t: PhoneTab) => {
    if (tab === t) return setTab(null);
    if ((t === "text" && !sel) || (t === "font" && sel?.type !== "text")) {
      const first = d.items.find((x) => x.type === "text") ?? (t === "text" ? d.items[0] : undefined);
      if (first) select(first.id);
    }
    setCalib((c) => (t === "wall" ? c : null));
    setTab(t);
  };

  const stageEl = (
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
        const old = canvasPx;
        setCanvasPx((c) => (c.w === w && c.h === h ? c : { w, h }));
        // 처음 한 번은 벽 전체가 보이게 맞춥니다
        if (!fitted.current) {
          fitted.current = true;
          fit(d.wallW, d.wallH, { w, h });
        } else if (phone && old.w === w && old.h !== h) {
          // 폰 — 시트가 열리고 닫히며 무대 높이만 바뀝니다. 보던 가운데가 그대로 있게 위아래만 반씩 옮깁니다
          setView((v) => ({ ...v, y: v.y + ((old.h - h) * (v.w / w)) / 2 }));
        }
      }}
      svgRef={svgRef}
      readOnly={viewOnly}
      touch={coarse}
      rulers={!phone}
      onSelect={select}
      onGlyph={(id, g) => {
        setSelected(id);
        setGlyph(g);
        if (phone && !pro) setTab("text"); // 폰 — 한 자 꾸밈 칸이 «글자» 시트에 있습니다(PRO 는 벽에서 바로 끌므로 시트를 안 엽니다)
      }}
      onMove={(id, x, y, done) => setItem(id, { x, y }, !done)}
      onResize={onResize}
      onRotate={onRotate}
      onWarp={onWarp}
      onPinch={onPinch}
      onPinchStart={hint ? dismissHint : undefined}
      glyphDrag={pro && !viewOnly}
      onGlyphDrag={onGlyphDrag}
      pro={proOverlay}
      onNodeDrag={onNodeDrag}
      onMeshDrag={onMeshDrag}
      onCalibPoint={(pt) => setCalib((c) => (!c ? c : !c.a || c.b ? { a: pt } : { a: c.a, b: pt }))}
    />
  );
  const busyEl = busy && (
    <p className="absolute inset-x-0 top-8 z-20 mx-auto w-fit bg-ink px-4 py-2 text-[13px] font-bold text-white" role="status">
      {busy}
    </p>
  );
  const calibEl = calib && (
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
  );
  const errEl = err && (
    <p className="border-t border-line bg-white px-4 py-2 text-[14px] font-bold text-accent-600" role="alert">
      {err}
    </p>
  );

  /* ----- 칸들 — PC 는 왼쪽·오른쪽 칸에, 폰은 시트에 같은 것을 넣습니다 ----- */
  const addPanel = (
    <Panel title="넣기" tour="add">
      <div className="grid grid-cols-2 gap-px bg-line">
        <AddBtn onClick={addText} label="글자" sub="가게 이름" />
        <AddBtn onClick={addPlate} label="판" sub="현판·걸이·돌출" />
        <label className="flex cursor-pointer flex-col items-center gap-0.5 bg-white px-2 py-3 text-center hover:bg-brand-50">
          <span className="text-[14px] font-black">로고</span>
          <span className="text-[11px] text-ink-500">그림 올리기</span>
          <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => e.target.files?.[0] && onLogo(e.target.files[0])} />
        </label>
        <AddBtn onClick={addPatch} label="가리기" sub="기존 간판 덮기" />
      </div>
      <p className="mt-2 text-[12px] leading-relaxed text-ink-500">로고는 이 브라우저 안에서 선으로 바뀝니다. 선을 자세히 다듬으려면 왼쪽 «SVG 따기»로. 판은 늘 글자 뒤에 놓입니다.</p>
      {mode === "admin" && (
        <div className="mt-4 border-t border-line pt-3">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-black">프로젝트 에셋</span>
            <button type="button" onClick={() => void loadAssets()} className="ml-auto text-[11px] text-ink-500 underline underline-offset-2 hover:text-ink">
              새로고침
            </button>
          </div>
          {assetErr && <p className="mt-1 text-[12px] leading-relaxed text-accent-600">{assetErr}</p>}
          {assets === null && !assetErr && <p className="mt-1 text-[12px] text-ink-500">불러오는 중…</p>}
          {assets && assets.length > 0 && (
            <>
              <select value={assetProject} onChange={(e) => setAssetProject(e.target.value)} className="mt-2 w-full border border-line bg-white px-2 py-1.5 text-[13px]" aria-label="프로젝트">
                {[...new Set(assets.map((a) => a.project))].map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              <ul className="mt-2 grid grid-cols-3 gap-1.5">
                {assets
                  .filter((a) => a.project === assetProject)
                  .map((a) => (
                    <li key={a.id}>
                      <button type="button" onClick={() => void addAsset(a)} title={`${a.name} (${a.kind.toUpperCase()})`} className="flex aspect-square w-full items-center justify-center bg-paper p-1 hover:outline hover:outline-2 hover:outline-brand-700">
                        {a.url ? (
                          // eslint-disable-next-line @next/next/no-img-element -- 서명 URL(수명 있음)
                          <img src={a.url} alt={a.name} className="max-h-full max-w-full object-contain" loading="lazy" />
                        ) : (
                          <span className="text-[10px] text-ink-500">{a.name}</span>
                        )}
                      </button>
                    </li>
                  ))}
              </ul>
              <p className="mt-1.5 text-[11px] leading-relaxed text-ink-500">SVG 는 로고(색 바꾸기 가능), PNG·JPG 는 그림으로 올라갑니다. 그림은 글자·로고 뒤에 놓이고 판정에는 안 들어갑니다.</p>
            </>
          )}
          {assets && !assets.length && !assetErr && (
            <p className="mt-1 text-[12px] leading-relaxed text-ink-500">
              올라온 에셋이 없습니다 — <Link href="/admin/maker/assets" className="underline underline-offset-2">에셋 페이지</Link>
            </p>
          )}
        </div>
      )}
    </Panel>
  );

  /** 레퍼런스 스타일 — 한 번 눌러 그 결로 차립니다(한국 가게 전면 레퍼런스에서 본 모양, 2026-09-26) */
  const stylePanel = (
    <Panel title="레퍼런스 스타일">
      <ul className="space-y-1">
        {refStyles.map((s) => (
          <li key={s.key}>
            <button type="button" onClick={() => applyStyle(s)} className="flex w-full items-center gap-2.5 px-1 py-1.5 text-left hover:bg-paper">
              <StyleThumb s={s} tone={s.tone && d.palette?.length ? toneOn(d.palette[0]) : undefined} />
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-bold">{s.name}</span>
                <span className="block text-[11px] leading-snug text-ink-500">{s.note}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[12px] leading-relaxed text-ink-500">누르면 벽의 글자·판을 그 모양으로 바꿉니다(로고는 그대로). 상호는 첫 글자 줄에서 가져옵니다. «되돌리기»(Ctrl+Z)로 전으로 갑니다.</p>
    </Panel>
  );

  /** 건물 색 — 사진에서 뽑은 색과 간판 색 조합 (F26-f) */
  const palettePanel = (
    <Panel title="건물 색 · 간판 색 추천">
      <p className="text-[12px] leading-relaxed text-ink-500">
        건물 사진에서 색을 뽑아 그 색에 맞는 글자·판 색을 권해 드립니다. 사진은 이 브라우저 밖으로 나가지 않습니다.{" "}
        {!viewOnly && (
          <Link href={admin ? "/admin/maker/color" : "/maker/color"} className="font-bold text-brand-700 underline">
            사진 속 자리까지 보며 고르기
          </Link>
        )}
      </p>
      <div className="mt-2 flex gap-1.5">
        {photo && (
          <button type="button" onClick={() => pickPalette()} className="flex-1 border border-line px-2 py-2 text-[12px] font-bold hover:bg-paper">
            가게 사진에서 뽑기
          </button>
        )}
        <label className="flex flex-1 cursor-pointer items-center justify-center border border-brand-700 px-2 py-2 text-[12px] font-bold text-brand-700 hover:bg-brand-50">
          건물 사진으로 뽑기
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) pickPalette(f);
            }}
          />
        </label>
      </div>
      {!!d.palette?.length && (
        <>
          <p className="mb-1 mt-3 text-[12px] font-bold text-ink-500">
            뽑은 색 — 누르면 {sel?.type === "text" ? "고른 글자" : sel?.type === "plate" ? "고른 판" : "벽"}에 입힙니다{skyCut > 0 ? ` · 하늘로 보이는 부분(사진의 ${skyCut}%)은 뺐습니다` : ""}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {d.palette.map((hex, i) => (
              <button key={hex + i} type="button" onClick={() => pickSwatch(hex)} title={hex} aria-label={`뽑은 색 ${hex}`} className="flex h-10 min-w-10 flex-col justify-end border border-line px-1 pb-0.5 text-[10px] font-bold" style={{ background: hex, color: inkOn(hex) }}>
                {palShare[i] ? `${Math.round(palShare[i] * 100)}%` : ""}
              </button>
            ))}
          </div>
          <p className="mb-1 mt-3 text-[12px] font-bold text-ink-500">추천 간판 색 — 간판에는 2~3색(바탕·글자·포인트)</p>
          <ul className="space-y-1.5">
            {recs.map((r) => (
              <li key={r.key} className="flex items-center gap-2">
                <span className="grid h-9 w-14 shrink-0 place-items-center border border-line" style={{ background: r.wall }} aria-hidden="true">
                  <span className="px-1.5 text-[15px] font-black leading-6" style={{ background: r.plate, color: r.face, outline: r.point ? `2px solid ${r.point}` : undefined, outlineOffset: -3 }}>
                    가
                  </span>
                </span>
                <span className="min-w-0 flex-1 text-[12px] leading-snug">
                  <b className="block text-[13px]">
                    {r.label}
                    {r.best && <span className="ml-1.5 text-[11px] font-black text-brand-700">추천</span>}
                  </b>
                  <span className={r.ratio < 3 ? "text-accent-600" : "text-ink-500"}>
                    글자 대비 {r.ratio.toFixed(1)} · {readLabel(r.ratio)}
                  </span>
                </span>
                <button type="button" onClick={() => applyRec(r)} className="shrink-0 border border-brand-700 px-2.5 py-1.5 text-[12px] font-bold text-brand-700 hover:bg-brand-50">
                  적용
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11px] leading-relaxed text-ink-500">
            대비는 화면 글자 기준(WCAG)을 빌린 어림입니다 — 4.5 이상 «잘 읽힘», 3 이상 «큰 글자면 읽힘». 사진 색은 날씨·노출을 타서 실물과 다르고, 최종 색은 견본으로 정합니다.
          </p>
        </>
      )}
    </Panel>
  );

  /** PRO 글자 편집 — 상단 스위치로 켭니다 (F26-g) */
  const proPanel = pro && !viewOnly && sel?.type === "text" && (
    <Panel title="PRO 글자 편집">
      <Seg
        value={proTool}
        onChange={(v) => setProTool(v as typeof proTool)}
        options={[
          { v: "glyph", label: "한 자 끌기" },
          { v: "points", label: "점 편집" },
          { v: "mesh", label: "격자 왜곡" },
        ]}
      />
      <p className="mt-2 text-[12px] leading-relaxed text-ink-500">
        {proTool === "glyph"
          ? "벽 위 글자 한 자를 누르고 끌면 그 한 자만 옮겨집니다. Shift 를 누른 채 끌면 글자 전체가 옮겨집니다."
          : proTool === "points"
            ? glyph === null
              ? "벽 위 글자 한 자를 누르세요. 그 글자의 점이 뜹니다 — 네모는 선이 지나는 점, 파란 동그라미는 곡선을 당기는 점입니다."
              : "점을 끌어 모양을 바꿉니다. 점이 모자라면 «점 나누기»로 두 배로 늘립니다."
            : "보라색 격자점을 끌면 그 안의 글자가 따라 휩니다. 글자 한 자만, 또는 글자 전체에 걸 수 있습니다."}
      </p>
      {proTool === "points" && glyph !== null && (
        <div className="mt-2 space-y-1.5">
          <p className="text-[12px] text-ink-500">
            기준점 {proOverlay?.nodes.filter((n) => n.anchor).length ?? 0}개 — 너무 촘촘하면 «점 정리», 모자라면 «점 나누기». 확대(Ctrl+휠)하면 잡기 쉽습니다.
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            <button type="button" onClick={simplifyGlyph} className="border border-line px-2 py-2 text-[12px] font-bold hover:bg-paper">
              점 정리 (적게·매끈)
            </button>
            <button type="button" onClick={subdivideGlyph} className="border border-line px-2 py-2 text-[12px] font-bold hover:bg-paper">
              점 나누기 (×2)
            </button>
          </div>
          {!!sel.glyphs?.[glyph]?.path && (
            <button type="button" onClick={() => setGlyphOv(sel.id, glyph, { path: undefined })} className="w-full border border-line px-2 py-2 text-[12px] font-bold hover:bg-paper">
              모양 처음대로
            </button>
          )}
        </div>
      )}
      {proTool === "mesh" && (
        <div className="mt-2 space-y-2">
          <Seg
            value={glyph === null ? "item" : meshScope}
            onChange={(v) => setMeshScope(v as "glyph" | "item")}
            options={[
              { v: "glyph", label: glyph === null ? "한 자 (글자를 누르세요)" : "이 글자" },
              { v: "item", label: "글자 전체" },
            ]}
          />
          <div className="flex items-center gap-2 text-[12px]">
            <span className="font-bold">칸</span>
            <Seg value={String((meshScope === "glyph" && glyph !== null ? sel.glyphs?.[glyph]?.mesh?.cols : sel.mesh?.cols) ?? meshN)} onChange={(v) => setMeshSize(Number(v))} options={MESH_SIZES.map((n) => ({ v: String(n), label: `${n}×${n}` }))} />
          </div>
          <button
            type="button"
            onClick={() => (meshScope === "glyph" && glyph !== null ? setGlyphOv(sel.id, glyph, { mesh: undefined }) : setItem(sel.id, { mesh: undefined }))}
            className="w-full border border-line px-2 py-2 text-[12px] font-bold hover:bg-paper"
          >
            격자 처음대로
          </button>
        </div>
      )}
      {glyph !== null && (
        <div className="mt-3 space-y-2 border-t border-line pt-3">
          <p className="text-[12px] font-bold text-ink-500">«{selText?.outline.glyphs.find((x) => x.i === glyph)?.ch ?? ""}» 늘리기·기울이기</p>
          <Slider label="가로" unit="%" min={30} max={300} step={5} value={Math.round((sel.glyphs?.[glyph]?.sx ?? 1) * 100)} onChange={(v) => setGlyphOv(sel.id, glyph, { sx: v / 100 })} />
          <Slider label="세로" unit="%" min={30} max={300} step={5} value={Math.round((sel.glyphs?.[glyph]?.sy ?? 1) * 100)} onChange={(v) => setGlyphOv(sel.id, glyph, { sy: v / 100 })} />
          <Slider label="기울기" unit="°" min={-35} max={35} step={1} value={sel.glyphs?.[glyph]?.skew ?? 0} onChange={(v) => setGlyphOv(sel.id, glyph, { skew: v })} />
        </div>
      )}
      <p className="mt-3 text-[11px] leading-relaxed text-ink-500">PRO 로 바꾼 모양은 «만들 수 있나» 판정과 제작용 외곽선(SVG)에 그대로 들어갑니다 — 실제로 그렇게 만들기 때문입니다.</p>
    </Panel>
  );

  const wallPanel = (
    <Panel title="벽" tour="wall">
      <div className="grid grid-cols-3 gap-1.5">
        {walls.map((w) => (
          <button key={w.key} type="button" onClick={() => pickWall(w.key)} aria-pressed={d.wall === w.key} className="text-left">
            <span className={`block h-10 border ${d.wall === w.key ? "border-brand-700 ring-2 ring-brand" : "border-line"}`} style={{ background: w.color }} />
            <span className={`mt-0.5 block text-[11px] font-bold ${d.wall === w.key ? "text-brand-700" : ""}`}>{w.name}</span>
          </button>
        ))}
      </div>
      <Field label="벽 색 (외벽 색에 맞춰 고르기)">
        <Swatches items={wallColors.map((c) => ({ name: c.name, hex: c.hex }))} value={d.wall === "color" ? (d.wallColor ?? "") : ""} onPick={(hex) => pickWall("color", hex)}>
          <input
            type="color"
            value={wallFill({ ...d, wall: "color" })}
            onChange={(e) => pickWall("color", e.target.value)}
            title="다른 색 직접 고르기"
            aria-label="벽 색 직접 고르기"
            className={`h-8 w-8 cursor-pointer border p-0.5 ${d.wall === "color" && !wallColors.some((c) => c.hex === d.wallColor) ? "border-brand-700 ring-2 ring-brand" : "border-line"}`}
          />
        </Swatches>
      </Field>
      <label className="mt-3 flex cursor-pointer items-center justify-center border border-brand-700 px-3 py-2.5 text-[14px] font-bold text-brand-700 hover:bg-brand-50">
        가게 사진 올리기
        <input type="file" accept="image/*" className="sr-only" onChange={(e) => e.target.files?.[0] && onPhotoPick(e.target.files[0])} />
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
  );

  const layersPanel = (
    <Panel title="레이어">
      <ul className="divide-y divide-line">
        {[...d.items].reverse().map((it) => (
          <li key={it.id} className={`flex items-center ${selected === it.id ? "bg-brand-100" : "hover:bg-paper"}`}>
            <button type="button" onClick={() => select(it.id)} className={`flex min-w-0 flex-1 items-center gap-2 px-2 py-2 text-left text-[13px] ${selected === it.id ? "font-bold text-brand-700" : ""}`}>
              <span className="w-8 shrink-0 text-[10px] font-bold tracking-wider text-ink-500">{TYPE_LABEL[it.type]}</span>
              <span className="truncate">
                {it.type === "text"
                  ? it.lines.map((l) => l.text).join(" / ")
                  : it.type === "logo" || it.type === "image"
                    ? it.name
                    : it.type === "plate"
                      ? `${plateShapes.find((s) => s.key === it.shape)?.name ?? ""} 판 · ${plateMounts.find((m) => m.key === it.mount)?.short ?? ""}`
                      : "가리기 판"}
              </span>
              {isSign(it) && <Dot level={worst(notes.get(it.id) ?? [])} />}
            </button>
            <button type="button" onClick={() => reorder(it.id, 1)} className="px-1.5 text-[12px] text-ink-500 hover:text-ink" aria-label="앞으로">▲</button>
            <button type="button" onClick={() => reorder(it.id, -1)} className="px-1.5 text-[12px] text-ink-500 hover:text-ink" aria-label="뒤로">▼</button>
          </li>
        ))}
        {!d.items.length && <li className="px-2 py-3 text-[13px] text-ink-500">아직 없습니다. 위에서 글자를 넣어 보세요.</li>}
      </ul>
    </Panel>
  );

  /** 고른 것의 속성 — `part` 는 폰이 «글자»·«글꼴» 두 시트로 나눠 담을 때만 줍니다(PC 는 한 칸에 다) */
  const selBody = (it: Item, part?: "text" | "font") => (
    <>
      {/* 폰 «글자» 시트는 문구가 먼저(가장 자주 고침) — 회전·원근은 두 손가락·칩이 있어 맨 아래로 */}
      {!part && <TransformProps it={it} warpMode={warpMode} onWarpMode={setWarpMode} onChange={(patch) => setItem(it.id, patch)} />}
      {it.type === "text" && (
        <TextProps
          it={it}
          admin={admin}
          part={part}
          glyphs={selText?.outline.glyphs ?? []}
          glyph={glyph}
          onGlyph={setGlyph}
          onGlyphOv={(i, patch) => setGlyphOv(it.id, i, patch)}
          onChange={(patch) => setItem(it.id, patch)}
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
            setItem(it.id, { font: { src: "file", key, name: file.name } });
          }}
          fontLabel={fontLabel}
        />
      )}
      {it.type === "logo" && part !== "font" && <LogoProps it={it} onChange={(patch) => setItem(it.id, patch)} onRetrace={(m, inv, k) => relogo(it, m, inv, k)} />}
      {it.type === "image" && part !== "font" && (
        <Field label="가로 (mm) — 세로는 그림 비율대로">
          <input
            inputMode="numeric"
            value={Math.round(it.w)}
            onChange={(e) => {
              const v = Number(e.target.value.replace(/[^\d]/g, ""));
              if (v >= 50) setItem(it.id, { w: v });
            }}
            className="w-full border border-line px-2 py-1.5 text-right"
          />
          <p className="mt-1 text-[11px] text-ink-500">그림(실사 출력)은 판정·제작용 SVG 에 안 들어가고, 글자·로고 뒤에 놓입니다.</p>
        </Field>
      )}
      {it.type === "plate" && part !== "font" && <PlateProps it={it} palette={d.palette} onChange={(patch) => setItem(it.id, patch)} />}
      {it.type === "patch" && part !== "font" && (
        <Field label="색 (사진 속 벽과 비슷하게)">
          <input type="color" value={it.color} onChange={(e) => setItem(it.id, { color: e.target.value })} className="h-9 w-full cursor-pointer border border-line" />
        </Field>
      )}
      {part === "text" && (
        <div className="mt-4 border-t border-line pt-4">
          <TransformProps it={it} warpMode={warpMode} onWarpMode={setWarpMode} onChange={(patch) => setItem(it.id, patch)} />
        </div>
      )}
    </>
  );
  const selTitle = sel ? (sel.type === "patch" ? "가리기 판" : TYPE_LABEL[sel.type]) : "글자";

  const viewInfoPanel = (
    <Panel title="받은 간판 디자인">
      <h1 className="text-[18px] font-black leading-snug">{share?.title || "간판 디자인"}</h1>
      <p className="mt-1.5 text-[14px] font-bold">
        <span className="mr-1.5 text-[11px] tracking-wider text-ink-500">{kind.code}</span>
        {kind.name}
      </p>
      <p className="mt-0.5 text-[13px] leading-relaxed text-ink-500">{kind.hint}</p>
      {kind.needsLed && <p className="mt-1 text-[13px]">조명 색 · {ledName}</p>}
      <p className="mt-3 text-[13px] leading-relaxed text-ink-500">
        수산나디자인이 보내 드린 디자인입니다. 위쪽 «주간·야간»으로 불 켜진 모습을 볼 수 있습니다.
        {share?.expiresAt ? ` 이 링크는 ${ymd(share.expiresAt)} 까지 열립니다.` : ""}
      </p>
    </Panel>
  );

  const kindPanel = (
    <Panel title="간판 종류 · 제작" tour="kind">
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
  );

  const verdictPanel = (
    <Panel title="만들 수 있나">
      <div data-tour="verdict">
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
      </div>
      <div data-tour="finish" className="mt-4 space-y-2">
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
            {viewOnly && share?.canEdit && (
              <button type="button" onClick={continueEdit} className="w-full border border-brand-700 px-4 py-2.5 text-[14px] font-bold text-brand-700 hover:bg-brand-50">
                복사해서 이어 편집
              </button>
            )}
          </>
        )}
      </div>
    </Panel>
  );

  const sharePanel = admin && (
    <Panel title="공유 링크">
      <p className="text-[12px] leading-relaxed text-ink-500">
        링크를 받은 사람은 로그인 없이 이 디자인을 보고(주간·야간·확대) 그대로 견적을 넣습니다. 90일 뒤 저절로 닫힙니다. 가게 사진은 안 들어갑니다.
      </p>
      <label className="mt-2 block text-[12px] font-bold">
        이름 (목록·받는 화면 제목)
        <input value={shareTitle} maxLength={60} placeholder={firstText || "예: 가게 이름"} onChange={(e) => setShareTitle(e.target.value)} className="mt-1 w-full border border-line px-2 py-1.5 text-[13px] font-normal" />
      </label>
      <button type="button" onClick={makeShare} className="mt-2 w-full border border-brand-700 px-4 py-2.5 font-bold text-brand-700 hover:bg-brand-50">
        공유 링크 만들기
      </button>
      {shareOut && (
        <div className="mt-3 border-l-[3px] border-brand pl-3" role="status">
          <p className="text-[12px] font-bold text-brand-700">링크를 만들어 복사했습니다 · {shareOut.expires} 까지</p>
          <input readOnly value={shareOut.url} onFocus={(e) => e.currentTarget.select()} className="mt-1 w-full border border-line px-2 py-1 text-[12px]" aria-label="공유 링크 주소" />
          {shareOut.notes.map((n) => (
            <p key={n} className="mt-1 text-[12px] leading-relaxed text-ink-500">
              {n}
            </p>
          ))}
        </div>
      )}
      <div className="mt-3">
        {!shares ? (
          <button type="button" onClick={loadShares} className="text-[13px] font-bold text-ink-500 underline">
            보낸 링크 보기
          </button>
        ) : !shares.items.length ? (
          <p className="text-[12px] text-ink-500">보낸 링크가 없습니다.</p>
        ) : (
          <ul className="divide-y divide-line">
            {shares.items.map((x) => (
              <li key={x.id} className="flex items-center gap-2 py-1.5 text-[12px]">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold">{x.title || "이름 없음"}</span>
                  <span className="text-ink-500">{Date.parse(x.expires_at) < shares.at ? "기간 지남" : `${ymd(x.expires_at)} 까지`}</span>
                </span>
                <button type="button" onClick={() => navigator.clipboard.writeText(`${location.origin}/maker/s/${x.token}`)} className="font-bold text-brand-700 underline">
                  복사
                </button>
                <button type="button" onClick={() => removeShare(x)} className="font-bold text-ink-500 underline">
                  끊기
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Panel>
  );

  const tourEl = tour && mode !== "view" && (
    <MakerTour mode={mode} onClose={endTour} onPrepare={prepareTour} steps={phone ? makerTourPhone : makerTour} noScroll={phone} />
  );

  /* ================================================================ 폰 (768px 미만) */
  if (phone) {
    const tabs: [PhoneTab, string][] = viewOnly
      ? [["info", "디자인"], ["judge", "판정"]]
      : [["add", "넣기"], ["text", "글자"], ["font", "글꼴"], ["kind", "종류"], ["wall", "벽·사진"], ["judge", "판정"]];
    // 고른 것 아래(자리가 없으면 위)에 뜨는 칩 — 원근·반듯하게·복제·삭제 (인스타의 «선택하면 뜨는 도구»)
    const chip = (() => {
      if (viewOnly || !sel || calib) return null;
      const r = ritems.find((q) => q.id === sel.id);
      if (!r) return null;
      const k = canvasPx.w / view.w;
      const xs = r.quad.map((q) => (q[0] - view.x) * k), ys = r.quad.map((q) => (q[1] - view.y) * k);
      const cx = (Math.min(...xs) + Math.max(...xs)) / 2, top = Math.min(...ys), bottom = Math.max(...ys);
      const below = bottom + 26, above = top - 26 - 40 - 30;
      const y = below + 40 < canvasPx.h - 8 ? below : above > 104 ? above : null;
      if (y === null) return null;
      return { x: Math.max(150, Math.min(canvasPx.w - 150, cx)), y };
    })();
    const sheetTitle: Record<PhoneTab, string> = {
      add: "넣기",
      text: selTitle,
      font: "글꼴",
      kind: "간판 종류 · 제작",
      wall: "벽",
      judge: "만들 수 있나",
      info: "받은 간판 디자인",
    };
    const empty = (msg: string) => (
      <div className="py-6 text-center">
        <p className="text-[14px] leading-relaxed text-ink-500">{msg}</p>
        <button type="button" onClick={addText} className="mt-3 rounded-full bg-brand-700 px-5 py-2.5 text-[14px] font-bold text-white">
          글자 넣기
        </button>
      </div>
    );
    const sheetBody = (t: PhoneTab) => {
      switch (t) {
        case "add":
          return (
            <>
              <div className="grid grid-cols-2 gap-2.5">
                <PhoneTile icon="text" title="글자" sub="가게 이름·전화번호" onClick={addText} />
                <PhoneTile
                  icon="logo"
                  title="로고"
                  sub="앨범에서 고르기"
                  onFile={(f) => {
                    setTab(null);
                    onLogo(f);
                  }}
                />
                <PhoneTile icon="wall" title="가게 사진" sub="앨범에서 고르기" onFile={onPhotoPick} />
                <PhoneTile icon="plate" title="판" sub="현판·걸이·돌출" onClick={addPlate} />
                <PhoneTile icon="patch" title="가리기 판" sub="사진 속 기존 간판 덮기" onClick={addPatch} />
              </div>
              <div className="mt-4 border-t border-line pt-3">
                <p className="mb-1 text-[12px] font-black tracking-[0.08em] text-ink-500">레퍼런스 스타일 — 한 번 눌러 차리기</p>
                {stylePanel}
              </div>
              <p className="mt-3 text-[12px] leading-relaxed text-ink-500">
                로고와 가게 사진은 «카메라»로 바로 찍을 수도 있습니다. 이 휴대폰 안에서만 쓰이며, 견적을 보낼 때 미리보기 그림으로만 붙습니다.
              </p>
              {d.items.length > 0 && (
                <div className="mt-4 border-t border-line pt-3">
                  <p className="mb-1 text-[12px] font-black tracking-[0.08em] text-ink-500">레이어 — 눌러서 고르기</p>
                  {layersPanel}
                </div>
              )}
            </>
          );
        case "text":
          return sel ? (
            <>
              {proPanel && <div className="mb-4 border-b border-line pb-4">{proPanel}</div>}
              {selBody(sel, "text")}
            </>
          ) : (
            empty("벽 위의 글자를 누르거나 새 글자를 넣을 수 있습니다.")
          );
        case "font":
          return sel?.type === "text" ? selBody(sel, "font") : empty("글꼴은 글자를 고른 뒤 바꿀 수 있습니다.");
        case "kind":
          return kindPanel;
        case "wall":
          return (
            <>
              {wallPanel}
              <div className="mt-4 border-t border-line pt-3">
                <p className="mb-1 text-[12px] font-black tracking-[0.08em] text-ink-500">건물 색 · 간판 색 추천</p>
                {palettePanel}
              </div>
              <Field label="보기">
                <div className="flex gap-5 py-1">
                  <Check label="치수" checked={dims} onChange={setDims} />
                  <Check label="격자" checked={d.grid !== false} onChange={(v) => patchDesign({ grid: v })} />
                </div>
              </Field>
            </>
          );
        case "judge":
          return (
            <>
              {verdictPanel}
              {sharePanel && <div className="mt-4 border-t border-line pt-3"><p className="mb-2 text-[12px] font-black tracking-[0.08em] text-ink-500">공유 링크</p>{sharePanel}</div>}
            </>
          );
        case "info":
          return (
            <>
              {viewInfoPanel}
              <Field label="보기">
                <Check label="치수" checked={dims} onChange={setDims} />
              </Field>
            </>
          );
      }
    };

    return (
      // `touch-manipulation` — 단추를 빨리 두 번 눌러도 페이지가 확대되지 않게(두 손가락 확대는 무대 밖에서 그대로 됩니다)
      <div className="flex h-full touch-manipulation flex-col overflow-hidden bg-white">
        <div data-tour="stage" className="relative min-h-0 flex-1">
          {stageEl}

          {/* 위 — 닫기·도움말 / 되돌리기 / 완료 (피그마 UI3 의 떠 있는 둥근 막대) */}
          <div className="pointer-events-none absolute inset-x-3 top-[max(10px,env(safe-area-inset-top))] z-10 flex select-none items-center justify-between">
            <span className="pointer-events-auto flex gap-2">
              <Link href={admin ? "/admin" : "/"} aria-label={admin ? "관리자 홈으로" : "수산나디자인 홈으로"} className={`grid h-10 w-10 place-items-center rounded-full ${FLOAT}`}>
                <Glyph k="close" />
              </Link>
              {!viewOnly && (
                <button type="button" onClick={() => setTour(true)} aria-label="도움말 — 처음 안내 다시 보기" className={`grid h-10 w-10 place-items-center rounded-full text-[17px] font-black ${FLOAT}`}>
                  ?
                </button>
              )}
            </span>
            {!viewOnly && (
              <span className={`pointer-events-auto flex h-10 rounded-full px-1 ${FLOAT}`}>
                <button type="button" onClick={undo} disabled={!hist.past.length} aria-label="되돌리기" className="grid w-10 place-items-center disabled:opacity-30">
                  <Glyph k="undo" />
                </button>
                <button type="button" onClick={redo} disabled={!hist.future.length} aria-label="다시 하기" className="grid w-10 place-items-center disabled:opacity-30">
                  <Glyph k="redo" />
                </button>
              </span>
            )}
            <button
              type="button"
              data-tour="finish-top"
              onClick={() => setTab("judge")}
              className="pointer-events-auto h-10 rounded-full bg-brand-700 px-[18px] text-[15px] font-extrabold text-white shadow-[0_4px_14px_rgba(0,114,108,0.28)]"
            >
              {viewOnly ? "견적" : "완료"}
            </button>
          </div>
          <div className="pointer-events-none absolute inset-x-3 top-[calc(max(10px,env(safe-area-inset-top))+50px)] z-10 flex select-none items-center justify-between">
            <span className="pointer-events-auto flex items-center gap-1.5">
              <button type="button" onClick={() => fit()} className="h-8 rounded-full bg-white/90 px-3 text-[12px] font-extrabold shadow-[0_1px_2px_rgba(15,26,25,0.08)]">
                맞춤 · {zoomPct}%
              </button>
              {!viewOnly && (
                <button type="button" onClick={() => setProOn(!pro)} aria-pressed={pro} className={`h-8 rounded-full px-3 text-[12px] font-black tracking-[0.06em] shadow-[0_1px_2px_rgba(15,26,25,0.08)] ${pro ? "bg-accent text-ink" : "bg-white/90 text-ink-500"}`}>
                  PRO
                </button>
              )}
            </span>
            <span data-tour="daynight" className="pointer-events-auto flex items-center gap-1.5">
              {night && kind.needsLed && (
                <button type="button" onClick={() => setLedOn(!ledOn)} aria-pressed={ledOn} className={`flex h-8 items-center gap-1.5 rounded-full bg-white/90 px-3 text-[12px] font-extrabold shadow-[0_1px_2px_rgba(15,26,25,0.08)] ${ledOn ? "text-ink" : "text-ink-500"}`}>
                  {/* 주황은 아주 조금 — 불이 켜졌다는 점 하나만 */}
                  <span className={`h-2 w-2 rounded-full ${ledOn ? "bg-accent" : "bg-line"}`} aria-hidden="true" />
                  조명 {ledOn ? "켬" : "끔"}
                </button>
              )}
              <span className="flex h-8 rounded-full bg-white/90 p-[3px] text-[12px] font-extrabold shadow-[0_1px_2px_rgba(15,26,25,0.08)]" role="group" aria-label="주간·야간">
                {(["day", "night"] as const).map((v) => (
                  <button key={v} type="button" aria-pressed={night === (v === "night")} onClick={() => setNight(v === "night")} className={`rounded-full px-[11px] ${night === (v === "night") ? "bg-ink text-white" : "text-ink-500"}`}>
                    {v === "day" ? "주간" : "야간"}
                  </button>
                ))}
              </span>
            </span>
          </div>

          {chip && (
            <div className={`absolute z-10 flex h-10 -translate-x-1/2 select-none items-center whitespace-nowrap rounded-full px-1 text-[13px] font-bold ${FLOAT}`} style={{ left: chip.x, top: chip.y }}>
              <button type="button" onClick={() => setWarpMode(!warpMode)} aria-pressed={warpMode} className={`flex h-10 items-center gap-1.5 px-3 ${warpMode ? "text-accent-600" : ""}`}>
                <Glyph k="persp" />
                {warpMode ? "원근 끝" : "원근"}
              </button>
              {!!(sel?.warp || sel?.rot) && (
                <>
                  <span className="h-[18px] w-px bg-line" />
                  <button
                    type="button"
                    onClick={() => {
                      setItem(sel.id, { warp: null, rot: 0 });
                      setWarpMode(false);
                    }}
                    className="h-10 px-3"
                  >
                    반듯하게
                  </button>
                </>
              )}
              <span className="h-[18px] w-px bg-line" />
              <button type="button" onClick={() => sel && duplicate(sel.id)} className="h-10 px-3">
                복제
              </button>
              <span className="h-[18px] w-px bg-line" />
              <button type="button" onClick={() => sel && remove(sel.id)} className="h-10 px-3">
                삭제
              </button>
            </div>
          )}
          {warpMode && sel && <p className="absolute inset-x-0 bottom-3 z-10 mx-auto w-fit rounded-full bg-ink/85 px-3.5 py-2 text-[12px] font-bold text-white">주황 점 네 개를 끌어 벽면에 맞춥니다</p>}
          {hint && !warpMode && (
            <button type="button" onClick={dismissHint} className="absolute inset-x-0 top-[calc(max(10px,env(safe-area-inset-top))+94px)] z-10 mx-auto w-fit rounded-full bg-ink/85 px-3.5 py-2 text-[12px] font-bold text-white">
              {viewOnly ? "두 손가락으로 벌리면 확대됩니다" : "두 손가락으로 벌리면 확대 · 간판을 잡고 비틀면 회전"}
            </button>
          )}
          {busyEl}
        </div>

        {calibEl}
        {errEl && (
          <div className="relative">
            {errEl}
            <button type="button" onClick={() => setErr("")} aria-label="알림 닫기" className="absolute right-1 top-0 h-10 w-10 text-ink-500">
              ✕
            </button>
          </div>
        )}
        {tab && (
          <PhoneSheet key={tab} title={sheetTitle[tab]} action={tab === "add" ? "닫기" : "완료"} onClose={() => setTab(null)}>
            <Bare.Provider value>{sheetBody(tab)}</Bare.Provider>
          </PhoneSheet>
        )}

        <nav
          aria-label="편집 도구"
          className="relative z-20 grid shrink-0 select-none border-t border-line bg-white px-1 pt-1.5 pb-[max(10px,env(safe-area-inset-bottom))]"
          style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
        >
          {tabs.map(([k, label]) => {
            const on = tab === k;
            return (
              <button key={k} type="button" data-tour={`tab-${k}`} aria-pressed={on} onClick={() => openTab(k)} className={`flex h-[52px] flex-col items-center justify-center gap-[3px] text-[11px] font-bold ${on ? "text-brand-700" : "text-ink-500"}`}>
                <span className={`grid h-[30px] w-11 place-items-center rounded-[10px] transition-colors ${on ? "bg-brand-100" : ""}`}>
                  <Glyph k={k} />
                </span>
                {label}
              </button>
            );
          })}
        </nav>

        {tourEl}
      </div>
    );
  }

  /* ================================================================ PC·태블릿 (지금 모양 그대로) */
  return (
    <div className={`grid gap-0 lg:h-full ${viewOnly ? "lg:grid-cols-[minmax(0,1fr)_300px] 2xl:grid-cols-[minmax(0,1fr)_340px]" : "lg:grid-cols-[230px_minmax(0,1fr)_290px] 2xl:grid-cols-[260px_minmax(0,1fr)_320px]"}`}>
      {/* ───────── 가운데: 무대 ───────── */}
      <section className="order-1 flex min-w-0 flex-col lg:order-2 lg:min-h-0">
        <div className="flex flex-wrap items-center gap-2 border-b border-line bg-white px-3 py-2">
          {/* PRO 스위치 — 사람 요청 «상단에서 바꾸면 자유자재로» (2026-09-26) */}
          {!viewOnly && (
            <>
              <span className="flex border border-ink" role="group" aria-label="편집 모드">
                <button type="button" aria-pressed={!pro} onClick={() => setProOn(false)} className={`px-2.5 py-1.5 text-[12px] font-bold ${!pro ? "bg-ink text-white" : "hover:bg-paper"}`}>
                  기본
                </button>
                <button type="button" aria-pressed={pro} onClick={() => setProOn(true)} className={`px-2.5 py-1.5 text-[12px] font-black tracking-[0.06em] ${pro ? "bg-accent text-ink" : "hover:bg-paper"}`}>
                  PRO
                </button>
              </span>
              <span className="mx-1 h-5 w-px bg-line" />
            </>
          )}
          <span data-tour="daynight" className="flex items-center gap-2">
            <Seg value={night ? "night" : "day"} onChange={(v) => setNight(v === "night")} options={[{ v: "day", label: "주간" }, { v: "night", label: "야간" }]} />
            {night && kind.needsLed && <Check label="조명 켜기" checked={ledOn} onChange={setLedOn} />}
          </span>
          <Check label="치수" checked={dims} onChange={setDims} />
          <Check label="격자" checked={d.grid !== false} onChange={(v) => patchDesign({ grid: v })} />
          <span className="mx-1 h-5 w-px bg-line" />
          <ToolBtn onClick={() => zoomBy(1.25)} label="축소">−</ToolBtn>
          <button type="button" onClick={() => fit()} className="h-8 min-w-14 border border-line px-2 text-[12px] font-bold hover:bg-paper" title="화면에 맞춤">
            {zoomPct}%
          </button>
          <ToolBtn onClick={() => zoomBy(0.8)} label="확대">+</ToolBtn>
          {!viewOnly && (
          <span className="ml-auto flex gap-1">
            <ToolBtn onClick={undo} disabled={!hist.past.length} label="되돌리기 (Ctrl+Z)">↶</ToolBtn>
            <ToolBtn onClick={redo} disabled={!hist.future.length} label="다시 하기 (Ctrl+Y)">↷</ToolBtn>
          </span>
          )}
        </div>

        {pro && !viewOnly && (
          <p className="border-b border-line bg-[#fff6ee] px-3 py-1.5 text-[12px] leading-relaxed">
            <b className="mr-1.5 font-black text-accent-600">PRO</b>
            글자 한 자를 누르면 바로 끌립니다 · Shift+끌기 = 글자 전체 · 점 편집·격자 왜곡·늘리기는 오른쪽 «PRO 글자 편집» 칸
          </p>
        )}
        <div data-tour="stage" className="relative h-[62vh] min-h-[340px] lg:h-auto lg:min-h-0 lg:flex-1">
          {stageEl}
          {busyEl}
        </div>

        {calibEl}
        {errEl}
        <p className="border-t border-line bg-white px-4 py-2 text-[12px] leading-relaxed text-ink-500">
          {viewOnly
            ? "위 − + 또는 Ctrl+휠로 확대 · 끌면 이동 · 화면의 색·밝기는 실제와 다르고, 야간 모습은 점등 «표현»입니다. 치수·위치는 현장 실측 후 확정합니다."
            : "Ctrl+휠 확대 · 빈 곳을 끌면 이동 · 글자를 두 번 누르면 한 자씩 · Ctrl+D 복제 · 화면의 색·밝기는 실제와 다르고, 야간 모습은 점등 «표현»입니다."}
        </p>
      </section>

      {/* ───────── 왼쪽: 넣기 · 벽 · 레이어 ───────── */}
      {/* 보기 전용(공유 링크)엔 넣기·벽·레이어가 없습니다 */}
      {!viewOnly && (
      <aside className="order-2 border-line bg-white lg:order-1 lg:min-h-0 lg:overflow-y-auto lg:border-r">
        {addPanel}
        {stylePanel}
        {wallPanel}
        {palettePanel}
        {layersPanel}
      </aside>

      )}

      {/* ───────── 오른쪽: 선택한 것 · 간판 · 판정 ───────── */}
      <aside className="order-3 border-line bg-white lg:min-h-0 lg:overflow-y-auto lg:border-l">
        {sel && (
          <Panel
            title={selTitle}
            action={
              <span className="flex gap-3">
                <button type="button" onClick={() => duplicate(sel.id)} className="text-[12px] font-bold text-ink-500 underline">복제</button>
                <button type="button" onClick={() => remove(sel.id)} className="text-[12px] font-bold text-ink-500 underline">지우기</button>
              </span>
            }
          >
            {selBody(sel)}
          </Panel>
        )}

        {proPanel}

        {viewOnly ? viewInfoPanel : kindPanel}

        {verdictPanel}

        {sharePanel}
      </aside>

      {tourEl}
    </div>
  );
}

/* ================================================================ 폰 부품 */

type PhoneTab = "add" | "text" | "font" | "kind" | "wall" | "judge" | "info";

/** 떠 있는 둥근 단추의 그림자 — 피그마 UI3 의 떠 있는 막대처럼 얇은 두 겹 */
const FLOAT = "bg-white text-ink shadow-[0_1px_2px_rgba(15,26,25,0.08),0_4px_14px_rgba(15,26,25,0.10)]";

/** 미디어 쿼리 — 에디터는 브라우저에서만 그려지므로(ssr:false) 첫 그림부터 맞는 값입니다 */
function useMedia(q: string) {
  const [on, setOn] = useState(() => window.matchMedia(q).matches);
  useEffect(() => {
    const mq = window.matchMedia(q);
    const f = () => setOn(mq.matches);
    mq.addEventListener("change", f);
    return () => mq.removeEventListener("change", f);
  }, [q]);
  return on;
}

/**
 * 아래에서 올라오는 시트 (인스타 편집 도구 시트). 손잡이·머리를 아래로 끌면 닫힙니다.
 * 🔴 목록은 시트 «안»에서만 굴러갑니다(`overscroll-contain`) — 끝까지 굴려도 페이지나 무대로 번지지 않습니다.
 */
function PhoneSheet({ title, action, onClose, children }: { title: string; action: string; onClose: () => void; children: React.ReactNode }) {
  const start = useRef<number | null>(null);
  const [dy, setDy] = useState(0);
  const end = () => {
    const far = dy > 60;
    start.current = null;
    setDy(0);
    if (far) onClose();
  };
  return (
    <section
      role="dialog"
      aria-label={title}
      className="mk-sheet relative z-10 -mt-5 flex max-h-[56dvh] shrink-0 flex-col rounded-t-[20px] bg-white shadow-[0_-6px_24px_rgba(15,26,25,0.10)]"
      style={dy ? { transform: `translateY(${dy}px)` } : undefined}
    >
      <div
        className="shrink-0 touch-none select-none"
        onPointerDown={(e) => {
          if ((e.target as Element).closest("button")) return;
          start.current = e.clientY;
          try {
            e.currentTarget.setPointerCapture(e.pointerId);
          } catch {
            /* 이미 놓인 포인터 */
          }
        }}
        onPointerMove={(e) => start.current !== null && setDy(Math.max(0, e.clientY - start.current))}
        onPointerUp={end}
        onPointerCancel={end}
      >
        <div className="mx-auto mt-2 h-[5px] w-9 rounded-full bg-[#cfd5d3]" aria-hidden="true" />
        <header className="flex items-center pb-1.5 pl-5 pr-3 pt-1">
          <h2 className="flex-1 text-[16px] font-black">{title}</h2>
          <button type="button" onClick={onClose} className="h-10 px-2 text-[14px] font-extrabold text-brand-700">
            {action}
          </button>
        </header>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-5">{children}</div>
    </section>
  );
}

/** «넣기» 시트의 타일 — 파일을 받는 타일은 앨범(기본)과 카메라(작은 단추) 두 길을 둡니다 */
function PhoneTile({ icon, title, sub, onClick, onFile }: { icon: GlyphKey; title: string; sub: string; onClick?: () => void; onFile?: (f: File) => void }) {
  const inner = (
    <>
      <span className="grid h-9 w-9 place-items-center rounded-[10px] bg-white text-brand-700">
        <Glyph k={icon} />
      </span>
      <b className="mt-1.5 block text-[15px] font-black">{title}</b>
      <span className="block text-[12px] text-ink-500">{sub}</span>
    </>
  );
  const cls = "block w-full rounded-2xl bg-paper p-3.5 text-left active:bg-brand-50";
  if (!onFile) {
    return (
      <button type="button" onClick={onClick} className={cls}>
        {inner}
      </button>
    );
  }
  const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = ""; // 같은 사진을 다시 골라도 바뀌게
    if (f) onFile(f);
  };
  return (
    <div className="relative">
      <label className={`${cls} cursor-pointer focus-within:outline-2 focus-within:outline-brand`}>
        {inner}
        <input type="file" accept="image/*" className="sr-only" onChange={pick} />
      </label>
      <label className="absolute right-2 top-2 flex h-9 cursor-pointer items-center rounded-full bg-white px-3 text-[12px] font-bold text-brand-700 focus-within:outline-2 focus-within:outline-brand">
        카메라
        <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={pick} aria-label={`${title} 카메라로 찍기`} />
      </label>
    </div>
  );
}

type GlyphKey = PhoneTab | "close" | "undo" | "redo" | "persp" | "logo" | "patch" | "plate";

/** 폰 화면의 선 아이콘 — 1.7 굵기 한 벌(피그마 UI3 도구 막대의 가는 선 결) */
function Glyph({ k }: { k: GlyphKey }) {
  const paths: Record<GlyphKey, React.ReactNode> = {
    close: <path d="M6 6l12 12M18 6L6 18" />,
    undo: (
      <>
        <path d="M9 14L4 9l5-5" />
        <path d="M4 9h11a5 5 0 010 10h-3" />
      </>
    ),
    redo: (
      <>
        <path d="M15 14l5-5-5-5" />
        <path d="M20 9H9a5 5 0 000 10h3" />
      </>
    ),
    add: (
      <>
        <rect x="4" y="4" width="16" height="16" rx="3" />
        <path d="M12 8.5v7M8.5 12h7" />
      </>
    ),
    text: <path d="M5 6.5h14M12 6.5V19M9.5 19h5" />,
    font: (
      <>
        <path d="M3.5 19L9 5h1l5.5 14M5.8 14h7.4" />
        <path d="M16.5 12c.5-.6 1.3-1 2.2-1 1.5 0 2.3.9 2.3 2.3V19M21 15.3c-2.7 0-4.4.6-4.4 2 0 1 .8 1.7 1.9 1.7 1.4 0 2.5-.9 2.5-2.4" />
      </>
    ),
    kind: (
      <>
        <rect x="3" y="7" width="18" height="10" rx="1.5" />
        <path d="M7 12h10M12 3.5V7M9 20.5h6" />
      </>
    ),
    wall: (
      <>
        <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
        <circle cx="9" cy="10" r="1.8" />
        <path d="M3.5 16.5l4.5-3.5 3.5 2.5 3-2 6 4.5" />
      </>
    ),
    judge: (
      <>
        <path d="M4 7h10M4 12h7M4 17h5" />
        <path d="M13.5 16.5l2.5 2.5 4.5-5" />
      </>
    ),
    info: (
      <>
        <rect x="3" y="7" width="18" height="10" rx="1.5" />
        <path d="M7 12h10" />
      </>
    ),
    persp: <path d="M5 6l14-2v16L5 18z" />,
    logo: (
      <>
        <circle cx="12" cy="12" r="7.5" />
        <path d="M9 10.5h.01M15 10.5h.01M9 14.5c1.6 1.6 4.4 1.6 6 0" />
      </>
    ),
    patch: (
      <>
        <rect x="4" y="7" width="16" height="10" rx="1.5" />
        <path d="M4 12h16" strokeDasharray="2 2" />
      </>
    ),
    plate: (
      <>
        <path d="M3 4.5h11M7 4.5v4M12 4.5v4" />
        <ellipse cx="9.5" cy="14" rx="7" ry="5" />
        <path d="M6.5 14h6" />
      </>
    ),
  };
  const size = k === "persp" ? 16 : k === "close" || k === "undo" || k === "redo" ? 20 : 22;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[k]}
    </svg>
  );
}

/* ================================================================ 속성 패널 */

function TransformProps({ it, warpMode, onWarpMode, onChange }: { it: Item; warpMode: boolean; onWarpMode: (v: boolean) => void; onChange: (p: Partial<Item>) => void }) {
  const deg = Math.round(((it.rot ?? 0) + 540) % 360) - 180;
  return (
    <div data-tour="transform" className="mb-4 border-b border-line pb-4">
      <div className="flex items-center gap-2 text-[13px]">
        <span className="w-10 shrink-0 font-bold">회전</span>
        <input type="range" min={-180} max={180} step={1} value={deg} onChange={(e) => onChange({ rot: Number(e.target.value), warp: null })} className="flex-1 accent-brand" aria-label="회전" />
        <span className="w-10 text-right tabular-nums">{deg}°</span>
      </div>
      <div className="mt-2 flex gap-1.5">
        <button type="button" onClick={() => onWarpMode(!warpMode)} aria-pressed={warpMode} className={`flex-1 border px-2 py-2 text-[12px] font-bold ${warpMode ? "border-accent bg-accent text-ink" : "border-line hover:bg-paper"}`}>
          {warpMode ? "원근 맞추는 중 — 네 점을 끄세요" : "원근 맞추기 (네 점)"}
        </button>
        {/* `!!` — rot 이 0 이고 warp 가 null 이면 `0` 이 글자로 찍혔습니다(2026-09-26 폰 칩에서 발견) */}
        {!!(it.warp || it.rot) && (
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
  part,
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
  /** 폰은 «글자»(문구·높이·색·한 자씩)와 «글꼴» 두 시트로 나눠 담습니다. 없으면(PC) 전부 */
  part?: "text" | "font";
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
  const cur = it.font.src === "lib" ? lib.find((f) => f.slug === (it.font as { slug: string }).slug) : undefined;
  const [grp, setGrp] = useState(cur?.group ?? fontGroups[0].key);
  const big = !!part; // 폰 — 손가락 과녁 44px

  return (
    <div className="space-y-3">
      {part !== "font" && (
      <>
      <div data-tour="text-lines" className="space-y-3">
      {it.lines.map((l, i) => (
        <div key={i} className="space-y-1.5">
          <div className="flex gap-1.5">
            <input value={l.text} onChange={(e) => setLine(i, { text: e.target.value.slice(0, 30) })} className={`min-w-0 flex-1 border border-line px-2.5 text-[15px] ${big ? "h-12 rounded-xl bg-paper text-[17px] font-bold" : "py-2"}`} aria-label={`${i + 1}번째 줄 글자`} />
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
      {/* 세로쓰기 — 돌출 판·현판·세로 간판(레퍼런스 14·18·20). 줄마다 세로 단 하나, 첫 줄이 오른쪽 */}
      <Check label="세로쓰기 (첫 줄이 오른쪽 단)" checked={!!it.vertical} onChange={(v) => onChange({ vertical: v, glyphs: undefined })} />
      </div>

      <Field label="앞면 색 (전체)">
        <Swatches items={faceColors.map((c) => ({ name: c.name, hex: c.hex }))} value={it.face} onPick={(hex) => onChange({ face: hex })} />
        <input type="color" value={it.face} onChange={(e) => onChange({ face: e.target.value })} className="mt-1.5 h-8 w-full cursor-pointer border border-line" aria-label="앞면 색 직접 고르기" />
      </Field>

      {/* 글자 한 자씩 — 해외 메이커의 «글자별 색»을 위치·크기·회전까지 넓혔습니다 */}
      <Field label="글자 한 자씩 (캔버스에서 두 번 눌러도 됩니다)" tour="glyphs">
        <div className="flex flex-wrap gap-1">
          {glyphs.map((g) => {
            const on = glyph === g.i, custom = !!it.glyphs?.[g.i];
            return (
              <button key={g.i} type="button" onClick={() => onGlyph(on ? null : g.i)} aria-pressed={on} className={`border px-1 text-[15px] font-bold ${big ? "h-11 min-w-11 rounded-xl text-[17px]" : "h-9 min-w-9"} ${on ? "border-accent bg-accent text-ink" : custom ? "border-brand-700 text-brand-700" : "border-line hover:bg-paper"}`}>
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
              <span className="text-ink-500">{big ? "벽에서 글자를 두 번 두드려도 됩니다" : "화살표 키로도 옮깁니다"}</span>
              <button type="button" onClick={() => onGlyphOv(glyph, null)} className="font-bold text-ink-500 underline">
                이 글자 처음대로
              </button>
            </div>
          </div>
        )}
      </Field>

      </>
      )}

      {part === "font" && (
        <div>
          <p className="mb-2 text-[13px] text-ink-500">
            지금 <b className="text-ink">«{fontLabel(it.font)}»</b>
          </p>
          {/* 인스타 편집기의 분류 알약 — 한 번에 한 무리만 보여 줄을 짧게 */}
          <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-2.5" role="group" aria-label="글꼴 분류">
            {fontGroups.map((g) => (
              <button key={g.key} type="button" aria-pressed={grp === g.key} onClick={() => setGrp(g.key)} className={`h-8 shrink-0 rounded-full px-3.5 text-[13px] font-bold ${grp === g.key ? "bg-ink text-white" : "bg-paper text-ink-500"}`}>
                {g.label}
              </button>
            ))}
          </div>
          <ul className="space-y-1">
            {lib
              .filter((f) => f.group === grp)
              .map((f) => {
                const on = it.font.src === "lib" && it.font.slug === f.slug;
                return (
                  <li key={f.slug}>
                    <button type="button" onClick={() => onChange({ font: { src: "lib", slug: f.slug } })} aria-pressed={on} className={`flex min-h-12 w-full items-center gap-2 rounded-xl px-3 py-1.5 text-left ${on ? "bg-brand-50 text-brand-700 ring-[1.5px] ring-brand ring-inset" : "active:bg-paper"}`}>
                      <span className="min-w-0 flex-1">
                        <span className={`block text-[15px] ${on ? "font-extrabold" : "font-bold"}`}>
                          {f.name}
                          {f.slug === "kcc-ganpan" && <span className="ml-1.5 text-[11px] font-bold text-ink-500">간판용</span>}
                        </span>
                        <span className="block truncate text-[12px] text-ink-500">{f.fits}</span>
                      </span>
                      {on && <span className="text-[13px] font-extrabold">✓</span>}
                    </button>
                  </li>
                );
              })}
          </ul>
          {!admin && <p className="mt-2 text-[12px] leading-relaxed text-ink-500">간판에 써도 되는 무료 글꼴만 모았습니다(인쇄·상호·웹 사용 가능 확인).</p>}
        </div>
      )}

      {!part && (
      <Field label={`글꼴 · 지금 «${fontLabel(it.font)}»`} tour="font">
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
      )}

      {/* 손님도 자기 글꼴(가게 BI 글꼴 등)을 올릴 수 있습니다 (2026-09-26 사람 요청). 관리자처럼 «이 브라우저 안에서만» —
          파일은 서버로 안 가고, 견적에는 그 글꼴로 그린 외곽선(JPG·SVG)만 붙습니다. PC 글꼴 목록(권한 묻는 창)은 관리자만. */}
      {!admin && part !== "text" && (
        <Field label="가지고 계신 글꼴로 해 보기">
          <FontFileInput onFile={onFontFile} />
          <p className="mt-1.5 text-[12px] leading-relaxed text-ink-500">
            가게 로고·상호에 쓰는 글꼴 파일이 있으면 올려 보세요. 파일은 이 브라우저 안에서만 쓰이고 저희 서버로 올라가지 않습니다
            (새로고침하면 다시 올려야 합니다). 상업적으로 써도 되는 글꼴인지는 견적 때 담당자가 같이 확인합니다.
          </p>
        </Field>
      )}

      {admin && part !== "text" && (
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
          <FontFileInput onFile={onFontFile} className="mt-1.5" />
          <p className="mt-1.5 text-[12px] leading-relaxed text-ink-500">여기 글꼴은 서버에 안 올라가고 손님 화면에도 안 보입니다. 손님 간판에 쓰기 전에 그 글꼴의 상업·BI 사용 조건을 확인하세요.</p>
        </Field>
      )}
    </div>
  );
}

/** 글꼴 파일 올리기 — 관리자·손님이 같이 씁니다(받는 쪽은 `onFontFile` 하나) */
function FontFileInput({ onFile, className = "" }: { onFile: (f: File) => void; className?: string }) {
  return (
    <label className={`flex cursor-pointer items-center justify-center border border-line px-3 py-2 text-[13px] font-bold hover:bg-paper focus-within:outline-2 focus-within:outline-brand ${className}`}>
      글꼴 파일 올리기 (TTF·OTF·WOFF)
      <input
        type="file"
        accept=".ttf,.otf,.woff,.woff2"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = ""; // 같은 파일을 다시 골라도 바뀌게
        }}
      />
    </label>
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

/* ================================================================ 판 · 스타일 (2026-09-26) */

const TYPE_LABEL: Record<Item["type"], string> = { text: "글자", logo: "로고", patch: "가림", plate: "판", image: "그림" };

/** 레퍼런스 스타일 목록의 작은 그림 — 판 색·모양·글자색만으로 결을 보여 줍니다 */
function StyleThumb({ s, tone }: { s: RefStyle; tone?: string }) {
  const face = tone ?? s.text.face;
  const p = s.plate;
  const W = 56, H = 40;
  let pw = 0, ph = 0;
  if (p) {
    const k = Math.min((W - 8) / p.w, (H - 8) / p.h);
    pw = p.w * k;
    ph = p.h * k;
  }
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="shrink-0 border border-line bg-[#ecebe6]" aria-hidden="true">
      {p ? (
        <>
          {p.mount === "hang" && <path d={`M${(W - pw) / 2 - 4} ${(H - ph) / 2 - 3}H${(W + pw) / 2}`} stroke="#34393a" strokeWidth={1.4} />}
          {p.mount === "blade" && <path d={`M${(W - pw) / 2 - 5} ${H / 2}H${(W - pw) / 2}`} stroke="#34393a" strokeWidth={2} />}
          <path d={platePath(p.shape, pw, ph)} transform={`translate(${(W - pw) / 2} ${(H - ph) / 2})`} fill={p.fill} stroke={p.border || "none"} strokeWidth={p.border ? 1.6 : 0} />
          {s.text.vertical ? (
            <path d={`M${W / 2} ${(H - ph) / 2 + 4}V${(H + ph) / 2 - 4}`} stroke={face} strokeWidth={3} />
          ) : (
            <path d={`M${(W - pw * 0.6) / 2} ${H / 2}H${(W + pw * 0.6) / 2}`} stroke={face} strokeWidth={3.2} />
          )}
        </>
      ) : (
        <path d={`M12 ${H / 2}h4M20 ${H / 2}h4M28 ${H / 2}h4M36 ${H / 2}h4`} stroke={face} strokeWidth={4} />
      )}
    </svg>
  );
}

function PlateProps({ it, palette, onChange }: { it: PlateItem; palette?: string[]; onChange: (p: Partial<PlateItem>) => void }) {
  const mount = plateMounts.find((m) => m.key === it.mount);
  return (
    <div className="space-y-3">
      <Field label="모양">
        <Seg
          value={it.shape}
          onChange={(v) => onChange(v === "circle" ? { shape: v, h: it.w } : { shape: v })}
          options={plateShapes.map((s) => ({ v: s.key, label: s.name }))}
        />
      </Field>
      <div className="grid grid-cols-2 gap-2 text-[12px]">
        <label className="block">
          <span className="font-bold">가로 (mm)</span>
          <NumIn value={it.w} min={100} max={12000} step={10} onChange={(v) => onChange(it.shape === "circle" ? { w: v, h: v } : { w: v })} />
        </label>
        <label className="block">
          <span className="font-bold">세로 (mm)</span>
          <NumIn value={it.h} min={100} max={12000} step={10} onChange={(v) => onChange(it.shape === "circle" ? { w: v, h: v } : { h: v })} />
        </label>
      </div>
      <Field label="판 색">
        <Swatches items={[...plateColors.map((c) => ({ name: c.name, hex: c.hex })), ...(palette ?? []).slice(0, 4).map((hex, i) => ({ name: `건물 색 ${i + 1}`, hex }))]} value={it.fill} onPick={(hex) => onChange({ fill: hex })}>
          <input type="color" value={it.fill} onChange={(e) => onChange({ fill: e.target.value })} title="다른 색 직접 고르기" aria-label="판 색 직접 고르기" className="h-8 w-8 cursor-pointer border border-line p-0.5" />
        </Swatches>
      </Field>
      <Field label="테두리">
        <Swatches items={[{ name: "없음", hex: "" }, ...plateColors.map((c) => ({ name: c.name, hex: c.hex }))]} value={it.border ?? ""} onPick={(hex) => onChange({ border: hex })} emptyLabel="없음" />
        {!!it.border && <Slider label="굵기" unit="mm" min={5} max={150} step={5} value={it.borderMm ?? 30} onChange={(v) => onChange({ borderMm: v })} />}
      </Field>
      <Field label="다는 방식">
        <Seg value={it.mount} onChange={(v) => onChange({ mount: v })} options={plateMounts.map((m) => ({ v: m.key, label: m.short }))} />
        <p className="mt-1.5 text-[12px] leading-relaxed text-ink-500">
          {mount?.label}
          {it.mount === "blade" && " · 정면 그림이라 비스듬히 본 면으로 그립니다 — 사진 속 각도는 «원근 맞추기»로 맞춥니다."}
        </p>
        {it.mount !== "wall" && (
          <div className="mt-1.5">
            <Seg value={it.side ?? "left"} onChange={(v) => onChange({ side: v as "left" | "right" })} options={[{ v: "left", label: "벽이 왼쪽" }, { v: "right", label: "벽이 오른쪽" }]} />
          </div>
        )}
      </Field>
    </div>
  );
}

/* ================================================================ 작은 부품 */

/** 폰 시트 안 — 시트가 이미 제목을 달고 있어 칸 머리(제목·여백)를 뺍니다 */
const Bare = createContext(false);

/** `tour` = 처음 온 사람 안내(MakerTour)가 강조할 자리의 이름 */
function Panel({ title, action, tour, children }: { title: string; action?: React.ReactNode; tour?: string; children: React.ReactNode }) {
  const bare = useContext(Bare);
  if (bare) return <section data-tour={tour}>{children}</section>;
  return (
    <section data-tour={tour} className="border-b border-line">
      <header className="flex items-center justify-between px-4 pb-1 pt-3">
        <h2 className="text-[12px] font-black tracking-[0.08em] text-ink-500">{title}</h2>
        {action}
      </header>
      <div className="px-4 pb-4 pt-1.5">{children}</div>
    </section>
  );
}

function Field({ label, tour, children }: { label: string; tour?: string; children: React.ReactNode }) {
  return (
    <div data-tour={tour} className="mt-3 first:mt-0">
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

/** `children` 은 견본 줄 끝에 같이 섭니다(벽 색의 «직접 고르기» 칸) */
function Swatches({ items, value, onPick, glow, emptyLabel = "같게", children }: { items: { name: string; hex: string }[]; value: string; onPick: (hex: string) => void; glow?: boolean; emptyLabel?: string; children?: React.ReactNode }) {
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
            style={c.hex ? { background: c.hex, boxShadow: glow ? `0 0 10px ${c.hex}` : undefined, color: inkOn(c.hex) } : undefined}
          >
            {!c.hex ? emptyLabel : ""}
          </button>
        );
      })}
      {children}
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

const ymd = (iso: string) => iso.slice(0, 10);

const stamp = () => {
  const t = new Date();
  return `${t.getFullYear()}${String(t.getMonth() + 1).padStart(2, "0")}${String(t.getDate()).padStart(2, "0")}`;
};
