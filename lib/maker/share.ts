import "server-only";

import { createPublicClient } from "@/lib/supabase/public";

/**
 * 공유 링크 한 건 읽기 — 손님이 `/maker/s/<토큰>` 을 열 때 (F26-b · 2026-09-25).
 *
 * 🔴 **표를 직접 읽지 않습니다.** 익명에게는 `maker_shares` 권한이 한 줄도 없고,
 * `get_maker_share(토큰)` 함수 하나만 열려 있습니다(`0013_maker_share.sql`). 토큰이 정확히 맞는
 * 한 건, 만료 전에만 돌아옵니다.
 * 쿠키를 안 씁니다(`createPublicClient`) [A3].
 *
 * 세 갈래로 나눠 돌려줍니다 — 화면이 «없는 링크»와 «지금 못 여는 링크»를 다르게 말해야 해서입니다.
 * DB 가 죽었거나 0013 을 안 돌렸는데 «없는 링크»라고 하면, 대표님이 멀쩡한 링크를 다시 만들게 됩니다.
 */
export type ShareLoad =
  | { state: "ok"; title: string; design: unknown; expiresAt: string }
  | { state: "gone" }
  | { state: "down" };

export const isShareToken = (t: string) => /^[0-9a-f]{32}$/.test(t);

export async function loadShare(token: string): Promise<ShareLoad> {
  if (!isShareToken(token)) return { state: "gone" };
  const supabase = createPublicClient();
  if (!supabase) return { state: "down" };
  const { data, error } = await supabase.rpc("get_maker_share", { p_token: token });
  if (error) {
    console.error("[메이커 공유] 읽기 실패 — 0013 을 돌렸는지 확인하세요:", error.code, error.message);
    return { state: "down" };
  }
  const row = (Array.isArray(data) ? data[0] : null) as { title?: string; design?: { items?: unknown }; expires_at?: string } | null;
  if (!row || !row.design || !Array.isArray(row.design.items)) return { state: "gone" };
  return { state: "ok", title: row.title ?? "", design: row.design, expiresAt: row.expires_at ?? "" };
}
