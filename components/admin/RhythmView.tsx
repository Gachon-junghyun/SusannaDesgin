"use client";

import { useState, useTransition } from "react";

import { markRhythm } from "@/app/admin/desk/actions";
import { RHYTHMS } from "@/config/desk";
import { diffDays, label } from "@/lib/desk";

/**
 * 마케팅 주기 체크 (F28) — 항목마다 «마지막으로 한 날» 하나만 남기고, 주기를 넘기면 빨갛게.
 * 항목 목록·주기·요령은 `config/desk.ts` 의 `RHYTHMS` 한 곳입니다.
 * 🔴 여기서 누르는 건 «했다는 기록»이지 채널에 대신 올리는 게 아닙니다 — 발행은 사람이 각 채널에서 합니다.
 */
export default function RhythmView({ last, today, problem }: { last: Record<string, string>; today: string; problem: string }) {
  const [error, setError] = useState("");
  const rows = RHYTHMS.map((r) => {
    const on = last[r.key];
    const since = on ? diffDays(on, today) : null;
    const state = since === null ? "never" : since > r.every ? "late" : since >= r.every - 1 ? "soon" : "ok";
    return { r, on, since, state };
  }).sort((a, b) => rank(a.state) - rank(b.state));

  const lateCount = rows.filter((x) => x.state === "late" || x.state === "never").length;

  return (
    <div className="space-y-6">
      {problem && <p className="border-l-4 border-accent bg-white px-4 py-3 text-[14px] leading-relaxed text-ink">{problem}</p>}
      {error && (
        <p role="alert" className="border-l-4 border-accent bg-white px-4 py-3 text-[14px] text-ink">
          {error}
        </p>
      )}
      <p className="text-[15px] text-ink-500">
        {lateCount ? (
          <>
            밀렸거나 한 번도 기록이 없는 항목 <b className="text-accent-600">{lateCount}</b>개
          </>
        ) : (
          "전부 주기 안에 있습니다."
        )}{" "}
        · 채널에 올린 뒤 «오늘 했음»을 누르면 다음 주기가 다시 셉니다.
      </p>
      <ul className="divide-y divide-line border-y border-line bg-white">
        {rows.map(({ r, on, since, state }) => (
          <Row key={r.key} r={r} on={on} since={since} state={state} today={today} onError={setError} />
        ))}
      </ul>
    </div>
  );
}

const rank = (s: string) => (s === "late" ? 0 : s === "never" ? 1 : s === "soon" ? 2 : 3);

function Row({
  r,
  on,
  since,
  state,
  today,
  onError,
}: {
  r: (typeof RHYTHMS)[number];
  on?: string;
  since: number | null;
  state: string;
  today: string;
  onError: (s: string) => void;
}) {
  const [pending, start] = useTransition();
  const [day, setDay] = useState(today);
  const mark = () =>
    start(async () => {
      const res = await markRhythm(r.key, day);
      if (res.error) onError(res.error);
    });
  const every = r.every === 4 ? "주 2회" : r.every === 7 ? "주 1회" : r.every === 14 ? "2주에 1회" : r.every === 30 ? "월 1회" : `${r.every}일마다`;

  return (
    <li className={`grid gap-3 px-4 py-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center ${pending ? "opacity-50" : ""}`}>
      <div className="min-w-0">
        <p className="flex flex-wrap items-baseline gap-x-3 text-[16px] font-black">
          <span className={state === "late" ? "text-accent-600" : "text-ink"}>{r.label}</span>
          <span className="text-[12px] font-bold text-ink-500">{every}</span>
          <span className={`text-[12px] font-bold ${state === "late" ? "text-accent-600" : state === "soon" ? "text-brand-700" : "text-ink-500"}`}>
            {since === null ? "기록 없음" : since === 0 ? "오늘 함" : `${since}일 전 (${label(on!)})`}
            {state === "late" && " — 밀림"}
            {state === "soon" && " — 곧"}
          </span>
        </p>
        <p className="mt-1 text-[14px] leading-relaxed text-ink">{r.how}</p>
        <p className="mt-0.5 text-[12px] leading-relaxed text-ink-500">{r.why}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {r.link && (
          <a href={r.link} target="_blank" rel="noreferrer" className="px-3 py-2 text-[13px] font-bold text-brand-700 hover:underline">
            열기 ↗
          </a>
        )}
        <input
          type="date"
          value={day}
          max={today}
          onChange={(e) => setDay(e.target.value)}
          aria-label={`${r.label} 한 날`}
          className="border border-line bg-white px-2 py-1.5 text-[13px]"
        />
        <button type="button" onClick={mark} disabled={pending} className="bg-brand-700 px-4 py-2 text-[13px] font-bold text-white disabled:opacity-50">
          {day === today ? "오늘 했음" : "이날 했음"}
        </button>
      </div>
    </li>
  );
}
