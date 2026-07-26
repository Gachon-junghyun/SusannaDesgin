import type { NextConfig } from "next";
import { CANONICAL_URL } from "./config/site";

/**
 * `www.도메인` 으로 들어온 요청을 비`www` 로 301 보냅니다.
 *
 * 왜 코드에 두는가: Cloudflare 대시보드의 Redirect Rules 로도 되지만, 그러면
 * 설정이 대시보드에만 있어 저장소만 봐서는 알 수 없고 배포처를 옮기면 사라집니다.
 * 이 프로젝트는 `proxy.ts` 를 없애면서까지 호스팅 종속성을 걷어냈으므로,
 * 도메인 규칙도 코드에 두어 어느 호스팅에서든 따라오게 합니다.
 *
 * `permanent: true` 대신 `statusCode: 301` 을 쓰는 이유: 전자는 308 을 냅니다.
 * 308 도 검색엔진은 301 과 같이 취급하지만, 문서·SEO 자료가 전부 301 기준이라
 * 굳이 다르게 둘 이유가 없습니다.
 */
function wwwRedirect() {
  const host = new URL(CANONICAL_URL).host; // susannadesign.co.kr
  const fromWww = [{ type: "host" as const, value: `www.${host}` }];

  return [
    /**
     * ⚠️ **규칙을 두 개로 나눈 이유 — 하나로 합치면 루트가 깨집니다.**
     *
     * `source: "/:path*"` 하나만 두면 `/works` 같은 주소는 잘 넘어가는데
     * **루트(`/`)에서 `:path*` 가 0개에 매칭**되고, 그때 Next 가 절대 URL
     * 대상에서 토큰을 치환하지 못해 `https://.../:path*` 라는 깨진 주소를
     * 그대로 내보냅니다. 실제 배포에서 확인한 동작입니다.
     *
     * 그래서 루트는 따로 잡고, 나머지는 **1개 이상**을 뜻하는 `:path+` 로 받습니다.
     * 고칠 때 이 둘을 다시 합치지 마세요.
     */
    {
      source: "/",
      has: fromWww,
      destination: CANONICAL_URL,
      statusCode: 301,
    },
    {
      source: "/:path+",
      has: fromWww,
      destination: `${CANONICAL_URL}/:path+`,
      statusCode: 301,
    },
  ];
}

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
  async redirects() {
    return wwwRedirect();
  },

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
