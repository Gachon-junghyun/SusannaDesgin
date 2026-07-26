import "server-only";
import { site } from "@/config/site";

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
 * ⚠️ **SMTP 는 못 씁니다.** Cloudflare Workers 는 TCP 소켓을 못 열어서
 *    네이버웍스·Gmail 계정을 직접 붙이는 방식이 불가능합니다.
 *    HTTP API 방식(Resend)이라 이 제약을 피해 갑니다.
 *
 * ⚠️ **개인정보 위탁 주의**: 알림에는 고객 이름·연락처가 들어갑니다. 외부 서비스
 *    (슬랙·Resend 등)로 보내는 순간 **개인정보 처리 위탁**에 해당하므로,
 *    개인정보처리방침의 위탁 항목에 그 업체를 적어야 합니다(개인정보보호법 제26조).
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

/** 전화 앱이 바로 걸 수 있는 형태로 (하이픈·공백 제거) */
function telHref(phone: string): string {
  return `tel:${phone.replace(/[^0-9+]/g, "")}`;
}

function receivedAtKST(iso: string): string {
  return new Date(iso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
}

/** 사람이 읽는 한 덩어리 텍스트 — 웹훅과 메일 대체본문에서 씁니다. */
function asText(q: QuoteNotice): string {
  const line = (label: string, v?: string) => (v ? `${label}: ${v}\n` : "");

  return (
    `[${site.name}] 새 견적 문의 (${q.kind === "quick" ? "간편" : "전체"})\n\n` +
    line("이름", q.name) +
    line("연락처", q.phone) +
    line("이메일", q.email) +
    line("지역", q.region) +
    line("간판 종류", q.signType) +
    line("희망 시기", q.timing) +
    line("주소", q.address) +
    (q.fileCount ? `첨부: ${q.fileCount}개\n` : "") +
    (q.message ? `\n내용:\n${q.message}\n` : "") +
    `\n접수: ${receivedAtKST(q.receivedAt)}\n` +
    `확인: ${site.url}/admin/quotes`
  );
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * 메일 본문(HTML).
 *
 * 휴대폰에서 열어 **연락처를 바로 누르면 전화가 걸리게** 만드는 게 핵심입니다.
 * 견적 문의는 먼저 거는 쪽이 가져가므로, 받은 사람이 화면을 옮겨 다니지 않고
 * 그 자리에서 통화로 넘어갈 수 있어야 합니다.
 *
 * 메일 클라이언트는 외부 CSS·스크립트를 지우므로 인라인 스타일만 씁니다.
 */
export function asHtml(q: QuoteNotice): string {
  const row = (label: string, v?: string) =>
    v
      ? `<tr>
           <td style="padding:6px 12px 6px 0;color:#6b7280;font-size:13px;white-space:nowrap;vertical-align:top">${esc(label)}</td>
           <td style="padding:6px 0;color:#0F1A19;font-size:15px">${esc(v)}</td>
         </tr>`
      : "";

  // ⚠️ <meta charset> 를 빼면 메일 앱에 따라 한글이 전부 깨집니다(실제로 겪었습니다).
  //    메일은 브라우저와 달리 HTTP 헤더의 charset 이 본문까지 따라가지 않는 경우가 있어,
  //    본문 안에 직접 선언해 둡니다.
  return `<meta charset="utf-8">
<div style="font-family:-apple-system,BlinkMacSystemFont,'Malgun Gothic','Apple SD Gothic Neo',sans-serif;max-width:520px;margin:0 auto;padding:24px 20px;color:#0F1A19">
  <p style="margin:0 0 4px;color:#FF5900;font-size:12px;font-weight:700;letter-spacing:.08em">새 견적 문의</p>
  <h1 style="margin:0 0 20px;font-size:20px;font-weight:700">${esc(q.name)} 님 (${q.kind === "quick" ? "간편" : "전체"} 문의)</h1>

  <a href="${telHref(q.phone)}"
     style="display:block;background:#00A79D;color:#fff;text-decoration:none;text-align:center;padding:14px;border-radius:8px;font-size:17px;font-weight:700;margin-bottom:20px">
    ${esc(q.phone)} 로 전화하기
  </a>

  <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
    ${row("지역", q.region)}
    ${row("간판 종류", q.signType)}
    ${row("희망 시기", q.timing)}
    ${row("주소", q.address)}
    ${row("이메일", q.email)}
    ${q.fileCount ? row("첨부", `${q.fileCount}개 — 관리자 화면에서 확인`) : ""}
    ${row("접수", receivedAtKST(q.receivedAt))}
  </table>

  ${
    q.message
      ? `<div style="background:#F5F5F2;border-radius:8px;padding:14px;margin-bottom:20px">
           <p style="margin:0 0 6px;color:#6b7280;font-size:12px">문의 내용</p>
           <p style="margin:0;font-size:15px;line-height:1.6;white-space:pre-wrap">${esc(q.message)}</p>
         </div>`
      : ""
  }

  <a href="${site.url}/admin/quotes"
     style="display:block;text-align:center;padding:12px;border:1px solid #e5e7eb;border-radius:8px;color:#0F1A19;text-decoration:none;font-size:14px">
    관리자 화면에서 보기
  </a>

  <p style="margin:20px 0 0;color:#9ca3af;font-size:12px;line-height:1.6">
    ${esc(site.name)} 홈페이지 자동 발송 메일입니다. 이 메일에 답장하지 마시고 위 번호로 연락하세요.
  </p>
</div>`;
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
  if (!res.ok) throw new Error(`webhook ${res.status} ${await res.text()}`);
}

/**
 * 이메일 알림 (Resend).
 *
 * ⚠️ `QUOTE_MAIL_FROM` 은 **Resend 에서 소유확인을 마친 도메인**이어야 합니다.
 *    기본값 `onboarding@resend.dev` 는 시험용이고, 한메일·네이버메일은 이런
 *    남의 도메인 발신을 스팸으로 걸러내는 일이 잦습니다.
 *    실제 운영에서는 `susannadesign.co.kr` 을 Resend 에 등록하고
 *    `noreply@susannadesign.co.kr` 로 보내야 안정적으로 도착합니다.
 */
async function sendEmail(
  apiKey: string,
  from: string,
  to: string,
  subject: string,
  html: string,
  text: string
): Promise<void> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: to.split(",").map((s) => s.trim()).filter(Boolean),
      subject,
      html,
      text, // HTML 을 막아 둔 메일 앱을 위한 대체 본문
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`resend ${res.status} ${await res.text()}`);
}

/**
 * 설정된 경로로 알림을 보냅니다. 여러 개를 켜 두면 전부 보냅니다.
 * @returns 보낸 경로 이름들 (아무것도 설정 안 됐으면 빈 배열)
 */
export async function notifyNewQuote(q: QuoteNotice): Promise<string[]> {
  const webhook = process.env.QUOTE_WEBHOOK_URL?.trim();
  const resendKey = process.env.RESEND_API_KEY?.trim();
  // 받는 주소를 따로 안 정하면 회사 대표 메일로 보냅니다 [A5 — 값은 config 에서]
  const mailTo = process.env.QUOTE_NOTIFY_EMAIL?.trim() || site.email;
  const mailFrom = process.env.QUOTE_MAIL_FROM?.trim() || "onboarding@resend.dev";

  const text = asText(q);
  const jobs: Array<[string, Promise<void>]> = [];

  if (webhook) jobs.push(["웹훅", sendWebhook(webhook, text)]);
  if (resendKey && mailTo) {
    jobs.push([
      "이메일",
      sendEmail(
        resendKey,
        mailFrom,
        mailTo,
        `[견적문의] ${q.name} / ${q.phone}`,
        asHtml(q),
        text
      ),
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
