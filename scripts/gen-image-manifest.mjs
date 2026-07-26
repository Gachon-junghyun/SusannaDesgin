/**
 * `public/` 안에 실제로 있는 파일 목록을 빌드 시점에 뽑아
 * `lib/image-manifest.ts` 로 적습니다.
 *
 * **왜 필요한가 — Cloudflare Workers 에는 파일 시스템이 없습니다.**
 *
 * 예전에는 `lib/images.ts` 가 `fs.existsSync()` 로 사진 유무를 판단했습니다.
 * 로컬에서는 잘 되지만, 배포된 Worker 안에서는 `public/` 이 디스크에 없습니다.
 * (Cloudflare 는 `public/` 을 정적 자산으로 따로 서빙합니다 — 파일이 아니라 URL 입니다.)
 * 그래서 운영 사이트에서는 **모든 사진이 항상 "없음"으로 판정**돼
 * 파일을 아무리 넣어도 회색 플레이스홀더만 나왔습니다. [원칙 A6 가 깨져 있었음]
 *
 * 목록을 코드로 구워 두면 파일 시스템 없이도 판단할 수 있습니다.
 *
 * ⚠️ 이 스크립트는 `npm run dev` · `npm run build` · `npm run cf:build` 앞에
 *    자동으로 붙어 있습니다. 직접 부를 일은 없습니다.
 *    (`npm run images:manifest` 로 수동 실행도 가능)
 */

import { readdirSync, statSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC_DIR = join(ROOT, "public");
const OUT = join(ROOT, "lib", "image-manifest.ts");

/** 사진이 아닌 것 — 목록에 넣을 이유가 없습니다 */
const SKIP = /\.(md|txt|xml|json)$/i;

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      out.push(...walk(full));
    } else if (!SKIP.test(name)) {
      out.push("/" + relative(PUBLIC_DIR, full).split(sep).join("/"));
    }
  }
  return out;
}

const files = walk(PUBLIC_DIR).sort();

const body = `/**
 * ⚠️ 자동 생성 파일입니다. 직접 고치지 마세요 —
 *    \`scripts/gen-image-manifest.mjs\` 가 빌드 때마다 다시 씁니다.
 *
 * public/ 안에 실제로 있는 파일 목록입니다.
 * Cloudflare Workers 에는 파일 시스템이 없어서, 사진이 있는지를
 * 런타임에 확인할 방법이 이것뿐입니다. 자세한 이유는 위 스크립트 주석 참고.
 */

export const PUBLIC_FILES: readonly string[] = [
${files.map((f) => `  ${JSON.stringify(f)},`).join("\n")}
];
`;

// 내용이 같으면 안 씁니다 — 파일 mtime 이 바뀌면 dev 서버가 통째로 다시 컴파일합니다
let prev = "";
try {
  prev = readFileSync(OUT, "utf8");
} catch {
  /* 첫 실행 */
}

if (prev !== body) {
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, body, "utf8");
  console.log(`[image-manifest] ${files.length}개 파일 기록 → lib/image-manifest.ts`);
} else {
  console.log(`[image-manifest] 변경 없음 (${files.length}개)`);
}
