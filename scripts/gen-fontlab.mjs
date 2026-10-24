/**
 * 글꼴 공방(F26-m) 바탕 글꼴 목록 만들기 — `config/fontLab.ts` 의 «생성» 구역과 `public/images/fontlab/` 를 다시 씁니다.
 *
 *   node scripts/gen-fontlab.mjs [--src <SusannaDesigner 폴더>]
 *
 * 원본(읽기만): 형제 저장소 `SusannaDesigner`
 *   - `study/2026-10-24_hangul-font/page/fonts/catalog.json` — 시제품 목록 189종(이름·갈래·라이선스·저작권·예약 이름·음절 수·미리보기 그림)
 *   - `refs/fonts/_more.json` — 나눔·GitHub·zip 배포 글꼴의 출처·예약 이름(조사 원장)
 *   - `refs/fonts/_research/nanum_clova_urls.tsv` — 나눔손글씨 109종의 배포처 TTF 주소
 *   - `refs/fonts/_research/candidates.md` — 라이선스 원문 인용과 등급(근거)
 * 🔴 시제품 `catalog.json` 의 `file` 은 시제품용 2,350자 묶음이라 **쓰지 않습니다** — 아래 규칙으로 원본 11,172자 파일 주소를 만듭니다.
 *
 * 주소 규칙 (2026-10-25 실측 — 전 주소에 `Origin` 을 붙여 요청해 200/206 · `Access-Control-Allow-Origin: *`):
 *   - `g-<폴더>`  구글 폰트 → `cdn.jsdelivr.net/gh/google/fonts@main/ofl/<폴더>/<원본 파일>`
 *   - `ge-…`      구글 폰트 저장소에만 있는 것(제주·KoPub·한나 2013) → 같은 규칙, 폴더는 출처 주소의 끝
 *   - `n-…` 나눔손글씨 → `nanum_clova_urls.tsv` (hangeul.naver.com/hangeul_static/webfont/clova/…)
 *   - `n-…` 나눔 계열 11 · `gh-…` GitHub OFL → 아래 `DIRECT` 표(배포처가 zip 만 걸어 둔 것도 웹폰트 CSS·저장소 안에 낱개 TTF/OTF 가 있음)
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const argSrc = process.argv.indexOf("--src");
const SRC = argSrc > 0 ? resolve(process.argv[argSrc + 1]) : [resolve(ROOT, "..", "SusannaDesigner"), resolve(ROOT, "..", "..", "SusannaDesigner")].find(existsSync);
if (!SRC || !existsSync(SRC)) {
  console.error("SusannaDesigner 폴더를 못 찾았습니다. --src <폴더> 로 알려 주세요.");
  process.exit(1);
}
const STUDY = join(SRC, "study", "2026-10-24_hangul-font", "page", "fonts");
const REFS = join(SRC, "refs", "fonts");
const OUT_TS = join(ROOT, "config", "fontLab.ts");
const OUT_IMG = join(ROOT, "public", "images", "fontlab");

const J = "https://cdn.jsdelivr.net/gh/";
const NAVER = "https://hangeul.naver.com/hangeul_static/webfont/";

/** 뺀 것 — 사람 결정(2026-10-24) */
const EXCLUDE_PREFIX = {
  "bm-": "zip 으로만 배포(배민) — 낱개 파일 주소가 없어 브라우저가 바로 못 읽음",
  "c24-": "zip 으로만 배포(카페24)",
  "kk-": "zip 으로만 배포(카카오)",
  "ln-": "zip 으로만 배포(LINE)",
};
/** 사람이 «넣지 않음»으로 정한 것 — 수정본 배포 허용이 서체 조항에 없음. 시제품 목록에도 없지만 들어오면 막습니다 */
const EXCLUDE_NAME = [/경기천년/, /부산단디/];
/** 배포처에서 브라우저가 바로 읽을 주소가 없는 것 (2026-10-25 실측) */
const EXCLUDE_ID = {
  "gh-neodgm": "TTF 가 GitHub 릴리스에만 있고 저장소 안에 없어 jsdelivr 로 못 받음(404)",
};

/**
 * 나눔 계열 11 · GitHub OFL 13 — 낱개 원본 주소. 시제품 `srcFile` 과 같은 굵기를 골랐습니다(미리보기 그림과 같은 모양).
 * 나눔 계열 주소의 근거: 배포처 웹폰트 CSS(`hangeul.pstatic.net/hangeul_static/css/<이름>.css`)가 가리키는 TTF.
 * GitHub 의 근거: 저장소 트리(GitHub API)에서 찾은 경로. 태그가 있으면 태그로 고정했습니다.
 */
const DIRECT = {
  // 나눔스퀘어: 시제품은 `_acEB`(2,479자 판). 같은 굵기 비 ac 판이 11,172자
  "n-square": NAVER + "NanumSquare/NanumSquareEB.ttf",
  "n-square-round": NAVER + "NanumSquareRound/NanumSquareRoundL.ttf",
  "n-square-neo": NAVER + "NanumSquareNeo/NanumSquareNeoTTF-eHv.ttf",
  "n-barun-gothic": NAVER + "NanumBarunGothic/NanumBarunGothicWeb.ttf",
  "n-barun-pen": NAVER + "NanumBarunpen/NanumBarunpenB.ttf",
  // 나눔휴먼은 배포처 CSS(`NanumHuman.css`)가 다른 호스트를 가리킵니다 — 같은 네이버 CDN, CORS * 확인
  "n-human": "https://campaign-cdn.pstatic.net/0/hangeul/2022/webfont/NanumHuman/NanumHumanLight.ttf",
  "n-barun-gothic-yet": NAVER + "NanumBarunGothicYetHangul/NanumBarunGothic-YetHangul.ttf",
  "n-myeongjo-yet": NAVER + "NanumMyeongjoYetHangul/NanumMyeongjo-YetHangul.ttf",
  "n-gothic-eco": NAVER + "NanumEco/NanumGothicEco/NanumGothicEco.ttf",
  "n-myeongjo-eco": NAVER + "NanumEco/NanumMyeongjoEco/NanumMyeongjoEco.ttf",
  "n-maruburi": NAVER + "MaruBuri/MaruBuri-Regular.ttf",
  "gh-pretendard": J + "orioncactus/pretendard@v1.3.9/packages/pretendard/dist/public/static/Pretendard-Regular.otf",
  // 스포카: `Subset/` 은 2,350자 판이라 `Original/`(12.6MB)
  "gh-spoqa-neo": J + "spoqa/spoqa-han-sans@v3.3.0/Original/SpoqaHanSansNeo/SpoqaHanSansNeo-Regular.otf",
  "gh-suit": J + "sun-typeface/SUIT@2.0.5/fonts/static/otf/SUIT-Regular.otf",
  "gh-suite": J + "sun-typeface/SUITE@2.0.4/fonts/static/otf/SUITE-Regular.otf",
  "gh-wanted-sans": J + "wanteddev/wanted-sans@v1.0.3/packages/wanted-sans/fonts/otf/WantedSans-Regular.otf",
  "gh-galmuri": J + "quiple/galmuri@v2.40.4/dist/Galmuri11-Bold.ttf",
  "gh-d2coding": J + "naver/d2-coding-font@master/fonts/ttf/D2Coding-Regular.ttf",
  "gh-source-han-sans-kr": J + "adobe-fonts/source-han-sans@release/SubsetOTF/KR/SourceHanSansKR-Regular.otf",
  "gh-source-han-serif-kr": J + "adobe-fonts/source-han-serif@release/SubsetOTF/KR/SourceHanSerifKR-Regular.otf",
  "gh-pyeojin-gothic": J + "Jihwan-Suh/PyeojinGothic@main/fonts/static/otf/PyeojinGothic-Regular.otf",
  // 페이퍼로지·프리젠테이션은 저장소 안에 낱개 파일이 woff2 뿐입니다(`lib/maker/fonts.ts` 가 풀어 읽음)
  "gh-paperlogy": J + "Freesentation/paperlogy@main/woff2/Paperlogy-8ExtraBold.woff2",
  "gh-freesentation": J + "Freesentation/freesentation@main/woff2/Freesentation-9Black.woff2",
  "gh-iropke-batang": J + "iropke/font-iropke-batang@master/IropkeBatangM.otf",
  // 구글 폰트의 Noto Serif KR 가변 파일은 24MB 라 jsdelivr 가 거절합니다(403, 파일 20MB 상한) — 같은 Noto 의 KR 정적 Regular
  "g-notoserifkr": J + "notofonts/noto-cjk@Serif2.003/Serif/SubsetOTF/KR/NotoSerifKR-Regular.otf",
};

/** 시제품과 다른 파일을 쓰게 된 것의 음절 수 (2026-10-25 fontTools 로 셈) */
const SYLLABLES = { "n-square": 11172 };

const CATEGORY = { Handwriting: "hand", Display: "display", "Sans Serif": "sans", Serif: "serif" };

function readJson(p) {
  return JSON.parse(readFileSync(p, "utf8"));
}

const catalog = readJson(join(STUDY, "catalog.json"));
const more = new Map(readJson(join(REFS, "_more.json")).map((e) => [e.id, e]));
const clova = new Map(
  readFileSync(join(REFS, "_research", "nanum_clova_urls.tsv"), "utf8")
    .split(/\r?\n/)
    .slice(1)
    .filter(Boolean)
    .map((l) => l.split("\t")),
);

const kept = [];
const dropped = [];
for (const e of catalog) {
  const prefix = Object.keys(EXCLUDE_PREFIX).find((p) => e.id.startsWith(p));
  if (prefix) { dropped.push([e.id, e.family, EXCLUDE_PREFIX[prefix]]); continue; }
  if (EXCLUDE_NAME.some((re) => re.test(e.family))) { dropped.push([e.id, e.family, "사람 결정 «넣지 않음»"]); continue; }
  if (EXCLUDE_ID[e.id]) { dropped.push([e.id, e.family, EXCLUDE_ID[e.id]]); continue; }
  let url = DIRECT[e.id];
  if (!url && e.id.startsWith("g-")) url = `${J}google/fonts@main/ofl/${e.id.slice(2)}/${encodeURIComponent(e.srcFile)}`;
  if (!url && e.id.startsWith("ge-")) url = `${J}google/fonts@main/ofl/${e.source.replace(/\/$/, "").split("/").pop()}/${encodeURIComponent(e.srcFile)}`;
  if (!url && e.id.startsWith("n-")) url = clova.get(e.family);
  if (!url) throw new Error(`주소 규칙이 없습니다: ${e.id} ${e.family}`);
  if (!/^OFL/i.test(e.license)) throw new Error(`OFL 이 아닌 글꼴이 남았습니다: ${e.id} (${e.license})`);
  if (!CATEGORY[e.category]) throw new Error(`모르는 갈래: ${e.id} ${e.category}`);
  const m = more.get(e.id);
  kept.push({
    id: e.id,
    name: e.family,
    category: CATEGORY[e.category],
    url,
    source: e.source,
    license: "OFL-1.1",
    licenseUrl: (m && m.licenseUrl) || e.licenseUrl,
    copyright: (e.copyright || "").replace(/\s+/g, " ").trim(),
    rfn: (m && m.rfn) || e.rfn || [],
    syllables: SYLLABLES[e.id] ?? e.syllables,
    preview: `/images/fontlab/${e.id}.png`,
    srcPreview: join(STUDY, e.preview),
  });
}

// 미리보기 그림 — 남는 것만, 폴더째 다시
rmSync(OUT_IMG, { recursive: true, force: true });
mkdirSync(OUT_IMG, { recursive: true });
for (const k of kept) copyFileSync(k.srcPreview, join(OUT_IMG, `${k.id}.png`));

const rows = kept.map((k) => `  ${JSON.stringify({ ...k, srcPreview: undefined })},`).join("\n");
const block =
  `// <생성 시작> — node scripts/gen-fontlab.mjs 가 이 사이를 다시 씁니다. 손으로 고치지 마세요.\n` +
  `// ${kept.length}종 · 뺀 것 ${dropped.length}종: ${dropped.map((d) => `${d[1]}(${d[2].split(" — ")[0]})`).join(", ")}\n` +
  `export const fontLabFonts: FontLabFont[] = [\n${rows}\n];\n// <생성 끝>`;
const ts = readFileSync(OUT_TS, "utf8");
const next = ts.replace(/\/\/ <생성 시작>[\s\S]*?\/\/ <생성 끝>/, block);
if (next === ts && !ts.includes(block)) throw new Error("config/fontLab.ts 에서 «생성» 표시를 못 찾았습니다");
writeFileSync(OUT_TS, next, "utf8");

const byCat = kept.reduce((a, k) => ((a[k.category] = (a[k.category] || 0) + 1), a), {});
console.log(`[fontlab] ${kept.length}종 → config/fontLab.ts · 그림 ${readdirSync(OUT_IMG).length}장 → public/images/fontlab/`, byCat);
console.log(`[fontlab] 뺀 것 ${dropped.length}종`);
for (const d of dropped) console.log(`  - ${d[0]} ${d[1]}: ${d[2]}`);
