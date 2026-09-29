"use client";

import { useState } from "react";
import QuickQuoteForm from "./QuickQuoteForm";

/**
 * 간판디자인 페이지 맨 아래 «문의하기» (F31).
 *
 * 간판마다 붙은 «이 간판으로 문의하기» 는 전체 견적 폼(`/quote?design=<key>`)으로 갑니다
 * (2026-09-29 사람 결정). 여기는 목록을 끝까지 본 사람을 위한 간편 폼 — 칩으로 고른 간판이
 * `product` 로 조용히 실려 갑니다(F24-c 와 같은 칸 — 입력칸을 늘리지 않습니다).
 */
export default function SignDesignInquiry({
  items,
}: {
  items: { key: string; name: string; shop: string }[];
}) {
  const [picked, setPicked] = useState("");

  const cur = items.find((it) => it.key === picked);

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_420px] lg:gap-20">
      <div>
        <p className="text-[13px] font-bold tracking-[0.24em] text-brand-700">INQUIRY</p>
        <h2 className="mt-3 text-3xl leading-snug font-normal tracking-tight md:text-[42px]">
          마음에 드는 간판이 있으셨나요?
        </h2>
        <p className="mt-4 max-w-xl leading-relaxed text-ink-500 md:text-lg">
          고르신 간판과 연락처만 남겨 주세요. 가게 사진을 보고 벽과 거리에 맞는 크기, 재질로
          시안을 만들어 드립니다. 현장 확인과 시안까지 무료입니다.
        </p>

        <p className="mt-10 text-[14px] font-bold">어떤 간판이 궁금하세요?</p>
        <div role="group" aria-label="문의할 간판 고르기" className="mt-3 flex flex-wrap gap-2">
          {items.map((it) => (
            <button
              key={it.key}
              type="button"
              aria-pressed={it.key === picked}
              onClick={() => setPicked(it.key === picked ? "" : it.key)}
              className="chip px-4 py-2 text-[14px]"
            >
              {it.name}
            </button>
          ))}
        </div>
        <p className="mt-4 min-h-6 text-[14px] text-ink-500" aria-live="polite">
          {cur ? `${cur.name}(${cur.shop} 연출)로 문의합니다.` : "고르지 않아도 문의할 수 있습니다."}
        </p>
      </div>

      <QuickQuoteForm idPrefix="design" product={cur ? `간판디자인 / ${cur.name}` : "간판디자인"} />
    </div>
  );
}
