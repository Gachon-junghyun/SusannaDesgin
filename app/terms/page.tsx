import { PageHero } from "@/components/Section";
import { site } from "@/config/site";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata("/terms");

const articles = [
  {
    t: "제1조 (목적)",
    b: [
      `본 약관은 ${site.legalName}(이하 "회사")가 운영하는 웹사이트에서 제공하는 정보 및 견적 문의 서비스의 이용조건과 절차, 회사와 이용자의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.`,
    ],
  },
  {
    t: "제2조 (약관의 효력 및 변경)",
    b: [
      "본 약관은 웹사이트에 게시함으로써 효력이 발생합니다.",
      "회사는 관련 법령을 위배하지 않는 범위에서 약관을 변경할 수 있으며, 변경 시 웹사이트를 통해 공지합니다.",
    ],
  },
  {
    t: "제3조 (서비스의 내용)",
    b: [
      "회사는 간판 제작·시공에 관한 정보 제공, 시공 실적 안내, 견적 문의 접수 및 상담 서비스를 제공합니다.",
      "견적 문의 접수는 계약의 청약이나 승낙을 의미하지 않으며, 구체적인 계약 조건은 별도 협의를 통해 확정됩니다.",
    ],
  },
  {
    t: "제4조 (이용자의 의무)",
    b: [
      "이용자는 견적 문의 시 정확한 정보를 제공하여야 합니다.",
      "타인의 정보를 도용하거나 허위 정보를 입력하여서는 안 됩니다.",
      "웹사이트의 정상적인 운영을 방해하는 행위를 하여서는 안 됩니다.",
    ],
  },
  {
    t: "제5조 (게시물의 저작권)",
    b: [
      "웹사이트에 게시된 시공 실적 사진, 디자인 시안, 문구 등 모든 콘텐츠의 저작권은 회사에 있습니다.",
      "회사의 사전 서면 동의 없이 이를 복제·배포·전송·전시하거나 상업적으로 이용할 수 없습니다.",
    ],
  },
  {
    t: "제6조 (책임의 제한)",
    b: [
      "회사는 천재지변, 정전, 통신 장애 등 불가항력으로 인해 서비스를 제공할 수 없는 경우 책임을 지지 않습니다.",
      "웹사이트에 게시된 예상 견적 및 시공 기간은 참고 자료이며, 실제 현장 여건에 따라 달라질 수 있습니다.",
    ],
  },
  {
    t: "제7조 (분쟁의 해결)",
    b: [
      "본 약관과 관련한 분쟁은 대한민국 법령에 따르며, 관할 법원은 민사소송법에 따라 정합니다.",
    ],
  },
];

export default function TermsPage() {
  return (
    <>
      <PageHero eyebrow="TERMS OF SERVICE" title="이용약관"
        path="/terms"
      />

      <div className="mx-auto max-w-3xl px-6 py-14 md:py-20">
        <p className="rounded-xl bg-brand-50 p-4 text-[13px] leading-relaxed text-brand-700">
          이 문서는 기본 틀입니다. 실제 운영 전 회사 상황에 맞게 수정하고 법률 검토를
          받으세요.
        </p>

        <div className="mt-10 space-y-9">
          {articles.map((a) => (
            <section key={a.t}>
              <h2 className="text-lg font-black">{a.t}</h2>
              <ol className="mt-3 space-y-2 text-[15px] leading-relaxed text-ink-500">
                {a.b.map((line, i) => (
                  <li key={line} className="flex gap-2.5">
                    <span className="shrink-0 font-bold text-brand">{i + 1}.</span>
                    <span>{line}</span>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>

        <p className="mt-10 border-t border-line pt-6 text-[14px] font-bold">
          시행일: 2026년 00월 00일 (TODO)
        </p>
      </div>
    </>
  );
}
