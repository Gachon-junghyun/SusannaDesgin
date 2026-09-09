import type { MetadataRoute } from "next";
import { SHOW_PRODUCTS } from "@/config/content";
import { noindexPaths, site } from "@/config/site";
import { getBlocks } from "@/lib/cms";

/**
 * 🔴 **요청 시 생성입니다.** 예전에는 빌드 때 한 번 구워졌는데, 이제 이 목록이
 * DB(간판 종류의 «손님용 설명» 유무)에 따라 달라집니다 — 구워 두면 대표님이 설명을
 * 채워도 **다음 배포 전까지 사이트맵에 안 들어옵니다.** 사이트맵은 검색엔진이 가끔
 * 한 번 가져가는 주소라 매번 만들어도 부담이 없습니다.
 */
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const routes: { path: string; priority: number; freq: "weekly" | "monthly" | "yearly" }[] =
    [
      { path: "", priority: 1, freq: "weekly" },
      { path: "/quote", priority: 0.9, freq: "monthly" },
      { path: "/signs", priority: 0.8, freq: "monthly" },
      // 아직 «안 연» 페이지라 지금은 아래 필터가 걸러 냅니다 (F24).
      // `SHOW_PRODUCTS` 를 켜면 저절로 들어갑니다 — 여기를 손으로 고칠 일이 없습니다.
      { path: "/products", priority: 0.8, freq: "monthly" },
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

  const base = publicRoutes.map((r) => ({
    url: `${site.url}${r.path}`,
    lastModified: now,
    changeFrequency: r.freq,
    priority: r.priority,
  }));

  /**
   * 제품 상세페이지 — **설명이 채워진 것만** 넣습니다 (F24-d).
   *
   * 🔴 이 규칙은 `app/products/[slug]/page.tsx` 의 `robots` 판정과 **같은 값**을 봅니다.
   * 둘이 갈리면 «사이트맵으로는 색인해 달라 하고 페이지로는 하지 말라 하는» 모순
   * 신호가 됩니다 — 위 `noindexPaths` 주석의 그 실패(제출 10건 중 3건 영구 실패)와
   * 같은 종류입니다. 한쪽만 고치지 마세요.
   *
   * 설명이 없는 간판은 이름·번호·가격대뿐이라 아홉 장이 거의 같은 페이지가 됩니다.
   * 대표님이 관리자 화면에서 설명을 채우면 저절로 들어옵니다.
   */
  if (!SHOW_PRODUCTS) return base;

  const { signModels } = await getBlocks();
  const details = signModels
    .filter((m) => m.slug && m.body)
    .map((m) => ({
      url: `${site.url}/products/${m.slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    }));

  return [...base, ...details];
}
