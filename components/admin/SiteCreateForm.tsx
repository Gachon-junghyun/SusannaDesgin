"use client";

import { useActionState } from "react";

import { createSite, type SiteState } from "@/app/admin/sites/actions";

/** 새 현장 만들기 — 이름·위치만 받고 편집 화면으로 넘어갑니다 (F29) */
export default function SiteCreateForm() {
  const [state, action, pending] = useActionState(createSite, {} as SiteState);
  return (
    <form action={action} className="flex flex-wrap items-end gap-3 border-y border-line bg-white px-4 py-4">
      <label className="block min-w-[180px] flex-1">
        <span className="text-[12px] font-bold text-ink-500">새 현장 — 상호 · 현장 이름</span>
        <input name="title" required maxLength={80} placeholder="태평한우" className="mt-1 w-full border border-line px-3 py-2 text-[15px]" />
      </label>
      <label className="block min-w-[160px] flex-1">
        <span className="text-[12px] font-bold text-ink-500">위치 (구·동)</span>
        <input name="location" maxLength={60} placeholder="대전 서구 둔산동" className="mt-1 w-full border border-line px-3 py-2 text-[15px]" />
      </label>
      <button type="submit" disabled={pending} className="bg-brand-700 px-5 py-2.5 text-[14px] font-bold text-white disabled:opacity-50">
        {pending ? "만드는 중…" : "현장 만들기"}
      </button>
      {state.error && <p className="w-full text-[13px] text-accent-600">{state.error}</p>}
    </form>
  );
}
