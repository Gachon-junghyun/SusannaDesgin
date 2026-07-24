/**
 * Supabase 접속 정보.
 *
 * 값이 하나라도 비어 있으면 CMS 기능 전체가 꺼지고, 사이트는 `config/content.ts` 의
 * 내용으로 평소처럼 동작합니다. 그래서 Supabase 프로젝트를 아직 안 만들었어도
 * 개발·빌드·배포가 전부 정상적으로 됩니다.
 */

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** CMS(관리자 기능)를 쓸 수 있는 상태인지 */
export function isCmsEnabled(): boolean {
  return SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;
}

/** 스토리지 이미지 호스트 (next.config 의 remotePatterns 에서 사용) */
export function supabaseHostname(): string | null {
  if (!SUPABASE_URL) return null;
  try {
    return new URL(SUPABASE_URL).hostname;
  } catch {
    return null;
  }
}

/** 업로드한 사진이 담기는 버킷 */
export const MEDIA_BUCKET = "media";
