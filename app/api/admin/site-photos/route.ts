import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { getPhotoBucket } from "@/lib/r2";
import { createClient } from "@/lib/supabase/server";
import type { PhotoStage } from "@/lib/supabase/types";

/**
 * 현장 사진 올리기 (F29) — 브라우저가 이미 줄인 웹용(긴 변 1600px)·썸네일(480px) WebP 두 장을 받아 R2 에 넣고 줄을 만듭니다.
 *
 * 🔴 원본은 여기로 안 옵니다(구글 드라이브로 브라우저가 직접). 그래서 요청 하나가 수백 KB 입니다.
 * 🔴 브라우저가 캔버스로 다시 그린 사진이라 **GPS·촬영기기 같은 EXIF 가 없습니다** — 공개해도 안전합니다.
 * 서버 액션이 아니라 라우트인 이유: 여러 장을 차례로 올리며 진행 상황을 보여 주려고.
 */
const MAX = 2 * 1024 * 1024;
const UUID = /^[0-9a-f-]{36}$/;

function guessStage(takenAt: string | null): PhotoStage {
  if (!takenAt) return "etc";
  // 한국 시각 19시~05시에 찍었으면 야간 점등으로 봅니다 — 추정이라 화면에서 바꿀 수 있습니다
  const h = Number(new Date(takenAt).toLocaleString("en-US", { timeZone: "Asia/Seoul", hour: "numeric", hour12: false })) % 24;
  return h >= 19 || h < 5 ? "night" : "etc";
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return NextResponse.json({ error: "관리자만 올릴 수 있습니다." }, { status: 401 });

  const bucket = await getPhotoBucket();
  if (!bucket) return NextResponse.json({ error: "사진 저장소(R2)가 아직 연결되지 않았습니다 — ARCHITECTURE F29 의 설정을 먼저 해 주세요." }, { status: 503 });
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase 접속 정보가 없습니다." }, { status: 500 });

  const form = await req.formData();
  const siteId = String(form.get("siteId") ?? "");
  const web = form.get("web");
  const thumb = form.get("thumb");
  if (!UUID.test(siteId)) return NextResponse.json({ error: "현장이 올바르지 않습니다." }, { status: 400 });
  if (!(web instanceof Blob) || !(thumb instanceof Blob)) return NextResponse.json({ error: "사진이 비었습니다." }, { status: 400 });
  const ext = web.type === "image/webp" ? "webp" : web.type === "image/jpeg" ? "jpg" : "";
  if (!ext || thumb.type !== web.type) return NextResponse.json({ error: "브라우저에서 변환된 사진(WebP·JPEG)만 받습니다." }, { status: 400 });
  if (web.size > MAX || thumb.size > MAX) return NextResponse.json({ error: "사진이 너무 큽니다." }, { status: 413 });

  const takenRaw = String(form.get("takenAt") ?? "");
  const takenAt = takenRaw && !Number.isNaN(Date.parse(takenRaw)) ? new Date(takenRaw).toISOString() : null;
  const id = crypto.randomUUID();
  const key = `sites/${siteId}/${id}.${ext}`;
  const thumbKey = `sites/${siteId}/${id}_t.${ext}`;
  const meta = { httpMetadata: { contentType: web.type, cacheControl: "public, max-age=31536000, immutable" } };

  await bucket.put(key, await web.arrayBuffer(), meta);
  await bucket.put(thumbKey, await thumb.arrayBuffer(), meta);

  const { data, error } = await supabase
    .from("site_photos")
    .insert({
      id,
      site_id: siteId,
      key,
      thumb_key: thumbKey,
      taken_at: takenAt ?? new Date().toISOString(),
      stage: guessStage(takenAt),
      width: Number(form.get("width")) || 0,
      height: Number(form.get("height")) || 0,
      bytes: web.size,
    })
    .select("*")
    .single();

  if (error) {
    await bucket.delete([key, thumbKey]); // 줄을 못 만들었으면 파일도 남기지 않습니다
    const missing = /PGRST205|42P01/.test(error.code ?? "") || /site_photos/.test(error.message);
    return NextResponse.json({ error: missing ? "사진 표가 아직 없습니다 — 0016_sites.sql 을 실행해 주세요." : error.message }, { status: 500 });
  }
  await supabase.from("sites").update({ updated_at: new Date().toISOString() }).eq("id", siteId);
  return NextResponse.json({ photo: data });
}
