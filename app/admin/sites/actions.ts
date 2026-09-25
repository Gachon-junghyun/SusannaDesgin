"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth";
import { driveReady, purgeOldOriginals } from "@/lib/gdrive";
import { getPhotoBucket } from "@/lib/r2";
import { readSign, type SignReading } from "@/lib/sign-ocr";
import { publishGaps, toSlug } from "@/lib/sites";
import { createClient } from "@/lib/supabase/server";
import type { PhotoStage } from "@/lib/supabase/types";

/**
 * 현장 폴더 (F29) 쓰기. 액션마다 `requireAdmin()` + RLS `is_admin()` 두 겹 [A2].
 */
export type SiteState = { error?: string; ok?: boolean };

async function db() {
  await requireAdmin();
  const s = await createClient();
  if (!s) throw new Error("Supabase 접속 정보가 설정되지 않았습니다.");
  return s;
}

function explain(e: { code?: string; message: string }): string {
  if (/PGRST205|42P01/.test(e.code ?? "") || /relation .*sites/.test(e.message))
    return "현장 표가 아직 없습니다 — supabase/migrations/0016_sites.sql 을 Supabase 대시보드에서 실행해 주세요.";
  if (e.code === "23505") return "같은 주소(slug)를 쓰는 현장이 이미 있습니다 — 주소를 조금 바꿔 주세요.";
  if (e.code === "23514") return "칸 형식이 맞지 않습니다(주소는 한글·영문 소문자·숫자·- 만, 링크는 https:// 로).";
  return `저장하지 못했습니다: ${e.message}`;
}

const t = (f: FormData, k: string, max: number) => String(f.get(k) ?? "").trim().slice(0, max);

function refresh(id?: string, slug?: string) {
  revalidatePath("/admin/sites");
  if (id) revalidatePath(`/admin/sites/${id}`);
  revalidatePath("/works");
  if (slug) revalidatePath(`/works/${slug}`);
}

export async function createSite(_p: SiteState, f: FormData): Promise<SiteState> {
  const title = t(f, "title", 80);
  if (!title) return { error: "현장 이름(상호)을 적어 주세요." };
  const location = t(f, "location", 60);
  const supabase = await db();
  const slug = `${toSlug(location, title) || "site"}-${crypto.randomUUID().slice(0, 4)}`;
  const { data, error } = await supabase.from("sites").insert({ title, location, slug }).select("id").single();
  if (error) return { error: explain(error) };
  refresh();
  redirect(`/admin/sites/${data.id}`);
}

export async function saveSite(id: string, _p: SiteState, f: FormData): Promise<SiteState> {
  const supabase = await db();
  const bee = t(f, "bee_link", 500);
  if (bee && !/^https:\/\//.test(bee)) return { error: "비스테이션 링크는 https:// 로 시작해야 합니다." };
  const slug = toSlug(t(f, "slug", 80));
  if (slug.length < 2) return { error: "주소(slug)를 두 글자 이상 적어 주세요." };
  const { error } = await supabase
    .from("sites")
    .update({
      title: t(f, "title", 80),
      location: t(f, "location", 60),
      sign_type: t(f, "sign_type", 40),
      size_text: t(f, "size_text", 80),
      materials: t(f, "materials", 120),
      period: t(f, "period", 60),
      story: t(f, "story", 4000),
      bee_link: bee,
      slug,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return { error: explain(error) };
  refresh(id, slug);
  return { ok: true };
}

export async function setPublished(id: string, on: boolean): Promise<SiteState> {
  const supabase = await db();
  const { data: site, error: e1 } = await supabase.from("sites").select("title, location, sign_type, story, slug, published_at").eq("id", id).single();
  if (e1) return { error: explain(e1) };
  if (on) {
    const { count } = await supabase.from("site_photos").select("id", { count: "exact", head: true }).eq("site_id", id);
    const gaps = publishGaps(site, count ?? 0);
    if (gaps.length) return { error: `공개하려면 이것이 더 필요합니다: ${gaps.join(" · ")}` };
  }
  const { error } = await supabase
    .from("sites")
    .update({ published: on, published_at: on ? (site.published_at ?? new Date().toISOString()) : site.published_at })
    .eq("id", id);
  if (error) return { error: explain(error) };
  refresh(id, site.slug);
  revalidatePath("/sitemap.xml");
  return { ok: true };
}

export async function setPhoto(id: string, patch: { stage?: PhotoStage; caption?: string }): Promise<SiteState> {
  const supabase = await db();
  const upd: Record<string, string> = {};
  if (patch.stage) upd.stage = patch.stage;
  if (patch.caption !== undefined) upd.caption = patch.caption.trim().slice(0, 200);
  const { data, error } = await supabase.from("site_photos").update(upd).eq("id", id).select("site_id").single();
  if (error) return { error: explain(error) };
  refresh(data.site_id);
  return { ok: true };
}

export async function setCover(siteId: string, photoId: string): Promise<SiteState> {
  const supabase = await db();
  const { error } = await supabase.from("sites").update({ cover_photo: photoId }).eq("id", siteId);
  if (error) return { error: explain(error) };
  refresh(siteId);
  return { ok: true };
}

export async function deletePhoto(id: string): Promise<SiteState> {
  const supabase = await db();
  const { data: p, error } = await supabase.from("site_photos").delete().eq("id", id).select("site_id, key, thumb_key").single();
  if (error) return { error: explain(error) };
  const bucket = await getPhotoBucket();
  if (bucket) await bucket.delete([p.key, p.thumb_key]);
  refresh(p.site_id);
  return { ok: true };
}

/** 원본이 드라이브로 갔나 — 브라우저가 구글에 올린 뒤 결과를 적습니다 */
export async function markOriginal(id: string, status: "drive" | "failed", fileId = ""): Promise<SiteState> {
  const supabase = await db();
  const { error } = await supabase
    .from("site_photos")
    .update({ original_status: status, drive_file_id: fileId.slice(0, 100) })
    .eq("id", id);
  if (error) return { error: explain(error) };
  return { ok: true };
}

/** «상호 읽기» — 사람이 누를 때만. 결과는 추정이라 화면이 상호 칸에 «제안»으로만 띄웁니다 */
export async function readSignOf(photoId: string): Promise<SiteState & { reading?: SignReading }> {
  const supabase = await db();
  const { data: p } = await supabase.from("site_photos").select("key, site_id").eq("id", photoId).single();
  if (!p) return { error: "사진을 찾지 못했습니다." };
  const bucket = await getPhotoBucket();
  const obj = bucket ? await bucket.get(p.key) : null;
  if (!obj) return { error: "사진 파일을 찾지 못했습니다." };
  try {
    const reading = await readSign(await new Response(obj.body).arrayBuffer());
    const text = [reading.name, reading.signType, reading.text].filter(Boolean).join(" · ").slice(0, 1000);
    await supabase.from("site_photos").update({ ocr_text: text }).eq("id", photoId);
    refresh(p.site_id);
    return { ok: true, reading };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function deleteSite(id: string): Promise<SiteState> {
  const supabase = await db();
  const { data: photos } = await supabase.from("site_photos").select("key, thumb_key").eq("site_id", id);
  const { error } = await supabase.from("sites").delete().eq("id", id);
  if (error) return { error: explain(error) };
  const bucket = await getPhotoBucket();
  if (bucket && photos?.length) await bucket.delete(photos.flatMap((p) => [p.key, p.thumb_key]));
  refresh();
  redirect("/admin/sites");
}

export async function purgeDrive(): Promise<SiteState & { deleted?: number }> {
  await requireAdmin();
  if (!driveReady()) return { error: "구글 드라이브가 연결되지 않았습니다." };
  try {
    const { deleted } = await purgeOldOriginals(30);
    return { ok: true, deleted };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
