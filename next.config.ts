import type { NextConfig } from "next";

/**
 * 관리자 화면에서 올린 사진은 Supabase 스토리지에서 내려옵니다.
 * next/image 는 허용된 호스트가 아니면 외부 이미지를 최적화하지 않으므로,
 * 환경변수의 프로젝트 주소를 읽어 자동으로 등록합니다.
 * (환경변수가 없으면 빈 배열 — 기존처럼 public/ 안의 사진만 씁니다.)
 */
function supabaseImageHost() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return [];

  try {
    const { hostname } = new URL(url);
    return [
      {
        protocol: "https" as const,
        hostname,
        pathname: "/storage/v1/object/public/**",
      },
    ];
  } catch {
    return [];
  }
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: supabaseImageHost(),
  },

  /**
   * 캐시 헤더.
   *
   * ⚠️ **동적 페이지(`/`, `/works`, `/admin/*`)에는 여기 설정이 안 먹습니다.**
   *    Next.js 가 `no-cache, must-revalidate` 를 직접 붙이고 그게 우선합니다.
   *    실제로 넣어 보고 확인했습니다. 그래서 그 경로는 아예 적지 않았습니다 —
   *    안 먹는 설정을 남겨두면 "캐시되고 있겠지" 하고 오해하게 됩니다.
   *
   *    · 관리자 화면: Next 기본값이 이미 캐시 금지라 그대로 두면 안전합니다.
   *    · 공개 페이지: 방문 1회마다 서버 렌더링 + DB 조회 1~2번이 듭니다.
   *      지역 업체 규모에서는 무료 한도(하루 10만 요청)에 한참 못 미칩니다.
   *      트래픽이 커지면 Cloudflare 대시보드의 Cache Rules 로 걸거나
   *      R2 를 붙여 ISR 을 되살리는 쪽이 정석입니다.
   *
   * 라우트 핸들러(`/rss.xml`)는 정상 적용됩니다.
   */
  async headers() {
    return [
      {
        source: "/rss.xml",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=3600, stale-while-revalidate=86400",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
