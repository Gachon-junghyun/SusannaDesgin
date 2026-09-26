import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { MakerAssetRow } from "@/lib/supabase/types";

/**
 * 메이커 «프로젝트 에셋» 읽기 (F26-j · 2026-09-26).
 *
 * 흐름: 클로드 코드가 손님 시안에서 로고·레터링·아이콘·그림을 뽑아 `npm run cms -- maker-assets upload` 로 올립니다 →
 * 관리자가 `/admin/maker/assets` 에서 보고, 에디터 «프로젝트 에셋» 칸에서 벽에 올려 조립합니다 →
 * 공유 링크(방)를 만들면 클로드가 `npm run cms -- maker pull <토큰>` 으로 받아 일러스트로 굽습니다.
 *
 * 🔴 **비공개 버킷 + 서명 URL** 입니다(견적 첨부 `lib/quote-files.ts` 와 같은 방식) — 손님 자료라서요.
 * 부르는 쪽(페이지·서버 액션)이 먼저 `requireAdmin()` 을 합니다 [A2]. 여기서 RLS 를 우회하는 것은 없습니다.
 */

export const MAKER_ASSET_BUCKET = "maker-assets";
/** 서명 URL 수명 — 에디터를 열어 두고 한참 조립해도 그림이 안 끊기게 (6시간) */
const TTL = 6 * 60 * 60;

export type MakerAsset = MakerAssetRow & { url: string | null };
export type AssetList = { ok: true; items: MakerAsset[] } | { ok: false; error: string };

export const ASSETS_MISSING =
  "에셋 표가 아직 없습니다 — supabase/migrations/0018_maker_assets.sql 을 Supabase 대시보드에서 먼저 실행해야 합니다.";

export function explainAssetError(e: { code?: string; message?: string }): string {
  const msg = e.message ?? "";
  if (e.code === "42P01" || e.code === "PGRST205" || (/maker_assets/.test(msg) && /does not exist|schema cache/.test(msg))) return ASSETS_MISSING;
  return `읽지 못했습니다: ${msg || e.code || "알 수 없는 오류"}`;
}

/** 에셋 목록 + 서명 URL. `project` 를 주면 그 프로젝트만 */
export async function listMakerAssets(project?: string): Promise<AssetList> {
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Supabase 접속 정보가 설정되지 않았습니다." };
  let q = supabase.from("maker_assets").select("*").order("project").order("created_at", { ascending: true }).limit(500);
  if (project) q = q.eq("project", project);
  const { data, error } = await q;
  if (error) return { ok: false, error: explainAssetError(error) };
  const rows = (data ?? []) as MakerAssetRow[];
  if (!rows.length) return { ok: true, items: [] };
  const { data: signed, error: se } = await supabase.storage.from(MAKER_ASSET_BUCKET).createSignedUrls(rows.map((r) => r.path), TTL);
  if (se) console.error("[메이커 에셋] 서명 URL 발급 실패:", se.message);
  const url = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));
  return { ok: true, items: rows.map((r) => ({ ...r, url: url.get(r.path) ?? null })) };
}
