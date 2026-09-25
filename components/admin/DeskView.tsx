"use client";

import { useActionState, useMemo, useState, useTransition } from "react";

import { addTask, deleteTask, setTaskDone, setTaskDue, type DeskState } from "@/app/admin/desk/actions";
import { DESK_AREAS, DESK_WHO } from "@/config/desk";
import { addDays, dday, diffDays, label, monthCells, WEEKDAYS } from "@/lib/desk";
import type { DeskTaskRow } from "@/lib/supabase/types";

/**
 * 관리자 «업무 달력» (F28) — 왼쪽 달력 한 장 + 오른쪽 «지금부터 뭘 해야 하나».
 * DeGaJa 에이전트 데스크 첫 화면과 같은 생각입니다: 사람이 이 화면을 여는 이유는 «오늘 내가 뭘 해야 하나» 입니다.
 *
 * 데이터를 가져오는 건 `app/admin/desk/page.tsx` 이고 여기는 받은 줄만 그립니다 —
 * 로그인 없이 가짜 줄로 화면을 시험할 수 있게 둘로 나눴습니다(F27 사용량 화면과 같은 방식).
 */

const areaLabel = (k: string) => DESK_AREAS.find((a) => a.key === k)?.label ?? "기타";

export default function DeskView({ tasks, today, problem }: { tasks: DeskTaskRow[]; today: string; problem: string }) {
  const [month, setMonth] = useState(today.slice(0, 7)); // YYYY-MM
  const [picked, setPicked] = useState<string | null>(null);
  const [error, setError] = useState("");

  const open = tasks.filter((t) => !t.done_at);
  const done = tasks.filter((t) => t.done_at).sort((a, b) => (b.done_at ?? "").localeCompare(a.done_at ?? ""));

  const byDay = useMemo(() => {
    const m = new Map<string, DeskTaskRow[]>();
    for (const t of tasks) if (t.due_on) m.set(t.due_on, [...(m.get(t.due_on) ?? []), t]);
    return m;
  }, [tasks]);

  const dated = open.filter((t) => t.due_on).sort((a, b) => a.due_on!.localeCompare(b.due_on!));
  const late = dated.filter((t) => t.due_on! < today);
  const soon = dated.filter((t) => t.due_on! >= today && t.due_on! <= addDays(today, 14));
  const later = dated.filter((t) => t.due_on! > addDays(today, 14));
  const undated = open.filter((t) => !t.due_on);

  const [y, m] = month.split("-").map(Number);
  const cells = monthCells(y, m);
  const shift = (n: number) => {
    const d = new Date(Date.UTC(y, m - 1 + n, 1, 3));
    setMonth(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  };

  return (
    <div className="space-y-8">
      {problem && <p className="border-l-4 border-accent bg-white px-4 py-3 text-[14px] leading-relaxed text-ink">{problem}</p>}
      {error && (
        <p role="alert" className="border-l-4 border-accent bg-white px-4 py-3 text-[14px] text-ink">
          {error}{" "}
          <button type="button" className="ml-2 font-bold text-brand-700 underline" onClick={() => setError("")}>
            닫기
          </button>
        </p>
      )}

      <p className="text-[15px] text-ink-500">
        오늘 <b className="text-ink">{label(today)}</b> · 밀린 일 <b className={late.length ? "text-accent-600" : "text-ink"}>{late.length}</b> · 2주 안{" "}
        <b className="text-ink">{soon.length}</b> · 기한 없음 <b className="text-ink">{undated.length}</b>
      </p>

      <AddForm defaultDue={picked ?? ""} />

      <div className="grid gap-10 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        {/* 달력 */}
        <section aria-label="달력">
          <div className="flex items-center justify-between">
            <h2 className="text-[20px] font-black tracking-tight">
              {y}년 {m}월
            </h2>
            <div className="flex gap-1 text-[14px] font-bold">
              <button type="button" onClick={() => shift(-1)} className="px-3 py-1.5 text-ink-500 hover:text-ink" aria-label="이전 달">
                ‹
              </button>
              <button type="button" onClick={() => setMonth(today.slice(0, 7))} className="px-3 py-1.5 text-brand-700">
                오늘
              </button>
              <button type="button" onClick={() => shift(1)} className="px-3 py-1.5 text-ink-500 hover:text-ink" aria-label="다음 달">
                ›
              </button>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-7 border-l border-t border-line bg-white text-[12px]">
            {WEEKDAYS.map((w, i) => (
              <div key={w} className={`border-b border-r border-line px-2 py-1.5 font-bold ${i === 0 ? "text-accent-600" : "text-ink-500"}`}>
                {w}
              </div>
            ))}
            {cells.map((d) => {
              const items = byDay.get(d) ?? [];
              const inMonth = d.slice(0, 7) === month;
              const isToday = d === today;
              const isPicked = d === picked;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setPicked(isPicked ? null : d)}
                  aria-pressed={isPicked}
                  aria-label={`${label(d)}${items.length ? `, 할 일 ${items.length}개` : ""}`}
                  className={`min-h-[64px] border-b border-r border-line px-1.5 py-1 text-left align-top sm:min-h-[92px] ${isPicked ? "bg-brand-50" : "hover:bg-paper"} ${inMonth ? "" : "text-ink-500/50"}`}
                >
                  <span
                    className={`inline-flex h-6 min-w-6 items-center justify-center text-[12px] font-bold ${isToday ? "rounded-full bg-brand-700 px-1.5 text-white" : ""}`}
                  >
                    {Number(d.slice(8))}
                  </span>
                  <span className="mt-0.5 hidden space-y-0.5 sm:block">
                    {items.slice(0, 2).map((t) => (
                      <span
                        key={t.id}
                        className={`block truncate border-l-2 pl-1 text-[11px] leading-snug ${t.done_at ? "border-line text-ink-500 line-through" : d < today ? "border-accent text-accent-600" : "border-brand-600 text-ink"}`}
                      >
                        {t.title}
                      </span>
                    ))}
                    {items.length > 2 && <span className="block text-[11px] text-ink-500">+{items.length - 2}</span>}
                  </span>
                  {items.length > 0 && (
                    <span className="mt-1 flex gap-0.5 sm:hidden" aria-hidden="true">
                      {items.slice(0, 3).map((t) => (
                        <span key={t.id} className={`h-1.5 w-1.5 rounded-full ${t.done_at ? "bg-line" : d < today ? "bg-accent" : "bg-brand-600"}`} />
                      ))}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-[12px] text-ink-500">날짜를 누르면 그날 할 일만 보이고, 위 «할 일 추가»의 날짜도 그날로 잡힙니다.</p>
        </section>

        {/* 큐 */}
        <section aria-label="할 일" className="space-y-8">
          {picked ? (
            <Group title={`${label(picked)} 할 일`} items={byDay.get(picked) ?? []} today={today} onError={setError} empty="이날은 할 일이 없습니다.">
              <button type="button" onClick={() => setPicked(null)} className="text-[13px] font-bold text-brand-700">
                전체 보기
              </button>
            </Group>
          ) : (
            <>
              {late.length > 0 && <Group title="밀린 일" tone="late" items={late} today={today} onError={setError} />}
              <Group title="앞으로 2주" items={soon} today={today} onError={setError} empty="2주 안에 기한이 있는 일이 없습니다." />
              {later.length > 0 && <Group title="그 뒤" items={later} today={today} onError={setError} />}
              {DESK_AREAS.map((a) => {
                const items = undated.filter((t) => t.area === a.key);
                return items.length ? <Group key={a.key} title={`기한 없음 · ${a.label}`} items={items} today={today} onError={setError} /> : null;
              })}
              {done.length > 0 && (
                <details>
                  <summary className="cursor-pointer text-[14px] font-bold text-ink-500">끝낸 일 {done.length}개</summary>
                  <ul className="mt-3 divide-y divide-line border-y border-line bg-white">
                    {done.slice(0, 30).map((t) => (
                      <TaskRow key={t.id} t={t} today={today} onError={setError} />
                    ))}
                  </ul>
                </details>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function Group({
  title,
  items,
  today,
  onError,
  tone,
  empty,
  children,
}: {
  title: string;
  items: DeskTaskRow[];
  today: string;
  onError: (s: string) => void;
  tone?: "late";
  empty?: string;
  children?: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <h3 className={`text-[15px] font-black ${tone === "late" ? "text-accent-600" : "text-ink"}`}>
          {title} <span className="font-bold text-ink-500">{items.length}</span>
        </h3>
        {children}
      </div>
      {items.length ? (
        <ul className="mt-2 divide-y divide-line border-y border-line bg-white">
          {items.map((t) => (
            <TaskRow key={t.id} t={t} today={today} onError={onError} />
          ))}
        </ul>
      ) : (
        empty && <p className="mt-2 text-[14px] text-ink-500">{empty}</p>
      )}
    </div>
  );
}

function TaskRow({ t, today, onError }: { t: DeskTaskRow; today: string; onError: (s: string) => void }) {
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<DeskState>) =>
    start(async () => {
      const r = await fn();
      if (r.error) onError(r.error);
    });
  const n = t.due_on ? diffDays(today, t.due_on) : null;
  const isDone = Boolean(t.done_at);

  return (
    <li className={`flex gap-3 px-3 py-3 ${pending ? "opacity-50" : ""}`}>
      <input
        type="checkbox"
        checked={isDone}
        onChange={(e) => run(() => setTaskDone(t.id, e.target.checked))}
        aria-label={`${t.title} ${isDone ? "안 끝남으로" : "끝냄으로"} 표시`}
        className="mt-1 h-5 w-5 shrink-0 accent-brand-700"
      />
      <div className="min-w-0 flex-1">
        <p className={`text-[15px] font-bold leading-snug ${isDone ? "text-ink-500 line-through" : "text-ink"}`}>{t.title}</p>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-ink-500">
          {n !== null && !isDone && (
            <b className={n < 0 ? "text-accent-600" : n <= 3 ? "text-brand-700" : "text-ink"}>
              {dday(n)} · {label(t.due_on!)}
            </b>
          )}
          {t.who && <span>{t.who}</span>}
          <span>{areaLabel(t.area)}</span>
          {t.link && (
            <a href={t.link} target="_blank" rel="noreferrer" className="font-bold text-brand-700 hover:underline">
              바로가기 ↗
            </a>
          )}
        </p>
        {t.note && <p className="mt-1.5 text-[13px] leading-relaxed text-ink-500">{t.note}</p>}
        {!isDone && (
          <div className="mt-2 flex flex-wrap items-center gap-3 text-[12px]">
            <label className="flex items-center gap-1.5 text-ink-500">
              기한
              <input
                type="date"
                defaultValue={t.due_on ?? ""}
                onChange={(e) => run(() => setTaskDue(t.id, e.target.value))}
                className="border border-line bg-white px-1.5 py-0.5 text-[12px] text-ink"
              />
            </label>
            <button
              type="button"
              onClick={() => confirm(`«${t.title}» 을(를) 지울까요?`) && run(() => deleteTask(t.id))}
              className="font-bold text-ink-500 hover:text-accent-600"
            >
              지우기
            </button>
          </div>
        )}
      </div>
    </li>
  );
}

function AddForm({ defaultDue }: { defaultDue: string }) {
  const [state, action, pending] = useActionState(addTask, {} as DeskState);
  const [openForm, setOpenForm] = useState(false);
  return (
    <div className="border-y border-line bg-white px-4 py-3">
      <button type="button" onClick={() => setOpenForm((v) => !v)} aria-expanded={openForm} className="text-[15px] font-black text-brand-700">
        {openForm ? "− 할 일 추가 닫기" : "+ 할 일 추가"}
      </button>
      {openForm && (
        <form action={action} className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr]" key={defaultDue}>
          <label className="block sm:col-span-2 lg:col-span-1">
            <span className="text-[12px] font-bold text-ink-500">할 일</span>
            <input name="title" required maxLength={200} className="mt-1 w-full border border-line px-3 py-2 text-[15px]" placeholder="예: 태평한우 간판 점검 전화" />
          </label>
          <label className="block">
            <span className="text-[12px] font-bold text-ink-500">기한 (없어도 됨)</span>
            <input name="due_on" type="date" defaultValue={defaultDue} className="mt-1 w-full border border-line px-3 py-2 text-[15px]" />
          </label>
          <label className="block">
            <span className="text-[12px] font-bold text-ink-500">누가</span>
            <select name="who" className="mt-1 w-full border border-line bg-white px-3 py-2 text-[15px]">
              <option value="">—</option>
              {DESK_WHO.map((w) => (
                <option key={w}>{w}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-[12px] font-bold text-ink-500">묶음</span>
            <select name="area" defaultValue="etc" className="mt-1 w-full border border-line bg-white px-3 py-2 text-[15px]">
              {DESK_AREAS.map((a) => (
                <option key={a.key} value={a.key}>
                  {a.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block sm:col-span-2">
            <span className="text-[12px] font-bold text-ink-500">링크 (없어도 됨)</span>
            <input name="link" type="url" maxLength={500} className="mt-1 w-full border border-line px-3 py-2 text-[15px]" placeholder="https://" />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-[12px] font-bold text-ink-500">메모 — 손님 이름·연락처는 적지 마세요 (견적함에만)</span>
            <input name="note" maxLength={2000} className="mt-1 w-full border border-line px-3 py-2 text-[15px]" />
          </label>
          <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-4">
            <button type="submit" disabled={pending} className="bg-brand-700 px-5 py-2.5 text-[14px] font-bold text-white disabled:opacity-50">
              {pending ? "저장 중…" : "추가"}
            </button>
            {state.error && <p className="text-[13px] text-accent-600">{state.error}</p>}
            {state.ok && <p className="text-[13px] text-brand-700">추가했습니다.</p>}
          </div>
        </form>
      )}
    </div>
  );
}
