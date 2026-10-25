/**
 * 글꼴 공방의 일꾼 (F26-m 2단계, 2026-10-25) — 바탕 글꼴 받기 · 미리보기 굽기 · TTF 만들기를 화면 밖에서 합니다.
 *
 * 🔴 **왜 Web Worker 인가** — 시제품은 글자 120자씩 `setTimeout` 으로 쪼개 돌렸는데, 마지막 `buildTTF`(11,172자를 한 파일로 쓰기)는
 * 한 번의 동기 호출이라 쪼갤 수가 없습니다(나눔펜 1단계 실측 10.8초 중 상당 부분). 일꾼으로 옮기면 그동안에도 화면이 움직이고,
 * 엔진·기하·클리퍼·opentype.js·woff2 해제기가 **이 일꾼 파일에만** 실립니다 — 글꼴 공방 화면 JS 에도 안 들어갑니다.
 * 일꾼은 관리자가 글꼴을 처음 고를 때 만들어집니다(`FontStudio.tsx`).
 *
 * 수식은 시제품 `page/app.js` 그대로입니다: `styleMatrix` · `styled` · `fastBaseTT` · `addExtra` · `resolveAsync` · `mergedSyl`.
 * 3단계부터 고친 음절(overrides)을 받습니다 — 시제품처럼 «고친 글자는 범위와 상관없이 늘 넣고», 스타일은 고친 윤곽에도 똑같이 입힙니다.
 * 자모 칸(cells)은 아직 화면이 안 고치므로 여기 오지 않습니다(바탕 글꼴에 없는 음절은 비어 있음).
 */
import ClipperLib from "clipper-lib";
import type { Font } from "opentype.js";

import { loadFontBlob } from "@/lib/maker/fonts";
import type { Affine } from "@/lib/maker/geom";
import * as E from "@/lib/maker/hfont/engine";
import { DEFAULT_FRAMES } from "@/lib/maker/hfont/frames";
import * as G from "@/lib/maker/hfont/geom";

export type Style = { weight: number; slant: number; width: number; tracking: number };
export type License = { copyright: string; license: string; licenseUrl: string };
export type SignScope = "all" | "ks" | "text";
/** 고친 음절(3단계) — 음절 좌표 v2 윤곽 (CONTRACT §7) */
export type Overrides = Record<string, { contours: G.Contour[] }>;

export type ToWorker =
  | { type: "load"; id: string; url: string; cacheName: string }
  | { type: "bake"; seq: number; text: string; style: Style; overrides: Overrides }
  | { type: "export"; seq: number; sign: SignScope | null; text: string; style: Style; familyName: string; license: License; overrides: Overrides }
  | { type: "glyph"; seq: number; ch: string };

export type FromWorker =
  | { type: "progress"; seq: number; phase: "download" | "resolve" | "merge" | "build"; n: number; total: number; ms?: number }
  | { type: "loaded"; id: string; cached: boolean; bytes: number; ms: number }
  | { type: "baked"; seq: number; buf: ArrayBuffer; ms: number }
  | { type: "done"; seq: number; buf: ArrayBuffer; ms: number; syllables: number; edited: number }
  | { type: "glyph"; seq: number; ch: string; contours: G.Contour[] }
  | { type: "error"; seq: number; id?: string; message: string };

const ctx = self as unknown as {
  postMessage(m: FromWorker, transfer?: Transferable[]): void;
  onmessage: ((e: MessageEvent<ToWorker>) => void) | null;
};
const CL = ClipperLib;

type Contour = G.Contour;
type Base = { id: string; font: Font; upm: number; cache: Map<string, Contour[] | null> };
let base: Base | null = null;
let styleCache = new Map<string, Contour[]>();
let styleCacheKey = "";

/* ---------- 바탕 글꼴 받기 — 이 브라우저 Cache API 에 한 번 넣으면 다시 안 받습니다 ---------- */
async function fetchFont(url: string, cacheName: string, seq: number): Promise<{ blob: Blob; cached: boolean }> {
  let cache: Cache | null = null;
  try {
    cache = await caches.open(cacheName);
    const hit = await cache.match(url);
    if (hit) return { blob: await hit.blob(), cached: true };
  } catch {
    cache = null; // 사파리 사생활 보호 창 등은 Cache API 를 막습니다 — 그냥 받습니다
  }
  const res = await fetch(url, { mode: "cors" });
  if (!res.ok) throw new Error(`글꼴 파일을 받지 못했습니다 (${res.status})`);
  const total = Number(res.headers.get("content-length")) || 0;
  const parts: Uint8Array[] = [];
  let n = 0;
  if (res.body) {
    const reader = res.body.getReader();
    let last = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      parts.push(value);
      n += value.byteLength;
      if (n - last > 256 * 1024) {
        last = n;
        ctx.postMessage({ type: "progress", seq, phase: "download", n, total });
      }
    }
  } else parts.push(new Uint8Array(await res.arrayBuffer()));
  const blob = new Blob(parts as BlobPart[]);
  try {
    await cache?.put(url, new Response(blob, { headers: { "content-type": "application/octet-stream" } }));
  } catch {
    /* 저장 공간이 모자라면 다음에 다시 받습니다 */
  }
  return { blob, cached: false };
}

/* ---------- 바탕 글꼴 글자 (시제품 baseGlyph · baseAdvance) ---------- */
/** 글꼴에 있는 글자만 — 없는 글자는 .notdef(0번)라 null (시제품의 `g.index > 0`) */
function glyphOf(ch: string) {
  return base && base.font.charToGlyphIndex(ch) > 0 ? base.font.charToGlyph(ch) : null;
}
function baseGlyph(ch: string): Contour[] | null {
  if (!base) return null;
  if (base.cache.has(ch)) return base.cache.get(ch)!;
  const g = glyphOf(ch);
  let cs: Contour[] | null = null;
  if (g && g.path && g.path.commands.length) cs = G.commandsToContours(g.path.commands, base.upm);
  if (cs && !cs.length) cs = null;
  base.cache.set(ch, cs);
  return cs;
}
function baseAdvance(ch: string): number | null {
  const g = glyphOf(ch);
  return g && base ? ((g.advanceWidth ?? 0) * 1000) / base.upm : null;
}

/* ---------- 스타일 (시제품 styleMatrix · styled 그대로) ---------- */
/** 음절 좌표에서의 스타일 변환. pivot 은 너비를 줄이고 늘릴 가운데(음절은 500). */
function styleMatrix(st: Style, pivot = 500): Affine {
  const w = (st.width || 100) / 100, tn = Math.tan(((st.slant || 0) * Math.PI) / 180), shift = (st.tracking || 0) / 2 / 0.92;
  return [w, 0, -tn, 1, pivot - pivot * w + 913 * tn + shift, 0];
}
function styled(cs: Contour[] | null, st: Style, pivot?: number): Contour[] {
  if (!cs || !cs.length) return [];
  // 글꼴엔 방향이 반대인 윤곽이 섞여 있을 수 있어, 먼저 합쳐 방향을 정리한 뒤 굵기를 줍니다(클리퍼 offset).
  if (st.weight) cs = G.polygonsToContours(G.offset(CL, G.union(CL, G.flattenAll(cs, 0.3)), st.weight / 2), 0.8, 55);
  return G.transform(cs, styleMatrix(st, pivot));
}
function ttPoints(cs: Contour[]): E.TTContour[] {
  return cs.map((c) => G.contourToTT(c, 0.3).map((p) => (p.length > 2 ? [p[0], p[1], 0] : [p[0], p[1]])));
}
/** 바탕 글꼴 글자의 스타일 결과는 같은 스타일이면 다시 계산하지 않습니다 */
function styledBase(ch: string, st: Style): Contour[] {
  const key = [st.weight, st.slant, st.width, st.tracking, base!.id].join(",");
  if (key !== styleCacheKey) {
    styleCache = new Map();
    styleCacheKey = key;
  }
  let v = styleCache.get(ch);
  if (!v) {
    v = styled(baseGlyph(ch), st);
    styleCache.set(ch, v);
  }
  return v;
}
/** 고치지 않은 바탕 글자, 굵기 0: 원래 2차 곡선 점에 스타일만 곱합니다(곡선 맞추기 없음) */
function fastBaseTT(ch: string, st: Style, pivot?: number): E.TTContour[] | null {
  const g = glyphOf(ch);
  if (!g || !g.path || !g.path.commands.length) return null;
  const tt = G.commandsToTT(g.path.commands, base!.upm, styleMatrix(st, pivot));
  return tt.length ? tt : null;
}

type Resolved = {
  store: E.Store & { overrides: Record<string, E.Outline>; extra: Record<number, E.Outline> };
  advance: number;
  spaceAdvance?: number;
  charSyl: Record<string, Contour[]>;
};
function addExtra(r: Resolved, cp: number, st: Style) {
  const ch = String.fromCharCode(cp), cs = baseGlyph(ch), adv = baseAdvance(ch);
  if (!cs || adv == null) return;
  const pivot = (adv / 2 - 40) / 0.92;
  const tt = !st.weight ? fastBaseTT(ch, st, pivot) : ttPoints(styled(cs, st, pivot));
  if (tt) r.store.extra[cp] = { contours: tt, advance: adv + (st.tracking || 0) };
}

/** 바탕 글꼴 → 엔진 저장 형식(CONTRACT v1.1). 시제품 resolveAsync 에서 칸·덮어쓰기를 뺀 것 */
function resolve(chars: string[], st: Style, seq: number, report: boolean, overrides: Overrides): Resolved {
  const r: Resolved = {
    store: { frames: DEFAULT_FRAMES, cells: {}, overrides: {}, extra: {} },
    advance: 1000 + (st.tracking || 0),
    charSyl: {},
  };
  for (let cp = 0x21; cp <= 0x7e; cp++) addExtra(r, cp, st);
  for (let j = 0x3131; j <= 0x3163; j++) addExtra(r, j, st);
  const sp = baseAdvance(" ");
  if (sp) r.spaceAdvance = sp;
  // 고친 글자는 범위와 상관없이 늘 넣습니다(시제품 resolveAsync)
  const edited = Object.keys(overrides).filter((ch) => overrides[ch]?.contours?.length);
  chars = Array.from(new Set(chars.concat(edited)));
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    let adv = baseAdvance(ch);
    adv = adv == null ? null : adv + (st.tracking || 0);
    let cs: Contour[] | null = null;
    const o = overrides[ch];
    if (o && o.contours && o.contours.length) {
      cs = styled(o.contours, st);
      // 바탕 글꼴에 없는 글자를 새로 그렸으면 글자 폭은 기본값(advance)
    } else if (!st.weight) {
      const tt = fastBaseTT(ch, st);
      if (tt) r.store.overrides[ch] = { contours: tt, advance: adv ?? undefined };
    } else if (baseGlyph(ch)) cs = styledBase(ch, st);
    if (cs && cs.length) {
      r.charSyl[ch] = cs;
      r.store.overrides[ch] = { contours: ttPoints(cs), advance: adv ?? undefined };
    }
    if (report && (i % 240 === 0 || i === chars.length - 1)) ctx.postMessage({ type: "progress", seq, phase: "resolve", n: i + 1, total: chars.length, ms: performance.now() - jobStart });
  }
  return r;
}
/** 간판용: 한 글자의 겹친 획을 하나의 윤곽으로 (시제품 mergedSyl) — 고친 글자는 r.charSyl 에 이미 있습니다 */
function mergedSyl(r: Resolved, ch: string, st: Style): Contour[] {
  const cs = r.charSyl[ch] || (baseGlyph(ch) ? styledBase(ch, st) : null);
  if (!cs || !cs.length) return [];
  return G.polygonsToContours(G.union(CL, G.flattenAll(cs, 0.25)), 0.6, 55);
}

function allSyllables(): string[] {
  const a: string[] = [];
  for (let cp = 0xac00; cp <= 0xd7a3; cp++) a.push(String.fromCharCode(cp));
  return a;
}
const hangul = (text: string) => Array.from(new Set(Array.from(text).filter((c) => E.decompose(c))));

/* ---------- 차례로 처리 — 미리보기 요청이 쌓이면 마지막 것만 굽습니다 ---------- */
let queue: Promise<void> = Promise.resolve();
/** 지금 내보내는 일의 시작 시각 — 진행 표시의 «N초» (화면은 렌더 중에 시계를 못 읽습니다) */
let jobStart = 0;
let latestBake = 0;

async function handle(m: ToWorker) {
  if (m.type === "load") {
    const t0 = performance.now();
    try {
      const { blob, cached } = await fetchFont(m.url, m.cacheName, 0);
      const font = await loadFontBlob(m.url, blob);
      base = { id: m.id, font, upm: font.unitsPerEm, cache: new Map() };
      styleCacheKey = "";
      ctx.postMessage({ type: "loaded", id: m.id, cached, bytes: blob.size, ms: performance.now() - t0 });
    } catch (e) {
      ctx.postMessage({ type: "error", seq: 0, id: m.id, message: e instanceof Error ? e.message : String(e) });
    }
    return;
  }
  if (!base) {
    ctx.postMessage({ type: "error", seq: m.seq, message: "바탕 글꼴을 먼저 골라 주십시오." });
    return;
  }
  if (m.type === "glyph") {
    // 글자 고치기의 출발점 — 바탕 글꼴 모양(음절 좌표 v2, 스타일 없이)
    ctx.postMessage({ type: "glyph", seq: m.seq, ch: m.ch, contours: G.cloneAll(baseGlyph(m.ch) || []) });
    return;
  }
  if (m.type === "bake") {
    if (m.seq !== latestBake) return;
    const t0 = performance.now();
    try {
      const r = resolve(hangul(m.text), m.style, m.seq, false, m.overrides);
      const buf = E.buildTTF(r.store, { familyName: `FL${m.seq}`, advance: r.advance, spaceAdvance: r.spaceAdvance });
      ctx.postMessage({ type: "baked", seq: m.seq, buf, ms: performance.now() - t0 }, [buf]);
    } catch (e) {
      ctx.postMessage({ type: "error", seq: m.seq, message: e instanceof Error ? e.message : String(e) });
    }
    return;
  }
  // 내보내기 — 보통 TTF(exportTtf) · 간판용 TTF(exportSignTtf)
  const t0 = (jobStart = performance.now());
  try {
    const st = m.style;
    const r = resolve(allSyllables(), st, m.seq, true, m.overrides);
    let familyName = m.familyName;
    if (m.sign) {
      const list = m.sign === "all" ? allSyllables() : m.sign === "ks" ? E.ks2350() : hangul(m.text);
      for (let i = 0; i < list.length; i++) {
        const cs = mergedSyl(r, list[i], st), prev = r.store.overrides[list[i]];
        if (cs.length) r.store.overrides[list[i]] = { contours: ttPoints(cs), advance: prev && prev.advance };
        if (i % 40 === 0 || i === list.length - 1) ctx.postMessage({ type: "progress", seq: m.seq, phase: "merge", n: i + 1, total: list.length, ms: performance.now() - t0 });
      }
      familyName += " Sign";
    }
    ctx.postMessage({ type: "progress", seq: m.seq, phase: "build", n: 0, total: 1, ms: performance.now() - t0 });
    const buf = E.buildTTF(r.store, { familyName, advance: r.advance, spaceAdvance: r.spaceAdvance, ...m.license });
    const syllables = Object.keys(r.store.overrides).length;
    const edited = Object.keys(m.overrides).filter((ch) => m.overrides[ch]?.contours?.length).length;
    ctx.postMessage({ type: "done", seq: m.seq, buf, ms: performance.now() - t0, syllables, edited }, [buf]);
  } catch (e) {
    ctx.postMessage({ type: "error", seq: m.seq, message: e instanceof Error ? e.message : String(e) });
  }
}

ctx.onmessage = (e) => {
  const m = e.data;
  if (m.type === "bake") latestBake = m.seq;
  queue = queue.then(() => handle(m));
};
