import AdminShell from "@/components/admin/AdminShell";
import UsageView, { type Usage } from "@/components/admin/UsageView";
import { SUPABASE_PLAN } from "@/config/plan";
import { requireAdmin } from "@/lib/auth";
import { SUPABASE_URL } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

/**
 * P20 — 사용량 (Supabase 무료 한도 대비) · F27 · 2026-09-25.
 *
 * 사람 요청: *"supabase 우리 티어로 가능한 량 보여주는 거 모아서 보여주는 거"*.
 * 한도는 `config/plan.ts`(요금제 페이지에서 옮긴 값), 실제 사용량은 `admin_usage()`(0014)가 셉니다.
 * 🔴 **SQL 로 못 재는 것(egress 등)은 숫자를 지어내지 않고 «대시보드에서 확인»으로 둡니다** [P6].
 * 0014 를 안 돌렸으면 한도 표만 나오고 무엇을 하면 되는지 적습니다 [A1].
 */
export const dynamic = "force-dynamic";

export default async function UsagePage() {
  const user = await requireAdmin();
  const supabase = await createClient();

  let usage: Usage | null = null;
  let problem = "";
  if (!supabase) problem = "Supabase 접속 정보가 설정되지 않아 사용량을 못 읽습니다.";
  else {
    const { data, error } = await supabase.rpc("admin_usage");
    if (error)
      problem = /PGRST202|42883|admin_usage/.test(`${error.code} ${error.message}`)
        ? "실제 사용량을 세는 함수가 아직 없습니다 — supabase/migrations/0014_admin_usage.sql 을 Supabase 대시보드에서 실행하면 아래에 숫자가 채워집니다. 지금은 한도만 보입니다."
        : `사용량을 읽지 못했습니다: ${error.message}`;
    else usage = data as Usage;
  }

  const ref = projectRef(SUPABASE_URL);
  const dashboard = ref ? `https://supabase.com/dashboard/project/${ref}` : "https://supabase.com/dashboard";

  return (
    <AdminShell
      user={user}
      title="사용량"
      desc={`Supabase ${SUPABASE_PLAN.name} 요금제의 한도와 지금 쓰는 양입니다. 한도의 80%를 넘으면 주황으로 표시합니다.`}
    >
      <UsageView usage={usage} problem={problem} dashboard={dashboard} />
    </AdminShell>
  );
}

/** `https://<ref>.supabase.co` → ref. 대시보드 링크용이고 비밀이 아닙니다(공개 페이지에도 같은 주소가 나갑니다) */
function projectRef(url: string) {
  try {
    const h = new URL(url).hostname;
    return h.endsWith(".supabase.co") ? h.split(".")[0] : "";
  } catch {
    return "";
  }
}
