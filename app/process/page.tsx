import Link from "next/link";
import Img from "@/components/Img";
import { PageHero } from "@/components/Section";
import { steps } from "@/config/content";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata("/process");

const detail: Record<string, string[]> = {
  "01": [
    "요구사항을 듣고 현장을 직접 확인합니다.",
    "벽면 재질과 상태를 봅니다. 드라이비트·석재·유리마다 고정 방식이 달라집니다.",
    "전기 인입 위치, 층수, 도로 폭을 확인합니다. 고소작업차 진입 여부가 시공비를 좌우합니다.",
  ],
  "02": [
    "건물 용도와 브랜드 톤에 맞춰 콘셉트를 잡습니다.",
    "실제 건물 사진에 사인물을 합성해 보여드립니다.",
    "주간 시안과 야간 점등 시안을 함께 드립니다.",
  ],
  "03": [
    "시안을 검토하시고 최종안을 확정합니다.",
    "확정 전까지 수정해 드리며, 시안 제작에는 비용이 들지 않습니다.",
    "확정 후 제작 도면과 일정을 공유합니다.",
  ],
  "04": [
    "795평 자체 공장에서 절단·가공·도색·조립을 진행합니다.",
    "외주로 넘기지 않기 때문에 일정과 품질을 저희가 통제합니다.",
    "철구조물이 포함된 경우 구조 검토 후 함께 제작합니다.",
  ],
  "05": [
    "자사 제작시공팀이 직접 설치합니다.",
    "옥외광고물 신고가 필요한 경우 행정 절차를 대행합니다.",
    "설치 후 점등·안전 확인까지 마치고 A/S를 관리합니다.",
  ],
};

export default function ProcessPage() {
  return (
    <>
      <PageHero
        eyebrow="PROCESS"
        title="업무프로세스"
        desc="문의 한 번으로 현장 확인부터 제작, 시공, A/S까지 이어집니다."
        path="/process"
      />

      <div className="mx-auto max-w-6xl px-6 py-14 md:py-20">
        <ol className="space-y-14 md:space-y-20">
          {steps.map((s) => (
            <li key={s.no} className="grid gap-8 md:grid-cols-[280px_1fr] md:gap-12">
              <div className="relative aspect-4/3 overflow-hidden rounded-2xl">
                <Img
                  src={s.image}
                  alt={s.title}
                  width={640}
                  height={480}
                  fill
                  sizes="(max-width: 768px) 100vw, 280px"
                  label={`${s.no}. ${s.title}`}
                />
              </div>
              <div>
                <p className="text-[13px] font-black tracking-widest text-brand">
                  STEP {s.no}
                </p>
                <h2 className="mt-1 text-2xl font-black tracking-tight md:text-3xl">
                  {s.title}
                </h2>
                <p className="mt-3 leading-relaxed text-ink-500">{s.desc}</p>
                <ul className="mt-5 space-y-2.5 border-t border-line pt-5">
                  {detail[s.no]?.map((d) => (
                    <li key={d} className="flex items-start gap-3">
                      <span
                        aria-hidden="true"
                        className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand"
                      />
                      <span className="text-[15px] leading-relaxed">{d}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-16 rounded-2xl bg-ink px-6 py-12 text-center text-white">
          <h2 className="text-2xl font-black tracking-tight">
            현장 확인과 시안까지 무료입니다
          </h2>
          <p className="mt-3 leading-relaxed text-white/60">
            보시고 결정하셔도 됩니다. 부담 없이 문의하세요.
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
