import "server-only";

import { type PublicPhoto, type PublicSite, sortPhotos } from "@/lib/sites-shared";
import { createPublicClient } from "@/lib/supabase/public";

export * from "@/lib/sites-shared";

/**
 * 현장 폴더 (F29) — 공개 쪽 읽기 (서버 전용). 브라우저에서 쓰는 규칙은 `lib/sites-shared.ts`.
 *
 * 🔴 **공개 페이지는 `select("*")` 를 쓰면 안 됩니다.** 0016 이 익명에게 칸 단위로만 읽기를 줬고
 * (`bee_link`·`ocr_text` 등은 비공개), `*` 는 권한 없는 칸 때문에 통째로 실패합니다(PGlite 로 실측). 아래 칸 목록을 쓰세요.
 */
export const PUBLIC_SITE_COLS =
  "id, slug, title, location, sign_type, size_text, materials, period, story, cover_photo, published, published_at, created_at, updated_at";
export const PUBLIC_PHOTO_COLS = "id, site_id, key, thumb_key, taken_at, stage, width, height, caption";

/** 공개된 현장 목록 — 실적 페이지·사이트맵·RSS 가 씁니다. 0016 을 안 돌렸으면 빈 배열 [A1] */
export async function getPublishedSites(): Promise<(PublicSite & { cover: PublicPhoto | null; count: number })[]> {
  const supabase = createPublicClient();
  if (!supabase) return [];
  try {
    const { data: sites, error } = await supabase
      .from("sites")
      .select(PUBLIC_SITE_COLS)
      .eq("published", true)
      .order("published_at", { ascending: false });
    if (error || !sites?.length) return [];
    const ids = sites.map((s) => s.id);
    const { data: photos } = await supabase.from("site_photos").select(PUBLIC_PHOTO_COLS).in("site_id", ids);
    const all = (photos ?? []) as PublicPhoto[];
    return (sites as PublicSite[]).map((s) => {
      const mine = sortPhotos(all.filter((p) => p.site_id === s.id));
      return { ...s, cover: mine.find((p) => p.id === s.cover_photo) ?? mine.find((p) => p.stage === "done") ?? mine[0] ?? null, count: mine.length };
    });
  } catch (e) {
    console.error("[현장] 공개 목록을 못 읽었습니다", e);
    return [];
  }
}

export async function getPublishedSite(slug: string): Promise<{ site: PublicSite; photos: PublicPhoto[] } | null> {
  const supabase = createPublicClient();
  if (!supabase) return null;
  const { data: site } = await supabase.from("sites").select(PUBLIC_SITE_COLS).eq("slug", slug).eq("published", true).maybeSingle();
  if (!site) return null;
  const { data: photos } = await supabase.from("site_photos").select(PUBLIC_PHOTO_COLS).eq("site_id", site.id);
  return { site: site as PublicSite, photos: sortPhotos((photos ?? []) as PublicPhoto[]) };
}
