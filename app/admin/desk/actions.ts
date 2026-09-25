"use server";

import { revalidatePath } from "next/cache";

import { DESK_AREAS, RHYTHMS } from "@/config/desk";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/**
 * 관리자 «업무» 화면(F28)의 쓰기. 서버 액션은 화면과 별개로 인터넷에 열려 있으므로
 * **액션마다** `requireAdmin()` 을 다시 부르고, 그 뒤에 RLS(`is_admin()`)가 한 번 더 거릅니다 [A2].
 */

export type DeskState = { error?: string; ok?: boolean };

async function adminClient() {
  await requireAdmin();
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase 접속 정보가 설정되지 않았습니다.");
  return supabase;
}

/** 표가 없을 때(0015 미실행) 알아듣게 */
function explain(e: { code?: string; message: string }): string {
  if (/PGRST205|42P01/.test(e.code ?? "") || /desk_(tasks|rhythm)/.test(e.message))
    return "저장할 표가 아직 없습니다 — supabase/migrations/0015_admin_desk.sql 을 Supabase 대시보드에서 실행해 주세요.";
  return `저장하지 못했습니다: ${e.message}`;
}

const text = (f: FormData, k: string, max: number) => String(f.get(k) ?? "").trim().slice(0, max);
const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);

function refresh() {
  revalidatePath("/admin/desk");
  revalidatePath("/admin/desk/rhythm");
  revalidatePath("/admin");
}

export async function addTask(_prev: DeskState, form: FormData): Promise<DeskState> {
  const title = text(form, "title", 200);
  if (!title) return { error: "할 일을 적어 주세요." };
  const due = text(form, "due_on", 10);
  const area = text(form, "area", 20);
  const link = text(form, "link", 500);
  if (link && !/^https?:\/\//.test(link)) return { error: "링크는 http:// 또는 https:// 로 시작해야 합니다." };

  const supabase = await adminClient();
  const { error } = await supabase.from("desk_tasks").insert({
    title,
    due_on: isDate(due) ? due : null,
    who: text(form, "who", 20),
    area: DESK_AREAS.some((a) => a.key === area) ? area : "etc",
    note: text(form, "note", 2000),
    link,
  });
  if (error) return { error: explain(error) };
  refresh();
  return { ok: true };
}

export async function setTaskDone(id: string, done: boolean): Promise<DeskState> {
  const supabase = await adminClient();
  const { error } = await supabase
    .from("desk_tasks")
    .update({ done_at: done ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) return { error: explain(error) };
  refresh();
  return { ok: true };
}

export async function setTaskDue(id: string, due: string): Promise<DeskState> {
  if (due && !isDate(due)) return { error: "날짜 형식이 아닙니다." };
  const supabase = await adminClient();
  const { error } = await supabase.from("desk_tasks").update({ due_on: due || null }).eq("id", id);
  if (error) return { error: explain(error) };
  refresh();
  return { ok: true };
}

export async function deleteTask(id: string): Promise<DeskState> {
  const supabase = await adminClient();
  const { error } = await supabase.from("desk_tasks").delete().eq("id", id);
  if (error) return { error: explain(error) };
  refresh();
  return { ok: true };
}

/** 마케팅 주기 — «오늘 했다» (날짜를 주면 그날로) */
export async function markRhythm(key: string, on: string): Promise<DeskState> {
  if (!RHYTHMS.some((r) => r.key === key)) return { error: "모르는 항목입니다." };
  if (!isDate(on)) return { error: "날짜 형식이 아닙니다." };
  const supabase = await adminClient();
  const { error } = await supabase
    .from("desk_rhythm")
    .upsert({ key, last_done_on: on, updated_at: new Date().toISOString() });
  if (error) return { error: explain(error) };
  refresh();
  return { ok: true };
}
