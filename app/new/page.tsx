import type { Metadata } from "next";
import localFont from "next/font/local";
import Link from "next/link";
import HeroPop, { type PopSlide } from "@/components/HeroPop";
import HomeWorks from "@/components/HomeWorks";
import Img from "@/components/Img";
import ProcessPanels from "@/components/ProcessPanels";
import QuickQuoteForm from "@/components/QuickQuoteForm";
import Reveal from "@/components/Reveal";
import { SectionHeading } from "@/components/Section";
import { SHOW_DETAIL_POPUPS, stepPhotoAlt, workCategories } from "@/config/content";
import { seo, site } from "@/config/site";
import { getBlocks, getWorks } from "@/lib/cms";
import JsonLd from "@/components/JsonLd";
import { imageExists } from "@/lib/images";
import { getPreview } from "@/lib/preview";
import { pageMetadata } from "@/lib/seo";
import hero from "@/public/images/hero-new/slides.json";
import "./new.css";

/**
 * /new — 광고로 전국에 보내는 두 번째 홈 (2026-11-17 사람 결정).
 *
 * 사람: «랜딩페이지 홈은 그대로 가고 new 로 이걸 같이 운영» · «new 는 광고를 때려서 전국으로 가게 하려고, 그래서 대전을 없앤 거야»
 *       · «다른 건 기존에서 가져오는데 단을 나누지 말고 배경 히어로 배경 색 그대로 유지».
 *
 * - 첫 화면만 새것(`components/HeroPop.tsx`). 아래 구역은 예전 홈(`app/page.tsx` 아래쪽)의 내용·출처를 그대로 씁니다(CMS).
 * - 바탕은 처음부터 끝까지 종이색 한 장 — 흰 칸·먹색 띠·구역 경계선을 두지 않습니다(`new.css`).
 * - 🔴 «대전»은 이 페이지 문구에서 뺍니다. CMS 문구에 들어 있어도 `national()` 이 지웁니다(시공 사례의 «지역» 칸은 사실이라 둡니다).
 * - 🔴 공장 평수는 적지 않습니다(2026-11-17 사람: «홈페이지에 이제 평수는 안 적을거야»).
 * - 🔴 검색엔진에 엽니다(2026-11-18 사람: «new 페이지 모든 곳에서 로봇 및 구글 네이버가 막 접근할 수 있게 다 열어줘, 구조로도 다 연결해주고»).
 *   예전(11-17)엔 noindex 였습니다 — 예전 홈과 문구가 겹쳐 검색 순위가 갈리지 않게. 그 위험은 그대로 남아 있어 ARCHITECTURE §7 부채에 적었습니다.
 *   제목·설명은 `config/site.ts` `seo.pages["/new"]` 한 곳 — 메타·OG·사이트맵·llms.txt 가 다 거기서 나옵니다.
 *   연결: 사이트맵(`app/sitemap.ts`) · 푸터 «사업» 열 · llms.txt «주요 페이지» · 아래 WebPage 구조화 데이터(회사 `#business` 에 이음).
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = pageMetadata("/new");

const pretendard = localFont({
  src: [
    { path: "./fonts/Pretendard-Regular-new.woff2", weight: "400" },
    { path: "./fonts/Pretendard-SemiBold-new.woff2", weight: "600" },
    { path: "./fonts/Pretendard-ExtraBold-new.woff2", weight: "800" },
  ],
  variable: "--font-pretendard-new",
  display: "swap",
  preload: true,
});
const archivo = localFont({
  src: [{ path: "./fonts/ArchivoExpanded-Black-new.woff2", weight: "900" }],
  variable: "--font-archivo-new",
  display: "swap",
});

/** 첫 화면 문구 — 예전 홈 히어로 문구에서 «대전»과 평수를 뺀 것. 사진·튀어나옴 자리는 slides.json(시안에서 뽑음) */
const COPY: { title: string; sub?: string; alt: string }[] = [
  // 1·2장 문구는 시안과 맞바꿨습니다(2026-11-17 사람: «수산나디자인입니다 글씨를 우리 수산나디자인 그림에, 간판을 마음껏 만들어 보세요를 아이덴티스트에»)
  {
    title: "안녕하세요 수산나디자인입니다",
    sub: "간판을 디자인하고, 직접 만들어 설치해 온 업체입니다. 상담부터 시공 후 관리까지 한자리에서 맡습니다.",
    alt: "수산나디자인 공장 정면, 빨간 차양 끝에 단 (주)수산나디자인 간판",
  },
  { title: "간판을 마음껏 만들어 보세요", alt: "수산나디자인이 만든 무대 사인" },
  {
    title: "건물의 이름을 가장 높은 곳에",
    sub: "빌딩 외벽, 옥상 광고탑, 도로변 사인까지. 규모가 큰 현장을 다뤄 왔습니다.",
    alt: "건물 옥상에 대형 채널 간판을 시공한 모습",
  },
  {
    title: "사인물을 넘어 철구조물까지",
    sub: "캐노피, 파사드, 구조물 설계와 제작, 시공을 함께 진행합니다.",
    alt: "상가 건물 외벽에 대형 사인물을 설치한 모습",
  },
  {
    title: "자체 공장에서 직접 만듭니다",
    sub: "절단, 가공, 도색, 조립을 공장 안에서 끝내기 때문에 일정과 품질을 저희가 통제합니다.",
    alt: "수산나디자인 공장 작업실에서 간판 도면을 작업하는 모습",
  },
];

/** 전국 광고용 — 문구에서 «대전» 지역 표현과 공장 평수를 지웁니다 */
function national(t: string) {
  return t
    .replace(/\s*\d[\d,]*\s*평\s*/g, " ")
    // «대전 간판», «대전에서», «대전 소재» 처럼 지역을 말할 때만. «대전무역회관» 같은 고유 이름은 붙어 있어 안 걸립니다.
    .replace(/대전(광역시)?(\s*소재|\s*지역|에서|의)?\s+/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/^\s+|\s+$/gm, "");
}

function Lines({ text }: { text: string }) {
  return <span className="block whitespace-pre-line">{national(text)}</span>;
}

export default async function NewHome() {
  const [works, blocks, preview] = await Promise.all([getWorks(), getBlocks(), getPreview()]);
  const detail = SHOW_DETAIL_POPUPS || preview.on;
  const copy = (slug: string) => {
    const c = blocks.copy[slug] ?? { eyebrow: "", title: "", desc: "" };
    return { eyebrow: national(c.eyebrow), title: c.title, desc: national(c.desc) };
  };

  const slides: PopSlide[] = hero.slides.map((h, k) => ({
    title: COPY[k].title,
    sub: COPY[k].sub,
    alt: COPY[k].alt,
    bg: h.bg,
    pop: h.pop ?? undefined,
  }));

  return (
    <div className={`new-home ${pretendard.variable} ${archivo.variable}`}>
      {/* 이 페이지가 회사(layout 의 `#business`)의 한 페이지임을 검색엔진에 알립니다 */}
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          "@id": `${site.url}/new#webpage`,
          url: `${site.url}/new`,
          name: `${seo.pages["/new"].title} | ${site.name}`,
          description: seo.pages["/new"].description,
          inLanguage: "ko-KR",
          isPartOf: { "@type": "WebSite", name: site.name, url: `${site.url}/` },
          about: { "@id": `${site.url}/#business` },
        }}
      />
      <HeroPop
        slides={slides}
        eyebrow="간판 제작 및 시공"
        cta={{ href: "/quote", label: "간판 문의하기" }}
      />

      {/* 폰 — 첫 화면 아래 간편 상담 폼(예전 홈과 같은 자리). 바탕은 종이색 그대로 */}
      <div className="px-5 pt-6 pb-4 md:hidden">
        <QuickQuoteForm idPrefix="mobile" />
      </div>

      {/* 사업 영역 — 예전 홈의 네 칸. 칸 나눔 선·흰 바탕 없이 글자만 */}
      <nav id="business" aria-label="사업 영역 바로가기" className="scroll-mt-24 pt-10 md:pt-16">
        <ul className="wrap grid grid-cols-2 gap-y-2 lg:grid-cols-4">
          {blocks.signTypes.map((t, idx) => (
            <li key={t.slug || idx}>
              <Link
                href={t.slug ? `/signs#${t.slug}` : "/signs"}
                className="group flex flex-col items-center gap-1 px-4 py-6 text-center md:py-8"
              >
                <Reveal delay={idx * 70}>
                  <span className="block text-[13px] font-bold tracking-[0.2em] text-ink-500">{national(t.eyebrow)}</span>
                  <span className="mt-1 block text-lg font-black transition-colors group-hover:text-brand">
                    {national(t.title)}
                  </span>
                </Reveal>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* 왜 우리인가 */}
      <section className="sec-y">
        <div className="wrap grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:items-center">
          <Reveal>
            <SectionHeading
              eyebrow={copy("home-why").eyebrow}
              title={<Lines text={copy("home-why").title} />}
              desc={copy("home-why").desc}
            />
            <ul className="mt-8 space-y-4">
              {blocks.why.map((f, idx) => (
                <li key={f.title || idx} className="flex gap-4">
                  <span aria-hidden="true" className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand" />
                  <div>
                    <p className="font-bold">{national(f.title)}</p>
                    <p className="mt-0.5 text-[15px] leading-relaxed text-ink-500 md:text-base">{national(f.sub)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={140} className="relative aspect-4/3 overflow-hidden">
            <Img
              src="/images/about-factory.jpg"
              alt="수산나디자인 제작, 시공 현장. 크레인 고소작업으로 건물 외벽 사인을 다는 모습과 자체 공장에서 제작 중인 채널문자"
              width={1600}
              height={1200}
              fill
              sizes="(min-width: 1024px) 52vw, 100vw"
              label="제작 · 시공 현장"
            />
          </Reveal>
        </div>
      </section>

      {/* 제작 공정 — 예전 홈의 사진 패널 */}
      <section className="sec-y">
        <div className="wrap">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <SectionHeading
              eyebrow={copy("home-process").eyebrow}
              title={<Lines text={copy("home-process").title} />}
              desc={copy("home-process").desc}
            />
            <Link href="/process" className="btn btn-quiet px-7 py-3.5">
              공정 자세히 보기 <span aria-hidden="true">→</span>
            </Link>
          </div>
          <Reveal className="mt-6">
            <ProcessPanels
              panels={blocks.process.map((s, idx) => ({
                no: s.eyebrow || String(idx + 1).padStart(2, "0"),
                title: national(s.title),
                lines: (s.points.length ? s.points : [s.sub]).map(national),
                image: s.image,
                alt: s.alt || stepPhotoAlt[s.image] || `${s.title} 단계`,
                available: !!s.image && imageExists(s.image),
              }))}
            />
          </Reveal>
        </div>
      </section>

      {/* 시공 실적 */}
      <section className="sec-y">
        <div className="wrap">
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
          <div className="mt-6">
            <HomeWorks
              works={works.map((w) => ({ ...w, available: imageExists(w.image) }))}
              categories={workCategories}
              detail={detail}
            />
          </div>
        </div>
      </section>

      {/* 공장 사진 — 예전 홈은 화면 끝까지 먹색 띠였는데, 여기서는 첫 화면 사진 칸처럼 같은 폭의 네모로(띠를 만들지 않으려고) */}
      <section aria-label="자체 공장 사진" className="wrap">
        <div className="relative h-[220px] overflow-hidden md:h-[420px]">
          <Img
            src="/images/about-factory.jpg"
            alt="수산나디자인 자체 공장에서 제작한 채널문자와 크레인 고소작업 현장"
            width={1600}
            height={1200}
            fill
            sizes="100vw"
            label="자체 공장"
            className="object-cover"
          />
        </div>
      </section>

      {/* 마무리 — 예전 홈과 같은 문구·단추, 위 경계선 없이 */}
      <section className="sec-y text-center">
        <div className="wrap">
          <h2 className="text-3xl leading-tight font-normal tracking-tight whitespace-pre-line md:text-[42px]">
            {national(copy("home-cta").title)}
          </h2>
          <p className="mt-4 text-base leading-relaxed whitespace-pre-line text-ink-500 md:text-lg">
            {copy("home-cta").desc}
          </p>
          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/quote" className="btn px-7 py-3.5">
              무료 견적 신청 <span aria-hidden="true">→</span>
            </Link>
            <a href={site.phoneHref} className="btn btn-quiet px-7 py-3.5">
              {site.phone}
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
