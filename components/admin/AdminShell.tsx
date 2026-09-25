import Link from "next/link";

import { signOut } from "@/app/admin/actions";
import type { AdminUser } from "@/lib/auth";

import AdminNav from "./AdminNav";

/**
 * 관리자 화면 공통 껍데기. 각 페이지가 `requireAdmin()` 을 통과한 뒤 감싸 씁니다.
 *
 * 🔴 **왼쪽 목록 + 오른쪽 창** (2026-09-25 개편). 위쪽 가로 메뉴에 여섯 개가 한 줄로 서 있었는데, 사람이
 * *"관리자 페이지에도 추가할 게 많을 것 같아서 왼쪽에 리스트를 넣고 오른쪽에 창"* 으로 정했습니다 — 메이커
 * (MakerShell)와 같은 틀입니다. 메뉴 목록은 `AdminNav.tsx` 한 곳입니다.
 * 넓은 화면에서는 왼쪽 목록이 고정이고 오른쪽 창만 굴러갑니다. 폰에서는 목록이 머리 아래 가로 줄이 됩니다.
 * 페이지 쪽 사용법(`title`·`desc`·`actions`·`children`)은 그대로라 기존 화면을 고칠 필요가 없었습니다.
 */
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
    <div className="flex min-h-dvh flex-col bg-paper text-ink lg:h-dvh lg:overflow-hidden">
      <header className="flex h-12 shrink-0 items-center gap-4 bg-ink px-4 text-white lg:px-5">
        <Link href="/admin" className="whitespace-nowrap text-[15px] font-black tracking-tight">
          수산나디자인 <span className="text-brand-400">관리자</span>
        </Link>
        <div className="ml-auto flex items-center gap-4 whitespace-nowrap text-[13px] font-bold text-white/75">
          <Link href="/" target="_blank" className="hover:text-white">
            사이트 보기 ↗
          </Link>
          <span className="hidden font-normal md:inline">{user.email}</span>
          <form action={signOut}>
            <button type="submit" className="hover:text-white">
              로그아웃
            </button>
          </form>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <aside className="shrink-0 border-b border-line bg-white lg:w-56 lg:overflow-y-auto lg:border-b-0 lg:border-r">
          <AdminNav />
        </aside>

        {/* `<main id="main">` 은 루트 레이아웃이 이미 감쌉니다 — 여기서 또 쓰면 id 가 겹칩니다 */}
        <div className="min-w-0 flex-1 lg:overflow-y-auto">
          <div className="mx-auto max-w-[1280px] px-5 py-8 lg:px-10 lg:py-10">
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
      </div>
    </div>
  );
}
