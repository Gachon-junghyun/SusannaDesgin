"use client";

import dynamic from "next/dynamic";
import { useState, type ReactNode } from "react";
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

const DetailDialog = dynamic(() => import("./DetailDialogBody"), { ssr: false });

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
