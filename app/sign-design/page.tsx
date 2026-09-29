import Link from "next/link";
import Img from "@/components/Img";
import JsonLd from "@/components/JsonLd";
import Reveal from "@/components/Reveal";
import SignDesignInquiry from "@/components/SignDesignInquiry";
import { PageHero } from "@/components/Section";
import { signTypes9 } from "@/config/content";
import { signDesigns } from "@/config/signDesign";
import { seo, site } from "@/config/site";
import { getBlocks } from "@/lib/cms";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata("/sign-design");

/** 간판 이름·설명을 DB(`sign_model`)에서 읽습니다 — `/signs` 와 같은 이유로 요청 시 렌더링 */
export const dynamic = "force-dynamic";

/**
 * 간판디자인 (F31, 2026-09-29) — 간판 열 가지를 «가장 잘 어울리는 가게» 에 걸어 본 연출 모음.
 * 간판마다 사진 · 어울리는 가게 · 설명 · 고를 수 있는 것 · «이 간판으로 문의하기» 를 두고,
 * 맨 아래 문의하기(간편 견적 폼)에서 고른 간판이 같이 실려 갑니다.
 * 내용은 `config/signDesign.ts` [A5], 이름·설명은 `sign_model`(없으면 `signTypes9`) [A1].
 */
export default async function SignDesignPage() {
  const { signModels } = await getBlocks();

  const items = signDesigns.map((d) => {
    const db = signModels.find((m) => m.slug === d.key);
    const cfg = signTypes9.find((t) => t.key === d.key);
    return {
      ...d,
      name: d.name || db?.title || cfg?.name || d.key,
      code: db?.eyebrow || cfg?.code || "",
      desc: db?.body || cfg?.desc || d.desc || "",
    };
  });

  /**
   * AI·검색엔진이 읽는 구조화 데이터 — 간판 열 가지를 «서비스» 목록으로 냅니다.
   * 제공자는 `app/layout.tsx` 의 LocalBusiness(`#business`)를 가리켜 «이 회사가 하는 일» 로 이어집니다.
   * 화면에 보이는 것과 같은 내용만 담습니다(이름 · 어울리는 가게 · 설명 · 사진). 가격은 없습니다.
   */
  const serviceList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${site.name} 간판디자인`,
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Service",
        "@id": `${site.url}/sign-design#${it.key}`,
        name: it.name,
        serviceType: it.name,
        description: `${it.why} ${it.desc.replace(/\n+/g, " ")}`.trim(),
        image: `${site.url}${it.image}`,
        url: `${site.url}/sign-design#${it.key}`,
        provider: { "@id": `${site.url}/#business` },
        areaServed: seo.regions.slice(0, 2).map((r) => ({ "@type": "AdministrativeArea", name: r })),
        audience: { "@type": "BusinessAudience", name: it.shop },
      },
    })),
  };

  return (
    <>
      <JsonLd data={serviceList} />
      <PageHero
        eyebrow="SIGN DESIGN"
        title="간판디자인"
        desc="후광 LED 채널부터 까치발 철문자까지, 간판 열 가지를 저마다 가장 잘 어울리는 가게에 걸어 봤습니다. 마음에 드는 모습을 고르시면 우리 가게에 맞춰 다시 그려 드립니다."
        path="/sign-design"
      />

      {/* 목차 + AI 연출 안내 */}
      <div className="border-b border-line">
        <div className="wrap flex flex-col gap-5 py-8 md:flex-row md:items-center md:justify-between">
          <nav aria-label="간판 종류 바로가기" className="flex flex-wrap gap-2">
            {items.map((it) => (
              <a key={it.key} href={`#${it.key}`} className="chip px-3.5 py-2 text-[13px] md:text-[14px]">
                {it.name}
              </a>
            ))}
          </nav>
          <p className="shrink-0 text-[13px] text-ink-500">
            사진은 AI로 그린 연출 이미지입니다.{" "}
            <Link href="/works" className="underline underline-offset-4 hover:text-ink">
              실제 시공 사진 보기
            </Link>
          </p>
        </div>
      </div>

      <div className="wrap py-16 md:py-24">
        <div className="space-y-24 md:space-y-36">
          {items.map((it, i) => (
            <article
              key={it.key}
              id={it.key}
              className="grid scroll-mt-28 gap-8 lg:grid-cols-[1.35fr_1fr] lg:items-start lg:gap-16"
            >
              <Reveal className={`relative aspect-3/2 overflow-hidden bg-paper lg:sticky lg:top-32 ${i % 2 === 1 ? "lg:order-2" : ""}`}>
                <Img
                  src={it.image}
                  alt={it.alt}
                  width={1536}
                  height={1024}
                  fill
                  priority={i === 0}
                  sizes="(max-width: 1024px) 100vw, 740px"
                  label={`${it.name} 연출`}
                />
              </Reveal>

              <Reveal delay={100}>
                <p className="text-[13px] font-bold tracking-[0.2em] text-brand-700">
                  {String(i + 1).padStart(2, "0")} <span className="text-ink-500/60">/ {String(items.length).padStart(2, "0")}</span>
                </p>
                <h2 className="mt-3 text-3xl font-normal tracking-tight md:text-[40px]">{it.name}</h2>
                <p className="mt-3 text-[17px]">
                  잘 어울리는 가게 <b className="font-bold text-brand-700">{it.shop}</b>
                </p>
                <p className="mt-1.5 text-[14px] text-ink-500">{it.pairing.join(", ")}</p>

                <p className="mt-6 leading-relaxed md:text-[17px]">{it.why}</p>
                {it.desc && (
                  <p className="mt-3 text-[15px] leading-relaxed whitespace-pre-line text-ink-500">
                    {it.desc}
                  </p>
                )}

                <dl className="mt-8 border-t border-line">
                  {it.options.map((o) => (
                    <div key={o.label} className="grid grid-cols-[88px_1fr] gap-4 border-b border-line py-3.5 md:grid-cols-[104px_1fr]">
                      <dt className="text-[14px] font-bold">{o.label}</dt>
                      <dd className="text-[14px] leading-relaxed">
                        {o.choices.join(", ")}
                        {o.note && <span className="mt-1 block text-[13px] text-ink-500">{o.note}</span>}
                      </dd>
                    </div>
                  ))}
                </dl>

                {/* 2026-09-29 사람 결정: 전체 견적 폼(/quote)으로 — 고른 간판이 «보고 온 것» 칸에 채워집니다 */}
                <Link href={`/quote?design=${it.key}`} className="btn mt-8 px-7 py-3.5">
                  이 간판으로 문의하기 <span aria-hidden="true">→</span>
                </Link>
              </Reveal>
            </article>
          ))}
        </div>
      </div>

      <section id="inquiry" className="border-t border-line bg-paper py-20 md:py-28">
        <div className="wrap">
          <SignDesignInquiry items={items.map(({ key, name, shop }) => ({ key, name, shop }))} />
        </div>
      </section>
    </>
  );
}
