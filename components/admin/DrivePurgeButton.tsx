"use client";

import { useState, useTransition } from "react";

import { purgeDrive } from "@/app/admin/sites/actions";

/** 30일 지난 원본을 드라이브에서 비우기 (F29) — 한 방향 동기화라 비스테이션엔 남습니다 */
export default function DrivePurgeButton({ disabled }: { disabled: boolean }) {
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  return (
    <div className="mt-3 flex items-center gap-3">
      <button
        type="button"
        disabled={disabled || pending}
        onClick={() =>
          confirm("30일 지난 원본을 구글 드라이브에서 지울까요? 비스테이션에 받아져 있어야 합니다.") &&
          start(async () => {
            const r = await purgeDrive();
            setMsg(r.error ?? `${r.deleted ?? 0}개 지웠습니다.`);
          })
        }
        className="border border-line bg-white px-4 py-2 text-[14px] font-bold disabled:opacity-40"
      >
        {pending ? "지우는 중…" : "30일 지난 원본 비우기"}
      </button>
      {msg && <p className="text-[13px] text-ink-500">{msg}</p>}
    </div>
  );
}
