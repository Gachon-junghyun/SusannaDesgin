"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth";
import { explainAssetError, listMakerAssets, MAKER_ASSET_BUCKET, type AssetList } from "@/lib/maker/assets";
import { createClient } from "@/lib/supabase/server";

/**
 * 프로젝트 에셋 — 에디터가 부르는 목록 · 지우기 (F26-j · 2026-09-26).
 * 🔴 **액션마다 `requireAdmin()`** [A2] — 그 뒤에 `maker_assets` RLS(`is_admin()`)와 버킷 정책이 한 번 더 막습니다.
 * 올리기는 여기 없습니다 — 클로드 코드가 `npm run cms -- maker-assets upload` 로 올립니다(관리자 로그인 세션).
 */

/** 에디터 «프로젝트 에셋» 칸 — 서명 URL 은 6시간 산다 */
export async function getMakerAssets(project?: string): Promise<AssetList> {
  await requireAdmin();
  return listMakerAssets(project);
}

async function client() {
  await requireAdmin();
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase 접속 정보가 설정되지 않았습니다.");
  return supabase;
}

/** 에셋 한 장 지우기 — 파일과 행을 같이. 되돌릴 수 없습니다 */
export async function deleteMakerAsset(id: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await client();
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { ok: false, error: "잘못된 에셋 번호입니다." };
  const { data, error } = await supabase.from("maker_assets").select("path").eq("id", id).maybeSingle<{ path: string }>();
  if (error) return { ok: false, error: explainAssetError(error) };
  if (data?.path) await supabase.storage.from(MAKER_ASSET_BUCKET).remove([data.path]);
  const { error: de } = await supabase.from("maker_assets").delete().eq("id", id);
  if (de) return { ok: false, error: explainAssetError(de) };
  revalidatePath("/admin/maker/assets");
  return { ok: true };
}

/** 프로젝트째 지우기 — 상담이 끝난 손님 자료 정리(보유 기간). 되돌릴 수 없습니다 */
export async function deleteMakerProject(project: string): Promise<{ ok: boolean; error?: string; n?: number }> {
  const supabase = await client();
  const name = String(project ?? "").trim();
  if (!name) return { ok: false, error: "프로젝트 이름이 비었습니다." };
  const { data, error } = await supabase.from("maker_assets").select("id, path").eq("project", name);
  if (error) return { ok: false, error: explainAssetError(error) };
  const rows = (data ?? []) as { id: string; path: string }[];
  if (rows.length) await supabase.storage.from(MAKER_ASSET_BUCKET).remove(rows.map((r) => r.path));
  const { error: de } = await supabase.from("maker_assets").delete().eq("project", name);
  if (de) return { ok: false, error: explainAssetError(de) };
  revalidatePath("/admin/maker/assets");
  return { ok: true, n: rows.length };
}
