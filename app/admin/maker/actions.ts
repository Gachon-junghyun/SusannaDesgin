"use server";

import { requireAdmin } from "@/lib/auth";
import { checkShareDesign, cleanShareTitle } from "@/lib/maker/share-check";
import { createClient } from "@/lib/supabase/server";
import type { MakerShareRow } from "@/lib/supabase/types";

/**
 * 간판 메이커 공유 링크 — 만들기 · 목록 · 끊기 (F26-b · 2026-09-25).
 *
 * 🔴 **액션마다 `requireAdmin()`** 입니다 — 서버 액션은 화면과 별개로 인터넷에 열린 문입니다 [A2].
 * 그 뒤에 `maker_shares` 의 RLS(`is_admin()`)가 한 번 더 막습니다.
 * 🔴 **가게 사진은 여기로 못 들어옵니다** — 에디터가 흰 벽으로 바꿔 보내고, 여기서도 사진 벽·`data:`·`blob:`
 * 주소가 섞인 디자인은 거부합니다. 사진을 서버에 두려면 개인정보처리방침부터 고쳐야 합니다.
 */

export type ShareItem = Pick<MakerShareRow, "id" | "token" | "title" | "created_at" | "expires_at">;
export type ShareResult = { ok: true; share: ShareItem } | { ok: false; error: string };

const MISSING = "공유 링크 표가 아직 없습니다 — supabase/migrations/0013_maker_share.sql 을 Supabase 대시보드에서 먼저 실행해야 합니다.";

/** 마이그레이션을 안 돌린 DB — 표가 없다는 오류를 사람 말로 바꿉니다 [A1] */
function explain(e: { code?: string; message?: string }): string {
  const msg = e.message ?? "";
  if (e.code === "42P01" || e.code === "PGRST205" || (/maker_shares/.test(msg) && /does not exist|schema cache/.test(msg))) return MISSING;
  return `저장하지 못했습니다: ${msg || e.code || "알 수 없는 오류"}`;
}

async function client() {
  await requireAdmin();
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase 접속 정보가 설정되지 않았습니다.");
  return supabase;
}

export async function createMakerShare(design: unknown, title: string): Promise<ShareResult> {
  const supabase = await client();

  // 검사는 손님 견적 경로와 같은 한 곳(`lib/maker/share-check.ts`)입니다
  const checked = checkShareDesign(design);
  if ("error" in checked) return { ok: false, error: checked.error };
  const cleanTitle = cleanShareTitle(title);

  const { data, error } = await supabase
    .from("maker_shares")
    .insert({ title: cleanTitle, design })
    .select("id, token, title, created_at, expires_at")
    .single<ShareItem>();
  if (error || !data) return { ok: false, error: error ? explain(error) : "저장하지 못했습니다." };
  return { ok: true, share: data };
}

export async function listMakerShares(): Promise<{ ok: true; items: ShareItem[] } | { ok: false; error: string }> {
  const supabase = await client();
  const { data, error } = await supabase
    .from("maker_shares")
    .select("id, token, title, created_at, expires_at")
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) return { ok: false, error: explain(error) };
  return { ok: true, items: (data ?? []) as ShareItem[] };
}

/** 링크 끊기 — 행을 지웁니다. 되돌릴 수 없고, 받은 사람 화면은 «없는 링크»가 됩니다 */
export async function deleteMakerShare(id: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await client();
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { ok: false, error: "잘못된 링크 번호입니다." };
  const { error } = await supabase.from("maker_shares").delete().eq("id", id);
  if (error) return { ok: false, error: explain(error) };
  return { ok: true };
}
