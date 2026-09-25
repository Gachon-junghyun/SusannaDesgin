import type { Metadata } from "next";
import { notFound } from "next/navigation";

import CaseView from "@/components/CaseView";
import { site } from "@/config/site";
import { getPublishedSite, photoUrl } from "@/lib/sites";

/**
 * 시공사례 상세 — 현장 한 건 (F29 · SEO.md B-1, 2026-09-26 신설).
 *
 * 관리자 «현장 폴더»에서 «홈페이지 사례로 공개»를 누른 현장만 열립니다(아니면 404).
 * 공개 조건(사진 3장·현장 이야기 150자·위치·간판 종류)은 `lib/sites.ts` `publishGaps` —
 * 얇은 페이지를 막으려는 것입니다(2026 코어 업데이트가 이 패턴을 처벌했습니다).
 *
 * 🔴 사진은 `/media/…` 에서 나갑니다. 브라우저가 다시 그린 사진이라 GPS 가 없습니다.
 * 🔴 구조화 데이터는 화면에 보이는 것만 적습니다(`components/JsonLd.tsx` 규칙).
 */
export const dynamic = "force-dynamic";

const firstLine = (s: string, n = 78) => {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const got = await getPublishedSite(decodeURIComponent(slug));
  if (!got) return { title: "찾을 수 없는 시공사례", robots: { index: false, follow: true } };
  const { site: s, photos } = got;
  const title = [s.location, s.title, s.sign_type, "시공 사례"].filter(Boolean).join(" ");
  const description = firstLine(s.story) || `${site.name}이 제작·시공한 ${s.title} ${s.sign_type}.`;
  const cover = photos.find((p) => p.id === s.cover_photo) ?? photos.find((p) => p.stage === "done") ?? photos[0];
  const path = `/works/${s.slug}`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "article",
      locale: "ko_KR",
      url: `${site.url}${path}`,
      siteName: site.name,
      title: `${title} | ${site.name}`,
      description,
      images: cover ? [{ url: `${site.url}${photoUrl(cover.key)}`, width: cover.width, height: cover.height, alt: `${s.title} ${s.sign_type}` }] : [],
    },
  };
}

export default async function CasePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const got = await getPublishedSite(decodeURIComponent(slug));
  if (!got) notFound();
  return <CaseView site={got.site} photos={got.photos} />;
}
