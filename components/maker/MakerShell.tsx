"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { MAKER_HELP_EVENT } from "@/config/maker";

/**
 * 수산나 메이커의 껍데기 — 상단 막대(로고) + 왼쪽 목록 + 작업 화면 (F26 · 2026-09-25).
 *
 * 🔴 **홈페이지 머리말·꼬리말을 걷어냈습니다**(사람 지시: *"상단 검색 부분을 없애고 로고를 아예 바꿔서
 * 에디터에 진짜 들어온 느낌"*). `SiteChrome` 이 `/maker` 에서 머리말·꼬리말·하단 고정바를 숨깁니다.
 *
 * 로고는 **새 심벌을 만들지 않았습니다** — 브랜드 README 가 «심벌은 사람 결정» 이라 적어 두었고, 지금 로고가
 * «청록 사각형 + 워드마크» 라 그 모양을 그대로 따랐습니다(청록 칸 안의 격자는 로고 카드 배경의 도면 그리드).
 * 이름 «SUSANNA MAKER» 는 사람이 정한 것입니다.
 *
 * 목록은 세 칸입니다. 셋째(일러스트 → 시안)는 **아직 없는 기능의 자리**라 눌리지 않게 두었습니다 —
 * 사람이 *"나중에 일러스트 파일로 고객이 보내는 초안을 자동으로 시안 따는 것도 만들 것"* 이라 해서 자리만 잡았습니다.
 */
export default function MakerShell({
  mode,
  base,
  hidden,
  nav: showNav = true,
  children,
}: {
  mode: "admin" | "customer";
  /** 이 메이커의 첫 주소 — `/maker` 또는 `/admin/maker` */
  base: string;
  /** 손님에게 아직 안 열렸는가 (미리보기로 보는 중) */
  hidden?: boolean;
  /**
   * 왼쪽 목록(에디터 · SVG 따기)을 세울지. 공유 링크(F26-b)는 `SHOW_MAKER` 가 꺼져 있으면 안 세웁니다 —
   * 목록이 가리키는 `/maker` 가 손님에게 404 라서, 누르면 막다른 길입니다.
   */
  nav?: boolean;
  children: React.ReactNode;
}) {
  const path = usePathname();
  const nav = [
    { href: base, label: "간판 에디터", sub: "글자·로고·조명·벽", icon: IconSign },
    { href: `${base}/trace`, label: "SVG 따기", sub: "그림 → 선(벡터)", icon: IconPen },
  ];

  return (
    <div className="flex min-h-dvh flex-col bg-[#eef0ef] text-ink lg:h-dvh lg:overflow-hidden">
      <header className="flex h-12 shrink-0 items-center gap-4 bg-ink px-4 text-white">
        {/* 목록을 안 세우는 화면(닫힌 메이커의 공유 링크)에선 로고도 홈으로 — `/maker` 가 손님에게 404 입니다 */}
        <Link href={showNav ? base : "/"} className="flex items-center gap-2.5" aria-label={showNav ? "수산나 메이커 처음으로" : "수산나디자인 홈으로"}>
          <MakerMark />
          <span className="whitespace-nowrap text-[15px] font-black tracking-[0.08em]">
            SUSANNA <span className="text-brand-400">MAKER</span>
          </span>
        </Link>
        {mode === "admin" && <span className="border border-white/25 px-2 py-0.5 text-[11px] font-bold text-white/80">관리자</span>}
        {hidden && <span className="hidden bg-accent px-2 py-0.5 text-[11px] font-bold text-ink md:inline">아직 손님에게 안 보임 · 미리보기</span>}
        <nav className="ml-auto flex items-center gap-4 whitespace-nowrap text-[13px] font-bold text-white/75">
          {/* 처음 온 사람 안내를 다시 엽니다(F26-a). 안내는 에디터에만 있어 «SVG 따기»에서는 안 섭니다 */}
          {path === base && (
            <button type="button" onClick={() => window.dispatchEvent(new Event(MAKER_HELP_EVENT))} className="hover:text-white">
              도움말
            </button>
          )}
          {mode === "admin" ? (
            <Link href="/admin" className="hover:text-white">관리자 홈</Link>
          ) : (
            <>
              <Link href="/quote" className="hover:text-white">견적 문의</Link>
              <Link href="/" className="hidden hover:text-white sm:inline">수산나디자인 홈</Link>
            </>
          )}
        </nav>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {showNav && (
        <aside className="shrink-0 border-b border-line bg-white lg:w-16 lg:border-b-0 lg:border-r xl:w-52">
          <ul className="flex overflow-x-auto lg:block lg:py-3">
            {nav.map((n) => {
              const on = path === n.href;
              return (
                <li key={n.href}>
                  <Link
                    href={n.href}
                    aria-current={on ? "page" : undefined}
                    title={n.label}
                    className={`flex items-center gap-3 whitespace-nowrap px-4 py-3 lg:justify-center lg:border-l-[3px] xl:justify-start ${on ? "bg-brand-100 text-brand-700 lg:border-brand-700" : "text-ink hover:bg-paper lg:border-transparent"}`}
                  >
                    <n.icon />
                    <span className="lg:hidden xl:block">
                      <span className="block text-[14px] font-bold">{n.label}</span>
                      <span className="hidden text-[11px] text-ink-500 xl:block">{n.sub}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
            <li>
              <span className="flex cursor-not-allowed items-center gap-3 whitespace-nowrap px-4 py-3 text-ink-500 lg:justify-center lg:border-l-[3px] lg:border-transparent xl:justify-start" aria-disabled="true" title="일러스트 → 시안 (만드는 중)">
                <IconFile />
                <span className="lg:hidden xl:block">
                  <span className="block text-[14px] font-bold">
                    일러스트 → 시안 <span className="ml-1 text-[10px] font-bold text-accent-600">준비 중</span>
                  </span>
                  <span className="hidden text-[11px] xl:block">AI·PDF 초안을 시안으로</span>
                </span>
              </span>
            </li>
          </ul>
        </aside>
        )}
        {/* `<main id="main">` 은 루트 레이아웃이 이미 감쌉니다 — 겹치던 id 를 2026-09-25 에 걷어냈습니다 */}
        <div className="min-h-0 min-w-0 flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}

/** 청록 칸 + 도면 격자 — 지금 로고의 «청록 사각형»을 그대로 따른 표식 (새 심벌이 아닙니다) */
function MakerMark() {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
      <rect width="26" height="26" fill="#00a79d" />
      <path d="M6.5 0V26M13 0V26M19.5 0V26M0 6.5H26M0 13H26M0 19.5H26" stroke="#fff" strokeOpacity=".22" strokeWidth=".8" />
      <path d="M7 17.5c1.2 1.4 2.9 2 4.6 2 2.3 0 3.9-1.1 3.9-2.9 0-4-8-2.3-8-6.4 0-1.7 1.5-3 3.8-3 1.5 0 2.9.5 3.9 1.5" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="square" />
    </svg>
  );
}

const icon = "h-5 w-5 shrink-0";
function IconSign() {
  return (
    <svg className={icon} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <rect x="2" y="5" width="16" height="9" />
      <path d="M5 9.5h10M6 17h8" />
    </svg>
  );
}
function IconPen() {
  return (
    <svg className={icon} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M3 17l3.5-1 9-9L13 4.5l-9 9L3 17z" />
      <circle cx="3.5" cy="3.5" r="1.5" />
      <circle cx="16.5" cy="16.5" r="1.5" />
      <path d="M5 3.5c6 0 11.5 5.5 11.5 11.5" strokeDasharray="2 2" />
    </svg>
  );
}
function IconFile() {
  return (
    <svg className={icon} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M5 2h7l4 4v12H5z" />
      <path d="M12 2v4h4M8 11h5M8 14h5" />
    </svg>
  );
}
