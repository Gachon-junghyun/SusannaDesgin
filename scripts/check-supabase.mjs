/**
 * Supabase 연결 진단.
 *
 *   npm run supabase:check
 *
 * 무엇이 안 됐는지 한국어로 짚어 줍니다. 설정 도중 막혔을 때 이걸 먼저 돌리세요.
 */

import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const OK = "  \x1b[32m✔\x1b[0m";
const NO = "  \x1b[31m✘\x1b[0m";
const TIP = "     \x1b[2m→\x1b[0m";

let failed = false;
function pass(msg) { console.log(`${OK} ${msg}`); }
function fail(msg, tip) {
  failed = true;
  console.log(`${NO} ${msg}`);
  if (tip) tip.split("\n").forEach((t) => console.log(`${TIP} ${t}`));
}

// .env.local 을 직접 읽습니다 (next 없이 단독 실행하기 위해)
function loadEnv() {
  const path = ".env.local";
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (m) out[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

console.log("\n\x1b[1mSupabase 연결 진단\x1b[0m\n");

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// ---------- 1. 키가 채워졌는지 ----------
if (!existsSync(".env.local")) {
  fail(".env.local 파일이 없습니다.", ".env.local.example 을 복사해 .env.local 로 만드세요.");
} else if (!url || !key) {
  fail(
    ".env.local 은 있지만 값이 비어 있습니다.",
    "Supabase 대시보드 → Project Settings → API 에서\n" +
      "Project URL 과 anon public 키를 복사해 넣으세요."
  );
} else {
  pass(".env.local 에 값이 들어 있습니다.");
}

if (!url || !key) {
  console.log("\n\x1b[31m키부터 채운 뒤 다시 실행해 주세요.\x1b[0m\n");
  process.exit(1);
}

// ---------- 2. 값 형식 ----------
if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url)) {
  fail(
    `URL 형식이 이상합니다: ${url}`,
    "https://프로젝트id.supabase.co 형태여야 합니다. 뒤에 /rest/v1 같은 경로를 붙이지 마세요."
  );
} else {
  pass(`프로젝트 주소: ${url}`);
}

if (key.startsWith("service_role") || key.includes('"role":"service_role"')) {
  fail(
    "service_role 키가 들어 있습니다. 즉시 anon 키로 바꾸세요.",
    "service_role 은 모든 권한 검사를 무시합니다. 브라우저에 노출되면 누구나 데이터를 지울 수 있습니다."
  );
} else if (key.length < 40) {
  fail("anon 키가 너무 짧습니다. 잘려서 붙여넣어진 것 같습니다.");
} else {
  // JWT 페이로드를 열어 role 확인 (서명 검증 아님, 형식 확인용)
  try {
    const payload = JSON.parse(Buffer.from(key.split(".")[1], "base64").toString());
    if (payload.role === "service_role") {
      fail("service_role 키입니다. anon public 키로 바꾸세요.", "권한 검사를 무시하는 키라 위험합니다.");
    } else {
      pass(`anon 키 확인 (role: ${payload.role ?? "anon"})`);
    }
  } catch {
    pass("anon 키 형식 확인");
  }
}

// ---------- 3. 실제 접속 ----------
const supabase = createClient(url.replace(/\/$/, ""), key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// profiles 는 일부러 뺐습니다.
// "본인 것만 조회" 정책이라 로그인 안 한 상태에서는 행이 있어도 0 으로 보입니다.
// 0 을 "계정 없음" 으로 오해하게 만들어서, 계정 확인은 SQL 로 해야 합니다.
const tables = ["hero_slides", "works", "quotes"];

/** 어느 SQL 파일이 그 테이블을 만드는지 */
const madeBy = {
  hero_slides: "supabase/migrations/0001_init.sql",
  works: "supabase/migrations/0001_init.sql",
  quotes: "supabase/migrations/0002_quotes.sql",
};
const counts = {};
let unreachable = false;

/** 네트워크·주소 문제인지(= 프로젝트에 닿지도 못함) 판별 */
function isUnreachable(msg = "") {
  return /fetch failed|ENOTFOUND|ECONNREFUSED|getaddrinfo|network/i.test(msg);
}

for (const t of tables) {
  try {
    /**
     * ⚠️ `head: true` 를 쓰면 안 됩니다.
     *    HEAD 응답에는 본문이 없어서 supabase-js 가 오류 내용을 읽지 못하고
     *    error 를 null 로 넘깁니다. 그러면 **테이블이 없어도 통과**로 보입니다.
     *    실제로 그렇게 오판한 적이 있어, 본문이 오는 일반 GET 으로 확인합니다.
     */
    const { error, count } = await supabase
      .from(t)
      .select("id", { count: "exact" })
      .limit(1);

    if (error) {
      if (isUnreachable(error.message)) {
        fail(
          `프로젝트에 접속하지 못했습니다: ${url}`,
          "· 주소에 오타가 없는지 확인하세요 (대시보드의 Project URL 을 그대로 복사)\n" +
            "· 프로젝트가 일시정지(Paused) 상태는 아닌지 확인하세요\n" +
            "  — 무료 플랜은 일주일간 사용이 없으면 자동으로 멈춥니다.\n" +
            "    대시보드에서 Restore project 를 누르면 다시 살아납니다.\n" +
            "· 인터넷 연결을 확인하세요"
        );
        unreachable = true;
        break; // 나머지 검사도 전부 같은 이유로 실패하므로 중단
      }
      if (/does not exist|schema cache|relation/i.test(error.message)) {
        fail(
          `테이블 '${t}' 가 없습니다.` +
            (t === "quotes" ? "  ← 견적 문의가 저장되지 않습니다!" : ""),
          `${madeBy[t]} 를 대시보드 SQL Editor 에 붙여넣고 RUN 하세요.`
        );
      } else if (t === "profiles" && /permission|policy|RLS/i.test(error.message)) {
        // profiles 는 로그인 안 하면 못 읽는 게 정상입니다.
        pass("profiles 테이블 — 접근 차단됨 (RLS 정상 동작)");
      } else {
        fail(`테이블 '${t}' 조회 실패: ${error.message}`);
      }
    } else {
      counts[t] = count ?? 0;
      pass(`테이블 '${t}' — ${count}건`);
    }
  } catch (e) {
    fail(`접속 실패: ${e.message}`, "URL 이 맞는지, 인터넷이 연결됐는지 확인하세요.");
    break;
  }
}

if (unreachable) {
  console.log("\n\x1b[31m● 프로젝트에 접속되지 않아 나머지 검사를 건너뜁니다.\x1b[0m\n");
  process.exit(1);
}

// ---------- 4. 초기 데이터 ----------
if (counts.hero_slides === 0) {
  fail(
    "hero_slides 가 비어 있습니다.",
    "0001_init.sql 의 초기 데이터가 안 들어갔습니다. SQL 을 다시 실행하거나\n" +
      "관리자 화면에서 직접 추가하세요."
  );
}
if (counts.works === 0) {
  fail("works 가 비어 있습니다.", "위와 동일합니다.");
}

// ---------- 5. 스토리지 ----------
try {
  const { error } = await supabase.storage.from("media").list("", { limit: 1 });
  if (error) {
    fail(
      `사진 보관함(media 버킷) 접근 실패: ${error.message}`,
      "0001_init.sql 이 버킷을 만듭니다. SQL 을 실행했는지 확인하세요."
    );
  } else {
    pass("사진 보관함(media 버킷) 정상");
  }
} catch (e) {
  fail(`스토리지 확인 실패: ${e.message}`);
}

// ---------- 6. 관리자 계정 ----------
// anon 권한으로는 auth.users 도 profiles 도 볼 수 없습니다(정상).
// 계정 상태는 대시보드에서 SQL 로 확인해야 합니다.
console.log(
  `\n${TIP} 관리자 계정 상태는 여기서 확인할 수 없습니다(권한 정책상 정상).` +
    `\n${TIP} 로그인이 안 되거나 "권한이 없습니다" 가 뜨면,` +
    `\n${TIP} supabase/make-admin.sql 을 대시보드 SQL Editor 에 붙여넣고 실행하세요.`
);

// ---------- 결과 ----------
console.log(
  failed
    ? "\n\x1b[31m● 위 항목을 해결한 뒤 다시 실행해 주세요.\x1b[0m\n"
    : "\n\x1b[32m● 전부 정상입니다. npm run dev 후 /admin 으로 접속하세요.\x1b[0m\n"
);
process.exit(failed ? 1 : 0);
