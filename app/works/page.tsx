import Link from "next/link";
import WorksGrid from "@/components/WorksGrid";
import JsonLd from "@/components/JsonLd";
import { PageHero } from "@/components/Section";
import { site } from "@/config/site";
import { workCategories } from "@/config/content";
import { getWorks } from "@/lib/cms";
import { getPublishedSites, photoUrl } from "@/lib/sites";
import { imageExists } from "@/lib/images";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata("/works");

/** 요청 시 렌더링 — 이유는 `app/page.tsx` 의 같은 설정 주석 참고. */
export const dynamic = "force-dynamic";

export default async function WorksPage() {
  const [works, cases] = await Promise.all([getWorks(), getPublishedSites()]);
  const list = works.map((w) => ({ ...w, available: imageExists(w.image) }));

  /**
   * 실제 사진이 있는 실적만 캐러셀형 구조화 데이터(ItemList)로 냅니다 — JsonLd.tsx 의
   * 규칙대로 화면에 진짜 보이는 것과 같아야 하므로 플레이스홀더 카드는 뺍니다.
   * 개별 상세 URL이 없어(B-1 미착수, SEO.md) 전 항목이 이 페이지 URL 하나를 가리킵니다.
   */
  const withPhoto = list.filter((w) => w.available);
  const absoluteImage = (src: string) => (src.startsWith("http") ? src : `${site.url}${src}`);

  return (
    <>
      <PageHero
        eyebrow="OUR WORK"
        title="주요실적"
        desc="관공서 · 금융 · 기업 · 상업시설 등 다양한 분야에서 직접 제작하고 시공했습니다."
        path="/works"
      />

      {withPhoto.length > 0 && (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "ItemList",
            itemListElement: withPhoto.map((w, i) => ({
              "@type": "ListItem",
              position: i + 1,
              item: {
                "@type": "Thing",
                name: `${w.category} · ${w.title}`,
                image: absoluteImage(w.image),
                url: `${site.url}/works`,
              },
            })),
          }}
        />
      )}

      <div className="wrap py-14 md:py-20">
        {/* 현장 폴더(F29)에서 공개한 사례 — 사례마다 상세 페이지가 있습니다. 0016 을 안 돌렸거나 공개한 게 없으면 통째로 안 보입니다 */}
        {cases.length > 0 && (
          <section aria-label="시공사례 이야기" className="mb-16">
            <h2 className="text-2xl font-black tracking-tight">현장 이야기가 있는 시공사례</h2>
            <p className="mt-2 text-ink-500">치수·자재·기간과 시공 전후 사진을 현장마다 정리했습니다.</p>
            <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {cases.map((c) => (
                <li key={c.id}>
                  <Link href={`/works/${c.slug}`} className="group block">
                    <div className="aspect-[4/3] overflow-hidden rounded-xl bg-paper">
                      {c.cover && (
                        // eslint-disable-next-line @next/next/no-img-element -- 이미 줄여 저장한 썸네일
                        <img
                          src={photoUrl(c.cover.thumb_key)}
                          alt={`${c.title} ${c.sign_type}`}
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                        />
                      )}
                    </div>
                    <p className="mt-3 text-[13px] font-bold text-ink-500">{[c.location, c.sign_type].filter(Boolean).join(" · ")}</p>
                    <p className="mt-1 text-lg font-black group-hover:text-brand-700">{c.title}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <WorksGrid works={list} categories={workCategories} />

        <div className="mt-16 rounded-2xl bg-paper px-6 py-12 text-center">
          <h2 className="text-2xl font-black tracking-tight">
            비슷한 규모의 현장을 찾으시나요?
          </h2>
          <p className="mt-3 leading-relaxed text-ink-500">
            건물 형태와 용도를 알려주시면 유사 시공 사례와 예상 견적을 함께 보내드립니다.
          </p>
          <Link
            href="/quote"
            className="mt-6 inline-block rounded-xl bg-brand px-8 py-4 font-black text-white transition-colors hover:bg-brand-600"
          >
            무료 견적 신청
          </Link>
        </div>
      </div>
    </>
  );
}
