import { notFound } from "next/navigation";

import MakerLoader from "@/components/maker/MakerLoader";
import MakerShell from "@/components/maker/MakerShell";
import { SHOW_MAKER } from "@/config/maker";
import { getPreview } from "@/lib/preview";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata("/maker");

/** 요청 시 렌더링 — 미리보기 쿠키를 읽습니다(`/products`·`/fonts` 와 같은 이유) */
export const dynamic = "force-dynamic";

/**
 * P18 — 간판 메이커 (손님) · F26 · 2026-09-25.
 *
 * 🔴 **`SHOW_MAKER` 가 꺼져 있으면 관리자 말고는 404 입니다** — `/products`·`/fonts` 와 같은 규칙.
 * 손님은 `config/fonts.ts` 의 16종(인쇄·BI/CI·웹·임베딩 전부 «사용 가능»)만 봅니다.
 * 마지막 버튼은 «견적 받기» 이고, 디자인 요약·제작용 SVG·미리보기 그림이 견적 폼 첨부로 붙습니다.
 * 홈페이지 머리말·꼬리말은 `SiteChrome` 이 이 경로에서 걷어냅니다 — 편집기 화면을 통째로 씁니다.
 */
export default async function MakerPage() {
  const preview = await getPreview();
  if (!SHOW_MAKER && !preview.on) notFound();
  return (
    <MakerShell mode="customer" base="/maker" hidden={!SHOW_MAKER}>
      <MakerLoader mode="customer" base="/maker" />
    </MakerShell>
  );
}
