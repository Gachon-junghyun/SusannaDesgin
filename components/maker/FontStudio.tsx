"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  ALL_SYLLABLES,
  FONT_LAB_CACHE,
  FONT_LAB_DEFAULT_NAME,
  FONT_LAB_SAMPLE,
  FONT_LAB_STATE_KEY,
  FONT_LAB_STYLE_DEFAULT,
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

import type { FromWorker, ToWorker } from "./fontstudio/font.worker";

/**
 * 글꼴 공방 — 관리자 전용 (F26-m 2단계, `/admin/maker/font`, 2026-10-25).
 *
 * 바탕 글꼴 고르기(갈래 · 이름 찾기 · 11,172자 전부만) → 입력한 문장 미리보기 → 스타일(굵기 · 기울기 · 너비 · 자간) →
 * TTF 받기(한글 11,172자) · 간판용 TTF(겹친 획 합치기). 글자 고치기와 저장(`maker_fonts`)은 3단계입니다.
 * 계획 원문: 형제 저장소 `SusannaDesigner/study/2026-10-24_hangul-font/이식계획.md` §6 2단계.
 *
 * 🔴 **무거운 것은 전부 일꾼(`fontstudio/font.worker.ts`)에 있고, 일꾼은 글꼴을 처음 고를 때 만듭니다.** 이 화면 파일에는
 * 엔진·기하·클리퍼·opentype.js 가 없습니다 — 첫 화면은 목록과 미리보기 그림(PNG)뿐입니다.
 * 미리보기는 시제품 `bakeFont` 처럼 **입력한 문장의 글자만** 지금 스타일로 구워 `FontFace` 로 붙입니다.
 *
 * 고른 글꼴·스타일·문장·폰트 이름은 이 브라우저 `localStorage`(`FONT_LAB_STATE_KEY`)에만 남습니다.
 */

type Saved = { id: string | null; style: FontLabStyle; text: string; name: string; cat: FontLabCategory | "all"; fullOnly: boolean; scope: FontLabSignScope };
type Load = { id: string; state: "loading" | "ready" | "error"; n?: number; total?: number; cached?: boolean; bytes?: number; ms?: number; message?: string };
type Job = { kind: "ttf" | "sign"; phase: string; n: number; total: number; sec: number } | null;

const CAT_LABEL = Object.fromEntries(fontLabCategories.map((c) => [c.key, c.label])) as Record<string, string>;
const PHASE: Record<string, string> = { download: "글꼴 받는 중", resolve: "글자 준비", merge: "겹친 획을 합치는 중", build: "TTF 파일 쓰는 중" };

function readSaved(): Saved {
  const d: Saved = { id: null, style: FONT_LAB_STYLE_DEFAULT, text: FONT_LAB_SAMPLE, name: FONT_LAB_DEFAULT_NAME, cat: "all", fullOnly: false, scope: "all" };
  try {
    const s = JSON.parse(localStorage.getItem(FONT_LAB_STATE_KEY) || "null");
    if (!s || typeof s !== "object") return d;
    return {
      ...d,
      ...s,
      id: fontLabFonts.some((f) => f.id === s.id) ? s.id : null,
      style: { ...FONT_LAB_STYLE_DEFAULT, ...(s.style || {}) },
    };
  } catch {
    return d;
  }
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

function saveFile(name: string, buf: ArrayBuffer) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([buf], { type: "font/ttf" }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

const mb = (n: number) => `${(n / 1048576).toFixed(1)}MB`;

export default function FontStudio() {
  const [saved] = useState(readSaved);
  const [cat, setCat] = useState(saved.cat);
  const [q, setQ] = useState("");
  const [fullOnly, setFullOnly] = useState(saved.fullOnly);
  const [id, setId] = useState<string | null>(saved.id);
  const [style, setStyle] = useState(saved.style);
  const [text, setText] = useState(saved.text);
  const [name, setName] = useState(saved.name);
  const [scope, setScope] = useState<FontLabSignScope>(saved.scope);
  // 저장해 둔 선택이 있으면 처음에 한 번 다시 엽니다(아래 effect) — 그동안은 «받는 중»
  const [load, setLoad] = useState<Load | null>(saved.id ? { id: saved.id, state: "loading" } : null);
  const [family, setFamily] = useState<string | null>(null);
  const [bakeNote, setBakeNote] = useState("");
  const [job, setJob] = useState<Job>(null);
  const [msg, setMsg] = useState<{ text: string; bad?: boolean } | null>(null);

  const worker = useRef<Worker | null>(null);
  const bakeSeq = useRef(0);
  const jobSeq = useRef(100000);
  const face = useRef<FontFace | null>(null);
  /** 일꾼 처리기는 한 번 만들어지므로, 내보내기 중인 일의 이름·시작 시각은 ref 로 봅니다 */
  const running = useRef<{ kind: "ttf" | "sign"; file: string } | null>(null);
  const font = fontLabFonts.find((f) => f.id === id);

  const list = useMemo(() => {
    const k = q.trim().toLowerCase();
    return fontLabFonts.filter((f) => (cat === "all" || f.category === cat) && (!fullOnly || f.syllables >= ALL_SYLLABLES) && (!k || f.name.toLowerCase().includes(k)));
  }, [cat, q, fullOnly]);

  // 이 브라우저에만 남깁니다(저장은 3단계)
  useEffect(() => {
    try {
      localStorage.setItem(FONT_LAB_STATE_KEY, JSON.stringify({ id, style, text, name, cat, fullOnly, scope } satisfies Saved));
    } catch {
      /* 저장 공간이 막힌 브라우저 */
    }
  }, [id, style, text, name, cat, fullOnly, scope]);

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
          setMsg({ text: `${r.file} 를 받았습니다. 한글 ${m.syllables.toLocaleString()}자 · ${mb(m.buf.byteLength)} · ${(m.ms / 1000).toFixed(1)}초` });
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

  /** 글꼴 고르기 — 일꾼에게 받아 오라고 시킵니다 */
  function choose(f: FontLabFont) {
    if (f.id === id && load?.state !== "error") return;
    setId(f.id);
    setLoad({ id: f.id, state: "loading" });
    setFamily(null);
    setBakeNote("");
    post({ type: "load", id: f.id, url: f.url, cacheName: FONT_LAB_CACHE });
  }
  useEffect(() => {
    const f = fontLabFonts.find((x) => x.id === saved.id);
    if (f) getWorker().postMessage({ type: "load", id: f.id, url: f.url, cacheName: FONT_LAB_CACHE } satisfies ToWorker);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 처음 한 번만
  }, []);

  // 문장·스타일이 바뀌면 다시 굽습니다(0.3초 모아서)
  const requestBake = useRef<(() => void) | null>(null);
  useEffect(() => {
    requestBake.current = () => {
      const seq = ++bakeSeq.current;
      post({ type: "bake", seq, text, style });
    };
  });
  useEffect(() => {
    if (load?.state !== "ready") return;
    const t = setTimeout(() => requestBake.current?.(), 300);
    return () => clearTimeout(t);
  }, [text, style, load?.state, load?.id]);

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
    post({
      type: "export",
      seq,
      sign: kind === "sign" ? scope : null,
      text,
      style,
      familyName: name.trim(),
      license: { copyright: `${font.copyright} ${T.modifiedWith(font.name)}`.trim(), license: T.oflLicense, licenseUrl: T.oflUrl },
    });
  }

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
              onChange={(e) => setText(e.target.value)}
              className="mt-1 w-full resize-y border border-line px-2 py-1.5 text-[15px] outline-none focus:border-brand-700"
            />
          </label>
          <div className="mt-3 min-h-[140px] overflow-hidden border border-line bg-[#fbfbfa] px-4 py-5">
            {font && family ? (
              <p className="whitespace-pre-wrap break-keep text-[clamp(34px,6vw,72px)] leading-[1.25] text-ink" style={{ fontFamily: `"${family}", sans-serif` }}>
                {text}
              </p>
            ) : (
              <p className="py-8 text-center text-[14px] text-ink-500">{font ? "미리보기 글꼴을 굽는 중입니다." : T.previewEmpty}</p>
            )}
          </div>
          {font && font.syllables < ALL_SYLLABLES && <p className="mt-2 text-[12px] font-bold text-accent-600">{T.partialNote(font.syllables)}</p>}
          {font && <p className="mt-2 text-[11px] leading-relaxed text-ink-500">{T.credit(font.name, font.copyright)}</p>}
        </section>

        <section className="border-b border-line bg-white px-5 py-4" aria-labelledby="fl-style">
          <div className="flex items-baseline justify-between">
            <h2 id="fl-style" className="text-[12px] font-black tracking-[0.08em] text-ink-500">
              {T.styleTitle}
            </h2>
            <button type="button" onClick={() => setStyle(FONT_LAB_STYLE_DEFAULT)} className="border border-line px-2.5 py-1 text-[12px] font-bold hover:bg-paper">
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
              onChange={(e) => setName(e.target.value)}
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
            <li>{T.saveNote}</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
