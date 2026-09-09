import QuoteForm from "@/components/QuoteForm";
import { PageHero } from "@/components/Section";
import { site } from "@/config/site";
import { getBlocks } from "@/lib/cms";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata("/quote");

/**
 * 주소창의 `?item=<슬러그>` 를 **실제 카드 이름**으로 바꿉니다 (2026-09-09).
 *
 * 🔴 **주소에서 온 글자를 그대로 쓰지 않습니다.** `/products` 가 들고 있는 목록
 * (`content_blocks` 의 `sign_model` 구역)과 대조해서 **있는 것만** 이름으로 바꾸고,
 * 없으면 아무것도 안 붙입니다. 자유 문장을 그대로 폼에 얹으면 그 글자가 그대로
 * DB·알림 메일까지 흘러갑니다 [P6].
 *
 * ⚠️ **재질(`material`)은 일부러 안 봅니다.** 재질 카드에는 견적 버튼이 없어서
 * (`MaterialsGrid` — «파는 카드» 가 아니라 «견본 조각») 그런 주소가 생길 일이
 * 없습니다. 재질에 버튼을 붙이는 날 여기에 `materials` 를 한 줄 더하세요.
 *
 * 이름에 T1~T9 번호를 같이 답니다 — 대표님이 관리자 화면에서 카탈로그와 대조할 때
 * 이름보다 번호가 빠릅니다(`SIGNTYPES.md` 의 번호와 같은 값).
 */
async function resolveItem(slug: string | undefined): Promise<string> {
  const key = slug?.trim();
  if (!key) return "";

  const { signModels } = await getBlocks();
  const hit = signModels.find((b) => b.slug === key);
  if (!hit) return "";

  return hit.eyebrow ? `${hit.title} (${hit.eyebrow})` : hit.title;
}

export default async function QuotePage({
  searchParams,
}: {
  /** `/products` 카드에서 넘어올 때만 붙습니다 — 직접 들어오면 비어 있습니다 */
  searchParams: Promise<{ item?: string }>;
}) {
  const { item } = await searchParams;
  const interest = await resolveItem(item);

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
            <QuoteForm interest={interest} />
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
