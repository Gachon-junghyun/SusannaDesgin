"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { makerTour, type TourStep } from "@/config/maker";

/**
 * 처음 들어온 사람 안내 — 화면을 어둡게 덮고 해당 자리만 뚫어 말풍선을 띄웁니다 (F26-a · 2026-09-25).
 *
 * 🔴 **라이브러리를 안 썼습니다**(의존성은 사람 확인 사항 — CLAUDE.md). 필요한 건 셋뿐입니다:
 * ① `data-tour="…"` 자리 재기 ② 그 자리만 뚫린 어둠(SVG 마스크 — 구멍을 여럿 낼 수 있어서)
 * ③ 말풍선을 자리 옆 빈 곳에 놓기. 자리는 **매 프레임** 잽니다 — 패널이 접히고 펼쳐지거나(글자를 고르면
 * 오른쪽 칸이 생김) 글꼴이 늦게 도착해 모양이 바뀌어도 따라가게 하려는 것이고, 여는 동안만 돕니다.
 *
 * 문구는 `config/maker.ts` 의 `makerTour` 한 곳입니다 [A5]. 관리자·손님 문구가 갈리는 단계는 거기서 둘로 적습니다.
 * 본 적 있는지는 부르는 쪽(SignMaker)이 `localStorage` 로 판단합니다.
 */

type Box = { x: number; y: number; w: number; h: number };
const PAD = 6;
const EDGE = 16;
const GAP = 12;

export default function MakerTour({
  mode,
  onClose,
  onPrepare,
  steps = makerTour,
  noScroll = false,
}: {
  mode: "admin" | "customer";
  /** 단계 목록 — 폰은 `makerTourPhone`(아래 탭·무대를 가리킴), 넓은 화면은 `makerTour` */
  steps?: TourStep[];
  /**
   * 자리를 보이게 굴리지 않습니다 — 폰 화면은 한 화면에 다 들어 있고 바깥이 `overflow:hidden` 이라,
   * `scrollIntoView` 가 그 상자를 몰래 밀어 무대·탭 바가 화면 밖으로 밀립니다.
   */
  noScroll?: boolean;
  /** 끝까지 봤거나 건너뛰었을 때 — 둘 다 «본 것»으로 칩니다 */
  onClose: () => void;
  /** 단계가 바뀔 때 화면을 준비합니다(글자 하나 골라 두기 등) */
  onPrepare?: (step: TourStep) => void;
}) {
  const [i, setI] = useState(0);
  const [boxes, setBoxes] = useState<Box[]>([]);
  /** 첫 측정 전에는 말풍선을 숨깁니다 — 가운데에서 제자리로 «날아가는» 게 안 보이게 */
  const [ready, setReady] = useState(false);
  // 이 부품은 에디터(ssr:false) 안에서만 그려져 첫 그림부터 창 크기를 압니다
  const [vp, setVp] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }));
  const [size, setSize] = useState({ w: 340, h: 180 });
  const bubble = useRef<HTMLDivElement>(null);
  const nextBtn = useRef<HTMLButtonElement>(null);
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const step = steps[i];
  const last = i === steps.length - 1;
  const pick = (t: string | { admin: string; customer: string }) => (typeof t === "string" ? t : t[mode]);

  // 부르는 쪽의 최신 함수를 씁니다(효과는 단계가 바뀔 때만 돌게)
  const prep = useRef(onPrepare);
  const close = useRef(onClose);
  useEffect(() => {
    prep.current = onPrepare;
    close.current = onClose;
  });

  // 단계가 바뀌면: 화면 준비 → 자리가 생기면 보이게 굴림 → 다음 버튼에 초점
  useEffect(() => {
    prep.current?.(steps[i]);
    let tries = 0, raf = 0;
    const scroll = () => {
      const el = document.querySelector(`[data-tour="${steps[i].targets[0]}"]`);
      // 넓은 화면은 패널 안에서만 조금 굴리고(nearest), 폰은 페이지째 굴려 자리를 화면 위쪽에 둡니다 —
      // nearest 로 두면 자리가 화면 맨 아래에 겨우 걸리고 말풍선이 그 위를 덮었습니다(2026-09-25 375px 확인)
      // `instant` — 사이트 전체가 `scroll-behavior: smooth` 라 그대로 두면 «다음»을 빨리 누를 때 굴림이 겹쳐 끊깁니다
      if (noScroll) return;
      if (el) el.scrollIntoView({ block: window.matchMedia("(min-width: 1024px)").matches ? "nearest" : "start", inline: "nearest", behavior: "instant" });
      else if (tries++ < 20) raf = requestAnimationFrame(scroll);
    };
    raf = requestAnimationFrame(scroll);
    nextBtn.current?.focus({ preventScroll: true });
    return () => cancelAnimationFrame(raf);
  }, [i, steps, noScroll]);

  // 여는 동안 매 프레임 자리를 잽니다 — 바뀐 때만 다시 그립니다
  useEffect(() => {
    let raf = 0, prev = "";
    const tick = () => {
      const w = window.innerWidth, h = window.innerHeight;
      const found: Box[] = [];
      for (const t of step.targets) {
        const el = document.querySelector(`[data-tour="${t}"]`);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (r.width < 2 || r.height < 2) continue;
        // 화면 밖으로 나간 부분은 잘라서 그립니다(긴 패널·세로로 긴 무대)
        const x0 = Math.max(0, r.left - PAD), y0 = Math.max(0, r.top - PAD);
        const x1 = Math.min(w, r.right + PAD), y1 = Math.min(h, r.bottom + PAD);
        if (x1 - x0 > 4 && y1 - y0 > 4) found.push({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 });
      }
      const key = JSON.stringify([w, h, found.map((b) => [b.x, b.y, b.w, b.h].map(Math.round))]);
      if (key !== prev) {
        prev = key;
        setBoxes(found);
        setVp({ w, h });
        setReady(true);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [step]);

  // 말풍선 크기 — 놓을 자리를 셈하려면 알아야 합니다
  useLayoutEffect(() => {
    const el = bubble.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.offsetWidth, h: el.offsetHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // 키보드 — 창의 «잡기» 단계에서 먼저 받습니다. 에디터의 단축키(화살표 = 글자 옮기기, Delete = 지우기,
  // Ctrl+Z)가 어둠 뒤에서 몰래 돌지 않게 여기서 멈춥니다. Enter·Space 는 초점 가진 버튼에 맡깁니다.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") return;
      e.stopPropagation();
      if (e.key === "Escape") close.current();
      else if (e.key === "ArrowRight") setI((v) => Math.min(steps.length - 1, v + 1));
      else if (e.key === "ArrowLeft") setI((v) => Math.max(0, v - 1));
      else if (e.key === "Tab") {
        // 초점이 어둠 뒤 화면으로 새지 않게 말풍선 안에서 돕니다
        const els = [...(bubble.current?.querySelectorAll<HTMLElement>("button") ?? [])];
        if (!els.length) return;
        const at = els.indexOf(document.activeElement as HTMLElement);
        const to = e.shiftKey ? (at <= 0 ? els.length - 1 : at - 1) : at === els.length - 1 ? 0 : at + 1;
        els[to].focus();
      } else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [steps.length]);

  // 닫으면 초점을 원래 자리로
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    return () => before?.focus?.({ preventScroll: true });
  }, []);

  const pos = place(boxes, size, vp);
  const titleId = `tour-t-${uid}`;

  return createPortal(
    <div className="fixed inset-0 z-[70]" onPointerDown={(e) => e.stopPropagation()}>
      <svg className="absolute inset-0 h-full w-full" aria-hidden="true">
        <defs>
          <mask id={`tour-m-${uid}`}>
            <rect width="100%" height="100%" fill="#fff" />
            {boxes.map((b, k) => (
              <rect key={k} x={b.x} y={b.y} width={b.w} height={b.h} fill="#000" />
            ))}
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="#0f1a19" fillOpacity={0.6} mask={`url(#tour-m-${uid})`} />
        {boxes.map((b, k) => (
          <rect key={k} x={b.x + 1} y={b.y + 1} width={b.w - 2} height={b.h - 2} fill="none" stroke="#00a79d" strokeWidth={2} />
        ))}
      </svg>

      <div
        ref={bubble}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="absolute border-t-[3px] border-brand bg-white px-5 pb-4 pt-4 text-ink shadow-[0_12px_40px_rgba(15,26,25,0.28)]"
        style={{ left: pos.x, top: pos.y, width: Math.min(360, vp.w - EDGE * 2), visibility: ready ? "visible" : "hidden" }}
      >
        <p className="text-[12px] font-bold tabular-nums text-ink-500">
          {i + 1} / {steps.length}
        </p>
        <h2 id={titleId} className="mt-1 text-[17px] font-black text-brand-700">
          {pick(step.title)}
        </h2>
        <p className="mt-2 text-[14px] leading-relaxed" aria-live="polite">
          {pick(step.body)}
        </p>
        <div className="mt-4 flex items-center gap-2">
          <button type="button" onClick={() => close.current()} className="mr-auto py-2 text-[13px] font-bold text-ink-500 underline">
            {last ? "닫기" : "건너뛰기"}
          </button>
          {i > 0 && (
            <button type="button" onClick={() => setI(i - 1)} className="px-3 py-2 text-[14px] font-bold text-ink hover:bg-paper">
              이전
            </button>
          )}
          <button
            ref={nextBtn}
            type="button"
            onClick={() => (last ? close.current() : setI(i + 1))}
            className="bg-brand-700 px-4 py-2 text-[14px] font-bold text-white hover:bg-brand-600"
          >
            {last ? "시작하기" : "다음"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/**
 * 말풍선 자리 — 첫 자리의 아래 · 위 · 왼쪽 · 오른쪽(왼·오는 위/가운데/아래 맞춤)을 후보로 두고,
 * **강조한 자리들과 가장 덜 겹치는 곳**을 고릅니다. 같으면 앞 후보가 이깁니다.
 * 처음엔 «들어가는 첫 후보»를 썼는데, 간판 종류(오른쪽 긴 칸) 왼쪽 위에 놓인 말풍선이
 * 같은 단계에서 강조한 «주간·야간»을 덮었습니다(2026-09-25 화면 확인). 자리를 못 찾으면 가운데.
 */
function place(boxes: Box[], s: { w: number; h: number }, vp: { w: number; h: number }) {
  const w = Math.min(s.w, vp.w - EDGE * 2), h = s.h;
  const clampX = (x: number) => Math.max(EDGE, Math.min(vp.w - w - EDGE, x));
  const clampY = (y: number) => Math.max(EDGE, Math.min(vp.h - h - EDGE, y));
  const t = boxes[0];
  if (!t) return { x: (vp.w - w) / 2, y: clampY((vp.h - h) / 2) };
  const cx = clampX(t.x + t.w / 2 - w / 2);
  const ys = [clampY(t.y), clampY(t.y + t.h / 2 - h / 2), clampY(t.y + t.h - h)];
  const cands: { x: number; y: number }[] = [];
  if (t.y + t.h + GAP + h <= vp.h - EDGE) cands.push({ x: cx, y: t.y + t.h + GAP });
  if (t.y - GAP - h >= EDGE) cands.push({ x: cx, y: t.y - GAP - h });
  if (t.x - GAP - w >= EDGE) for (const y of ys) cands.push({ x: t.x - GAP - w, y });
  if (t.x + t.w + GAP + w <= vp.w - EDGE) for (const y of ys) cands.push({ x: t.x + t.w + GAP, y });
  cands.push({ x: (vp.w - w) / 2, y: vp.h - h - EDGE }, { x: (vp.w - w) / 2, y: EDGE });
  const overlap = (c: { x: number; y: number }) =>
    boxes.reduce((sum, b) => sum + Math.max(0, Math.min(c.x + w, b.x + b.w) - Math.max(c.x, b.x)) * Math.max(0, Math.min(c.y + h, b.y + b.h) - Math.max(c.y, b.y)), 0);
  let best = cands[0], bestO = overlap(best);
  for (const c of cands.slice(1)) {
    const o = overlap(c);
    if (o < bestO - 1) {
      best = c;
      bestO = o;
    }
  }
  return best;
}
