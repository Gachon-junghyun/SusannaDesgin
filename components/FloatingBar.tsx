import Link from "next/link";
import { site } from "@/config/site";

/**
 * 모바일 하단 고정바 (전화 / 견적) + 데스크톱 우측 톡상담 플로팅.
 * 레퍼런스: 홍간판 상단 상시 전화, 비스퀘어 우하단 '톡상담'.
 *
 * 🔴 **모바일 띠에서 «카톡상담» 을 뺐습니다** (2026-09-09, 대표님 지시). 세 칸이
 * 두 칸이 됐고, 남은 것은 **전화 · 무료견적** 입니다. **데스크톱 우측 «톡상담» 은
 * 그대로 둡니다** — 지시가 모바일에 한정됐습니다. 카톡 링크 자체를 없앤 게 아니라
 * (`site.kakaoChannelUrl` · `/quote` 옆 카드는 그대로) 이 띠에서만 뺐습니다.
 */
export default function FloatingBar() {
  return (
    <>
      {/*
        모바일 — 아이폰 홈 인디케이터 높이만큼 아래쪽을 더 띄웁니다.
        안 띄우면 버튼의 아래 절반이 인디케이터 띠에 물려 스와이프로 먹힙니다.
        ⚠️ `app/layout.tsx` 의 `viewportFit: "cover"` 가 있어야 이 값이 0 이 아닙니다.
      */}
      <div className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-2 border-t border-line bg-white pb-[env(safe-area-inset-bottom,0px)] md:hidden">
        <a
          href={site.phoneHref}
          className="flex flex-col items-center justify-center gap-0.5 py-2.5 text-[11px] font-bold"
        >
          <PhoneIcon />
          전화문의
        </a>
        <Link
          href="/quote"
          className="flex flex-col items-center justify-center gap-0.5 bg-brand py-2.5 text-[11px] font-bold text-white"
        >
          <DocIcon />
          무료견적
        </Link>
      </div>

      {/* 데스크톱 우측 */}
      {site.kakaoChannelUrl && (
        <a
          href={site.kakaoChannelUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed right-6 bottom-6 z-40 hidden items-center gap-2 rounded-full bg-[#FEE500] px-5 py-3.5 font-bold text-[#3C1E1E] shadow-lg transition-transform hover:scale-105 md:flex"
        >
          <ChatIcon />
          톡상담
        </a>
      )}
    </>
  );
}

function PhoneIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.68 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.32 1.85.55 2.81.68A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

function DocIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
    </svg>
  );
}
