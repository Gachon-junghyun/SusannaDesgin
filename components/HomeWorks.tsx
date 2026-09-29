"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import Placeholder from "./Placeholder";
import type { Work } from "@/config/content";

type WorkWithFlag = Work & { available: boolean };

/**
 * 홈 «주요 실적» — 2026-09-29 사람 결정(시안 «3안»의 실적 칸).
 * 업종 칩 + 큰 사진 하나(왼쪽 두 줄 차지)와 작은 사진 넷, 제목은 사진 위 아래쪽 그림자에 얹습니다.
 *
 * - 칩은 **실적이 한 건이라도 있는 업종만** 보입니다. 빈 업종을 누르면 빈 칸만 남아서입니다.
 * - 한 번에 다섯 장까지. 전체 목록은 `/works`(WorksGrid)가 맡습니다.
 * - 카드 자체는 링크가 아닙니다(실적 상세 페이지가 아직 없음 — SEO.md B-1). 예전 홈 카드도 그랬습니다.
 */
export default function HomeWorks({
  works,
  categories,
}: {
  works: WorkWithFlag[];
  categories: string[];
}) {
  const [cat, setCat] = useState("전체");

  const cats = useMemo(
    () => categories.filter((c) => c === "전체" || works.some((w) => w.category === c)),
    [categories, works]
  );
  const shown = useMemo(
    () => (cat === "전체" ? works : works.filter((w) => w.category === cat)).slice(0, 5),
    [cat, works]
  );

  return (
    <div>
      <div role="group" aria-label="업종별 실적 보기" className="flex flex-wrap gap-2">
        {cats.map((c) => (
          <button
            key={c}
            type="button"
            aria-pressed={c === cat}
            onClick={() => setCat(c)}
            className="chip px-4 py-2 text-[14px] md:px-5 md:py-2.5"
          >
            {c}
          </button>
        ))}
      </div>

      {/* 넓은 화면: 2fr 1fr 1fr, 첫 장이 두 줄. 휴대폰: 첫 장 가득 + 나머지 두 칸 */}
      <ul
        aria-live="polite"
        className="mt-8 grid grid-cols-2 gap-3 md:gap-3.5 lg:grid-cols-[2fr_1fr_1fr] lg:auto-rows-[260px] xl:auto-rows-[300px]"
      >
        {shown.map((w, idx) => (
          <li
            key={w.slug}
            className={`group relative overflow-hidden bg-paper ${
              idx === 0 ? "col-span-2 aspect-4/3 lg:col-span-1 lg:row-span-2 lg:aspect-auto" : "aspect-square lg:aspect-auto"
            }`}
          >
            {w.available ? (
              <Image
                src={w.image}
                alt={w.title}
                fill
                sizes={idx === 0 ? "(max-width: 1024px) 100vw, 50vw" : "(max-width: 1024px) 50vw, 25vw"}
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <Placeholder
                src={w.image}
                width={1200}
                height={900}
                label={`${w.category} · ${w.title}`}
                className="h-full w-full"
              />
            )}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/80 to-transparent px-4 pt-12 pb-3.5 text-white md:px-5 md:pb-4">
              <h3 className={`font-bold ${idx === 0 ? "md:text-[19px]" : "text-[14px] md:text-[15px]"}`}>
                {w.title}
              </h3>
              <p className="mt-0.5 text-[12px] text-white/80">
                {[w.category, ...w.tags.slice(0, 1)].filter(Boolean).join(" · ")}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
