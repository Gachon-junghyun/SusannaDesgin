"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";

import { deleteMakerFont, listMakerFonts, loadMakerFont, saveMakerFont, type FontListItem } from "@/app/admin/maker/font/actions";
import {
  ALL_SYLLABLES,
  FONT_LAB_CACHE,
  FONT_LAB_DEFAULT_NAME,
  FONT_LAB_DOC_KEY,
  FONT_LAB_SAMPLE,
  FONT_LAB_STATE_KEY,
  FONT_LAB_STYLE_DEFAULT,
  FONT_PART_MAX_BYTES,
  FONT_SAVE_BATCH_BYTES,
  fontLabCategories,
  fontLabCopy as T,
  fontLabFonts,
  fontLabSignScopes,
  fontLabStyleRanges,
  type FontLabCategory,
  type FontLabFont,
  type FontLabSignScope,
  type FontLabStyle,
} from "@/config/fontLab";
import type { Contour } from "@/lib/maker/hfont/geom";
import type { FontStoreStatus } from "@/lib/maker/hfont-store";

import { batches, emptyDoc, fromBackup, packContours, readDoc, setOverride, toBackup, writeDoc, type DocMeta, type FontDoc, type Override } from "./fontstudio/doc";
import type { FromWorker, Overrides, ToWorker } from "./fontstudio/font.worker";

/**
 * 글꼴 공방 — 관리자 전용 (F26-m, `/admin/maker/font`). 2단계(2026-10-25): 고르기 · 미리보기 · 스타일 · TTF.
 * 3단계(같은 날): **글자 고치기**(점·손잡이·선택 변형·둥글게·다듬기·점 줄이기·그림 불러오기) · **저장**(0020 `maker_fonts`) · 백업 JSON.
 * 계획 원문: 형제 저장소 `SusannaDesigner/study/2026-10-24_hangul-font/이식계획.md` §5·§6.
 *
 * 🔴 **무거운 것은 전부 일꾼(`fontstudio/font.worker.ts`)에 있고, 일꾼은 글꼴을 처음 고를 때 만듭니다.** 글자 고치기 판
 * (`fontstudio/GlyphEditorPanel.tsx` — 기하·클리퍼·벡터화기)은 처음 «고치기»를 누를 때 내려옵니다. 첫 화면은 목록과 미리보기 그림뿐입니다.
 * 미리보기는 시제품 `bakeFont` 처럼 **입력한 문장의 글자만** 지금 스타일로 구워 `FontFace` 로 붙입니다(고친 글자 포함).
 *
 * 🔴 **로컬 먼저** — 작업 문서(이름·바탕·문장·스타일·고친 글자)는 고칠 때마다 이 브라우저 `localStorage`(`FONT_LAB_DOC_KEY`)에 통째로 적고,
 * «저장»은 바뀐 글자만 DB 로 올립니다(`fontstudio/doc.ts`). 0020 이 없으면(`store.state !== "ready"`) 저장 단추 대신 사정을 말하고
 * 고친 것은 이 브라우저에 남깁니다 — 표가 생긴 뒤 첫 «저장» 때 그동안 고친 글자가 전부 올라갑니다.
 */

type Prefs = { cat: FontLabCategory | "all"; fullOnly: boolean; scope: FontLabSignScope };
type Legacy = { id?: string | null; style?: FontLabStyle; text?: string; name?: string };
type Load = { id: string; state: "loading" | "ready" | "error"; n?: number; total?: number; cached?: boolean; bytes?: number; ms?: number; message?: string };
type Job = { kind: "ttf" | "sign"; phase: string; n: number; total: number; sec: number } | null;
type Editing = { ch: string; start: Contour[]; ghost: Contour[]; edited: boolean } | null;

const CAT_LABEL = Object.fromEntries(fontLabCategories.map((c) => [c.key, c.label])) as Record<string, string>;
const PHASE: Record<string, string> = { download: "글꼴 받는 중", resolve: "글자 준비", merge: "겹친 획을 합치는 중", build: "TTF 파일 쓰는 중" };
const isHangul = (c: string) => c >= "가" && c <= "힣";
const known = (id: string | null) => (id && fontLabFonts.some((f) => f.id === id) ? id : null);

/** 처음 열 때 — 화면 설정과 작업 문서. 2단계 사본(고른 글꼴·스타일·문장·이름)이 있으면 문서로 옮깁니다 */
function readStart(): { prefs: Prefs; doc: FontDoc } {
  let raw: Partial<Prefs> & Legacy = {};
  try {
    raw = JSON.parse(localStorage.getItem(FONT_LAB_STATE_KEY) || "null") || {};
  } catch {
    /* 깨진 값은 버립니다 */
  }
  const prefs: Prefs = { cat: raw.cat ?? "all", fullOnly: !!raw.fullOnly, scope: raw.scope ?? "all" };
  const doc =
    readDoc(FONT_LAB_DOC_KEY) ??
    emptyDoc({
      name: raw.name || FONT_LAB_DEFAULT_NAME,
      base: known(raw.id ?? null),
      sample: raw.text ?? FONT_LAB_SAMPLE,
      style: { ...FONT_LAB_STYLE_DEFAULT, ...(raw.style || {}) },
    });
  doc.meta.base = known(doc.meta.base);
  return { prefs, doc };
}

/** 시제품 nameBlocked — 예약 이름(OFL 3조)과 바탕 글꼴 이름 그대로를 막습니다 */
function nameBlocked(name: string, f: FontLabFont | undefined): string | null {
  if (!f) return null;
  const low = name.toLowerCase();
  const hit = f.rfn.find((r) => low.includes(r.toLowerCase()));
  if (hit) return T.rfnBlocked(hit);
  if (low === f.name.toLowerCase()) return T.sameName;
  return null;
}

function saveFile(name: string, data: BlobPart, type = "font/ttf") {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([data], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

const mb = (n: number) => `${(n / 1048576).toFixed(1)}MB`;
const unsavedCount = (d: FontDoc) => d.dirty.length + d.deleted.length + (d.metaDirty && d.rowId ? 1 : 0);

/** 글자 고치기 판 — 처음 «고치기»를 누를 때만 내려옵니다(기하·클리퍼·벡터화기) */
const GlyphEditorPanel = dynamic(() => import("./fontstudio/GlyphEditorPanel"), {
  ssr: false,
  loading: () => <p className="border-b border-line bg-white px-5 py-6 text-[13px] text-ink-500">글자 고치기 판을 여는 중…</p>,
});

export default function FontStudio({ store: store0 }: { store: FontStoreStatus }) {
  const [start] = useState(readStart);
  const [cat, setCat] = useState(start.prefs.cat);
  const [q, setQ] = useState("");
  const [fullOnly, setFullOnly] = useState(start.prefs.fullOnly);
  const [scope, setScope] = useState<FontLabSignScope>(start.prefs.scope);
  const [doc, setDoc] = useState<FontDoc>(start.doc);
  const docRef = useRef<FontDoc>(start.doc);
  const [localFull, setLocalFull] = useState(false);
  const id = doc.meta.base, style = doc.meta.style, text = doc.meta.sample, name = doc.meta.name;
  // 저장해 둔 선택이 있으면 처음에 한 번 다시 엽니다(아래 effect) — 그동안은 «받는 중»
  const [load, setLoad] = useState<Load | null>(start.doc.meta.base ? { id: start.doc.meta.base, state: "loading" } : null);
  const [family, setFamily] = useState<string | null>(null);
  const [bakeNote, setBakeNote] = useState("");
  const [job, setJob] = useState<Job>(null);
  const [msg, setMsg] = useState<{ text: string; bad?: boolean } | null>(null);
  const [editing, setEditing] = useState<Editing>(null);
  const [pick, setPick] = useState("");
  const [store, setStore] = useState<FontStoreStatus>(store0);
  const [saved, setSaved] = useState<FontListItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [armed, setArmed] = useState(false);
  const [storeMsg, setStoreMsg] = useState<{ text: string; bad?: boolean } | null>(null);

  const worker = useRef<Worker | null>(null);
  const bakeSeq = useRef(0);
  const jobSeq = useRef(100000);
  const glyphSeq = useRef(0);
  const face = useRef<FontFace | null>(null);
  /** 일꾼 처리기는 한 번 만들어지므로, 내보내기 중인 일의 이름·시작 시각은 ref 로 봅니다 */
  const running = useRef<{ kind: "ttf" | "sign"; file: string } | null>(null);
  const font = fontLabFonts.find((f) => f.id === id);

  const list = useMemo(() => {
    const k = q.trim().toLowerCase();
    return fontLabFonts.filter((f) => (cat === "all" || f.category === cat) && (!fullOnly || f.syllables >= ALL_SYLLABLES) && (!k || f.name.toLowerCase().includes(k)));
  }, [cat, q, fullOnly]);

  /** 문서 고치기 — 화면 상태와 이 브라우저 사본을 같이 씁니다(저장소가 없어도 잃지 않게) */
  function updateDoc(fn: (d: FontDoc) => FontDoc) {
    const next = fn(docRef.current);
    docRef.current = next;
    setDoc(next);
    setLocalFull(!writeDoc(FONT_LAB_DOC_KEY, next));
  }
  const setMeta = (patch: Partial<DocMeta>) => updateDoc((d) => ({ ...d, meta: { ...d.meta, ...patch }, metaDirty: true }));
  const setStyle = (fn: (s: FontLabStyle) => FontLabStyle) => setMeta({ style: fn(docRef.current.meta.style) });

  useEffect(() => {
    try {
      localStorage.setItem(FONT_LAB_STATE_KEY, JSON.stringify({ cat, fullOnly, scope } satisfies Prefs));
    } catch {
      /* 저장 공간이 막힌 브라우저 */
    }
  }, [cat, fullOnly, scope]);

  /** 일꾼은 처음 글꼴을 고를 때 만듭니다 — 엔진·클리퍼·opentype.js 는 그때 내려옵니다 */
  function getWorker(): Worker {
    if (worker.current) return worker.current;
    const w = new Worker(new URL("./fontstudio/font.worker.ts", import.meta.url), { type: "module" });
    w.onmessage = (e: MessageEvent<FromWorker>) => {
      const m = e.data;
      if (m.type === "loaded") {
        setLoad({ id: m.id, state: "ready", cached: m.cached, bytes: m.bytes, ms: m.ms });
        setBakeNote(""); // 다시 굽기는 아래 effect 가 load 상태를 보고 합니다
      } else if (m.type === "progress") {
        if (m.phase === "download") setLoad((l) => (l && l.state === "loading" ? { ...l, n: m.n, total: m.total } : l));
        else setJob((j) => (j ? { ...j, phase: m.phase, n: m.n, total: m.total, sec: (m.ms ?? 0) / 1000 } : j));
      } else if (m.type === "glyph") {
        if (m.seq !== glyphSeq.current) return;
        const o = docRef.current.overrides[m.ch];
        setEditing({ ch: m.ch, ghost: m.contours, start: o ? (o.contours as Contour[]) : m.contours, edited: !!o });
      } else if (m.type === "baked") {
        if (m.seq !== bakeSeq.current) return;
        const fam = `FL${m.seq}`;
        const ff = new FontFace(fam, m.buf);
        ff.load().then(
          () => {
            if (m.seq !== bakeSeq.current) return;
            document.fonts.add(ff);
            if (face.current) document.fonts.delete(face.current);
            face.current = ff;
            setFamily(fam);
            setBakeNote(`${Math.round(m.buf.byteLength / 1024).toLocaleString()}KB · ${(m.ms / 1000).toFixed(2)}초`);
          },
          (err: Error) => setBakeNote(`미리보기 글꼴을 붙이지 못했습니다: ${err.message}`),
        );
      } else if (m.type === "done") {
        const r = running.current;
        running.current = null;
        setJob(null);
        if (r) {
          saveFile(r.file, m.buf);
          setMsg({ text: `${r.file} 를 받았습니다. 한글 ${m.syllables.toLocaleString()}자(고친 글자 ${m.edited.toLocaleString()}자 포함) · ${mb(m.buf.byteLength)} · ${(m.ms / 1000).toFixed(1)}초` });
        }
      } else if (m.type === "error") {
        if (m.id) setLoad({ id: m.id, state: "error", message: m.message });
        else if (m.seq >= 100000) {
          running.current = null;
          setJob(null);
          setMsg({ text: `TTF 를 만들지 못했습니다: ${m.message}`, bad: true });
        } else setBakeNote(`미리보기를 굽지 못했습니다: ${m.message}`);
      }
    };
    w.onerror = (e) => setMsg({ text: `글꼴 일꾼을 열지 못했습니다: ${e.message || "새로 고침해 주십시오"}`, bad: true });
    worker.current = w;
    return w;
  }
  const post = (m: ToWorker) => getWorker().postMessage(m);

  /** 바탕 글꼴 받기 — 일꾼에게 시킵니다 */
  function loadBase(f: FontLabFont) {
    setLoad({ id: f.id, state: "loading" });
    setFamily(null);
    setBakeNote("");
    setEditing(null);
    post({ type: "load", id: f.id, url: f.url, cacheName: FONT_LAB_CACHE });
  }
  function choose(f: FontLabFont) {
    if (f.id === id && load?.state !== "error") return;
    setMeta({ base: f.id });
    loadBase(f);
  }
  useEffect(() => {
    const f = fontLabFonts.find((x) => x.id === start.doc.meta.base);
    if (f) getWorker().postMessage({ type: "load", id: f.id, url: f.url, cacheName: FONT_LAB_CACHE } satisfies ToWorker);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 처음 한 번만
  }, []);

  // 문장·스타일·고친 글자가 바뀌면 다시 굽습니다(0.3초 모아서). 고친 글자는 문장에 든 것만 보냅니다
  const requestBake = useRef<(() => void) | null>(null);
  useEffect(() => {
    requestBake.current = () => {
      const seq = ++bakeSeq.current, ov: Overrides = {};
      for (const c of new Set(Array.from(text))) if (doc.overrides[c]) ov[c] = { contours: doc.overrides[c].contours as Contour[] };
      post({ type: "bake", seq, text, style, overrides: ov });
    };
  });
  useEffect(() => {
    if (load?.state !== "ready") return;
    const t = setTimeout(() => requestBake.current?.(), 300);
    return () => clearTimeout(t);
  }, [text, style, doc.overrides, load?.state, load?.id]);

  useEffect(
    () => () => {
      // 닫으면서 일꾼을 끝내고 자리도 비웁니다 — 비우지 않으면 다시 붙을 때(개발 모드의 두 번 붙이기 등) 죽은 일꾼에게 시킵니다
      worker.current?.terminate();
      worker.current = null;
      if (face.current) document.fonts.delete(face.current);
      face.current = null;
    },
    [],
  );

  /* ---------- 글자 고치기 ---------- */
  function openEdit(ch: string) {
    if (!isHangul(ch)) return setMsg({ text: "한글 음절 한 글자를 고르십시오.", bad: true });
    if (load?.state !== "ready") return setMsg({ text: "바탕 글꼴을 먼저 고르십시오.", bad: true });
    setPick(ch);
    post({ type: "glyph", seq: ++glyphSeq.current, ch });
  }
  function commitGlyph(ch: string, work: Contour[] | null) {
    updateDoc((d) => setOverride(d, ch, work ? packContours(work, 2) : null));
  }

  /* ---------- 저장 (0020) ---------- */
  const refreshList = () =>
    listMakerFonts().then((r) => {
      if (r.ok) setSaved(r.items);
      else setStore(r);
    });
  useEffect(() => {
    if (store0.state === "ready") void refreshList();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 처음 한 번만
  }, []);
  const unsaved = unsavedCount(doc);
  const confirmDiscard = () => !unsavedCount(docRef.current) || window.confirm(T.confirmDiscard);

  async function save() {
    const d = docRef.current;
    if (store.state !== "ready" || busy) return;
    if (!d.meta.name.trim()) return setStoreMsg({ text: "폰트 이름을 넣어 주십시오.", bad: true });
    const parts = batches(d, FONT_SAVE_BATCH_BYTES, FONT_PART_MAX_BYTES);
    if ("tooBig" in parts) return setStoreMsg({ text: T.tooBig(parts.tooBig, parts.kb), bad: true });
    setBusy(true);
    setStoreMsg({ text: T.saving });
    let rowId = d.rowId;
    const sent = new Set(d.dirty), gone = new Set(d.deleted);
    for (let i = 0; i < parts.length; i++) {
      const r = await saveMakerFont({ id: rowId, meta: { ...d.meta, frames: d.frames }, upserts: parts[i].upserts, deletes: parts[i].deletes });
      if (!r.ok) {
        setBusy(false);
        if (r.state === "missing") setStore(r);
        // 앞 묶음이 들어갔으면 그 번호는 남깁니다 — 다음 저장이 같은 작업에 이어 씁니다
        if (rowId && rowId !== d.rowId) updateDoc((x) => ({ ...x, rowId }));
        return setStoreMsg({ text: r.message, bad: true });
      }
      rowId = r.id;
      if (parts.length > 1) setStoreMsg({ text: `${T.saving} ${i + 1} / ${parts.length}` });
    }
    updateDoc((x) => ({ ...x, rowId, dirty: x.dirty.filter((k) => !sent.has(k)), deleted: x.deleted.filter((k) => !gone.has(k)), metaDirty: false }));
    setBusy(false);
    setStoreMsg({ text: `${T.allSaved} (글자 ${sent.size.toLocaleString()}자 올림)` });
    void refreshList();
  }
  async function openSaved(rowId: string) {
    if (!rowId || rowId === doc.rowId || !confirmDiscard()) return;
    setBusy(true);
    const r = await loadMakerFont(rowId);
    setBusy(false);
    if (!r.ok) return setStoreMsg({ text: r.message, bad: true });
    const overrides: Record<string, Override> = {}, cells: Record<string, unknown> = {};
    for (const p of r.parts) {
      if (p.kind === "over") overrides[p.key] = p.data as Override;
      else cells[p.key] = p.data;
    }
    const meta: DocMeta = { name: r.font.name, base: known(r.font.base), sample: r.font.sample, style: { ...FONT_LAB_STYLE_DEFAULT, ...r.font.style } };
    updateDoc(() => ({ rowId: r.font.id, meta, frames: r.font.frames ?? null, cells, overrides, dirty: [], deleted: [], metaDirty: false }));
    setEditing(null);
    setStoreMsg({ text: `«${r.font.name}»을(를) 열었습니다. 고친 글자 ${Object.keys(overrides).length.toLocaleString()}자.` });
    const f = fontLabFonts.find((x) => x.id === meta.base);
    if (f && (f.id !== load?.id || load?.state === "error")) loadBase(f);
  }
  function newDoc() {
    if (!confirmDiscard()) return;
    updateDoc((d) => emptyDoc({ ...d.meta, name: FONT_LAB_DEFAULT_NAME }));
    setEditing(null);
    setStoreMsg(null);
  }
  async function removeSaved() {
    const rowId = docRef.current.rowId;
    if (!rowId) return;
    if (!armed) {
      setArmed(true);
      setTimeout(() => setArmed(false), 3000);
      return;
    }
    setArmed(false);
    setBusy(true);
    const r = await deleteMakerFont(rowId);
    setBusy(false);
    if (!r.ok) return setStoreMsg({ text: r.message, bad: true });
    updateDoc((d) => emptyDoc({ ...d.meta, name: FONT_LAB_DEFAULT_NAME }));
    setEditing(null);
    setStoreMsg({ text: "지웠습니다." });
    void refreshList();
  }

  /* ---------- 백업 JSON (CONTRACT §7) ---------- */
  async function backupOut() {
    const { DEFAULT_FRAMES } = await import("@/lib/maker/hfont/frames");
    saveFile(`${name.trim() || "글꼴"}_백업.json`, JSON.stringify(toBackup(docRef.current, DEFAULT_FRAMES)), "application/json");
  }
  async function backupIn(file: File) {
    try {
      const next = fromBackup(JSON.parse(await file.text()), docRef.current, FONT_LAB_STYLE_DEFAULT);
      const b = next.meta.base;
      const missing = b && !known(b);
      if (missing) next.meta.base = null;
      updateDoc(() => next);
      setEditing(null);
      setStoreMsg({ text: missing ? T.baseMissing(b!) : `백업을 불러왔습니다. 고친 글자 ${Object.keys(next.overrides).length.toLocaleString()}자${next.rowId ? " — «저장»하면 이 작업에 덮어씁니다." : "."}`, bad: !!missing });
      const f = fontLabFonts.find((x) => x.id === next.meta.base);
      if (f && (f.id !== load?.id || load?.state === "error")) loadBase(f);
    } catch (e) {
      setStoreMsg({ text: `불러오지 못했습니다: ${e instanceof Error ? e.message : String(e)}`, bad: true });
    }
  }

  const blocked = nameBlocked(name.trim(), font);
  const ready = load?.state === "ready" && load.id === id;
  function exportTtf(kind: "ttf" | "sign") {
    if (!font || !ready || job) return;
    if (!name.trim()) return setMsg({ text: "폰트 이름을 넣어 주십시오.", bad: true });
    if (blocked) return setMsg({ text: blocked, bad: true });
    setMsg(null);
    const seq = ++jobSeq.current;
    running.current = { kind, file: kind === "sign" ? `${name.trim()}_간판용.ttf` : `${name.trim()}.ttf` };
    setJob({ kind, phase: "resolve", n: 0, total: ALL_SYLLABLES, sec: 0 });
    const ov: Overrides = {};
    for (const [c, o] of Object.entries(docRef.current.overrides)) ov[c] = { contours: o.contours as Contour[] };
    post({
      type: "export",
      seq,
      sign: kind === "sign" ? scope : null,
      text,
      style,
      familyName: name.trim(),
      license: { copyright: `${font.copyright} ${T.modifiedWith(font.name)}`.trim(), license: T.oflLicense, licenseUrl: T.oflUrl },
      overrides: ov,
    });
  }
  const editedChars = Object.keys(doc.overrides).sort();

  const pct = (n?: number, total?: number) => (total ? Math.min(100, Math.round(((n ?? 0) / total) * 100)) : 0);

  return (
    <div className="grid min-h-full lg:h-full lg:grid-cols-[minmax(330px,420px)_1fr] lg:overflow-hidden">
      {/* ---------------------------------------------------------------- 바탕 글꼴 고르기 */}
      <section className="flex min-h-0 flex-col border-b border-line bg-white lg:border-b-0 lg:border-r" aria-labelledby="fl-pick">
        <div className="space-y-3 border-b border-line px-4 py-3">
          <div className="flex items-baseline justify-between">
            <h2 id="fl-pick" className="text-[12px] font-black tracking-[0.08em] text-ink-500">
              {T.pickTitle}
            </h2>
            <span className="text-[12px] tabular-nums text-ink-500">
              {list.length.toLocaleString()} / {fontLabFonts.length.toLocaleString()}
              {T.countUnit}
            </span>
          </div>
          <div className="flex flex-wrap gap-1" role="group" aria-label="갈래">
            {fontLabCategories.map((c) => (
              <button
                key={c.key}
                type="button"
                aria-pressed={cat === c.key}
                onClick={() => setCat(c.key)}
                className={`border px-3 py-1.5 text-[13px] font-bold ${cat === c.key ? "border-brand-700 bg-brand-100 text-brand-700" : "border-line hover:bg-paper"}`}
              >
                {c.label}
              </button>
            ))}
          </div>
          <label className="block">
            <span className="sr-only">{T.searchLabel}</span>
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={T.searchLabel}
              className="w-full border-b border-line px-1 py-1.5 text-[14px] outline-none focus:border-brand-700"
            />
          </label>
          <label className="flex items-center gap-2 text-[13px]">
            <input type="checkbox" checked={fullOnly} onChange={(e) => setFullOnly(e.target.checked)} className="accent-brand" />
            {T.fullOnly}
          </label>
        </div>
        <ul className="max-h-[52vh] min-h-0 flex-1 overflow-y-auto lg:max-h-none" aria-label="글꼴 목록">
          {list.map((f) => {
            const on = f.id === id;
            return (
              <li key={f.id} className="border-b border-line">
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => choose(f)}
                  className={`block w-full px-4 py-2.5 text-left ${on ? "bg-brand-100 text-brand-700" : "hover:bg-paper"}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- 회색조 작은 견본(743×74). next/image 최적화가 필요 없는 정적 그림 */}
                  <img src={f.preview} alt={`${f.name} 미리보기`} loading="lazy" width={743} height={74} className="h-9 w-full bg-white object-contain object-left mix-blend-multiply" />
                  <span className="mt-1 block text-[14px] font-bold">{f.name}</span>
                  <span className="block text-[11px] leading-snug text-ink-500">
                    {CAT_LABEL[f.category]} · {f.syllables >= ALL_SYLLABLES ? "11,172자 전부" : `${f.syllables.toLocaleString()}자`} · OFL
                    {f.rfn.length > 0 && ` · 예약 이름 «${f.rfn.join(", ")}»`}
                  </span>
                </button>
              </li>
            );
          })}
          {list.length === 0 && <li className="px-4 py-8 text-center text-[13px] text-ink-500">찾는 글꼴이 없습니다.</li>}
        </ul>
      </section>

      {/* ---------------------------------------------------------------- 미리보기 · 스타일 · 내보내기 */}
      <div className="min-h-0 space-y-0 lg:overflow-y-auto">
        <section className="border-b border-line bg-white px-5 py-4" aria-labelledby="fl-preview">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h1 className="text-[18px] font-black">{T.title}</h1>
            <p className="text-[12px] text-ink-500">{T.lead}</p>
          </div>
          <div className="mt-4 flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="fl-preview" className="text-[12px] font-black tracking-[0.08em] text-ink-500">
              {T.previewTitle}
            </h2>
            <span className="text-[12px] tabular-nums text-ink-500" role="status">
              {!font
                ? ""
                : load?.state === "loading"
                  ? `${font.name} 받는 중${load.total ? ` ${mb(load.n ?? 0)} / ${mb(load.total)}` : load.n ? ` ${mb(load.n)}` : ""}`
                  : load?.state === "error"
                    ? `${font.name}을(를) 받지 못했습니다: ${load.message}`
                    : load?.state === "ready"
                      ? `${font.name} · 원본 ${mb(load.bytes ?? 0)}${load.cached ? " · 이 브라우저 보관본" : ` · ${((load.ms ?? 0) / 1000).toFixed(1)}초`}${bakeNote ? ` · 미리보기 ${bakeNote}` : ""}`
                      : ""}
            </span>
          </div>
          {load?.state === "loading" && (
            <div className="mt-2 h-1 bg-line" aria-hidden="true">
              <div className="h-full bg-brand-700 transition-[width]" style={{ width: `${pct(load.n, load.total)}%` }} />
            </div>
          )}
          <label className="mt-2 block">
            <span className="block text-[12px] font-bold text-ink-500">{T.previewLabel}</span>
            <textarea
              value={text}
              rows={2}
              maxLength={200}
              onChange={(e) => setMeta({ sample: e.target.value })}
              className="mt-1 w-full resize-y border border-line px-2 py-1.5 text-[15px] outline-none focus:border-brand-700"
            />
          </label>
          <div className="mt-3 min-h-[140px] overflow-hidden border border-line bg-[#fbfbfa] px-4 py-5">
            {font && family ? (
              <p className="whitespace-pre-wrap break-keep text-[clamp(34px,6vw,72px)] leading-[1.25] text-ink" style={{ fontFamily: `"${family}", sans-serif` }}>
                {/* 글자를 누르면 그 글자를 고칩니다(3단계). 고친 글자는 밑줄 */}
                {Array.from(text).map((c, i) =>
                  isHangul(c) ? (
                    <span
                      key={i}
                      role="button"
                      tabIndex={0}
                      title={`«${c}» 고치기`}
                      onClick={() => openEdit(c)}
                      onKeyDown={(e) => e.key === "Enter" && openEdit(c)}
                      className={`cursor-pointer hover:bg-brand-100 ${doc.overrides[c] ? "underline decoration-brand decoration-2 underline-offset-8" : ""} ${editing?.ch === c ? "bg-brand-100" : ""}`}
                    >
                      {c}
                    </span>
                  ) : (
                    <span key={i}>{c}</span>
                  ),
                )}
              </p>
            ) : (
              <p className="py-8 text-center text-[14px] text-ink-500">{font ? "미리보기 글꼴을 굽는 중입니다." : T.previewEmpty}</p>
            )}
          </div>
          {font && font.syllables < ALL_SYLLABLES && <p className="mt-2 text-[12px] font-bold text-accent-600">{T.partialNote(font.syllables)}</p>}
          {font && <p className="mt-2 text-[11px] leading-relaxed text-ink-500">{T.credit(font.name, font.copyright)}</p>}

          {/* 글자 고치기 — 고를 글자 */}
          <div className="mt-4 border-t border-line pt-3">
            <form
              className="flex flex-wrap items-end gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                openEdit(pick.trim().charAt(0));
              }}
            >
              <label className="block">
                <span className="block text-[12px] font-bold text-ink-500">{T.editPickLabel}</span>
                <input value={pick} maxLength={1} onChange={(e) => setPick(e.target.value)} className="mt-1 w-16 border-b border-line px-1 py-1 text-center text-[18px] font-bold outline-none focus:border-brand-700" />
              </label>
              <button type="submit" disabled={!ready} className="border border-brand-700 px-3 py-1.5 text-[12px] font-bold text-brand-700 hover:bg-brand-50 disabled:opacity-40">
                {T.editOpen}
              </button>
              <span className="text-[11px] text-ink-500">{T.editPickHint}</span>
            </form>
            <div className="mt-2 flex flex-wrap items-center gap-1" aria-label={T.editedList}>
              <span className="mr-1 text-[12px] font-bold text-ink-500">
                {T.editedList} {editedChars.length.toLocaleString()}
              </span>
              {editedChars.length === 0 && <span className="text-[12px] text-ink-500">{T.editedNone}</span>}
              {editedChars.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => openEdit(c)}
                  aria-pressed={editing?.ch === c}
                  className={`h-8 min-w-8 border px-1.5 text-[15px] font-bold ${editing?.ch === c ? "border-brand-700 bg-brand-100 text-brand-700" : "border-line hover:bg-paper"}`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </section>

        {editing && (
          <GlyphEditorPanel
            key={editing.ch}
            ch={editing.ch}
            start={editing.start}
            ghost={editing.ghost}
            edited={editing.edited}
            onCommit={(w) => commitGlyph(editing.ch, w)}
            onClose={() => setEditing(null)}
          />
        )}

        <section className="border-b border-line bg-white px-5 py-4" aria-labelledby="fl-style">
          <div className="flex items-baseline justify-between">
            <h2 id="fl-style" className="text-[12px] font-black tracking-[0.08em] text-ink-500">
              {T.styleTitle}
            </h2>
            <button type="button" onClick={() => setStyle(() => FONT_LAB_STYLE_DEFAULT)} className="border border-line px-2.5 py-1 text-[12px] font-bold hover:bg-paper">
              {T.styleReset}
            </button>
          </div>
          <div className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2">
            {(Object.keys(fontLabStyleRanges) as (keyof FontLabStyle)[]).map((k) => {
              const r = fontLabStyleRanges[k];
              return (
                <label key={k} className="block">
                  <span className="flex items-baseline justify-between text-[13px] font-bold">
                    {r.label}
                    <span className="tabular-nums text-brand-700">
                      {style[k]}
                      {r.unit}
                    </span>
                  </span>
                  <input
                    type="range"
                    min={r.min}
                    max={r.max}
                    step={r.step}
                    value={style[k]}
                    onChange={(e) => setStyle((s) => ({ ...s, [k]: Number(e.target.value) }))}
                    className="mt-1 w-full accent-brand"
                  />
                  {r.note && <span className="block text-[11px] text-ink-500">{r.note}</span>}
                </label>
              );
            })}
          </div>
        </section>

        <section className="bg-white px-5 py-4" aria-labelledby="fl-export">
          <h2 id="fl-export" className="text-[12px] font-black tracking-[0.08em] text-ink-500">
            {T.exportTitle}
          </h2>
          <label className="mt-2 block max-w-md">
            <span className="block text-[12px] font-bold text-ink-500">{T.nameLabel}</span>
            <input
              value={name}
              maxLength={40}
              onChange={(e) => setMeta({ name: e.target.value })}
              aria-invalid={!!blocked}
              className={`mt-1 w-full border-b px-1 py-1.5 text-[14px] font-bold outline-none ${blocked ? "border-accent-600" : "border-line focus:border-brand-700"}`}
            />
          </label>
          {blocked && <p className="mt-1 text-[12px] font-bold text-accent-600">{blocked}</p>}
          <div className="mt-3 flex flex-wrap items-end gap-2">
            <button
              type="button"
              disabled={!ready || !!job || !!blocked}
              onClick={() => exportTtf("ttf")}
              className="bg-brand-700 px-4 py-2.5 text-[13px] font-bold text-white hover:bg-brand-600 disabled:opacity-40"
            >
              {T.ttf}
            </button>
            <label className="block">
              <span className="block text-[11px] font-bold text-ink-500">{T.signScope}</span>
              <select value={scope} onChange={(e) => setScope(e.target.value as FontLabSignScope)} className="mt-0.5 border-b border-line bg-transparent py-1.5 text-[13px]">
                {fontLabSignScopes.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              disabled={!ready || !!job || !!blocked}
              onClick={() => exportTtf("sign")}
              className="border border-brand-700 px-4 py-2.5 text-[13px] font-bold text-brand-700 hover:bg-brand-50 disabled:opacity-40"
            >
              {T.signTtf}
            </button>
          </div>
          {job && (
            <div className="mt-3 max-w-md" role="status">
              <p className="text-[12px] tabular-nums">
                {PHASE[job.phase] ?? job.phase}
                {job.phase !== "build" && ` ${job.n.toLocaleString()} / ${job.total.toLocaleString()}`} · {job.sec.toFixed(0)}초
              </p>
              <div className="mt-1 h-1.5 bg-line" aria-hidden="true">
                <div className="h-full bg-brand-700 transition-[width]" style={{ width: `${job.phase === "build" ? 100 : pct(job.n, job.total)}%` }} />
              </div>
            </div>
          )}
          {msg && (
            <p className={`mt-3 text-[12px] font-bold ${msg.bad ? "text-accent-600" : "text-brand-700"}`} role="status">
              {msg.text}
            </p>
          )}
          <ul className="mt-4 space-y-1 border-t border-line pt-3 text-[11px] leading-relaxed text-ink-500">
            <li>{T.signNote}</li>
            <li>{T.cacheNote}</li>
          </ul>
        </section>

        {/* ---------------------------------------------------------------- 내 글꼴 작업 (0020) · 백업 */}
        <section className="border-t border-line bg-white px-5 py-4" aria-labelledby="fl-store">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="fl-store" className="text-[12px] font-black tracking-[0.08em] text-ink-500">
              {T.storeTitle}
            </h2>
            <span className={`text-[12px] font-bold ${unsaved ? "text-accent-600" : "text-ink-500"}`} role="status">
              {unsaved ? T.unsaved(unsaved) : doc.rowId ? T.allSaved : ""}
            </span>
          </div>
          <p className={`mt-1 text-[12px] leading-relaxed ${store.state === "ready" ? "text-ink-500" : "font-bold text-accent-600"}`}>
            {store.state === "ready" ? T.storeReady : store.message}
          </p>
          {localFull && <p className="mt-1 text-[12px] font-bold text-accent-600">{T.localFull}</p>}
          {store.state === "ready" && (
            <div className="mt-3 flex flex-wrap items-end gap-2">
              <label className="block">
                <span className="block text-[11px] font-bold text-ink-500">{T.openLabel}</span>
                <select value={doc.rowId ?? ""} disabled={busy} onChange={(e) => void openSaved(e.target.value)} className="mt-0.5 max-w-[240px] border-b border-line bg-transparent py-1.5 text-[13px]">
                  <option value="">{doc.rowId ? "—" : "(저장 안 한 새 작업)"}</option>
                  {saved.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} · 고친 글자 {f.parts.toLocaleString()} · {f.updated_at.slice(0, 10)}
                    </option>
                  ))}
                </select>
              </label>
              <button type="button" disabled={busy || (!unsaved && !!doc.rowId)} onClick={() => void save()} className="bg-brand-700 px-4 py-2 text-[13px] font-bold text-white hover:bg-brand-600 disabled:opacity-40">
                {busy ? T.saving : T.save}
              </button>
              <button type="button" disabled={busy} onClick={newDoc} className="border border-line px-3 py-2 text-[12px] font-bold hover:bg-paper disabled:opacity-40">
                {T.newFont}
              </button>
              {doc.rowId && (
                <button type="button" disabled={busy} onClick={() => void removeSaved()} className={`border px-3 py-2 text-[12px] font-bold disabled:opacity-40 ${armed ? "border-accent-600 bg-accent-600 text-white" : "border-line text-accent-600 hover:bg-paper"}`}>
                  {armed ? T.deleteArmed : T.deleteFont}
                </button>
              )}
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => void backupOut()} className="border border-line px-3 py-2 text-[12px] font-bold hover:bg-paper">
              {T.backupOut}
            </button>
            <label className="cursor-pointer border border-line px-3 py-2 text-[12px] font-bold hover:bg-paper">
              {T.backupIn}
              <input
                type="file"
                accept="application/json,.json"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f) void backupIn(f);
                }}
              />
            </label>
          </div>
          {storeMsg && (
            <p className={`mt-2 text-[12px] font-bold ${storeMsg.bad ? "text-accent-600" : "text-brand-700"}`} role="status">
              {storeMsg.text}
            </p>
          )}
          <p className="mt-2 text-[11px] text-ink-500">{T.backupNote}</p>
        </section>
      </div>
    </div>
  );
}
