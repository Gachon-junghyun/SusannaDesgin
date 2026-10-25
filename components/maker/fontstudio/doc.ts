/**
 * 글꼴 공방의 «작업 문서» — 이 브라우저에 남기는 사본 · 백업 JSON · 저장할 글자 고르기 (F26-m 3단계, 2026-10-25).
 *
 * 문서 모양은 시제품 `CONTRACT.md` §7(v2)과 같습니다: `meta`(이름·바탕·문장·스타일) · `frames` · `cells`(자모 칸) · `overrides`(고친 음절).
 * 고친 음절의 윤곽은 **음절 좌표**(0~1000, y 아래로), 점 하나 = `[x, y, ix, iy, ox, oy, s]`(손잡이는 점 기준 상대값, s=1 부드러운 점).
 *
 * 🔴 **로컬이 먼저입니다.** 고칠 때마다 이 브라우저 localStorage 에 통째로 적고, «저장»은 그중 바뀐 글자(`dirty`)만 DB(0020)로 올립니다.
 * 그래서 0020 이 없거나 DB 가 죽어도 고친 것을 잃지 않고, 표가 생긴 뒤 첫 «저장» 때 그동안 고친 것이 전부 올라갑니다.
 */
import type { FontLabStyle } from "@/config/fontLab";

export type Node7 = [number, number, number, number, number, number, number];
export type V2Contour = { n: Node7[] };
export type Override = { ch: string; contours: V2Contour[] };
export type DocMeta = { name: string; base: string | null; sample: string; style: FontLabStyle };
export type PartKind = "over" | "cell";

export type FontDoc = {
  /** DB 의 글꼴 작업 번호. null = 아직 한 번도 저장 안 함(또는 저장소 없음) */
  rowId: string | null;
  meta: DocMeta;
  /** 틀. null = 기본 틀 */
  frames: unknown | null;
  /** 자모 칸 — 2·3단계 화면은 안 고치고, 백업에서 들어온 것을 그대로 지니고 다닙니다 */
  cells: Record<string, unknown>;
  overrides: Record<string, Override>;
  /** 저장 안 된 글자 `over:한` · `cell:cho/1/ㄱ` */
  dirty: string[];
  /** 저장 안 된 «처음 모양으로»(지울 글자) */
  deleted: string[];
  metaDirty: boolean;
};

export const partId = (kind: PartKind, key: string) => `${kind}:${key}`;
export const splitPart = (id: string): { kind: PartKind; key: string } => {
  const i = id.indexOf(":");
  return { kind: id.slice(0, i) as PartKind, key: id.slice(i + 1) };
};

export function emptyDoc(meta: DocMeta): FontDoc {
  return { rowId: null, meta, frames: null, cells: {}, overrides: {}, dirty: [], deleted: [], metaDirty: true };
}

export function readDoc(key: string): FontDoc | null {
  try {
    const d = JSON.parse(localStorage.getItem(key) || "null");
    if (!d || typeof d !== "object" || !d.meta || typeof d.overrides !== "object") return null;
    return { rowId: null, frames: null, cells: {}, dirty: [], deleted: [], metaDirty: false, ...d };
  } catch {
    return null;
  }
}
/** 실패하면 false — 저장 공간이 찬 브라우저 */
export function writeDoc(key: string, doc: FontDoc): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(doc));
    return true;
  } catch {
    return false;
  }
}

/** 시제품 packContours — 좌표를 소수 k 자리로(부드러운 점 표시는 그대로) */
export function packContours(cs: { n: number[][] }[], k = 2): V2Contour[] {
  const m = Math.pow(10, k);
  return cs.map((c) => ({ n: c.n.map((p) => p.map((v, i) => (i === 6 ? (v ? 1 : 0) : Math.round(v * m) / m)) as Node7) }));
}

/** 고친 글자 하나를 문서에 — `contours` 가 null 이면 «처음 모양으로»(지움) */
export function setOverride(doc: FontDoc, ch: string, contours: V2Contour[] | null): FontDoc {
  const id = partId("over", ch);
  const overrides = { ...doc.overrides };
  let deleted = doc.deleted.filter((x) => x !== id);
  let dirty = doc.dirty.filter((x) => x !== id);
  if (contours && contours.length) {
    overrides[ch] = { ch, contours };
    dirty = [...dirty, id];
  } else {
    delete overrides[ch];
    if (doc.rowId) deleted = [...deleted, id];
  }
  return { ...doc, overrides, dirty, deleted };
}

/* ---------- 백업 JSON (CONTRACT §7 — 시제품에서 만든 것도 그대로 읽힘) ---------- */
export type Backup = { format: "hw-font"; version: 2; exported: string; meta: DocMeta; frames: unknown; cells: Record<string, unknown>; overrides: Record<string, Override> };

export function toBackup(doc: FontDoc, defaultFrames: unknown): Backup {
  return { format: "hw-font", version: 2, exported: new Date().toISOString(), meta: doc.meta, frames: doc.frames ?? defaultFrames, cells: doc.cells, overrides: doc.overrides };
}

/** 백업 → 문서 내용. 저장소의 같은 작업(rowId)에 덮어쓰도록 전부 «바뀐 글자»로 둡니다 */
export function fromBackup(raw: unknown, prev: FontDoc, styleDefault: FontLabStyle): FontDoc {
  const d = raw as Partial<Backup> | null;
  if (!d || d.format !== "hw-font" || typeof d.cells !== "object") throw new Error("이 공방의 백업 파일이 아닙니다(format: hw-font).");
  const overrides: Record<string, Override> = {};
  for (const [ch, o] of Object.entries(d.overrides ?? {})) {
    if (!o || !Array.isArray((o as Override).contours) || !(o as Override).contours.length) continue;
    overrides[ch] = { ch, contours: packContours((o as Override).contours, 2) };
  }
  const m = (d.meta ?? {}) as Partial<DocMeta>;
  const meta: DocMeta = {
    name: typeof m.name === "string" && m.name.trim() ? m.name.trim().slice(0, 60) : prev.meta.name,
    base: typeof m.base === "string" ? m.base : null,
    sample: typeof m.sample === "string" ? m.sample.slice(0, 200) : prev.meta.sample,
    style: { ...styleDefault, ...(m.style ?? {}) },
  };
  const cells = (d.cells ?? {}) as Record<string, unknown>;
  // 지금 저장소에 있던 글자 중 백업에 없는 것은 지웁니다(백업 = 그 시점 전부)
  const had = [...Object.keys(prev.overrides).map((k) => partId("over", k)), ...Object.keys(prev.cells).map((k) => partId("cell", k))];
  const now = [...Object.keys(overrides).map((k) => partId("over", k)), ...Object.keys(cells).map((k) => partId("cell", k))];
  const deleted = prev.rowId ? Array.from(new Set([...prev.deleted, ...had.filter((x) => !now.includes(x))])) : [];
  return { rowId: prev.rowId, meta, frames: d.frames ?? null, cells, overrides, dirty: now, deleted, metaDirty: true };
}

/**
 * 저장할 묶음 나누기 — 서버 액션 본문 상한 1MB 안으로(`maxBytes`). 한 자가 `partMax` 를 넘으면 그 글자 이름을 돌려줍니다.
 */
export function batches(doc: FontDoc, maxBytes: number, partMax: number): { upserts: { kind: PartKind; key: string; data: unknown }[]; deletes: { kind: PartKind; key: string }[] }[] | { tooBig: string; kb: number } {
  const enc = new TextEncoder();
  const out: ReturnType<typeof batches> = [];
  let cur = { upserts: [] as { kind: PartKind; key: string; data: unknown }[], deletes: doc.deleted.map(splitPart) }, size = 2000;
  for (const id of doc.dirty) {
    const { kind, key } = splitPart(id);
    const data = kind === "over" ? doc.overrides[key] : doc.cells[key];
    if (!data) continue;
    const bytes = enc.encode(JSON.stringify(data)).length + 80;
    if (bytes > partMax) return { tooBig: key, kb: Math.round(bytes / 1024) };
    if (size + bytes > maxBytes && cur.upserts.length) {
      out.push(cur);
      cur = { upserts: [], deletes: [] };
      size = 2000;
    }
    cur.upserts.push({ kind, key, data });
    size += bytes;
  }
  out.push(cur);
  return out;
}
