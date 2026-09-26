"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { uploadSketch } from "@/app/admin/maker/draw/actions";
import { AI_DRAFT_NOTE, drawCanvases, INCOMING_SKETCH_KEY, LOGO_BETA, refineStyles } from "@/config/logo";
import { download } from "@/lib/maker/design";
import { bbox, layersFromImage, nodeCount, toPathD, traceGray } from "@/lib/maker/trace";

/**
 * 그림판 — 대충 그린 획을 선(벡터)으로 (F26-l · 2026-09-27, 관리자 전용 베타).
 *
 * 사람 요청: *"X 로고처럼 뾰족한 획은 폰트로 안 나온다 — 그려야 한다."* 펜·지우개·되돌리기·격자/가이드·다시 그리기,
 * 결과는 **SVG 경로 + PNG**. 벡터화는 «SVG 따기»·에디터와 같은 `lib/maker/trace.ts`(vclean 을 옮긴 것) — 두 벌을 만들지 않았습니다.
 * «로고 만들기 ③ 손그림»이 이 결과를 바로 불러 씁니다(같은 브라우저 저장소).
 *
 * «AI 로 다듬기»는 이미지 API 가 안 붙어 **자리만** 있습니다. 그동안은 «프로젝트 에셋으로 올리기» → 클로드 코드가
 * `/gemini-image --ref <스케치>` 로 글꼴 느낌 3~4벌을 뽑아 벡터화해 같은 프로젝트로 되돌려 올립니다(STARTUP/aidesigner/STAGES.md 4-a).
 */

type Stroke = { erase: boolean; w: number; pts: [number, number][] };
type Hist = { past: Stroke[][]; now: Stroke[]; future: Stroke[][] };
type Result = { d: string; w: number; h: number; nodes: number };

const INK = "#1b1d1c";

function paint(ctx: CanvasRenderingContext2D, W: number, H: number, strokes: Stroke[]) {
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const s of strokes) {
    // 지우개는 흰 획입니다 — 결과가 «흰 바탕의 먹»이라 투명으로 뚫을 필요가 없습니다
    ctx.strokeStyle = s.erase ? "#ffffff" : INK;
    ctx.fillStyle = ctx.strokeStyle;
    ctx.lineWidth = s.w;
    const p = s.pts;
    if (p.length === 1) {
      ctx.beginPath();
      ctx.arc(p[0][0], p[0][1], s.w / 2, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    // 점 사이 가운데를 잇는 2차 곡선 — 손떨림을 조금 눅입니다
    ctx.beginPath();
    ctx.moveTo(p[0][0], p[0][1]);
    for (let i = 1; i < p.length - 1; i++) {
      const mx = (p[i][0] + p[i + 1][0]) / 2, my = (p[i][1] + p[i + 1][1]) / 2;
      ctx.quadraticCurveTo(p[i][0], p[i][1], mx, my);
    }
    ctx.lineTo(p[p.length - 1][0], p[p.length - 1][1]);
    ctx.stroke();
  }
}

export default function DrawStudio({ base, aiReady }: { base: string; aiReady: boolean }) {
  const router = useRouter();
  const [size, setSize] = useState<(typeof drawCanvases)[number]["key"]>("square");
  const C = drawCanvases.find((c) => c.key === size)!;
  const [hist, setHist] = useState<Hist>({ past: [], now: [], future: [] });
  const [erase, setErase] = useState(false);
  const [width, setWidth] = useState(28);
  const [grid, setGrid] = useState(true);
  const [guide, setGuide] = useState(true);
  const [name, setName] = useState("스케치");
  const [project, setProject] = useState(() => `스케치_${new Date().toLocaleDateString("sv-SE")}`);
  const [result, setResult] = useState<Result | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const cv = useRef<HTMLCanvasElement>(null);
  const cur = useRef<Stroke | null>(null);

  // 획이 바뀌면 다시 칠하고, 조금 뒤 선으로 땁니다
  useEffect(() => {
    const c = cv.current;
    const ctx = c?.getContext("2d", { willReadFrequently: true });
    if (!c || !ctx) return;
    paint(ctx, C.w, C.h, hist.now);
    const t = setTimeout(() => {
      if (!hist.now.some((s) => !s.erase)) return setResult(null);
      const img = ctx.getImageData(0, 0, C.w, C.h);
      const layer = layersFromImage(img, "ink")[0];
      const cs = layer ? traceGray(layer.gray, { minArea: 30 }) : [];
      if (!cs.length) return setResult(null);
      const bb = bbox(cs);
      setResult({ d: toPathD(cs, 1, -bb.x0, -bb.y0), w: Math.round(bb.w * 10) / 10, h: Math.round(bb.h * 10) / 10, nodes: nodeCount(cs) });
    }, 250);
    return () => clearTimeout(t);
  }, [hist.now, C.w, C.h]);

  const at = (e: React.PointerEvent): [number, number] => {
    const r = cv.current!.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * C.w, ((e.clientY - r.top) / r.height) * C.h];
  };
  const undo = () => setHist((h) => (h.past.length ? { past: h.past.slice(0, -1), now: h.past[h.past.length - 1], future: [h.now, ...h.future] } : h));
  const redo = () => setHist((h) => (h.future.length ? { past: [...h.past, h.now], now: h.future[0], future: h.future.slice(1) } : h));
  const clear = () => setHist((h) => (h.now.length ? { past: [...h.past, h.now], now: [], future: [] } : h));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest("input,textarea,select")) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function svgText(r: Result) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${r.w} ${r.h}"><path fill="${INK}" fill-rule="evenodd" d="${r.d}"/></svg>\n`;
  }
  function pngUrl() {
    return cv.current!.toDataURL("image/png");
  }
  function toLogo() {
    if (!result) return;
    try {
      localStorage.setItem(INCOMING_SKETCH_KEY, JSON.stringify({ name: name.trim() || "스케치", d: result.d, w: result.w, h: result.h }));
      router.push(`${base}/logo`);
    } catch {
      setNote("브라우저 저장소가 막혀 있어 넘기지 못했습니다 — SVG 로 내려받아 주세요.");
    }
  }
  async function upload() {
    if (!result) return;
    setBusy(true);
    setNote("");
    const r = await uploadSketch({ project: project.trim(), name: name.trim() || "스케치", png: pngUrl(), svg: svgText(result) });
    setBusy(false);
    setNote(r.ok ? `프로젝트 «${project.trim()}» 에 스케치 PNG·SVG 를 올렸습니다. 클로드 코드에게 «이 프로젝트 AI 로 다듬기»를 부탁하세요.` : r.error);
  }

  return (
    <div className="grid lg:h-full lg:grid-cols-[minmax(0,1fr)_340px]">
      <section className="flex min-w-0 flex-col lg:min-h-0">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line bg-white px-3 py-2 text-[12px] font-bold">
          <span className="text-[14px] font-black">
            그림판 <span className="ml-1 text-[11px] text-brand-700">{LOGO_BETA} · 관리자만</span>
          </span>
          <div className="flex border border-line" role="group" aria-label="도구">
            {[false, true].map((v) => (
              <button key={String(v)} type="button" aria-pressed={erase === v} onClick={() => setErase(v)} className={`px-3 py-1.5 ${erase === v ? "bg-ink text-white" : "hover:bg-paper"}`}>
                {v ? "지우개" : "펜"}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2">
            굵기
            <input type="range" min={4} max={120} value={width} onChange={(e) => setWidth(Number(e.target.value))} className="w-28 accent-brand" />
            <span className="w-8 tabular-nums">{width}</span>
          </label>
          <label className="flex items-center gap-1.5">
            <input type="checkbox" checked={grid} onChange={(e) => setGrid(e.target.checked)} className="accent-brand" />
            격자
          </label>
          <label className="flex items-center gap-1.5">
            <input type="checkbox" checked={guide} onChange={(e) => setGuide(e.target.checked)} className="accent-brand" />
            가이드
          </label>
          <select
            value={size}
            onChange={(e) => {
              setSize(e.target.value as typeof size);
              setHist({ past: [], now: [], future: [] });
            }}
            className="border-b border-line bg-transparent py-1"
            aria-label="캔버스"
          >
            {drawCanvases.map((c) => (
              <option key={c.key} value={c.key}>
                {c.name}
              </option>
            ))}
          </select>
          <span className="ml-auto flex gap-1">
            <button type="button" onClick={undo} disabled={!hist.past.length} aria-label="되돌리기" title="되돌리기 (Ctrl+Z)" className="h-8 w-8 border border-line text-[16px] hover:bg-paper disabled:opacity-30">
              ↶
            </button>
            <button type="button" onClick={redo} disabled={!hist.future.length} aria-label="다시 하기" title="다시 하기 (Ctrl+Y)" className="h-8 w-8 border border-line text-[16px] hover:bg-paper disabled:opacity-30">
              ↷
            </button>
            <button type="button" onClick={clear} disabled={!hist.now.length} className="h-8 border border-line px-3 hover:bg-paper disabled:opacity-30">
              다시 그리기
            </button>
          </span>
        </div>

        <div className="flex min-h-[50vh] flex-1 items-center justify-center overflow-hidden bg-[#e4e7e6] p-4 lg:min-h-0">
          <div className="relative" style={{ aspectRatio: `${C.w} / ${C.h}`, width: `min(100%, calc((100dvh - 190px) * ${C.w / C.h}))` }}>
            <canvas
              ref={cv}
              width={C.w}
              height={C.h}
              className="block h-full w-full touch-none bg-white shadow-[0_1px_3px_rgba(0,0,0,0.12)]"
              style={{ cursor: "crosshair" }}
              onPointerDown={(e) => {
                try {
                  e.currentTarget.setPointerCapture(e.pointerId);
                } catch {
                  /* 기기에 따라 던집니다 */
                }
                cur.current = { erase, w: width, pts: [at(e)] };
                setHist((h) => ({ past: [...h.past.slice(-60), h.now], now: [...h.now, cur.current!], future: [] }));
              }}
              onPointerMove={(e) => {
                const s = cur.current;
                if (!s) return;
                const p = at(e), last = s.pts[s.pts.length - 1];
                if (Math.hypot(p[0] - last[0], p[1] - last[1]) < 2) return;
                const next = { ...s, pts: [...s.pts, p] };
                cur.current = next;
                setHist((h) => ({ ...h, now: [...h.now.slice(0, -1), next] }));
              }}
              onPointerUp={() => (cur.current = null)}
              onPointerCancel={() => (cur.current = null)}
            />
            {/* 격자·가이드 — 화면에만(PNG·SVG 에는 안 들어갑니다) */}
            <svg viewBox={`0 0 ${C.w} ${C.h}`} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
              {grid &&
                Array.from({ length: 19 }, (_, i) => (i + 1) * 50).map((v) => (
                  <g key={v} stroke="#00a79d" strokeOpacity={v % 250 === 0 ? 0.28 : 0.1} strokeWidth={1}>
                    {v < C.w && <line x1={v} y1={0} x2={v} y2={C.h} />}
                    {v < C.h && <line x1={0} y1={v} x2={C.w} y2={v} />}
                  </g>
                ))}
              {guide && (
                <g fill="none" stroke="#e04e00" strokeOpacity={0.55} strokeWidth={2} strokeDasharray="10 8">
                  {/* 가운데 55% — 제미나이에 넘길 때 여백이 남는 자리(sign-proof «central 55%») */}
                  <rect x={C.w * 0.225} y={C.h * 0.225} width={C.w * 0.55} height={C.h * 0.55} />
                  <line x1={C.w / 2} y1={0} x2={C.w / 2} y2={C.h} strokeOpacity={0.3} />
                  <line x1={0} y1={C.h / 2} x2={C.w} y2={C.h / 2} strokeOpacity={0.3} />
                </g>
              )}
            </svg>
          </div>
        </div>
        <p className="border-t border-line bg-white px-4 py-2 text-[12px] text-ink-500">
          점선 네모 안에 그리면 AI 로 다듬을 때 여백이 남습니다 · 되돌리기 Ctrl+Z · 다시 하기 Ctrl+Y
        </p>
      </section>

      <aside className="space-y-4 border-l border-line bg-white px-4 py-4 lg:min-h-0 lg:overflow-y-auto">
        <section>
          <h2 className="text-[12px] font-black tracking-[0.08em] text-ink-500">선으로 딴 결과</h2>
          <div className="mt-2 grid aspect-square place-items-center border border-line bg-[repeating-conic-gradient(#f1f2f1_0_25%,#fff_0_50%)] bg-[length:14px_14px] p-3">
            {result ? (
              <svg viewBox={`0 0 ${result.w} ${result.h}`} className="h-full w-full" role="img" aria-label="벡터 결과">
                <path d={result.d} fill={INK} fillRule="evenodd" />
              </svg>
            ) : (
              <span className="text-[13px] text-ink-500">그리면 여기에 선(벡터)이 뜹니다</span>
            )}
          </div>
          {result && <p className="mt-1 text-[11px] tabular-nums text-ink-500">점 {result.nodes.toLocaleString()}개 · 캔버스 {result.w}×{result.h}px 안</p>}
        </section>

        <label className="block">
          <span className="block text-[12px] font-bold text-ink-500">이름</span>
          <input value={name} maxLength={60} onChange={(e) => setName(e.target.value)} className="mt-1 w-full border-b border-line px-1 py-1.5 text-[14px] font-bold outline-none focus:border-brand-700" />
        </label>

        <div className="space-y-2">
          <button type="button" disabled={!result} onClick={toLogo} className="w-full bg-brand-700 px-3 py-2.5 text-[13px] font-bold text-white hover:bg-brand-600 disabled:opacity-40">
            로고 만들기로 보내기 (③ 손그림)
          </button>
          <div className="flex gap-2">
            <button type="button" disabled={!result} onClick={() => result && download(`${name || "스케치"}.svg`, svgText(result))} className="flex-1 border border-line px-2 py-2 text-[12px] font-bold hover:bg-paper disabled:opacity-40">
              SVG 저장
            </button>
            <button type="button" disabled={!hist.now.length} onClick={() => download(`${name || "스케치"}.png`, pngUrl())} className="flex-1 border border-line px-2 py-2 text-[12px] font-bold hover:bg-paper disabled:opacity-40">
              PNG 저장
            </button>
          </div>
        </div>

        <section className="border-t border-line pt-3">
          <h2 className="text-[12px] font-black tracking-[0.08em] text-ink-500">AI 로 다듬기</h2>
          <p className="mt-1 text-[12px] leading-relaxed">
            스케치의 뼈대는 두고 글꼴 느낌 여러 벌로 다시 그립니다 — {refineStyles.join(" · ")}.
          </p>
          <button type="button" disabled={!aiReady} className="mt-2 w-full border border-line px-3 py-2.5 text-[13px] font-bold text-ink-500 disabled:cursor-not-allowed disabled:opacity-60">
            AI 로 다듬기
          </button>
          {!aiReady && <p className="mt-1 text-[12px] leading-relaxed text-ink-500">{AI_DRAFT_NOTE}. 아래로 스케치를 올려 두면 됩니다.</p>}
          <label className="mt-3 block">
            <span className="block text-[12px] font-bold text-ink-500">프로젝트 (손님 한 건)</span>
            <input value={project} maxLength={80} onChange={(e) => setProject(e.target.value)} className="mt-1 w-full border-b border-line px-1 py-1.5 text-[14px] font-bold outline-none focus:border-brand-700" />
          </label>
          <button type="button" disabled={!result || busy || !project.trim()} onClick={upload} className="mt-2 w-full border border-brand-700 px-3 py-2.5 text-[13px] font-bold text-brand-700 hover:bg-brand-50 disabled:opacity-40">
            {busy ? "올리는 중…" : "프로젝트 에셋으로 올리기 (PNG + SVG)"}
          </button>
        </section>
        {note && (
          <p className="text-[12px] font-bold text-brand-700" role="status">
            {note}
          </p>
        )}
      </aside>
    </div>
  );
}
