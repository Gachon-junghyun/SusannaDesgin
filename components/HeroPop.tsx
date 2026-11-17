"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

/**
 * /new 첫 화면 (2026-11-17) — 시안 PSD `SusannaDesigner/jobs/2026-11_수산나_그라데이션랜딩/out/hero/117-012~016`(3안 배치)을 그대로 옮긴 것.
 *
 * 사람 지시: «히어로 사진은 히어로 넘어가는 걸로» · «사진은 다 현실 사진» · «다음 페이지부터 간판 자체는 외부로 나오고 배경만 네모에 맞춰서»
 *            · «수산나디자인 글씨 색 바꾸라고»(브랜드 청록) · «new 는 광고로 전국에 보내려고 대전을 없앤 것».
 *
 * 배치: 위 한 줄(머리말·단추 | 큰 문구) → 사진 칸(가로로 긴 네모) → 가는 선 + 장 번호 → 맨 아래 SUSANNADESIGN.
 * 2장부터는 사진 칸이 바탕만 네모로 자르고, 간판(과 사람·노트북)을 오린 그림(`pop`)이 칸 윗변 위로 튀어나옵니다.
 * 오린 그림 아랫부분은 칸 안 사진과 같은 화소라 경계가 보이지 않습니다.
 *
 * 크기: 시안 1920px 화면의 px 값을 그대로 쓰고 `--u`(= 화면 폭 / 1920)로 줄입니다 — 넓은 화면·노트북에서 시안과 같은 비율.
 * 휴대폰은 문구만 글자 크기를 따로 키웁니다(사진 칸·튀어나옴·SUSANNADESIGN 은 같은 비율로 줄어듭니다).
 * 에셋은 `public/images/hero-new/` (뽑는 스크립트: SusannaDesigner …/work/export_web.py).
 */

export type PopSlide = {
  title: string;
  sub?: string;
  bg: string;
  alt: string;
  /** 칸 왼쪽 위 기준 1920 화면 px */
  pop?: { src: string; x: number; y: number; w: number; h: number };
};

const INTERVAL = 6500;
/** 사진 칸 — 시안 1920 화면 기준 */
const FRAME = { x: 76.8, w: 1766.4, h: 470 };

export default function HeroPop({
  slides,
  eyebrow,
  cta,
}: {
  slides: PopSlide[];
  eyebrow: string;
  cta: { href: string; label: string };
}) {
  const [i, setI] = useState(0);
  /** 바로 앞 장 — 새 장이 위에서 떠오르는 동안 아래에 그대로 둡니다(둘 다 반투명해져 겹쳐 보이지 않게) */
  const [prev, setPrev] = useState(-1);
  const [paused, setPaused] = useState(false);
  const n = slides.length;
  const go = useCallback(
    (d: number) =>
      setI((v) => {
        setPrev(v);
        return (v + d + n) % n;
      }),
    [n],
  );

  useEffect(() => {
    if (paused || n < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = window.setTimeout(() => go(1), INTERVAL);
    return () => window.clearTimeout(t);
  }, [i, paused, go, n]);

  const s = slides[i];
  const u = (v: number) => `calc(var(--u) * ${v})`;

  return (
    <section
      aria-roledescription="carousel"
      aria-label="수산나디자인 소개"
      className="hero-pop relative overflow-clip"
      style={{ ["--u" as string]: "calc(100vw / 1920)", paddingInline: u(FRAME.x) }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* 위 한 줄 — 머리말·단추(왼쪽) · 큰 문구(오른쪽, 오른쪽 맞춤) */}
      <div className="hp-top flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="hp-lead shrink-0">
          <p className="hp-eyebrow text-[#6e7574]">{eyebrow}</p>
          <Link href={cta.href} className="hp-cta inline-block border-b-[1.5px] border-ink font-semibold text-ink">
            {cta.label}
          </Link>
        </div>
        <div className="hp-copy md:text-right" aria-live="polite">
          {/* 장이 바뀔 때마다 다시 그려 살짝 떠오르게 */}
          <h1 key={`t${i}`} className={`hp-title hp-in font-extrabold text-ink ${s.sub ? "hp-title-s" : ""}`}>
            {s.title}
          </h1>
          {s.sub && (
            <p key={`s${i}`} className="hp-sub hp-in text-[#3b4443]">
              {s.sub}
            </p>
          )}
        </div>
      </div>

      {/* 사진 칸 + 튀어나옴 */}
      <div className="hp-frame relative" style={{ aspectRatio: `${FRAME.w} / ${FRAME.h}` }}>
        {slides.map((sl, k) => (
          <div
            key={sl.bg}
            className={`absolute inset-0 ${k === i ? "transition-opacity duration-700 ease-out" : ""}`}
            style={{ opacity: k === i || k === prev ? 1 : 0, zIndex: k === i ? 2 : k === prev ? 1 : 0 }}
            aria-hidden={k !== i}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={sl.bg}
              alt={sl.alt}
              className="absolute inset-0 h-full w-full object-cover"
              loading={k === 0 ? "eager" : "lazy"}
              fetchPriority={k === 0 ? "high" : undefined}
              draggable={false}
            />
            {sl.pop && (
              /* 그림자 — 칸 윗변 위(종이)에만 드리웁니다. 칸 안 사진까지 내려오면 회색 띠가 생깁니다(시안에서 한 번 밟음). */
              <div
                aria-hidden="true"
                className="pointer-events-none absolute left-0 w-full overflow-hidden"
                style={{ top: `${(sl.pop.y / FRAME.h) * 100 - 10}%`, height: `${(-sl.pop.y / FRAME.h) * 100 + 10}%` }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={sl.pop.src}
                  alt=""
                  className={`hp-pop hp-shadow absolute max-w-none ${k === i ? "hp-pop-on" : ""}`}
                  style={{
                    left: `${(sl.pop.x / FRAME.w) * 100}%`,
                    top: `${(10 / ((-sl.pop.y / FRAME.h) * 100 + 10)) * 100}%`,
                    width: `${(sl.pop.w / FRAME.w) * 100}%`,
                  }}
                  draggable={false}
                />
              </div>
            )}
            {sl.pop && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={sl.pop.src}
                alt=""
                aria-hidden="true"
                className={`hp-pop absolute max-w-none select-none ${k === i ? "hp-pop-on" : ""}`}
                style={{
                  left: `${(sl.pop.x / FRAME.w) * 100}%`,
                  top: `${(sl.pop.y / FRAME.h) * 100}%`,
                  width: `${(sl.pop.w / FRAME.w) * 100}%`,
                  height: `${(sl.pop.h / FRAME.h) * 100}%`,
                }}
                draggable={false}
              />
            )}
          </div>
        ))}
      </div>

      {/* 가는 선 + 장 번호·이전·다음 */}
      <div className="hp-rule relative flex items-center justify-end border-t border-ink/85">
        <div className="hp-nav flex items-center text-ink">
          <button type="button" onClick={() => go(-1)} aria-label="이전 장" className="hp-arrow text-[#6e7574] hover:text-ink">
            ←
          </button>
          <button type="button" onClick={() => go(1)} aria-label="다음 장" className="hp-arrow text-[#6e7574] hover:text-ink">
            →
          </button>
          <span className="hp-count font-semibold tabular-nums" aria-label={`${n}장 중 ${i + 1}번째`}>
            {String(i + 1).padStart(2, "0")} / {String(n).padStart(2, "0")}
          </span>
        </div>
      </div>

      {/* 맨 아래 큰 이름 — 브랜드 청록 */}
      <p className="hp-brand text-center text-brand" aria-hidden="true">
        SUSANNADESIGN
      </p>
    </section>
  );
}
