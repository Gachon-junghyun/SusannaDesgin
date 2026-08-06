/**
 * 견적 첨부파일 보관이 실제로 되는지 점검 — 마이그레이션 `0006` 실행 뒤에 돌리세요.
 *
 *   npm run quotes:check
 *
 * 눈으로 확인할 수 없는 것을 대신 확인합니다.
 *   1) `quote-files` 버킷이 있고 **비공개**인가
 *   2) 로그인 없이(홈페이지 문의 폼과 같은 권한) 올릴 수 있는가
 *   3) 그 파일을 **익명은 못 읽는가**  ← 이게 통과하지 않으면 고객 사진이 공개됩니다
 *   4) 관리자는 서명 URL 로 실제로 내려받을 수 있는가
 *   5) 관리자가 지울 수 있는가 (개인정보 보유기간)
 *
 * 시험 파일은 끝나면 지웁니다. 실패로 남은 게 있으면 경로를 알려 줍니다.
 */

import { existsSync, readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const G = (s) => `\x1b[32m${s}\x1b[0m`;
const R = (s) => `\x1b[31m${s}\x1b[0m`;
const D = (s) => `\x1b[2m${s}\x1b[0m`;

const BUCKET = "quote-files";

let bad = 0;
const pass = (m, d) => console.log(`  ${G("✔")} ${m}${d ? D(`  — ${d}`) : ""}`);
const fail = (m, d) => {
  bad++;
  console.log(`  ${R("✘")} ${m}${d ? `\n      ${D(d)}` : ""}`);
};

if (!existsSync(".env.local")) {
  console.log(R("\n.env.local 이 없습니다.\n"));
  process.exit(1);
}

const env = {};
for (const l of readFileSync(".env.local", "utf8").split("\n")) {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.log(R("\nNEXT_PUBLIC_SUPABASE_URL / ANON_KEY 가 없습니다.\n"));
  process.exit(1);
}

console.log("\n\x1b[1m견적 첨부파일 보관 점검\x1b[0m\n");

const anon = createClient(url, anonKey, { auth: { persistSession: false } });

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const path = `_check/${stamp}.txt`;
const body = `수산나디자인 첨부 보관 점검 ${stamp}`;

// 1·2) 익명 업로드 — 홈페이지 문의 폼과 똑같은 권한입니다
const up = await anon.storage
  .from(BUCKET)
  .upload(path, new Blob([body], { type: "text/plain" }), { contentType: "text/plain" });

if (up.error) {
  const msg = up.error.message || "";
  if (/bucket not found/i.test(msg)) {
    fail(
      "버킷 quote-files 가 없습니다",
      "supabase/migrations/0006_quote_files.sql 을 SQL Editor 에서 실행하세요."
    );
  } else if (/row-level security|policy|Unauthorized/i.test(msg)) {
    fail(
      "익명 업로드가 막혀 있습니다 — 고객이 사진을 못 올립니다",
      `0006 의 quote_files_public_insert 정책을 확인하세요. (${msg})`
    );
  } else {
    fail("익명 업로드 실패", msg);
  }
  console.log(R("\n● 여기서 막히면 아래 항목은 볼 필요가 없습니다.\n"));
  process.exitCode = 1;
} else {
  pass("익명으로 업로드됨", path);

  // 3) 익명은 못 읽어야 합니다 — 공개 URL·서명 URL 양쪽 다
  const publicUrl = anon.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  const direct = await fetch(publicUrl).catch(() => null);
  if (direct && direct.ok) {
    fail(
      "버킷이 공개 상태입니다 — 주소만 알면 고객 사진이 열립니다",
      "0006 의 storage.buckets 줄(public = false)을 다시 실행하세요."
    );
  } else {
    pass("익명 직접 접근 차단됨", `HTTP ${direct ? direct.status : "요청 실패"}`);
  }

  const anonSign = await anon.storage.from(BUCKET).createSignedUrl(path, 60);
  if (anonSign.data?.signedUrl) {
    fail(
      "익명이 서명 URL 을 발급받았습니다 — 남의 문의 첨부를 열 수 있습니다",
      "0006 의 quote_files_admin_read 정책이 authenticated 전용인지 확인하세요."
    );
  } else {
    pass("익명 서명 URL 발급 차단됨");
  }

  // 4·5) 관리자 경로
  if (!env.SUPABASE_ADMIN_EMAIL || !env.SUPABASE_ADMIN_PASSWORD) {
    console.log(
      `  ${D("… 건너뜀")} 관리자 열람·삭제 ${D("(SUPABASE_ADMIN_EMAIL/PASSWORD 없음)")}`
    );
    console.log(D(`      시험 파일이 남았습니다: ${BUCKET}/${path}`));
  } else {
    const admin = createClient(url, anonKey, { auth: { persistSession: false } });
    const { error: loginError } = await admin.auth.signInWithPassword({
      email: env.SUPABASE_ADMIN_EMAIL,
      password: env.SUPABASE_ADMIN_PASSWORD,
    });

    if (loginError) {
      fail("관리자 로그인 실패", loginError.message);
      console.log(D(`      시험 파일이 남았습니다: ${BUCKET}/${path}`));
    } else {
      const signed = await admin.storage.from(BUCKET).createSignedUrl(path, 60);

      if (!signed.data?.signedUrl) {
        fail(
          "관리자가 서명 URL 을 못 받았습니다 — 화면에서 첨부를 못 엽니다",
          signed.error?.message
        );
      } else {
        const res = await fetch(signed.data.signedUrl);
        const text = res.ok ? await res.text() : "";
        if (text === body) pass("관리자 서명 URL 로 내용까지 확인됨");
        else fail("서명 URL 로 받은 내용이 다릅니다", `HTTP ${res.status}`);
      }

      const del = await admin.storage.from(BUCKET).remove([path]);
      if (del.error) {
        fail("관리자 삭제 실패 — 문의를 지워도 첨부가 남습니다", del.error.message);
        console.log(D(`      시험 파일이 남았습니다: ${BUCKET}/${path}`));
      } else {
        pass("관리자 삭제됨", "시험 파일 정리 완료");
      }
    }
  }

  console.log(
    bad
      ? R("\n● 실패한 항목이 있습니다. 위 안내대로 0006 을 다시 실행하세요.\n")
      : G("\n● 첨부 보관이 정상입니다.\n")
  );
  process.exitCode = bad ? 1 : 0;
}
