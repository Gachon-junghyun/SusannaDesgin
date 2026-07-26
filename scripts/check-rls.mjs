/**
 * 권한(RLS) 검증 — 로그인하지 않은 사람이 데이터를 못 고치는지 실제로 시험합니다.
 *
 *   npm run supabase:rls
 *
 * ⚠️ 판정 기준에 주의:
 *    Postgres 의 RLS 는 UPDATE·DELETE 에서 정책에 안 맞는 행을 **아예 안 보이게** 만듭니다.
 *    그래서 "권한 없음" 에러가 아니라 **0건 처리 + 에러 없음** 으로 끝납니다.
 *    에러 유무만 보면 뚫린 것처럼 오판하므로, 반드시 **실제로 몇 건이 바뀌었는지**로 판정합니다.
 *    (INSERT 는 WITH CHECK 이라 정상적으로 에러가 납니다.)
 */

import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const G = (s) => `\x1b[32m${s}\x1b[0m`;
const R = (s) => `\x1b[31m${s}\x1b[0m`;

if (!existsSync(".env.local")) {
  console.log(R("\n.env.local 이 없습니다. docs/SUPABASE-SETUP.md 를 먼저 진행하세요.\n"));
  process.exit(1);
}

const env = {};
for (const l of readFileSync(".env.local", "utf8").split("\n")) {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.log(R("\n.env.local 값이 비어 있습니다.\n"));
  process.exit(1);
}

const sb = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

console.log("\n\x1b[1m권한 검증 — 로그인 안 한 상태에서 데이터를 고칠 수 있는가\x1b[0m\n");

let bad = 0;
const NOWHERE = "00000000-0000-0000-0000-000000000000";

// 원본 스냅샷
const snap = {
  hero: (await sb.from("hero_slides").select("id,title").order("sort_order")).data ?? [],
  works: (await sb.from("works").select("id", { count: "exact", head: true })).count ?? 0,
};

/** 쓰기 시도 — 에러가 나거나 0건 처리되면 안전 */
async function mustNotWrite(label, run) {
  const { data, error } = await run();
  const rows = data?.length ?? 0;
  if (error) console.log(`  ${G("✔ 차단")}  ${label}  \x1b[2m(거부됨)\x1b[0m`);
  else if (rows === 0) console.log(`  ${G("✔ 차단")}  ${label}  \x1b[2m(0건 처리 — 정책이 행을 숨김)\x1b[0m`);
  else {
    bad++;
    console.log(`  ${R("✘ 뚫림")}  ${label}  → ${rows}건이 실제로 바뀜!`);
  }
}

await mustNotWrite("슬라이드 추가", () =>
  sb.from("hero_slides").insert({ title: "보안시험" }).select());
await mustNotWrite("슬라이드 수정", () =>
  sb.from("hero_slides").update({ title: "보안시험" }).neq("id", NOWHERE).select());
await mustNotWrite("슬라이드 삭제", () =>
  sb.from("hero_slides").delete().neq("id", NOWHERE).select());
await mustNotWrite("실적 추가", () =>
  sb.from("works").insert({ title: "보안시험" }).select());
await mustNotWrite("실적 수정", () =>
  sb.from("works").update({ title: "보안시험" }).neq("id", NOWHERE).select());
await mustNotWrite("실적 삭제", () =>
  sb.from("works").delete().neq("id", NOWHERE).select());
await mustNotWrite("관리자 권한 위조", () =>
  sb.from("profiles").insert({ id: crypto.randomUUID(), role: "admin" }).select());

// 스토리지는 별도 (error 로만 판정)
{
  const { error } = await sb.storage
    .from("media")
    .upload(`__sec-${Date.now()}.txt`, new Blob(["x"]));
  if (error) console.log(`  ${G("✔ 차단")}  사진 업로드  \x1b[2m(거부됨)\x1b[0m`);
  else { bad++; console.log(`  ${R("✘ 뚫림")}  사진 업로드가 됐습니다!`); }
}

/**
 * 견적 문의함 — **개인정보(이름·전화·주소)가 담기는 유일한 테이블**입니다.
 *
 * 필요한 권한 모양이 다른 표들과 반대라 따로 시험합니다.
 *   · 넣기(INSERT)  → **되어야** 정상. 안 되면 견적 폼이 죽습니다.
 *   · 읽기(SELECT)  → **막혀야** 정상. 뚫리면 고객 연락처가 그대로 공개됩니다.
 *
 * ⚠️ 읽기 차단은 **표에 행이 하나라도 있어야** 확실히 판정할 수 있습니다.
 *    비어 있으면 "정책이 막은 것"과 "원래 없는 것"이 똑같이 빈 배열로 보입니다.
 *    그래서 `--write` 를 주면 시험용 문의를 1건 넣고 판정합니다.
 *    (익명은 삭제 권한이 없으므로 그 1건은 `/admin/quotes` 에서 지우셔야 합니다.)
 */
{
  const WRITE = process.argv.includes("--write");
  const stamp = new Date().toISOString();

  // 1) 넣기 — 되어야 정상
  if (WRITE) {
    const { error } = await sb.from("quotes").insert({
      kind: "quick",
      name: "[검증] 지워주세요",
      phone: "010-0000-0000",
      message: `보안 검증용 자동 등록 (${stamp}). /admin/quotes 에서 삭제하세요.`,
    });
    if (error) {
      bad++;
      console.log(`  ${R("✘ 문제")}  견적 문의 넣기가 거부됨 → 견적 폼이 죽습니다! (${error.message})`);
    } else {
      console.log(`  ${G("✔ 정상")}  견적 문의 넣기  \x1b[2m(고객이 폼을 낼 수 있음)\x1b[0m`);
    }
  }

  // 2) 읽기 — 막혀야 정상
  const { data, error } = await sb.from("quotes").select("name,phone,address").limit(5);
  const rows = data?.length ?? 0;

  if (error) {
    console.log(`  ${G("✔ 차단")}  견적 문의 읽기  \x1b[2m(거부됨 — 고객 연락처 안전)\x1b[0m`);
  } else if (rows > 0) {
    bad++;
    console.log(`  ${R("✘ 뚫림")}  견적 문의 읽기 → 고객 개인정보 ${rows}건이 그대로 보입니다!`);
    console.log(`           supabase/migrations/0002_quotes.sql 의 정책을 다시 실행하세요.`);
  } else if (WRITE) {
    // 방금 넣었는데도 안 보인다 = 정책이 확실히 막고 있다
    console.log(`  ${G("✔ 차단")}  견적 문의 읽기  \x1b[2m(방금 넣은 건도 안 보임 — 확실)\x1b[0m`);
    console.log(`           \x1b[2m※ 시험용 문의 1건이 남았습니다. /admin/quotes 에서 삭제하세요.\x1b[0m`);
  } else {
    console.log(`  \x1b[33m… 판정보류\x1b[0m  견적 문의 읽기  \x1b[2m(0건 — 막힌 건지 비어 있는 건지 구분 불가)\x1b[0m`);
    console.log(`           \x1b[2m확실히 보려면: npm run supabase:rls -- --write\x1b[0m`);
  }
}

// 공개 읽기는 되어야 정상 (안 되면 홈페이지가 빈 화면이 됩니다)
{
  const { error } = await sb.from("works").select("id").limit(1);
  if (error) { bad++; console.log(`  ${R("✘ 공개 읽기 차단됨")} — 방문자에게 사이트가 안 보입니다`); }
  else console.log(`  ${G("✔ 정상")}  공개 읽기  \x1b[2m(방문자에게 사이트가 보임)\x1b[0m`);
}

// 실제 훼손 여부 대조
const after = {
  hero: (await sb.from("hero_slides").select("id,title").order("sort_order")).data ?? [],
  works: (await sb.from("works").select("id", { count: "exact", head: true })).count ?? 0,
};
const intact =
  after.works === snap.works &&
  after.hero.length === snap.hero.length &&
  after.hero.every((r, i) => r.title === snap.hero[i]?.title);

console.log(
  `\n  대조: 슬라이드 ${snap.hero.length}→${after.hero.length}건, ` +
    `실적 ${snap.works}→${after.works}건, 내용 ${intact ? "동일" : R("변경됨")}`
);

if (!intact) bad++;

console.log(
  bad
    ? R("\n● 보안 구멍이 있습니다. supabase/migrations/0001_init.sql 의 정책을 다시 실행하세요.\n")
    : G("\n● 전부 차단됨 — 권한 설정 정상\n")
);
process.exit(bad ? 1 : 0);
