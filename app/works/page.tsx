import type { Metadata } from "next";
import Link from "next/link";
import WorksGrid from "@/components/WorksGrid";
import { PageHero } from "@/components/Section";
import { workCategories } from "@/config/content";
import { getWorks } from "@/lib/cms";
import { imageExists } from "@/lib/images";

export const metadata: Metadata = {
  title: "대전 간판 시공사례",
  description:
    "대전 간판업체 수산나디자인의 시공사례입니다. 삼성화재, KAIST, 교보생명, 우리은행, 롯데하이마트, 금성백조, 대전무역회관 등 관공서·금융·기업·상업시설 실적을 업종별로 보실 수 있습니다.",
  alternates: { canonical: "/works" },
};

/** 관리자 저장 시 즉시 갱신됩니다. 아래는 그 외 경로를 위한 안전장치입니다. */
export const revalidate = 600;

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
