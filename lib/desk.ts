/**
 * 관리자 «업무»(F28)의 날짜 계산 — **전부 한국 날짜 문자열(`YYYY-MM-DD`)로만** 다룹니다.
 *
 * 🔴 `new Date("2026-10-21")` 로 비교하지 마세요. UTC 자정으로 읽혀 한국 시간 아침 9시 전에는
 * 하루가 밀립니다. 서버(Cloudflare, UTC)와 브라우저의 시간대도 다릅니다.
 * `sv-SE` 로케일이 `YYYY-MM-DD` 를 그대로 주는 걸 이용해 문자열로만 비교합니다
 * (DeGaJa 에이전트 데스크 `_calendar.tsx` 와 같은 방식).
 */

const KST = "Asia/Seoul";

export const ymd = (d: Date) => d.toLocaleDateString("sv-SE", { timeZone: KST });
export const todayKST = () => ymd(new Date());

export function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return ymd(new Date(Date.UTC(y, m - 1, d + n, 3))); // 한국 정오 근처에서 더합니다
}

/** to − from (날수) */
export function diffDays(from: string, to: string): number {
  const a = Date.UTC(+from.slice(0, 4), +from.slice(5, 7) - 1, +from.slice(8, 10));
  const b = Date.UTC(+to.slice(0, 4), +to.slice(5, 7) - 1, +to.slice(8, 10));
  return Math.round((b - a) / 864e5);
}

/** 한국어 관례 — 남은 날은 `D-3`, 지난 날은 `D+3` */
export const dday = (n: number) => (n === 0 ? "D-DAY" : n > 0 ? `D-${n}` : `D+${-n}`);

export const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

/** `2026-10-21` → `10월 21일 (수)` */
export function label(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const w = new Date(Date.UTC(y, m - 1, d, 3)).getUTCDay();
  return `${m}월 ${d}일 (${WEEKDAYS[w]})`;
}

/** 그 달의 달력 칸 — 앞뒤를 채워 7의 배수. 각 칸은 `YYYY-MM-DD` */
export function monthCells(year: number, month: number): string[] {
  const first = `${year}-${String(month).padStart(2, "0")}-01`;
  const lead = new Date(Date.UTC(year, month - 1, 1, 3)).getUTCDay();
  const days = new Date(Date.UTC(year, month, 0, 3)).getUTCDate();
  const total = Math.ceil((lead + days) / 7) * 7;
  return Array.from({ length: total }, (_, i) => addDays(first, i - lead));
}
