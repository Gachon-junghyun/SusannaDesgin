/**
 * CMS 명령줄 도구 — 브라우저 없이 히어로 슬라이드·주요실적을 관리합니다.
 *
 *   npm run cms -- <명령>
 *
 * `/admin` 화면이 하는 일과 **똑같은 권한 경로**를 씁니다.
 * 관리자 이메일·비밀번호로 로그인해 세션을 받고, 그 세션으로만 DB 를 건드립니다.
 * service_role 키는 쓰지 않습니다 — 권한의 최종 판단은 DB 의 RLS 입니다 [원칙 A2].
 *
 * 왜 만들었나: 사진 여러 장을 한 번에 실적으로 등록하는 일을 사람이 화면에서
 * 반복하면 장당 여러 번 클릭입니다. 이 도구는 그 작업을 명령 한 줄로 만듭니다.
 * DB 를 바꾸면 공개 페이지(`/` `/works`)는 force-dynamic 이라 **배포 없이** 반영됩니다.
 */

import { readFileSync, existsSync, statSync } from "node:fs";
import { basename, extname } from "node:path";
import { createClient } from "@supabase/supabase-js";

const B = (s) => `\x1b[1m${s}\x1b[0m`;
const D = (s) => `\x1b[2m${s}\x1b[0m`;
const G = (s) => `\x1b[32m${s}\x1b[0m`;
const R = (s) => `\x1b[31m${s}\x1b[0m`;
const Y = (s) => `\x1b[33m${s}\x1b[0m`;

const MEDIA_BUCKET = "media";
const MAX_BYTES = 10 * 1024 * 1024; // ImageField.tsx 와 같은 한도
const IMAGE_TYPES = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".avif": "image/avif",
  ".svg": "image/svg+xml",
};

/** 오류로 끝냅니다. process.exit() 은 쓰지 않습니다 — fetch 소켓이 닫히는 중에
 *  강제 종료하면 Windows 에서 libuv assertion 이 찍힙니다(다른 스크립트와 같은 이유). */
function die(msg, tip) {
  console.log(`\n${R("✘")} ${msg}`);
  if (tip) tip.split("\n").forEach((t) => console.log(D(`   → ${t}`)));
  console.log("");
  process.exitCode = 1;
  throw new Bail();
}
class Bail extends Error {}

// ---------------------------------------------------------------
// 설정 읽기
// ---------------------------------------------------------------

/** `.env.local` 을 직접 읽습니다 (next 없이 단독 실행하기 위해) */
function loadEnv() {
  const out = {};
  if (!existsSync(".env.local")) return out;
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (m) out[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

/**
 * 분류 목록은 `config/content.ts` 에서 읽어 옵니다.
 * 여기 복사해 두면 화면의 필터 탭과 어긋나 "분류는 있는데 탭에 안 뜨는" 실적이
 * 생깁니다 [원칙 A5]. 다른 스크립트도 같은 방식으로 config 를 읽습니다.
 */
function loadCategories() {
  try {
    const src = readFileSync("config/content.ts", "utf8");
    const block = src.match(/export const workCategories\s*=\s*\[([\s\S]*?)\]/)?.[1];
    if (!block) return null;
    const list = [...block.matchAll(/["']([^"']+)["']/g)].map((m) => m[1]);
    return list.filter((c) => c !== "전체"); // "전체" 는 필터 탭용, 저장값이 아님
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------
// 인자 파싱
// ---------------------------------------------------------------

const argv = process.argv.slice(2);
const positional = [];
const flags = {};

for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a.startsWith("--")) {
    const [key, inline] = a.slice(2).split("=");
    const next = argv[i + 1];
    if (inline !== undefined) flags[key] = inline;
    // `next` 를 그냥 참으로 검사하면 안 됩니다 — `--title ""` 의 빈 문자열이 falsy 라
    // 값 없는 플래그로 잡히고, 지우려던 값이 그대로 남습니다.
    else if (next !== undefined && !next.startsWith("--")) flags[key] = argv[++i];
    else flags[key] = true;
  } else {
    positional.push(a);
  }
}

const has = (k) => Object.prototype.hasOwnProperty.call(flags, k);

/**
 * 값이 있어야 하는 플래그를 읽습니다.
 * `--title` 처럼 값 없이 오면 멈춥니다 — 조용히 빈 값으로 처리하면 **제목을 지웁니다.**
 * 정말 비우려면 `--title ""` 로 빈 문자열을 명시하게 합니다.
 */
function str(k) {
  const v = flags[k];
  if (v === undefined) return undefined;
  if (v === true) die(`--${k} 에 값이 없습니다.`, `값을 주세요:  --${k} "내용"\n정말 비우려면 빈 문자열:  --${k} ""`);
  return v.trim();
}
const toTags = (raw) => raw.split(",").map((t) => t.trim()).filter(Boolean);

const USAGE = `
${B("CMS 명령줄 도구")}   ${D("npm run cms -- <명령>")}

  ${B("조회")}
    list hero                       히어로 슬라이드 전부 (미공개 포함)
    list works                      주요실적 전부 (미공개 포함)
    list quotes                     견적 문의 ${D("건수만")} — 내용은 /admin/quotes 에서

  ${B("사진")}
    upload <파일...>                media 버킷에 올리고 공개 URL 을 출력

  ${B("히어로 슬라이드")}
    hero add    --image <URL|파일> --title "..." [--eyebrow "..."] [--sub "..."] [--alt "..."] [--draft]
    hero set    <id> [위와 같은 항목 중 바꿀 것만] [--publish|--draft]
    hero move   <id> up|down
    hero rm     <id> --yes

  ${B("주요실적")}
    works add   --image <URL|파일> --title "..." --category "..." [--location "..."] [--tags "a,b"] [--draft]
    works set   <id> [바꿀 것만] [--publish|--draft]
    works move  <id> up|down
    works rm    <id> --yes
    works batch <계획.json>         ${D("사진 여러 장을 한 번에 — 아래 참조")}

  ${B("정리")}
    hero renumber / works renumber   순서값을 10,20,30… 으로 다시 매김

${B("works batch 계획 파일")} ${D("(image 는 로컬 파일 경로 또는 https:// URL)")}
  [
    { "image": "./사진/a.jpg", "title": "태평한우", "category": "상업시설",
      "location": "대전 유성구", "tags": ["채널 간판", "야간 점등"] }
  ]

${D("--yes 없는 rm 은 지울 대상만 보여주고 아무것도 하지 않습니다.")}
${D("사진·글을 바꾸면 공개 페이지에 배포 없이 바로 반영됩니다.")}
`;

// ---------------------------------------------------------------
// 로그인
// ---------------------------------------------------------------

async function signIn() {
  const env = { ...loadEnv(), ...process.env };
  const url = (env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
  const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  const email = env.SUPABASE_ADMIN_EMAIL || "";
  const password = env.SUPABASE_ADMIN_PASSWORD || "";

  if (!url || !key) {
    die(
      "Supabase 접속 정보가 없습니다.",
      ".env.local 의 NEXT_PUBLIC_SUPABASE_URL · NEXT_PUBLIC_SUPABASE_ANON_KEY 를 채우세요.\n" +
        "진단: npm run supabase:check"
    );
  }
  if (!email || !password) {
    die(
      "관리자 로그인 정보가 없습니다.",
      ".env.local 에 아래 두 줄을 넣으세요 (관리자 화면에 쓰는 그 계정입니다).\n" +
        "  SUPABASE_ADMIN_EMAIL=you@example.com\n" +
        "  SUPABASE_ADMIN_PASSWORD=비밀번호\n" +
        ".env.local 은 git 에 올라가지 않습니다."
    );
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    die(
      `로그인 실패: ${error.message}`,
      "· 이메일·비밀번호를 확인하세요 (관리자 화면에서 되는 그 값인지)\n" +
        "· 계정이 있는데도 안 되면 supabase/make-admin.sql 을 SQL Editor 에서 실행하세요"
    );
  }

  // 관리자인지 먼저 확인합니다. viewer 계정이면 RLS 가 조용히 0건을 돌려주므로,
  // "지웠는데 그대로" 같은 모양으로 나타나 원인을 찾기 어렵습니다.
  const { data: me } = await supabase
    .from("profiles")
    .select("role, email")
    .eq("id", data.user.id)
    .maybeSingle();

  if (me?.role !== "admin") {
    die(
      `이 계정은 관리자가 아닙니다 (role: ${me?.role ?? "확인 불가"}).`,
      "supabase/make-admin.sql 을 대시보드 SQL Editor 에서 실행해 admin 으로 올리세요."
    );
  }

  console.log(D(`  로그인: ${me.email ?? data.user.email}  (admin)`));
  return supabase;
}

// ---------------------------------------------------------------
// 사진 업로드
// ---------------------------------------------------------------

/** 로컬 파일이면 올려서 공개 URL 로 바꾸고, 이미 URL 이면 그대로 돌려줍니다. */
async function resolveImage(supabase, value) {
  if (!value) return "";
  if (/^https?:\/\//.test(value) || value.startsWith("/images/")) return value;

  if (!existsSync(value)) {
    die(`사진 파일을 찾을 수 없습니다: ${value}`, "경로를 확인하세요. 따옴표로 감싸면 공백도 됩니다.");
  }

  const ext = extname(value).toLowerCase();
  const contentType = IMAGE_TYPES[ext];
  if (!contentType) {
    die(
      `이미지 파일이 아닙니다: ${basename(value)}`,
      `확장자는 ${Object.keys(IMAGE_TYPES).join(" · ")} 중 하나여야 합니다.`
    );
  }

  const size = statSync(value).size;
  if (size > MAX_BYTES) {
    die(
      `파일이 너무 큽니다: ${basename(value)} (${(size / 1024 / 1024).toFixed(1)}MB)`,
      "10MB 이하로 줄여 주세요. 관리자 화면과 같은 한도입니다."
    );
  }

  // 원본 파일명은 쓰지 않습니다 — 이름이 공개 URL 에 그대로 드러나고 충돌합니다.
  const path = `${crypto.randomUUID()}${ext}`;
  const body = readFileSync(value);

  const { error } = await supabase.storage
    .from(MEDIA_BUCKET)
    .upload(path, body, { contentType, cacheControl: "31536000", upsert: false });

  if (error) die(`업로드 실패 (${basename(value)}): ${error.message}`);

  const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path);
  console.log(`  ${G("↑")} ${basename(value)} ${D(`(${(size / 1024).toFixed(0)}KB)`)} → ${data.publicUrl}`);
  return data.publicUrl;
}

// ---------------------------------------------------------------
// 표 출력
// ---------------------------------------------------------------

/** 스토리지 URL 은 길어서 표를 망칩니다. 알아볼 만큼만 줄입니다. */
function shortImage(url) {
  if (!url) return R("사진없음");
  if (url.startsWith("/images/")) return url;
  const file = url.split("/").pop() ?? url;
  return D("스토리지 ") + file.slice(0, 8) + "…";
}

function mark(published) {
  return published ? G("공개") : Y("비공개");
}

// ---------------------------------------------------------------
// 명령
// ---------------------------------------------------------------

const TABLE = { hero: "hero_slides", works: "works" };

async function listHero(supabase) {
  const { data, error } = await supabase
    .from("hero_slides")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) die(`조회 실패: ${error.message}`);

  console.log(`\n${B("히어로 슬라이드")} ${D(`${data.length}건`)}\n`);
  for (const r of data) {
    console.log(`  ${D(r.sort_order.toString().padStart(4))}  ${mark(r.published)}  ${B(r.title || "(제목없음)")}`);
    console.log(`        ${D(r.id)}`);
    if (r.eyebrow || r.sub) console.log(`        ${D(`${r.eyebrow} / ${r.sub}`)}`);
    console.log(`        ${shortImage(r.image_url)}   alt: ${r.alt || R("없음")}`);
  }
  console.log("");
}

async function listWorks(supabase) {
  const { data, error } = await supabase
    .from("works")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) die(`조회 실패: ${error.message}`);

  console.log(`\n${B("주요실적")} ${D(`${data.length}건`)}\n`);
  for (const r of data) {
    console.log(
      `  ${D(r.sort_order.toString().padStart(4))}  ${mark(r.published)}  ${B(r.title)}` +
        `  ${D(`[${r.category}]`)}${r.location ? ` ${D(r.location)}` : ""}`
    );
    console.log(`        ${D(r.id)}`);
    console.log(
      `        ${shortImage(r.image_url)}${r.tags?.length ? `   ${D(r.tags.join(" · "))}` : ""}`
    );
  }
  console.log("");
}

/**
 * 견적 문의는 **건수만** 봅니다.
 * 행에 고객 이름·전화번호가 들어 있어서, 터미널에 찍으면 개인정보가
 * 셸 기록과 작업 로그에 남습니다. 내용은 `/admin/quotes` 에서 봅니다.
 */
async function listQuotes(supabase) {
  const { count: total, error: e1 } = await supabase
    .from("quotes")
    .select("id", { count: "exact" })
    .limit(1);
  if (e1) die(`조회 실패: ${e1.message}`);

  const { count: pending, error: e2 } = await supabase
    .from("quotes")
    .select("id", { count: "exact" })
    .eq("handled", false)
    .limit(1);
  if (e2) die(`조회 실패: ${e2.message}`);

  console.log(`\n${B("견적 문의")}`);
  console.log(`  전체 ${total ?? 0}건 · 미확인 ${pending ? Y(`${pending}건`) : "0건"}`);
  console.log(D("  내용(이름·연락처)은 개인정보라 여기 찍지 않습니다 — /admin/quotes 에서 보세요.\n"));
}

/** sort_order 가 겹치면 순서 바꾸기가 동작하지 않습니다. 10 단위로 다시 매깁니다. */
async function renumber(supabase, group) {
  const table = TABLE[group];
  const { data, error } = await supabase
    .from(table)
    .select("id, sort_order")
    .order("sort_order", { ascending: true });
  if (error) die(`조회 실패: ${error.message}`);

  let n = 0;
  for (const [i, row] of data.entries()) {
    const want = (i + 1) * 10;
    if (row.sort_order === want) continue;
    const { error: e } = await supabase.from(table).update({ sort_order: want }).eq("id", row.id);
    if (e) die(`순서 갱신 실패: ${e.message}`);
    n++;
  }
  console.log(`\n${G("✔")} 순서값을 다시 매겼습니다 — ${data.length}건 중 ${n}건 변경\n`);
}

async function move(supabase, group, id, dir) {
  if (!id || !["up", "down"].includes(dir)) {
    die("사용법: cms " + group + " move <id> up|down");
  }
  const table = TABLE[group];

  const { data, error } = await supabase
    .from(table)
    .select("id, sort_order")
    .order("sort_order", { ascending: true });
  if (error) die(`조회 실패: ${error.message}`);

  // 값이 겹쳐 있으면 맞바꿔도 순서가 안 바뀝니다. 먼저 정리하도록 안내합니다.
  const orders = data.map((r) => r.sort_order);
  if (new Set(orders).size !== orders.length) {
    die(
      "순서값이 겹쳐 있어 순서를 바꿀 수 없습니다.",
      `먼저 실행하세요:  npm run cms -- ${group} renumber`
    );
  }

  const i = data.findIndex((r) => r.id === id);
  if (i < 0) die(`그런 항목이 없습니다: ${id}`, `목록 확인:  npm run cms -- list ${group}`);
  const j = dir === "up" ? i - 1 : i + 1;
  if (j < 0 || j >= data.length) {
    console.log(`\n${Y("○")} 이미 ${dir === "up" ? "맨 위" : "맨 아래"}입니다. 아무것도 하지 않았습니다.\n`);
    return;
  }

  await supabase.from(table).update({ sort_order: data[j].sort_order }).eq("id", data[i].id);
  await supabase.from(table).update({ sort_order: data[i].sort_order }).eq("id", data[j].id);
  console.log(`\n${G("✔")} ${dir === "up" ? "위로" : "아래로"} 옮겼습니다.\n`);
}

async function remove(supabase, group, id) {
  if (!id) die(`사용법: cms ${group} rm <id> --yes`);
  const table = TABLE[group];

  const { data, error } = await supabase.from(table).select("*").eq("id", id).maybeSingle();
  if (error) die(`조회 실패: ${error.message}`);
  if (!data) die(`그런 항목이 없습니다: ${id}`, `목록 확인:  npm run cms -- list ${group}`);

  console.log(`\n${B("지울 대상")}`);
  console.log(`  ${data.title || "(제목없음)"}  ${D(shortImage(data.image_url))}`);

  if (!has("yes")) {
    console.log(`\n${Y("○")} 확인용 미리보기입니다. 정말 지우려면 ${B("--yes")} 를 붙이세요.`);
    console.log(D("   되돌릴 수 없습니다. 스토리지의 사진 파일은 남습니다(§7 고아 파일).\n"));
    return;
  }

  const { error: delErr } = await supabase.from(table).delete().eq("id", id);
  if (delErr) die(`삭제 실패: ${delErr.message}`);
  console.log(`\n${G("✔")} 지웠습니다.\n`);
}

/** add 는 맨 뒤에 붙입니다 (관리자 화면과 같은 규칙: 마지막 + 10) */
async function nextSortOrder(supabase, table) {
  const { data } = await supabase
    .from(table)
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.sort_order ?? 0) + 10;
}

async function addHero(supabase) {
  const image_url = await resolveImage(supabase, str("image") ?? "");
  if (!image_url) die("사진이 필요합니다.", "--image <파일경로 또는 https:// URL>");
  const title = str("title");
  if (!title) die("제목이 필요합니다.", '--title "첫 화면에 크게 들어갈 문구"');

  const alt = str("alt") ?? "";
  if (!alt) console.log(Y("  ⚠ --alt 가 비어 있습니다. 화면 낭독기 사용자와 검색엔진이 읽는 설명입니다."));

  const row = {
    eyebrow: str("eyebrow") ?? "",
    title,
    sub: str("sub") ?? "",
    image_url,
    alt,
    published: !has("draft"),
    sort_order: await nextSortOrder(supabase, "hero_slides"),
  };

  const { data, error } = await supabase.from("hero_slides").insert(row).select("id").single();
  if (error) die(`저장 실패: ${error.message}`);
  console.log(`\n${G("✔")} 슬라이드 추가 — ${B(title)} ${mark(row.published)}  ${D(data.id)}\n`);
}

async function addWork(supabase, categories) {
  const image_url = await resolveImage(supabase, str("image") ?? "");
  const title = str("title");
  if (!title) die("현장 이름이 필요합니다.", '--title "태평한우"');

  const category = str("category") ?? "";
  checkCategory(category, categories);

  const row = {
    title,
    category,
    location: str("location") ?? "",
    tags: toTags(str("tags") ?? ""),
    image_url,
    published: !has("draft"),
    sort_order: await nextSortOrder(supabase, "works"),
  };

  const { data, error } = await supabase.from("works").insert(row).select("id").single();
  if (error) die(`저장 실패: ${error.message}`);
  console.log(`\n${G("✔")} 실적 추가 — ${B(title)} ${D(`[${category}]`)} ${mark(row.published)}  ${D(data.id)}\n`);
}

function checkCategory(category, categories) {
  if (!category) {
    die(
      "분류가 필요합니다.",
      categories ? `쓸 수 있는 값: ${categories.join(" · ")}` : '--category "상업시설"'
    );
  }
  if (categories && !categories.includes(category)) {
    die(
      `없는 분류입니다: ${category}`,
      `쓸 수 있는 값: ${categories.join(" · ")}\n` +
        "새 분류를 만들려면 config/content.ts 의 workCategories 에 먼저 넣으세요 —\n" +
        "거기 없으면 /works 의 필터 탭에 안 뜨고 그 실적은 아무 탭에도 안 보입니다."
    );
  }
}

async function setRow(supabase, group, id, categories) {
  if (!id) die(`사용법: cms ${group} set <id> --title "..." 등`);
  const table = TABLE[group];

  const { data: before, error } = await supabase.from(table).select("*").eq("id", id).maybeSingle();
  if (error) die(`조회 실패: ${error.message}`);
  if (!before) die(`그런 항목이 없습니다: ${id}`, `목록 확인:  npm run cms -- list ${group}`);

  const patch = {};
  if (has("image")) patch.image_url = await resolveImage(supabase, str("image") ?? "");
  if (has("title")) patch.title = str("title") ?? "";
  if (has("publish")) patch.published = true;
  if (has("draft")) patch.published = false;

  if (group === "hero") {
    if (has("eyebrow")) patch.eyebrow = str("eyebrow") ?? "";
    if (has("sub")) patch.sub = str("sub") ?? "";
    if (has("alt")) patch.alt = str("alt") ?? "";
  } else {
    if (has("category")) {
      patch.category = str("category") ?? "";
      checkCategory(patch.category, categories);
    }
    if (has("location")) patch.location = str("location") ?? "";
    if (has("tags")) patch.tags = toTags(str("tags") ?? "");
  }

  if (Object.keys(patch).length === 0) {
    die("바꿀 항목이 없습니다.", "--title --image --category --location --tags --publish --draft 중 하나 이상");
  }

  const { error: upErr } = await supabase.from(table).update(patch).eq("id", id);
  if (upErr) die(`저장 실패: ${upErr.message}`);

  console.log(`\n${G("✔")} 수정 — ${B(patch.title ?? before.title)}`);
  for (const [k, v] of Object.entries(patch)) {
    console.log(`     ${D(k)}: ${k === "image_url" ? shortImage(v) : JSON.stringify(v)}`);
  }
  console.log("");
}

/**
 * 사진 여러 장을 한 번에 실적으로 등록합니다.
 * 사진마다 업로드 → 행 추가를 순서대로 하고, 한 건이 실패하면 거기서 멈춥니다
 * (뒤엣것까지 밀어 넣어 절반만 들어간 상태를 만들지 않기 위해).
 */
async function batchWorks(supabase, planPath, categories) {
  if (!planPath) die("사용법: cms works batch <계획.json>", "형식은 npm run cms -- help 참조");
  if (!existsSync(planPath)) die(`계획 파일이 없습니다: ${planPath}`);

  let plan;
  try {
    plan = JSON.parse(readFileSync(planPath, "utf8"));
  } catch (e) {
    die(`계획 파일을 읽지 못했습니다: ${e.message}`, "JSON 형식이 맞는지 확인하세요 (쉼표·따옴표).");
  }
  if (!Array.isArray(plan) || plan.length === 0) die("계획 파일이 배열이 아니거나 비어 있습니다.");

  // 넣기 전에 전부 검사합니다 — 4번째에서 분류가 틀려 멈추면 3건만 들어간 상태가 됩니다.
  plan.forEach((item, i) => {
    const at = `${i + 1}번째 항목`;
    if (!item.title) die(`${at}: title 이 없습니다.`);
    if (!item.image) die(`${at} (${item.title}): image 가 없습니다.`);
    checkCategory(item.category ?? "", categories);
    if (typeof item.image === "string" && !/^https?:\/\//.test(item.image) && !item.image.startsWith("/images/") && !existsSync(item.image)) {
      die(`${at} (${item.title}): 사진 파일이 없습니다 — ${item.image}`);
    }
  });

  console.log(`\n${B(`실적 ${plan.length}건 등록`)}\n`);

  let order = await nextSortOrder(supabase, "works");
  const done = [];

  for (const item of plan) {
    const image_url = await resolveImage(supabase, item.image);
    const row = {
      title: item.title,
      category: item.category,
      location: item.location ?? "",
      tags: Array.isArray(item.tags) ? item.tags : toTags(String(item.tags ?? "")),
      image_url,
      published: item.published !== false,
      sort_order: order,
    };
    const { data, error } = await supabase.from("works").insert(row).select("id").single();
    if (error) {
      console.log(`\n${R("✘")} ${item.title} 저장 실패: ${error.message}`);
      console.log(D(`   여기서 멈춥니다. ${done.length}건은 이미 들어갔습니다.\n`));
      process.exitCode = 1;
      return;
    }
    console.log(`  ${G("✔")} ${B(item.title)} ${D(`[${item.category}] ${row.location}`)} ${mark(row.published)}`);
    done.push(data.id);
    order += 10;
  }

  console.log(`\n${G("✔")} ${done.length}건 등록 완료. ${D("배포 없이 /works 와 홈에 바로 반영됩니다.")}\n`);
}

// ---------------------------------------------------------------
// 실행
// ---------------------------------------------------------------

const [group, action, ...rest] = positional;

async function main() {
  if (!group || group === "help" || has("help")) {
    console.log(USAGE);
    return;
  }

  const categories = loadCategories();
  if (!categories) {
    console.log(Y("  ⚠ config/content.ts 에서 분류 목록을 못 읽었습니다. 분류 검사를 건너뜁니다."));
  }

  const supabase = await signIn();

  if (group === "list") {
    if (action === "hero") return listHero(supabase);
    if (action === "works") return listWorks(supabase);
    if (action === "quotes") return listQuotes(supabase);
    die("사용법: cms list hero|works|quotes");
  }

  if (group === "upload") {
    const files = [action, ...rest].filter(Boolean);
    if (files.length === 0) die("사용법: cms upload <파일...>");
    console.log("");
    for (const f of files) await resolveImage(supabase, f);
    console.log(D("\n  위 URL 을 --image 값으로 쓰거나, 곧바로 add 에 파일 경로를 넘겨도 됩니다.\n"));
    return;
  }

  if (group === "hero" || group === "works") {
    if (action === "add") return group === "hero" ? addHero(supabase) : addWork(supabase, categories);
    if (action === "set") return setRow(supabase, group, rest[0], categories);
    if (action === "move") return move(supabase, group, rest[0], rest[1]);
    if (action === "rm") return remove(supabase, group, rest[0]);
    if (action === "renumber") return renumber(supabase, group);
    if (action === "batch" && group === "works") return batchWorks(supabase, rest[0], categories);
    die(`모르는 명령입니다: ${group} ${action ?? ""}`, "사용법:  npm run cms -- help");
  }

  die(`모르는 명령입니다: ${group}`, "사용법:  npm run cms -- help");
}

try {
  await main();
} catch (e) {
  if (!(e instanceof Bail)) {
    console.log(`\n${R("✘")} 예상 못 한 오류: ${e.message}\n`);
    process.exitCode = 1;
  }
}
