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
};

export default nextConfig;
