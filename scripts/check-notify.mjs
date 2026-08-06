/**
 * 견적 알림 시험 발송 — 가짜 문의를 넣지 않고 알림만 확인합니다.
 *
 *   npm run notify:test
 *
 * `.env.local` 에 값을 넣고 이 명령으로 **먼저 확인한 뒤**, 같은 값을
 * Cloudflare 에 넣는 순서를 권합니다. 운영에 바로 넣고 시험하면 실패했을 때
 * 원인이 값 문제인지 배포 문제인지 구분이 안 됩니다.
 *
 * ⚠️ 이 스크립트는 `lib/notify.ts` 를 그대로 쓰지 않습니다.
 *    그쪽은 TypeScript + server-only 라 node 로 직접 못 불러옵니다.
 *    발송 형식이 아니라 **값이 맞는지·메일이 도착하는지**를 보는 게 목적입니다.
 *    실제 메일 모양은 운영 폼으로 한 건 넣어 확인하세요.
 */

import { readFileSync, existsSync } from "node:fs";

const G = (s) => `\x1b[32m${s}\x1b[0m`;
const R = (s) => `\x1b[31m${s}\x1b[0m`;
const D = (s) => `\x1b[2m${s}\x1b[0m`;

if (!existsSync(".env.local")) {
  console.log(R("\n.env.local 이 없습니다.\n"));
  process.exit(1);
}

const env = {};
for (const l of readFileSync(".env.local", "utf8").split("\n")) {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}

/**
 * 받는 주소 기본값은 `config/site.ts` 의 회사 대표 메일입니다(실제 코드와 동일).
 *
 * 이 스크립트는 plain JS 라 TS 설정을 import 할 수 없어 파일에서 값만 읽어옵니다.
 * 주소를 여기 적어 두면 config 와 어긋날 수 있어 그렇게 하지 않습니다. [원칙 A5]
 */
function siteEmail() {
  try {
    const src = readFileSync("config/site.ts", "utf8");
    return src.match(/^\s*email:\s*["']([^"']+)["']/m)?.[1] ?? "";
  } catch {
    return "";
  }
}

const webhook = env.QUOTE_WEBHOOK_URL;
const key = env.RESEND_API_KEY;
const from = env.QUOTE_MAIL_FROM || "onboarding@resend.dev";
const to = env.QUOTE_NOTIFY_EMAIL || siteEmail();

console.log("\n\x1b[1m견적 알림 시험 발송\x1b[0m\n");

if (!webhook && !key) {
  console.log(R("  설정된 알림이 없습니다."));
  console.log(D("  .env.local 에 QUOTE_WEBHOOK_URL 또는 RESEND_API_KEY 를 넣으세요."));
  console.log(D("  서식은 .env.local.example 참고.\n"));
  process.exit(1);
}

const now = new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
const text =
  `[수산나디자인] 알림 시험 발송\n\n` +
  `이 메시지가 보이면 알림 설정이 정상입니다.\n` +
  `실제 견적 문의가 들어오면 고객 이름·연락처·지역·내용이 이 자리에 옵니다.\n` +
  `첨부한 사진도 이렇게 메일에 그대로 붙어서 옵니다.\n\n` +
  `발송 시각: ${now}`;

/**
 * 첨부 시험용 파일 — **한글 파일명**으로 보냅니다.
 *
 * 실제 문의에 들어온 이름이 `자석 게시판(필름마감).jpg` 였습니다. 한글·공백·괄호가
 * 섞인 이름은 메일 헤더 인코딩(RFC 2231) 단계에서 깨지기 쉬운데, 깨지면 받는
 * 사람 화면에 `=?utf-8?B?...` 같은 글자가 파일명으로 뜹니다. 시험을 영문 파일명으로
 * 하면 이걸 못 잡으므로 일부러 한글로 둡니다.
 *
 * 내용은 1×1 투명 PNG 입니다 (가장 작은 진짜 이미지).
 */
const SAMPLE_PNG =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
const attachments = [{ filename: "첨부 시험(한글 파일명).png", content: SAMPLE_PNG }];

let bad = 0;

if (webhook) {
  try {
    const res = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, content: text }),
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) console.log(`  ${G("✔ 보냄")}  웹훅  ${D("— 채팅방을 확인하세요")}`);
    else {
      bad++;
      console.log(`  ${R("✘ 실패")}  웹훅  (HTTP ${res.status})`);
      console.log(D(`           ${(await res.text()).slice(0, 200)}`));
    }
  } catch (e) {
    bad++;
    console.log(`  ${R("✘ 실패")}  웹훅  (${e.message})`);
  }
} else {
  console.log(`  ${D("… 건너뜀")}  웹훅  ${D("(QUOTE_WEBHOOK_URL 없음)")}`);
}

if (key) {
  if (!to) {
    bad++;
    console.log(`  ${R("✘ 실패")}  이메일 — 받을 주소가 없습니다.`);
    console.log(D(`           .env.local 에 QUOTE_NOTIFY_EMAIL 을 넣거나,`));
    console.log(D(`           config/site.ts 의 email 값을 확인하세요.`));
  } else {
    /**
     * 실제 발송 코드(`lib/notify.ts`)와 **같은 규칙**으로 시험합니다.
     * 거기서 발신 도메인이 거부되면 시험용 주소로 우회하는데, 이 스크립트가
     * 그걸 안 따라 하면 "시험은 실패인데 운영은 도착" 하는 상태가 되어
     * 값을 고칠 이유가 없는데도 계속 고치게 됩니다.
     */
    const recipients = to.split(",").map((s) => s.trim()).filter(Boolean);

    const post = (sender, addrs = recipients) =>
      fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: sender,
          to: addrs,
          subject: "[견적문의] 알림 시험 발송",
          text,
          attachments, // 실제 문의도 이 경로로 사진이 붙습니다 (lib/notify.ts)
        }),
        signal: AbortSignal.timeout(10000),
      });

    try {
      let res = await post(from);
      let body = await res.text();

      if (!res.ok && res.status === 403 && /not verified|domain/i.test(body)) {
        console.log(
          `  ${D("↻ 우회")}  보내는 주소 ${from} 의 도메인이 아직 Resend 에 인증되지 않았습니다.`
        );
        console.log(D(`           운영 코드와 같이 onboarding@resend.dev 로 다시 보냅니다.`));

        /**
         * 운영 코드와 같이 **한 명씩** 보냅니다. 한 요청에 모아 보내면 못 받는 주소가
         * 하나 섞였을 때 요청 전체가 거부돼, 잘 가던 주소까지 실패로 보입니다.
         */
        const ok = [];
        for (const addr of recipients) {
          const r = await post("onboarding@resend.dev", [addr]);
          if (r.ok) ok.push(addr);
          else {
            const b = await r.text();
            console.log(`  ${R("✘ 실패")}  이메일 → ${addr}  (HTTP ${r.status})`);
            console.log(
              D(`           이 주소는 우회 경로로 못 받습니다. 도메인 인증이 필요합니다.`) +
                `\n` +
                D(`           ${b.slice(0, 160)}`)
            );
          }
        }

        // 전원 실패는 아래 공통 블록이 처리합니다. 여기서는 "일부만 갔다" 만 셉니다.
        res = { ok: ok.length > 0, status: ok.length ? 200 : 403 };
        body = "";
        if (ok.length && ok.length < recipients.length) bad++;

        if (res.ok) {
          console.log(`  ${G("✔ 보냄")}  이메일  ${D(`onboarding@resend.dev → ${ok.join(", ")}`)}`);
          console.log(
            D(`           도착했다면 알림은 살아 있습니다. 다만 이 우회 경로는`) +
              `\n` +
              D(`           Resend 가입 계정 본인 메일로만 갑니다. 회사 주소로 받으려면`) +
              `\n` +
              D(`           resend.com/domains 에서 susannadesign.co.kr 을 인증하세요.`)
          );
        }
      } else if (res.ok) {
        console.log(`  ${G("✔ 보냄")}  이메일  ${D(`${from} → ${to}`)}`);
        console.log(D(`           받은편지함에 없으면 스팸함도 보세요.`));
      }

      if (res.ok) {
        console.log(
          D(`           첨부 1개가 같이 갔습니다 — 파일명이 "첨부 시험(한글 파일명).png"`) +
            `\n` +
            D(`           로 제대로 보이는지 확인하세요. 깨져 보이면 실제 문의 사진도 깨집니다.`)
        );
      }

      if (!res.ok) {
        bad++;
        console.log(`  ${R("✘ 실패")}  이메일  (HTTP ${res.status})`);
        console.log(D(`           ${body.slice(0, 300)}`));
        if (res.status === 401)
          console.log(D(`           → RESEND_API_KEY 가 맞는지 확인하세요.`));
        else if (body.includes("your own email address"))
          console.log(
            D(`           → Resend 는 도메인 인증 전에는 가입한 본인 메일로만 보낼 수 있습니다.`) +
              `\n` +
              D(`             ${to} 로 받으려면 resend.com/domains 에서`) +
              `\n` +
              D(`             susannadesign.co.kr 을 등록해야 합니다. (선택이 아니라 필수)`)
          );
        else if (res.status === 403 || body.includes("domain"))
          console.log(
            D(`           → 보내는 주소(${from}) 의 도메인이 Resend 에 등록/인증되지 않았습니다.`) +
              `\n` +
              D(`             resend.com/domains 에서 등록하거나, 등록 전이면`) +
              `\n` +
              D(`             .env.local 의 QUOTE_MAIL_FROM 을 지우고 다시 시험하세요.`)
          );
      }
    } catch (e) {
      bad++;
      console.log(`  ${R("✘ 실패")}  이메일  (${e.message})`);
    }
  }
} else {
  console.log(`  ${D("… 건너뜀")}  이메일  ${D("(RESEND_API_KEY 없음)")}`);
}

if (from === "onboarding@resend.dev" && key) {
  console.log(
    `\n  ${D("※ 보내는 주소가 Resend 시험용(onboarding@resend.dev)입니다.")}` +
      `\n  ${D("   이 상태로는 Resend 에 가입한 본인 메일로만 발송됩니다.")}` +
      `\n  ${D("   회사 메일로 받으려면 resend.com/domains 에 susannadesign.co.kr 을")}` +
      `\n  ${D("   등록하고 QUOTE_MAIL_FROM=noreply@susannadesign.co.kr 로 바꾸세요.")}`
  );
}

console.log(
  bad
    ? R("\n● 실패한 경로가 있습니다. 위 안내를 보고 값을 고친 뒤 다시 실행하세요.\n")
    : G("\n● 발송 완료 — 실제로 도착했는지 확인하세요.\n")
);

// process.exit() 를 바로 부르면 fetch 의 소켓이 닫히는 중에 종료돼
// Windows 에서 libuv assertion 경고가 찍힙니다. 코드만 정하고 자연 종료시킵니다.
process.exitCode = bad ? 1 : 0;
