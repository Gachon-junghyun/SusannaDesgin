"use client";

import { useEffect, useRef, useState } from "react";

import { fontLabCopy as T } from "@/config/fontLab";
import type { Contour } from "@/lib/maker/hfont/geom";
import { imageDataOf, traceGray } from "@/lib/maker/trace";

import { fitTraced, GlyphEditor, type EditorState, type Tool } from "./editor-core";

/**
 * 글자 고치기 판 (F26-m 3단계, 2026-10-25) — 화면 단추 · 캔버스 · 그림 불러오기. 실제 편집은 `editor-core.ts`.
 * 이 파일은 «글자 고치기»를 처음 열 때 내려옵니다(FontStudio 의 `next/dynamic`) — 기하·클리퍼·벡터화기가 그때만 옵니다.
 *
 * 그림 불러오기: 붙여넣기(Ctrl+V)·파일 → 메이커 «SVG 따기»와 같은 벡터화기(`lib/maker/trace.ts` `traceGray`, GPL 아님) →
 * `polygonsToContours` → 바꾸기 / 더하기(클리퍼 합집합). 시제품 자체 따기(`traceGray`·`relax`)는 1단계에서 버렸습니다.
 */
export default function GlyphEditorPanel({
  ch,
  start,
  ghost,
  edited,
  onCommit,
  onClose,
}: {
  ch: string;
  start: Contour[];
  ghost: Contour[];
  edited: boolean;
  onCommit: (work: Contour[] | null) => void;
  onClose: () => void;
}) {
  const cv = useRef<HTMLCanvasElement | null>(null);
  const root = useRef<HTMLElement | null>(null);
  const ed = useRef<GlyphEditor | null>(null);
  const commitRef = useRef(onCommit);
  const [st, setSt] = useState<EditorState>({ tool: "node", multi: false, nodes: 0, sel: 0, canUndo: false, canRedo: false, edited });
  const [note, setNote] = useState("");
  const [fitErr, setFitErr] = useState(1.5);
  const [roundR, setRoundR] = useState(14);
  const [imp, setImp] = useState<{ img: ImageData; th: number; inv: boolean; tol: number; result: Contour[] } | null>(null);
  const prev = useRef<HTMLCanvasElement | null>(null);

  /** 붙여넣기 처리기는 한 번 붙이므로 최신 함수를 ref 로 봅니다 */
  const openRef = useRef<(f: File) => void>(() => {});
  useEffect(() => {
    commitRef.current = onCommit;
    openRef.current = (f) => void openImage(f);
  });
  useEffect(() => {
    const e = new GlyphEditor(cv.current!, {
      onState: setSt,
      onCommit: (w) => commitRef.current(w),
      toast: (m) => setNote(m),
    });
    ed.current = e;
    // 판은 미리보기 아래에 열립니다 — 화면 밖이면 보이는 데까지 내립니다
    root.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    return () => {
      e.destroy();
      ed.current = null;
    };
  }, []);
  useEffect(() => {
    ed.current?.load(start, ghost, edited);
    // 글자가 바뀔 때만 다시 엽니다 — 고칠 때마다 부모가 넘기는 새 start 로 다시 열면 되돌리기가 사라집니다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ch, ghost]);

  // 키보드 — 화살표(Shift 10배) · Delete · Ctrl+Z / Ctrl+Y. 글자 입력 칸에 있을 때는 안 가로챕니다
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT")) return;
      const E = ed.current;
      if (!E) return;
      const step = e.shiftKey ? 10 : 1;
      const arrows: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
      if (arrows[e.key]) {
        e.preventDefault();
        E.nudge(...arrows[e.key]);
      } else if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        E.deleteSelected();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) E.redo();
        else E.undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        E.redo();
      }
    };
    const onPaste = (e: ClipboardEvent) => {
      const f = Array.from(e.clipboardData?.files ?? []).find((x) => x.type.startsWith("image/"));
      if (f) {
        e.preventDefault();
        openRef.current(f);
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("paste", onPaste);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("paste", onPaste);
    };
  }, []);

  /* ---------- 그림 불러오기 ---------- */
  async function openImage(file: File) {
    try {
      const img = await imageDataOf(file, 420);
      setImp(trace({ img, th: 128, inv: false, tol: 0.55, result: [] }));
    } catch {
      setNote("그림을 열지 못했습니다.");
    }
  }
  function trace(s: { img: ImageData; th: number; inv: boolean; tol: number; result: Contour[] }) {
    const { img, th, inv } = s, n = img.width * img.height, v = new Float32Array(n), d = img.data;
    for (let i = 0; i < n; i++) {
      let lum = d[i * 4] * 0.299 + d[i * 4 + 1] * 0.587 + d[i * 4 + 2] * 0.114;
      if (inv) lum = 255 - lum;
      v[i] = Math.max(0, Math.min(255, lum - th + 128)); // 문턱을 vclean 의 128 로 옮깁니다
    }
    const bez = traceGray({ w: img.width, h: img.height, v }, { tol: s.tol });
    return { ...s, result: fitTraced(bez as unknown as number[][][][]) };
  }
  useEffect(() => {
    const c = prev.current;
    if (!c || !imp) return;
    const x = c.getContext("2d")!, k = c.width / 1000;
    x.fillStyle = "#fff";
    x.fillRect(0, 0, c.width, c.height);
    const p = new Path2D();
    imp.result.forEach((ct) => {
      ct.n.forEach((q, i) => {
        const j = (i + 1) % ct.n.length, r = ct.n[j];
        if (i === 0) p.moveTo(q[0] * k, q[1] * k);
        p.bezierCurveTo((q[0] + q[4]) * k, (q[1] + q[5]) * k, (r[0] + r[2]) * k, (r[1] + r[3]) * k, r[0] * k, r[1] * k);
      });
      p.closePath();
    });
    x.fillStyle = "#0f1a19";
    x.fill(p, "nonzero");
  }, [imp]);

  const btn = "border border-line px-2.5 py-1.5 text-[12px] font-bold hover:bg-paper disabled:opacity-40";
  const on = (t: Tool) => (st.tool === t ? "border-brand-700 bg-brand-100 text-brand-700" : "border-line hover:bg-paper");

  return (
    <section ref={root} className="border-b border-line bg-white px-5 py-4" aria-labelledby="fl-edit">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="fl-edit" className="text-[12px] font-black tracking-[0.08em] text-ink-500">
          {T.editTitle} <span className="ml-1 text-[20px] font-black text-ink">{ch}</span>
          {st.edited && <span className="ml-2 text-[11px] font-bold text-brand-700">{T.editedTag}</span>}
        </h2>
        <button type="button" onClick={onClose} className={btn}>
          {T.editClose}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5" role="toolbar" aria-label="글자 고치기 도구">
        {(["node", "select"] as Tool[]).map((t) => (
          <button key={t} type="button" aria-pressed={st.tool === t} onClick={() => ed.current?.setTool(t)} className={`border px-3 py-1.5 text-[12px] font-bold ${on(t)}`}>
            {t === "node" ? T.toolNode : T.toolSelect}
          </button>
        ))}
        <label className="ml-1 flex items-center gap-1 text-[12px]">
          <input type="checkbox" checked={st.multi} onChange={(e) => ed.current?.setMulti(e.target.checked)} className="accent-brand" />
          {T.multi}
        </label>
        <span className="mx-1 h-5 w-px bg-line" aria-hidden="true" />
        <button type="button" className={btn} disabled={!st.sel} onClick={() => ed.current?.deleteSelected()}>{T.delNode}</button>
        <button type="button" className={btn} disabled={!st.sel} onClick={() => ed.current?.toggleSmooth()}>{T.smooth}</button>
        <button type="button" className={btn} disabled={!st.sel} onClick={() => ed.current?.roundSelected()}>{T.round}</button>
        <button type="button" className={btn} onClick={() => ed.current?.tame()}>{T.tame}</button>
        <span className="mx-1 h-5 w-px bg-line" aria-hidden="true" />
        <button type="button" className={btn} disabled={!st.canUndo} onClick={() => ed.current?.undo()} aria-label="되돌리기" title="되돌리기 (Ctrl+Z)">↶</button>
        <button type="button" className={btn} disabled={!st.canRedo} onClick={() => ed.current?.redo()} aria-label="다시 하기" title="다시 하기 (Ctrl+Y)">↷</button>
        <button type="button" className={btn} onClick={() => ed.current?.fit()}>{T.fitView}</button>
        <button type="button" className={btn} disabled={!st.edited} onClick={() => ed.current?.reset()}>{T.resetGlyph}</button>
      </div>

      <div className="mt-3 grid gap-4 lg:grid-cols-[minmax(0,1fr)_240px]">
        <div className="relative aspect-square w-full max-w-[640px] touch-none border border-line bg-[#eef0ef]">
          <canvas ref={cv} className="absolute inset-0 block" aria-label={`«${ch}» 윤곽 고치기`} />
        </div>
        <div className="space-y-3 text-[12px]">
          <p className="tabular-nums text-ink-500">
            점 {st.nodes.toLocaleString()}개 · 고른 점 {st.sel.toLocaleString()}개
          </p>
          <label className="block">
            <span className="flex justify-between font-bold">
              {T.refit}
              <span className="tabular-nums text-brand-700">{fitErr.toFixed(1)}</span>
            </span>
            <input
              type="range"
              min={0.5}
              max={10}
              step={0.5}
              value={fitErr}
              onPointerDown={() => ed.current?.refitStart()}
              onFocus={() => ed.current?.refitStart()}
              onChange={(e) => {
                setFitErr(Number(e.target.value));
                ed.current?.refitApply(Number(e.target.value));
              }}
              onPointerUp={() => ed.current?.refitEnd()}
              onKeyUp={() => ed.current?.refitEnd()}
              onBlur={() => ed.current?.refitEnd()}
              className="mt-1 w-full accent-brand"
            />
          </label>
          <label className="block">
            <span className="flex justify-between font-bold">
              {T.roundR}
              <span className="tabular-nums text-brand-700">{roundR}</span>
            </span>
            <input
              type="range"
              min={4}
              max={60}
              value={roundR}
              onChange={(e) => {
                setRoundR(Number(e.target.value));
                if (ed.current) ed.current.roundR = Number(e.target.value);
              }}
              className="mt-1 w-full accent-brand"
            />
          </label>
          <ul className="space-y-0.5 leading-relaxed text-ink-500">
            {T.editHelp.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>

          <div className="border-t border-line pt-3">
            <p className="font-bold">{T.importTitle}</p>
            <label className={`${btn} mt-1 inline-block cursor-pointer`}>
              {T.importPick}
              <input type="file" accept="image/*" className="sr-only" onChange={(e) => e.target.files?.[0] && void openImage(e.target.files[0])} />
            </label>
            <p className="mt-1 text-ink-500">{T.importPaste}</p>
            {imp && (
              <div className="mt-2 space-y-2">
                <canvas ref={prev} width={200} height={200} className="block h-[120px] w-[120px] border border-line" aria-label="딴 윤곽 미리보기" />
                <p className="tabular-nums text-ink-500">
                  윤곽 {imp.result.length}개 · 점 {imp.result.reduce((n, c) => n + c.n.length, 0)}개
                </p>
                <label className="block">
                  <span className="flex justify-between">{T.importTh}<span className="tabular-nums">{imp.th}</span></span>
                  <input type="range" min={30} max={230} value={imp.th} onChange={(e) => setImp(trace({ ...imp, th: Number(e.target.value) }))} className="w-full accent-brand" />
                </label>
                <label className="block">
                  <span className="flex justify-between">{T.importTol}<span className="tabular-nums">{imp.tol.toFixed(2)}</span></span>
                  <input type="range" min={0.3} max={3} step={0.05} value={imp.tol} onChange={(e) => setImp(trace({ ...imp, tol: Number(e.target.value) }))} className="w-full accent-brand" />
                </label>
                <label className="flex items-center gap-1.5">
                  <input type="checkbox" checked={imp.inv} onChange={(e) => setImp(trace({ ...imp, inv: e.target.checked }))} className="accent-brand" />
                  {T.importInv}
                </label>
                <div className="flex gap-1.5">
                  <button type="button" className={btn} disabled={!imp.result.length} onClick={() => { ed.current?.applyImport(imp.result, "replace"); setImp(null); }}>
                    {T.importReplace}
                  </button>
                  <button type="button" className={btn} disabled={!imp.result.length} onClick={() => { ed.current?.applyImport(imp.result, "add"); setImp(null); }}>
                    {T.importAdd}
                  </button>
                  <button type="button" className={btn} onClick={() => setImp(null)}>{T.importCancel}</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {note && (
        <p className="mt-2 text-[12px] font-bold text-brand-700" role="status">
          {note}
        </p>
      )}
    </section>
  );
}
