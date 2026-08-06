import Link from "next/link";

import { signOut } from "@/app/admin/actions";
import type { AdminUser } from "@/lib/auth";

const NAV = [
  { href: "/admin", label: "홈" },
  { href: "/admin/quotes", label: "견적 문의" },
  { href: "/admin/hero", label: "첫 화면 사진" },
  { href: "/admin/works", label: "주요 실적" },
  { href: "/admin/content", label: "페이지 문구" },
];

/** 관리자 화면 공통 껍데기. 각 페이지가 `requireAdmin()` 을 통과한 뒤 감싸 씁니다. */
export default function AdminShell({
  user,
  title,
  desc,
  actions,
  children,
}: {
  user: AdminUser;
  title: string;
  desc?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-line bg-white">
        <div className="wrap flex flex-wrap items-center gap-x-6 gap-y-3 py-4">
          <Link href="/admin" className="text-[15px] font-black tracking-tight">
            수산나디자인 <span className="text-brand">관리자</span>
          </Link>

          <nav className="flex gap-1">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="rounded-lg px-3 py-1.5 text-[14px] font-bold text-ink-500 transition-colors hover:bg-paper hover:text-ink"
              >
                {n.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <Link
              href="/"
              target="_blank"
              className="text-[13px] font-bold text-ink-500 underline underline-offset-4"
            >
              사이트 보기 ↗
            </Link>
            <span className="hidden text-[13px] text-ink-500 sm:inline">{user.email}</span>
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-lg border border-line px-3 py-1.5 text-[13px] font-bold transition-colors hover:bg-paper"
              >
                로그아웃
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="wrap py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight md:text-3xl">{title}</h1>
            {desc && <p className="mt-2 text-[15px] leading-relaxed text-ink-500">{desc}</p>}
          </div>
          {actions}
        </div>

        <div className="mt-8">{children}</div>
      </div>
    </div>
  );
}
