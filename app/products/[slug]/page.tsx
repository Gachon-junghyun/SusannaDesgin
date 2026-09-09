import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import PhotoCarousel, { type CarouselPhoto } from "@/components/PhotoCarousel";
import Placeholder from "@/components/Placeholder";
import QuickQuoteForm from "@/components/QuickQuoteForm";
import { SHOW_PRODUCTS } from "@/config/content";
import { site } from "@/config/site";
import { getBlocks } from "@/lib/cms";
import type { Block } from "@/lib/cms";
import { imageExists } from "@/lib/images";
import { getPreview } from "@/lib/preview";
import { ogImage } from "@/lib/seo";

/** 요청 시 렌더링 — 이유는 `app/page.tsx` 의 같은 설정 주석 참고. */
export const dynamic = "force-dynamic";

/** 목록에서 하나를 집어 옵니다. 없으면 `null` — 주소를 손으로 친 경우입니다. */
async function findModel(slug: string): Promise<Block | null> {
  const { signModels } = await getBlocks();
  return signModels.find((b) => b.slug === slug) ?? null;
}

/** 설명 첫 문단 — 검색 결과에 뜨는 두 줄입니다 */
function firstParagraph(body: string): string {
  return body.split(/\n{2,}/)[0]?.replace(/\s+/g, " ").trim() ?? "";
}

/**
 * 🔴 **설명이 비어 있으면 색인 대상에서 뺍니다.**
 *
 * 간판 한 종류가 들고 있는 글자는 이름·번호·가격대뿐이라, 설명 없이 아홉 장을
 * 내보내면 **거의 똑같은 페이지 아홉 개**가 됩니다. 검색엔진에는 그게 «얇은 중복
 * 문서» 고, 그런 문서가 여러 장이면 **원래 잘 잡히던 페이지까지 같이 깎입니다.**
 * 그래서 «내용이 생기면 그때 색인» 으로 뒀습니다 — 대표님이 관리자 화면에서
 * 설명을 채우는 순간 저절로 열립니다(`app/sitemap.ts` 도 같은 값을 봅니다).
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const m = await findModel(slug);
  if (!m) return { title: "찾을 수 없는 제품" };

  const path = `/products/${slug}`;
  const title = `${m.title} — 간판 종류`;
  const description =
    firstParagraph(m.body) ||
    `${site.name}이 제작·시공하는 ${m.title}. 현장 실측 후 사양과 금액을 정합니다.`;
  const indexable = SHOW_PRODUCTS && Boolean(m.body);

  return {
    title,
    description,
    alternates: { canonical: path },
    // ⚠️ `openGraph` 는 **통째로 교체**됩니다 — 한 필드만 적으면 레이아웃의 og:image 가
    //    조용히 사라집니다. 근거는 `lib/seo.ts` 머리말. 그래서 전부 다시 채웁니다.
    openGraph: {
      type: "website",
      locale: "ko_KR",
      url: `${site.url}${path}`,
      siteName: site.name,
      title: `${title} | ${site.name}`,
      description,
      images: [m.image?.startsWith("/") ? { url: m.image, alt: m.title } : ogImage],
    },
    ...(indexable ? {} : { robots: { index: false, follow: true } }),
  };
}

/**
 * 제품 상세페이지 — 간판 한 종류 (F24-d, 2026-09-09 신설).
 *
 * 🔴 **`/products` 와 같은 스위치를 씁니다.** `SHOW_PRODUCTS` 가 꺼져 있으면 목록은
 * 404 인데 상세만 열려 있는 상태가 제일 나쁩니다 — 검색에 그 주소만 남습니다.
 *
 * 🔴 **견적 폼을 여기에 통째로 넣지 않았습니다** (대표님 결정, 2026-09-09).
 * 위쪽 큰 버튼은 전체 폼(`/quote?item=<슬러그>`)으로 보내고, 페이지 맨 아래에만
 * **간편 3칸**(성함·연락처·설치지역)을 둡니다. 이유 둘:
 *   ① 전체 폼은 주소 검색·층수·첨부·동의까지라 상세페이지가 폼에 잡아먹힙니다.
 *   ② **폼이 두 군데면 고장도 두 벌입니다** — 홈에서 간편 폼이 두 벌 들어가
 *      `id` 가 겹쳐 라벨이 화면에 없는 칸을 가리켰던 실측이 있습니다(F5).
 *      그래서 여기 간편 폼에도 **`idPrefix` 를 따로 줍니다.**
 *
 * ⚠️ **«구매하기» 라는 말을 쓰지 않습니다.** 확정가가 없고 결제도 없습니다 —
 * 같은 업종에서 쇼핑몰을 돌리는 곳조차 목록에 가격을 안 띄우고 상담으로 보냅니다
 * (`reference/reference.md` 부록 A).
 *
 * ⚠️ **재질 스와치(참고 화면의 «Product Color»)는 이번에 안 넣었습니다** (대표님 결정).
 * 형제 저장소에 «간판 9종 × 재질 61종» 렌더가 549장 있어 언제든 붙일 수 있습니다 —
 * 붙일 때는 사진을 `public/images/` 로 복사하고 이 파일의 사진 자리를 갈아 끼웁니다.
 */
export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const preview = await getPreview();
  if (!SHOW_PRODUCTS && !preview.on) notFound();

  const { signModels } = await getBlocks();
  const model = signModels.find((b) => b.slug === slug);
  if (!model) notFound();

  const available = imageExists(model.image);
  const priced = Boolean(model.sub);
  const others = signModels.filter((b) => b.slug !== slug);

  /**
   * 슬라이더에 들어가는 사진 = **3D 렌더 한 장 + 실제 시공 사진들** (F24-e).
   *
   * 🔴 렌더를 «맨 앞» 에 둡니다. 이 페이지가 파는 것은 «이 제작 방식» 이고, 렌더는
   * 그 방식만 남기고 나머지 변수(벽·조명·글자)를 전부 고정한 그림입니다 — 첫 장이
   * 실제 현장이면 그 현장의 업종·간판 내용이 먼저 읽힙니다.
   * ⚠️ 그래서 **렌더에는 «3D 렌더» 딱지를 답니다** — 시공 사진과 섞이는 순간
   * 어느 게 실제인지 구분이 안 됩니다 [P6]. 아래 문구 하나로는 부족합니다.
   *
   * 실제 사진이 하나도 없는 종류(T3·T6·T8)는 렌더 한 장뿐이라 **슬라이더를 안 세웁니다**
   * — 넘길 게 없는데 화살표가 있으면 «더 있나» 하고 누르게 됩니다.
   */
  const shots: CarouselPhoto[] = [
    ...(available
      ? [{ src: model.image, alt: model.alt || `${model.title} 3D 렌더`, badge: "3D 렌더" }]
      : []),
    ...model.photos.map((src, i) => ({
      src,
      alt: `${model.title} 시공 사례 ${i + 1}`,
      badge: "시공 사진",
    })),
  ];

  return (
    <div className="wrap py-8 md:py-12">
      {/*
        🔴 아직 안 연 페이지라는 표시 — **목록 페이지와 같은 띠입니다.**
        손님에게는 애초에 404 라 이걸 볼 사람은 미리보기를 켠 관리자뿐입니다.
        **지우지 마세요** — 지우면 대표님이 이 화면을 «이미 공개된 것» 으로 읽습니다.
      */}
      {!SHOW_PRODUCTS && (
        <p className="mb-8 rounded-xl border-2 border-accent bg-white px-4 py-3 text-[14px] leading-relaxed text-ink">
          <strong className="font-black">아직 손님에게 안 보이는 페이지입니다.</strong>{" "}
          공개하려면 개발자에게 말씀해 주세요.
        </p>
      )}

      {/* 어디에 있는지 — 참고 화면의 «Shop / Clothing» 자리 */}
      <nav aria-label="현재 위치" className="text-[13px] text-ink-500">
        <Link href="/products" className="hover:text-ink">
          제품
        </Link>
        <span className="mx-1.5" aria-hidden="true">
          /
        </span>
        <span className="text-ink">간판 종류</span>
      </nav>

      <div className="mt-6 grid gap-10 lg:grid-cols-2 lg:gap-14">
        {/* 사진 — 목록과 같은 정사각(1:1). 실적(4:3)과 일부러 다릅니다 */}
        <div>
          {shots.length > 1 ? (
            <PhotoCarousel photos={shots} />
          ) : shots.length === 1 ? (
            <div className="relative aspect-square overflow-hidden rounded-2xl bg-paper">
              <Image
                src={shots[0].src}
                alt={shots[0].alt}
                fill
                sizes="(max-width: 1024px) 100vw, 600px"
                className="object-cover"
                priority
              />
              <span className="absolute top-3 left-3 rounded-full bg-ink/75 px-3 py-1 text-[12px] font-bold text-white backdrop-blur">
                {shots[0].badge}
              </span>
            </div>
          ) : (
            <Placeholder
              src={model.image}
              width={1200}
              height={1200}
              label={model.title}
              className="aspect-square w-full rounded-2xl"
            />
          )}
        </div>

        <div className="lg:pt-2">
          <p className="font-mono text-[12px] text-ink-500">{model.eyebrow}</p>
          <h1 className="mt-1 text-3xl leading-tight font-black tracking-tight md:text-[40px]">
            {model.title}
          </h1>

          {/* 🔴 가격이 비면 청록(가격 색)을 안 씁니다 — 빈 칸이 «0원» 으로 읽힙니다 */}
          <p className="mt-3">
            {priced ? (
              <>
                <span className="text-2xl font-black text-brand">{model.sub}</span>
                <span className="ml-1.5 text-[14px] text-ink-500">부터</span>
              </>
            ) : (
              <span className="text-[16px] font-bold text-ink-500">
                가격은 현장을 보고 정합니다
              </span>
            )}
          </p>

          {/*
            설명 — **비어 있으면 이 자리를 아예 안 그립니다.** 「준비 중」 같은 빈 상자를
            내보내지 않습니다(FABRICATION 구역을 내렸던 것과 같은 판단). 채우는 곳은
            관리자 화면 「간판 종류」 탭의 «손님용 설명» 입니다.
            `whitespace-pre-line` — 빈 줄이 문단이 됩니다. 마크다운은 안 그립니다.
          */}
          {model.body && (
            <div className="mt-6 leading-relaxed whitespace-pre-line text-ink-500">
              {model.body}
            </div>
          )}

          <div className="mt-8 space-y-3">
            {/* 참고 화면의 «Add to Bag» 자리 — 우리는 사는 게 아니라 견적입니다 */}
            <Link
              href={`/quote?item=${encodeURIComponent(model.slug)}`}
              className="block rounded-xl bg-brand px-6 py-4 text-center text-[17px] font-black text-white transition-colors hover:bg-brand-600"
            >
              이 간판으로 견적 받기
            </Link>
            <a
              href={site.phoneHref}
              className="block rounded-xl border border-line px-6 py-4 text-center text-[16px] font-bold transition-colors hover:border-ink-500"
            >
              전화로 물어보기 {site.phone}
            </a>
          </div>

          {/*
            🔴 고지 문구가 «사진이 섞였는지» 에 따라 갈립니다. 시공 사진이 같이 있는데
            "사진은 3D 렌더입니다" 라고 적으면 **실제 실적을 렌더라고 말하는** 셈이라
            거꾸로 틀린 말이 됩니다 [P6]. 딱지(3D 렌더 / 시공 사진)가 장마다 붙습니다.
          */}
          <p className="mt-4 text-[13px] leading-relaxed text-ink-500">
            {model.photos.length > 0
              ? "첫 장은 제작 방식을 보여주는 3D 렌더이고, 나머지는 실제 시공 현장 사진입니다. 정확한 사양과 금액은 현장 실측 후에 정합니다."
              : "사진은 실제 시공 사진이 아니라 3D 렌더입니다. 정확한 사양과 금액은 현장 실측 후에 정합니다."}
          </p>

          {/* 참고 화면의 접히는 목록 자리 — 우리가 실제로 말할 수 있는 것은 «절차» 입니다 */}
          <div className="mt-8 rounded-2xl bg-paper p-6">
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
        </div>
      </div>

      {/*
        간편 3칸 — 여기까지 내려온 사람은 관심이 높습니다. 전체 폼으로 옮기지 않고
        그 자리에서 남길 수 있게 합니다. 🔴 `idPrefix` 는 홈(`q`·`hero`)과 겹치면
        안 됩니다 — 겹치면 라벨이 다른 폼의 칸을 가리킵니다(F5).
      */}
      <section className="mt-20 md:mt-28">
        <div className="grid gap-8 rounded-2xl border border-line bg-paper p-6 md:grid-cols-[1fr_400px] md:items-center md:p-10">
          <div>
            <h2 className="text-2xl font-black tracking-tight md:text-3xl">
              {model.title}, 우리 건물에는 얼마일까요
            </h2>
            <p className="mt-3 leading-relaxed text-ink-500">
              연락처만 남겨주시면 담당자가 확인 후 연락드립니다. 어느 간판을 보고
              계신지는 자동으로 같이 전달됩니다.
            </p>
            <Link
              href={`/quote?item=${encodeURIComponent(model.slug)}`}
              className="mt-4 inline-block text-[14px] font-bold text-ink underline underline-offset-4 hover:text-brand-700"
            >
              사진·도면까지 같이 보내려면 상세 견적 폼으로 →
            </Link>
          </div>
          <QuickQuoteForm
            idPrefix={`pd-${model.slug}`}
            product={model.eyebrow ? `${model.title} (${model.eyebrow})` : model.title}
          />
        </div>
      </section>

      {/* 다른 종류 — 상세페이지가 막다른 길이 되지 않게 */}
      {others.length > 0 && (
        <section className="mt-20 md:mt-24">
          <h2 className="text-xl font-black tracking-tight md:text-2xl">
            다른 간판 종류
          </h2>
          <ul className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {others.map((o) => (
              <li key={o.slug}>
                <Link href={`/products/${o.slug}`} className="group block">
                  <div className="relative aspect-square overflow-hidden rounded-xl bg-paper">
                    {imageExists(o.image) ? (
                      <Image
                        src={o.image}
                        alt={o.alt || `${o.title} 3D 렌더`}
                        fill
                        sizes="(max-width: 640px) 50vw, 260px"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <Placeholder
                        src={o.image}
                        width={600}
                        height={600}
                        label={o.title}
                        className="h-full w-full"
                      />
                    )}
                  </div>
                  <p className="mt-2 text-[14px] font-bold group-hover:text-brand-700">
                    {o.title}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
