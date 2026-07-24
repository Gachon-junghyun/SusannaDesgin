import type { Metadata } from "next";
import Link from "next/link";
import JsonLd from "@/components/JsonLd";
import { PageHero, Section, SectionHeading } from "@/components/Section";
import { site } from "@/config/site";

export const metadata: Metadata = {
  title: "고객지원 · 자주 묻는 질문",
  description:
    "대전 간판 제작·시공에 대해 자주 묻는 질문을 모았습니다. 견적 비용, 제작 기간, 철거 여부, 옥외광고물 허가 대행, 시공 가능 지역과 오시는길을 안내합니다.",
  alternates: { canonical: "/support" },
};

const faqs = [
  {
    q: "견적은 어떻게 받나요? 비용이 드나요?",
    a: "현장 확인과 디자인 시안까지 무료입니다. 홈페이지 견적 문의를 남기시거나 대표번호로 연락 주시면 방문 일정을 잡아드립니다.",
  },
  {
    q: "제작 기간은 얼마나 걸리나요?",
    a: "규모와 구조에 따라 다릅니다. 795평 자체 공장에서 절단·가공·도색·조립을 직접 하기 때문에 외주 대기 시간이 없어, 같은 규모라면 일정이 짧은 편입니다. 정확한 일정은 시안 확정 시 도면과 함께 알려드립니다.",
  },
  {
    q: "철구조물도 같이 맡길 수 있나요?",
    a: "네. 캐노피, 파사드, 지지 구조물 설계·제작·시공을 함께 진행합니다. 사인물과 구조물을 따로 발주하면 접합부에서 문제가 생기는데, 한 번에 맡기시면 도면 단계에서 정리됩니다.",
  },
  {
    q: "기존 사인물 철거도 해주시나요?",
    a: "네, 철거와 폐기물 처리까지 함께 진행합니다. 문의 시 기존 사인물 유무를 알려주시면 철거 비용까지 포함해 안내드립니다.",
  },
  {
    q: "옥외광고물 신고는 누가 하나요?",
    a: "저희가 대행합니다. 옥외광고사업 등록 업체이므로 관할 지자체 신고 절차를 대신 처리해 드립니다.",
  },
  {
    q: "관공서·공공기관 납품이 가능한가요?",
    a: "가능합니다. 직접생산확인증명서와 공장등록증명서, 중소기업·여성기업 확인서를 보유하고 있습니다. 필요하신 서류를 알려주시면 사본을 보내드립니다.",
  },
  {
    q: "어느 지역까지 시공 가능한가요?",
    a: "대전·세종·충청권을 기본으로 하며, 규모에 따라 전국 시공이 가능합니다. 실제로 수도권 현장도 다수 시공했습니다.",
  },
  {
    q: "로고 파일이 없는데 디자인도 해주시나요?",
    a: "네. 로고 원본(AI·CDR 등)이 없어도 상호와 용도를 알려주시면 서체와 레이아웃을 함께 제안해 드립니다.",
  },
];

export default function SupportPage() {
  return (
    <>
      {/*
        FAQ 구조화 데이터 — 아래 화면에 실제로 보이는 `faqs` 배열을 그대로 씁니다.
        화면에 없는 내용을 스키마에만 넣으면 리치 결과에서 제외됩니다.
      */}
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqs.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }}
      />

      <PageHero
        eyebrow="SUPPORT"
        title="고객지원"
        desc="궁금한 점을 먼저 확인해 보세요. 답이 없으면 언제든 연락 주세요."
        path="/support"
      />

      {/* 연락 수단 */}
      <Section>
        <div className="grid gap-5 md:grid-cols-3">
          <div className="rounded-2xl border border-line p-7">
            <p className="text-[13px] font-black tracking-widest text-brand">CALL</p>
            <a
              href={site.phoneHref}
              className="mt-2 block text-2xl font-black tracking-tight"
            >
              {site.phone}
            </a>
            <p className="mt-2 text-[14px] leading-relaxed text-ink-500">
              {site.hours}
              <br />
              {site.hoursNote}
            </p>
          </div>

          <div className="rounded-2xl border border-line p-7">
            <p className="text-[13px] font-black tracking-widest text-brand">EMAIL</p>
            <a
              href={`mailto:${site.email}`}
              className="mt-2 block text-lg font-black break-all"
            >
              {site.email}
            </a>
            <p className="mt-2 text-[14px] leading-relaxed text-ink-500">
              도면·로고 파일을 보내실 때 사용해 주세요.
            </p>
          </div>

          <div className="rounded-2xl bg-brand p-7 text-white">
            <p className="text-[13px] font-black tracking-widest text-white/70">
              ESTIMATE
            </p>
            <p className="mt-2 text-2xl font-black tracking-tight">무료 견적</p>
            <p className="mt-2 text-[14px] leading-relaxed text-white/85">
              실측·시안까지 무료로 진행합니다.
            </p>
            <Link
              href="/quote"
              className="mt-4 inline-block rounded-lg bg-white px-5 py-2.5 font-bold text-brand"
            >
              신청하기 →
            </Link>
          </div>
        </div>
      </Section>

      {/* FAQ */}
      <Section id="faq" className="scroll-mt-24 bg-paper">
        <SectionHeading eyebrow="FAQ" title="자주 묻는 질문" center />
        <div className="mx-auto mt-12 max-w-3xl divide-y divide-line border-y border-line">
          {faqs.map((f) => (
            <details key={f.q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-4 font-bold">
                <span className="flex gap-3">
                  <span aria-hidden="true" className="text-brand">
                    Q
                  </span>
                  {f.q}
                </span>
                <span
                  aria-hidden="true"
                  className="mt-0.5 shrink-0 text-ink-500 transition-transform group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="mt-3 pl-6 leading-relaxed text-ink-500">{f.a}</p>
            </details>
          ))}
        </div>
      </Section>

      {/* 오시는길 */}
      <Section id="location" className="scroll-mt-24">
        <SectionHeading eyebrow="LOCATION" title="오시는길" />

        <div className="mt-10 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          <div className="flex aspect-video items-center justify-center rounded-2xl border-2 border-dashed border-line bg-paper text-center text-ink-500">
            {site.mapUrl ? (
              <iframe
                src={site.mapUrl}
                title="약도"
                className="h-full w-full rounded-2xl border-0"
                loading="lazy"
              />
            ) : (
              <div className="px-6">
                <p className="font-bold">지도 자리</p>
                <p className="mt-1.5 text-[13px] leading-relaxed">
                  카카오맵 또는 네이버지도 공유 URL을
                  <br />
                  <code className="font-mono text-[12px]">config/site.ts</code> 의{" "}
                  <code className="font-mono text-[12px]">mapUrl</code> 에 넣으면
                  <br />
                  이 자리에 지도가 표시됩니다.
                </p>
              </div>
            )}
          </div>

          <dl className="divide-y divide-line border-y border-line">
            {[
              ["주소", `(${site.zip}) ${site.address} ${site.addressDetail}`],
              ["대표번호", site.phone],
              ["사무실", site.officePhone],
              ["팩스", site.fax],
              ["이메일", site.email],
              ["운영시간", `${site.hours} · ${site.hoursNote}`],
            ].map(([k, v]) => (
              <div key={k} className="py-4">
                <dt className="text-[13px] font-bold text-ink-500">{k}</dt>
                <dd className="mt-1 text-[15px] font-medium">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </Section>
    </>
  );
}
