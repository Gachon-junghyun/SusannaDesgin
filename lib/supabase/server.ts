import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { SUPABASE_ANON_KEY, SUPABASE_URL, isCmsEnabled } from "./env";

/**
 * 서버 컴포넌트 · 서버 액션 · 라우트 핸들러에서 쓰는 Supabase 클라이언트.
 *
 * 로그인한 사용자 권한으로 동작합니다. 즉 DB 의 RLS 정책이 그대로 적용되므로,
 * 코드에 실수가 있어도 관리자가 아닌 사람이 데이터를 고칠 수 없습니다.
 * 이게 이 구조의 마지막 방어선입니다.
 */
export async function createClient() {
  if (!isCmsEnabled()) return null;

  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // 서버 컴포넌트에서는 쿠키를 쓸 수 없습니다.
          // 세션 갱신은 proxy.ts 가 담당하므로 여기서는 무시해도 안전합니다.
        }
      },
    },
  });
}
