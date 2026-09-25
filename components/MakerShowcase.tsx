"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { MakerCard, SectionCopy } from "@/config/content";

/**
 * 홈 «수산나 메이커» 구역 (F30) — 청록 상담 띠 바로 위.
 *
 * 카드 줄이 **저절로 왼쪽으로 흐릅니다**(사람 요청: 운영 홈 캡처에 그은 왼쪽 화살표 세 개).
 * CSS `transform` 마키가 아니라 **진짜 가로 스크롤을 조금씩 미는** 방식입니다 — 그래야
 * 폰에서 손가락으로 밀기 · 화살표 단추 · 키보드 넘기기가 같은 줄 위에서 그대로 됩니다.
 *
 * 멈추는 때: 마우스를 올렸을 때 · 안에 초점이 있을 때 · 손으로 밀고 있을 때(뗀 뒤 잠깐) ·
 * 화면 밖일 때 · 「멈춤」을 눌렀을 때 · `prefers-reduced-motion` 일 때(이땐 아예 안 흐르고
 * 복제 줄도 숨어서 scroll-snap 으로 한 장씩 넘깁니다 — CSS `.mk-*` 는 `app/globals.css`).
 *
 * 🔴 **끝없이 흐르게 카드 줄을 두 벌 그립니다.** 두 번째 벌은 `aria-hidden` + `inert` 라
 *    화면 읽기·Tab 은 첫 벌만 지납니다. 한 벌 폭만큼 지나면 스크롤을 한 벌 폭만큼 되돌립니다.
 */

const WIDTH: Record<MakerCard["width"], string> = {
  wide: "w-[84vw] sm:w-[440px] lg:w-[540px]",
  mid: "w-[74vw] sm:w-[360px] lg:w-[410px]",
  narrow: "w-[64vw] sm:w-[290px] lg:w-[310px]",
};

/** 한 장면이 머무는 시간(초) */
const BEAT = 2.4;
/** 흐르는 속도(px/초) */
const SPEED = 36;

export default function MakerShowcase({
  copy,
  cards,
  cta,
}: {
  copy: SectionCopy;
  cards: MakerCard[];
  cta: { label: string; href: string; note?: string; beta?: string };
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const firstDup = useRef<HTMLLIElement>(null);
  const [paused, setPaused] = useState(false);
  /** 사람이 누른 「멈춤」 — 마우스·초점으로 멈춘 것과 따로 둡니다 */
  const userPaused = useRef(false);
  const hover = useRef(false);
  const focus = useRef(false);
  const holdUntil = useRef(0);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    let raf = 0;
    let last = 0;
    let pos = el.scrollLeft;
    let visible = true;
    /** 내가 마지막으로 넣은 scrollLeft — 이것과 다르면 사람이 민 것입니다 */
    let mine = el.scrollLeft;

    /** 한 벌의 폭 = 복제 벌 첫 카드와 원래 첫 카드 사이 거리 (첫 벌만 왼쪽 여백이 있어 줄 폭으로 재면 어긋납니다) */
    const half = () => {
      const d = firstDup.current;
      const a = el.querySelector<HTMLElement>("li");
      return d && a ? d.offsetLeft - a.offsetLeft : 0;
    };
    const wrap = () => {
      const h = half();
      if (h <= 0) return;
      if (el.scrollLeft >= h) {
        el.scrollLeft -= h;
      } else if (el.scrollLeft <= 0) {
        el.scrollLeft += h;
      }
    };

    const tick = (t: number) => {
      raf = requestAnimationFrame(tick);
      const dt = last ? Math.min(t - last, 64) / 1000 : 0;
      last = t;
      const still =
        reduce.matches || !visible || userPaused.current || hover.current || focus.current || t < holdUntil.current;
      if (Math.abs(el.scrollLeft - mine) > 1.5) {
        // 사람이 밀었거나 화살표로 넘겼습니다 — 거기서부터 이어 갑니다
        pos = el.scrollLeft;
        mine = el.scrollLeft;
      }
      if (still) return;
      pos += SPEED * dt;
      const h = half();
      if (h > 0 && pos >= h) pos -= h;
      el.scrollLeft = pos;
      mine = el.scrollLeft;
    };
    raf = requestAnimationFrame(tick);

    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting), { threshold: 0.05 });
    io.observe(el);

    const hold = (ms: number) => () => (holdUntil.current = performance.now() + ms);
    const onTouch = hold(2500);
    const onScroll = () => {
      if (!reduce.matches) wrap();
    };
    el.addEventListener("pointerdown", onTouch, { passive: true });
    el.addEventListener("touchmove", onTouch, { passive: true });
    el.addEventListener("wheel", onTouch, { passive: true });
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      el.removeEventListener("pointerdown", onTouch);
      el.removeEventListener("touchmove", onTouch);
      el.removeEventListener("wheel", onTouch);
      el.removeEventListener("scroll", onScroll);
    };
  }, []);

  /** 화살표 — 카드 한 장만큼. 넘긴 뒤 잠깐 멈췄다가 다시 흐릅니다 */
  const step = (dir: 1 | -1) => {
    const el = scroller.current;
    if (!el) return;
    holdUntil.current = performance.now() + 4000;
    const card = el.querySelector<HTMLElement>("li");
    el.scrollBy({ left: dir * ((card?.offsetWidth ?? 360) + 20), behavior: "smooth" });
  };

  const toggle = () => {
    userPaused.current = !userPaused.current;
    setPaused(userPaused.current);
  };

  const [head, ...rest] = copy.title.split("\n");

  return (
    <section className="mk-section relative overflow-hidden bg-ink py-16 text-white md:py-24" aria-labelledby="home-maker-title">
      <div className="wrap flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl">
          {copy.eyebrow && (
            <p className="mb-3 text-[13px] font-black tracking-[0.25em] text-brand-400">{copy.eyebrow}</p>
          )}
          <h2 id="home-maker-title" className="text-3xl leading-tight font-black tracking-tight md:text-[42px]">
            <span className="block">{head}</span>
            {rest.length > 0 && <span className="block text-brand-400">{rest.join("\n")}</span>}
          </h2>
          {copy.desc && <p className="mt-4 text-base leading-relaxed text-white/60 md:text-lg">{copy.desc}</p>}
        </div>
        <div className="flex flex-col items-start gap-3 md:items-end">
          <Link
            href={cta.href}
            className="inline-flex items-center gap-2 rounded-full bg-brand px-7 py-4 text-lg font-black text-white transition-colors hover:bg-brand-600"
          >
            {cta.label}
            {cta.beta && <span className="-ml-1 self-start text-[11px] font-bold text-white/75">{cta.beta}</span>}
            <span aria-hidden>→</span>
          </Link>
          {cta.note && <p className="max-w-xs text-[13px] leading-relaxed text-white/50 md:text-right">{cta.note}</p>}
        </div>
      </div>

      <div
        className="relative mt-12"
        onMouseEnter={() => (hover.current = true)}
        onMouseLeave={() => (hover.current = false)}
        onFocus={() => (focus.current = true)}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) focus.current = false;
        }}
        onKeyDown={(e) => {
          // 기본 동작(40px 스크롤)이 부드러운 넘기기를 끊어서 막습니다
          if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
            e.preventDefault();
            step(e.key === "ArrowRight" ? 1 : -1);
          }
        }}
      >
        <div
          ref={scroller}
          className="mk-rail flex overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label="수산나 메이커로 할 수 있는 일"
          role="region"
        >
          <ul className="flex shrink-0 gap-5 pr-5 pl-5 md:pl-12">
            {cards.map((c) => (
              <Card key={c.no} c={c} href={cta.href} />
            ))}
          </ul>
          <ul className="mk-dup flex shrink-0 gap-5 pr-5" aria-hidden inert>
            {cards.map((c, i) => (
              <Card key={c.no} c={c} href={cta.href} liRef={i === 0 ? firstDup : undefined} />
            ))}
          </ul>
        </div>

        {/* 양 끝이 화면 밖으로 흘러 나가는 느낌 — 누르는 걸 막지 않게 pointer-events 없음 */}
        <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-linear-to-r from-ink md:w-24" />
        <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-linear-to-l from-ink md:w-24" />
      </div>

      <div className="wrap mt-8 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={toggle}
          className="mk-motion-only mr-auto rounded-full px-3 py-2 text-[13px] font-bold text-white/60 underline-offset-4 hover:text-white hover:underline"
          aria-pressed={paused}
        >
          {paused ? "▶ 다시 흐르기" : "❚❚ 멈춤"}
        </button>
        <RoundBtn label="이전 카드" onClick={() => step(-1)}>
          ←
        </RoundBtn>
        <RoundBtn label="다음 카드" onClick={() => step(1)}>
          →
        </RoundBtn>
      </div>
    </section>
  );
}

function RoundBtn({ label, onClick, children }: { label: string; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="grid h-12 w-12 place-items-center rounded-full border border-white/20 text-xl text-white transition-colors hover:border-brand-400 hover:bg-white/5"
    >
      <span aria-hidden>{children}</span>
    </button>
  );
}

/** 카드 한 장 — 무대(바뀌는 결과)와 조작 부분(바꾼 손)이 같은 박자로 바뀝니다 */
function Card({ c, href, liRef }: { c: MakerCard; href: string; liRef?: React.Ref<HTMLLIElement> }) {
  const n = c.frames.length;
  const anim = (i: number, name = `mk-f${n}`): CSSProperties =>
    n > 1 ? { animation: `${name} ${n * BEAT}s linear ${(i - n) * BEAT}s infinite` } : {};
  const last = n - 1;
  const [t1, ...t2] = c.title.split("\n");

  return (
    <li ref={liRef} className={`mk-card shrink-0 ${WIDTH[c.width]}`}>
      <Link href={href} className="group block rounded-2xl outline-offset-4">
        <div
          className="mk-tile relative h-[230px] overflow-hidden rounded-2xl sm:h-[290px] lg:h-[320px]"
          role="img"
          aria-label={c.alt}
        >
          {/* 무대 — 실제 메이커 화면에서 벽 부분만 자른 것 */}
          <div className="mk-stage absolute top-4 right-4 w-[88%] [perspective:900px] sm:top-5 sm:right-5 sm:w-[80%]">
            <div
              className="relative aspect-[1200/517] overflow-hidden rounded-lg shadow-[0_18px_40px_-12px_rgba(0,0,0,0.6)] ring-1 ring-white/10"
              style={c.tilt ? { ...anim(last, `mk-tilt${n}`), transformOrigin: "30% 50%" } : undefined}
            >
              {c.frames.map((f, i) => (
                // eslint-disable-next-line @next/next/no-img-element -- 카드 줄이 두 벌이라 next/image 의 priority·sizes 이득이 없고, 작은 webp 라 그대로 둡니다
                <img
                  key={f.stage}
                  src={f.stage}
                  alt=""
                  width={1200}
                  height={517}
                  loading="lazy"
                  decoding="async"
                  className="mk-frame absolute inset-0 h-full w-full object-cover"
                  style={anim(i)}
                />
              ))}
              {c.handles && (
                <div aria-hidden className="mk-frame absolute inset-0" style={anim(last)}>
                  {c.handles.map(([x, y]) => (
                    <span key={`${x}-${y}`} className="mk-ping absolute h-6 w-6 -translate-1/2 rounded-full border-2 border-accent" style={{ left: `${x}%`, top: `${y}%` }} />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 조작 부분 — 이걸 눌러서 위 무대가 바뀌었다 */}
          <div
            className="mk-ui absolute bottom-4 left-4 grid w-[min(var(--ui),50%)] overflow-hidden rounded-lg bg-white shadow-[0_20px_44px_-10px_rgba(0,0,0,0.7)] sm:bottom-5 sm:left-5 sm:w-[min(var(--ui),58%)]"
            style={{ "--ui": `${c.uiWidth}px` } as CSSProperties}
          >
            {c.frames.map((f, i) => (
              <div key={f.ui} className="mk-frame relative col-start-1 row-start-1 self-start" style={anim(i)}>
                {/* eslint-disable-next-line @next/next/no-img-element -- 위와 같은 이유 */}
                <img src={f.ui} alt="" loading="lazy" decoding="async" className="block h-auto w-full" />
                {f.tap && (
                  <span
                    aria-hidden
                    className="mk-ping absolute h-7 w-7 -translate-1/2 rounded-full bg-brand/35 ring-2 ring-brand"
                    style={{ left: `${f.tap[0]}%`, top: `${f.tap[1]}%` }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 pr-2">
          <p className="text-[13px] font-bold tracking-wide text-brand-400">
            <span className="tabular-nums">{c.no}</span>
            <span className="mx-2 text-white/25">/</span>
            {c.label}
          </p>
          <h3 className="mt-1.5 text-lg leading-snug font-black text-white md:text-xl">
            {t1}
            {t2.length > 0 && <br />}
            {t2.join(" ")}
          </h3>
          <p className="mt-1.5 text-[14px] text-white/50">{c.desc}</p>
        </div>
      </Link>
    </li>
  );
}
