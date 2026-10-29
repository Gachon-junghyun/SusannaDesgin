"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import Placeholder from "./Placeholder";

export type ProcessPanel = {
  no: string;
  title: string;
  lines: string[];
  image: string;
  alt: string;
  available: boolean;
};

/**
 * 홈 «제작 공정» 사진 패널 (F35, 2026-10-27 사람 스케치).
 *
 * 첫 화면(`HeroSlider`)과 같은 문법 — **사진을 가득 깔고 그 위에 글자를 얹습니다.**
 * 제목은 가는 400, 등장은 `rise` 와 같은 곡선(0.16, 1, 0.3, 1). «STEP 01» 눈금 글자는 뺐습니다(같은 날 사람: «step 은 지저분해서 지워»).
 *
 * - **PC(lg 이상) — 세로 기둥 다섯 개.** 마우스를 올리거나(키보드는 초점) 누른 기둥이 옆으로 넓어지고
 *   나머지는 좁아집니다(스케치의 ←·→). 좁은 기둥은 제목을 세로쓰기로 세웁니다.
 *   기둥 높이는 고정이라 넓어져도 아래 내용이 밀리지 않습니다.
 * - **휴대폰·태블릿 세로 — 옆으로 넘기는 슬라이드 다섯 장**(2026-10-27 사람 결정: «옆으로 넘겨지는 랜딩페이지 같은
 *   레이아웃»). 한 장이 화면 폭을 다 쓰고, 손가락으로 넘기면 한 장씩 딱 멈춥니다(`scroll-snap`).
 *   첫 화면 휴대폰 판과 같은 막대 표시·이전·정지·다음 단추를 아래에 둡니다.
 *   🟢 **첫 화면처럼 6초마다 저절로 넘어갑니다**(같은 날 사람 결정: «랜딩 페이지처럼 그냥 넘어가는 걸로»).
 *   화면에 보일 때만 돌고, 손가락이 닿아 있는 동안·정지를 누른 뒤·움직임 줄이기 설정에서는 멈춥니다(F12 와 같은 규칙).
 *   그 전 판(가로 띠 다섯 장을 세로로 쌓기)은 글이 사진을 덮어 사람·간판이 가렸습니다.
 *
 * 🔴 **글은 전부 HTML 에 있습니다.** 좁은 기둥의 할 일은 투명하게 둘 뿐 지우지 않습니다 —
 *    검색·스크린리더가 다섯 단계를 다 읽습니다(`HeroSlider` 의 `SlideStack` 과 같은 이유).
 */
/** 첫 화면 `HeroSlider` 의 INTERVAL 과 같은 값 */
const SLIDE_MS = 6000;

export default function ProcessPanels({ panels }: { panels: ProcessPanel[] }) {
  const [active, setActive] = useState(0);
  const [slide, setSlide] = useState(0);
  const railRef = useRef<HTMLOListElement>(null);

  // 휴대폰 — 지금 몇 번째 장인지는 가로 스크롤 위치로 셉니다(넘기는 손가락이 기준)
  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        setSlide(Math.round(rail.scrollLeft / Math.max(1, rail.clientWidth)));
      });
    };
    rail.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      rail.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const goSlide = (n: number) => {
    const rail = railRef.current;
    if (!rail) return;
    const to = (n + panels.length) % panels.length;
    rail.scrollTo({ left: to * rail.clientWidth, behavior: "smooth" });
  };

  // 휴대폰 — 첫 화면(HeroSlider)과 같은 6초 자동 넘김. 보일 때만, 손이 닿은 동안·정지·움직임 줄이기에선 멈춘다
  const [stopped, setStopped] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [visible, setVisible] = useState(false);
  const [touching, setTouching] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    const rail = railRef.current;
    const io = rail ? new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.5 }) : null;
    if (rail && io) io.observe(rail);
    return () => {
      mq.removeEventListener("change", sync);
      io?.disconnect();
    };
  }, []);
  useEffect(() => {
    if (stopped || reduced || !visible || touching) return;
    const t = setTimeout(() => goSlide(slide + 1), SLIDE_MS);
    return () => clearTimeout(t);
    // goSlide 는 렌더마다 새로 만들어지지만 rail 과 panels.length 만 본다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slide, stopped, reduced, visible, touching]);

  return (
    <>
      {/* PC — 세로 기둥. `@container` 로 줄 폭을 재서 넓은 기둥의 글 폭을 미리 고정합니다(넓어지는 동안 글이 다시 흐르지 않게) */}
      {/* 높이는 `.process-rail-h`(globals.css) — 머리띠 아래 한 화면에 구역 전체가 들어오도록 화면 높이에서 계산(2026-10-29).
          기둥 사이 14px 틈 = 주요 실적 사진 칸 사이(HomeWorks gap-3.5)와 같은 값(같은 날 사람: «주요실적 각 네모 여백 가져다가 프로세스에도») */}
      <ol className="@container process-rail-h hidden gap-3.5 lg:flex">
        {panels.map((p, idx) => {
          const on = idx === active;
          return (
            <li
              key={p.no || idx}
              onMouseEnter={() => setActive(idx)}
              className="relative min-w-0 overflow-hidden bg-ink transition-[flex-grow] duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none"
              style={{ flexGrow: on ? 3.2 : 1, flexBasis: 0 }}
            >
              <PanelImage p={p} on={on} sizes="(min-width: 1520px) 640px, 45vw" />

              {/* 막 — 첫 화면(HeroSlider 데스크톱)과 같은 두 겹: 왼쪽(글 자리)부터 짙게 + 아래를 짙게
                  (2026-10-29 사람: «글자 있는 곳은 랜딩페이지 그라데이션이랑 통일성 맞춰서 잘 보이게»). 좁은 기둥은 아래 ink/45 를 한 겹 더 */}
              <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-ink/90 via-ink/55 via-40% to-transparent to-75%" />
              <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-72 bg-gradient-to-t from-ink/75 to-transparent" />
              <div
                aria-hidden="true"
                className={`absolute inset-0 bg-ink transition-opacity duration-700 ${on ? "opacity-0" : "opacity-45"}`}
              />

              <button
                type="button"
                onClick={() => setActive(idx)}
                onFocus={() => setActive(idx)}
                aria-expanded={on}
                aria-controls={`process-panel-${idx}`}
                aria-label={`${p.no}단계 ${p.title}`}
                className="absolute inset-0 z-10 focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-white"
              />


              {/* 좁은 기둥 — 세로쓰기 제목 */}
              <p
                aria-hidden="true"
                className={`absolute bottom-8 left-7 text-[24px] leading-none tracking-[0.08em] text-white transition-opacity duration-500 [writing-mode:vertical-rl] ${
                  on ? "opacity-0" : "opacity-100 delay-300"
                }`}
              >
                {p.title}
              </p>

              {/* 넓은 기둥 — 제목 + 할 일. 폭 = (줄 폭 − 틈 넷 56px) × 3.2/7.2 − 좌우 여백. 단계 수가 바뀌면 틈 수(56px)도 같이 */}
              <div
                id={`process-panel-${idx}`}
                className={`absolute bottom-9 left-9 w-[calc((100cqw_-_56px)*3.2/7.2_-_72px)] text-white transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                  on ? "translate-y-0 opacity-100 delay-300" : "pointer-events-none translate-y-[18px] opacity-0"
                }`}
              >
                <h3 className="text-[28px] leading-tight font-normal tracking-tight xl:text-[34px]">{p.title}</h3>
                <ul className="mt-5 space-y-2 border-t border-white/20 pt-5">
                  {p.lines.map((line) => (
                    <li key={line} className="text-base leading-relaxed text-white/80">
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
            </li>
          );
        })}
      </ol>

      {/* 휴대폰·태블릿 — 옆으로 넘기는 슬라이드 */}
      <div className="relative lg:hidden" aria-roledescription="carousel" aria-label="제작 공정 다섯 단계">
        <ol
          ref={railRef}
          onTouchStart={() => setTouching(true)}
          onTouchEnd={() => setTouching(false)}
          onTouchCancel={() => setTouching(false)}
          className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {panels.map((p, idx) => {
            const on = idx === slide;
            return (
              <li
                key={p.no || idx}
                aria-roledescription="slide"
                aria-label={`${idx + 1} / ${panels.length}`}
                className="relative h-[min(82svh,640px)] min-h-[520px] w-full shrink-0 snap-start overflow-hidden bg-ink"
              >
                <PanelImage p={p} on={on} sizes="(min-width: 1024px) 1px, 100vw" />
                {/* 첫 화면 휴대폰 판과 같은 가로 막(왼쪽 짙게) + 글·단추 자리인 아래를 짙게 (2026-10-29 «랜딩 그라데이션과 통일») */}
                <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-ink/90 via-ink/65 to-ink/25" />
                <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-72 bg-gradient-to-t from-ink/75 to-transparent" />
                <div
                  className={`absolute inset-x-5 bottom-24 text-white transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] sm:inset-x-8 ${
                    on ? "translate-y-0 opacity-100" : "translate-y-[18px] opacity-0"
                  }`}
                >
                  <h3 className="text-[28px] leading-tight font-normal tracking-tight">{p.title}</h3>
                  <ul className="mt-4 space-y-1.5 border-t border-white/20 pt-4">
                    {p.lines.map((line) => (
                      <li key={line} className="text-[15px] leading-relaxed text-white/80">
                        {line}
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            );
          })}
        </ol>

        {/* 표시 — 첫 화면 휴대폰 판과 같은 막대 + 이전·다음(버튼 36px, 막대 버튼 24px 높이) */}
        <div className="absolute inset-x-5 bottom-7 flex items-center gap-3 sm:inset-x-8">
          <button
            type="button"
            onClick={() => goSlide(slide - 1)}
            aria-label="이전 단계"
            className="flex h-9 w-9 items-center justify-center rounded-[2px] border border-white/25 text-white transition-colors active:bg-brand"
          >
            <Chevron dir="left" />
          </button>
          <div className="flex items-center gap-1.5">
            {panels.map((p, idx) => (
              <button
                key={p.no || idx}
                type="button"
                onClick={() => goSlide(idx)}
                aria-label={`${idx + 1}단계 ${p.title}`}
                aria-current={idx === slide ? "true" : undefined}
                className="flex h-6 items-center px-1"
              >
                <span
                  aria-hidden="true"
                  className={`block h-1 rounded-full transition-all ${idx === slide ? "w-10 bg-brand-400" : "w-6 bg-white/30"}`}
                />
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => goSlide(slide + 1)}
            aria-label="다음 단계"
            className="flex h-9 w-9 items-center justify-center rounded-[2px] border border-white/25 text-white transition-colors active:bg-brand"
          >
            <Chevron dir="right" />
          </button>
          {!reduced && (
            <button
              type="button"
              onClick={() => setStopped((v) => !v)}
              aria-label={stopped ? "자동 넘김 시작" : "자동 넘김 정지"}
              className="ml-1 flex h-9 w-9 items-center justify-center rounded-[2px] border border-white/25 text-white transition-colors active:bg-brand"
            >
              {stopped ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5a1 1 0 0 1 1.5-.87l9 6.5a1 1 0 0 1 0 1.74l-9 6.5A1 1 0 0 1 8 18.5z" /></svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
              )}
            </button>
          )}
        </div>
      </div>
    </>
  );
}

/** 넓어진 기둥·밝아진 띠의 사진은 첫 화면처럼 살짝 당겨졌다 제자리로 옵니다 */
function PanelImage({ p, on, sizes }: { p: ProcessPanel; on: boolean; sizes: string }) {
  return (
    <div
      className={`absolute inset-0 transition-transform duration-[1400ms] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none ${
        on ? "scale-100" : "scale-[1.08]"
      }`}
    >
      {p.available ? (
        <Image src={p.image} alt={p.alt} fill sizes={sizes} className="object-cover object-[50%_30%]" />
      ) : (
        <Placeholder src={p.image} width={1200} height={900} label={p.alt} dark className="h-full w-full" />
      )}
    </div>
  );
}

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={dir === "left" ? "M15 18l-6-6 6-6" : "M9 18l6-6-6-6"} />
    </svg>
  );
}
