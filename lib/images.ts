import fs from "node:fs";
import path from "node:path";

import { PUBLIC_FILES } from "./image-manifest";

/**
 * 사진이 실제로 있는지 판단합니다.
 *
 * ⚠️ **파일 시스템으로 판단하면 안 됩니다.**
 * 예전 구현은 `fs.existsSync()` 하나로 확인했는데, 배포처인 Cloudflare Workers 에는
 * 파일 시스템이 없습니다. `public/` 은 디스크가 아니라 정적 자산(URL)으로 서빙되므로
 * Worker 안에서는 **모든 사진이 항상 "없음"으로 판정**됐고, 파일을 넣어도 운영
 * 사이트에는 회색 플레이스홀더만 나왔습니다.
 *
 * (2026-07-27 발견. 원칙 A6 "파일명 규칙으로 자동 교체"가 로컬에서만 동작하고
 *  운영에서는 한 번도 동작하지 않던 상태였습니다. 실적 사진을 처음 넣어 보고
 *  드러났습니다 — 이미지 URL 은 200 인데 페이지는 회색이었습니다.)
 *
 * 대신 빌드 때 만들어 둔 목록(`lib/image-manifest.ts`)을 봅니다.
 * 목록은 `scripts/gen-image-manifest.mjs` 가 dev·build 앞에서 자동으로 갱신합니다.
 */

const MANIFEST = new Set<string>(PUBLIC_FILES);

/** 관리자 화면에서 업로드해 Supabase 스토리지에 올라간 사진인지 */
export function isRemoteImage(src: string): boolean {
  return /^https?:\/\//i.test(src);
}

/**
 * 해당 이미지를 실제로 띄울 수 있는지 확인합니다.
 *
 * - `https://...` (업로드한 사진): 목록에 없으니 항상 있다고 봅니다.
 * - `/images/...` (직접 넣은 사진): 빌드 시점 목록에 있는지 봅니다.
 *
 * 개발 중에만 파일 시스템도 함께 봅니다 — 서버를 켜 둔 채로 사진을 새로 넣어도
 * 새로고침만 하면 바로 보이게 하려는 것입니다. **운영에서는 목록만 씁니다.**
 */
export function imageExists(src: string): boolean {
  if (!src) return false;
  if (isRemoteImage(src)) return true;

  const clean = src.split("?")[0];
  if (MANIFEST.has(clean)) return true;
  if (process.env.NODE_ENV === "production") return false;

  try {
    const p = path.join(process.cwd(), "public", clean.replace(/^\//, ""));
    return fs.existsSync(p) && fs.statSync(p).isFile();
  } catch {
    return false;
  }
}
