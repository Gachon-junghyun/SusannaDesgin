"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth";
import { explainAssetError, MAKER_ASSET_BUCKET } from "@/lib/maker/assets";
import { createClient } from "@/lib/supabase/server";

/**
 * 그림판 → 프로젝트 에셋 올리기 (F26-l · 2026-09-27).
 * 🔴 **`requireAdmin()`** [A2] — 그 뒤에 `maker_assets` RLS·버킷 정책(0018, `is_admin()`)이 한 번 더 막습니다.
 * 올리는 건 관리자가 **직접 그린 스케치**뿐입니다(PNG 한 장 + 따낸 SVG 한 장). 클로드 코드가 `npm run cms -- maker-assets get` 으로 받아
 * 제미나이로 다듬어(«AI 로 다듬기» — API 전 흐름) 같은 프로젝트에 되돌려 올립니다.
 * 서버 액션 본문 한도(Next 기본 1MB) 안에서 받으려고 PNG 는 90만 자까지만 받습니다.
 */

const PNG_MAX = 900_000;
const SVG_MAX = 300_000;
/** 에디터·로고 만들기가 읽는 «평평한» SVG 인지 — cms.mjs 업로더와 같은 검사 */
const SVG_NOT_FLAT = /transform=|<(rect|circle|ellipse|polygon|polyline|line|text|image|use)[\s>/]/;

export async function uploadSketch(input: { project: string; name: string; png: string; svg: string }): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin();
  const project = String(input.project ?? "").trim().slice(0, 80);
  const name = String(input.name ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, 100) || "스케치";
  if (!project) return { ok: false, error: "프로젝트 이름을 넣어 주세요." };
  const png = String(input.png ?? "");
  const svg = String(input.svg ?? "");
  if (!png.startsWith("data:image/png;base64,") || png.length > PNG_MAX) return { ok: false, error: "스케치 그림이 너무 크거나 형식이 다릅니다." };
  if (svg.length > SVG_MAX || !/^<svg[^>]*viewBox="0 0 [\d.]+ [\d.]+"/.test(svg) || SVG_NOT_FLAT.test(svg)) return { ok: false, error: "선(SVG)이 너무 크거나 형식이 다릅니다." };

  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Supabase 접속 정보가 설정되지 않았습니다." };
  const pngBuf = Buffer.from(png.slice(png.indexOf(",") + 1), "base64");
  const vb = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svg)!;
  const files = [
    { kind: "png", type: "image/png", body: pngBuf, name: `${name}_스케치`, w: pngBuf.readUInt32BE(16), h: pngBuf.readUInt32BE(20) },
    { kind: "svg", type: "image/svg+xml", body: Buffer.from(svg, "utf8"), name: `${name}_선`, w: Math.round(Number(vb[1])), h: Math.round(Number(vb[2])) },
  ];
  for (const f of files) {
    const path = `${crypto.randomUUID()}.${f.kind}`;
    const { error: ue } = await supabase.storage.from(MAKER_ASSET_BUCKET).upload(path, f.body, { contentType: f.type, upsert: false });
    if (ue) return { ok: false, error: `올리지 못했습니다: ${explainAssetError(ue)}` };
    const { error: ie } = await supabase
      .from("maker_assets")
      .insert({ project, name: f.name, kind: f.kind, path, width: f.w, height: f.h, bytes: f.body.length, note: "그림판 스케치 (F26-l)" });
    if (ie) {
      await supabase.storage.from(MAKER_ASSET_BUCKET).remove([path]);
      return { ok: false, error: explainAssetError(ie) };
    }
  }
  revalidatePath("/admin/maker/assets");
  return { ok: true };
}
