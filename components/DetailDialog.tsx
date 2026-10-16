"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { trackDetailOpen } from "@/lib/analytics";

/**
 * 눌러서 크게 보기 (F32, 2026-10-11) — 손님이 «눌렀는데 아무 일도 없던» 자리에 붙입니다.
 *
 * 근거: Clarity 30일 히트맵(형제 저장소 susanna `VISITOR_LIKES_2026-10-11.md`) — /signs PC 클릭 84%,
 * /sign-design 74% 가 반응 없는 클릭이었고, 홈·/works 실적 카드도 휴대폰에서 눌리고 끝났습니다.
 * 사진 크게 + 이미 화면에 있는 설명 + 다음 갈 곳(문의·실제 사진) 버튼, 오른쪽 위 ✕ 로 닫습니다.
 *
 * - **새 문구를 지어내지 않습니다.** 팝업 안의 글은 그 카드에 이미 있던 글 그대로입니다 [A5·A1].
 * - 손님에게 열지 말지는 `SHOW_DETAIL_POPUPS` 한 값 + 관리자 미리보기(`preview.on`)입니다.
 *   꺼져 있으면 `DetailTrigger` 가 **원래 마크업을 그대로** 내보냅니다 — 손님 HTML 은 한 글자도 안 바뀝니다.
 * - 브라우저 기본 `<dialog>` 를 씁니다: Esc 로 닫힘 · 뒤 화면 포커스 잠금 · 스크린리더가 대화상자로 읽음.
 */

export type DetailAction = { href: string; label: string; quiet?: boolean };

/** 넘겨 보는 사진 한 장 — `caption` 은 사진 아래 작은 글씨(예: «시공 사례 · 자자고호텔») */
export type DetailSlide = { image: string; alt: string; caption?: string };

export type Detail = {
  /** 통계용 종류 — GA `detail_open` 의 `detail_type` */
  kind: "work" | "sign_design" | "sign_type";
  image: string;
  alt: string;
  eyebrow?: string;
  title: string;
  /** 첫 줄로 강조할 문장 (눌린 줄 등) */
  lead?: string;
  lines?: string[];
  meta?: string;
  actions: DetailAction[];
  /**
   * 옆으로 넘겨 보는 사진들 (2026-10-16, /sign-design 시공 사례). 두 장 이상일 때만 넘기기가 생기고,
   * 첫 장은 보통 `image` 와 같은 사진입니다. 없으면 `image` 한 장만 보입니다.
   */
  gallery?: DetailSlide[];
};

export function DetailTrigger({
  enabled,
  detail,
  className,
  children,
}: {
  enabled: boolean;
  detail: Detail;
  className?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  if (!enabled) return <>{children}</>;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          trackDetailOpen(detail.kind, detail.title);
        }}
        aria-haspopup="dialog"
        aria-label={`${detail.title} 크게 보기`}
        className={`block w-full cursor-zoom-in text-left ${className ?? ""}`}
      >
        {children}
      </button>
      {open && <DetailDialog detail={detail} onClose={() => setOpen(false)} />}
    </>
  );
}

function DetailDialog({ detail, onClose }: { detail: Detail; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const slides: DetailSlide[] =
    detail.gallery && detail.gallery.length > 0 ? detail.gallery : [{ image: detail.image, alt: detail.alt }];
  const many = slides.length > 1;
  const [at, setAt] = useState(0);
  const go = (step: number) => setAt((i) => (i + step + slides.length) % slides.length);
  /** 휴대폰에서 옆으로 밀기 — 가로로 40px 넘게, 세로보다 크게 움직였을 때만 넘깁니다 */
  const touch = useRef<{ x: number; y: number } | null>(null);
  const slide = slides[at];

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    d.showModal();
    // 뒤 페이지가 같이 굴러가지 않게
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = prev;
    };
  }, []);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      // 바깥(어두운 막)을 누르면 닫힘 — 안쪽 패널을 누른 건 무시
      onClick={(e) => {
        if (e.target === e.currentTarget) ref.current?.close();
      }}
      onKeyDown={(e) => {
        if (!many) return;
        if (e.key === "ArrowRight") go(1);
        else if (e.key === "ArrowLeft") go(-1);
      }}
      aria-label={detail.title}
      className="m-auto max-h-[92dvh] w-[min(1100px,calc(100vw-24px))] max-w-none overflow-hidden bg-white p-0 text-ink backdrop:bg-ink/80"
    >
      <div className="grid max-h-[92dvh] overflow-y-auto lg:grid-cols-[1.5fr_1fr] lg:overflow-hidden">
        <div
          className="relative aspect-4/3 bg-ink lg:aspect-auto lg:min-h-[560px]"
          onTouchStart={(e) => {
            const t = e.touches[0];
            touch.current = { x: t.clientX, y: t.clientY };
          }}
          onTouchEnd={(e) => {
            const s = touch.current;
            touch.current = null;
            if (!many || !s) return;
            const t = e.changedTouches[0];
            const dx = t.clientX - s.x;
            if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(t.clientY - s.y)) go(dx < 0 ? 1 : -1);
          }}
        >
          <Image
            key={slide.image}
            src={slide.image}
            alt={slide.alt}
            fill
            sizes="(max-width: 1024px) 100vw, 660px"
            className="object-contain"
          />

          {many && (
            <>
              <button
                type="button"
                onClick={() => go(-1)}
                aria-label="이전 사진"
                className="absolute top-1/2 left-2 grid h-11 w-11 -translate-y-1/2 place-items-center bg-white/85 text-xl text-ink transition-colors hover:bg-white"
              >
                <span aria-hidden="true">‹</span>
              </button>
              <button
                type="button"
                onClick={() => go(1)}
                aria-label="다음 사진"
                className="absolute top-1/2 right-2 grid h-11 w-11 -translate-y-1/2 place-items-center bg-white/85 text-xl text-ink transition-colors hover:bg-white"
              >
                <span aria-hidden="true">›</span>
              </button>
              <p
                aria-live="polite"
                className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-linear-to-t from-ink/80 to-transparent px-4 pt-8 pb-3 text-[13px] text-white"
              >
                <span>{slide.caption}</span>
                <span className="shrink-0 tabular-nums text-white/80">
                  {at + 1} / {slides.length}
                </span>
              </p>
            </>
          )}
        </div>

        <div className="px-6 pt-7 pb-6 md:px-8 md:pt-9 lg:overflow-y-auto">
          {detail.eyebrow && <p className="text-[13px] font-bold tracking-[0.18em] text-brand-700">{detail.eyebrow}</p>}
          <h2 className="mt-2 pr-10 text-2xl font-bold tracking-tight md:text-[28px]">{detail.title}</h2>
          {detail.meta && <p className="mt-2 text-[14px] text-ink-500">{detail.meta}</p>}

          {detail.lead && <p className="mt-5 border-l-2 border-brand pl-3 text-[16px] font-bold">{detail.lead}</p>}
          {detail.lines && detail.lines.length > 0 && (
            <ul className="mt-5 space-y-2">
              {detail.lines.map((l) => (
                <li key={l} className="text-[15px] leading-relaxed whitespace-pre-line text-ink-500">
                  {l}
                </li>
              ))}
            </ul>
          )}

          <div className="mt-8 flex flex-col gap-2.5">
            {detail.actions.map((a) => (
              <Link key={a.href + a.label} href={a.href} className={`btn px-6 py-3.5 ${a.quiet ? "btn-quiet" : ""}`}>
                {a.label} {!a.quiet && <span aria-hidden="true">→</span>}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => ref.current?.close()}
        aria-label="닫기"
        className="absolute top-3 right-3 grid h-11 w-11 place-items-center bg-white/90 text-2xl leading-none text-ink transition-colors hover:bg-ink hover:text-white"
      >
        <span aria-hidden="true">✕</span>
      </button>
    </dialog>
  );
}
