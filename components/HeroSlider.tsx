"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import Placeholder from "./Placeholder";
import Link from "next/link";
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
                // 배경이어도 alt 를 채웁니다 — 이미지 검색·AI 요약이 이 문구로 사진을 읽습니다 (2026-09-26)
                alt={s.alt}
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
        {/* 모바일 — 예전 그대로의 고른 어둠(2026-09-29 사람 결정: «휴대폰 히어로는 예전 디자인») */}
        <div className="absolute inset-0 bg-gradient-to-r from-ink/90 via-ink/65 to-ink/25 md:hidden" />
        {/* 데스크톱 — 왼쪽은 짙게(문구 자리) · 오른쪽은 사진 그대로 · 위는 메뉴 자리만 살짝 (1안, 2026-09-29) */}
        <div className="absolute inset-0 hidden bg-gradient-to-r from-ink/90 via-ink/55 via-40% to-transparent to-75% md:block" />
        <div className="absolute inset-x-0 top-0 hidden h-40 bg-gradient-to-b from-ink/60 to-transparent md:block" />
        {/* 아래도 살짝 — 오른쪽 아래 «01 ── 04»·단추가 밝은 사진(흰 채널 글자) 위에서 묻혔다(2026-09-29 캡처) */}
        <div className="absolute inset-x-0 bottom-0 hidden h-72 bg-gradient-to-t from-ink/75 to-transparent md:block" />
        <div
          className="absolute inset-0 bg-ink"
          style={{ opacity: ease * 0.55 }}
          aria-hidden="true"
        />
      </div>

      {/*
        모바일 콘텐츠 — 2026-09-29 사람 결정: «휴대폰 랜딩 히어로는 예전 디자인으로».
        1안(아래 데스크톱 블록)은 좁은 화면에서 제목이 작아지고 버튼·표시가 한 화면에 몰려서,
        휴대폰은 1안 이전의 배치(굵은 제목 + 막대 인디케이터, 견적 폼은 히어로 아래)를 그대로 씁니다.
        단추 모서리만 «먹 솔리드» 결정에 맞춰 각지게 둡니다.
        ⚠️ 두 블록이 DOM 에 같이 있고 CSS 로 하나만 보입니다(display:none 은 접근성 트리에서도 빠집니다).
           matchMedia 로 가르면 서버 렌더와 첫 화면이 어긋나 깜빡입니다.
      */}
      <div className="wrap relative pt-28 pb-24 md:hidden">
        <div
          className="text-white"
          style={{
            transform: `translate3d(0, ${-ease * 70}px, 0)`,
            opacity: 1 - ease * 1.15,
            willChange: "transform, opacity",
          }}
        >
          <p
            key={`m-eyebrow-${i}`}
            className="rise mb-3 text-[15px] font-black tracking-[0.3em] text-accent"
          >
            {current.eyebrow}
            {/* ⚠️ white/35 는 ink 배경에서 3.21:1 로 기준 미달입니다(장식용 슬라이드 수).
                색 톤 유지 결정에 따라 그대로 둡니다 — globals.css `@theme` 머리말 */}
            <span className="ml-2 text-white/35">/ 0{slides.length}</span>
          </p>
          {/* 제목이 h1 로 두 벌 있지만 화면마다 하나만 보이고, 숨은 쪽은 display:none 이라 읽히지 않습니다 */}
          <h1
            key={`m-title-${i}`}
            className="rise text-4xl leading-[1.15] font-black tracking-tight whitespace-pre-line"
          >
            {current.title}
          </h1>
          <p
            key={`m-sub-${i}`}
            className="rise mt-5 max-w-lg text-base leading-relaxed text-white/75"
          >
            {current.sub}
          </p>

          {/* 인디케이터 — 막대형. 막대는 4px 이지만 버튼은 24px(WCAG 2.2 Target Size) */}
          <div className="mt-10 flex items-center gap-3">
            <button
              type="button"
              onClick={() => go(i - 1)}
              aria-label="이전 슬라이드"
              className="flex h-9 w-9 items-center justify-center rounded-[2px] border border-white/25 text-white transition-colors active:bg-brand focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
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
                      idx === i ? "w-10 bg-brand-400" : "w-6 bg-white/30"
                    }`}
                  />
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => go(i + 1)}
              aria-label="다음 슬라이드"
              className="flex h-9 w-9 items-center justify-center rounded-[2px] border border-white/25 text-white transition-colors active:bg-brand focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
            >
              <ChevronIcon dir="right" />
            </button>
            {!reduced && slides.length > 1 && (
              <button
                type="button"
                onClick={() => setStopped((v) => !v)}
                aria-label={stopped ? "자동 넘김 시작" : "자동 넘김 정지"}
                className="ml-1 flex h-9 w-9 items-center justify-center rounded-[2px] border border-white/25 text-white transition-colors active:bg-brand focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
              >
                {stopped ? <PlayIcon /> : <PauseIcon />}
              </button>
            )}
          </div>
        </div>
      </div>

      {/*
        콘텐츠 — 2026-09-29 사람 결정(«1안 기업형 정석»의 첫 화면). 대기업 공식 홈페이지 10곳 실측의 결:
        사진을 가득 깔고 문구는 **왼쪽 아래**, 슬라이드 표시는 **오른쪽 아래 «01 ── 04»**, 제목은 크고 가늘게(400).
        근거 → reference/reference.md 부록 B.
        🔴 **데스크톱 간편 견적 폼을 뺐습니다**(사람이 고른 시안에 폼이 없음). 모바일은 page.tsx 의
           «히어로 아래 폼» 이 그대로 살아 있습니다. 대신 첫 화면에 «무료 견적 신청» 버튼을 둡니다.
      */}
      <div className="wrap relative hidden min-h-[100svh] flex-row items-end justify-between gap-10 pt-28 pb-36 md:flex">
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
            className="rise mb-5 text-[13px] font-bold tracking-[0.24em] text-brand-400"
          >
            {current.eyebrow}
          </p>
          <h1
            key={`title-${i}`}
            className="rise text-[36px] leading-[1.2] font-normal tracking-tight whitespace-pre-line sm:text-[44px] md:text-[76px]"
          >
            {current.title}
          </h1>
          <p
            key={`sub-${i}`}
            className="rise mt-6 max-w-xl text-base leading-relaxed text-white/80 md:text-[19px]"
          >
            {current.sub}
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/quote" className="btn btn-brand px-7 py-3.5">
              무료 견적 신청 <span aria-hidden="true">→</span>
            </Link>
            <Link href="/works" className="btn btn-light px-7 py-3.5">
              시공 사례 보기
            </Link>
          </div>
        </div>

        {/*
          슬라이드 표시 — «01 ── 04» 막대 + 이전·정지·다음.

          ⚠️ 예전의 «막대 버튼 네 개»(슬라이드 바로 고르기)는 뺐습니다 — 시안이 진행 막대 하나였습니다.
             이전·다음으로 모든 슬라이드에 닿으니 조작은 잃지 않습니다.
          ⚠️ **정지 버튼은 남깁니다.** 6초마다 스스로 바뀌는 화면에는 멈출 방법이 있어야 하고(F12),
             마우스 올리기로 멈추는 건 손을 댄 동안뿐이라 대신이 안 됩니다.
          ⚠️ 버튼은 36×36 — WCAG 2.2 «Target Size (Minimum)» 24×24 를 넘습니다.
        */}
        <div
          className="flex items-center gap-3 text-white"
          style={{ opacity: 1 - ease * 1.15 }}
        >
          <span className="text-[14px] tracking-[0.1em] tabular-nums">
            {String(i + 1).padStart(2, "0")}
          </span>
          <span aria-hidden="true" className="relative block h-0.5 w-32 bg-white/30 md:w-40">
            <span
              className="absolute inset-y-0 left-0 bg-white transition-[width] duration-500"
              style={{ width: `${((i + 1) / slides.length) * 100}%` }}
            />
          </span>
          {/* ⚠️ white/60 은 사진 위에서 명암비가 들쭉날쭉합니다 — 장식용 총 개수라 그대로 둡니다 */}
          <span className="text-[14px] tracking-[0.1em] text-white/60 tabular-nums">
            {String(slides.length).padStart(2, "0")}
          </span>

          <button
            type="button"
            onClick={() => go(i - 1)}
            aria-label="이전 슬라이드"
            className="ml-3 flex h-9 w-9 items-center justify-center rounded-[2px] border border-white/25 text-white transition-colors hover:border-brand hover:bg-brand focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
          >
            <ChevronIcon dir="left" />
          </button>
          {!reduced && slides.length > 1 && (
            <button
              type="button"
              onClick={() => setStopped((v) => !v)}
              aria-label={stopped ? "자동 넘김 시작" : "자동 넘김 정지"}
              className="flex h-9 w-9 items-center justify-center rounded-[2px] border border-white/25 text-white transition-colors hover:border-brand hover:bg-brand focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
            >
              {stopped ? <PlayIcon /> : <PauseIcon />}
            </button>
          )}
          <button
            type="button"
            onClick={() => go(i + 1)}
            aria-label="다음 슬라이드"
            className="flex h-9 w-9 items-center justify-center rounded-[2px] border border-white/25 text-white transition-colors hover:border-brand hover:bg-brand focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
          >
            <ChevronIcon dir="right" />
          </button>
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
