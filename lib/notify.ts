import "server-only";

/**
 * 견적 문의 실시간 알림.
 *
 * **왜 필요한가**: 문의는 DB 에 잘 쌓이지만, 아무도 알려주지 않으면 `/admin/quotes`
 * 를 사람이 들여다볼 때까지 방치됩니다. 간판 견적은 먼저 연락한 곳이 가져갑니다.
 *
 * **설계 원칙 — 알림이 접수를 망치지 않는다**
 * 이 함수는 **절대 예외를 던지지 않습니다.** 문의는 이미 DB 에 저장된 뒤에
 * 호출되므로, 알림이 실패해도 고객에게는 정상 접수로 응답해야 합니다.
 * 알림 실패 때문에 일감을 놓치는 건 앞뒤가 바뀐 겁니다.
 *
 * **꺼져 있는 게 기본값**: 환경변수를 안 넣으면 조용히 아무것도 안 합니다.
 * 폼과 저장은 지금까지처럼 그대로 동작합니다. [원칙 A1 의 연장]
 *
 * ⚠️ **개인정보 위탁 주의**: 알림에는 고객 이름·연락처가 들어갑니다. 외부 서비스
 *    (슬랙·Resend 등)로 보내는 순간 **개인정보 처리 위탁**에 해당하므로,
 *    개인정보처리방침의 위탁 항목에 그 업체를 적어야 합니다(개인정보보호법 제26조).
 *    자세한 건 `docs/ARCHITECTURE.md` §7 참조.
 */

/** 알림 한 건이 이만큼 넘게 걸리면 포기합니다 (고객 응답을 붙잡아 두지 않으려고) */
const TIMEOUT_MS = 5000;

export type QuoteNotice = {
  kind: string;
  name: string;
  phone: string;
  email?: string;
  region?: string;
  signType?: string;
  timing?: string;
  address?: string;
  message?: string;
  fileCount: number;
  receivedAt: string;
};

/** 사람이 읽는 한 덩어리 텍스트 — 웹훅·이메일 양쪽에서 씁니다. */
function asText(q: QuoteNotice, siteUrl: string): string {
  const line = (label: string, v?: string) => (v ? `${label}: ${v}\n` : "");

  return (
    `[수산나디자인] 새 견적 문의 (${q.kind === "quick" ? "간편" : "전체"})\n\n` +
    line("이름", q.name) +
    line("연락처", q.phone) +
    line("이메일", q.email) +
    line("지역", q.region) +
    line("간판 종류", q.signType) +
    line("희망 시기", q.timing) +
    line("주소", q.address) +
    (q.fileCount ? `첨부: ${q.fileCount}개\n` : "") +
    (q.message ? `\n내용:\n${q.message}\n` : "") +
    `\n접수: ${new Date(q.receivedAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}\n` +
    `확인: ${siteUrl}/admin/quotes`
  );
}

/**
 * 웹훅 알림 — 슬랙·카카오워크·디스코드가 모두 `{ text }` 를 받습니다.
 * 주소만 넣으면 되고 별도 SDK 가 필요 없어 가장 붙이기 쉽습니다.
 */
async function sendWebhook(url: string, text: string): Promise<void> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, content: text }), // content: 디스코드용
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`webhook ${res.status}`);
}

/**
 * 이메일 알림 (Resend).
 *
 * `QUOTE_MAIL_FROM` 은 **Resend 에서 소유확인을 마친 도메인**이어야 합니다.
 * 확인 전이라면 `onboarding@resend.dev` 로 두고 시험할 수 있습니다.
 */
async function sendEmail(
  apiKey: string,
  from: string,
  to: string,
  subject: string,
  text: string
): Promise<void> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: to.split(",").map((s) => s.trim()), subject, text }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`resend ${res.status} ${await res.text()}`);
}

/**
 * 설정된 경로로 알림을 보냅니다. 여러 개를 켜 두면 전부 보냅니다.
 * @returns 보낸 경로 이름들 (아무것도 설정 안 됐으면 빈 배열)
 */
export async function notifyNewQuote(
  q: QuoteNotice,
  siteUrl: string
): Promise<string[]> {
  const webhook = process.env.QUOTE_WEBHOOK_URL?.trim();
  const resendKey = process.env.RESEND_API_KEY?.trim();
  const mailTo = process.env.QUOTE_NOTIFY_EMAIL?.trim();
  const mailFrom = process.env.QUOTE_MAIL_FROM?.trim() || "onboarding@resend.dev";

  const text = asText(q, siteUrl);
  const jobs: Array<[string, Promise<void>]> = [];

  if (webhook) jobs.push(["웹훅", sendWebhook(webhook, text)]);
  if (resendKey && mailTo) {
    jobs.push([
      "이메일",
      sendEmail(resendKey, mailFrom, mailTo, `[견적문의] ${q.name} / ${q.phone}`, text),
    ]);
  }

  if (!jobs.length) return [];

  // 하나가 실패해도 나머지는 보냅니다. 그리고 어느 쪽도 예외를 밖으로 던지지 않습니다.
  const results = await Promise.allSettled(jobs.map(([, p]) => p));
  const sent: string[] = [];

  results.forEach((r, i) => {
    const name = jobs[i][0];
    if (r.status === "fulfilled") sent.push(name);
    else console.error(`[견적문의] ${name} 알림 실패:`, r.reason);
  });

  return sent;
}
