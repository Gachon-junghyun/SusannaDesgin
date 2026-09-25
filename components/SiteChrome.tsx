"use client";

import { usePathname } from "next/navigation";

/**
 * 공개 사이트의 머리말·꼬리말을 감쌉니다.
 * 관리자 화면(/admin)에서는 이 껍데기를 걷어내 관리 UI 만 보이게 합니다.
 * 간판 메이커(/maker, F26)도 걷어냅니다 — 편집기는 자기 상단 막대(SUSANNA MAKER)를 쓰고 화면을 통째로 씁니다.
 */
export default function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin") || pathname === "/maker" || pathname?.startsWith("/maker/")) return null;
  return <>{children}</>;
}
