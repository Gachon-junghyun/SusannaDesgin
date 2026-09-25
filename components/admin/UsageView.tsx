import { planFacts, planLimits, SUPABASE_PLAN, type PlanLimit } from "@/config/plan";

/**
 * 사용량 화면의 «그리는» 부분 (F27). 숫자를 가져오는 건 `app/admin/usage/page.tsx` 이고,
 * 여기는 받은 숫자만 그립니다 — 로그인 없이 화면을 시험해 볼 수 있게 둘로 나눴습니다.
 */
export type Usage = {
  db_bytes: number;
  storage: { bucket: string; files: number; bytes: number }[];
  users: number;
  active_30d: number;
  tables: { name: string; rows: number; bytes: number }[];
  measured_at: string;
};

const TABLE_NAMES: Record<string, string> = {
  quotes: "견적 문의",
  works: "주요 실적",
  hero_slides: "첫 화면 사진",
  content_blocks: "페이지 문구",
  profiles: "관리자 계정",
  maker_shares: "메이커 공유 링크",
};
const BUCKET_NAMES: Record<string, string> = { media: "관리자가 올린 사진", "quote-files": "견적 첨부" };

export default function UsageView({ usage, problem, dashboard }: { usage: Usage | null; problem: string; dashboard: string }) {
  const storageBytes = usage ? usage.storage.reduce((s, b) => s + Number(b.bytes), 0) : 0;
  const used = (l: PlanLimit): number | null => {
    if (!usage || !l.measure) return null;
    if (l.measure === "db") return Number(usage.db_bytes);
    if (l.measure === "storage") return storageBytes;
    return Number(usage.active_30d);
  };
  // 잴 수 있는 것 → 대시보드에서 볼 것 → 고정 한도 순
  const rank = (l: PlanLimit) => (l.measure ? 0 : l.ours ? 2 : 1);
  const measured = [...planLimits].sort((a, b) => rank(a) - rank(b));

  return (
    <>
      <p className="text-[13px] leading-relaxed text-ink-500">
        한도 확인일 {SUPABASE_PLAN.checkedAt} ·{" "}
        <a href={SUPABASE_PLAN.source} target="_blank" rel="noreferrer" className="underline">
          Supabase 요금제 페이지
        </a>{" "}
        (요금제가 바뀌면 이 숫자도 바뀝니다)
        {usage && <> · 잰 시각 {kst(usage.measured_at)}</>}
      </p>

      {problem && <p className="mt-4 border-l-[3px] border-accent bg-white px-4 py-3 text-[14px] leading-relaxed">{problem}</p>}

      <ul className="mt-6 divide-y divide-line border-y border-line bg-white">
        {measured.map((l) => {
          const u = used(l);
          const pct = u === null ? null : (u / l.limit) * 100;
          const hot = pct !== null && pct >= 80;
          return (
            <li key={l.key} className="px-5 py-4">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h2 className="text-[15px] font-black">{l.label}</h2>
                <span className="text-[12px] text-ink-500">
                  {l.per} 한도 {fmt(l.limit, l.unit)}
                </span>
                <span className={`ml-auto text-[15px] font-black tabular-nums ${hot ? "text-accent-600" : ""}`}>
                  {u !== null ? (
                    <>
                      {fmt(u, l.unit)}
                      <span className="ml-2 text-[13px] text-ink-500">{pct! < 1 ? "1% 미만" : `${pct!.toFixed(0)}%`}</span>
                    </>
                  ) : l.ours ? (
                    <span className="text-[13px] font-bold text-ink-500">{l.ours}</span>
                  ) : l.measure ? (
                    <span className="text-[13px] font-bold text-ink-500">0014 실행 후 보임</span>
                  ) : (
                    <a href={dashboard} target="_blank" rel="noreferrer" className="text-[13px] font-bold text-brand-700 underline">
                      대시보드에서 확인 ↗
                    </a>
                  )}
                </span>
              </div>
              {pct !== null && (
                <div className="mt-2 h-1.5 bg-line" role="img" aria-label={`${l.label} 한도의 ${pct.toFixed(1)}% 사용`}>
                  <div className={`h-full ${hot ? "bg-accent" : "bg-brand"}`} style={{ width: `${Math.min(100, Math.max(pct, 0.6))}%` }} />
                </div>
              )}
              <p className="mt-2 text-[13px] leading-relaxed text-ink-500">
                {l.note}
                {l.measure === "mau" && " 숫자는 «최근 30일 안에 로그인한 계정»으로 셉니다(대략)."}
                {l.measure === "db" && " 빈 DB 도 Supabase 기본 시스템 표 때문에 수십 MB 로 시작합니다."}
              </p>
              {l.measure === "storage" && usage && usage.storage.length > 0 && (
                <ul className="mt-2 space-y-0.5 text-[13px] tabular-nums">
                  {usage.storage.map((b) => (
                    <li key={b.bucket} className="flex gap-3">
                      <span className="w-40 shrink-0">{BUCKET_NAMES[b.bucket] ?? b.bucket}</span>
                      <span className="text-ink-500">파일 {Number(b.files).toLocaleString()}개</span>
                      <span className="ml-auto">{fmt(Number(b.bytes), "bytes")}</span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>

      {usage && usage.tables.length > 0 && (
        <section className="mt-10">
          <h2 className="text-[17px] font-black">표마다</h2>
          <p className="mt-1 text-[13px] text-ink-500">데이터베이스 크기가 어디서 오는지입니다. 크기에는 색인이 같이 들어갑니다.</p>
          <table className="mt-3 w-full border-y border-line bg-white text-[14px] tabular-nums">
            <thead>
              <tr className="border-b border-line text-left text-[12px] text-ink-500">
                <th className="px-5 py-2 font-bold">표</th>
                <th className="px-5 py-2 text-right font-bold">행</th>
                <th className="px-5 py-2 text-right font-bold">크기</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {[...usage.tables]
                .sort((a, b) => Number(b.bytes) - Number(a.bytes))
                .map((t) => (
                  <tr key={t.name}>
                    <td className="px-5 py-2">
                      {TABLE_NAMES[t.name] ?? t.name} <span className="text-[12px] text-ink-500">{t.name}</span>
                    </td>
                    <td className="px-5 py-2 text-right">{Number(t.rows).toLocaleString()}</td>
                    <td className="px-5 py-2 text-right">{fmt(Number(t.bytes), "bytes")}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </section>
      )}

      <section className="mt-10">
        <h2 className="text-[17px] font-black">무료 요금제에서 알아둘 것</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-[14px] leading-relaxed">
          {planFacts.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
        <p className="mt-4 text-[13px] leading-relaxed text-ink-500">
          내보낸 데이터(egress)·Edge 호출·Realtime 은 Supabase 쪽 계량기에만 있어 여기서 셀 수 없습니다 —{" "}
          <a href={dashboard} target="_blank" rel="noreferrer" className="font-bold text-brand-700 underline">
            Supabase 대시보드 ↗
          </a>{" "}
          의 사용량(Usage) 화면에서 봅니다.
        </p>
      </section>
    </>
  );
}

function fmt(n: number, unit: "bytes" | "count") {
  if (unit === "count") return Math.round(n).toLocaleString();
  const KB = 1024, MB = KB * 1024, GB = MB * 1024;
  const d = (v: number) => (v >= 10 ? Math.round(v) : Math.round(v * 10) / 10).toString(); // 1.0 → 1
  if (n >= GB) return `${d(n / GB)}GB`;
  if (n >= MB) return `${d(n / MB)}MB`;
  if (n >= KB) return `${Math.round(n / KB)}KB`;
  return `${n}B`;
}

function kst(iso: string) {
  return new Date(iso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "short", timeStyle: "short" });
}
