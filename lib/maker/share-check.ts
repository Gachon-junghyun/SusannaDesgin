import { MAKER_SHARE_MAX_BYTES } from "@/config/maker";

/**
 * 공유 링크(방)에 넣을 디자인 JSON 검사 — **한 곳**입니다 (F26-b · 2026-09-26 에 뽑아냄).
 *
 * 부르는 곳이 둘입니다: 관리자 «공유 링크 만들기»(`app/admin/maker/actions.ts`)와 손님 견적 제출
 * (`app/api/quote/route.ts` — 견적을 보내면 방이 저절로 생김). 두 곳에 따로 적으면 한쪽만 느슨해집니다.
 * DB 함수(`0017_quote_maker_share.sql` 의 `attach_quote_design`)도 같은 문턱을 한 번 더 봅니다 [A2].
 *
 * 🔴 **가게 사진은 못 들어옵니다** — 사진 벽·`data:`·`blob:` 주소가 섞이면 거부합니다(P7, 개인정보 처리방침).
 * 돌려주는 값: 문제가 없으면 `{ json }`(저장할 문자열), 있으면 `{ error }`(사람이 읽는 까닭 한 줄).
 */
export function checkShareDesign(design: unknown): { error: string } | { json: string } {
  const d = design as { items?: unknown; wall?: unknown; kind?: unknown } | null;
  if (!d || typeof d !== "object" || !Array.isArray(d.items) || typeof d.kind !== "string") return { error: "디자인 모양이 올바르지 않습니다." };
  if (!d.items.length) return { error: "벽에 올린 글자·로고가 없습니다." };
  if (d.items.length > 100) return { error: "아이템이 너무 많습니다(100개까지)." };
  if (d.wall === "photo") return { error: "가게 사진 벽은 공유하지 않습니다 — 흰 벽으로 바꿔 보내야 합니다." };

  const json = JSON.stringify(design);
  if (/"(data|blob):/i.test(json)) return { error: "그림 파일(사진)이 섞여 있어 공유하지 않습니다." };
  const bytes = new TextEncoder().encode(json).length;
  if (bytes > MAKER_SHARE_MAX_BYTES)
    return { error: `디자인이 너무 큽니다(${Math.round(bytes / 1000)}KB) — 로고를 «SVG 따기»에서 매끄럽게 다듬어 점을 줄여 주세요.` };
  return { json };
}

/** 방 이름 — 제어문자는 공백으로, 60자까지. 관리자 목록과 받는 화면 제목에 그대로 나갑니다 */
export const cleanShareTitle = (t: string) => t.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, 60);
