import Link from "next/link";
import HeroSlider from "@/components/HeroSlider";
import QuickQuoteForm from "@/components/QuickQuoteForm";
import Img from "@/components/Img";
import Reveal from "@/components/Reveal";
import { Section, SectionHeading } from "@/components/Section";
import { equipment, signTypes, stats, steps } from "@/config/content";
import { site } from "@/config/site";
import { getSlides, getWorks } from "@/lib/cms";
import { imageExists } from "@/lib/images";

/**
 * 요청 시 렌더링합니다.
 *
 * ISR(`revalidate`)을 쓰지 않는 이유: Cloudflare 배포에서 ISR 은 별도 캐시 저장소가
 * 있어야 하는데, 없으면 요청마다 재생성을 시도하다 타임아웃이 납니다.
 * 덕분에 관리자가 사진을 바꾸면 10분 기다릴 필요 없이 곧바로 반영됩니다.
 *
 * ⚠️ 대신 **HTML 캐시가 없습니다.** `next.config.ts` 의 `headers()` 는 동적 페이지에
 *    적용되지 않고(Next 가 `no-cache` 를 직접 붙임), `public/_headers` 는 정적 자산
 *    전용입니다. 즉 방문 1회 = SSR 1회 + DB 조회 1~2회.
 *    지역 업체 트래픽에선 무료 한도에 한참 못 미치지만, 커지면 Cloudflare Cache Rules
 *    또는 R2 를 붙여 ISR 을 되살리는 게 정석입니다. (docs/ARCHITECTURE.md §7)
 */
export const dynamic = "force-dynamic";

export default async function Home() {
  const [slides, works] = await Promise.all([getSlides(), getWorks()]);
  const heroSlides = slides.map((s) => ({ ...s, available: imageExists(s.image) }));

  return (
    <>
      <HeroSlider slides={heroSlides} />

      {/* 모바일에서는 히어로 아래에 간편 상담 폼 */}
      <div className="bg-ink px-6 pb-14 md:hidden">
        <QuickQuoteForm />
      </div>

      {/* 사업 영역 — 히어로 위로 살짝 올라타며 다음 화면으로 넘어갑니다 */}
      <nav
        id="business"
        aria-label="사업 영역 바로가기"
        className="relative z-10 -mt-8 scroll-mt-24 rounded-t-[28px] border-b border-line bg-white shadow-[0_-12px_40px_rgba(0,0,0,.18)] md:-mt-10 md:rounded-t-[36px]"
      >
        <ul className="wrap grid grid-cols-2 divide-x divide-y divide-line lg:grid-cols-4 lg:divide-y-0">
          {signTypes.map((t, idx) => (
            <li key={t.slug}>
              <Link
                href={`/signs#${t.slug}`}
                className="group flex flex-col items-center gap-1 px-4 py-8 text-center transition-colors hover:bg-paper md:py-10"
              >
                <Reveal delay={idx * 70}>
                  <span className="block text-[11px] font-bold tracking-[0.2em] text-ink-500">
                    {t.en}
                  </span>
                  <span className="mt-1 block text-lg font-black transition-colors group-hover:text-brand">
                    {t.name}
                  </span>
                </Reveal>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* 왜 우리인가 */}
      <Section>
        <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:items-center">
          <Reveal>
            <SectionHeading
              eyebrow="WHY SUSANNA"
              title={
                <>
                  만드는 곳과 다는 곳이
                  <br />
                  같아야 책임이 명확합니다
                </>
              }
              desc="제작과 시공이 나뉘면 문제가 생겼을 때 서로를 가리킵니다. 수산나디자인은 2012년부터 디자인·제작·시공·관리를 한 팀이 맡아 왔습니다."
            />

            <ul className="mt-8 space-y-4">
              {[
                {
                  t: "795평 자체 공장",
                  d: "절단·가공·도색·조립을 외주 없이 공장 안에서 끝냅니다.",
                },
                {
                  t: "사인물과 철구조물을 함께",
                  d: "캐노피·파사드 같은 구조물까지 한 번에 설계하고 시공합니다.",
                },
                {
                  t: "대형 현장 경험",
                  d: "삼성화재, KAIST, 교보생명, 금성백조, 대전무역회관 등을 시공했습니다.",
                },
                {
                  t: "인증·등록 6종 보유",
                  d: "옥외광고사업 등록, 직접생산확인, 공장등록을 갖춘 정식 등록 업체입니다.",
                },
              ].map((f) => (
                <li key={f.t} className="flex gap-4">
                  <span
                    aria-hidden="true"
                    className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand"
                  />
                  <div>
                    <p className="font-bold">{f.t}</p>
                    <p className="mt-0.5 text-[15px] leading-relaxed text-ink-500">{f.d}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={140} className="relative aspect-4/3 overflow-hidden rounded-2xl">
            <Img
              src="/images/about-factory.jpg"
              alt="수산나디자인 자체 공장 전경"
              width={1200}
              height={900}
              fill
              sizes="(max-width: 1024px) 100vw, 640px"
              label="공장 전경 / 작업 현장"
            />
          </Reveal>
        </div>

        {/* 신뢰 지표 */}
        <dl className="mt-16 grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-line lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="bg-white px-6 py-8 text-center">
              <dd className="text-3xl font-black tracking-tight md:text-4xl">
                {s.value}
                <span className="ml-0.5 text-lg text-ink-500">{s.unit}</span>
              </dd>
              <dt className="mt-1.5 text-[14px] font-medium text-ink-500">{s.label}</dt>
            </div>
          ))}
        </dl>
      </Section>

      {/* 제작 공정 */}
      <Section className="bg-paper">
        <SectionHeading
          eyebrow="PROCESS"
          title="상담부터 시공까지, 이렇게 진행됩니다"
          desc="현장 확인과 시안 제작까지 무료로 진행합니다."
          center
        />

        <ol className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
          {steps.map((s, idx) => (
            <Reveal
              as="li"
              key={s.no}
              delay={idx * 90}
              className="overflow-hidden rounded-2xl bg-white"
            >
              <div className="relative aspect-4/3">
                <Img
                  src={s.image}
                  alt={s.title}
                  width={640}
                  height={480}
                  fill
                  sizes="(max-width: 640px) 100vw, 300px"
                  label={`${s.no}. ${s.title}`}
                />
              </div>
              <div className="p-6">
                <p className="text-[13px] font-black tracking-widest text-brand">{s.no}</p>
                <h3 className="mt-1 text-lg font-black">{s.title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-ink-500">{s.desc}</p>
              </div>
            </Reveal>
          ))}
        </ol>

        <div className="mt-10 text-center">
          <Link
            href="/process"
            className="inline-flex items-center gap-2 rounded-lg border-2 border-ink px-7 py-3.5 font-bold transition-colors hover:bg-ink hover:text-white"
          >
            공정 자세히 보기 <span aria-hidden="true">→</span>
          </Link>
        </div>
      </Section>

      {/* 시공 실적 */}
      <Section>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHeading
            eyebrow="OUR WORK"
            title="주요 실적"
            desc="관공서 · 금융 · 기업 · 상업시설 등 다양한 분야에서 시공했습니다."
          />
          <Link
            href="/works"
            className="text-[15px] font-bold text-brand underline underline-offset-4"
          >
            전체 실적 보기 →
          </Link>
        </div>

        <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {works.slice(0, 6).map((w, idx) => (
            <Reveal as="li" key={w.slug} delay={(idx % 3) * 100} className="group">
              <div className="relative aspect-4/3 overflow-hidden rounded-xl bg-paper">
                <Img
                  src={w.image}
                  alt={w.title}
                  width={1200}
                  height={900}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px"
                  label={`${w.category} · ${w.title}`}
                  className="transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="mt-3">
                <p className="text-[13px] font-bold text-brand">{w.category}</p>
                <h3 className="mt-0.5 font-bold">{w.title}</h3>
                <p className="mt-0.5 text-[13px] text-ink-500">
                  {[w.location, ...w.tags].filter(Boolean).join(" · ")}
                </p>
              </div>
            </Reveal>
          ))}
        </ul>
      </Section>

      {/* 보유 장비 */}
      <Section className="bg-ink text-white">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr] lg:items-center">
          <SectionHeading
            eyebrow="FABRICATION"
            title={
              <>
                공장을 가졌다는 건
                <br />
                일정을 지킬 수 있다는 뜻입니다
              </>
            }
            desc="절단부터 검수까지 795평 자체 공장 안에서 끝냅니다. 외주 대기로 납기가 밀리지 않습니다."
            dark
          />
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {equipment.map((e, idx) => (
              <Reveal
                as="li"
                key={e.name}
                delay={(idx % 3) * 90}
                className="overflow-hidden rounded-xl bg-ink-800"
              >
                <div className="relative aspect-square">
                  <Img
                    src={e.image}
                    alt={e.name}
                    width={800}
                    height={600}
                    fill
                    sizes="200px"
                    label={e.name}
                    dark
                  />
                </div>
                <div className="p-4">
                  <p className="font-bold">{e.name}</p>
                  <p className="mt-0.5 text-[13px] text-white/50">{e.desc}</p>
                </div>
              </Reveal>
            ))}
          </ul>
        </div>
      </Section>

      {/* 마무리 CTA */}
      <section className="bg-brand py-16 text-white md:py-20">
        <div className="wrap flex flex-col items-center gap-8 text-center md:flex-row md:justify-between md:text-left">
          <div>
            <h2 className="text-3xl font-black tracking-tight md:text-4xl">
              어느 정도 규모인지 알려주세요
            </h2>
            <p className="mt-3 leading-relaxed text-white/85">
              현장 확인과 디자인 시안까지 무료입니다. 부담 없이 문의하세요.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/quote"
              className="rounded-xl bg-white px-8 py-4 text-lg font-black text-brand transition-transform hover:scale-105"
            >
              무료 견적 신청
            </Link>
            <a
              href={site.phoneHref}
              className="rounded-xl border-2 border-white/60 px-8 py-4 text-lg font-black transition-colors hover:bg-white/10"
            >
              {site.phone}
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
