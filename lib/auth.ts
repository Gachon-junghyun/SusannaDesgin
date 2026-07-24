import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { ProfileRow } from "@/lib/supabase/types";

export type AdminUser = {
  id: string;
  email: string | null;
  role: ProfileRow["role"];
};

/**
 * 현재 로그인한 사용자와 권한을 확인합니다.
 *
 * `getUser()` 는 쿠키를 그대로 믿지 않고 Supabase 인증 서버에 토큰을 검증받습니다.
 * (`getSession()` 은 쿠키 내용을 그대로 돌려주므로 권한 판단에 쓰면 안 됩니다.)
 *
 * React `cache` 로 감싸 한 번의 렌더에서 여러 번 호출해도 요청은 한 번만 나갑니다.
 */
export const getCurrentUser = cache(async (): Promise<AdminUser | null> => {
  const supabase = await createClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, role")
    .eq("id", user.id)
    .maybeSingle<Pick<ProfileRow, "id" | "email" | "role">>();

  return {
    id: user.id,
    email: user.email ?? profile?.email ?? null,
    role: profile?.role ?? "viewer",
  };
});

/**
 * 관리자만 통과시킵니다. 아니면 로그인 화면으로 보냅니다.
 *
 * 화면(page)과 서버 액션 **양쪽 모두**에서 호출해야 합니다.
 * 화면에서만 막으면 서버 액션은 그대로 호출 가능한 공개 엔드포인트로 남습니다.
 */
export async function requireAdmin(): Promise<AdminUser> {
  const user = await getCurrentUser();

  if (!user) redirect("/admin/login");
  if (user.role !== "admin") redirect("/admin/login?error=forbidden");

  return user;
}
