"use client";

import { useEffect } from "react";

import { createClient } from "@/lib/supabase/browser";
import { isCmsEnabled } from "@/lib/supabase/env";

/**
 * 관리자 로그인 상태를 유지합니다.
 *
 * Supabase 접속 토큰은 1시간이면 만료됩니다. 만료 전에 갱신해 주지 않으면
 * 작업 도중 갑자기 로그아웃됩니다. 서버 컴포넌트는 쿠키를 쓸 수 없어서
 * 예전에는 이 갱신을 `proxy.ts`(구 middleware)에서 했는데, 그 파일이
 * 배포처를 골라야 하는 원인이었습니다(일부 무료 호스팅이 미지원).
 *
 * 브라우저 클라이언트는 자체적으로 토큰을 갱신하고 쿠키에 다시 씁니다.
 * 그 쿠키를 서버도 그대로 읽으므로, 여기 한 곳만 띄워 두면 갱신이 해결되고
 * 사이트가 어느 호스팅에서든 돌아갑니다.
 *
 * 화면에는 아무것도 그리지 않습니다.
 */
export default function SessionKeeper() {
  useEffect(() => {
    if (!isCmsEnabled()) return;

    const supabase = createClient();

    // 만료됐으면 이 호출이 갱신을 일으키고 새 쿠키를 심습니다.
    void supabase.auth.getSession();

    // 이후 만료 시점마다 자동 갱신됩니다(autoRefreshToken 기본 동작).
    // 구독을 걸어 두어야 갱신 결과가 쿠키에 반영됩니다.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {});

    return () => subscription.unsubscribe();
  }, []);

  return null;
}
