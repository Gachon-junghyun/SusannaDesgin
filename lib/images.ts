import fs from "node:fs";
import path from "node:path";

const cache = new Map<string, boolean>();
const useCache = process.env.NODE_ENV === "production";

/** 관리자 화면에서 업로드해 Supabase 스토리지에 올라간 사진인지 */
export function isRemoteImage(src: string): boolean {
  return /^https?:\/\//i.test(src);
}

/**
 * 해당 이미지를 실제로 띄울 수 있는지 확인합니다.
 *
 * - `https://...` (업로드한 사진): 파일 시스템에 없으니 항상 있다고 봅니다.
 * - `/images/...` (직접 넣은 사진): public/ 아래에 파일이 있는지 확인하고,
 *   없으면 크기가 적힌 플레이스홀더를 띄웁니다.
 *
 * (서버 컴포넌트 전용)
 */
export function imageExists(src: string): boolean {
  if (!src) return false;
  if (isRemoteImage(src)) return true;

  if (useCache && cache.has(src)) return cache.get(src)!;

  const rel = src.replace(/^\//, "").split("?")[0];
  let ok = false;
  try {
    const p = path.join(process.cwd(), "public", rel);
    ok = fs.existsSync(p) && fs.statSync(p).isFile();
  } catch {
    ok = false;
  }

  if (useCache) cache.set(src, ok);
  return ok;
}
