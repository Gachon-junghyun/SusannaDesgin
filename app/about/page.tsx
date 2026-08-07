import Link from "next/link";
import Img from "@/components/Img";
import { PageHero, Section, SectionHeading } from "@/components/Section";
import { history, vision } from "@/config/content";
import { certifications, site } from "@/config/site";
import { getBlocks } from "@/lib/cms";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata("/about");

/**
 * 공장 공정은 홈과 **같은 블록**을 씁니다(F19). 관리자가 한 번 고치면
 * 두 페이지가 같이 바뀌어야 하므로 여기서도 DB 를 읽습니다.
 * 연혁·비전·회사 개요는 그대로 `config/` 에 있습니다.
 */
export const dynamic = "force-dynamic";

export default async function AboutPage() {
  const { fabrication } = await getBlocks();

  return (
    <>
      <PageHero eyebrow="ABOUT US" title="회사소개" desc={site.tagline} path="/about" />

      {/* 인사말 */}
      <Section>
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">
          <div>
            <SectionHeading
              eyebrow="GREETING"
              title={
                <>
                  건물의 이름을 다는 일을
                  <br />
                  13년째 하고 있습니다
                </>
              }
            />
            <div className="mt-6 space-y-4 leading-relaxed text-ink-500">
              <p>
                {site.legalName}은 2012년 설립하여 지난 13여 년 동안 여러 사업 수행
                경험을 통한 노하우를 기반으로 사인물 등을 디자인, 제작, 시공, 관리하는
                기업입니다.
              </p>
              <p>
                옥외광고물과 간판을 넘어 캐노피·파사드 같은 철구조물까지 함께 다룹니다.
                사인이 걸리는 구조물째로 설계하기 때문에 도면 단계에서 협의가 끝납니다.
              </p>
              <p>
                저희 {site.legalName}은 항상 고객의 요구에 충분히 대응하고 감동을 줄 수
                있는 파트너가 되도록 최선을 다하여 노력하겠습니다.
              </p>
              <p className="pt-2 text-[15px] font-bold text-ink">
                {site.legalName} 대표이사 {site.ceo}
              </p>
            </div>
          </div>

          <div className="relative aspect-4/3 overflow-hidden rounded-2xl">
            <Img
              src="/images/about-office.jpg"
              alt={`${site.legalName} 사옥`}
              width={1200}
              height={900}
              fill
              sizes="(max-width: 1024px) 100vw, 600px"
              label="사옥 / 공장 전경"
            />
          </div>
        </div>
      </Section>

      {/* 회사 개요 */}
      <Section className="bg-paper">
        <SectionHeading eyebrow="COMPANY" title="회사 개요" />
        <dl className="mt-8 divide-y divide-line border-y border-line">
          {[
            ["회사명", site.legalName],
            ["대표이사", site.ceo],
            ["주요사업", "옥외광고물, 간판디자인, 철구조물"],
            ["설립연도", site.founded],
            ["자본금", site.capital],
            ["임직원", site.employees],
            ["연락처", `M ${site.phone} / T ${site.officePhone} / F ${site.fax}`],
            ["소재지", `(${site.zip}) ${site.address}`],
          ].map(([k, v]) => (
            <div key={k} className="grid gap-1 py-4 sm:grid-cols-[180px_1fr] sm:gap-4">
              <dt className="text-[14px] font-bold text-ink-500">{k}</dt>
              <dd className="text-[15px]">{v}</dd>
            </div>
          ))}
        </dl>
      </Section>

      {/* 인증 및 등록 현황 */}
      <Section id="certifications" className="scroll-mt-24">
        <SectionHeading
          eyebrow="CERTIFICATION"
          title="인증 및 등록 현황"
          desc="등록·인증을 갖춘 정식 업체입니다. 원본 사본이 필요하시면 요청해 주세요."
        />
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {certifications.map((c) => (
            <li
              key={c}
              className="flex items-center gap-3 rounded-xl border border-line px-5 py-4"
            >
              <span
                aria-hidden="true"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </span>
              <span className="font-bold">{c}</span>
            </li>
          ))}
        </ul>
      </Section>

      {/* 조직 및 연혁 */}
      <Section id="history" className="scroll-mt-24 bg-paper">
        <div className="grid gap-12 lg:grid-cols-[300px_1fr] lg:gap-16">
          <div>
            <SectionHeading eyebrow="HISTORY" title="조직 및 연혁" />
            <div className="mt-8 rounded-2xl bg-white p-6">
              <p className="text-[13px] font-bold text-ink-500">조직 현황</p>
              <p className="mt-3 font-black">대표이사</p>
              <div className="mt-2 grid grid-cols-2 gap-2 text-[15px]">
                <span className="rounded-lg bg-paper px-3 py-2 text-center font-medium">
                  관리팀
                </span>
                <span className="rounded-lg bg-paper px-3 py-2 text-center font-medium">
                  제작시공팀
                </span>
              </div>
            </div>
          </div>

          <ol className="relative border-l-2 border-line pl-8">
            {history.map((h) => (
              <li key={h.date} className="relative pb-9 last:pb-0">
                <span
                  aria-hidden="true"
                  className="absolute top-1.5 -left-[41px] h-4 w-4 rounded-full border-4 border-paper bg-brand"
                />
                <p className="text-[13px] font-black tracking-widest text-accent">
                  {h.stage}
                </p>
                <p className="mt-0.5 text-xl font-black tracking-tight">{h.date}</p>
                <p className="mt-1 leading-relaxed text-ink-500">{h.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </Section>

      {/* 공장 공정 */}
      <Section id="equipment" className="scroll-mt-24">
        <SectionHeading
          eyebrow="FABRICATION"
          title="공장 공정"
          desc={`${site.factory} 자체 공장에서 절단부터 검수까지 끝냅니다. 외주 대기가 없어 납기가 밀리지 않습니다.`}
          center
        />
        <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {fabrication.map((e, i) => (
            <li key={e.title || i} className="overflow-hidden rounded-2xl bg-paper">
              <div className="relative aspect-4/3">
                <Img
                  src={e.image}
                  alt={e.alt || e.title}
                  width={800}
                  height={600}
                  fill
                  sizes="(max-width: 640px) 100vw, 360px"
                  label={e.title}
                />
              </div>
              <div className="p-5">
                <p className="text-[13px] font-black tracking-widest text-accent">
                  {String(i + 1).padStart(2, "0")}
                </p>
                <h3 className="mt-0.5 font-black">{e.title}</h3>
                <p className="mt-1 text-[14px] text-ink-500">{e.sub}</p>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      {/* 비전 */}
      <Section className="bg-ink text-white">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-[13px] font-black tracking-[0.3em] text-accent">
            VISION 2026
          </p>
          <h2 className="mt-4 text-3xl leading-tight font-black tracking-tight md:text-5xl">
            {vision.headline}
          </h2>
          <p className="mt-5 leading-relaxed text-white/60 md:text-lg">{vision.body}</p>
        </div>

        <ul className="mt-14 grid gap-5 md:grid-cols-3">
          {vision.goals.map((g) => (
            <li key={g.no} className="rounded-2xl bg-ink-800 p-7">
              <p className="text-[13px] font-black tracking-widest text-accent">
                GOAL {g.no}
              </p>
              <h3 className="mt-2 text-xl font-black">{g.title}</h3>
              <p className="mt-2 leading-relaxed text-white/55">{g.desc}</p>
            </li>
          ))}
        </ul>

        <div className="mt-14 text-center">
          <Link
            href="/quote"
            className="inline-block rounded-xl bg-brand px-8 py-4 font-black text-white transition-colors hover:bg-brand-600"
          >
            견적 문의하기
          </Link>
        </div>
      </Section>
    </>
  );
}
