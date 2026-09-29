import Link from "next/link";
import HeroSlider from "@/components/HeroSlider";
import HomeWorks from "@/components/HomeWorks";
import QuickQuoteForm from "@/components/QuickQuoteForm";
import Img from "@/components/Img";
import JsonLd from "@/components/JsonLd";
import MakerShowcase from "@/components/MakerShowcase";
import Reveal from "@/components/Reveal";
import { Section, SectionHeading } from "@/components/Section";
import { SHOW_FABRICATION, makerShowcase, workCategories } from "@/config/content";
import { MAKER_BETA, MAKER_ON_HOME, SHOW_MAKER } from "@/config/maker";
import { site } from "@/config/site";
import { getBlocks, getSlides, getWorks } from "@/lib/cms";
import { imageExists } from "@/lib/images";
import { getPreview } from "@/lib/preview";

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

/**
 * 검색 결과에 뜨는 **사이트 이름**을 정합니다.
 *
 * 이게 없으면 구글이 도메인(`susannadesign.co.kr`)을 그대로 씁니다. 실제로
 * 2026-07-27 검색 결과가 그랬습니다. `og:site_name` 도 이미 "수산나디자인" 인데
 * 구글 문서상 **`WebSite` 구조화 데이터가 가장 우선하는 신호**라 따로 넣습니다.
 * (신호 우선순위: WebSite 구조화 데이터 → og:site_name → title → 제목 태그)
 *
 * ⚠️ **홈에만 넣습니다.** 구글은 도메인 최상위 홈페이지의 `WebSite` 만 인정하고
 *    하위 경로(`/works` 등)의 것은 무시합니다. 그래서 `app/layout.tsx` 의
 *    LocalBusiness 와 달리 이 파일에 둡니다. 한 도메인에 사이트 이름은 하나뿐입니다.
 */
const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: site.name,
  alternateName: [site.legalName, site.nameEn],
  url: site.url,
};

/**
 * 구역 제목은 관리자 화면에서 줄바꿈을 넣을 수 있습니다(F19).
 * 화면에서도 같은 자리에서 줄이 나뉘도록 `whitespace-pre-line` 로 감쌉니다.
 */
/** 공장 띠의 큰 평수 숫자 — 2026-09-29 «일단 안 보이게». true 로 두면 다시 나옵니다 */
const SHOW_FACTORY_NUMBER = false;

function Lines({ text }: { text: string }) {
  return <span className="block whitespace-pre-line">{text}</span>;
}

export default async function Home() {
  const [slides, works, blocks, preview] = await Promise.all([
    getSlides(),
    getWorks(),
    getBlocks(),
    getPreview(),
  ]);
  const heroSlides = slides.map((s) => ({ ...s, available: imageExists(s.image) }));

  /** 없는 구역을 불러도 화면이 깨지지 않게 빈 문구를 돌려줍니다 [A1] */
  const copy = (slug: string) =>
    blocks.copy[slug] ?? { eyebrow: "", title: "", desc: "" };

  return (
    <>
      <JsonLd data={websiteJsonLd} />
      <HeroSlider slides={heroSlides} />

      {/* 모바일에서는 히어로 아래에 간편 상담 폼.
          ⚠️ 데스크톱용 한 벌이 `HeroSlider` 안에 따로 있습니다 — CSS 로 한쪽씩 숨겨도
             DOM 에는 둘 다 남으므로 `idPrefix` 를 서로 다르게 줘야 라벨이 제 칸을
             가리킵니다 (`components/QuickQuoteForm.tsx` 머리말). */}
      <div className="bg-ink px-6 pb-14 md:hidden">
        <QuickQuoteForm idPrefix="mobile" />
      </div>

      {/* 사업 영역 — 히어로 위로 살짝 올라타며 다음 화면으로 넘어갑니다 */}
      <nav
        id="business"
        aria-label="사업 영역 바로가기"
        className="relative z-10 -mt-8 scroll-mt-24 rounded-t-[28px] border-b border-line bg-white shadow-[0_-12px_40px_rgba(0,0,0,.18)] md:-mt-10 md:rounded-t-[36px]"
      >
        <ul className="wrap grid grid-cols-2 divide-x divide-y divide-line lg:grid-cols-4 lg:divide-y-0">
          {blocks.signTypes.map((t, idx) => (
            <li key={t.slug || idx}>
              <Link
                href={t.slug ? `/signs#${t.slug}` : "/signs"}
                className="group flex flex-col items-center gap-1 px-4 py-8 text-center transition-colors hover:bg-paper md:py-10"
              >
                <Reveal delay={idx * 70}>
                  <span className="block text-[11px] font-bold tracking-[0.2em] text-ink-500">
                    {t.eyebrow}
                  </span>
                  <span className="mt-1 block text-lg font-black transition-colors group-hover:text-brand">
                    {t.title}
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
              eyebrow={copy("home-why").eyebrow}
              title={<Lines text={copy("home-why").title} />}
              desc={copy("home-why").desc}
            />

            <ul className="mt-8 space-y-4">
              {blocks.why.map((f, idx) => (
                <li key={f.title || idx} className="flex gap-4">
                  <span
                    aria-hidden="true"
                    className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand"
                  />
                  <div>
                    <p className="font-bold">{f.title}</p>
                    <p className="mt-0.5 text-[15px] leading-relaxed text-ink-500">
                      {f.sub}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={140} className="relative aspect-4/3 overflow-hidden rounded-2xl">
            <Img
              src="/images/about-factory.jpg"
              alt="수산나디자인 제작·시공 현장 — 크레인 고소작업으로 건물 외벽 사인을 다는 모습과 자체 공장에서 제작 중인 채널문자"
              width={1600}
              height={1200}
              fill
              sizes="(max-width: 1024px) 100vw, 640px"
              label="제작 · 시공 현장"
            />
          </Reveal>
        </div>
      </Section>

      {/*
        제작 공정 — 2026-09-29 사람 결정(«2안»의 프로세스). 왼쪽에 제목(넓은 화면에서 따라 내려옴),
        오른쪽에 STEP 01~05 를 세로 줄로 잇고 단계마다 할 일(`points`)을 적습니다 — 한샘 리하우스
        «상담부터 시공까지 프로세스 안내»의 세로 흐름(reference/reference.md 부록 B).
        `points` 가 비어 있는 단계는 한 줄 소개(`sub`)를 대신 보여 줍니다 [A1].
      */}
      <Section className="bg-paper">
        <div className="grid gap-12 lg:grid-cols-[360px_1fr] lg:gap-20">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <SectionHeading
              eyebrow={copy("home-process").eyebrow}
              title={<Lines text={copy("home-process").title} />}
              desc={copy("home-process").desc}
            />
            <Link href="/process" className="btn btn-quiet mt-8 px-7 py-3.5">
              공정 자세히 보기 <span aria-hidden="true">→</span>
            </Link>
          </div>

          <ol className="relative pl-10 before:absolute before:top-4 before:bottom-10 before:left-[7px] before:w-px before:bg-line md:pl-11">
            {blocks.process.map((s, idx) => {
              const lines = s.points.length ? s.points : [s.sub];
              return (
                <Reveal
                  as="li"
                  key={s.eyebrow || idx}
                  delay={idx * 80}
                  className="relative mb-3.5 border border-line bg-white px-6 py-6 md:px-8 md:py-7"
                >
                  <span
                    aria-hidden="true"
                    className="absolute top-[30px] -left-[40px] block h-[15px] w-[15px] rounded-full border-[3px] border-brand bg-white md:top-[34px] md:-left-[44px]"
                  />
                  <div className="flex flex-col gap-1 md:flex-row md:items-baseline md:gap-6">
                    <p className="shrink-0 text-[13px] font-bold tracking-[0.18em] text-brand-700 md:w-20">
                      STEP {s.eyebrow || String(idx + 1).padStart(2, "0")}
                    </p>
                    <h3 className="text-[20px] font-bold md:text-[22px]">{s.title}</h3>
                  </div>
                  <ul className="mt-3 space-y-1 md:ml-[104px]">
                    {lines.map((line) => (
                      <li
                        key={line}
                        className="relative pl-3.5 text-[15px] leading-relaxed text-ink-500 before:absolute before:top-[0.8em] before:left-0 before:h-px before:w-1.5 before:bg-ink-500"
                      >
                        {line}
                      </li>
                    ))}
                  </ul>
                </Reveal>
              );
            })}
          </ol>
        </div>
      </Section>

      {/* 시공 실적 — 2026-09-29 사람 결정: 칩 + 큰 사진 하나와 작은 사진 넷(components/HomeWorks.tsx) */}
      <Section>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHeading
            eyebrow={copy("home-works").eyebrow}
            title={<Lines text={copy("home-works").title} />}
            desc={copy("home-works").desc}
          />
          <Link href="/works" className="btn btn-quiet px-7 py-3.5">
            실적 전체 보기 <span aria-hidden="true">→</span>
          </Link>
        </div>

        <div className="mt-10">
          <HomeWorks
            works={works.map((w) => ({ ...w, available: imageExists(w.image) }))}
            categories={workCategories}
          />
        </div>
      </Section>

      {/*
        공장 띠 — 2026-09-29 사람 결정(«2안»). 사진을 가득 깔고 «공장을 가졌다는 건…» 문구 + 큰 숫자.
        문구는 CMS 의 `home-fabrication` 머리말이고 숫자는 `site.factory` 에서 옵니다 [A5].
        아래 «보유 장비» 목록(SHOW_FABRICATION)과는 다른 물건입니다 — 그건 여전히 꺼져 있습니다.
      */}
      <section className="relative isolate overflow-hidden bg-ink text-white">
        <Img
          src="/images/about-factory.jpg"
          alt="수산나디자인 자체 공장에서 제작한 채널문자와 크레인 고소작업 현장"
          width={1600}
          height={1200}
          fill
          sizes="100vw"
          label="자체 공장"
          dark
          className="-z-10 object-cover"
        />
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-ink/60" />
        <div className="wrap flex flex-col gap-10 py-24 md:flex-row md:items-center md:justify-between md:py-36">
          <Reveal>
            <p className="mb-4 text-[13px] font-bold tracking-[0.24em] text-brand-400">
              {copy("home-fabrication").eyebrow}
            </p>
            <h2 className="text-3xl leading-snug font-normal tracking-tight md:text-5xl">
              <Lines text={copy("home-fabrication").title} />
            </h2>
            <p className="mt-5 max-w-xl leading-relaxed text-white/85 md:text-lg">
              {copy("home-fabrication").desc}
            </p>
          </Reveal>
          {/* 큰 숫자(평수) — 2026-09-29 사람 결정 «일단 안 보이게». 다시 켜려면 SHOW_FACTORY_NUMBER */}
          {SHOW_FACTORY_NUMBER && (
            <Reveal delay={120} className="md:text-right">
              <p className="text-7xl leading-none font-normal md:text-8xl">
                {site.factory.replace(/[^0-9]/g, "")}
              </p>
              <p className="mt-3 text-white/80">{site.factory.replace(/[0-9]/g, "")} 자체 제작 공장</p>
            </Reveal>
          )}
        </div>
      </section>

      {/* 보유 장비 — config/content.ts 의 SHOW_FABRICATION 로 여닫습니다 (지금은 닫힘).
          `/about` 의 같은 구역과 스위치를 공유하므로 한 번 켜면 양쪽이 같이 켜집니다. */}
      {SHOW_FABRICATION && (
        <Section className="bg-ink text-white">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr] lg:items-center">
            <SectionHeading
              eyebrow={copy("home-fabrication").eyebrow}
              title={<Lines text={copy("home-fabrication").title} />}
              desc={copy("home-fabrication").desc}
              dark
            />
            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {blocks.fabrication.map((e, idx) => (
                <Reveal
                  as="li"
                  key={e.title || idx}
                  delay={(idx % 3) * 90}
                  className="overflow-hidden rounded-xl bg-ink-800"
                >
                  <div className="relative aspect-square">
                    <Img
                      src={e.image}
                      alt={e.alt || e.title}
                      width={800}
                      height={600}
                      fill
                      sizes="200px"
                      label={e.title}
                      dark
                    />
                  </div>
                  <div className="p-4">
                    <p className="font-bold">{e.title}</p>
                    <p className="mt-0.5 text-[13px] text-white/50">{e.sub}</p>
                  </div>
                </Reveal>
              ))}
            </ul>
          </div>
        </Section>
      )}

      {/* 수산나 메이커 (F30) — 청록 띠를 아래로 밀고 그 위에 새로 낸 자리.
          메이커가 손님에게 닫혀 있으면(SHOW_MAKER) 단추·카드가 견적으로 갑니다 — /maker 는 404 라서.
          구역 자체는 MAKER_ON_HOME 이 꺼져 있으면 미리보기(F23) 중인 관리자에게만 그립니다 (2026-09-28). */}
      {(MAKER_ON_HOME || preview.on) && (
        <MakerShowcase
          copy={copy("home-maker")}
          cards={makerShowcase.cards}
          cta={SHOW_MAKER ? { ...makerShowcase.open, beta: MAKER_BETA } : makerShowcase.closed}
        />
      )}

      {/* 마무리 CTA — 2026-09-29 사람 결정(«2안»): 청록 띠 대신 흰 바탕 가운데 정렬 + 먹 버튼 둘 */}
      <section className="border-t border-line py-20 text-center md:py-24">
        <div className="wrap">
          <h2 className="text-3xl font-normal tracking-tight whitespace-pre-line md:text-[42px]">
            {copy("home-cta").title}
          </h2>
          <p className="mt-3 leading-relaxed whitespace-pre-line text-ink-500">
            {copy("home-cta").desc}
          </p>
          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/quote" className="btn px-8 py-4 text-lg">
              무료 견적 신청 <span aria-hidden="true">→</span>
            </Link>
            <a href={site.phoneHref} className="btn btn-quiet px-8 py-4 text-lg">
              {site.phone}
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
