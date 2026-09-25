/**
 * 메이커의 «디자인» 한 장 — 자료 모양 · 판정 · 내보내기 (F26 · 2026-09-25).
 *
 * 좌표는 전부 **벽 위의 mm** 입니다(왼쪽 위가 0,0). 화면 픽셀로 저장하지 않는 이유: 벽 사진의
 * 축척을 나중에 보정하면(십자선 두 개) 픽셀 값은 전부 틀린 값이 되는데, mm 는 그대로 참입니다.
 */
import { FAB, makerKinds, wallColors, walls, type MakerKind } from "@/config/maker";
import type { FabResult } from "@/lib/maker/fab";
import type { TextLine } from "@/lib/maker/fonts";

export type FontRef =
  | { src: "lib"; slug: string }
  /** 관리자 전용 — 이 PC 의 글꼴 · 올린 파일. 브라우저 밖으로 안 나갑니다 */
  | { src: "local" | "file"; key: string; name: string };

/** 모든 아이템 공통 — 포토샵의 «회전» 과 «왜곡(네 점)» */
type Xform = {
  /** 회전 (도, 시계 방향) */
  rot?: number;
  /**
   * 4점 원근 — 왼위·오위·오아래·왼아래 네 모서리의 자리(아이템 중심 기준 mm). 없으면 반듯한 사각형.
   * 🔴 **보이는 모양만 바꿉니다.** 판정·제작용 SVG 는 반듯한 모양으로 합니다(비스듬한 건 사진의 원근이지 간판이 아닙니다).
   */
  warp?: [number, number][] | null;
};

/** 글자 한 자의 꾸밈 — 해외 메이커의 «글자별 색» 을 위치·크기·회전까지 넓힌 것 */
export type GlyphOv = { color?: string; dx?: number; dy?: number; scale?: number; rot?: number };

export type TextItem = Xform & {
  id: string;
  type: "text";
  lines: TextLine[];
  font: FontRef;
  face: string;
  /** 글자별 꾸밈 — 열쇠는 `Glyph.i`(공백 뺀 순번) */
  glyphs?: Record<number, GlyphOv>;
  /** 중심 좌표 (mm) */
  x: number;
  y: number;
};

export type LogoLayer = { name: string; d: string; color: string };

export type LogoItem = Xform & {
  id: string;
  type: "logo";
  name: string;
  layers: LogoLayer[];
  /** 벡터 원본의 잉크 상자 크기 (원본 픽셀) — d 는 이 상자의 왼쪽 위가 0,0 */
  srcW: number;
  srcH: number;
  /** 벽 위 가로 (mm). 세로는 비율대로 */
  w: number;
  x: number;
  y: number;
  /**
   * 원래 글자였던 로고의 «가장 작은 글자 높이»(mm). 공유 링크(F26-b)가 관리자 PC 글꼴 글자를 외곽선으로
   * 굳힐 때 남깁니다 — 없으면 로고 전체 높이로 조명 최소 높이를 판정해 여러 줄 글자가 덜 엄하게 판정됩니다.
   */
  letterMm?: number;
};

/** 가리기 — 벽 사진 속 기존 간판을 덮는 판 (SignMonkey 의 «bandaid» 에서 빌린 것) */
export type PatchItem = Xform & { id: string; type: "patch"; x: number; y: number; w: number; h: number; color: string };

export type Item = TextItem | LogoItem | PatchItem;

export type Design = {
  /** `makerKinds` 의 key */
  kind: string;
  led: string;
  /** 옆면 색 ("" = 앞면과 같게) */
  side: string;
  /** 바탕판 색 (T5 만) */
  board: string;
  /** 바탕판 여백 — 글자 높이의 배수 (T5) */
  boardPad?: number;
  /** 트림(앞면 테두리) 색 — "" 면 트림 없음(트림리스) */
  trim?: string;
  /** 전면발광 뒤 «바»(전기선 가림, SIGNTYPES.md §3-1) — 켜고 끄기 + 색 */
  bar?: boolean;
  barColor?: string;
  /** 옆면(두께)이 보이는 쪽 — 사진 속 간판을 어디서 보나 */
  view?: "front" | "left" | "right" | "below" | "above";
  /** 옆면 깊이 mm — 비우면 종류의 기본값 */
  depth?: number;
  /** 벽: "white" · "blueprint" · "dark" · "color"(아래 `wallColor`) · "photo" */
  wall: string;
  /** 벽 색 직접 고르기 — `wall === "color"` 일 때만 씁니다 (2026-09-25) */
  wallColor?: string;
  /** 격자(10cm·1m) 보이기 */
  grid?: boolean;
  /** 벽 가로 (mm) — 사진이면 축척 보정으로 바뀝니다 */
  wallW: number;
  /** 벽 세로 (mm) */
  wallH: number;
  items: Item[];
};

export const newId = () => Math.random().toString(36).slice(2, 10);

export function defaultDesign(): Design {
  return {
    kind: "channel-front",
    led: "#f4f8ff",
    side: "#222423",
    board: "#1b1d1c",
    wall: "white",
    wallW: 8000,
    wallH: 4000,
    grid: true,
    trim: "",
    bar: false,
    barColor: "#2b2f2e",
    view: "below",
    boardPad: 0.8,
    items: [
      {
        id: newId(),
        type: "text",
        lines: [{ text: "수산나디자인", heightMm: 450, tracking: 0 }],
        font: { src: "lib", slug: "kcc-ganpan" },
        face: "#00a79d",
        x: 4000,
        y: 1700,
      },
    ],
  };
}

export const kindOf = (d: Design): MakerKind => makerKinds.find((k) => k.key === d.kind) ?? makerKinds[0];

/* ------------------------------------------------------------------ 벽 */

export const WALL_COLOR_DEFAULT = "#e6e3dc";

/** 벽의 바탕색 — 사진 벽은 사진이 덮으므로 사진이 안 뜬 동안의 회색입니다 */
export function wallFill(d: Design): string {
  if (d.wall === "color") return d.wallColor || WALL_COLOR_DEFAULT;
  if (d.wall === "photo") return "#d9d9d6";
  return (walls.find((w) => w.key === d.wall) ?? walls[0]).color;
}

/** 벽 이름 — 견적 요약·시안 그림 아랫줄에 들어갑니다 */
export function wallLabel(d: Design): string {
  if (d.wall === "photo") return "가게 사진";
  if (d.wall === "color") {
    const c = d.wallColor || WALL_COLOR_DEFAULT;
    const hit = wallColors.find((w) => w.hex.toLowerCase() === c.toLowerCase());
    return hit ? `${hit.name} 벽 (${c})` : `벽 색 ${c}`;
  }
  return (walls.find((w) => w.key === d.wall) ?? walls[0]).name;
}

/** WCAG 상대 휘도 (0 = 검정, 1 = 흰색) */
export function luminance(hex: string): number {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16) || 0;
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

const INK_DARK = "#0f1a19";
const INK_LIGHT = "#ffffff";

/**
 * 그 벽 위의 치수선·눈금·격자 색 — **먹과 흰색 중 대비가 큰 쪽**(WCAG 대비비로 셈).
 * 문턱 한 값을 박지 않은 이유: 중간 회색·붉은 벽돌색처럼 경계에 있는 색에서 «덜 보이는 쪽»을 고르는 일이 없게.
 */
export function inkOn(bg: string): string {
  const L = luminance(bg);
  const vsDark = (L + 0.05) / (luminance(INK_DARK) + 0.05);
  const vsLight = 1.05 / (L + 0.05);
  return vsDark >= vsLight ? INK_DARK : INK_LIGHT;
}

/* ------------------------------------------------------------------ 크기 */

/** 화면에서 재 둔 외곽 크기 — 글자는 글꼴을 받아야 알 수 있어 호출하는 쪽이 넘깁니다 */
export type Measured = { w: number; h: number };

export function itemSize(it: Item, textSize?: Measured): Measured {
  if (it.type === "patch") return { w: it.w, h: it.h };
  if (it.type === "logo") return { w: it.w, h: (it.w * it.srcH) / Math.max(1, it.srcW) };
  return textSize ?? { w: 0, h: 0 };
}

/* ------------------------------------------------------------------ 판정 */

export type Level = "ok" | "check" | "no";
export type Note = { level: Level; text: string };

/**
 * 「만들 수 있나」 한 항목. 원칙은 조사에서 본 세 단계 그대로입니다(2026-09-25):
 *   막고 이유를 말한다(불가) · 조건을 붙여 넘긴다(조건부) · 사람이 확인한다(모든 견적).
 * 🔴 **견적제라 «불가» 여도 견적은 막지 않습니다** — 대신 무엇을 바꾸면 되는지를 같이 적습니다.
 */
export function judgeItem(
  it: TextItem | LogoItem,
  kind: MakerKind,
  fab: FabResult | null,
  extra: { minLetterMm?: number; missing?: string[] } = {},
): Note[] {
  const out: Note[] = [];
  if (extra.missing?.length)
    out.push({ level: "no", text: `이 글꼴에 없는 글자가 있습니다: ${extra.missing.join(" ")} — 다른 글꼴을 고르세요.` });

  const minH = extra.minLetterMm;
  if (kind.needsLed && minH !== undefined && minH < FAB.ledMinLetterMm)
    out.push({
      level: "no",
      text: `글자 높이 ${Math.round(minH)}mm — 조명이 들어가려면 ${FAB.ledMinLetterMm}mm 이상이어야 합니다. 글자를 키우거나 «무점등 스카시»로 바꾸세요.`,
    });

  if (fab) {
    const s = fab.strokeMm;
    if (kind.lit !== "standoff" && kind.key !== "scasi") {
      if (s < FAB.laserMinStrokeMm)
        out.push({ level: "no", text: `가장 가는 획이 ${s.toFixed(1)}mm — 너무 가늘어 만들 수 없습니다.` });
      else if (s < FAB.bendMinStrokeMm) {
        const need = minH ? Math.ceil((minH * FAB.bendMinStrokeMm) / s / 10) * 10 : null;
        out.push({
          level: "check",
          text: `가장 가는 획 ${s.toFixed(0)}mm — 일반 절곡 채널(${FAB.bendMinStrokeMm}mm↑)로는 어렵고 레이저 가공으로 만듭니다.${need ? ` 절곡으로 하려면 글자 높이 약 ${need.toLocaleString()}mm.` : ""}`,
        });
      } else out.push({ level: "ok", text: `가장 가는 획 ${s.toFixed(0)}mm — 절곡 채널 가능.` });
    }
    if (fab.minHoleMm !== null && fab.minHoleMm < FAB.minHoleMm)
      out.push({ level: "check", text: `글자 속공간이 ${fab.minHoleMm.toFixed(0)}mm 로 좁습니다 — ㅇ·ㅁ 안쪽이 메워져 보일 수 있습니다.` });
    if (fab.specks > 0)
      out.push({ level: "check", text: `아주 작은 조각 ${fab.specks}개(가로세로 20mm 미만) — 따로 오려 붙이기 어려워 빼거나 합칩니다.` });
  }
  return out;
}

export const worst = (notes: Note[]): Level =>
  notes.some((n) => n.level === "no") ? "no" : notes.some((n) => n.level === "check") ? "check" : "ok";

export const LEVEL_LABEL: Record<Level, string> = {
  ok: "제작 가능",
  check: "조건부 — 담당자 확인",
  no: "이대로는 제작 어려움",
};

/* ------------------------------------------------------------------ 요약 (견적 폼에 들어가는 글) */

export function summarize(
  d: Design,
  info: {
    fontName: (it: TextItem) => string;
    sizes: Map<string, Measured>;
    notes: Map<string, Note[]>;
    overall: Measured | null;
    wallName: string;
    ledName: string;
  },
): string {
  const k = kindOf(d);
  const L: string[] = [];
  L.push(`[간판 메이커 디자인]`);
  L.push(`종류: ${k.name} (${k.code})`);
  if (k.needsLed) L.push(`조명 색: ${info.ledName}`);
  if (info.overall) L.push(`전체 크기(글자·로고 외곽): 가로 ${fmtMm(info.overall.w)} × 세로 ${fmtMm(info.overall.h)}`);
  L.push(`벽: ${info.wallName}`);
  d.items.forEach((it, i) => {
    if (it.type === "patch") return;
    const sz = info.sizes.get(it.id);
    if (it.type === "text") {
      L.push(`${i + 1}. 글자 «${it.lines.map((l) => l.text).join(" / ")}» · 글꼴 ${info.fontName(it)} · 글자 높이 ${it.lines.map((l) => `${l.heightMm}mm`).join(" / ")} · 앞면 ${it.face}`);
    } else {
      L.push(`${i + 1}. 로고 «${it.name}» · 색 ${it.layers.map((l) => l.color).join(", ")}`);
    }
    if (sz) L.push(`   크기: ${fmtMm(sz.w)} × ${fmtMm(sz.h)}`);
    for (const n of info.notes.get(it.id) ?? []) L.push(`   - ${LEVEL_LABEL[n.level]}: ${n.text}`);
  });
  L.push("※ 화면 색·밝기는 실제와 다릅니다. 최종 치수·색·위치는 현장 실측 후 확정됩니다.");
  return L.join("\n");
}

export const fmtMm = (mm: number) => `${Math.round(mm).toLocaleString()}mm`;

/* ------------------------------------------------------------------ 내보내기 */

export type Placed = {
  it: TextItem | LogoItem;
  /** 반듯한(회전·원근 전) 외곽선 — 아이템 왼쪽 위가 0,0, 단위 mm */
  paths: { d: string; color: string }[];
  size: Measured;
};

/**
 * 제작용 SVG — 벽·조명 없이 **글자·로고 외곽만**, 실제 크기(mm)로.
 * 색마다 `<g>` 로 갈라 둡니다 — 간판은 색마다 아크릴·시트가 따로라 층이 곧 제작 단위입니다.
 * ⚠️ «시안»이지 제작 원본이 아닙니다(`/sign-proof` 시트의 고지와 같은 말). 공장에서 칼선·CMYK 로 다시 뽑습니다.
 */
export function fabricationSvg(placed: Placed[]): string {
  const boxes = placed.map((p) => ({ x0: p.it.x - p.size.w / 2, y0: p.it.y - p.size.h / 2, ...p.size }));
  if (!boxes.length) return "";
  const x0 = Math.min(...boxes.map((b) => b.x0)), y0 = Math.min(...boxes.map((b) => b.y0));
  const x1 = Math.max(...boxes.map((b) => b.x0 + b.w)), y1 = Math.max(...boxes.map((b) => b.y0 + b.h));
  const W = x1 - x0, H = y1 - y0;
  const byColor = new Map<string, string[]>();
  placed.forEach((p, i) => {
    const b = boxes[i];
    for (const path of p.paths) {
      const g = `<path d="${path.d}" transform="translate(${(b.x0 - x0).toFixed(2)} ${(b.y0 - y0).toFixed(2)})"/>`;
      byColor.set(path.color, [...(byColor.get(path.color) ?? []), g]);
    }
  });
  const groups = [...byColor.entries()]
    .map(([c, ps]) => `<g id="face-${c.replace("#", "")}" fill="${c}" fill-rule="evenodd">${ps.join("")}</g>`)
    .join("");
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<!-- 수산나디자인 간판 메이커 · 시안(제작 원본 아님) · 단위 mm · 가로 ${Math.round(W)} × 세로 ${Math.round(H)} -->\n` +
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W.toFixed(1)}mm" height="${H.toFixed(1)}mm" viewBox="0 0 ${W.toFixed(2)} ${H.toFixed(2)}">${groups}</svg>`
  );
}

/**
 * 미리보기 그림(JPEG) — 벽 사진 + 무대 SVG 를 캔버스에 겹칩니다.
 * 🔴 **SVG 를 그림으로 그릴 때 그 안의 `<image>` 는 안 불러와집니다**(브라우저 보안). 그래서 배경은
 * 캔버스에 먼저 따로 그리고, 무대 SVG 는 배경을 뺀 채로 위에 얹습니다.
 */
export async function composeJpeg(
  stage: SVGSVGElement,
  bg: { src?: string; color?: string },
  footer: string[],
  outW = 1800,
): Promise<string> {
  const wallW = Number(stage.dataset.wallW), wallH = Number(stage.dataset.wallH);
  const drawH = Math.round((wallH / wallW) * outW);
  const footH = 36 + footer.length * 34;
  const cv = document.createElement("canvas");
  cv.width = outW;
  cv.height = drawH + footH;
  const ctx = cv.getContext("2d")!;
  ctx.fillStyle = bg.color ?? "#ecebe6";
  ctx.fillRect(0, 0, outW, drawH);

  if (bg.src) {
    const img = await loadImage(bg.src);
    // preserveAspectRatio="xMidYMid slice" 와 같은 자르기
    const s = Math.max(outW / img.naturalWidth, drawH / img.naturalHeight);
    const w = img.naturalWidth * s, h = img.naturalHeight * s;
    ctx.drawImage(img, (outW - w) / 2, (drawH - h) / 2, w, h);
  }

  const clone = stage.cloneNode(true) as SVGSVGElement;
  clone.querySelectorAll("[data-export-skip]").forEach((n) => n.remove());
  // 화면은 확대·이동 중일 수 있습니다 — 그림은 언제나 «벽 전체» 를 담습니다
  clone.setAttribute("viewBox", `0 0 ${wallW} ${wallH}`);
  clone.setAttribute("width", String(outW));
  clone.setAttribute("height", String(drawH));
  const xml = new XMLSerializer().serializeToString(clone);
  const url = URL.createObjectURL(new Blob([xml], { type: "image/svg+xml" }));
  try {
    const over = await loadImage(url);
    ctx.drawImage(over, 0, 0, outW, drawH);
  } finally {
    URL.revokeObjectURL(url);
  }

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, drawH, outW, footH);
  ctx.fillStyle = "#00a79d";
  ctx.fillRect(0, drawH, outW, 6);
  ctx.fillStyle = "#0f1a19";
  ctx.font = "600 24px 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif";
  footer.forEach((line, i) => ctx.fillText(line, 28, drawH + 44 + i * 34));
  return cv.toDataURL("image/jpeg", 0.88);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = () => rej(new Error("그림을 불러오지 못했습니다"));
    im.src = src;
  });
}

export function download(name: string, data: string | Blob) {
  const blob = typeof data === "string" && data.startsWith("data:") ? dataUrlToBlob(data) : typeof data === "string" ? new Blob([data], { type: "image/svg+xml" }) : data;
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

export function dataUrlToBlob(u: string): Blob {
  const [head, body] = u.split(",");
  const mime = /data:([^;]+)/.exec(head)?.[1] ?? "application/octet-stream";
  const bin = atob(body);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}
