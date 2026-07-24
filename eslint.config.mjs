import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Cloudflare 배포 산출물 — 우리가 쓴 코드가 아니라 빌드 결과물입니다.
    // 빼지 않으면 린트 결과가 만 건 단위로 묻힙니다.
    ".open-next/**",
    ".wrangler/**",
  ]),
]);

export default eslintConfig;
