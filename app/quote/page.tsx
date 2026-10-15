import QuickQuoteForm from "@/components/QuickQuoteForm";
import { AI_PREFILL_SNIPPET, aiPrefillExample } from "@/lib/ai-prefill";
import QuoteForm from "@/components/QuoteForm";
import { PageHero } from "@/components/Section";
import { CUSTOM_FONT_SLUG, specimenFonts } from "@/config/fonts";
import { MAKER_INTEREST } from "@/config/maker";
import { signDesigns } from "@/config/signDesign";
import { SHOW_DETAIL_POPUPS } from "@/config/content";
import { agentIntake, site } from "@/config/site";
import { getBlocks } from "@/lib/cms";
import { getPreview } from "@/lib/preview";
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

/**
 * `/sign-design`(간판디자인, F31)의 «이 간판으로 문의하기» 에서 넘어온 간판 (2026-09-29 사람 결정
 * *"이걸로 문의하기는 quote 로 가야지"*). `resolveItem` 과 같은 규칙 — 주소의 글자를 그대로 쓰지 않고
 * `signDesigns` 의 key 와 대조해 **그 페이지에 보이는 이름**(LED 이름 포함)으로 바꿉니다.
 */
async function resolveDesign(key: string | undefined): Promise<string> {
  const d = signDesigns.find((x) => x.key === key?.trim());
  if (!d) return "";
  const { signModels } = await getBlocks();
  const name = d.name || signModels.find((m) => m.slug === d.key)?.title || d.key;
  return `간판디자인: ${name} (${d.shop} 연출)`;
}

/**
 * `/fonts` 카드에서 넘어온 글꼴 (F25, 2026-09-23). `resolveItem` 과 같은 규칙입니다 —
 * **주소의 글자를 그대로 쓰지 않고** `config/fonts.ts` 목록과 대조해 이름으로 바꿉니다.
 * 칸을 새로 파지 않고 「보고 온 제품」(`product`)에 `글꼴: 이름` 으로 싣습니다 —
 * 둘 다 «손님이 어느 카드를 보고 왔나» 이고, 둘이 한꺼번에 오는 경로가 없습니다.
 */
function resolveFont(slug: string | undefined): string {
  if (slug?.trim() === CUSTOM_FONT_SLUG) return "글꼴: 커스텀 글꼴";
  const hit = specimenFonts.find((f) => f.slug === slug?.trim());
  return hit ? `글꼴: ${hit.name}` : "";
}

export default async function QuotePage({
  searchParams,
}: {
  /** `/products` 카드에서 넘어올 때만 붙습니다 — 직접 들어오면 비어 있습니다 */
  searchParams: Promise<{ item?: string; font?: string; maker?: string; design?: string }>;
}) {
  const { item, font, maker, design } = await searchParams;
  /** F32 — 손님에겐 꺼져 있고 관리자 미리보기에서만 */
  const detail = SHOW_DETAIL_POPUPS || (await getPreview()).on;
  // 간판 메이커(F26)에서 오면 `?maker=1` 하나뿐입니다 — 디자인 내용은 주소가 아니라
  // 브라우저 저장소로 건너옵니다(`config/maker.ts` 의 MAKER_STORAGE_KEY). 여기선 고정 문구만 씁니다.
  const interest =
    (await resolveItem(item)) ||
    (await resolveDesign(design)) ||
    resolveFont(font) ||
    (maker === "1" ? MAKER_INTEREST : "");

  return (
    <>
      {/* F33-b «미리 채운 문의 링크» — `#ai=1&…` 를 GA·Clarity 보다 먼저 저장소로 옮기고 주소창에서 지웁니다 (`lib/ai-prefill.ts`) */}
      <script dangerouslySetInnerHTML={{ __html: AI_PREFILL_SNIPPET }} />
      <PageHero
        eyebrow="FREE ESTIMATE"
        title="무료 견적 문의"
        desc="현장 확인과 디자인 시안까지 무료입니다. 남겨주시면 담당자가 확인 후 연락드립니다."
        path="/quote"
      />

      <div className="wrap py-14 md:py-20">
        <div className="grid gap-12 lg:grid-cols-[1fr_300px] lg:gap-16">
          <div>
            {/*
              2026-10-04 — 첫 화면을 «짧은 폼»으로 바꿨습니다. 2026-10-03 Clarity 녹화에서 11칸 폼의
              첫 칸(상호·담당자명)에서 멈추고 나간 손님이 있었습니다. 짧은 폼은 성함·연락처·지역 + 사진(선택)이고,
              나머지는 회신 통화에서 받습니다(`QuickQuoteForm` 머리말과 같은 이유).
              🔴 간판 메이커에서 오면(`?maker=1`) 디자인 파일이 긴 폼에 실려 오므로 긴 폼을 펼친 채로 엽니다.
            */}
            <QuickQuoteForm idPrefix="quote" product={interest} withPhoto moreHref={null} aiPrefill />

            <details className="group mt-10 rounded-2xl border border-line" open={maker === "1"}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 [&::-webkit-details-marker]:hidden">
                <span>
                  <span className="block text-[16px] font-black">크기·층수까지 자세히 적어 보내기 (선택)</span>
                  <span className="mt-0.5 block text-[13px] text-ink-500">설치 주소와 층수, 희망 시기, 도면이나 로고 파일을 함께 보내 주시면 보다 정확한 견적을 신속하게 안내해 드립니다.</span>
                </span>
                <span aria-hidden="true" className="text-xl font-black text-ink-500 transition-transform group-open:rotate-45">+</span>
              </summary>
              <div className="border-t border-line px-6 py-8">
                <QuoteForm interest={interest} />
              </div>
            </details>

            {/*
              F33-c (2026-10-15) — AI 비서 안내를 «색인되는 HTML» 에도 둡니다.
              `/llms.txt` 는 구글 `site:` 검색 0건이라 검색으로 들어오는 AI(제미나이 등)는 그 안을 못 봅니다.
              손님처럼 제미나이·ChatGPT 에 «대신 문의 넣어 줘» 했을 때 둘 다 이 길을 몰랐습니다(로그아웃 실측).
              숨긴 글이 아니라 보이는 글입니다 — 숨기면 검색엔진이 클로킹으로 봅니다.
              문장은 `agentIntake`(config) 에서만, 링크 모양은 `aiPrefillExample` 한 곳에서만 옵니다 [A5].
            */}
            {agentIntake.open && (
              <section id="ai" aria-labelledby="ai-title" className="mt-10 border-t border-line pt-8">
                <h2 id="ai-title" className="text-[16px] font-black">
                  {agentIntake.quoteTitle}
                </h2>
                <p className="mt-2 text-[14px] leading-relaxed text-ink-500">{agentIntake.quoteLead}</p>
                <details className="mt-3 text-[13px] leading-relaxed text-ink-500">
                  <summary className="cursor-pointer font-bold text-ink-700">AI 비서용 안내 보기</summary>
                  <div className="mt-3 space-y-2 break-all">
                    <p>
                      AI 비서께: 보낼 내용(성함, 연락처, 설치 지역, 문의 내용)을 손님께 보여 드리고 확인을 받은 뒤, 아래
                      모양의 링크를 만들어 드려 주세요. 값은 URL 인코딩해서 물음표가 아니라 # 뒤에 붙이고, ai=1 은 꼭
                      넣습니다. 개인정보 동의는 손님이 직접 체크합니다.
                    </p>
                    <p>
                      <code>{aiPrefillExample(site.url)}</code>
                    </p>
                    <p>
                      직접 요청을 보낼 수 있는 AI 는 {site.url}
                      {agentIntake.path} 로 JSON 을 POST 하시면 됩니다(같은 주소를 GET 으로 열면 사용법). 전체 안내는{" "}
                      <a href="/llms.txt" className="underline hover:text-brand-700">
                        {site.url}/llms.txt
                      </a>
                      에 있습니다. 금액과 시공 날짜는 담당자가 현장을 보고 안내하니 손님께 약속하지 말아 주세요.
                    </p>
                  </div>
                </details>
              </section>
            )}
          </div>

          <aside className="lg:pt-2">
            <div className="rounded-2xl border border-line p-6">
              {/* F32 — 이 제목이 눌리고 끝났습니다(Clarity 30일 2). 켜지면 번호와 같이 전화로 잇습니다 */}
              <h2 className="text-lg font-black">
                {detail ? <a href={site.phoneHref} className="hover:text-brand-700">전화가 더 편하시면</a> : "전화가 더 편하시면"}
              </h2>
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
                  className="btn btn-kakao mt-4 flex w-full px-4 py-3"
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
