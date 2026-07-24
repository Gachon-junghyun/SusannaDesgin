import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { SUPABASE_ANON_KEY, SUPABASE_URL, isCmsEnabled } from "./env";

/**
 * 공개 페이지(홈·주요실적 등)에서 콘텐츠를 읽을 때 쓰는 클라이언트.
 *
 * 일부러 쿠키를 건드리지 않습니다. 서버 컴포넌트에서 `cookies()` 를 호출하면
 * 그 페이지는 통째로 "요청마다 새로 그리는" 동적 페이지가 되어버립니다.
 * 공개 콘텐츠는 로그인과 무관하니 익명 권한으로 읽고, 페이지는 정적으로
 * 유지한 뒤 관리자가 저장할 때 `revalidatePath` 로 갱신하는 쪽이 훨씬 빠릅니다.
 *
 * RLS 의 `published = true` 정책이 걸려 있어 비공개 항목은 애초에 내려오지 않습니다.
 */
export function createPublicClient() {
  if (!isCmsEnabled()) return null;

  return createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
