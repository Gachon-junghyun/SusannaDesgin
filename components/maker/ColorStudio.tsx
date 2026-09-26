"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { INCOMING_PALETTE_KEY } from "@/config/maker";
import { download, inkOn } from "@/lib/maker/design";
import { giveToEditor } from "@/lib/maker/handoff";
import { colorName, MOODS, pickSpots, readLabel, sampleAt, shareOf, skyShare, suggestCombos, type Mood, type Spot } from "@/lib/maker/palette";
import { imageDataOf } from "@/lib/maker/trace";

/**
 * 건물 색 찾기 — 건물 사진에서 «우리 가게 색» 다섯을 찾는 작업대 (F26-h · 2026-09-26).
 *
 * 사람 요청: *"네비게이션 바에 따로 창을 만들어서 건물을 넣을 수 있게, 어도비에 실제로 들어가서 색상 다섯 가지 주는 원리랑 비슷한 UI로,
 * 다섯 색을 실제 왼쪽 사진의 비슷한 곳을 찾아 원 돋보기로 살짝 키워 보게 하고 원색 네모 안에 보이게 — 전문 디자인 회사 레퍼런스 잘 따서"*.
 *
 * 레퍼런스(2026-09-26 크롬으로 직접 봄):
 *   - **어도비 컬러 «이미지에서 테마 추출»**: 위에 «색상 분위기» 고르기 + 되돌리기 · 왼쪽 사진 위 **색이 채워진 원 손잡이**(흰 테) ·
 *     끄는 동안 손잡이가 **큰 원 돋보기**가 되고 가운데 **작은 네모**가 따는 자리 · 오른쪽 **큰 색 띠 다섯**에 HEX + 복사.
 *   - **쿨러스 이미지 피커**: 같은 구조에 **색 개수 ±**.
 * 여기서 더한 것: 색 띠마다 **그 자리를 키운 원 돋보기**(사람이 짚은 «원 돋보기 + 원색 네모») · 색 이름(어림) · 사진 속 비율 ·
 * 간판 조합 · 색 카드 이미지 · 에디터로 사진째 넘기기.
 *
 * 🔴 **사진은 이 브라우저 밖으로 안 나갑니다**(가게 사진과 같은 규칙) — 캔버스에서 읽고, 에디터로도 같은 탭 안에서만 건넵니다.
 */

type Hist = { past: Spot[][]; now: Spot[]; future: Spot[][] };

/** 원 돋보기의 배율 — 화면에 보이는 사진 크기 대비 */
const LOUPE_ZOOM = 4;
const LOUPE_PX = 132;

export default function ColorStudio({ base }: { base: string }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [src, setSrc] = useState("");
  const [nat, setNat] = useState({ w: 0, h: 0 });
  const [img, setImg] = useState<ImageData | null>(null);
  const [mood, setMood] = useState<Mood>("area");
  const [count, setCount] = useState(5);
  const [noSky, setNoSky] = useState(true);
  const [hist, setHist] = useState<Hist>({ past: [], now: [], future: [] });
  const spots = hist.now;
  const [sel, setSel] = useState(0);
  const [drag, setDrag] = useState<number | null>(null);
  const [err, setErr] = useState("");
  const [note, setNote] = useState("");
  const imgRef = useRef<HTMLImageElement>(null);
  const [disp, setDisp] = useState({ w: 0, h: 0 });

  /* ---------------------------------------------------------- 사진 받기 (고르기·끌어다 놓기·붙여넣기) */
  const take = useCallback((f: File) => {
    setErr("");
    if (!f.type.startsWith("image/")) return setErr("사진 파일(JPG·PNG·WEBP)만 됩니다.");
    setFile(f);
    setSrc((old) => {
      if (old) URL.revokeObjectURL(old);
      return URL.createObjectURL(f);
    });
  }, []);

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const f = [...(e.clipboardData?.files ?? [])].find((x) => x.type.startsWith("image/"));
      if (f) take(f);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [take]);

  // 색은 가로 1,200px 로 줄인 사진에서 땁니다(돋보기는 원본 그대로 보여 줍니다)
  useEffect(() => {
    if (!file) return;
    let alive = true;
    imageDataOf(file, 1200)
      .then((d) => alive && setImg(d))
      .catch((e) => alive && setErr((e as Error).message));
    return () => {
      alive = false;
    };
  }, [file]);

  /** 하늘로 보고 빼는 부분 — 사진 위 가장자리에 이어진 푸른·매끈한 밝은 덩어리(palette.ts `cells`) */
  const sky = useMemo(() => (img ? skyShare(img) : 0), [img]);

  /* ---------------------------------------------------------- 자리 고르기 — 사진·분위기·개수·하늘 빼기가 바뀌면 다시 */
  useEffect(() => {
    if (!img) return;
    const t = setTimeout(() => {
      const s = pickSpots(img, count, mood, noSky);
      setHist((h) => ({ past: h.now.length ? [...h.past.slice(-40), h.now] : h.past, now: s, future: [] }));
      setSel(0);
      setNote(s.length < count ? `이 사진에서는 서로 다른 색을 ${s.length}개까지만 찾았습니다.` : "");
    }, 60);
    return () => clearTimeout(t);
  }, [img, mood, count, noSky]);

  // 화면에 보이는 사진 크기 — 돋보기 배율과 손잡이 자리를 여기서 셉니다
  useLayoutEffect(() => {
    const el = imgRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setDisp({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, [src]);

  const undo = () => setHist((h) => (h.past.length ? { past: h.past.slice(0, -1), now: h.past[h.past.length - 1], future: [h.now, ...h.future] } : h));
  const redo = () => setHist((h) => (h.future.length ? { past: [...h.past, h.now], now: h.future[0], future: h.future.slice(1) } : h));

  /* ---------------------------------------------------------- 손잡이 끌기 */
  const dragBase = useRef<Spot[] | null>(null);
  const at = (e: { clientX: number; clientY: number }) => {
    const r = imgRef.current!.getBoundingClientRect();
    return { x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)) };
  };
  const moveTo = (i: number, p: { x: number; y: number }, done: boolean) => {
    if (!img) return;
    const hex = sampleAt(img, p.x, p.y);
    const base = dragBase.current ?? spots;
    const next = base.map((s, k) => (k === i ? { x: p.x, y: p.y, hex, share: done ? shareOf(img, hex, noSky) : s.share } : s));
    if (done) {
      setHist((h) => ({ past: [...h.past.slice(-40), base], now: next, future: [] }));
      dragBase.current = null;
    } else {
      if (!dragBase.current) dragBase.current = spots;
      setHist((h) => ({ ...h, now: next }));
    }
  };

  /* ---------------------------------------------------------- 내보내기 · 에디터로 */
  const hexes = spots.map((s) => s.hex.toUpperCase());
  const combos = suggestCombos(spots.map((s) => ({ hex: s.hex, share: s.share })));

  async function copyAll() {
    try {
      await navigator.clipboard.writeText(hexes.join(" "));
      setNote("HEX 다섯 개를 복사했습니다.");
    } catch {
      setNote("복사하지 못했습니다 — 값을 직접 골라 복사하세요.");
    }
  }

  /** 색 카드 — 사진(자리 번호) + 색 띠. 시안 시트·손님 상담에 그대로 붙이는 한 장 */
  async function saveCard() {
    if (!src || !spots.length) return;
    const im = new Image();
    im.src = src;
    await im.decode();
    const PW = 1100, PH = Math.round((im.naturalHeight / im.naturalWidth) * PW), SW = 520, H = Math.max(PH, spots.length * 130), FOOT = 64;
    const cv = document.createElement("canvas");
    cv.width = PW + SW;
    cv.height = H + FOOT;
    const c = cv.getContext("2d")!;
    c.fillStyle = "#ecebe6";
    c.fillRect(0, 0, cv.width, cv.height);
    c.drawImage(im, 0, (H - PH) / 2, PW, PH);
    const font = "'Malgun Gothic','Apple SD Gothic Neo',sans-serif";
    spots.forEach((s, i) => {
      const x = s.x * PW, y = (H - PH) / 2 + s.y * PH;
      c.beginPath();
      c.arc(x, y, 22, 0, Math.PI * 2);
      c.fillStyle = s.hex;
      c.fill();
      c.lineWidth = 5;
      c.strokeStyle = "#fff";
      c.stroke();
      c.fillStyle = inkOn(s.hex);
      c.font = `800 20px ${font}`;
      c.textAlign = "center";
      c.fillText(String(i + 1), x, y + 7);
      const sh = H / spots.length, sy = i * sh;
      c.fillStyle = s.hex;
      c.fillRect(PW, sy, SW, sh);
      c.fillStyle = inkOn(s.hex);
      c.textAlign = "left";
      c.font = `800 34px ${font}`;
      c.fillText(`${i + 1}  ${s.hex.toUpperCase()}`, PW + 32, sy + sh / 2 + 2);
      c.font = `500 22px ${font}`;
      c.fillText(`${colorName(s.hex)} · 사진의 ${Math.round(s.share * 100)}%`, PW + 32, sy + sh / 2 + 36);
    });
    c.fillStyle = "#fff";
    c.fillRect(0, H, cv.width, FOOT);
    c.fillStyle = "#00a79d";
    c.fillRect(0, H, cv.width, 6);
    c.fillStyle = "#0f1a19";
    c.font = `600 22px ${font}`;
    c.textAlign = "left";
    c.fillText("SUSANNA MAKER · 건물 색 — 사진 색은 날씨·노출을 탑니다. 실물 색은 견본으로 정합니다.", 28, H + 42);
    download(`건물색_${(file?.name ?? "사진").replace(/\.[^.]+$/, "")}.jpg`, cv.toDataURL("image/jpeg", 0.9));
  }

  function toEditor(withPhoto: boolean) {
    if (!spots.length) return;
    giveToEditor({ palette: spots.map((s) => s.hex), photo: withPhoto && src ? { url: src, w: nat.w, h: nat.h, name: file?.name ?? "건물" } : undefined });
    try {
      localStorage.setItem(INCOMING_PALETTE_KEY, JSON.stringify(spots.map((s) => s.hex)));
    } catch {
      /* 저장소가 막힘 — 같은 탭 안에서는 위 한 칸으로 건너갑니다 */
    }
    router.push(base);
  }

  /* ---------------------------------------------------------- 화면 */
  const loupeBg = (x: number, y: number, size: number, zoom: number) =>
    ({
      backgroundImage: `url(${src})`,
      backgroundRepeat: "no-repeat",
      backgroundSize: `${disp.w * zoom}px ${disp.h * zoom}px`,
      backgroundPosition: `${size / 2 - x * disp.w * zoom}px ${size / 2 - y * disp.h * zoom}px`,
    }) as React.CSSProperties;

  return (
    <div className="grid lg:h-full lg:grid-cols-[minmax(0,1fr)_380px]">
      <section className="flex min-w-0 flex-col lg:min-h-0">
        {/* 위 막대 — 어도비의 «색상 분위기 + 되돌리기» 자리 */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line bg-white px-3 py-2">
          <span className="text-[12px] font-bold text-ink-500">색 분위기</span>
          <div className="flex flex-wrap border border-line" role="group" aria-label="색 분위기">
            {MOODS.map((m) => (
              <button key={m.v} type="button" title={m.hint} aria-pressed={mood === m.v} onClick={() => setMood(m.v)} className={`px-2.5 py-1.5 text-[12px] font-bold ${mood === m.v ? "bg-ink text-white" : "hover:bg-paper"}`}>
                {m.label}
              </button>
            ))}
          </div>
          <span className="mx-1 hidden h-5 w-px bg-line sm:block" />
          <span className="flex items-center gap-1 text-[12px] font-bold">
            색
            <button type="button" onClick={() => setCount((c) => Math.max(3, c - 1))} disabled={count <= 3} className="h-8 w-8 border border-line text-[15px] hover:bg-paper disabled:opacity-30" aria-label="색 하나 빼기">
              −
            </button>
            <span className="w-5 text-center tabular-nums">{count}</span>
            <button type="button" onClick={() => setCount((c) => Math.min(8, c + 1))} disabled={count >= 8} className="h-8 w-8 border border-line text-[15px] hover:bg-paper disabled:opacity-30" aria-label="색 하나 더">
              +
            </button>
          </span>
          <label className="flex items-center gap-1.5 text-[12px] font-bold">
            <input type="checkbox" checked={noSky} onChange={(e) => setNoSky(e.target.checked)} className="accent-brand" />
            하늘 빼기
            {noSky && sky > 0.01 && <span className="font-normal text-ink-500">(사진의 {Math.round(sky * 100)}%)</span>}
          </label>
          <span className="ml-auto flex gap-1">
            <button type="button" onClick={undo} disabled={!hist.past.length} aria-label="되돌리기" title="되돌리기" className="h-8 w-8 border border-line text-[16px] font-bold hover:bg-paper disabled:opacity-30">
              ↶
            </button>
            <button type="button" onClick={redo} disabled={!hist.future.length} aria-label="다시 하기" title="다시 하기" className="h-8 w-8 border border-line text-[16px] font-bold hover:bg-paper disabled:opacity-30">
              ↷
            </button>
          </span>
        </div>

        <div
          className="relative flex min-h-[34vh] flex-1 items-center justify-center overflow-hidden bg-[#e4e7e6] p-3 sm:p-5 lg:min-h-0"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files?.[0];
            if (f) take(f);
          }}
        >
          {!src && (
            <label className="flex w-full max-w-md cursor-pointer flex-col items-center gap-2 border-2 border-dashed border-[#b9c1bf] bg-white px-6 py-14 text-center hover:border-brand">
              <span className="text-[16px] font-black">건물 사진을 끌어다 놓거나 눌러서 고르세요</span>
              <span className="text-[13px] text-ink-500">가게 전면이 크게 나온 낮 사진이 잘 됩니다 · 복사한 사진은 Ctrl+V</span>
              <input type="file" accept="image/*" className="sr-only" onChange={(e) => e.target.files?.[0] && take(e.target.files[0])} />
            </label>
          )}
          {src && (
            <div
              className="relative touch-none select-none"
              onPointerDown={(e) => {
                // 손잡이 말고 사진을 누르면 — 고른 색의 손잡이를 거기로 옮깁니다
                if ((e.target as Element).closest("[data-handle]") || !spots[sel]) return;
                moveTo(sel, at(e), true);
              }}
              onPointerMove={(e) => drag !== null && moveTo(drag, at(e), false)}
              onPointerUp={(e) => {
                if (drag === null) return;
                moveTo(drag, at(e), true);
                setDrag(null);
              }}
              onPointerCancel={() => {
                if (dragBase.current) setHist((h) => ({ ...h, now: dragBase.current! }));
                dragBase.current = null;
                setDrag(null);
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- 손님 브라우저 안의 임시 사진(blob:) 이라 next/image 로 못 씁니다 */}
              <img
                ref={imgRef}
                src={src}
                alt="올린 건물 사진"
                draggable={false}
                onLoad={(e) => setNat({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
                className="block max-h-[calc(100dvh-220px)] min-h-[200px] w-auto max-w-full [-webkit-user-drag:none]"
              />
              {spots.map((s, i) =>
                drag === i ? (
                  // 끄는 동안 — 큰 원 돋보기(어도비와 같은 모양). 가운데 작은 네모가 색을 따는 자리입니다
                  <div
                    key={i}
                    data-handle=""
                    className="pointer-events-none absolute rounded-full border-[4px] border-white shadow-[0_2px_12px_rgba(0,0,0,0.35)]"
                    style={{ left: `${s.x * 100}%`, top: `${s.y * 100}%`, width: LOUPE_PX, height: LOUPE_PX, transform: "translate(-50%,-50%)", ...loupeBg(s.x, s.y, LOUPE_PX - 8, LOUPE_ZOOM) }}
                  >
                    <span className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 border-2 border-white outline outline-1 outline-black/60" />
                  </div>
                ) : (
                  <button
                    key={i}
                    type="button"
                    data-handle=""
                    aria-label={`${i + 1}번 색 ${s.hex} — 끌어서 자리 옮기기`}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      try {
                        (e.currentTarget.parentElement as HTMLElement).setPointerCapture(e.pointerId);
                      } catch {
                        /* 이미 놓인 포인터 */
                      }
                      setSel(i);
                      setDrag(i);
                    }}
                    className={`absolute grid place-items-center rounded-full border-[3px] border-white text-[11px] font-black shadow-[0_1px_5px_rgba(0,0,0,0.4)] ${sel === i ? "h-10 w-10" : "h-8 w-8"}`}
                    style={{ left: `${s.x * 100}%`, top: `${s.y * 100}%`, transform: "translate(-50%,-50%)", background: s.hex, color: inkOn(s.hex), cursor: "grab" }}
                  >
                    {i + 1}
                  </button>
                ),
              )}
            </div>
          )}
        </div>
        {err && (
          <p className="border-t border-line bg-white px-4 py-2 text-[14px] font-bold text-accent-600" role="alert">
            {err}
          </p>
        )}
        <p className="border-t border-line bg-white px-4 py-2 text-[12px] leading-relaxed text-ink-500">
          동그라미를 끌면 돋보기로 그 자리를 보며 색을 고릅니다 · 사진을 누르면 고른 번호가 그 자리로 옵니다 · 사진은 이 브라우저 밖으로 나가지 않습니다.
        </p>
      </section>

      <aside className="border-l border-line bg-white lg:min-h-0 lg:overflow-y-auto">
        <div className="flex items-center justify-between px-4 pb-2 pt-3">
          <h2 className="text-[12px] font-black tracking-[0.08em] text-ink-500">우리 가게 색</h2>
          {src && (
            <label className="cursor-pointer text-[12px] font-bold text-ink-500 underline">
              다른 사진
              <input type="file" accept="image/*" className="sr-only" onChange={(e) => e.target.files?.[0] && take(e.target.files[0])} />
            </label>
          )}
        </div>

        {/* 색 띠 — 어도비의 큰 띠 다섯. 띠마다 그 자리를 살짝 키운 원 돋보기 + 원색 */}
        {!spots.length ? (
          <p className="px-4 pb-4 text-[13px] leading-relaxed text-ink-500">사진을 올리면 여기에 다섯 색이 뜹니다. 색마다 사진 속 어디에서 왔는지 돋보기로 보여 드립니다.</p>
        ) : (
          <ul>
            {spots.map((s, i) => {
              const ink = inkOn(s.hex), D = 64;
              return (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => setSel(i)}
                    aria-pressed={sel === i}
                    className="flex h-[92px] w-full items-center gap-3.5 px-4 text-left"
                    style={{ background: s.hex, color: ink, boxShadow: sel === i ? `inset 5px 0 0 ${ink === "#ffffff" ? "#ffffff" : "#0f1a19"}` : undefined }}
                  >
                    <span
                      className="relative shrink-0 rounded-full border-[3px] border-white shadow-[0_1px_4px_rgba(0,0,0,0.3)]"
                      style={{ width: D, height: D, ...loupeBg(s.x, s.y, D - 6, 2.4) }}
                      aria-hidden="true"
                    >
                      <span className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 border border-white outline outline-1 outline-black/50" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-mono text-[19px] font-black tracking-wide">{s.hex.toUpperCase()}</span>
                      <span className="block text-[12px] font-bold opacity-80">
                        {i + 1} · {colorName(s.hex)} · 사진의 {Math.max(1, Math.round(s.share * 100))}%
                      </span>
                    </span>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(s.hex.toUpperCase()).then(() => setNote(`${s.hex.toUpperCase()} 복사했습니다.`), () => setNote("복사하지 못했습니다."));
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") (e.currentTarget as HTMLElement).click();
                      }}
                      className="shrink-0 px-1 text-[12px] font-bold underline opacity-80 hover:opacity-100"
                    >
                      복사
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {!!spots.length && (
          <>
            <div className="flex gap-2 px-4 pt-3">
              <button type="button" onClick={copyAll} className="flex-1 border border-line px-2 py-2 text-[12px] font-bold hover:bg-paper">
                HEX 모두 복사
              </button>
              <button type="button" onClick={saveCard} className="flex-1 border border-line px-2 py-2 text-[12px] font-bold hover:bg-paper">
                색 카드 저장 (JPG)
              </button>
            </div>
            {note && (
              <p className="px-4 pt-2 text-[12px] font-bold text-brand-700" role="status">
                {note}
              </p>
            )}

            <section className="mt-3 border-t border-line px-4 pb-4 pt-3">
              <h2 className="mb-2 text-[12px] font-black tracking-[0.08em] text-ink-500">간판에 쓰면</h2>
              <ul className="space-y-2">
                {combos.map((c) => (
                  <li key={c.key} className="flex items-center gap-3">
                    <span className="grid h-11 w-24 shrink-0 place-items-center text-[16px] font-black tracking-[0.1em]" style={{ background: c.bg, color: c.face }} aria-hidden="true">
                      가게명
                    </span>
                    <span className="min-w-0 text-[12px] leading-snug">
                      <b className="block text-[13px]">{c.label}</b>
                      <span className={c.ratio < 3 ? "text-accent-600" : "text-ink-500"}>
                        대비 {c.ratio.toFixed(1)} · {readLabel(c.ratio)}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 space-y-2">
                <button type="button" onClick={() => toEditor(true)} className="w-full bg-brand-700 px-4 py-3 font-bold text-white hover:bg-brand-600">
                  이 사진과 색으로 간판 만들기
                </button>
                <button type="button" onClick={() => toEditor(false)} className="w-full px-4 py-2 text-[13px] font-bold text-ink-500 underline">
                  색만 가져가기 (지금 벽 그대로)
                </button>
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-ink-500">
                색 이름은 KS 계통색 이름을 흉내 낸 어림이고, 대비는 화면 글자 기준(WCAG)을 빌린 값입니다. 사진 색은 날씨·노출을 타서 실물과 다르며, 최종 색은 견본으로 정합니다.
              </p>
            </section>
          </>
        )}
      </aside>
    </div>
  );
}
