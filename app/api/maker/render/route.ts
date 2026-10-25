import { NextResponse } from "next/server";

import { isShareToken } from "@/lib/maker/share";
import { clientIp, rateLimited } from "@/lib/rate-limit";
import { createPublicClient } from "@/lib/supabase/public";

/**
 * 수산나 픽 «모델링» — 렌더 요청(POST)과 결과 받기(GET) (F26-n · 2026-10-25, `0022_maker_render.sql`).
 *
 * 🔴 **익명 키로 DB 함수만 부릅니다**(`request_maker_render` · `get_maker_render`). 토큰이 살아 있는지·자기 링크의 줄인지·횟수는
 * 함수가 봅니다 [A2]. 그림은 이 PC 의 블렌더 일꾼이 그려 같은 줄에 넣습니다(`scripts/maker-render/`).
 * 슬라이더를 끄는 동안 요청이 잦아서 IP 문턱은 넉넉히(10분 400번) 둡니다 — 진짜 상한은 DB 의 «링크당 1분 40장»입니다.
 */
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 400;
const MAX_BYTES = 900_000;

/** 일꾼이 이보다 오래 안 왔으면 «꺼져 있음»으로 봅니다(일꾼은 쉴 때도 몇 초마다 물어보러 옵니다) */
const WORKER_STALE_MS = 45_000;

export async function POST(req: Request) {
  if (rateLimited(`maker-render:${clientIp(req)}`, MAX_PER_WINDOW, WINDOW_MS))
    return NextResponse.json({ ok: false, error: "잠시 뒤 다시 시도해 주세요." }, { status: 429 });
  const raw = await req.text();
  if (raw.length > MAX_BYTES) return NextResponse.json({ ok: false, error: "모델이 너무 큽니다." }, { status: 413 });
  let body: { token?: unknown; payload?: unknown };
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false, error: "요청을 읽지 못했습니다." }, { status: 400 });
  }
  const token = typeof body.token === "string" ? body.token : "";
  if (!isShareToken(token)) return NextResponse.json({ ok: false, error: "열 수 없는 링크입니다." }, { status: 400 });
  const supabase = createPublicClient();
  if (!supabase) return NextResponse.json({ ok: false, error: "모델링 서버에 연결하지 못했습니다." }, { status: 503 });
  const { data, error } = await supabase.rpc("request_maker_render", { p_token: token, p_payload: body.payload });
  if (error) {
    console.error("[수산나 픽 모델링] 요청 실패 — 0022 를 돌렸는지 확인하세요:", error.code, error.message);
    return NextResponse.json({ ok: false, error: "모델링 서버에 연결하지 못했습니다." }, { status: 503 });
  }
  if (!data) return NextResponse.json({ ok: false, error: "요청이 많아 잠시 뒤 다시 그립니다." }, { status: 429 });
  return NextResponse.json({ ok: true, id: data });
}

export async function GET(req: Request) {
  const u = new URL(req.url);
  const token = u.searchParams.get("token") ?? "";
  const id = u.searchParams.get("id") ?? "";
  if (!isShareToken(token) || !/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ ok: false }, { status: 400 });
  const supabase = createPublicClient();
  if (!supabase) return NextResponse.json({ ok: false }, { status: 503 });
  const { data, error } = await supabase.rpc("get_maker_render", { p_token: token, p_id: id });
  if (error) return NextResponse.json({ ok: false }, { status: 503 });
  const row = (Array.isArray(data) ? data[0] : null) as { status?: string; jpg?: string | null; ms?: number | null; worker_seen?: string | null } | null;
  if (!row) return NextResponse.json({ ok: false, status: "gone" }, { status: 404 });
  const seen = row.worker_seen ? Date.parse(row.worker_seen) : 0;
  return NextResponse.json(
    { ok: true, status: row.status, jpg: row.jpg ?? null, ms: row.ms ?? null, workerOn: Date.now() - seen < WORKER_STALE_MS },
    { headers: { "Cache-Control": "no-store" } },
  );
}
