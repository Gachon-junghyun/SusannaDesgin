/**
 * 로고 조립 — 락업 · 심벌 · 글자 · 색을 받아 **mm 로** 한 벌을 세웁니다 (F26-k · 2026-09-27).
 *
 * 🔴 **글자는 글꼴로 조판합니다**(`layoutLines` — 에디터와 같은 함수, 같은 줄 간격). AI 가 그린 글자는 여기 안 들어옵니다.
 * 결과는 두 가지로 씁니다:
 *   ① 화면 미리보기·SVG 내려받기용 «모양»(`shapes`, mm, 왼쪽 위가 0,0)
 *   ② 간판 에디터로 보낼 «아이템 묶음»(`items`, 가운데가 0,0) — 판(배지)·로고(심벌 층)·글자(살아 있는 글자 아이템).
 *      글자를 외곽선으로 굳혀 보내지 않는 이유: 에디터에서 다시 고칠 수 있어야 하고, 판정도 «줄 높이»로 정확히 해야 합니다.
 *
 * 배치 수는 로고.md «구성(락업)» 의 비율(세로 쌓기 0.7~1.2 · 가로 나란히 2.5↑)을 목표로 둔 어림입니다 — 측정값이 아닙니다.
 */
import type { Font } from "opentype.js";

import { FAB, makerKinds, type MakerKind } from "@/config/maker";
import type { Lockup, Palette } from "@/config/logo";
import { judgeItem, newId, worst, type Item, type Level, type LogoItem, type LogoLayer, type Note, type PlateItem, type TextItem } from "@/lib/maker/design";
import { fabCheck, type FabResult } from "@/lib/maker/fab";
import { layoutLines, type Outline, type TextLine } from "@/lib/maker/fonts";
import { mapPath, pathBox, platePath } from "@/lib/maker/geom";

export type SymbolSrc = {
  name: string;
  layers: LogoLayer[];
  srcW: number;
  srcH: number;
  /** 어디서 왔나 — 판정 문장에 씁니다 */
  from: "asset" | "sketch";
};

/**
 * 에셋·스케치 심벌을 «잉크 상자»로 자릅니다. ① 캔버스 전체를 덮는 사각형 층(흰 배경)은 뺍니다 — `letter_svg.py` 의 SVG 는
 * 배경 `<rect>` 를 품고 있고 업로더가 그걸 흰 경로로 평평하게 만듭니다. 안 빼면 «색 한 벌로 칠하기»가 배경을 통째로 칠해
 * 네모 한 장이 됩니다(2026-09-27 흐름을 짜다 잡음). ② 여백을 잘라야 심벌 높이가 락업 수대로 섭니다(여백까지 높이로 치면 작아짐).
 */
export function trimSymbol(src: SymbolSrc): { sym: SymbolSrc; dropped: number } {
  const area = src.srcW * src.srcH;
  const keep = src.layers.filter((l) => {
    const b = pathBox(l.d);
    const cmds = (l.d.match(/[MLCQZ]/gi) ?? []).length;
    return !(cmds <= 6 && b.w * b.h >= area * 0.97);
  });
  if (!keep.length) return { sym: src, dropped: 0 };
  const boxes = keep.map((l) => pathBox(l.d));
  const x0 = Math.min(...boxes.map((b) => b.x0)), y0 = Math.min(...boxes.map((b) => b.y0));
  const x1 = Math.max(...boxes.map((b) => b.x0 + b.w)), y1 = Math.max(...boxes.map((b) => b.y0 + b.h));
  return {
    sym: { ...src, layers: keep.map((l) => ({ ...l, d: mapPath(l.d, (p) => [p[0] - x0, p[1] - y0]) })), srcW: x1 - x0, srcH: y1 - y0 },
    dropped: src.layers.length - keep.length,
  };
}

export type LogoSpec = {
  name: string;
  sub: string;
  font: Font;
  fontSlug: string;
  tracking: number;
  /** 상호 줄 글자 높이 (mm) — 모든 치수가 여기서 나옵니다 */
  H: number;
  lockup: Lockup;
  symbol: SymbolSrc | null;
  palette: Palette;
  /** 심벌을 색 한 벌의 심벌 색으로 칠할지(원래 색이 여럿인 캐릭터는 끄는 게 보통) */
  recolor: boolean;
};

export type Shape = { d: string; color: string; role: "plate" | "symbol" | "text"; border?: { color: string; w: number } };

export type Composed = {
  w: number;
  h: number;
  shapes: Shape[];
  /** 가운데(0,0) 기준 아이템 — 받는 쪽이 id·자리를 붙입니다 */
  items: Item[];
  text: Outline | null;
  lines: TextLine[];
  /** 심벌 외곽 (mm, 이 로고 좌표) — 판정용 */
  symbolMm: { d: string; w: number; h: number; layers: number } | null;
  plate: { shape: string; w: number; h: number } | null;
  /** 조립하다 바꾼 것(예: 심벌 없는 «심벌만» → 글자만) — 화면에 알립니다 */
  notes: string[];
};

const SUB_RATIO = 0.32;
const SUB_TRACKING = 280;

export function linesOf(name: string, sub: string, H: number, tracking: number): TextLine[] {
  const out: TextLine[] = [{ text: name.trim() || "가게 이름", heightMm: H, tracking }];
  if (sub.trim()) out.push({ text: sub.trim(), heightMm: Math.max(20, Math.round((H * SUB_RATIO) / 5) * 5), tracking: SUB_TRACKING });
  return out;
}

export function compose(s: LogoSpec): Composed {
  const notes: string[] = [];
  let lockup = s.lockup;
  if (lockup === "mark" && !s.symbol) {
    lockup = "word";
    notes.push("심벌이 없어 «심벌만» 대신 글자만으로 세웠습니다.");
  }
  const sym = lockup === "word" ? null : s.symbol;
  if (s.lockup === "word" && s.symbol) notes.push("«글자만» 이라 고른 심벌은 쓰지 않았습니다.");

  const H = s.H;
  const lines = linesOf(s.name, s.sub, H, s.tracking);
  const text = lockup === "mark" ? null : layoutLines(s.font, lines);
  const tw = text?.w ?? 0, th = text?.h ?? 0;

  // 심벌 높이 — 락업마다 글자 높이의 배수
  const S = !sym ? 0 : lockup === "mark" ? H * 3 : lockup === "row" ? Math.max(th, H) * 1.1 : lockup === "badge" ? H * 1.35 : H * 1.8;
  const k = sym ? S / Math.max(1e-6, sym.srcH) : 0;
  const sw = sym ? sym.srcW * k : 0;
  const gap = H * 0.45;

  // 내용(심벌 + 글자) 배치 — 왼쪽 위 0,0
  let cw = 0, ch = 0;
  let sx = 0, sy = 0, tx = 0, ty = 0;
  if (lockup === "row" && sym && text) {
    cw = sw + gap + tw;
    ch = Math.max(S, th);
    sy = (ch - S) / 2;
    tx = sw + gap;
    ty = (ch - th) / 2;
  } else if (sym && text) {
    cw = Math.max(sw, tw);
    ch = S + gap + th;
    sx = (cw - sw) / 2;
    tx = (cw - tw) / 2;
    ty = S + gap;
  } else if (sym) {
    cw = sw;
    ch = S;
  } else {
    cw = tw;
    ch = th;
  }

  // 판 — 배지는 늘, 그 밖은 색 한 벌에 판 색이 있을 때(그 대비로 고른 색이라서)
  const pal = s.palette;
  const badge = lockup === "badge";
  let plateFill = pal.plate;
  let face = pal.face;
  let symColor = pal.symbol;
  if (badge && !plateFill) {
    // 판 색이 없는 한 벌로 배지를 세우면 — 글자 색을 판으로, 바탕 색을 글자로 뒤집습니다(대비가 그대로 삽니다)
    plateFill = pal.face;
    face = pal.ground;
    symColor = pal.ground;
  }
  let plate: Composed["plate"] = null;
  let ox = 0, oy = 0;
  if (plateFill) {
    if (badge) {
      const ratio = Math.max(cw, ch) / Math.max(1e-6, Math.min(cw, ch));
      if (ratio <= 1.5) {
        const D = Math.hypot(cw, ch) + H * 0.6;
        plate = { shape: "circle", w: D, h: D };
      } else plate = { shape: "round", w: cw + H * 1.6, h: ch + H * 1.1 };
    } else plate = { shape: "rect", w: cw + H * 1.2, h: ch + H * 0.9 };
    ox = (plate.w - cw) / 2;
    oy = (plate.h - ch) / 2;
  }
  const W = plate?.w ?? cw, Hh = plate?.h ?? ch;
  const border = badge && pal.point && plateFill ? { color: pal.point, w: Math.max(20, H * 0.07) } : undefined;

  const shapes: Shape[] = [];
  if (plate) shapes.push({ d: platePath(plate.shape, plate.w, plate.h), color: plateFill!, role: "plate", border });
  let symbolMm: Composed["symbolMm"] = null;
  const symLayers = sym ? sym.layers.map((l) => ({ ...l, color: s.recolor ? symColor : l.color })) : [];
  if (sym) {
    const X = ox + sx, Y = oy + sy;
    const mm = symLayers.map((l) => ({ d: mapPath(l.d, (p) => [X + p[0] * k, Y + p[1] * k]), color: l.color }));
    for (const m of mm) shapes.push({ ...m, role: "symbol" });
    symbolMm = { d: symLayers.map((l) => mapPath(l.d, (p) => [p[0] * k, p[1] * k])).join(""), w: sw, h: S, layers: new Set(symLayers.map((l) => l.color)).size };
  }
  if (text) shapes.push({ d: mapPath(text.d, (p) => [ox + tx + p[0], oy + ty + p[1]]), color: face, role: "text" });

  // 에디터로 보낼 아이템 — 가운데가 0,0
  const cx = (x: number) => x - W / 2, cy = (y: number) => y - Hh / 2;
  const items: Item[] = [];
  if (plate)
    items.push({ id: newId(), type: "plate", shape: plate.shape, mount: "wall", side: "left", fill: plateFill!, border: border?.color ?? "", borderMm: border?.w ?? 30, w: Math.round(plate.w), h: Math.round(plate.h), x: 0, y: 0 } satisfies PlateItem);
  if (sym)
    items.push({ id: newId(), type: "logo", name: sym.name, layers: symLayers, srcW: sym.srcW, srcH: sym.srcH, w: Math.round(sw), x: cx(ox + sx + sw / 2), y: cy(oy + sy + S / 2) } satisfies LogoItem);
  if (text)
    items.push({ id: newId(), type: "text", lines, font: { src: "lib", slug: s.fontSlug }, face, x: cx(ox + tx + tw / 2), y: cy(oy + ty + th / 2) } satisfies TextItem);

  return { w: W, h: Hh, shapes, items, text, lines: text ? lines : [], symbolMm, plate, notes };
}

/* ------------------------------------------------------------------ ⑦ 간판 제작 판정 */

export type LogoVerdict = { level: Level; notes: Note[]; fabText: FabResult | null; fabSym: FabResult | null; colors: number; pieces: number };

/**
 * 로고.md «간판으로 만들 수 있나» + 에디터 판정(`judgeItem`, `/sign-proof` 와 같은 자 — `FAB`).
 * 🔴 숫자를 여기 박지 않습니다 — 문턱은 전부 `config/maker.ts` 의 `FAB` 에서 옵니다.
 */
/**
 * 판정 해상도 — 에디터(1,600px)보다 낮춥니다. 세 안 × (상호·부제·심벌) 을 한 번에 재서 1,600 이면 화면이 몇 초 멈췄습니다(2026-09-27).
 * 2m 로고에서 약 2mm/px 라 문턱(획 38mm·속공간 30mm)을 가르기엔 충분합니다. 최종 판정은 에디터가 1,600 으로 다시 합니다.
 */
const JUDGE_PX = 1000;

const scasi = makerKinds.find((k) => k.key === "scasi") ?? makerKinds[0];

export function judgeLogo(c: Composed, kind: MakerKind): LogoVerdict {
  const notes: Note[] = [];
  let fabText: FabResult | null = null, fabSym: FabResult | null = null;
  if (c.text) {
    // 상호 줄과 부제 줄을 따로 잽니다 — 한 덩이로 재면 작은 부제가 상호의 판정까지 끌어내립니다(2026-09-27 화면에서 봄)
    const lineFab = (li: number) => {
      const gs = c.text!.glyphs.filter((g) => g.line === li);
      if (!gs.length) return null;
      const x0 = Math.min(...gs.map((g) => g.x0)), y0 = Math.min(...gs.map((g) => g.y0));
      const x1 = Math.max(...gs.map((g) => g.x0 + g.w)), y1 = Math.max(...gs.map((g) => g.y0 + g.h));
      return fabCheck(gs.map((g) => g.d).join(""), { x0, y0, w: x1 - x0, h: y1 - y0 }, 1, JUDGE_PX);
    };
    fabText = lineFab(0);
    const tag = (who: string, n: Note[]) => n.map((x) => ({ ...x, text: `${who} — ${x.text}` }));
    notes.push(...tag("상호", judgeItem({} as TextItem, kind, fabText, { minLetterMm: c.lines[0].heightMm, missing: c.text.missing })));
    if (c.lines.length > 1) {
      const sub = c.lines[1].heightMm;
      const subKind = kind.needsLed && sub < FAB.ledMinLetterMm ? scasi : kind;
      if (subKind !== kind)
        // 🔴 등급은 에디터와 같게 «불가» 입니다 — 에디터는 글자 아이템 하나를 한 종류로 판정해서, 여기만 «조건부»라 하면 두 화면이 다른 말을 합니다
        notes.push({ level: "no", text: `부제 — 글자 높이 ${Math.round(sub)}mm 라 조명 글자(${FAB.ledMinLetterMm}mm↑)가 안 됩니다. 부제만 무점등 스카시·시트로 따로 하거나(흔한 방식) 상호 글자 높이를 키우세요. 획·속공간은 스카시로 쟀습니다.` });
      notes.push(...tag("부제", judgeItem({} as TextItem, subKind, lineFab(1), { minLetterMm: sub })));
    }
  }
  if (c.symbolMm) {
    fabSym = fabCheck(c.symbolMm.d, { x0: 0, y0: 0, w: c.symbolMm.w, h: c.symbolMm.h }, 1, JUDGE_PX);
    const n = judgeItem({} as LogoItem, kind, fabSym, { minLetterMm: c.symbolMm.h });
    notes.push(...n.map((x) => ({ ...x, text: `심벌 — ${x.text}` })));
    if (c.symbolMm.layers > 3)
      notes.push({ level: "check", text: `심벌 색이 ${c.symbolMm.layers}층입니다 — 채널 간판은 면 하나가 한 색이라 층마다 따로 만듭니다. 그라데이션·수채처럼 보이는 층은 톤 띠(3~4단)로 줄이거나 출력 시트로.` });
  }
  const colors = new Set(c.shapes.flatMap((s) => [s.color, ...(s.border ? [s.border.color] : [])]).map((x) => x.toLowerCase())).size;
  if (colors > 3) notes.push({ level: "check", text: `색이 ${colors}개입니다 — 간판은 2~3색이 보통입니다(색마다 아크릴·시트).` });
  const pieces = (fabText?.pieces ?? 0) + (fabSym?.pieces ?? 0);
  if (pieces) notes.push({ level: "ok", text: `채널 조각 ${pieces}개(상호 ${fabText?.pieces ?? 0} + 심벌 ${fabSym?.pieces ?? 0}) — 조각 수가 제작비와 바로 이어집니다.` });
  if (c.plate) notes.push({ level: "ok", text: `${c.plate.shape === "circle" ? "원" : c.plate.shape === "round" ? "둥근" : "사각"} 판 ${Math.round(c.plate.w).toLocaleString()}×${Math.round(c.plate.h).toLocaleString()}mm — 판은 판정 대상이 아니고, 글자·심벌은 판 위에 섭니다.` });
  return { level: worst(notes), notes, fabText, fabSym, colors, pieces };
}

/* ------------------------------------------------------------------ 내보내기 */

/** 평평한 SVG (mm) — `<path fill d>` 만. 프로젝트 에셋 업로더와 같은 모양이라 다시 올려도 에디터가 읽습니다 */
export function logoSvg(c: Composed): string {
  const f = (n: number) => (Math.round(n * 10) / 10).toString();
  const body = c.shapes
    .map((s) => {
      const b = s.border ? ` stroke="${s.border.color}" stroke-width="${f(s.border.w)}"` : "";
      return `<path fill="${s.color}" fill-rule="evenodd"${b} d="${s.d}"/>`;
    })
    .join("\n");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${f(c.w)}mm" height="${f(c.h)}mm" viewBox="0 0 ${f(c.w)} ${f(c.h)}">\n${body}\n</svg>\n`;
}
