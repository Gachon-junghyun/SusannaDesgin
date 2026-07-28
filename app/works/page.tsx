import Link from "next/link";
import WorksGrid from "@/components/WorksGrid";
import { PageHero } from "@/components/Section";
import { workCategories } from "@/config/content";
import { getWorks } from "@/lib/cms";
import { imageExists } from "@/lib/images";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata("/works");

/** 요청 시 렌더링 — 이유는 `app/page.tsx` 의 같은 설정 주석 참고. */
export const dynamic = "force-dynamic";

export default async function WorksPage() {
  const works = await getWorks();
  const list = works.map((w) => ({ ...w, available: imageExists(w.image) }));

  return (
    <>
      <PageHero
        eyebrow="OUR WORK"
        title="주요실적"
        desc="관공서 · 금융 · 기업 · 상업시설 등 다양한 분야에서 직접 제작하고 시공했습니다."
        path="/works"
      />

      <div className="wrap py-14 md:py-20">
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
