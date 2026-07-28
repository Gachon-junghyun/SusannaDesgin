import QuoteForm from "@/components/QuoteForm";
import { PageHero } from "@/components/Section";
import { site } from "@/config/site";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata("/quote");

export default function QuotePage() {
  return (
    <>
      <PageHero
        eyebrow="FREE ESTIMATE"
        title="무료 견적 문의"
        desc="현장 확인과 디자인 시안까지 무료입니다. 남겨주시면 담당자가 확인 후 연락드립니다."
        path="/quote"
      />

      <div className="wrap py-14 md:py-20">
        <div className="grid gap-12 lg:grid-cols-[1fr_300px] lg:gap-16">
          <div>
            <QuoteForm />
          </div>

          <aside className="lg:pt-2">
            <div className="rounded-2xl border border-line p-6">
              <h2 className="text-lg font-black">전화가 더 편하시면</h2>
              <a
                href={site.phoneHref}
                className="mt-2 block text-2xl font-black tracking-tight text-brand"
              >
                {site.phone}
              </a>
              <p className="mt-1 text-[14px] text-ink-500">
                {site.hours}
                <br />
                {site.hoursNote}
              </p>

              {site.kakaoChannelUrl && (
                <a
                  href={site.kakaoChannelUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 flex items-center justify-center rounded-lg bg-[#FEE500] px-4 py-3 font-bold text-[#3C1E1E]"
                >
                  카카오톡으로 상담하기
                </a>
              )}
            </div>

            <div className="mt-6 rounded-2xl bg-paper p-6">
              <h2 className="text-[15px] font-black">이렇게 진행됩니다</h2>
              <ol className="mt-3 space-y-3">
                {[
                  "문의 접수 후 유선 연락",
                  "현장 방문 확인 (무료)",
                  "디자인 시안 + 견적서 발송",
                  "확정 후 제작·시공 일정 조율",
                ].map((t, i) => (
                  <li key={t} className="flex gap-3 text-[14px] leading-relaxed">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand text-[11px] font-black text-white">
                      {i + 1}
                    </span>
                    {t}
                  </li>
                ))}
              </ol>
            </div>

            <p className="mt-6 text-[13px] leading-relaxed text-ink-500">
              사인물 크기, 로고 파일, 기존 사인물 철거 여부를 함께 알려주시면 견적이
              훨씬 정확해집니다.
            </p>
          </aside>
        </div>
      </div>
    </>
  );
}
