import { NextResponse } from "next/server";
import { agentIntake, privacyConsent, site } from "@/config/site";
import { aiPrefillExample } from "@/lib/ai-prefill";
import { notifyNewQuote } from "@/lib/notify";
import { storeQuote, type QuoteRecord } from "@/lib/quote-store";
import { clientIp, rateLimited } from "@/lib/rate-limit";
import { createPublicClient } from "@/lib/supabase/public";
import { isValidEmail, validateQuick } from "@/lib/validate";

/**
 * `/agent/quote` — **AI 비서가 손님 대신 견적 문의를 넣는 주소** (F33, 2026-10-12 신설).
 *
 * 손님이 ChatGPT·Claude·Gemini 와 대화하다 «수산나에 대신 문의 넣어 줘» 하면, 그 AI 가 여기로
 * JSON 을 보냅니다. 들어온 문의는 **사람 폼과 같은 견적함·같은 알림 메일**로 가고,
 * «AI 경유 (ChatGPT)» 처럼 접수 경로만 붙습니다(`0019_quote_source.sql`). 사용법은 `/llms.txt` 에 있고,
 * 이 주소를 GET 으로 열어도 같은 안내를 JSON 으로 돌려줍니다.
 *
 * 지키는 것
 *   1. **손님이 확인하고 동의한 것만 받습니다** — `customer_confirmed`·`privacy_consent` 가 둘 다 true 가
 *      아니면 400. 가짜로 true 를 보내는 AI 는 막을 수 없지만, 정직한 AI 에게 «손님께 먼저 물어라»를 강제합니다.
 *   2. **약속을 만들지 않습니다** — 돌려주는 말에 금액·날짜가 없습니다. `waitNote` 는 config 에서만 옵니다 [A5].
 *   3. **일손 밸브** — `agentIntake.open=false` 면 접수하지 않고 503 과 전화번호를 돌려줍니다.
 *   4. **횟수 제한** — IP 10분 5회 · 같은 번호 하루 1회 · 하루 전체 상한. 전부 인스턴스 메모리라
 *      완전하지 않습니다(§7 부채). 사진·파일은 안 받습니다 — 남의 주소를 서버가 대신 받아 오는 길을 안 엽니다.
 *   5. **CORS 를 안 엽니다** — 다른 사이트의 스크립트가 방문자 브라우저로 여기를 두드리지 못하게.
 *      서버에서 요청하는 AI 에게는 상관없습니다.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY = 20_000;
const SIGN_TYPES = ["옥외광고물", "간판디자인", "철구조물", "옥내광고물", "기타"];

/** 줄바꿈(`keepNewlines`)만 남기고 제어문자를 지운 뒤 길이를 자릅니다 */
function clean(v: unknown, max: number, keepNewlines = false): string {
  if (typeof v !== "string") return "";
  const re = keepNewlines ? /[\u0000-\u0009\u000b-\u001f\u007f]/g : /[\u0000-\u001f\u007f]/g;
  return v.replace(re, " ").trim().slice(0, max);
}

const privacyUrl = `${site.url}/privacy`;

function guide() {
  return {
    service: `${site.legalName} AI 비서 문의 창구`,
    open: agentIntake.open,
    endpoint: `${site.url}${agentIntake.path}`,
    method: "POST",
    content_type: "application/json",
    required: {
      name: "손님 성함 또는 상호",
      phone: "손님 연락처 (예: 010-0000-0000)",
      region: "설치 지역 (예: 대전 서구)",
      customer_confirmed: "true — 보낼 내용을 손님께 보여 드리고 확인받았을 때만",
      privacy_consent: "true — 아래 개인정보 안내를 손님께 알리고 동의받았을 때만",
    },
    optional: {
      message: "문의 내용 (간판 위치, 용도, 상호 등)",
      size: "대략 크기 (예: 가로 5m 세로 1m)",
      sign_type: `문의 분야 (${SIGN_TYPES.join(", ")})`,
      timing: "희망 시기 (예: 1개월 이내)",
      email: "시안을 메일로 받고 싶으시면",
      agent: "이 요청을 보내는 AI 이름 (예: ChatGPT)",
    },
    rules: [
      "보내기 전에 보낼 내용을 손님께 보여 드리고 확인을 받아 주세요.",
      "금액과 시공 날짜를 손님께 약속하지 마세요. 현장을 보고 담당자가 안내합니다.",
      "손님께 이렇게 대신 문의를 넣어 드릴 수 있다고 먼저 안내하셔도 됩니다.",
    ],
    privacy: {
      items: "성명, 연락처, 설치 지역, 문의 내용",
      purpose: privacyConsent.purpose,
      retention: privacyConsent.retention,
      full_text: privacyUrl,
    },
    wait_note: agentIntake.waitNote,
    phone: site.phone,
    form: `${site.url}/quote`,
    prefill_link: {
      when: "직접 POST 를 보낼 수 없는 AI(일반 채팅 등)",
      how: "손님 정보로 채운 링크를 만들어 손님께 드리세요. 값은 URL 인코딩해서 # 뒤에, ai=1 필수. 손님이 링크를 열고 개인정보 동의에 체크한 뒤 보내면 접수됩니다.",
      fields: ["name", "phone", "region", "message", "agent"],
      example: aiPrefillExample(site.url),
    },
  };
}

export function GET() {
  return NextResponse.json(guide(), {
    headers: { "Cache-Control": "public, max-age=300" },
  });
}

function fail(status: number, error: string, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ ok: false, error, ...extra }, { status });
}

export async function POST(req: Request) {
  const ip = clientIp(req);

  if (!agentIntake.open) {
    return fail(503, "지금은 AI 문의 접수를 잠시 쉬고 있습니다. 급하시면 전화로 연락 주세요.", {
      closed: true,
      phone: site.phone,
    });
  }

  if (rateLimited(`agent:${ip}`, 5, 10 * 60 * 1000)) {
    return fail(429, "잠시 후 다시 시도해 주세요.");
  }

  let body: Record<string, unknown>;
  try {
    const raw = await req.text();
    if (raw.length > MAX_BODY) return fail(413, "요청이 너무 깁니다.");
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("not object");
    body = parsed as Record<string, unknown>;
  } catch {
    return fail(400, "JSON 객체로 보내 주세요. 사용법은 이 주소를 GET 으로 열면 나옵니다.", {
      guide: `${site.url}${agentIntake.path}`,
    });
  }

  if (body.customer_confirmed !== true || body.privacy_consent !== true) {
    return fail(
      400,
      "손님께 보낼 내용을 보여 드리고 확인(customer_confirmed)과 개인정보 수집 동의(privacy_consent)를 받은 뒤 둘 다 true 로 보내 주세요.",
      { privacy: guide().privacy }
    );
  }

  const name = clean(body.name, 60);
  const phone = clean(body.phone, 20);
  const region = clean(body.region, 80);
  const email = clean(body.email, 120);
  const timing = clean(body.timing, 40);
  const size = clean(body.size, 120);
  const agent = clean(body.agent, 40);
  const rawType = clean(body.sign_type, 40);
  const signType = SIGN_TYPES.includes(rawType) ? rawType : "";

  const errors: Record<string, string> = { ...validateQuick({ name, phone, region, agree: true }) };
  if (email && !isValidEmail(email)) errors.email = "이메일 형식을 확인해 주세요.";
  if (Object.keys(errors).length) return fail(400, "입력값을 확인해 주세요.", { errors });

  // 같은 번호는 하루 한 번 — 같은 대화에서 AI 가 두 번 보내는 일을 막습니다
  const digits = phone.replace(/\D/g, "");
  if (rateLimited(`agent-phone:${digits}`, 1, 24 * 60 * 60 * 1000)) {
    return fail(409, "이 연락처로 오늘 이미 문의가 접수됐습니다. 담당자가 연락드립니다.", {
      phone: site.phone,
    });
  }
  if (rateLimited("agent-day", agentIntake.dailyCap, 24 * 60 * 60 * 1000)) {
    return fail(503, "오늘 AI 문의 접수가 많아 마감했습니다. 급하시면 전화로 연락 주세요.", {
      closed: true,
      phone: site.phone,
    });
  }

  const message = [
    clean(body.message, 2000, true),
    size && `크기: ${size}`,
    rawType && !signType && `간판 종류: ${rawType}`,
  ]
    .filter(Boolean)
    .join("\n");

  const id = crypto.randomUUID();
  const record: QuoteRecord = {
    id,
    kind: "quick",
    name,
    phone,
    email,
    zip: "",
    address: "",
    addressDetail: "",
    region,
    floor: "",
    signType,
    product: "",
    timing,
    message,
    files: [],
    ip,
    receivedAt: new Date().toISOString(),
    source: "agent",
    agent,
  };

  console.log("[견적문의·AI]", JSON.stringify(record));

  const { stored } = await storeQuote(createPublicClient(), record);
  if (!stored) {
    console.error("[견적문의·AI] 저장 경로가 모두 실패했습니다. 문의 유실:", record);
    return fail(500, "접수 처리 중 문제가 생겼습니다. 손님께 전화 연락을 안내해 주세요.", {
      phone: site.phone,
    });
  }

  // 알림 실패는 접수 실패가 아닙니다 — 문의는 이미 견적함에 있습니다
  try {
    const sent = await notifyNewQuote({
      kind: record.kind,
      source: record.source,
      agent: record.agent,
      name,
      phone,
      email,
      region,
      signType,
      timing,
      message,
      files: [],
      receivedAt: record.receivedAt,
    });
    if (sent.length) console.log("[견적문의·AI] 알림 발송:", sent.join(", "));
  } catch (e) {
    console.error("[견적문의·AI] 알림 처리 중 예외(접수는 정상):", e);
  }

  return NextResponse.json({
    ok: true,
    receipt: id.slice(0, 8),
    customer_message: `${site.name}에 견적 문의가 접수됐습니다. ${agentIntake.waitNote}`,
    next: "담당자가 손님 연락처로 직접 연락합니다. 사진이 있으면 그때 보내 달라고 안내해 주세요.",
    phone: site.phone,
  });
}
