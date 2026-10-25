import { NextResponse } from "next/server";

import { checkShareDesign } from "@/lib/maker/share-check";
import { isShareToken } from "@/lib/maker/share";
import { notifyMakerReply } from "@/lib/notify";
import { clientIp, rateLimited } from "@/lib/rate-limit";
import { createPublicClient } from "@/lib/supabase/public";

/**
 * 수산나 픽 «보내기» — 손님이 고르고 다듬은 안을 같은 링크로 돌려보냅니다 (F26-n · 2026-10-25, `0021_maker_reply.sql`).
 *
 * 🔴 **익명 키로 DB 함수 하나(`send_maker_reply`)만 부릅니다.** 그 함수가 «살아 있는 링크의 토큰인가»·모양·횟수를 스스로 봅니다 [A2].
 * 여기서는 그 앞에서 IP 횟수(10분 10번)와 같은 디자인 검사(`checkShareDesign` — 공유·견적과 한 곳)를 한 번 더 합니다.
 * 손님에게는 «보냈습니다» / «잠시 뒤» / «지금은 못 보냄» 셋만 말합니다(DB 사정은 로그에).
 */
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 10;

const clean = (v: unknown, n: number) => (typeof v === "string" ? v.replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, " ").trim().slice(0, n) : "");

export async function POST(req: Request) {
  if (rateLimited(`maker-reply:${clientIp(req)}`, MAX_PER_WINDOW, WINDOW_MS))
    return NextResponse.json({ ok: false, error: "잠시 뒤 다시 보내 주세요." }, { status: 429 });

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "보낸 내용을 읽지 못했습니다." }, { status: 400 });
  }
  const token = clean(body.token, 40);
  if (!isShareToken(token)) return NextResponse.json({ ok: false, error: "열 수 없는 링크입니다." }, { status: 400 });
  const checked = checkShareDesign(body.design);
  if ("error" in checked) return NextResponse.json({ ok: false, error: checked.error }, { status: 400 });

  const round = Math.max(1, Math.min(999, Math.round(Number(body.round) || 1)));
  const pick = Math.max(0, Math.min(2, Math.round(Number(body.pick) || 0)));
  const pickName = clean(body.pickName, 80);
  const changes = Array.isArray(body.changes) ? body.changes.map((c) => clean(c, 120)).filter(Boolean).slice(0, 15) : [];
  const memo = clean(body.memo, 500);

  const supabase = createPublicClient();
  if (!supabase) return NextResponse.json({ ok: false, error: "지금은 보내지 못했습니다. 잠시 뒤 다시 보내 주세요." }, { status: 503 });

  const { data: at, error } = await supabase.rpc("send_maker_reply", {
    p_token: token,
    p_round: round,
    p_pick: pick,
    p_pick_name: pickName,
    p_changes: changes.join("\n"),
    p_memo: memo,
    p_design: body.design,
  });
  if (error) {
    console.error("[수산나 픽] 답장 저장 실패 — 0021 을 돌렸는지 확인하세요:", error.code, error.message);
    return NextResponse.json({ ok: false, error: "지금은 보내지 못했습니다. 잠시 뒤 다시 보내 주세요." }, { status: 503 });
  }
  if (!at) return NextResponse.json({ ok: false, error: "링크 기간이 지났거나 오늘 보낼 수 있는 횟수를 넘었습니다." }, { status: 409 });

  // 링크 제목은 익명이 읽을 수 있는 0013 함수로 — 알림 제목에만 씁니다
  const { data: row } = await supabase.rpc("get_maker_share", { p_token: token });
  const title = (Array.isArray(row) ? (row[0] as { title?: string } | undefined)?.title : "") ?? "";
  const letter = ["A", "B", "C"][pick];
  await notifyMakerReply({ title, token, round, pickLabel: `PICK ${letter}${pickName ? ` «${pickName}»` : ""}`, changes, memo }).catch((e) =>
    console.error("[수산나 픽] 알림 실패(답장은 저장됨):", e),
  );
  return NextResponse.json({ ok: true, at });
}
