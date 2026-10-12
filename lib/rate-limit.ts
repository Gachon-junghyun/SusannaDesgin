/**
 * 아주 단순한 횟수 제한 — **인스턴스 메모리 기준**입니다.
 *
 * 견적 폼(`/api/quote`)과 AI 문의(`/agent/quote`)가 같이 씁니다. 원래 폼 라우트 안에 있던 것을
 * 두 번째 문이 생기면서 여기로 옮겼습니다 — 같은 규칙을 두 군데 적지 않으려고요.
 *
 * ⚠️ Cloudflare Workers 는 요청마다 다른 인스턴스로 갈 수 있어서 **완전한 제한이 아닙니다.**
 *    한 인스턴스 안에서 같은 IP 가 몰아치는 것만 막습니다(§7 부채). 진짜 상한이 필요해지면
 *    DB 함수나 Durable Object 로 옮겨야 합니다.
 */
const buckets = new Map<string, number[]>();

/** `key` 가 `windowMs` 안에 `max` 번을 넘었으면 true. 안 넘었으면 이번 한 번을 셉니다. */
export function rateLimited(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const list = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (list.length >= max) {
    buckets.set(key, list);
    return true;
  }
  list.push(now);
  buckets.set(key, list);
  return false;
}

/** 요청을 보낸 쪽 IP — Cloudflare 가 붙여 주는 머리말 순서대로 봅니다. */
export function clientIp(req: Request): string {
  return (
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}
