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
      aria-label={detail.title}
      className="m-auto max-h-[92dvh] w-[min(1100px,calc(100vw-24px))] max-w-none overflow-hidden bg-white p-0 text-ink backdrop:bg-ink/80"
    >
      <div className="grid max-h-[92dvh] overflow-y-auto lg:grid-cols-[1.5fr_1fr] lg:overflow-hidden">
        <div className="relative aspect-4/3 bg-ink lg:aspect-auto lg:min-h-[560px]">
          <Image src={detail.image} alt={detail.alt} fill sizes="(max-width: 1024px) 100vw, 660px" className="object-contain" />
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
