import AdminShell from "@/components/admin/AdminShell";
import RhythmView from "@/components/admin/RhythmView";
import { requireAdmin } from "@/lib/auth";
import { todayKST } from "@/lib/desk";
import { createClient } from "@/lib/supabase/server";
import type { DeskRhythmRow } from "@/lib/supabase/types";

/**
 * P22 — 마케팅 주기 체크 (F28 · 2026-09-26). 항목은 `config/desk.ts` 의 `RHYTHMS`,
 * «마지막으로 한 날»은 `desk_rhythm`(0015). 표가 없어도 목록과 요령은 보입니다 [A1].
 */
export const dynamic = "force-dynamic";

export default async function RhythmPage() {
  const user = await requireAdmin();
  const supabase = await createClient();

  const last: Record<string, string> = {};
  let problem = "";
  if (!supabase) problem = "Supabase 접속 정보가 설정되지 않아 기록을 못 읽습니다.";
  else {
    const { data, error } = await supabase.from("desk_rhythm").select("*");
    if (error)
      problem = /PGRST205|42P01/.test(error.code ?? "") || /desk_rhythm/.test(error.message)
        ? "기록할 표가 아직 없습니다 — supabase/migrations/0015_admin_desk.sql 을 실행하면 «오늘 했음»이 저장됩니다. 목록과 요령은 지금도 볼 수 있습니다."
        : `기록을 읽지 못했습니다: ${error.message}`;
    else for (const r of (data ?? []) as DeskRhythmRow[]) last[r.key] = r.last_done_on;
  }

  return (
    <AdminShell user={user} title="마케팅 주기" desc="채널마다 얼마나 자주 해야 하는지와, 마지막으로 한 날입니다. 주기를 넘기면 빨갛게 올라옵니다.">
      <RhythmView last={last} today={todayKST()} problem={problem} />
    </AdminShell>
  );
}
