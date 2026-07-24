import Link from "next/link";
import { redirect } from "next/navigation";

import LoginForm from "@/components/admin/LoginForm";
import { getCurrentUser } from "@/lib/auth";
import { isCmsEnabled } from "@/lib/supabase/env";

/** 로그인 상태를 매번 확인해야 하므로 미리 굽지 않습니다. */
export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;

  // 이미 관리자로 로그인해 있으면 로그인 화면을 다시 보여줄 이유가 없습니다.
  // (권한 없는 계정은 error=forbidden 안내를 봐야 하므로 그대로 둡니다.)
  if (error !== "forbidden") {
    const user = await getCurrentUser();
    if (user?.role === "admin") redirect("/admin");
  }

  // 로그인 후 돌아갈 곳. 외부 주소로 튕겨 보내는 공격을 막기 위해
  // 반드시 우리 사이트의 /admin 아래 경로여야 합니다.
  const safeNext = next && next.startsWith("/admin") ? next : "/admin";

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-6 py-16">
      <div className="w-full max-w-sm">
        <Link href="/" className="text-[13px] font-bold text-ink-500 underline underline-offset-4">
          ← 사이트로 돌아가기
        </Link>

        <h1 className="mt-6 text-2xl font-black tracking-tight">
          수산나디자인 <span className="text-brand">관리자</span>
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-500">
          홈페이지 사진과 실적을 직접 바꾸실 수 있습니다.
        </p>

        {!isCmsEnabled() ? (
          <div className="mt-8 rounded-xl border border-line bg-white p-5">
            <p className="font-bold">아직 연결 전입니다</p>
            <p className="mt-2 text-[14px] leading-relaxed text-ink-500">
              Supabase 접속 정보가 설정되지 않았습니다. 프로젝트 안내서
              (<code className="rounded bg-paper px-1.5 py-0.5 text-[13px]">README.md</code>의
              &ldquo;관리자 기능 켜기&rdquo;)를 따라 <code className="rounded bg-paper px-1.5 py-0.5 text-[13px]">.env.local</code>
              을 채운 뒤 서버를 다시 시작해 주세요.
            </p>
            <p className="mt-3 text-[14px] leading-relaxed text-ink-500">
              그때까지 공개 홈페이지는 지금 내용 그대로 정상 동작합니다.
            </p>
          </div>
        ) : (
          <>
            {error === "forbidden" && (
              <p
                role="alert"
                className="mt-6 rounded-lg bg-accent/10 px-4 py-3 text-[14px] font-bold text-accent"
              >
                이 계정에는 관리 권한이 없습니다.
              </p>
            )}
            <LoginForm next={safeNext} />
          </>
        )}
      </div>
    </main>
  );
}
