"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * 관리자 왼쪽 목록 (2026-09-25 — 사람 요청 *"관리자 페이지에도 추가할 게 많을 것 같아서 왼쪽에 리스트, 오른쪽에 창"*).
 * 수산나 메이커(MakerShell)의 왼쪽 목록과 같은 모양입니다 — 선택한 줄은 brand-100 바탕 + 왼쪽 굵은 선 + brand-700 글자.
 *
 * **새 메뉴는 여기 `GROUPS` 에 한 줄**입니다. 페이지는 `AdminShell` 로 감싸면 이 목록이 저절로 붙습니다.
 * 🔴 페이지를 새로 만들면 그 페이지에서 `requireAdmin()` 을 부르세요 — 목록에 있다고 권한이 걸리는 게 아닙니다 [A2].
 * 폰(1024px 미만)에서는 머리 아래 가로로 미는 줄이 됩니다.
 */
const GROUPS: { label: string; items: { href: string; label: string; sub?: string }[] }[] = [
  { label: "", items: [{ href: "/admin", label: "홈" }] },
  {
    label: "업무",
    items: [
      { href: "/admin/desk", label: "달력 · 할 일" },
      { href: "/admin/desk/rhythm", label: "마케팅 주기" },
      { href: "/admin/desk/links", label: "바로가기" },
    ],
  },
  { label: "손님", items: [{ href: "/admin/quotes", label: "견적 문의" }] },
  {
    label: "홈페이지",
    items: [
      { href: "/admin/hero", label: "첫 화면 사진" },
      { href: "/admin/works", label: "주요 실적" },
      { href: "/admin/content", label: "페이지 문구" },
    ],
  },
  { label: "도구", items: [{ href: "/admin/maker", label: "간판 메이커", sub: "편집기 화면으로 넘어갑니다" }] },
  { label: "관리", items: [{ href: "/admin/usage", label: "사용량", sub: "Supabase 무료 한도" }] },
];

export default function AdminNav() {
  const path = usePathname() ?? "";
  const isOn = (href: string) =>
    href === "/admin" || href === "/admin/desk" ? path === href : path === href || path.startsWith(`${href}/`);

  return (
    <nav aria-label="관리자 메뉴" className="overflow-x-auto lg:overflow-visible">
      <ul className="flex lg:block lg:py-3">
        {GROUPS.map((g) => (
          <li key={g.label || "home"} className="flex shrink-0 lg:block">
            {g.label && <p className="hidden px-5 pb-1 pt-4 text-[11px] font-black tracking-[0.08em] text-ink-500 lg:block">{g.label}</p>}
            <ul className="flex lg:block">
              {g.items.map((n) => {
                const on = isOn(n.href);
                return (
                  <li key={n.href}>
                    <Link
                      href={n.href}
                      aria-current={on ? "page" : undefined}
                      className={`block whitespace-nowrap px-4 py-3 text-[14px] font-bold lg:border-l-[3px] lg:px-5 lg:py-2.5 ${on ? "bg-brand-100 text-brand-700 lg:border-brand-700" : "text-ink hover:bg-paper lg:border-transparent"}`}
                    >
                      {n.label}
                      {n.sub && <span className="hidden text-[11px] font-normal text-ink-500 lg:block">{n.sub}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ul>
    </nav>
  );
}
