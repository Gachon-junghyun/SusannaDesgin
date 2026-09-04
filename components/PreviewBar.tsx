import Link from "next/link";

import { setPreview } from "@/app/admin/actions";
import type { PreviewState } from "@/lib/preview";

/**
 * 새 디자인 미리보기를 켜고 끄는 막대 — **관리자에게만** 보입니다 (F23).
 *
 * ⚠️ **화면 문구에 "시안" 을 쓰지 마세요.** 이 회사는 그 말을 **손님에게 내는 간판
 * 디자인 시안**이라는 뜻으로 이미 쓰고 있습니다(홈 PROCESS 의 "시안 제작"·"시안 확정").
 * 같은 화면에서 두 뜻으로 쓰이면 대표님이 "시안 모드" 를 견적 관련 기능으로 읽습니다.
 *
 * 서버 컴포넌트입니다. `<form action={서버액션}>` 만 쓰므로 **클라이언트 JS 가 0** 이고,
 * 손님 쪽 번들에는 이 파일이 아예 안 들어갑니다. `"use client"` 를 붙이지 마세요 —
 * 붙이는 순간 공개 페이지 전체가 이 부품만큼의 JS 를 더 받습니다.
 *
 * 🔴 **"지금 새 화면을 보고 있다" 를 화면에서 지우지 마세요.** 이 표시가 없으면
 * 대표님이 손님에게 보이는 화면과 새 화면을 구분하지 못한 채 판단하게 됩니다 —
 * 그게 이 기능의 유일한 위험입니다.
 *
 * ⚠️ **색은 F12 대비 규칙을 따릅니다.** 켜진 상태를 `bg-accent text-white` 로 짰다가
 * 되돌렸습니다 — 흰 글자가 주황 위에서 **3.14:1** 이라 4.5 에 못 미칩니다.
 * 지금은 주황 위에 `ink`(**5.66:1**)입니다. 산술로 계산한 값이고 브라우저로는
 * 안 쟀습니다 — 색을 만질 때 `docs/ARCHITECTURE.md` F12 의 재는 법을 따르세요.
 */
export default function PreviewBar({ state }: { state: PreviewState }) {
  /**
   * ⚠️ **데스크톱에서 `bottom-6` 으로 두지 마세요.** 개발 서버의 Next 표시등이 왼쪽
   * 아래에 앉아 "새 디자인 보는 중" 의 앞글자를 가립니다(2026-08-17 실측). 배포본에는
   * 그 표시등이 없지만, **새 디자인을 들여다보는 시간의 대부분이 개발 서버**라
   * 거기 맞춥니다. 모바일 쪽 값은 하단 고정바(`FloatingBar`)를 피하는 높이입니다.
   */
  const wrap =
    "fixed bottom-[calc(4.25rem+env(safe-area-inset-bottom,0px))] left-3 z-50 print:hidden md:bottom-20 md:left-6";

  // 켜 뒀는데 관리자 판정이 안 되는 상태. 조용히 원래 화면을 보여주면
  // "켰는데 왜 안 바뀌지" 의 원인이 화면 어디에도 남지 않습니다.
  if (state.stale) {
    return (
      <div className={wrap}>
        <div className="max-w-[19rem] rounded-xl border-2 border-accent bg-white px-4 py-3 shadow-lg">
          <p className="text-[13px] leading-relaxed text-ink">
            <strong className="font-black">새 디자인 미리보기가 켜져 있지만 로그인이 만료</strong>돼,
            지금은 손님과 같은 <strong className="font-black">원래 화면</strong>이 보이고 있습니다.
          </p>
          <Link
            href="/admin/login"
            className="mt-2 inline-flex rounded-lg bg-ink px-3 py-1.5 text-[13px] font-bold text-white"
          >
            다시 로그인
          </Link>
        </div>
      </div>
    );
  }

  if (!state.isAdmin) return null;

  return (
    <div className={wrap}>
      <form
        action={setPreview}
        className={`flex items-center gap-3 rounded-full py-2 pr-2 pl-4 shadow-lg ${
          state.on ? "bg-accent text-ink" : "bg-ink text-white"
        }`}
      >
        <input type="hidden" name="on" value={state.on ? "0" : "1"} />
        <span className="text-[13px] font-bold whitespace-nowrap">
          {state.on ? "새 디자인 보는 중" : "손님이 보는 화면"}
        </span>
        <button
          type="submit"
          className={`rounded-full px-3 py-1.5 text-[13px] font-bold whitespace-nowrap transition-opacity hover:opacity-85 ${
            state.on ? "bg-ink text-white" : "bg-white text-ink"
          }`}
        >
          {state.on ? "원래 화면으로" : "새 디자인 보기"}
        </button>
      </form>
    </div>
  );
}
