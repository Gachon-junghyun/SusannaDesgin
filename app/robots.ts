import type { MetadataRoute } from "next";
import { site } from "@/config/site";

export default function robots(): MetadataRoute.Robots {
  // 임시 주소(vercel.app 등)에서는 통째로 막습니다.
  // 임시 주소가 검색에 잡히면 나중에 진짜 도메인과 중복 콘텐츠가 되어
  // 서로 순위를 깎아먹습니다.
  if (!site.isProductionDomain) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // 관리자 화면은 검색 결과에 뜨면 안 됩니다.
      // (각 페이지의 noindex 메타태그와 이중으로 막습니다)
      disallow: ["/api/", "/admin"],
    },
    sitemap: `${site.url}/sitemap.xml`,
  };
}
