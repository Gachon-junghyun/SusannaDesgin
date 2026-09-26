import "server-only";

import { AI_DRAFT_NOTE } from "@/config/logo";

/**
 * 이미지 생성 API 가 붙을 «한 자리» (F26-k · 2026-09-27) — 🔴 **지금은 아무 API 도 안 부릅니다.**
 *
 * 사람 결정(2026-09-27): *"이미지 API 는 아직 안 붙인다 … 유료 API 를 붙이는 건 대표님 결정(누구 카드로, 월 상한 얼마)."*
 * 그래서 로고 만들기 «AI 초안» 칸과 그림판 «AI 로 다듬기»는 **자리만 있고 눌리지 않습니다.** 그동안은 클로드 코드가
 * 형제 리포 `/gemini-image`(크롬으로 제미나이를 조종 — API 가 아님)로 초안을 뽑아 «프로젝트 에셋»으로 올립니다(F26-j).
 *
 * 붙일 때 할 일 (이 파일 하나 + 환경변수 하나):
 *   1. 대표님이 정한 공급자·키를 **Cloudflare 환경변수(Secret)** 로 넣습니다 — 🔴 코드·config 에 키를 박지 마세요.
 *      `Plaintext` 는 배포 때 지워집니다(ARCHITECTURE §6).
 *   2. 아래 `generate` 를 채웁니다 — 결과는 **PNG 를 돌려주지 말고 프로젝트 에셋으로 올린 뒤 에셋 번호**를 돌려주세요
 *      (그래야 에디터·굽기·지우기가 지금 흐름 그대로입니다).
 *   3. `IMAGE_API_READY` 를 환경변수 존재로 바꾸고, 부르는 쪽 액션에 `requireAdmin()` 을 둡니다 [A2].
 *   4. 🔴 **월 상한**을 여기서 셉니다(대표님이 정한 금액). 넘으면 멈추고 사람 말로 알립니다.
 *
 * 참고 값(사람이 준 2026-09 공식가, «원문 확인 안 함»): Gemini 3.1 Flash Image 1K $0.067(배치 $0.034) · Flash Lite $0.0336 ·
 * 3 Pro Image 1~2K $0.134 · OpenAI GPT Image 2 1024² 저 $0.006 / 중 $0.053 / 고 $0.211. 로고 한 건 20~40장이면 Flash 로 $1.3~2.7.
 * 🔴 **글자(상호)를 그리게 하지 마세요** — 로고.md «글자는 AI 로 안 그린다». 심벌·레터링 변형만 맡깁니다.
 */

export const IMAGE_API_READY = false;

export type DraftRequest = {
  /** 프로젝트 에셋의 프로젝트 이름 — 결과가 여기로 올라갑니다 */
  project: string;
  /** 무엇을 그리나 (모티프·캐릭터 특징 3개·손그림 다듬기 느낌) */
  brief: string;
  /** 손그림을 참고로 줄 때 — 그 스케치의 에셋 번호 */
  refAsset?: string;
  /** 몇 장 */
  count: number;
};

export type DraftResult = { ok: true; assets: string[] } | { ok: false; error: string };

/** 🔴 아직 비어 있습니다 — 위 «붙일 때 할 일» 을 먼저 읽으세요 */
export async function generate(req: DraftRequest): Promise<DraftResult> {
  void req;
  return { ok: false, error: AI_DRAFT_NOTE };
}
