import "server-only";

import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * 현장 사진 저장소 — Cloudflare R2 버킷 바인딩 `SITE_PHOTOS` (F29).
 *
 * 🔴 **바인딩이 없으면 `null` 을 돌려주고, 부르는 쪽이 «설정 필요»를 띄웁니다** [A1].
 * `wrangler.jsonc` 의 `r2_buckets` 는 **버킷을 먼저 만든 뒤에** 주석을 풉니다 — 없는 버킷을 적어 두면
 * `wrangler deploy` 가 실패해서 **홈페이지 배포 전체가 멈춥니다.** 절차는 ARCHITECTURE F29.
 *
 * 로컬 `next dev` 에서는 OpenNext 가 wrangler 설정을 읽어 miniflare 로 흉내 낸 버킷을 줍니다
 * (`.wrangler/state` 에 저장 — 운영 버킷과 무관).
 */

/** R2 에서 우리가 쓰는 만큼만 — `@cloudflare/workers-types` 를 끌어오지 않으려고 좁게 적었습니다 */
export type PhotoBucket = {
  put(key: string, value: ArrayBuffer, opts?: { httpMetadata?: { contentType?: string; cacheControl?: string } }): Promise<unknown>;
  get(key: string): Promise<{ body: ReadableStream; httpEtag: string; size: number } | null>;
  delete(keys: string | string[]): Promise<void>;
};

export async function getPhotoBucket(): Promise<PhotoBucket | null> {
  try {
    const { env } = await getCloudflareContext({ async: true });
    const b = (env as Record<string, unknown>).SITE_PHOTOS;
    return (b as PhotoBucket | undefined) ?? null;
  } catch {
    return null;
  }
}
