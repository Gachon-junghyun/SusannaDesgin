import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";

import { getCurrentUser } from "@/lib/auth";

/**
 * 새 디자인 미리보기 — 같은 주소에서 **관리자에게만** 새 화면을 보여줍니다.
 *
 * ⚠️ 화면 문구에 "시안" 을 쓰지 않습니다. 이 회사는 그 말을 손님에게 내는 **간판
 * 디자인 시안**이라는 뜻으로 이미 쓰고 있습니다 (`components/PreviewBar.tsx`).
 *
 * 🔴 **이 파일은 설계 원칙 A3("공개 페이지에서 쿠키를 읽지 않는다")의 유일한 예외입니다.**
 * 2026-08-17 에 대표님이 근거를 듣고 여신 문입니다 — 새 디자인을 실제 주소에서
 * 검증하려면 공개 화면이 방문자를 알아야 하고, 그건 쿠키 말고는 방법이 없습니다.
 * 예외의 대가와 지켜야 할 것은 `docs/ARCHITECTURE.md` §0 A3 · §7 에 적혀 있습니다.
 * **여기 말고 다른 곳에서 공개 페이지가 `cookies()` 를 부르지 마세요.**
 *
 * 왜 쿠키 하나로 안 끝나는가 — **쿠키는 «보고 싶다»는 뜻일 뿐 권한이 아닙니다.**
 * 실제 판단은 `getCurrentUser()`(토큰을 인증 서버에 검증)가 합니다 [원칙 A2].
 * 그래서 쿠키만 심어 놓아도 새 화면은 안 그려집니다.
 */

/** 미리보기 쿠키. `setPreview()` 서버 액션만 이 값을 씁니다 (httpOnly). */
export const PREVIEW_COOKIE = "susanna-preview";

export type PreviewState = {
  /** 관리자로 로그인해 있는가 — 켜고 끄는 막대를 보여줄지의 기준 */
  isAdmin: boolean;
  /** 지금 새 디자인을 그릴 것인가. 이 값만 보고 갈라 그리세요 */
  on: boolean;
  /**
   * 켜 뒀는데 관리자 판정이 안 되는 상태 (= 로그인 만료).
   *
   * 🔴 **이걸 그냥 `on: false` 로 삼키면 안 됩니다.** 대표님 눈에는 "시안을 켰는데
   * 원래 화면이 나온다" 로만 보이고, 원인이 화면 어디에도 없습니다.
   * 쿠키는 httpOnly 라 관리자 인증을 통과한 서버 액션 말고는 심을 수가 없으므로,
   * 이 상태는 사실상 "만료된 관리자" 하나뿐입니다.
   */
  stale: boolean;
};

const OFF: PreviewState = { isAdmin: false, on: false, stale: false };

/**
 * React `cache` 로 렌더당 1회. 여러 페이지·부품이 불러도 인증 왕복은 한 번입니다.
 *
 * ⚠️ **익명 방문자에게는 비용이 0 이어야 합니다.** 로그인 쿠키(`sb-…`)가 아예 없으면
 * 여기서 바로 끝냅니다 — 이 빠른 길이 없으면 **방문 한 번마다 Supabase 인증 서버
 * 왕복이 한 번씩** 붙어서, 대표님 편의 하나 때문에 손님이 기다리게 됩니다.
 */
export const getPreview = cache(async (): Promise<PreviewState> => {
  const jar = await cookies();

  const wants = jar.get(PREVIEW_COOKIE)?.value === "1";
  const signedIn = jar.getAll().some((c) => c.name.startsWith("sb-"));
  if (!signedIn) return wants ? { ...OFF, stale: true } : OFF;

  const user = await getCurrentUser();
  if (user?.role !== "admin") return wants ? { ...OFF, stale: true } : OFF;

  return { isAdmin: true, on: wants, stale: false };
});
