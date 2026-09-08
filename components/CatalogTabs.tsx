"use client";

import { useState, type ReactNode } from "react";

type Tab = { key: string; label: string; count: number };

/**
 * `/products` 의 알약 탭 줄 — 「전체 · 간판 종류 · 재질」 (2026-09-08 신설).
 *
 * 🔴 **탭 축이 «제품 속성» 이 아니라 «이 페이지의 목록 두 개» 입니다.** 대표님이 준
 * 참고 화면(렌터카 템플릿)은 카드 격자 위에 «세단·SUV» 같은 **속성 알약**이 서 있는
 * 배치인데, **주인공인 간판 종류에는 그 자리에 넣을 축이 없습니다** — `eyebrow` 가
 * 분류가 아니라 T1~T9 **일련번호**입니다.
 *
 * ⚠️ **그래서 축을 지어내지 않았습니다.** 발광/무점등 같은 분류를 코드에서 만들면
 * 그건 실측이 아니라 추측입니다 [P6]. 실제로 있는 축 — 이 페이지가 들고 있는
 * 목록 두 개 — 로 세웠습니다.
 *
 * ⚠️ **재질 쪽에는 축이 «있습니다».** `eyebrow`(대분류)로 묶이고, 2026-09-08 실측
 * 기준 DB 에 15종이 **6개 대분류**(콘크리트·도장미장·대리석·금속 각 3 · 목재 2 ·
 * 화강석 1)로 들어 있습니다. 그래도 안 붙인 이유는 **15종이 한 화면에 다 들어와서**
 * 입니다 — 거르개가 거를 게 없으면 누를 이유가 없습니다. 재질이 늘면(폴백 주석의
 * 58종 후보) 그때 `MaterialsGrid` 안에 대분류 탭을 붙이세요. 속성 축(쿠팡의 왼쪽
 * 필터, `reference/reference.md` 부록 A ③)이 간판 종류에 생기면 이 탭을 그쪽으로
 * 옮기면 됩니다.
 *
 * `ProductsGrid` 의 탭과 **모양은 같고 뜻이 다릅니다** — 저건 `eyebrow` 에서 모으는
 * 분류 탭이고 이건 목록 전환입니다. 합치지 마세요.
 */
export default function CatalogTabs({
  tabs,
  panels,
}: {
  tabs: Tab[];
  /** `tabs[].key` 를 열쇠로 하는 화면 조각. 서버에서 그린 것을 그대로 받습니다. */
  panels: Record<string, ReactNode>;
}) {
  const [on, setOn] = useState("all");
  const total = tabs.reduce((n, t) => n + t.count, 0);

  return (
    <div>
      <div className="flex flex-wrap justify-center gap-2">
        {[{ key: "all", label: "전체", count: total }, ...tabs].map((t) => {
          const active = t.key === on;
          return (
            <button
              key={t.key}
              type="button"
              aria-pressed={active}
              onClick={() => setOn(t.key)}
              className={`rounded-full border px-5 py-2.5 text-[14px] font-bold transition-colors ${
                active
                  ? "border-brand bg-brand text-white"
                  : "border-line bg-white text-ink-500 hover:border-ink-500 hover:text-ink"
              }`}
            >
              {t.label}
              <span className={`ml-1.5 text-[12px] ${active ? "text-white/70" : "text-ink-500"}`}>
                {t.count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-12 md:mt-16">
        {tabs.map((t) =>
          on === "all" || on === t.key ? (
            <section key={t.key} className="mt-16 first:mt-0">
              <h2 className="text-2xl font-black tracking-tight md:text-3xl">{t.label}</h2>
              <div className="mt-8">{panels[t.key]}</div>
            </section>
          ) : null
        )}
      </div>
    </div>
  );
}
