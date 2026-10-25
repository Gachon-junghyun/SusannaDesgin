import "server-only";

import { createClient } from "@/lib/supabase/server";

/**
 * 글꼴 공방 저장소(0020 `maker_fonts` · `maker_font_parts`) 상태 — F26-m 3단계 · 2026-10-25.
 *
 * 🔴 **«없다»와 «지금 못 쓴다»를 가릅니다**(F26-b 의 `gone`/`down` 과 같은 이유). 0020 을 안 돌린 DB 는 `missing`,
 * 접속 정보가 없거나 DB 가 죽었으면 `down`. 어느 쪽이든 화면은 안 죽고, 고친 것은 그 브라우저 localStorage 에 남습니다.
 */
export type FontStoreStatus = { state: "ready" } | { state: "missing" | "down"; message: string };

export const FONT_STORE_MISSING = "저장소 준비 전입니다(0020 실행 필요). 고친 글자는 이 브라우저에 남겨 두고, 표가 생기면 «저장»으로 올립니다.";

export function explainFontStoreError(e: { code?: string; message?: string }): FontStoreStatus & { state: "missing" | "down" } {
  const msg = e.message ?? "";
  if (e.code === "42P01" || e.code === "PGRST205" || (/maker_font/.test(msg) && /does not exist|schema cache/.test(msg)))
    return { state: "missing", message: FONT_STORE_MISSING };
  return { state: "down", message: `저장소에 닿지 못했습니다: ${msg || e.code || "알 수 없는 오류"}. 고친 글자는 이 브라우저에 남아 있습니다.` };
}

/** 페이지가 처음 그릴 때 한 번 — 표가 있는지만 봅니다(행은 안 읽음) */
export async function fontStoreStatus(): Promise<FontStoreStatus> {
  const supabase = await createClient();
  if (!supabase) return { state: "down", message: "Supabase 접속 정보가 없어 저장소를 쓸 수 없습니다. 고친 글자는 이 브라우저에만 남습니다." };
  // head 요청은 본문이 없어 «표 없음» 코드(42P01·PGRST205)를 못 받습니다 — 한 줄만 읽어 봅니다
  const { error } = await supabase.from("maker_fonts").select("id").limit(1);
  if (error) {
    const s = explainFontStoreError(error);
    if (s.state === "down") console.error("[글꼴 공방] 저장소 확인 실패:", error.code, error.message);
    return s;
  }
  return { state: "ready" };
}
