"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import Placeholder from "./Placeholder";
import { DetailTrigger } from "./DetailDialog";
import { workDetail } from "./HomeWorks";
import type { Work } from "@/config/content";

type WorkWithFlag = Work & { available: boolean };

export default function WorksGrid({
  works,
  categories,
  detail = false,
  prioritizeFirst = true,
}: {
  works: WorkWithFlag[];
  categories: string[];
  /** F32 — 카드를 눌러 크게 보기 (지금은 관리자 미리보기만) */
  detail?: boolean;
  /** 앞에 시공사례가 있으면 그쪽의 첫 사진이 우선입니다. */
  prioritizeFirst?: boolean;
}) {
  const [cat, setCat] = useState("전체");

  /**
   * 실적이 0건인 업종 탭은 숨깁니다 — HomeWorks 와 같은 규칙.
   * 2026-10-03 Clarity 녹화: 6쪽을 보던 손님이 «금융»을 눌러 빈 화면을 보고 바로 나갔습니다.
   */
  const cats = useMemo(
    () => categories.filter((c) => c === "전체" || works.some((w) => w.category === c)),
    [categories, works]
  );

  const shown = useMemo(
    () => (cat === "전체" ? works : works.filter((w) => w.category === cat)),
    [cat, works]
  );
  const firstPhoto = works.find((w) => w.available)?.slug;

  return (
    <div>
      {/* 카테고리 필터 */}
      <div
        role="tablist"
        aria-label="업종별 실적 필터"
        className="flex flex-wrap gap-2"
      >
        {cats.map((c) => {
          const on = c === cat;
          return (
            <button
              key={c}
              role="tab"
              aria-selected={on}
              onClick={() => setCat(c)}
              className="chip px-4 py-2 text-[14px]"
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
            <DetailTrigger enabled={detail && w.available} detail={workDetail(w)}>
            <div className="relative aspect-4/3 overflow-hidden rounded-xl bg-paper">
              {w.available ? (
                <Image
                  src={w.image}
                  alt={w.title}
                  fill
                  sizes="(min-width: 1520px) 450.67px, (min-width: 1440px) calc(33.333333vw - 56px), (min-width: 1024px) calc(33.333333vw - 45.333333px), (min-width: 640px) calc(50vw - 42px), calc(100vw - 40px)"
                  preload={prioritizeFirst && w.slug === firstPhoto}
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
            </DetailTrigger>
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
