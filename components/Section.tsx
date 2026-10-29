import type { ReactNode } from "react";
import JsonLd from "./JsonLd";
import { site } from "@/config/site";

export function SectionHeading({
  eyebrow,
  title,
  desc,
  dark = false,
  center = false,
}: {
  eyebrow?: string;
  title: ReactNode;
  desc?: ReactNode;
  dark?: boolean;
  center?: boolean;
}) {
  return (
    <div className={`${center ? "text-center" : ""} ${center ? "mx-auto max-w-2xl" : ""}`}>
      {/*
        머리글은 브랜드 청록입니다(2026-10-29 사람: «주황색 글씨들 다 우리 브랜드 컬러로»). 예전엔 주황(accent)이었습니다.
        ⚠️ `brand` 는 밝은 배경에서 **2.99:1** 로 명암비 기준에 못 미칩니다 — 브랜드 색을 지키기로 한 결정(globals.css `@theme` 머리말).
           어두운 배경은 `brand-400`(ink 위 8.09:1).
      */}
      {eyebrow && (
        <p className={`mb-3 text-[13px] font-black tracking-[0.25em] ${dark ? "text-brand-400" : "text-brand"}`}>
          {eyebrow}
        </p>
      )}
      <h2
        className={`text-3xl leading-tight font-normal tracking-tight md:text-[42px] ${
          dark ? "text-white" : ""
        }`}
      >
        {title}
      </h2>
      {desc && (
        <p
          className={`mt-4 text-base leading-relaxed md:text-lg ${
            dark ? "text-white/60" : "text-ink-500"
          }`}
        >
          {desc}
        </p>
      )}
    </div>
  );
}

export function Section({
  children,
  className = "",
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={`sec-y ${className}`}>
      <div className="wrap">{children}</div>
    </section>
  );
}

/**
 * 페이지 상단 공통 헤더 (서브 페이지용).
 *
 * `path` 를 주면 검색 결과에 계층 경로를 노출시키는 BreadcrumbList 구조화 데이터를
 * 함께 내보냅니다 (화면 디자인은 그대로).
 */
export function PageHero({
  eyebrow,
  title,
  desc,
  path,
}: {
  eyebrow: string;
  title: string;
  desc?: string;
  /** 예: "/works" — 주면 빵부스러기 구조화 데이터가 붙습니다 */
  path?: string;
}) {
  return (
    <div className="relative isolate overflow-hidden bg-ink py-16 text-white md:py-24">
      <HeroGlow />
      {path && (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "홈", item: site.url },
              {
                "@type": "ListItem",
                position: 2,
                name: title,
                item: `${site.url}${path}`,
              },
            ],
          }}
        />
      )}
      <div className="wrap">
        <p className="mb-3 text-[13px] font-black tracking-[0.25em] text-brand-400">
          {eyebrow}
        </p>
        <h1 className="text-3xl leading-tight font-normal tracking-tight md:text-5xl">
          {title}
        </h1>
        {desc && (
          <p className="mt-4 max-w-2xl leading-relaxed text-white/60 md:text-lg">{desc}</p>
        )}
      </div>
    </div>
  );
}

/**
 * 검정 머리말 오른쪽 아래의 은은한 청록 빛 (2026-10-16 사람 요청 «그라데이션만 떼서 검정 오른쪽에 은은하게»).
 * 원본은 카톡 배경 디자인(형제 작업 `SusannaDesigner/runs/2026-10-15_수산나_카톡배경`, 청록 램프)이고,
 * 그림 파일 대신 CSS 빛 두 겹 + 아주 옅은 입자로 다시 그렸습니다 — 폭이 바뀌어도 안 깨지고 받는 파일이 없습니다.
 * 글자 쪽(왼쪽)은 비워 둡니다. 꾸밈이라 스크린리더·클릭에서 뺍니다.
 */
/** 검정 머리말 오른쪽 아래의 청록 빛 — 수산나 픽(F26-n) 머리말도 같은 것을 씁니다 */
export function HeroGlow() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
      <div
        className="absolute inset-0"
        style={{
          background: [
            "radial-gradient(ellipse 34% 95% at 100% 112%, rgba(150,212,204,0.42), rgba(52,156,146,0.22) 38%, transparent 70%)",
            "radial-gradient(ellipse 60% 140% at 96% 125%, rgba(24,120,112,0.50), rgba(14,72,68,0.26) 42%, transparent 74%)",
          ].join(","),
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.07] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />
    </div>
  );
}
