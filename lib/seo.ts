import type { Metadata } from "next";
import { noindexPaths, seo, site } from "@/config/site";

/** `seo.pages` 에 등록된 하위 페이지 경로 */
export type PagePath = keyof typeof seo.pages;

/**
 * OG 대표 이미지 — `app/layout.tsx` 와 이 파일이 **같은 값**을 써야 합니다.
 * 두 곳에 따로 적어 두면 한쪽만 바뀌어 페이지마다 다른 이미지가 나갑니다.
 */
export const ogImage = {
  url: "/images/og.jpg",
  width: 1200,
  height: 630,
  alt: site.name,
} as const;

/**
 * 하위 페이지의 `metadata` 를 만듭니다.
 *
 * ## 왜 헬퍼가 필요한가 — Next.js 는 메타데이터를 **얕게 병합**합니다
 *
 * 페이지가 `openGraph` 를 **한 필드라도** 적으면 `app/layout.tsx` 의 `openGraph`
 * 가 통째로 교체됩니다. 즉 `og:description` 만 적으려다 **`og:image` 가 조용히
 * 사라집니다.** 화면에는 아무 표시도 안 나고, 카톡·네이버에 링크를 붙여야 압니다.
 * (근거: `node_modules/next/dist/docs/.../generate-metadata.md` §Merging —
 *  "All openGraph fields from layout are **replaced**")
 *
 * 그래서 이 함수는 매번 `openGraph` **전체**를 다시 채웁니다. 페이지에서 직접
 * `openGraph` 를 적지 마세요.
 *
 * ## 이걸 쓰기 전에 있던 문제
 *
 * 각 `page.tsx` 가 `description` 만 적고 `og:description` 은 아무도 안 적어서,
 * **10개 페이지 전부가 홈 설명을 공유**하고 있었습니다. 어느 페이지를 공유해도
 * 홈 소개가 뜹니다. 한 곳에서 한 번 적으면 양쪽에 들어가게 하는 게 이 함수입니다.
 *
 * ## robots 를 일부러 안 건드리는 경우
 *
 * 색인 대상 페이지에는 `robots` 를 **넣지 않습니다.** 넣으면 layout 의 값을
 * 덮어써서, 임시 주소·미리보기 배포에서까지 `index: true` 가 되어 버립니다
 * (layout 은 `site.isProductionDomain` 을 보고 판단합니다). 상속이 정답입니다.
 */
export function pageMetadata(path: PagePath): Metadata {
  const page = seo.pages[path];
  const noindex = (noindexPaths as readonly string[]).includes(path);

  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      locale: "ko_KR",
      url: `${site.url}${path}`,
      siteName: site.name,
      // 템플릿(`%s | 수산나디자인`)은 og:title 에 적용되지 않으므로 직접 붙입니다.
      title: `${page.title} | ${site.name}`,
      description: page.description,
      images: [ogImage],
    },
    // 색인 대상이면 layout 의 robots 를 그대로 상속합니다 (위 주석 참조).
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
  };
}
