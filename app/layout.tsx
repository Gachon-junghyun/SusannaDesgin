import type { Metadata, Viewport } from "next";
import { Noto_Sans_KR } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FloatingBar from "@/components/FloatingBar";
import SiteChrome from "@/components/SiteChrome";
import { seo, site } from "@/config/site";
import { ogImage } from "@/lib/seo";

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
  sameAs: [site.blogUrl, site.instagramUrl, site.kakaoChannelUrl].filter(Boolean),
  // 사업자등록번호. 검색엔진·AI 가 "이 홈페이지 = 그 사업자" 를 잇는 근거가 됩니다.
  // 비어 있으면 키 자체를 빼야 합니다 — 빈 문자열을 내보내면 잘못된 값으로 읽힙니다.
  ...(site.bizNo ? { taxID: site.bizNo } : {}),
  priceRange: "₩₩",
  // ⚠️ AggregateRating·Review 스키마는 넣지 않았습니다.
  //    자사 사이트에 실제로 게시된 리뷰에만 쓸 수 있고, 플레이스·GBP 리뷰를
  //    가져다 넣으면 리치 결과 제외 또는 수동 조치 대상이 됩니다.
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${notoKr.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <SiteChrome>
          <a href="#main" className="skip-link">
            본문으로 바로가기
          </a>
          <Header />
        </SiteChrome>
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteChrome>
          <Footer />
          <FloatingBar />
        </SiteChrome>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </body>
    </html>
  );
}
