import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import {
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
  isCmsEnabled,
} from "@/lib/supabase/env";

/**
 * Next.js 16 부터 middleware 는 `proxy` 로 이름이 바뀌었습니다 (동작은 동일).
 *
 * 하는 일 두 가지입니다.
 *  1. 만료가 가까운 Supabase 세션 토큰을 갱신하고 쿠키를 다시 심습니다.
 *     서버 컴포넌트는 쿠키를 쓸 수 없기 때문에 이 갱신을 할 곳이 여기뿐입니다.
 *  2. /admin 진입을 1차로 걸러 로그인 화면으로 보냅니다.
 *
 * 여기서의 검사는 어디까지나 "빠른 1차 필터"입니다. 실제 권한 판단은
 * 각 화면의 `requireAdmin()` 과 DB 의 RLS 정책이 담당합니다.
 */
export async function proxy(request: NextRequest) {
  if (!isCmsEnabled()) return NextResponse.next({ request });

  let response = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // 이 호출이 세션 갱신을 일으킵니다. 지우면 관리자가 조용히 로그아웃됩니다.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isLoginPage = pathname.startsWith("/admin/login");

  if (pathname.startsWith("/admin") && !isLoginPage && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }

  if (isLoginPage && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  /**
   * 관리자 경로에서만 돕니다.
   *
   * 흔히 쓰는 "전체 경로" 설정을 일부러 피했습니다. 그렇게 하면 회사 홈페이지를
   * 보는 방문자 한 명 한 명마다 Supabase 인증 서버로 확인 요청이 나가서,
   * 로그인과 아무 상관 없는 공개 페이지가 그만큼 느려집니다.
   * 세션 갱신은 관리자가 실제로 관리 화면을 쓸 때만 있으면 충분합니다.
   */
  matcher: ["/admin/:path*"],
};
