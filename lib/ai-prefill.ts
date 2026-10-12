/**
 * «미리 채운 문의 링크» (F33-b, 2026-10-12) — 서버·브라우저 공용.
 *
 * 일반 채팅 ChatGPT 는 우리 서버로 «보내기»를 못 합니다(2026-10-12 실측 — POST·폼 제출 기능이 없다고 스스로 답함).
 * 대신 **링크는 만들 수 있습니다.** 그래서 AI 가 손님 대화로 문의서를 채운 링크를 만들어 건네고,
 * 손님은 그 링크를 눌러 **개인정보 동의를 직접 체크하고 버튼 한 번**으로 보냅니다.
 *
 *   https://susannadesign.co.kr/quote#ai=1&name=…&phone=…&region=…&message=…&agent=ChatGPT
 *
 * 🔴 **값은 `?` 가 아니라 `#` 뒤에 둡니다.** `#` 뒤는 서버로 안 가서 서버·Cloudflare 로그에 이름·번호가 안 남고,
 *    `/quote` 맨 위 인라인 스크립트(`AI_PREFILL_SNIPPET`)가 **GA·Clarity 가 뜨기 전에** 값을 저장소로 옮기고
 *    주소창에서 지웁니다(GA 는 `afterInteractive`, Clarity 는 `lazyOnload` — 둘 다 이보다 늦습니다).
 * 🔴 **동의는 미리 체크하지 않습니다.** 마지막 확인과 동의는 손님 손으로 — AI 가 대신 동의하지 않게.
 */

export const AI_PREFILL_KEY = "sd_ai_prefill";

/** 받는 칸과 칸마다 길이 상한 */
export const AI_PREFILL_FIELDS = {
  name: 60,
  phone: 20,
  region: 80,
  message: 1500,
  agent: 40,
} as const;

export type AiPrefill = Partial<Record<keyof typeof AI_PREFILL_FIELDS, string>>;

/**
 * `/quote` 맨 위에 그대로 박는 인라인 스크립트. HTML 을 읽는 도중에 돌아서 GA·Clarity 보다 먼저입니다.
 * `ai=1` 이 없는 `#`(예: 페이지 안 이동)는 건드리지 않습니다.
 */
export const AI_PREFILL_SNIPPET = `(function(){try{var h=location.hash;if(!h||!/(^#|&)ai=1(&|$)/.test(h))return;var p=new URLSearchParams(h.slice(1)),L=${JSON.stringify(
  AI_PREFILL_FIELDS
)},o={};for(var k in L){var v=p.get(k);if(v)o[k]=v.replace(/[\\u0000-\\u0009\\u000b-\\u001f\\u007f]/g," ").slice(0,L[k])}window.__sdAiPrefill=o;try{sessionStorage.setItem(${JSON.stringify(
  AI_PREFILL_KEY
)},JSON.stringify(o))}catch(e){}history.replaceState(history.state,"",location.pathname+location.search)}catch(e){}})();`;

/** 브라우저에서 — 스크립트가 옮겨 둔 값을 읽습니다(새로고침해도 남도록 sessionStorage 도 봅니다) */
export function readAiPrefill(): AiPrefill | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { __sdAiPrefill?: AiPrefill };
  if (w.__sdAiPrefill && Object.keys(w.__sdAiPrefill).length) return w.__sdAiPrefill;
  try {
    const raw = sessionStorage.getItem(AI_PREFILL_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (parsed && typeof parsed === "object") return parsed as AiPrefill;
  } catch {
    /* 저장소가 막힌 브라우저 — 손님이 직접 쓰면 됩니다 */
  }
  return null;
}

/** 접수가 끝나면 지웁니다 — 같은 손님 정보가 다음 방문에 다시 채워지지 않게 */
export function clearAiPrefill() {
  if (typeof window === "undefined") return;
  delete (window as unknown as { __sdAiPrefill?: AiPrefill }).__sdAiPrefill;
  try {
    sessionStorage.removeItem(AI_PREFILL_KEY);
  } catch {
    /* 무시 */
  }
}

/** `llms.txt`·`/agent/quote` 안내에 싣는 예시 링크 */
export function aiPrefillExample(siteUrl: string): string {
  const q = new URLSearchParams({
    ai: "1",
    name: "홍길동",
    phone: "010-0000-0000",
    region: "대전 서구",
    message: "1층 카페 정면 간판, 가로 약 5m",
    agent: "ChatGPT",
  });
  return `${siteUrl}/quote#${q.toString()}`;
}
