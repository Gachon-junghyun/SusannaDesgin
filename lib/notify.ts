import "server-only";
import { site } from "@/config/site";
import type { QuoteUpload } from "@/lib/quote-files";

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

/**
 * 메일 한 통에 붙일 수 있는 첨부 총량.
 *
 * Resend 한도는 40MB 지만, 폼 한도는 10MB×5장 = 50MB 라 그대로 두면 넘길 수 있습니다.
 * 게다가 base64 로 부풀어 실제 요청은 1.37배가 됩니다. 넉넉히 낮게 잡고, 넘으면
 * 붙이지 않고 관리자 화면으로 안내합니다 — 메일이 통째로 실패하는 것보다 낫습니다.
 */
export const MAX_MAIL_ATTACH_BYTES = 12 * 1024 * 1024;

export type QuoteNotice = {
  kind: string;
  name: string;
  phone: string;
  email?: string;
  region?: string;
  signType?: string;
  /**
   * 손님이 `/products` 에서 **누르고 온 카드** (`0010_quote_product.sql`).
   * 🔴 `signType`(폼에서 고른 문의 분야)과 축이 다릅니다 — 둘 다 보여 줍니다.
   */
  product?: string;
  timing?: string;
  address?: string;
  message?: string;
  /**
   * 첨부 목록.
   *   `stored`   스토리지에 들어감 → 관리자 화면에서 받을 수 있다
   *   `attached` **이 메일에 직접 붙어 있다** (용량이 크면 false)
   *
   * ⚠️ 파일마다 따로 씁니다. 예전에는 메일 전체에 플래그 하나였는데, 큰 원본과 작은
   *    사양서가 같이 오면 **한 장만 붙었는데 본문은 "첨부되어 있습니다" 라고 적혀**
   *    받는 사람이 나머지를 찾아 헤매게 됐습니다.
   */
  files: { name: string; stored: boolean; attached: boolean }[];
  /**
   * 메이커 디자인 «방» 주소 (`0017_quote_maker_share.sql`, 2026-09-26). 메일에서 바로 열어
   * 주간·야간·확대로 봅니다. 방을 못 만든 견적(0017 미실행·거절)은 비어 있고, 그래도 JPG·SVG 첨부는 갑니다.
   */
  designUrl?: string;
  receivedAt: string;
};

/** Resend 첨부 서식 — 내용은 base64 문자열입니다. */
export type MailAttachment = { filename: string; content: string };

/**
 * 바이트 → base64.
 *
 * `Buffer` 를 쓰지 않습니다. 운영은 Cloudflare workerd 라 Node 전용 전역이
 * 있으리라 가정하지 않는 편이 안전하고, 이 함수는 표준 API 만 씁니다.
 * `String.fromCharCode(...arr)` 를 한 번에 부르면 큰 파일에서 스택이 터지므로
 * 조각을 나눠 붙입니다.
 */
function toBase64(bytes: Uint8Array): string {
  const CHUNK = 0x8000; // 32KB — 인자 개수 상한에 안 걸리는 크기
  let binary = "";
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

/**
 * 업로드된 파일을 메일 첨부로 바꿉니다.
 *
 * **왜 메일에 직접 붙이나**: 간판 견적에서 사진 한 장이 곧 사양서입니다. 링크를
 * 눌러 로그인하고 관리자 화면까지 들어가야 볼 수 있으면, 현장에서 휴대폰으로
 * 메일만 확인하는 상황에서 사실상 못 보는 것과 같습니다.
 *
 * **전부 아니면 전무**: 총량을 넘으면 일부만 붙이지 않고 하나도 안 붙입니다.
 * 다섯 장 중 세 장만 온 메일은 "왜 두 장이 없지" 로 헷갈리고, 그 헷갈림이
 * 고객에게 다시 묻는 전화로 이어집니다.
 *
 * ⚠️ **이미 읽어 둔 바이트를 받습니다** (`File` 이 아닙니다). 이유는
 *    `lib/quote-files.ts` 의 `QuoteUpload` 주석에 있습니다 — 운영 장애의 원인이었습니다.
 */
export function toMailAttachments(uploads: QuoteUpload[]): MailAttachment[] {
  const total = uploads.reduce((n, f) => n + f.bytes.length, 0);
  if (total > MAX_MAIL_ATTACH_BYTES) {
    console.warn(
      `[견적문의] 첨부 ${Math.round(total / 1024 / 1024)}MB 는 메일에 붙이기엔 큽니다. ` +
        `관리자 화면에서 내려받도록 안내만 넣습니다.`
    );
    return [];
  }

  const out: MailAttachment[] = [];
  for (const f of uploads) {
    // 빈 첨부는 Resend 가 요청째로 거부하고, 거부된 요청은 발송 로그에도 안 남습니다.
    // 그러면 "저장은 됐는데 알림만 사라진" 상태가 되므로 여기서 먼저 걸러 냅니다.
    if (!f.bytes.length) {
      console.error(`[견적문의] 첨부 내용이 비어 있어 메일에 붙이지 않습니다 (${f.name}).`);
      return [];
    }
    try {
      out.push({ filename: f.name, content: toBase64(f.bytes) });
    } catch (e) {
      console.error(`[견적문의] 첨부를 메일용으로 변환하지 못했습니다 (${f.name}):`, e);
      return []; // 위와 같은 이유 — 반쪽짜리 메일을 만들지 않습니다
    }
  }
  return out;
}

/** 전화 앱이 바로 걸 수 있는 형태로 (하이픈·공백 제거) */
function telHref(phone: string): string {
  return `tel:${phone.replace(/[^0-9+]/g, "")}`;
}

function receivedAtKST(iso: string): string {
  return new Date(iso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
}

/**
 * 파일 **한 개**가 지금 어디에 있는지.
 *
 * 예전에는 메일 전체에 문구 하나를 붙였는데, 그때는 파일을 아예 저장하지 않던 시절
 * (무조건 "관리자 화면에서 확인" — 가도 이름밖에 없었습니다)과 큰 파일이 섞였을 때
 * (한 장만 붙었는데 "첨부되어 있습니다") 모두 받는 사람을 헛걸음시켰습니다.
 * 이제 파일마다 정확히 적습니다.
 */
function fileHint(f: QuoteNotice["files"][number]): string {
  if (f.attached) return "이 메일에 첨부";
  if (f.stored) return "용량이 커서 관리자 화면에서 내려받기";
  return "파일을 받지 못했습니다. 고객께 다시 요청하세요";
}

/** 사람이 읽는 한 덩어리 텍스트 — 웹훅과 메일 대체본문에서 씁니다. */
function asText(q: QuoteNotice): string {
  const line = (label: string, v?: string) => (v ? `${label}: ${v}\n` : "");

  return (
    `[${site.name}] 새 견적 문의 (${q.kind === "quick" ? "간편" : "전체"})\n\n` +
    line("이름", q.name) +
    line("연락처", q.phone) +
    line("이메일", q.email) +
    line("보고 온 제품", q.product) +
    line("메이커 디자인", q.designUrl) +
    line("지역", q.region) +
    line("문의 분야", q.signType) +
    line("희망 시기", q.timing) +
    line("주소", q.address) +
    (q.files.length
      ? `첨부: ${q.files.length}개\n` +
        q.files.map((f) => `  · ${f.name}  (${fileHint(f)})\n`).join("")
      : "") +
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
 * 2026-10-11 — 모양을 형제 사이트 gicfolio 의 «수료증 발급 안내» 메일(`scripts/gm_cert.py` 의 `mail_html`)
 * 틀에서 가져와 수산나 청록으로 바꿨습니다: 위 회색 안내 줄 → 짙은 색 머리(로고·이름·제목) → 청록 띠 →
 * 인사 문장 → 왼쪽 회색 이름표 표 → 안내 문장 → 바닥 글. 담는 정보는 예전과 같고, 메이커 디자인 링크만 뺐습니다
 * (사람 결정 «수산나 메이커는 없애줘» — 링크는 관리자 화면 견적함에 그대로 있습니다). 접수 시각과 첨부는 표 맨 아래입니다.
 *
 * 메일 클라이언트는 외부 CSS·스크립트를 지우므로 인라인 스타일만 씁니다.
 * 🔴 **Gmail 은 style 의 `background` 줄임말을 지웁니다** — 칠할 칸은 `bgcolor` 속성 + `background-color`
 *    둘 다, 버튼은 `<a>` 자신에게도 `background-color` 를 줍니다(gicfolio 에서 칸과 버튼이 하얗게 빠진 적 있음).
 * 🔴 로고는 SVG 를 못 씁니다(Gmail 이 지움) — 이미 운영에 있는 `apple-icon.png` 를 절대 주소로 부릅니다.
 */
export function asHtml(q: QuoteNotice): string {
  const C = {
    head: "#00726C", // 머리 바탕 (brand-700)
    strip: "#00A79D", // 머리 아래 띠 · 전화 버튼 (brand)
    sky: "#9FE3DC", // 짙은 바탕 위 작은 글씨
    ink: "#0F1A19",
    sub: "#5A6B69",
    line: "#E3E6E4",
    label: "#F5F5F2",
    muted: "#8A9896",
    warn: "#D9480F",
  };
  const SANS = "-apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo','Malgun Gothic','Segoe UI',sans-serif";

  const at = new Date(q.receivedAt);
  const part = (o: Intl.DateTimeFormatOptions) => at.toLocaleString("ko-KR", { timeZone: "Asia/Seoul", ...o });
  // 실행 환경마다 hour12 표기가 «AM»·«오전»으로 갈려서(로컬 node 에서 AM 이 나왔습니다) 직접 씁니다
  const hh = Number(part({ hour: "numeric", hour12: false }).replace(/\D/g, "")) % 24;
  const mm = part({ minute: "2-digit" }).replace(/\D/g, "").padStart(2, "0");
  const when =
    `${part({ year: "numeric" }).replace(/\D/g, "")}년 ${part({ month: "numeric" }).replace(/\D/g, "")}월 ` +
    `${part({ day: "numeric" }).replace(/\D/g, "")}일 (${part({ weekday: "short" })}) ${hh < 12 ? "오전" : "오후"} ${hh % 12 || 12}:${mm}`;
  const kind = q.kind === "quick" ? "간편 문의" : "전체 문의";

  const tr = (label: string, html: string) =>
    `<tr><td width="112" bgcolor="${C.label}" style="background-color:${C.label};padding:15px 16px;border-top:1px solid ${C.line};font-size:13.5px;font-weight:700;color:${C.sub};vertical-align:top;">${esc(label)}</td>` +
    `<td style="padding:15px 18px;border-top:1px solid ${C.line};font-size:14.5px;line-height:1.65;font-weight:500;color:${C.ink};">${html}</td></tr>`;
  const row = (label: string, v?: string) => (v ? tr(label, esc(v)) : "");

  /** 첨부는 파일명과 **그 파일이 지금 어디 있는지**를 한 줄씩 적습니다 */
  const files = q.files.length
    ? tr(
        `첨부 ${q.files.length}개`,
        q.files
          .map(
            (f) =>
              `<b style="font-weight:700;">${esc(f.name)}</b><br>` +
              `<span style="font-size:12.5px;color:${f.attached || f.stored ? C.muted : C.warn};">${esc(fileHint(f))}</span>`
          )
          .join('<div style="height:8px;line-height:8px;font-size:0;">&nbsp;</div>')
      )
    : "";

  const rows = [
    tr("성함", `<b style="font-weight:800;">${esc(q.name)}</b>`),
    tr("연락처", `<a href="${telHref(q.phone)}" style="color:${C.head};font-weight:800;text-decoration:none;">${esc(q.phone)}</a>`),
    row("보고 온 제품", q.product),
    row("지역", q.region),
    row("문의 분야", q.signType),
    row("희망 시기", q.timing),
    row("주소", q.address),
    q.email ? tr("이메일", `<a href="mailto:${esc(q.email)}" style="color:${C.ink};text-decoration:none;">${esc(q.email)}</a>`) : "",
    q.message ? tr("문의 내용", `<span style="white-space:pre-wrap;">${esc(q.message)}</span>`) : "",
    // 접수 시각은 맨 아래 (2026-10-11 사람 결정)
    tr("접수", `${esc(when)}<br><span style="font-size:12.5px;color:${C.muted};">${kind}</span>`),
    // 첨부는 그 아래 맨 끝 (2026-10-11 사람 결정)
    files,
  ].join("");

  const greet = [
    `${q.name} 님의 견적 문의가 접수되었습니다.`,
    "홈페이지 견적 폼으로 들어온 문의입니다.",
    "아래 연락처로 먼저 연락하여 주시기 바랍니다.",
  ];
  const lines = [`<b style="color:${C.ink};">${esc(greet[0])}</b>`, ...greet.slice(1).map(esc)].join("<br>");

  // ⚠️ <meta charset> 를 빼면 메일 앱에 따라 한글이 전부 깨집니다(실제로 겪었습니다).
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>[${esc(site.name)}] 새 견적 문의</title></head>
<body style="margin:0;padding:0;background-color:#ffffff;" bgcolor="#ffffff">
<div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:#ffffff;">${esc(`${q.name} 님 ${q.phone} ${q.region ?? ""} ${q.signType ?? ""}`)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="padding:20px 10px 30px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:620px;font-family:${SANS};word-break:keep-all;">
<tr><td bgcolor="#f2f4f3" style="background-color:#f2f4f3;padding:12px 18px;font-size:12px;line-height:1.6;font-weight:500;color:${C.sub};">${esc(site.name)} 홈페이지 견적 폼에서 자동으로 보낸 알림입니다.</td></tr>
<tr><td bgcolor="${C.head}" style="background-color:${C.head};padding:30px 28px 46px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
    <td style="vertical-align:middle;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
      <td bgcolor="#ffffff" style="background-color:#ffffff;border-radius:7px;padding:3px;"><img src="${site.url}/apple-icon.png" width="28" height="28" alt="${esc(site.name)}" style="display:block;border:0;width:28px;height:28px;border-radius:5px;"></td>
      <td style="vertical-align:middle;padding-left:10px;font-size:14px;font-weight:800;color:#ffffff;">(주)${esc(site.name)}</td>
    </tr></table></td>
    <td align="right" style="vertical-align:middle;font-size:12.5px;color:${C.sky};">홈페이지</td>
  </tr></table>
  <div style="margin-top:44px;font-size:12px;font-weight:800;letter-spacing:2.5px;color:${C.sky};">QUOTE REQUEST</div>
  <div style="margin-top:8px;font-size:28px;line-height:1.35;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">[${esc(site.name)}] 새 견적 문의</div>
</td></tr>
<tr><td height="4" bgcolor="${C.strip}" style="height:4px;background-color:${C.strip};font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td style="padding:36px 4px 0;"><p style="margin:0;font-size:15px;line-height:2;font-weight:500;color:${C.sub};">${lines}</p></td></tr>
<tr><td style="padding:24px 4px 0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" bgcolor="${C.strip}" style="background-color:${C.strip};border-radius:6px;">
    <a href="${telHref(q.phone)}" style="display:block;background-color:${C.strip};border-radius:6px;padding:15px 12px;font-size:16px;font-weight:800;color:#ffffff;text-decoration:none;">${esc(q.phone)} 로 전화하기</a>
  </td></tr></table>
</td></tr>
<tr><td style="padding:30px 4px 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-bottom:1px solid ${C.line};border-collapse:collapse;">${rows}</table></td></tr>
<tr><td style="padding:28px 4px 0;font-size:13.5px;line-height:1.7;font-weight:500;color:${C.sub};">${
    q.files.length ? "첨부 파일은 이 메일 아래쪽에 있습니다. 용량이 큰 파일은 관리자 화면에서 내려받아 주시기 바랍니다.<br>" : ""
  }문의 기록 전체와 처리 상태는 <a href="${site.url}/admin/quotes" style="color:${C.head};font-weight:700;">관리자 화면</a>에서 확인할 수 있습니다.</td></tr>
<tr><td style="padding:46px 4px 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td height="1" bgcolor="${C.line}" style="height:1px;background-color:${C.line};font-size:0;line-height:0;">&nbsp;</td></tr></table></td></tr>
<tr><td style="padding:16px 4px 0;font-size:12px;line-height:1.7;color:${C.muted};">(주)${esc(site.name)} (Susanna Design) 홈페이지 <a href="${site.url}" style="color:${C.muted};">susannadesign.co.kr</a><br>본 메일은 발신 전용 주소에서 발송되었습니다. 이 메일에 답장하지 마시고 위 번호로 연락하여 주시기 바랍니다.</td></tr>
</table></td></tr></table></body></html>`;
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
 * Resend 가 도메인 인증 전에 내주는 시험용 발신 주소.
 *
 * 이 주소로는 **Resend 에 가입한 본인 메일로만** 나갑니다. 그래서 평상시 답이 아니라
 * "인증이 끝날 때까지 문의를 놓치지 않기 위한" 임시 통로입니다.
 */
const TEST_SENDER = "onboarding@resend.dev";

/** 발신 도메인이 인증 안 돼서 거부당한 것인가 */
function isUnverifiedSender(status: number, body: string): boolean {
  return status === 403 && /not verified|domain/i.test(body);
}

/**
 * 이메일 알림 (Resend).
 *
 * ⚠️ `QUOTE_MAIL_FROM` 은 **Resend 에서 소유확인을 마친 도메인**이어야 합니다.
 *    안 그러면 API 가 403 으로 거부합니다 — 메일이 스팸함에 가는 게 아니라
 *    **아예 발송되지 않습니다.** 2026-08-06 운영 키로 실측했습니다:
 *
 *      POST /emails  from: noreply@susannadesign.co.kr
 *      → 403 "The susannadesign.co.kr domain is not verified"
 *
 *    그동안 견적 문의 알림이 한 통도 안 온 원인이 이것이었습니다. 저장은 정상이라
 *    `/admin/quotes` 에는 다 쌓여 있었고, 알림만 조용히 죽어 있었습니다.
 *
 * **그래서 여기서 한 번 되살립니다.** 발신 도메인이 거부되면 시험용 주소로 다시
 * 보냅니다. 근본 해결(도메인 인증)은 사람이 DNS 를 넣어야 하는 일이고, 그 사이에
 * 들어온 문의를 놓치는 게 더 큰 손해라 이렇게 둡니다. 우회가 작동하면 로그에
 * 남기니, 로그가 보이면 인증이 아직 안 끝난 것입니다.
 *
 * ⚠️ 시험용 주소는 **가입 계정 본인 메일 한 곳으로만** 갑니다. 여러 곳으로 받으려면
 *    도메인 인증 외에 길이 없습니다.
 *
 *    다만 **우회 경로에서는 받는 사람마다 따로 보냅니다.** 예전에는 한 요청에 주소를
 *    모아 보냈는데, 그러면 받을 수 없는 주소가 하나만 섞여도 Resend 가 요청 전체를
 *    거부해서 **잘 가던 주소까지 같이 죽었습니다.** 주소를 추가하는 행위가 기존
 *    알림을 끄는 것과 같아지는 셈이라, 한 명이라도 받게 갈라 둡니다.
 */
async function sendEmail(
  apiKey: string,
  from: string,
  to: string,
  subject: string,
  html: string,
  text: string,
  attachments: MailAttachment[] = []
): Promise<void> {
  const recipients = to.split(",").map((s) => s.trim()).filter(Boolean);

  /**
   * 첨부가 붙으면 요청이 커집니다. 5초 고정이면 사진 몇 장에 매번 타임아웃이
   * 나서 알림이 죽습니다. 용량에 비례해 늘리되 상한을 둡니다 — 고객 화면은
   * 이 응답을 기다리고 있으므로 무한정 잡아 둘 수 없습니다.
   */
  const payloadBytes = attachments.reduce((n, a) => n + a.content.length, 0);
  const timeout = Math.min(30_000, TIMEOUT_MS + Math.ceil(payloadBytes / 1_000_000) * 2_000);

  const post = (sender: string, to: string[]) =>
    fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: sender,
        to,
        subject,
        html,
        text, // HTML 을 막아 둔 메일 앱을 위한 대체 본문
        ...(attachments.length ? { attachments } : {}),
      }),
      signal: AbortSignal.timeout(timeout),
    });

  const res = await post(from, recipients);
  if (res.ok) return;

  const body = await res.text();

  if (from !== TEST_SENDER && isUnverifiedSender(res.status, body)) {
    console.error(
      `[견적문의] 보내는 주소 ${from} 의 도메인이 Resend 에 인증되지 않았습니다. ` +
        `resend.com/domains 에서 등록하세요. 이번 건은 ${TEST_SENDER} 로 대신 보냅니다.`
    );

    // 한 명씩 따로 — 못 받는 주소가 섞여도 받을 수 있는 사람은 받게 합니다
    const results = await Promise.allSettled(
      recipients.map(async (addr) => {
        const retry = await post(TEST_SENDER, [addr]);
        if (!retry.ok) throw new Error(`${addr}: ${retry.status} ${await retry.text()}`);
        return addr;
      })
    );

    const failed = results.filter((r) => r.status === "rejected");
    if (failed.length < recipients.length) {
      // 한 명이라도 받았으면 성공입니다. 다만 못 받은 주소는 반드시 남깁니다 —
      // 조용히 넘어가면 "저 사람한테도 가고 있겠지" 라고 믿게 됩니다.
      for (const f of failed) {
        console.error(
          `[견적문의] 이 주소로는 아직 못 보냅니다 — ${(f as PromiseRejectedResult).reason}\n` +
            `           ${TEST_SENDER} 우회 경로는 Resend 가입 계정 본인 메일만 받습니다. ` +
            `resend.com/domains 에서 도메인을 인증해야 이 주소가 살아납니다.`
        );
      }
      return;
    }

    throw new Error(
      `resend(우회) 전원 실패 — ` +
        failed.map((f) => (f as PromiseRejectedResult).reason).join(" / ")
    );
  }

  throw new Error(`resend ${res.status} ${body}`);
}

/**
 * 설정된 경로로 알림을 보냅니다. 여러 개를 켜 두면 전부 보냅니다.
 * @returns 보낸 경로 이름들 (아무것도 설정 안 됐으면 빈 배열)
 */
export async function notifyNewQuote(
  q: QuoteNotice,
  attachments: MailAttachment[] = []
): Promise<string[]> {
  const webhook = process.env.QUOTE_WEBHOOK_URL?.trim();
  const resendKey = process.env.RESEND_API_KEY?.trim();
  const mailFrom = process.env.QUOTE_MAIL_FROM?.trim() || "onboarding@resend.dev";

  /**
   * 받는 주소. 따로 안 정하면 회사 대표 메일로 보냅니다 [A5 — 값은 config 에서].
   *
   * 🔴 **폴백이 조용하면 안 됩니다.** 2026-08-06 에 배포가 `QUOTE_NOTIFY_EMAIL`
   *    (Plaintext) 을 지웠는데, 폴백이 동작해 회사 대표 메일로는 계속 갔습니다.
   *    메일이 오긴 오니까 **아무도 두 사람이 빠진 걸 몰랐습니다.** Resend 발송
   *    로그의 수신자를 세어 보고서야 찾았습니다.
   *
   *    "완전히 죽는 고장" 보다 "조용히 반만 되는 고장" 이 훨씬 늦게 발견됩니다.
   *    그래서 폴백을 탈 때마다 로그를 남깁니다.
   */
  const notifyEnv = process.env.QUOTE_NOTIFY_EMAIL?.trim();
  const mailTo = notifyEnv || site.email;
  if (resendKey && !notifyEnv) {
    console.warn(
      `[견적문의] QUOTE_NOTIFY_EMAIL 이 비어 있어 회사 대표 메일(${site.email}) 로만 보냅니다. ` +
        `배포가 Plaintext 변수를 지웠을 수 있습니다 — Cloudflare 에 **Secret** 으로 다시 넣으세요.`
    );
  }

  /**
   * 웹훅(슬랙 등)에는 파일을 못 붙입니다. 거기까지 "이 메일에 첨부" 라고 적으면
   * 거짓말이 되므로, 웹훅용 사본은 `attached` 를 전부 내려 둡니다.
   */
  const webhookNotice: QuoteNotice = {
    ...q,
    files: q.files.map((f) => ({ ...f, attached: false })),
  };

  const text = asText(webhookNotice);
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
        asText(q),
        attachments
      ),
    ]);
  }

  if (!jobs.length) {
    // 조용히 넘어가면 "알림이 꺼져 있는 것"과 "알림이 실패한 것"을 구분할 수 없습니다.
    // 배포 환경에서는 이 한 줄이 원인 찾기의 시작점입니다 (Cloudflare 관측 로그).
    console.warn(
      "[견적문의] 알림 경로가 설정되지 않아 아무 곳에도 알리지 않았습니다. " +
        "RESEND_API_KEY · QUOTE_NOTIFY_EMAIL 이 배포 환경에 들어 있는지 확인하세요."
    );
    return [];
  }

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
