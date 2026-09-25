import type { PhotoStage, SitePhotoRow, SiteRow } from "@/lib/supabase/types";

/**
 * 현장 폴더 (F29) — **브라우저와 서버가 같이 쓰는** 규칙. DB 를 부르지 않습니다.
 * (DB 를 읽는 공개 쪽 함수는 `lib/sites.ts` — 편집 화면이 그걸 import 하면 Supabase 클라이언트가 브라우저 번들에 딸려 갑니다.)
 */

export type PublicSite = Omit<SiteRow, "bee_link">;
export type PublicPhoto = Pick<SitePhotoRow, "id" | "site_id" | "key" | "thumb_key" | "taken_at" | "stage" | "width" | "height" | "caption">;

export const STAGES: { key: PhotoStage; label: string }[] = [
  { key: "before", label: "시공 전" },
  { key: "work", label: "제작·시공" },
  { key: "done", label: "완공" },
  { key: "night", label: "야간 점등" },
  { key: "etc", label: "기타" },
];
export const stageLabel = (s: string) => STAGES.find((x) => x.key === s)?.label ?? "기타";
const STAGE_ORDER: Record<string, number> = { before: 0, work: 1, done: 2, night: 3, etc: 4 };

/** 전 → 시공 → 완공 → 야간 → 기타, 같은 단계 안에서는 촬영 순 */
export function sortPhotos<T extends { stage: string; taken_at: string | null; id: string }>(photos: T[]): T[] {
  return [...photos].sort(
    (a, b) =>
      STAGE_ORDER[a.stage] - STAGE_ORDER[b.stage] ||
      (a.taken_at ?? "").localeCompare(b.taken_at ?? "") ||
      a.id.localeCompare(b.id),
  );
}

/** R2 키 → 사진 주소. 사진은 `/media/<키>` 라우트가 내보냅니다(공개 여부를 거기서 봅니다) */
export const photoUrl = (key: string) => `/media/${key}`;

/** 공개 조건 — 얇은 페이지는 코어 업데이트에서 처벌받습니다(SEO.md B-1). 모자란 것을 사람 말로 돌려줍니다 */
export function publishGaps(s: Pick<SiteRow, "title" | "location" | "sign_type" | "story">, photoCount: number): string[] {
  const gaps: string[] = [];
  if (!s.title.trim()) gaps.push("상호(현장 이름)");
  if (!s.location.trim()) gaps.push("위치(구·동)");
  if (!s.sign_type.trim()) gaps.push("간판 종류");
  if (photoCount < 3) gaps.push(`사진 3장 이상 (지금 ${photoCount}장)`);
  if (s.story.trim().length < 150) gaps.push(`현장 이야기 150자 이상 (지금 ${s.story.trim().length}자)`);
  return gaps;
}

/** 제목 → 주소 조각. 한글은 그대로 둡니다(검색엔진이 읽습니다) */
export function toSlug(...parts: string[]): string {
  return parts
    .join(" ")
    .toLowerCase()
    .replace(/[^0-9a-z가-힣]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
