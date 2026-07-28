import type { MetadataRoute } from "next";
import { noindexPaths, site } from "@/config/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const routes: { path: string; priority: number; freq: "weekly" | "monthly" | "yearly" }[] =
    [
      { path: "", priority: 1, freq: "weekly" },
      { path: "/quote", priority: 0.9, freq: "monthly" },
      { path: "/signs", priority: 0.8, freq: "monthly" },
      { path: "/works", priority: 0.8, freq: "weekly" },
      { path: "/process", priority: 0.7, freq: "monthly" },
      { path: "/about", priority: 0.7, freq: "monthly" },
      { path: "/support", priority: 0.6, freq: "monthly" },
    ];
  // ※ /admin 은 절대 넣지 않습니다 (robots.txt 와 noindex 로도 막고 있습니다)

  /**
   * ⚠️ `noindex` 페이지(`/privacy` `/terms` `/no-email-collect`)를 여기 넣지 마세요.
   *
   * 사이트맵은 "이 주소를 색인해 달라"는 요청이고 `noindex` 는 "색인하지 말라"는
   * 지시라, 둘을 같이 보내면 **모순 신호**입니다. 서치어드바이저에 제출한 10건 중
   * 3건이 영구 실패로 남아 있었습니다(2026-07-28 수정).
   *
   * 아래 필터는 목록에 실수로 다시 들어와도 걸러 냅니다. 목록의 단일 출처는
   * `config/site.ts` 의 `noindexPaths` 입니다.
   */
  const publicRoutes = routes.filter(
    (r) => !(noindexPaths as readonly string[]).includes(r.path),
  );

  return publicRoutes.map((r) => ({
    url: `${site.url}${r.path}`,
    lastModified: now,
    changeFrequency: r.freq,
    priority: r.priority,
  }));
}
