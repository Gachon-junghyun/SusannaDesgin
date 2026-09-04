"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import Placeholder from "./Placeholder";
import type { Block } from "@/lib/cms";

type ProductWithFlag = Block & { available: boolean };

/**
 * 제품 카탈로그 격자 (F24).
 *
 * ⚠️ **`WorksGrid` 와 합치지 마세요. 비율이 다릅니다.**
 * 실적은 `aspect-4/3`(현장 사진은 가로가 유리), 제품은 **`aspect-square`** 입니다 —
 * 쿠팡·네이버쇼핑·오늘의집·아트네온 **네 곳 전부 썸네일이 1:1** 이었고 예외가
 * 하나도 없었습니다(`reference/reference.md` 부록 A 실측). 하나로 통일하면
 * "제품 목록"이 "실적 목록"처럼 보입니다.
 *
 * 🔴 **가격 칸을 만들지 마세요.** 맞춤 제작이라 정가가 성립하지 않습니다 —
 * 같은 업종에서 쇼핑몰을 돌리는 아트네온조차 목록에 가격을 안 띄웁니다.
 * 넣고 싶어지면 그 문서를 먼저 읽으세요.
 *
 * ⚠️ **별점·리뷰수·판매량 같은 칸을 흉내 내지 마세요.** 네이버가 그걸 다 넣는 건
 * 숫자가 **있기 때문**입니다. 우리는 없어서, 만들면 빈 칸이 줄지어 나갑니다 —
 * FABRICATION 구역을 내린 것과 같은 실패입니다.
 */
export default function ProductsGrid({ products }: { products: ProductWithFlag[] }) {
  // 분류(`eyebrow`)는 관리자가 손으로 적는 값이라, 목록에 있는 것만 모아 탭을 만듭니다.
  // 코드에 고정하면 관리자 화면에서 새 분류를 적었을 때 그 제품이 어느 탭에도 안 걸립니다.
  const groups = useMemo(
    () => ["전체", ...[...new Set(products.map((p) => p.eyebrow).filter(Boolean))]],
    [products]
  );
  const [group, setGroup] = useState("전체");

  const shown = useMemo(
    () => (group === "전체" ? products : products.filter((p) => p.eyebrow === group)),
    [group, products]
  );

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {groups.map((g) => {
          const on = g === group;
          return (
            <button
              key={g}
              type="button"
              aria-pressed={on}
              onClick={() => setGroup(g)}
              className={`rounded-full border px-4 py-2 text-[14px] font-bold transition-colors ${
                on
                  ? "border-ink bg-ink text-white"
                  : "border-line text-ink-500 hover:border-ink-500"
              }`}
            >
              {g}
            </button>
          );
        })}
      </div>

      <p className="mt-5 text-[14px] text-ink-500" aria-live="polite">
        총 <b className="text-ink">{shown.length}</b>종
      </p>

      <ul className="mt-5 grid gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((p) => (
          <li key={p.title} className="group flex flex-col">
            {/* 🔴 정사각. 위 머리말의 실측 근거를 읽기 전에 바꾸지 마세요 */}
            <div className="relative aspect-square overflow-hidden rounded-xl bg-paper">
              {p.available ? (
                <Image
                  src={p.image}
                  alt={p.alt || p.title}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 380px"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <Placeholder
                  src={p.image}
                  width={900}
                  height={900}
                  label={p.title}
                  className="h-full w-full"
                />
              )}
            </div>

            <div className="mt-3 flex flex-1 flex-col">
              <h2 className="text-[17px] font-black tracking-tight">{p.title}</h2>
              {p.points.length > 0 && (
                <p className="mt-1 text-[13px] font-bold text-brand">
                  {p.points.join(" · ")}
                </p>
              )}
              <p className="mt-1.5 text-[14px] leading-relaxed text-ink-500">{p.sub}</p>

              {/*
                상세 페이지가 아직 없어서 카드 전체를 링크로 만들지 않았습니다.
                누를 데가 없으면 "파는 목록" 으로 안 읽히므로, 실제로 일어나는 일
                (견적 문의)로 보냅니다 — 없는 상세 페이지를 가리키는 링크보다 낫습니다.
              */}
              {/* `mt-auto` — 설명 길이가 카드마다 달라도 링크가 **한 줄로 정렬**됩니다.
                  안 붙이면 견적 링크가 들쭉날쭉해서 «목록» 으로 안 읽힙니다. */}
              <Link
                href="/quote"
                className="mt-auto inline-flex w-fit items-center gap-1 pt-3 text-[14px] font-bold text-ink underline underline-offset-4 transition-colors hover:text-brand-700"
              >
                이 제품 견적 받기
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </li>
        ))}
      </ul>

      {shown.length === 0 && (
        <p className="py-20 text-center text-ink-500">
          이 분류에 등록된 제품이 아직 없습니다.
        </p>
      )}
    </div>
  );
}
