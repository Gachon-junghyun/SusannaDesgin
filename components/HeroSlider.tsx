"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import Placeholder from "./Placeholder";
import QuickQuoteForm from "./QuickQuoteForm";
import type { Slide } from "@/config/content";

type SlideWithFlag = Slide & { available: boolean };

const INTERVAL = 6000;
/** 이 거리만큼 스크롤하면 히어로가 완전히 넘어갑니다 */
const FADE_DISTANCE = 520;

/**
 * 히어로 맨 위에서 휠을 살짝 굴렸을 때만 다음 섹션까지 실어 보냅니다.
 * 구간을 좁게 잡은 이유: 히어로 중간에서 읽고 있는 사람을 끌어내리면 안 되기 때문입니다.
 */
const SNAP_MAX_SCROLL = 80; // 이 픽셀 안(=사진이 거의 그대로 보이는 상태)에서만 발동
const UP_GUARD_MS = 700; // 위로 굴린 직후에는 이 시간 동안 개입하지 않음
const SNAP_MS = 780;

export default function HeroSlider({ slides }: { slides: SlideWithFlag[] }) {
  const [i, setI] = useState(0);
  const [hovering, setHovering] = useState(false);
  /**
   * 사람이 «정지» 를 눌러서 멈춘 상태.
   *
   * 마우스를 올려 멈추는 것(`hovering`)과 **일부러 나눠 둡니다.** 하나로 두면
   * 정지 버튼을 누른 뒤 마우스가 밖으로 나가는 순간 다시 돌아갑니다 — 사람이
   * 멈추라고 한 것을 화면이 되돌리는 셈이라, 정지 버튼이 있으나 마나가 됩니다.
   */
  const [stopped, setStopped] = useState(false);
  const [p, setP] = useState(0); // 스크롤 진행도 0~1
  /**
   * 움직임 줄이기 설정. **ref 가 아니라 state 입니다** — 정지 버튼을 보일지 말지가
   * 이 값에 걸려 있어서, ref 로 두면 값이 바뀌어도 화면이 다시 그려지지 않습니다.
   * 서버 렌더에는 `false`(자동 넘김 켜짐) 로 나가고 마운트 직후 실제 설정으로 맞춥니다.
   */
  const [reduced, setReduced] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const glideRef = useRef<(() => void) | null>(null);

  const go = useCallback(
    (n: number) => setI((n + slides.length) % slides.length),
    [slides.length]
  );

  // 움직임 줄이기 설정 읽기 (설정을 도중에 바꿔도 따라갑니다)
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // 자동 넘김
  useEffect(() => {
    if (hovering || stopped || reduced) return;
    const t = setInterval(() => setI((v) => (v + 1) % slides.length), INTERVAL);
    return () => clearInterval(t);
  }, [hovering, stopped, reduced, slides.length]);

  // 스크롤 진행도 — 히어로가 위로 흘러가며 다음 섹션에 자리를 내줍니다
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        setP(Math.min(1, window.scrollY / FADE_DISTANCE));
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // 휠을 조금만 굴려도 다음 섹션으로 부드럽게 미끄러집니다.
  // 히어로 상단 구간에서 '아래로' 굴렸을 때만 개입하고, 그 밖에서는 손대지 않습니다.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const section = sectionRef.current;
    const target = document.getElementById("business");
    if (!section || !target) return;

    let raf = 0;
    let animating = false;
    let cooldownUntil = 0;
    let lastUpAt = 0;

    const stop = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      animating = false;
    };

    const glide = () => {
      const header = document.querySelector("header");
      const offset = header instanceof HTMLElement ? header.offsetHeight : 0;
      const to =
        target.getBoundingClientRect().top + window.scrollY - offset;
      const from = window.scrollY;
      const dist = to - from;
      if (Math.abs(dist) < 8) return;

      stop();
      animating = true;
      const start = performance.now();

      const step = (now: number) => {
        const t = Math.min(1, (now - start) / SNAP_MS);
        // easeInOutCubic — 처음엔 스르륵, 끝에서 부드럽게 멈춤
        const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        // behavior:instant — html 의 scroll-behavior:smooth 와 겹쳐 두 번 애니메이션되는 걸 막습니다
        window.scrollTo({ top: from + dist * e, behavior: "instant" });
        if (t < 1) {
          raf = requestAnimationFrame(step);
        } else {
          raf = 0;
          animating = false;
          cooldownUntil = performance.now() + 260;
        }
      };
      raf = requestAnimationFrame(step);
    };

    glideRef.current = glide;

    /** 폼 안의 약관 스크롤박스처럼 자체 스크롤이 있는 곳에서는 개입하지 않습니다 */
    const insideScrollable = (node: EventTarget | null) => {
      let el = node instanceof Element ? node : null;
      while (el && el !== document.body) {
        const s = getComputedStyle(el);
        if (
          /(auto|scroll)/.test(s.overflowY) &&
          el.scrollHeight > el.clientHeight + 1
        ) {
          return true;
        }
        el = el.parentElement;
      }
      return false;
    };

    const onWheel = (e: WheelEvent) => {
      if (animating) {
        e.preventDefault(); // 이동 중에는 흔들리지 않게 붙잡아 둡니다
        return;
      }
      if (e.ctrlKey) return; // 확대/축소 제스처

      // 위로 굴리는 중이면 손대지 않고, 이후 잠깐은 아래로 굴려도 개입하지 않습니다.
      // (올라가다 멈춘 사람이 살짝 내렸을 뿐인데 끌려 내려가는 걸 막습니다)
      if (e.deltaY <= 0) {
        lastUpAt = performance.now();
        return;
      }
      const now = performance.now();
      if (now < cooldownUntil) return;
      if (now - lastUpAt < UP_GUARD_MS) return;

      // 사진이 거의 그대로 보이는 맨 위에서만 발동
      if (window.scrollY > SNAP_MAX_SCROLL) return;
      if (insideScrollable(e.target)) return;

      e.preventDefault();
      glide();
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("touchstart", stop, { passive: true });
    window.addEventListener("keydown", stop);

    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", stop);
      window.removeEventListener("keydown", stop);
      glideRef.current = null;
      stop();
    };
  }, []);

  const current = slides[i];
  const ease = p * p * (3 - 2 * p); // smoothstep

  return (
    <section
      ref={sectionRef}
      aria-roledescription="carousel"
      aria-label="주요 소개"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onFocusCapture={() => setHovering(true)}
      onBlurCapture={() => setHovering(false)}
      className="relative isolate min-h-[640px] overflow-hidden bg-ink md:min-h-[100svh]"
    >
      {/* 배경 — 스크롤하면 아주 살짝 당겨지며 어두워집니다 */}
      <div
        className="absolute inset-0"
        style={{
          transform: `scale(${1 + ease * 0.06})`,
          willChange: "transform",
        }}
      >
        {slides.map((s, idx) => (
          <div
            key={s.image}
            aria-hidden={idx !== i}
            className={`absolute inset-0 transition-opacity duration-[900ms] ${
              idx === i ? "opacity-100" : "opacity-0"
            }`}
          >
            {s.available ? (
              <Image
                src={s.image}
                alt=""
                fill
                priority={idx === 0}
                sizes="100vw"
                className="object-cover"
              />
            ) : (
              <Placeholder
                src={s.image}
                width={1920}
                height={1080}
                label={s.alt}
                dark
                className="h-full w-full"
              />
            )}
          </div>
        ))}
        <div className="absolute inset-0 bg-gradient-to-r from-ink/90 via-ink/65 to-ink/25" />
        <div
          className="absolute inset-0 bg-ink"
          style={{ opacity: ease * 0.55 }}
          aria-hidden="true"
        />
      </div>

      {/* 콘텐츠 */}
      <div className="wrap relative grid gap-10 pt-28 pb-24 md:min-h-[100svh] md:grid-cols-[1fr_380px] md:items-center md:pt-32 md:pb-28">
        <div
          className="text-white"
          style={{
            transform: `translate3d(0, ${-ease * 70}px, 0)`,
            opacity: 1 - ease * 1.15,
            willChange: "transform, opacity",
          }}
        >
          <p
            key={`eyebrow-${i}`}
            className="rise mb-3 text-[15px] font-black tracking-[0.3em] text-accent"
          >
            {current.eyebrow}
            {/* ⚠️ white/35 는 ink 배경에서 3.21:1 로 기준 미달입니다(장식용 슬라이드 수).
                색 톤 유지 결정에 따라 그대로 둡니다 — globals.css `@theme` 머리말 */}
            <span className="ml-2 text-white/35">/ 0{slides.length}</span>
          </p>
          <h1
            key={`title-${i}`}
            className="rise text-4xl leading-[1.15] font-black tracking-tight whitespace-pre-line md:text-6xl"
          >
            {current.title}
          </h1>
          <p
            key={`sub-${i}`}
            className="rise mt-5 max-w-lg text-base leading-relaxed text-white/75 md:text-lg"
          >
            {current.sub}
          </p>

          {/*
            인디케이터 — 막대형.

            ⚠️ **막대는 4px 이지만 버튼은 24px 입니다.** 예전에는 `<button>` 자체가
               `h-1`(4px) 이라 손가락으로 누를 수가 없었습니다(실측 15×5px).
               WCAG 2.2 «Target Size (Minimum)» 는 24×24 CSS px 를 요구합니다.
               보이는 막대는 그대로 두고 **버튼에 투명 여백만 붙여** 크기를 만듭니다 —
               막대를 두껍게 만들면 디자인이 바뀌므로 이 방식이 맞습니다.

            ⚠️ `role="tab"` 을 걷어냈습니다. 탭 역할은 `tabpanel` 과 짝이어야 하는데
               슬라이드는 패널이 아니라서, 스크린리더에 "탭 4개"라고 잘못 알려 주고
               있었습니다. 지금은 평범한 버튼 + `aria-current` 입니다.
          */}
          <div className="mt-10 flex items-center gap-3">
            <button
              type="button"
              onClick={() => go(i - 1)}
              aria-label="이전 슬라이드"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/25 text-white transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
            >
              <ChevronIcon dir="left" />
            </button>

            <div className="flex items-center gap-1.5" aria-label="슬라이드 선택">
              {slides.map((s, idx) => (
                <button
                  key={s.image}
                  type="button"
                  aria-label={`${idx + 1}번 슬라이드`}
                  aria-current={idx === i ? "true" : undefined}
                  onClick={() => go(idx)}
                  className="flex h-6 items-center px-1 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
                >
                  <span
                    aria-hidden="true"
                    className={`block h-1 rounded-full transition-all ${
                      idx === i ? "w-10 bg-brand-400" : "w-6 bg-white/30 hover:bg-white/50"
                    }`}
                  />
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => go(i + 1)}
              aria-label="다음 슬라이드"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/25 text-white transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
            >
              <ChevronIcon dir="right" />
            </button>

            {/*
              자동 넘김 정지 — 6초마다 스스로 바뀌는 화면에는 멈출 방법이 있어야 합니다.
              마우스 올리기·포커스로도 멈추지만, 그건 **손을 대고 있는 동안만** 이라
              읽는 사람이 손을 떼면 다시 움직입니다. 터치 화면에는 hover 가 아예 없습니다.
              움직임 줄이기(prefers-reduced-motion)면 처음부터 안 도니까 이 버튼도 숨깁니다.
            */}
            {!reduced && slides.length > 1 && (
              <button
                type="button"
                onClick={() => setStopped((v) => !v)}
                aria-label={stopped ? "자동 넘김 시작" : "자동 넘김 정지"}
                className="ml-1 flex h-9 w-9 items-center justify-center rounded-full border border-white/25 text-white transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
              >
                {stopped ? <PlayIcon /> : <PauseIcon />}
              </button>
            )}
          </div>
        </div>

        {/* 견적 폼 — 데스크톱은 히어로 안, 모바일은 히어로 아래 */}
        <div
          className="hidden md:block"
          style={{
            transform: `translate3d(0, ${-ease * 28}px, 0)`,
            opacity: 1 - ease * 0.9,
          }}
        >
          {/* 같은 폼이 홈에 두 벌 들어갑니다(데스크톱=여기, 모바일=히어로 아래).
              id 가 겹치면 라벨이 엉뚱한 칸을 가리키므로 접두어를 다르게 줍니다. */}
          <QuickQuoteForm idPrefix="hero" />
        </div>
      </div>

      {/* 스크롤 유도 */}
      <a
        href="#business"
        onClick={(e) => {
          // 휠로 내릴 때와 똑같은 움직임으로 맞춥니다
          if (glideRef.current) {
            e.preventDefault();
            glideRef.current();
          }
        }}
        className="absolute bottom-7 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2 text-white/70 transition-colors hover:text-white"
        style={{
          opacity: Math.max(0, 1 - p * 3.2),
          pointerEvents: p > 0.3 ? "none" : undefined,
        }}
        aria-label="아래 내용 보기"
      >
        <span className="text-[11px] font-bold tracking-[0.35em]">SCROLL</span>
        <span
          aria-hidden="true"
          className="relative block h-10 w-px overflow-hidden bg-white/25"
        >
          <span className="scroll-dot absolute inset-x-0 top-0 block h-4 bg-brand-400" />
        </span>
      </a>

      {/*
        지금 몇 번째 슬라이드인지 스크린리더에 알립니다.

        ⚠️ **자동으로 넘어가는 동안에는 알리지 않습니다**(`aria-live="off"`).
           6초마다 읽어 주면 페이지 어디를 읽고 있든 낭독이 끊깁니다 — 도움이 아니라
           방해입니다. 사람이 «이전/다음/막대» 를 눌러 넘긴 그때만 켭니다.
      */}
      <p className="sr-only" aria-live={hovering || stopped || reduced ? "polite" : "off"}>
        {i + 1} / {slides.length} — {current.alt}
      </p>
    </section>
  );
}

function ChevronIcon({ dir }: { dir: "left" | "right" }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={dir === "left" ? "M15 18l-6-6 6-6" : "M9 18l6-6-6-6"} />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5.5a1 1 0 0 1 1.5-.87l9 6.5a1 1 0 0 1 0 1.74l-9 6.5A1 1 0 0 1 8 18.5z" />
    </svg>
  );
}
