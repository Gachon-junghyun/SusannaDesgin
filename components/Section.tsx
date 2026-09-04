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
        ⚠️ 이 오렌지는 **밝은 배경에서 3.14:1** 로 명암비 기준에 못 미칩니다
           (어두운 배경에서는 5.65:1 로 통과). 브랜드 색을 지키기로 한 결정이라
           그대로 둡니다 — 근거는 `app/globals.css` 의 `@theme` 머리말.
      */}
      {eyebrow && (
        <p className="mb-3 text-[13px] font-black tracking-[0.25em] text-accent">
          {eyebrow}
        </p>
      )}
      <h2
        className={`text-3xl leading-tight font-black tracking-tight md:text-[42px] ${
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
    <section id={id} className={`py-16 md:py-24 ${className}`}>
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
    <div className="bg-ink py-16 text-white md:py-24">
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
        <p className="mb-3 text-[13px] font-black tracking-[0.25em] text-accent">
          {eyebrow}
        </p>
        <h1 className="text-3xl leading-tight font-black tracking-tight md:text-5xl">
          {title}
        </h1>
        {desc && (
          <p className="mt-4 max-w-2xl leading-relaxed text-white/60 md:text-lg">{desc}</p>
        )}
      </div>
    </div>
  );
}
