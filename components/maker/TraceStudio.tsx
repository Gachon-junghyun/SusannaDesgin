"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { INCOMING_LOGO_KEY } from "@/config/maker";
import { download } from "@/lib/maker/design";
import { bbox, imageDataOf, layersFromImage, missingExtrema, nodeCount, toPathD, traceGray, type Contour, type Layer } from "@/lib/maker/trace";

/**
 * SVG 따기 — 그림 한 장을 선(벡터)으로 바꾸는 전용 작업대 (F26 · 2026-09-25).
 *
 * 사람 지시: *"왼쪽엔 네비게이션 리스트 만들어서 svg 따기 페이지 만들어서 따로 그런 것만 하는 곳도"*.
 * 에디터 안의 «로고 올리기»는 기본값으로 한 번 따는 것이고, 여기는 **값을 바꿔 가며 다듬고 결과를 재는 곳**입니다.
 *
 * 벡터화기는 에디터와 같은 `lib/maker/trace.ts`(형제 작업의 vclean.py 를 TS 로 옮긴 것)입니다 — 두 벌을 만들지 않았습니다.
 * 결과를 «재는» 자도 붙였습니다: 층마다 **IoU**(벡터를 다시 칠해 원본 마스크와 겹친 비율), **극점 누락**(곡선 한가운데에
 * 끝점이 없는 곳 — 0 이어야 공장 CAD 에서 깨끗하게 열립니다), **점 수**. 🔴 눈으로 «비슷해 보인다»는 판정이 아닙니다.
 *
 * 🔴 **그림은 이 브라우저 밖으로 안 나갑니다.** 서버에 올리지 않고, «에디터로 보내기»도 같은 브라우저 저장소로만 건넵니다.
 */

type Mode = "ink" | "invert" | "c2" | "c3" | "c4";
const MODES: { v: Mode; label: string; hint: string }[] = [
  { v: "ink", label: "한 색 · 진한 로고", hint: "흰 바탕에 어두운 글씨·로고" },
  { v: "invert", label: "한 색 · 밝은 로고", hint: "어두운 바탕에 밝은 글씨" },
  { v: "c2", label: "두 색", hint: "색이 둘인 로고 — 색마다 층을 가릅니다" },
  { v: "c3", label: "세 색", hint: "" },
  { v: "c4", label: "네 색", hint: "" },
];

type Result = {
  layers: { name: string; color: string; cs: Contour[]; iou: number; hidden?: boolean }[];
  ms: number;
  w: number;
  h: number;
};

export default function TraceStudio({ base }: { base: string }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [img, setImg] = useState<ImageData | null>(null);
  const [src, setSrc] = useState("");
  const [mode, setMode] = useState<Mode>("ink");
  const [tol, setTol] = useState(0.55);
  const [corner, setCorner] = useState(58);
  const [minArea, setMinArea] = useState(20);
  const [res, setRes] = useState(900);
  const [view, setView] = useState<"side" | "over" | "lines">("side");
  const [widthMm, setWidthMm] = useState(1000);
  const [result, setResult] = useState<Result | null>(null);
  const [colors, setColors] = useState<Record<number, string>>({});
  const [hidden, setHidden] = useState<Record<number, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // 붙여넣기(Ctrl+V)로도 받습니다 — 카톡·메일에서 그림을 복사해 오는 경우가 많습니다
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const f = [...(e.clipboardData?.files ?? [])].find((x) => x.type.startsWith("image/"));
      if (f) take(f);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  });

  async function take(f: File) {
    setErr("");
    if (!f.type.startsWith("image/")) {
      setErr("그림 파일(PNG·JPG·WEBP)만 됩니다. 일러스트(AI)·PDF 는 «일러스트 → 시안»(준비 중)에서 받을 예정입니다.");
      return;
    }
    setFile(f);
    setSrc(URL.createObjectURL(f));
  }

  // 해상도가 바뀌면 다시 읽습니다
  useEffect(() => {
    if (!file) return;
    let alive = true;
    imageDataOf(file, res).then((d) => alive && setImg(d)).catch((e) => alive && setErr((e as Error).message));
    return () => {
      alive = false;
    };
  }, [file, res]);

  // 값이 바뀌면 조금 기다렸다가 다시 땁니다 (슬라이더를 끄는 동안 매번 돌지 않게)
  useEffect(() => {
    if (!img) return;
    const t = setTimeout(() => {
      setBusy(true);
      requestAnimationFrame(() => {
        try {
          const t0 = performance.now();
          const ls: Layer[] = mode === "ink" || mode === "invert" ? layersFromImage(img, "ink", { invert: mode === "invert" }) : layersFromImage(img, "colors", { k: Number(mode.slice(1)) });
          const layers = ls
            .map((l) => ({ name: l.name, color: l.color, cs: traceGray(l.gray, { tol, cornerDeg: corner, minArea }), gray: l.gray }))
            .filter((l) => l.cs.length)
            .map((l) => ({ name: l.name, color: l.color, cs: l.cs, iou: iou(l.cs, l.gray) }));
          setResult({ layers, ms: performance.now() - t0, w: img.width, h: img.height });
          setColors({});
          setHidden({});
          if (!layers.length) setErr("선을 찾지 못했습니다 — 방식을 바꿔 보세요(밝은 로고면 «한 색 · 밝은 로고»).");
          else setErr("");
        } finally {
          setBusy(false);
        }
      });
    }, 250);
    return () => clearTimeout(t);
  }, [img, mode, tol, corner, minArea]);

  const shown = useMemo(() => (result ? result.layers.map((l, i) => ({ ...l, color: colors[i] ?? l.color, hidden: !!hidden[i] })) : []), [result, colors, hidden]);
  const all = shown.filter((l) => !l.hidden).flatMap((l) => l.cs);
  const bb = all.length ? bbox(all) : null;
  const stats = result
    ? {
        segs: nodeCount(result.layers.flatMap((l) => l.cs)),
        miss: missingExtrema(result.layers.flatMap((l) => l.cs)).bad,
        iou: result.layers.length ? Math.min(...result.layers.map((l) => l.iou)) : 0,
      }
    : null;

  function svgOut(): string {
    if (!bb) return "";
    const k = widthMm / bb.w, H = bb.h * k;
    const groups = shown
      .filter((l) => !l.hidden)
      .map((l) => `<path id="${l.name}" fill="${l.color}" fill-rule="evenodd" d="${toPathD(l.cs, k, -bb.x0 * k, -bb.y0 * k)}"/>`)
      .join("");
    return `<?xml version="1.0" encoding="UTF-8"?>\n<!-- SUSANNA MAKER · SVG 따기 · 단위 mm · 가로 ${Math.round(widthMm)} × 세로 ${Math.round(H)} -->\n<svg xmlns="http://www.w3.org/2000/svg" width="${widthMm}mm" height="${H.toFixed(1)}mm" viewBox="0 0 ${widthMm} ${H.toFixed(2)}">${groups}</svg>`;
  }

  function toEditor() {
    if (!bb) return;
    const layers = shown.filter((l) => !l.hidden).map((l) => ({ name: l.name, color: l.color, d: toPathD(l.cs, 1, -bb.x0, -bb.y0) }));
    try {
      localStorage.setItem(INCOMING_LOGO_KEY, JSON.stringify({ name: file?.name.replace(/\.[^.]+$/, "") ?? "로고", layers, srcW: bb.w, srcH: bb.h }));
      router.push(base);
    } catch {
      setErr("브라우저 저장소가 막혀 있어 보내지 못했습니다 — SVG 로 내려받아 주세요.");
    }
  }

  const vb = result ? `0 0 ${result.w} ${result.h}` : "0 0 100 60";

  return (
    <div className="grid lg:h-full lg:grid-cols-[minmax(0,1fr)_300px]">
      <section className="flex min-w-0 flex-col lg:min-h-0">
        <div className="flex flex-wrap items-center gap-2 border-b border-line bg-white px-3 py-2">
          {(["side", "over", "lines"] as const).map((v) => (
            <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)} className={`px-3 py-1.5 text-[12px] font-bold ${view === v ? "bg-ink text-white" : "border border-line hover:bg-paper"}`}>
              {v === "side" ? "나란히" : v === "over" ? "겹쳐 보기" : "선과 점"}
            </button>
          ))}
          {stats && (
            <span className="ml-auto flex flex-wrap gap-x-4 text-[12px] tabular-nums text-ink-500">
              <span>층 <b className="text-ink">{result!.layers.length}</b></span>
              <span>선 조각 <b className="text-ink">{stats.segs.toLocaleString()}</b></span>
              <span>
                극점 누락 <b className={stats.miss ? "text-accent-600" : "text-brand-700"}>{stats.miss}</b>
              </span>
              <span>
                닮음(IoU) <b className={stats.iou < 0.9 ? "text-accent-600" : "text-ink"}>{stats.iou.toFixed(3)}</b>
              </span>
              <span>{Math.round(result!.ms)}ms</span>
            </span>
          )}
        </div>

        <div
          className="relative flex min-h-[55vh] flex-1 items-center justify-center overflow-auto bg-[#e4e7e6] p-6"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files?.[0];
            if (f) take(f);
          }}
        >
          {!src && (
            <label className="flex w-full max-w-md cursor-pointer flex-col items-center gap-2 border-2 border-dashed border-[#b9c1bf] bg-white px-6 py-14 text-center hover:border-brand">
              <span className="text-[16px] font-black">그림을 끌어다 놓거나 눌러서 고르세요</span>
              <span className="text-[13px] text-ink-500">PNG · JPG · WEBP · 복사한 그림은 Ctrl+V</span>
              <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => e.target.files?.[0] && take(e.target.files[0])} />
            </label>
          )}
          {src && result && (
            <div className={`grid w-full gap-4 ${view === "side" ? "md:grid-cols-2" : ""}`}>
              {view === "side" && (
                <figure className="bg-white p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element -- 손님 브라우저 안의 임시 그림(blob:) 이라 next/image 로 못 씁니다 */}
                  <img src={src} alt="원본" className="mx-auto max-h-[60vh] w-auto" />
                  <figcaption className="mt-2 text-center text-[12px] font-bold text-ink-500">원본</figcaption>
                </figure>
              )}
              <figure className="bg-white p-3">
                <svg viewBox={vb} className="mx-auto max-h-[60vh] w-full" role="img" aria-label="벡터로 딴 결과">
                  {view === "over" && <image href={src} x={0} y={0} width={result.w} height={result.h} opacity={0.45} />}
                  {shown
                    .filter((l) => !l.hidden)
                    .map((l, i) =>
                      view === "lines" ? (
                        <g key={i}>
                          <path d={toPathD(l.cs)} fill="none" stroke={l.color} strokeWidth={result.w / 500} fillRule="evenodd" />
                          {l.cs.flatMap((c, ci) => c.map((b, bi) => <circle key={`${ci}-${bi}`} cx={b[0][0]} cy={b[0][1]} r={result.w / 260} fill="#ff5900" />))}
                        </g>
                      ) : (
                        <path key={i} d={toPathD(l.cs)} fill={l.color} fillRule="evenodd" opacity={view === "over" ? 0.75 : 1} />
                      ),
                    )}
                </svg>
                <figcaption className="mt-2 text-center text-[12px] font-bold text-ink-500">{view === "lines" ? "선과 끝점(주황) — 점이 적고 곡선 한가운데에 없을수록 깨끗합니다" : "벡터(SVG)"}</figcaption>
              </figure>
            </div>
          )}
          {busy && <p className="absolute inset-x-0 top-4 mx-auto w-fit bg-ink px-4 py-2 text-[13px] font-bold text-white">선으로 따는 중…</p>}
        </div>
        {err && <p className="border-t border-line bg-white px-4 py-2 text-[14px] font-bold text-accent-600" role="alert">{err}</p>}
        <p className="border-t border-line bg-white px-4 py-2 text-[12px] leading-relaxed text-ink-500">
          그림은 이 브라우저 안에서만 처리됩니다(서버로 안 올라감). 벡터는 «시안»이고, 제작 전에 디자이너가 다시 다듬습니다.
        </p>
      </section>

      <aside className="border-l border-line bg-white lg:min-h-0 lg:overflow-y-auto">
        <Group title="그림">
          <label className="flex cursor-pointer items-center justify-center border border-brand-700 px-3 py-2.5 text-[14px] font-bold text-brand-700 hover:bg-brand-50">
            {file ? "다른 그림 고르기" : "그림 고르기"}
            <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => e.target.files?.[0] && take(e.target.files[0])} />
          </label>
          {file && <p className="mt-1.5 truncate text-[12px] text-ink-500">{file.name}{img ? ` · ${img.width}×${img.height}px 로 처리` : ""}</p>}
        </Group>

        <Group title="방식">
          <div className="space-y-1">
            {MODES.map((m) => (
              <button key={m.v} type="button" aria-pressed={mode === m.v} onClick={() => setMode(m.v)} className={`w-full px-3 py-2 text-left ${mode === m.v ? "bg-brand-100" : "hover:bg-paper"}`}>
                <span className={`text-[13px] font-bold ${mode === m.v ? "text-brand-700" : ""}`}>{m.label}</span>
                {m.hint && mode === m.v && <span className="block text-[11px] text-ink-500">{m.hint}</span>}
              </button>
            ))}
          </div>
        </Group>

        <Group title="다듬기">
          <Range label="매끄러움" hint="크면 점이 줄고 곡선이 부드러워집니다" min={0.3} max={1.6} step={0.05} value={tol} onChange={setTol} fmt={(v) => v.toFixed(2)} />
          <Range label="모서리 각도" hint="작으면 모서리를 덜 잡습니다(둥근 로고)" min={30} max={85} step={1} value={corner} onChange={setCorner} fmt={(v) => `${v}°`} />
          <Range label="잡티 지우기" hint="이보다 작은 점·얼룩은 버립니다(픽셀²)" min={4} max={400} step={2} value={minArea} onChange={setMinArea} fmt={(v) => `${v}`} />
          <Range label="처리 해상도" hint="크면 정밀하지만 느립니다" min={400} max={1600} step={100} value={res} onChange={setRes} fmt={(v) => `${v}px`} />
        </Group>

        {result && (
          <Group title="층 (색마다 따로 만듭니다)">
            <ul className="space-y-1.5">
              {result.layers.map((l, i) => (
                <li key={i} className="flex items-center gap-2 text-[13px]">
                  <input type="checkbox" checked={!hidden[i]} onChange={(e) => setHidden((h) => ({ ...h, [i]: !e.target.checked }))} className="accent-brand" aria-label={`${l.name} 보이기`} />
                  <input type="color" value={colors[i] ?? l.color} onChange={(e) => setColors((c) => ({ ...c, [i]: e.target.value }))} className="h-7 w-10 cursor-pointer border border-line" aria-label={`${l.name} 색`} />
                  <span className="flex-1">{l.name}</span>
                  <span className={`tabular-nums text-[12px] ${l.iou < 0.9 ? "text-accent-600" : "text-ink-500"}`}>{l.iou.toFixed(3)}</span>
                </li>
              ))}
            </ul>
          </Group>
        )}

        <Group title="내보내기">
          <label className="flex items-center gap-2 text-[13px]">
            <span className="font-bold">가로</span>
            <input inputMode="numeric" value={widthMm} onChange={(e) => setWidthMm(Math.max(10, Number(e.target.value.replace(/[^\d]/g, "")) || 0))} className="w-24 border border-line px-2 py-1 text-right" />
            <span>mm {bb ? `× 세로 ${Math.round((bb.h * widthMm) / bb.w)}mm` : ""}</span>
          </label>
          <div className="mt-3 space-y-2">
            <button type="button" disabled={!bb} onClick={() => download(`${file?.name.replace(/\.[^.]+$/, "") ?? "trace"}.svg`, svgOut())} className="w-full bg-brand-700 px-4 py-3 font-bold text-white hover:bg-brand-600 disabled:opacity-40">
              SVG 내려받기 (mm)
            </button>
            <button type="button" disabled={!bb} onClick={toEditor} className="w-full border border-brand-700 px-4 py-2.5 font-bold text-brand-700 hover:bg-brand-50 disabled:opacity-40">
              간판 에디터로 보내기
            </button>
          </div>
        </Group>
      </aside>
    </div>
  );
}

/** 벡터를 원본 해상도로 다시 칠해 층 마스크와 겹친 비율 — letter_svg.py 의 fidelity 와 같은 자 */
function iou(cs: Contour[], gray: { w: number; h: number; v: Float32Array }): number {
  const cv = document.createElement("canvas");
  cv.width = gray.w;
  cv.height = gray.h;
  const ctx = cv.getContext("2d", { willReadFrequently: true });
  if (!ctx) return 0;
  ctx.fill(new Path2D(toPathD(cs)), "evenodd");
  const a = ctx.getImageData(0, 0, gray.w, gray.h).data;
  let inter = 0, uni = 0;
  for (let i = 0; i < gray.w * gray.h; i++) {
    const x = a[i * 4 + 3] > 127, r = gray.v[i] < 128;
    if (x && r) inter++;
    if (x || r) uni++;
  }
  return uni ? inter / uni : 0;
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-line px-4 pb-4 pt-3">
      <h2 className="mb-2 text-[12px] font-black tracking-[0.08em] text-ink-500">{title}</h2>
      {children}
    </section>
  );
}

function Range({ label, hint, min, max, step, value, onChange, fmt }: { label: string; hint: string; min: number; max: number; step: number; value: number; onChange: (v: number) => void; fmt: (v: number) => string }) {
  return (
    <label className="mb-3 block last:mb-0">
      <span className="flex justify-between text-[13px] font-bold">
        {label}
        <span className="tabular-nums text-ink-500">{fmt(value)}</span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-brand" />
      <span className="block text-[11px] text-ink-500">{hint}</span>
    </label>
  );
}
