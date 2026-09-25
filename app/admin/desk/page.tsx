import AdminShell from "@/components/admin/AdminShell";
import DeskView from "@/components/admin/DeskView";
import { requireAdmin } from "@/lib/auth";
import { todayKST } from "@/lib/desk";
import { createClient } from "@/lib/supabase/server";
import type { DeskTaskRow } from "@/lib/supabase/types";

/**
 * P21 — 업무 달력 · 할 일 (F28 · 2026-09-26).
 * 사람 요청: *"우리 에이전트 데스크처럼 여기 자체용 캘린더 및 업무용 프로세스"*.
 * 할 일은 `desk_tasks`(0015). 표가 없으면 빈 달력과 «0015 실행» 안내만 띄웁니다 [A1].
 */
export const dynamic = "force-dynamic";

export default async function DeskPage() {
  const user = await requireAdmin();
  const supabase = await createClient();

  let tasks: DeskTaskRow[] = [];
  let problem = "";
  if (!supabase) problem = "Supabase 접속 정보가 설정되지 않아 할 일을 못 읽습니다.";
  else {
    const { data, error } = await supabase.from("desk_tasks").select("*").order("due_on", { ascending: true, nullsFirst: false }).limit(500);
    if (error)
      problem = /PGRST205|42P01/.test(error.code ?? "") || /desk_tasks/.test(error.message)
        ? "할 일을 저장할 표가 아직 없습니다 — supabase/migrations/0015_admin_desk.sql 을 Supabase 대시보드에서 실행하면 첫 할 일 19개가 같이 들어옵니다."
        : `할 일을 읽지 못했습니다: ${error.message}`;
    else tasks = (data ?? []) as DeskTaskRow[];
  }

  return (
    <AdminShell user={user} title="업무 달력" desc="기한이 있는 일은 달력에, 없는 일은 묶음별로 모았습니다. 체크하면 «끝낸 일»로 내려갑니다.">
      <DeskView tasks={tasks} today={todayKST()} problem={problem} />
    </AdminShell>
  );
}
