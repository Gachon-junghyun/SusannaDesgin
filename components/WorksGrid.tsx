"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import Placeholder from "./Placeholder";
import type { Work } from "@/config/content";

type WorkWithFlag = Work & { available: boolean };

export default function WorksGrid({
  works,
  categories,
}: {
  works: WorkWithFlag[];
  categories: string[];
}) {
  const [cat, setCat] = useState("전체");

  const shown = useMemo(
    () => (cat === "전체" ? works : works.filter((w) => w.category === cat)),
    [cat, works]
  );

  return (
    <div>
      {/* 카테고리 필터 */}
      <div
        role="tablist"
        aria-label="업종별 실적 필터"
        className="flex flex-wrap gap-2"
      >
        {categories.map((c) => {
          const on = c === cat;
          return (
            <button
              key={c}
              role="tab"
              aria-selected={on}
              onClick={() => setCat(c)}
              className={`rounded-full border px-4 py-2 text-[14px] font-bold transition-colors ${
                on
                  ? "border-ink bg-ink text-white"
                  : "border-line text-ink-500 hover:border-ink-500"
              }`}
            >
              {c}
            </button>
          );
        })}
      </div>

      <p className="mt-5 text-[14px] text-ink-500" aria-live="polite">
        총 <b className="text-ink">{shown.length}</b>건
      </p>

      <ul className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((w) => (
          <li key={w.slug} className="group">
            <div className="relative aspect-4/3 overflow-hidden rounded-xl bg-paper">
              {w.available ? (
                <Image
                  src={w.image}
                  alt={w.title}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px"
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
            </div>
            <div className="mt-3">
              <p className="text-[13px] font-bold text-brand">{w.category}</p>
              <h2 className="mt-0.5 font-bold">{w.title}</h2>
              <p className="mt-0.5 text-[13px] text-ink-500">
                {[w.location, ...w.tags].filter(Boolean).join(" · ")}
              </p>
            </div>
          </li>
        ))}
      </ul>

      {shown.length === 0 && (
        <p className="py-20 text-center text-ink-500">
          해당 업종의 실적이 아직 등록되지 않았습니다.
        </p>
      )}
    </div>
  );
}
