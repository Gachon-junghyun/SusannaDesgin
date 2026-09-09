"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

export type CarouselPhoto = {
  src: string;
  alt: string;
  /** 사진 위에 얹는 작은 딱지 — "3D 렌더" 처럼 «이게 뭔지» 를 밝히는 자리 */
  badge?: string;
};

/**
 * 사진을 **좌우로 넘겨 보는 슬라이더** (F24-e, 2026-09-09 신설).
 *
 * 대표님이 준 그림이 이것이었습니다 — 가운데 큰 사진, 양옆으로 다음·이전 장이 살짝
 * 걸쳐 보이고, 좌우로 돌립니다.
 *
 * 🔴 **스크롤 스냅으로 만들었습니다. 자바스크립트 애니메이션이 아닙니다.**
 *   · 폰에서 **손가락으로 미는 게 그냥 됩니다** — 직접 만들면 관성·되튐·세로 스크롤
 *     간섭을 전부 흉내 내야 하고, 흉내는 늘 티가 납니다.
 *   · 화살표를 눌러도 같은 트랙을 `scrollBy` 로 밀 뿐이라 **두 조작이 한 상태**를 씁니다.
 *   · 캐러셀 라이브러리를 넣지 않았습니다(의존성 0). 이 정도는 브라우저가 합니다.
 *
 * 🔴 **`prefers-reduced-motion` 을 지킵니다.** 그 설정이 켜져 있으면 부드럽게 미는
 * 대신 즉시 이동합니다 — 움직임이 어지러운 사람에게 캐러셀은 가장 아픈 부품입니다.
 *
 * ⚠️ **사진이 한 장이면 이 부품을 쓰지 마세요** (호출부에서 갈라 줍니다). 화살표·점이
 * 하나뿐인 슬라이더는 «더 있나?» 하고 누르게 만드는 빈 약속입니다.
 *
 * 접근성: 트랙이 `tabIndex=0` 이라 키보드로 좌우 스크롤이 되고, 화살표 버튼에는
 * 이름을 붙였습니다. 점(dot)은 장식이 아니라 **누르면 그 장으로 가는 버튼**입니다.
 */
export default function PhotoCarousel({
  photos,
  className = "",
}: {
  photos: CarouselPhoto[];
  className?: string;
}) {
  const trackRef = useRef<HTMLUListElement>(null);
  const [index, setIndex] = useState(0);
  const count = photos.length;

  /** 지금 어느 장이 가운데인지 — 스크롤 위치에서 거꾸로 읽습니다(상태를 두 벌 두지 않으려고) */
  const onScroll = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const slide = el.scrollWidth / count;
    setIndex(Math.min(count - 1, Math.max(0, Math.round(el.scrollLeft / slide))));
  }, [count]);

  const goTo = useCallback((i: number) => {
    const el = trackRef.current;
    if (!el) return;
    const slide = el.scrollWidth / el.children.length;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ left: slide * i, behavior: reduce ? "auto" : "smooth" });
  }, []);

  const move = useCallback(
    (dir: -1 | 1) => goTo(Math.min(count - 1, Math.max(0, index + dir))),
    [count, goTo, index]
  );

  /** 좌우 방향키 — 트랙에 포커스가 있을 때만 (페이지 전체를 가로채지 않습니다) */
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        move(1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        move(-1);
      }
    };
    el.addEventListener("keydown", onKey);
    return () => el.removeEventListener("keydown", onKey);
  }, [move]);

  const atStart = index === 0;
  const atEnd = index === count - 1;

  return (
    <div className={`relative ${className}`}>
      <ul
        ref={trackRef}
        onScroll={onScroll}
        tabIndex={0}
        aria-label="시공 사진"
        className="
          flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth
          rounded-2xl outline-none
          [-ms-overflow-style:none] [scrollbar-width:none]
          focus-visible:ring-2 focus-visible:ring-brand/40
          [&::-webkit-scrollbar]:hidden
        "
      >
        {photos.map((p, i) => (
          <li
            key={`${p.src}-${i}`}
            /* `basis-full` — 한 장이 폭을 다 씁니다. 옆장은 `gap` 만큼만 살짝 보입니다 */
            className="relative aspect-square w-full shrink-0 basis-full snap-center overflow-hidden rounded-2xl bg-paper"
          >
            <Image
              src={p.src}
              alt={p.alt}
              fill
              sizes="(max-width: 1024px) 100vw, 600px"
              className="object-cover"
              /* 첫 장만 먼저 받습니다 — 나머지까지 우선순위를 주면 첫 장이 늦어집니다 */
              priority={i === 0}
            />
            {p.badge && (
              <span className="absolute top-3 left-3 rounded-full bg-ink/75 px-3 py-1 text-[12px] font-bold text-white backdrop-blur">
                {p.badge}
              </span>
            )}
          </li>
        ))}
      </ul>

      {/* 좌우 버튼 — 손가락으로 미는 것과 «같은 트랙»을 밉니다 */}
      <button
        type="button"
        onClick={() => move(-1)}
        disabled={atStart}
        aria-label="이전 사진"
        className="absolute top-1/2 left-3 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow-lg backdrop-blur transition-opacity hover:bg-white disabled:pointer-events-none disabled:opacity-0"
      >
        <Chevron dir="left" />
      </button>
      <button
        type="button"
        onClick={() => move(1)}
        disabled={atEnd}
        aria-label="다음 사진"
        className="absolute top-1/2 right-3 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow-lg backdrop-blur transition-opacity hover:bg-white disabled:pointer-events-none disabled:opacity-0"
      >
        <Chevron dir="right" />
      </button>

      {/* 몇 장 중 몇 번째인지 — 점만 있으면 장수가 많을 때 못 셉니다 */}
      <p className="absolute right-3 bottom-3 rounded-full bg-ink/75 px-2.5 py-1 text-[12px] font-bold text-white backdrop-blur">
        {index + 1} / {count}
      </p>

      <div className="mt-3 flex justify-center gap-2">
        {photos.map((p, i) => (
          <button
            key={`dot-${p.src}-${i}`}
            type="button"
            onClick={() => goTo(i)}
            aria-label={`${i + 1}번째 사진 보기`}
            aria-current={i === index}
            className={`h-1.5 rounded-full transition-all ${
              i === index ? "w-6 bg-brand" : "w-1.5 bg-line hover:bg-ink-500"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={dir === "left" ? "-ml-0.5" : "-mr-0.5"}
    >
      <path d={dir === "left" ? "m15 18-6-6 6-6" : "m9 18 6-6-6-6"} />
    </svg>
  );
}
