import type { Metadata, Viewport } from "next";
import dynamic from "next/dynamic";
import Script from "next/script";
import { Noto_Sans_KR } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FloatingBar from "@/components/FloatingBar";
import PreviewBar from "@/components/PreviewBar";
import SiteChrome from "@/components/SiteChrome";
import { SHOW_PRODUCTS } from "@/config/content";
import { seo, site } from "@/config/site";
import { getPreview } from "@/lib/preview";
import { ogImage } from "@/lib/seo";

/**
 * 관리자가 공개 화면을 돌아다니는 동안 로그인 토큰을 갱신합니다 (F23).
 *
 * 🔴 **`next/dynamic` 으로 늦게 부르는 게 요점입니다.** 그냥 `import` 하면
 * `@supabase/ssr` 이 **모든 공개 페이지의 공용 번들**에 들어갑니다 — 조건부로
 * 그려도 그렇습니다. 이러면 관리자일 때만 그 조각을 받아 옵니다.
 */
const SessionKeeper = dynamic(() => import("@/components/admin/SessionKeeper"));

const notoKr = Noto_Sans_KR({
  variable: "--font-noto-kr",
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    // 지역+업종 키워드를 앞쪽에 배치합니다. "회사소개 | 수산나디자인" 처럼
    // 지역명이 없는 제목은 "대전 간판" 검색에서 잡히지 않습니다.
    default: seo.homeTitle,
    template: `%s | ${site.name}`,
  },
  description: seo.homeDescription,
  keywords: [...seo.primary, site.name, site.nameEn],
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: site.url,
    siteName: site.name,
    title: seo.homeTitle,
    description: seo.homeDescription,
    images: [ogImage],
  },
  // 최종 도메인이 아니면(임시 주소·미리보기) 검색 노출을 막습니다.
  robots: site.isProductionDomain
    ? {
        index: true,
        follow: true,
        googleBot: { index: true, follow: true, "max-image-preview": "large" },
      }
    : { index: false, follow: false, nocache: true },
  alternates: {
    canonical: "/",
    types: { "application/rss+xml": `${site.url}/rss.xml` },
  },
  /**
   * 파비콘을 `public/` 에 두고 여기서 직접 가리킵니다.
   *
   * `app/icon.png` 규칙을 쓰면 Next.js 가 자동으로 링크를 만들어 주지만,
   * 그 경로는 **서버 함수를 거쳐** 응답합니다. 파비콘은 모든 페이지에서
   * 요청되므로 방문 1회마다 서버 호출이 한 번씩 더 생기고, 캐시도 안 됩니다.
   * `public/` 에 두면 CDN 이 바로 내려주고 서버를 안 거칩니다.
   */
  icons: {
    icon: [{ url: "/icon.png", sizes: "512x512", type: "image/png" }],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
  // 값이 비어 있으면 태그가 나가지 않습니다 (config/site.ts 에서 채웁니다)
  verification: {
    ...(site.googleVerification ? { google: site.googleVerification } : {}),
    ...(site.naverVerification
      ? { other: { "naver-site-verification": site.naverVerification } }
      : {}),
  },
};

export const viewport: Viewport = {
  themeColor: "#10141a",
  width: "device-width",
  initialScale: 1,
  /**
   * 아이폰 노치·홈 인디케이터 영역까지 화면을 씁니다.
   *
   * ⚠️ **이 값이 없으면 `env(safe-area-inset-*)` 이 항상 0 입니다.** 모바일 하단
   *    고정바(FloatingBar)가 홈 인디케이터에 물려 버튼 아래쪽이 안 눌리던 문제를
   *    `globals.css` 와 `FloatingBar.tsx` 에서 그 값으로 막고 있는데, 여기가 빠지면
   *    **CSS 는 그대로인데 아무 효과가 없습니다.** 둘은 항상 같이 갑니다.
   *
   *    대신 가로모드에서 콘텐츠가 노치 밑으로 들어갈 수 있어, `.wrap` 의 좌우 여백을
   *    `max(고정값, env(safe-area-inset-*))` 로 받아 둡니다 (`globals.css`).
   */
  viewportFit: "cover",
};

/**
 * 지역 SEO 구조화 데이터 — 검색엔진과 AI 요약이 상호·주소·전화·영업시간을 읽어갑니다.
 *
 * ⚠️ 여기 적힌 값은 네이버 플레이스·구글 비즈니스 프로필·카카오맵에 등록한 값과
 *    띄어쓰기까지 완전히 같아야 합니다(NAP 일관성). 어긋나면 신뢰도 신호가 깎입니다.
 *    그래서 전부 `config/site.ts` 한 곳에서만 끌어옵니다 — 손으로 적지 마세요.
 */
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "@id": `${site.url}/#business`,
  name: site.name,
  alternateName: [site.nameEn, site.legalName],
  description: site.description,
  url: site.url,
  telephone: site.phone,
  faxNumber: site.fax,
  email: site.email,
  image: `${site.url}/images/og.jpg`,
  logo: `${site.url}/logo.svg`,
  founder: { "@type": "Person", name: site.ceo },
  foundingDate: site.founded.replace(/\./g, "-"),
  address: {
    "@type": "PostalAddress",
    addressCountry: "KR",
    addressRegion: "대전광역시",
    postalCode: site.zip,
    streetAddress: `${site.address} ${site.addressDetail}`.trim(),
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: site.geo.lat,
    longitude: site.geo.lng,
  },
  // 출장 시공이 중심인 업종이라 서비스 지역을 명시합니다.
  areaServed: seo.regions.map((r) => ({ "@type": "AdministrativeArea", name: r })),
  // site.hours("평일 09:00~18:00") · hoursNote("주말·공휴일 휴무") 와 일치시킵니다.
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: "09:00",
      closes: "18:00",
    },
  ],
  sameAs: [
    site.blogUrl,
    site.instagramUrl,
    site.kakaoChannelUrl,
    site.naverPlaceUrl,
  ].filter(Boolean),
  // 사업자등록번호. 검색엔진·AI 가 "이 홈페이지 = 그 사업자" 를 잇는 근거가 됩니다.
  // 비어 있으면 키 자체를 빼야 합니다 — 빈 문자열을 내보내면 잘못된 값으로 읽힙니다.
  ...(site.bizNo ? { taxID: site.bizNo } : {}),
  priceRange: "₩₩",
  // ⚠️ AggregateRating·Review 스키마는 넣지 않았습니다.
  //    자사 사이트에 실제로 게시된 리뷰에만 쓸 수 있고, 플레이스·GBP 리뷰를
  //    가져다 넣으면 리치 결과 제외 또는 수동 조치 대상이 됩니다.
};

/**
 * 🔴 **이 레이아웃이 쿠키를 읽습니다 — 원칙 A3 의 예외입니다** (2026-08-17, F23).
 *
 * 대가로 **정적이던 페이지들까지 요청 시 SSR** 이 됩니다(`/support` `/quote`
 * `/privacy` `/terms` `/no-email-collect`). 레이아웃에서 동적 API 를 부르면
 * 그 아래 전부가 동적이 되기 때문이고, 이건 피할 수 있는 게 아니라 **선택한 값**입니다
 * — 시안을 «진짜 그 주소에서» 보려면 머리말·꼬리말도 같이 갈려야 합니다.
 * 근거와 되돌리는 법은 `docs/ARCHITECTURE.md` §0 A3 · §7 에 있습니다.
 */
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const preview = await getPreview();

  return (
    <html lang="ko" className={`${notoKr.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <SiteChrome>
          <a href="#main" className="skip-link">
            본문으로 바로가기
          </a>
          {/* 제품 메뉴는 공개 스위치 또는 미리보기로만 섭니다 (F24) */}
          <Header productsVisible={SHOW_PRODUCTS || preview.on} />
        </SiteChrome>
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteChrome>
          <Footer />
          <FloatingBar />
          {/* 관리자 전용. 손님에게는 `null` 이라 마크업도 안 나갑니다 (F23) */}
          <PreviewBar state={preview} />
          {(preview.isAdmin || preview.stale) && <SessionKeeper />}
        </SiteChrome>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {/*
          Google 애널리틱스 4 — 확정 도메인에서만 붙입니다.
          미리보기·임시 주소의 방문이 실제 통계에 섞이면 되돌릴 수 없습니다.
          `strategy="afterInteractive"` 라 첫 화면 렌더를 막지 않고, 스크립트가
          실패해도 페이지는 그대로 뜹니다 [원칙 A1].
        */}
        {site.isProductionDomain && site.gaMeasurementId && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${site.gaMeasurementId}`}
              strategy="afterInteractive"
            />
            <Script id="ga4" strategy="afterInteractive">
              {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${site.gaMeasurementId}');`}
            </Script>
          </>
        )}
      </body>
    </html>
  );
}
