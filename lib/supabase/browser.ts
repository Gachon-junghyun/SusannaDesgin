"use client";

import { createBrowserClient } from "@supabase/ssr";

import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./env";

/**
 * 브라우저용 Supabase 클라이언트. 로그인 폼과 사진 업로드에서만 씁니다.
 * anon 키는 공개돼도 되는 값이며, 실제 권한은 서버의 RLS 가 판단합니다.
 */
export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
