import { getCurrentUser } from "@/lib/auth";
import { getPhotoBucket } from "@/lib/r2";
import { createPublicClient } from "@/lib/supabase/public";

/**
 * 현장 사진 내보내기 (F29) — `/media/sites/<현장>/<사진>.webp`.
 *
 * 🔴 **공개된 현장의 사진만 누구에게나** 나갑니다(1년 캐시 — 키가 사진마다 새로 만들어져 내용이 안 바뀝니다).
 *    아직 비공개인 현장 사진은 **관리자에게만**, 캐시 없이 나갑니다.
 *    그래서 버킷을 «공개 버킷»으로 열지 않았습니다 — 공개 전 현장 사진(손님 가게)이 주소만 알면 보이게 되므로.
 * ⚠️ 이 길은 홈페이지 워커 요청(무료 하루 10만)을 씁니다. 사례 페이지 방문이 하루 수천 건을 넘으면
 *    공개 사본만 담는 버킷 + 전용 도메인으로 옮기세요(ARCHITECTURE F29 «트래픽이 커지면»).
 */
const FILE = /^[0-9a-f-]{36}(_t)?\.(webp|jpg)$/;
const UUID = /^[0-9a-f-]{36}$/;

export async function GET(_req: Request, ctx: { params: Promise<{ siteId: string; file: string }> }) {
  const { siteId, file } = await ctx.params;
  if (!UUID.test(siteId) || !FILE.test(file)) return new Response("not found", { status: 404 });
  const key = `sites/${siteId}/${file}`;
  const photoId = file.slice(0, 36);

  // 공개 여부 — 익명 클라이언트로 읽히면(RLS: 공개 현장의 사진만) 공개입니다
  let isPublic = false;
  const pub = createPublicClient();
  if (pub) {
    const { data } = await pub.from("site_photos").select("id").eq("id", photoId).eq("site_id", siteId).maybeSingle();
    isPublic = Boolean(data);
  }
  if (!isPublic) {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") return new Response("not found", { status: 404 });
  }

  const bucket = await getPhotoBucket();
  if (!bucket) return new Response("storage not configured", { status: 503 });
  const obj = await bucket.get(key);
  if (!obj) return new Response("not found", { status: 404 });

  return new Response(obj.body, {
    headers: {
      "Content-Type": file.endsWith(".jpg") ? "image/jpeg" : "image/webp",
      ETag: obj.httpEtag,
      "Cache-Control": isPublic ? "public, max-age=31536000, immutable" : "private, no-store",
    },
  });
}
