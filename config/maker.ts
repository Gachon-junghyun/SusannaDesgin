/**
 * 수산나 메이커 (F26 · 2026-09-25) — 간판 디자인 도구의 설정 «한 곳».
 *
 * 🔴 **새 사실을 지어내지 않았습니다.** 판정 숫자·간판 종류·조명 색은 전부 이미 있던 원본에서
 * 옮겼고, 원본이 어디인지 줄마다 적었습니다. 숫자를 바꿀 때는 **원본 쪽을 먼저** 보세요.
 *   - 제작 판정 문턱 → 형제 저장소 `/sign-proof` 스킬 1단계 검산표 (2026-09-23 실측)
 *   - 간판 종류 → `config/content.ts` 의 `signTypes9` (T1~T9, SIGNTYPES.md §9 «수산나가 하는 것»)
 *   - 채널 두께·이격 → 같은 `signTypes9` 의 `spec` (⚠️ 3D 씬의 기본값이지 실측이 아닙니다)
 *   - 조명 색 → SIGNTYPES.md §4 «LED 모듈: 백색 / 전구색 / RGB 풀컬러»
 *
 * 🔴 **손님에게 열지 말지는 `SHOW_MAKER` 한 값**입니다(`SHOW_PRODUCTS`·`SHOW_FONTS` 와 같은 모양).
 * 관리자는 `/admin/maker` 에서 언제나 씁니다.
 */
// ⚠️ 상대 경로여야 합니다 — `next.config.ts` → `config/site.ts` → 이 파일로 읽히는데, 그 단계에선
//    `@/` 별칭이 안 풀려 개발 서버가 뜨지도 않습니다(2026-09-25 실제로 밟음). `site.ts` 도 그래서 `./content` 입니다.
import { signTypes9 } from "./content";

/**
 * 손님용 `/maker` 를 열지. **2026-09-26 에 «베타»로 열었습니다** (사람 결정: *"간판만들기 보이게 해 베타 붙이고"*).
 * 그 전까지는 대표님이 관리자 화면에서 먼저 써 보기로 닫아 두었습니다(2026-09-25).
 * 켜면 셋이 같이 갈립니다: 페이지 404 해제 · 주 메뉴 「간판 만들기」 · 사이트맵 등재.
 * 끄면 홈 F30 구역의 단추·카드는 견적(`makerShowcase.closed`)으로 갑니다 — 구역 자체는 남습니다.
 */
export const SHOW_MAKER: boolean = true;

/**
 * 주 메뉴에 「간판 만들기」를 세울지 — **페이지는 열어 둔 채 메뉴만 뺍니다**(2026-09-26 사람 결정:
 * *"메뉴에서만 간판만들기 뺄 수 있나 다른건 그대로"*). 손님은 홈 메이커 구역(F30) 단추로 들어옵니다.
 * `SHOW_MAKER` 가 꺼져 있으면 이 값과 상관없이 안 섭니다. 미리보기(F23) 중인 관리자에겐 섭니다.
 */
export const MAKER_IN_NAV: boolean = false;

/**
 * 메이커가 아직 시범이라는 작은 표시 — 홈 F30 단추 옆(+ 메뉴를 세우면 «간판 만들기» 옆). 정식이 되면 "" 로.
 * 2026-09-26 «베타» → «시범 운영»: 공공기관이 실제로 쓰는 말(건강보험·한전ON «시범운영», `/errand` 로 직접 봄). 사람 결정(A안).
 */
export const MAKER_BETA = "시범 운영";

/* ------------------------------------------------------------------ 제작 판정 */

/**
 * 「만들 수 있나」 문턱. **원본: `/sign-proof` SKILL.md 1단계 검산표**(2026-09-23, 이 회사 공장 기준 실측).
 * 여기 숫자를 바꾸면 그쪽도 같이 고치세요 — 시안 시트와 메이커가 다른 말을 하면 손님이 헷갈립니다.
 */
export const FAB = {
  /** 채널 안에 LED 모듈이 들어가려면 글자 높이가 이 이상 */
  ledMinLetterMm: 203,
  /** 절곡 채널(옆면을 접어 만드는 방식)이 되는 최소 획 */
  bendMinStrokeMm: 38,
  /** 레이저 커팅 + 용접으로 갈 때의 최소 획 */
  laserMinStrokeMm: 3,
  /** 글자 속공간(ㅇ·ㅁ 안쪽)이 메워지지 않는 최소 폭 */
  minHoleMm: 30,
  /** 이보다 작은 조각은 따로 오려 붙일 수 없는 잡티 (mm²) — letter_svg.py `fab_check` 의 400 */
  speckAreaMm2: 400,
  /** 벽면이용간판 가로 상한(옥외광고물법 시행령 일반값). ⚠️ 실제 허가는 지자체 조례 — 확답하지 마세요 */
  wallSignMaxWidthMm: 10000,
} as const;

/* ------------------------------------------------------------------ 간판 종류 */

export type LitMode = "front" | "halo" | "both" | "none" | "standoff";

export type MakerKind = {
  /** `signTypes9` 의 key 와 같습니다 — 견적 폼 「보고 온 제품」 이 이 값으로 이름을 찾습니다 */
  key: string;
  code: string;
  name: string;
  lit: LitMode;
  /** 채널 두께(옆면 깊이) mm — `spec` 에서 옮긴 3D 씬 기본값 */
  depthMm: number;
  /** 벽에서 띄우는 거리 mm (0 = 직부착) */
  standoffMm: number;
  /** 바탕판(갈바 통판)이 있는가 — T5 */
  backboard: boolean;
  /** 조명을 켜는 종류인가 — LED 최소 글자 높이 판정이 걸립니다 */
  needsLed: boolean;
  hint: string;
};

const byKey = (k: string) => {
  const t = signTypes9.find((s) => s.key === k);
  if (!t) throw new Error(`config/content.ts signTypes9 에 ${k} 가 없습니다`);
  return t;
};

/**
 * 메이커가 그릴 수 있는 종류 — **벽에 붙는 글자** 여섯 가지.
 * ⚠️ T6 돌출·T7 옥상·T8 행잉은 «어디에 다나(거치)» 축이라 벽 정면 그림 한 장으로는 모양이
 * 안 섭니다(측면·구조물이 보여야 읽힘 — SIGNTYPES.md §9 T8 주석). 그래서 이 목록(글자 종류)에는 없고,
 * **T6·T8 은 2026-09-26 부터 «판» 의 다는 방식으로 그립니다**(아래 `plateMounts` — 정면 그림 + 철물 표현). T7 은 여전히 견적 폼으로 받습니다.
 */
export const makerKinds: MakerKind[] = [
  { ...pick("channel-front"), lit: "front", depthMm: 80, standoffMm: 0, backboard: false, needsLed: true, hint: "글자 앞면이 빛납니다. 밤에 가장 잘 보입니다." },
  { ...pick("channel-halo"), lit: "halo", depthMm: 60, standoffMm: 60, backboard: false, needsLed: true, hint: "빛이 글자 뒤로 나와 벽을 밝힙니다. 차분하고 고급스럽습니다." },
  { ...pick("channel-both"), lit: "both", depthMm: 90, standoffMm: 50, backboard: false, needsLed: true, hint: "앞면과 뒤 벽이 함께 빛납니다." },
  { ...pick("scasi"), lit: "none", depthMm: 20, standoffMm: 30, backboard: false, needsLed: false, hint: "빛 없이 그림자로 읽힙니다. 수명이 가장 깁니다." },
  { ...pick("facade"), lit: "front", depthMm: 80, standoffMm: 0, backboard: true, needsLed: true, hint: "벽에 통판을 세우고 그 위에 빛나는 글자를 얹습니다." },
  { ...pick("bracket"), lit: "standoff", depthMm: 5, standoffMm: 80, backboard: false, needsLed: false, hint: "철판 글자를 벽에서 띄워 그림자를 만듭니다." },
];

function pick(key: string) {
  const t = byKey(key);
  return { key: t.key, code: t.code, name: t.name };
}

/* ------------------------------------------------------------------ 색 */

/** 조명 색 — SIGNTYPES.md §4 의 셋(백색·전구색·RGB). RGB 는 대표 색 몇 가지를 골라 둡니다 */
export const ledColors = [
  { key: "white", name: "백색", hex: "#f4f8ff" },
  { key: "warm", name: "전구색", hex: "#ffcf8a" },
  { key: "red", name: "빨강", hex: "#ff3b30" },
  { key: "blue", name: "파랑", hex: "#3d8bff" },
  { key: "green", name: "초록", hex: "#35e07a" },
  { key: "pink", name: "분홍", hex: "#ff5fae" },
] as const;

/**
 * 글자 앞면 색 — 아크릴·시트로 흔히 내는 색. ⚠️ **화면 색은 실물과 다릅니다**(모니터·인쇄 차이) —
 * 실물 색은 견본으로 확정한다는 고지를 화면에 둡니다 [P6].
 */
export const faceColors = [
  { name: "유백(흰색)", hex: "#fbfbf8" },
  { name: "검정", hex: "#1b1d1c" },
  { name: "빨강", hex: "#d7261e" },
  { name: "주황", hex: "#f36c21" },
  { name: "노랑", hex: "#f7c600" },
  { name: "초록", hex: "#1e8c4e" },
  { name: "파랑", hex: "#1f4fa3" },
  { name: "청록", hex: "#00a79d" },
  { name: "자주", hex: "#7b2d6b" },
  { name: "금색", hex: "#c9a24a" },
] as const;

/** 옆면(채널 측면) 색 — 도장 갈바·스텐 마감 */
export const sideColors = [
  { name: "검정 도장", hex: "#222423" },
  { name: "흰색 도장", hex: "#efefec" },
  { name: "스텐 헤어라인", hex: "#a9adab" },
  { name: "금색", hex: "#b08d3c" },
  { name: "앞면과 같게", hex: "" },
] as const;

/** 바탕판(T5) 색 */
export const boardColors = [
  { name: "검정", hex: "#1b1d1c" },
  { name: "흰색", hex: "#f2f2ef" },
  { name: "청록", hex: "#00a79d" },
  { name: "짙은 회색", hex: "#3c4240" },
  { name: "나무색", hex: "#8a5a34" },
] as const;

/* ------------------------------------------------------------------ 트림·바 */

/** 트림(앞면 테두리) — 채널간판 메이커 4곳 중 2곳이 부위별 색으로 따로 받는 칸(2026-09-25 조사) */
export const trimColors = [
  { name: "없음(트림리스)", hex: "" },
  { name: "검정", hex: "#1b1d1c" },
  { name: "흰색", hex: "#f2f2ef" },
  { name: "스텐", hex: "#a9adab" },
  { name: "금색", hex: "#b08d3c" },
] as const;

/* ------------------------------------------------------------------ 판 (2026-09-26) */

/**
 * 판 모양 — 한국 가게 전면 레퍼런스 20장(2026-09-26 `/research`, 수산나디자인 드라이브
 * «한국_가게전면_레퍼런스20»)에서 실제로 본 것만: 사각 현판 · 둥근 판 · 타원 걸이판 · 원형 로고판 · 아치.
 */
export const plateShapes = [
  { key: "rect", name: "사각" },
  { key: "round", name: "둥근 사각" },
  { key: "oval", name: "타원" },
  { key: "circle", name: "원" },
  { key: "arch", name: "아치" },
] as const;

/**
 * 판을 다는 방식. 🔴 **새 제품을 만들지 않았습니다** — 돌출·걸이는 `signTypes9` 의 **T6 돌출간판 · T8 행잉형**
 * 그대로입니다(수산나가 실제로 하는 9종). 그래서 이름·코드를 거기서 끌어옵니다.
 * ⚠️ 정면 그림 한 장이라 돌출 판은 «비스듬히 본 면»으로 그립니다 — 사진 속 각도는 «원근 맞추기(네 점)» 로 맞춥니다.
 */
export const plateMounts: { key: string; label: string; short: string; kindKey?: string }[] = [
  { key: "wall", label: "벽에 붙이기 (판 간판·현판)", short: "벽에 붙이기" },
  { key: "blade", label: `${byKey("projecting").code} ${byKey("projecting").name} — 벽에서 직각으로`, short: "돌출", kindKey: "projecting" },
  { key: "hang", label: `${byKey("hanging").code} ${byKey("hanging").name} — 봉으로 매닮`, short: "걸이", kindKey: "hanging" },
];

/** 판 색 — 레퍼런스에서 본 톤(먹·유백·원목·크림·남색·짙은 회녹)에 청록을 더했습니다. 도료 번호가 아닙니다 */
export const plateColors = [
  { name: "먹", hex: "#1b1d1c" },
  { name: "유백", hex: "#fbfbf8" },
  { name: "크림", hex: "#efe6d2" },
  { name: "원목", hex: "#9a6a3c" },
  { name: "짙은 나무", hex: "#5a3b22" },
  { name: "남색", hex: "#23344d" },
  { name: "짙은 회녹", hex: "#3d4a43" },
  { name: "청록", hex: "#00a79d" },
] as const;

/* ------------------------------------------------------------------ 레퍼런스 스타일 (2026-09-26) */

export type RefStyle = {
  key: string;
  name: string;
  /** 레퍼런스에서 본 특징 한 줄 — 왜 이 모양인가 */
  note: string;
  /** 글자 쪽 간판 종류(`makerKinds`) */
  kind: string;
  plate?: { shape: string; mount: string; w: number; h: number; fill: string; border?: string; borderMm?: number };
  text: { font: string; face: string; heightMm: number; tracking?: number; vertical?: boolean };
  /** 두 번째 줄(업종 등)을 첫 줄 높이의 몇 배로 */
  subRatio?: number;
  /** 건물 사진에서 뽑은 색이 있으면 그 계열로 글자 색을 맞춥니다(톤온톤) */
  tone?: boolean;
};

/**
 * 한 번 눌러 «그 결»로 차리는 틀 여섯. 🔴 **실제 가게 이름을 화면에 쓰지 않습니다**(공개 화면 — 남의 상호를
 * 스타일 이름으로 파는 모양이 됩니다). 이름은 모양으로만 붙였고, 근거는 레퍼런스 번호로 여기 주석에만 둡니다.
 *   letters  ← 03 · 18 · 01 (판 없이 개별 글자, 넓은 자간)
 *   hyeonpan ← 10 · 07 (대문 위 검정 판 + 흰 글자)
 *   hanging  ← 04 (남색 타원 나무판 + 크림 글자, 업종 줄)
 *   blade    ← 20 · 14 (흰 세로 판 + 세로쓰기)
 *   frame    ← 09 (원목 액자 테두리 + 크림 판)
 *   tone     ← 19 (문틀과 글자를 같은 색 계열로)
 * 글자 쪽 종류는 전부 T4 무점등 스카시로 둡니다 — 레퍼런스 20장에 안에서 켜는 판이 0장이었습니다. 바꾸는 건 손님 몫입니다.
 */
export const refStyles: RefStyle[] = [
  { key: "letters", name: "판 없이 글자만", note: "건물의 빈 칸에 개별 글자만 넓은 자간으로 세웁니다. 건물이 주인공입니다.", kind: "scasi", text: { font: "maru-buri", face: "#1b1d1c", heightMm: 320, tracking: 260 }, subRatio: 0.32 },
  { key: "hyeonpan", name: "현판 (문 위 가로 판)", note: "출입구 위 검정 판에 흰 글자. 간판이 작고 문과 한 벌로 읽힙니다.", kind: "scasi", plate: { shape: "rect", mount: "wall", w: 1800, h: 520, fill: "#1b1d1c" }, text: { font: "chosun-gungseo", face: "#fbfbf8", heightMm: 300, tracking: 120 } },
  { key: "hanging", name: "걸이 간판 (타원 판)", note: "봉으로 매단 타원 판. 걸이 판 하나가 사진 포인트가 됩니다.", kind: "scasi", plate: { shape: "oval", mount: "hang", w: 1200, h: 800, fill: "#23344d", border: "#efe6d2", borderMm: 28 }, text: { font: "dokrip", face: "#efe6d2", heightMm: 220 }, subRatio: 0.42 },
  { key: "blade", name: "세로 돌출 판", note: "벽에서 튀어나온 흰 세로 판에 세로쓰기. 골목을 걸어오는 사람에게 읽힙니다.", kind: "scasi", plate: { shape: "rect", mount: "blade", w: 460, h: 1500, fill: "#fbfbf8" }, text: { font: "noto-sans-kr", face: "#1b1d1c", heightMm: 230, vertical: true } },
  { key: "frame", name: "원목 액자 판", note: "원목 테두리 안의 크림 판. 한옥·목재 전면과 같은 재료로 맞춥니다.", kind: "scasi", plate: { shape: "rect", mount: "blade", w: 1000, h: 460, fill: "#efe6d2", border: "#9a6a3c", borderMm: 55 }, text: { font: "gowun-batang", face: "#3a2a1c", heightMm: 220, tracking: 80 } },
  { key: "tone", name: "건물 색 톤온톤", note: "문 위 띠 칸에 건물과 같은 색 계열 글자. 건물 사진을 넣으면 그 색에서 뽑습니다.", kind: "scasi", text: { font: "a2z", face: "#6f8a3a", heightMm: 280, tracking: 180 }, tone: true },
];

/* ------------------------------------------------------------------ PRO 모드 (2026-09-26) */

/**
 * PRO 모드를 켰는지 — 이 브라우저 `localStorage`. 모드마다 따로 둡니다.
 * 사람 요청: *"글자 자체도 점으로 나눠서 키우고 다르고 메쉬 … 상단에서 바꾸면 진짜 자유자재로"*.
 * 켜면 글자 한 자를 눌러 바로 끌고, 점 편집·점 나누기·격자 왜곡·가로세로 늘리기·기울이기를 씁니다.
 * 🔴 **PRO 로 바꾼 모양은 판정·제작용 SVG 에 들어갑니다** — 실제로 그렇게 만들기 때문입니다(글자별 꾸밈과 같은 규칙).
 */
export const makerProKey = (mode: "admin" | "customer") => `susanna-maker-pro-v1-${mode}`;

/** 격자 왜곡 칸 수 고르기 (가로 = 세로) */
export const MESH_SIZES = [1, 2, 3, 4] as const;

/* ------------------------------------------------------------------ 벽 */

export type Wall = { key: string; name: string; color: string };

/**
 * 벽 — **흰 벽이 기본**입니다(2026-09-25 사람 지시: *"배경 에셋은 흰색으로, 에셋은 다 안 보이게 — 너무 구려서"*).
 * 처음엔 3D 렌더 재질 사진(화강석·벽돌 …)을 깔았는데 도면 도구처럼 안 보이고 간판보다 벽이 먼저 읽혀서 뺐습니다.
 * 실제 벽은 **가게 사진**으로 올립니다. 벽 위의 치수선·눈금 색(ink)은 벽 밝기에서 셈합니다(`inkOn`).
 */
export const walls: Wall[] = [
  { key: "white", name: "흰 벽", color: "#ffffff" },
  { key: "blueprint", name: "도면", color: "#0f4a46" },
  { key: "dark", name: "어두운 벽", color: "#2a2d2c" },
];

/**
 * 벽 색 직접 고르기 — 자주 보는 외벽 색 (2026-09-25 사람 요청: *"회백·베이지·연회색·진회색·검정·붉은 벽돌색 등"*).
 * 🔴 **색만입니다. 재질 사진(텍스처)을 다시 깔지 마세요** — 위 `walls` 머리말의 이유 그대로입니다.
 * 값은 도장·드라이비트·벽돌 외벽의 «흔한 톤»을 눈으로 고른 것이지 도료 번호가 아닙니다.
 */
export const wallColors = [
  { name: "회백", hex: "#e6e3dc" },
  { name: "베이지", hex: "#d8c7a6" },
  { name: "연회색", hex: "#c3c6c4" },
  { name: "진회색", hex: "#595e5c" },
  { name: "검정", hex: "#1c1e1e" },
  { name: "붉은 벽돌색", hex: "#9a4b37" },
] as const;

/* ------------------------------------------------------------------ 주고받기 */

/**
 * 메이커 → 견적 폼. **주소가 아니라 `sessionStorage`** 로 건넵니다 — F24-c 규칙
 * («주소에서 온 글자를 폼에 그대로 넣지 않는다»), `/fonts` 커스텀 글꼴과 같은 길입니다.
 * 주소엔 `?maker=1` 만 가고, 폼이 이 열쇠로 요약·SVG·미리보기 그림을 꺼내 첨부로 붙입니다.
 */
export const MAKER_STORAGE_KEY = "susanna-maker-design";

/** «SVG 따기» → 간판 에디터로 보내기. 같은 브라우저 저장소(localStorage)로만 건넵니다 — 서버를 안 거칩니다 */
export const INCOMING_LOGO_KEY = "susanna-maker-incoming-logo";
/** «건물 색 찾기» → 간판 에디터로 색(hex 목록)만 건넵니다. 사진은 저장소에 안 씁니다(`lib/maker/handoff.ts`) */
export const INCOMING_PALETTE_KEY = "susanna-maker-incoming-palette";
export const MAKER_INTEREST = "간판 메이커 디자인";

/**
 * 공유 링크(F26-b · `0013_maker_share.sql`) — 디자인 JSON 한 벌의 상한(바이트).
 * 서버 액션 본문 한도(Next 기본 1MB)보다 작게 둡니다. DB 쪽 상한(1,000,000)은 이보다 조금 큽니다.
 * 로고 외곽선이 아주 복잡하면 걸립니다 — 그때는 «SVG 따기»에서 매끄러움을 올려 점을 줄이면 됩니다.
 */
export const MAKER_SHARE_MAX_BYTES = 900_000;

/* ------------------------------------------------------------------ 처음 온 사람 안내 (튜토리얼) */

/**
 * 안내를 «본 적 있다» 표시 — 이 브라우저 `localStorage`. 모드마다 따로 둡니다(관리자·손님 문구가 달라서).
 * 문구를 크게 바꿔 다시 보여줘야 하면 `v1` 을 올리세요.
 */
export const makerTourKey = (mode: "admin" | "customer", phone = false) => `susanna-maker-tour-v1-${mode}${phone ? "-phone" : ""}`;

/* ------------------------------------------------------------------ 폰 화면 (2026-09-26) */

/**
 * 폰 화면으로 가르는 문턱 — 이보다 좁으면 3단을 버리고 «무대 가득 + 아래 탭 + 올라오는 시트»(인스타 편집 화면 결)로 그립니다.
 * Tailwind 의 `md`(768px) 와 같은 선입니다(`MakerShell` 이 `max-md:` 로 머리말을 걷는 것과 맞춰야 합니다).
 * 🔴 부품은 PC 와 같습니다 — 갈리는 건 배치뿐입니다(F26 «모드 둘, 부품 하나»).
 */
export const MAKER_PHONE_QUERY = "(max-width: 767.98px)";

/** 두 손가락으로 돌릴 때 0°·90°·180°·270° 에서 이 각도(±) 안이면 딱 붙습니다(사람 결정: «크기+회전, 자석») */
export const PINCH_SNAP_DEG = 4;

/** «두 손가락으로 벌리면 확대 · 비틀면 회전» 말풍선을 본 적 있음 — 이 브라우저 `localStorage` */
export const MAKER_GESTURE_HINT_KEY = "susanna-maker-gesture-hint-v1";

/** 상단 막대 «도움말» → 에디터. 막대(MakerShell)와 에디터(SignMaker)가 다른 부품이라 창 이벤트로 건넵니다 */
export const MAKER_HELP_EVENT = "susanna-maker-help";

type TourText = string | { admin: string; customer: string };

export type TourStep = {
  /**
   * 강조할 자리 — 화면의 `data-tour="…"` 값. 여럿이면 구멍이 여럿 납니다. 못 찾으면 가운데 말풍선만 뜹니다.
   * **말풍선은 첫 자리 옆에 섭니다** — 무대(`stage`)처럼 큰 자리는 뒤에 두세요(옆에 빈 곳이 없습니다).
   */
  targets: string[];
  title: TourText;
  body: TourText;
  /** 이 단계는 글자가 하나 선택돼 있어야 보입니다(오른쪽 «글자» 칸) — 에디터가 첫 글자를 골라 둡니다 */
  needsText?: boolean;
};

/**
 * 처음 들어온 사람에게 여덟 단계로 말풍선을 띄웁니다 (2026-09-25 사람 요청).
 * 🔴 **숫자를 문장에 손으로 적지 마세요** — 판정 문턱은 위 `FAB` 에서 끌어옵니다(시안 시트·판정과 같은 자).
 */
export const makerTour: TourStep[] = [
  {
    targets: ["add"],
    title: "글자 넣기",
    body: "«글자»를 누르면 가게 이름이 벽에 올라갑니다. 로고 그림을 올리면 이 브라우저 안에서 선으로 바뀝니다. 벽 위의 글자는 끌어서 옮깁니다.",
  },
  {
    targets: ["text-lines", "font"],
    needsText: true,
    title: "글꼴과 글자 높이",
    body: {
      customer: `글자 높이는 실제 간판의 mm 입니다. 조명이 들어가는 간판은 ${FAB.ledMinLetterMm}mm 이상이어야 합니다. 글꼴은 간판에 써도 되는 무료 글꼴만 모았습니다.`,
      admin: `글자 높이는 실제 간판의 mm 입니다(조명 간판은 ${FAB.ledMinLetterMm}mm 이상). 관리자는 이 PC 에 설치된 글꼴과 글꼴 파일도 씁니다 — 이 브라우저 안에서만 쓰이고 손님 화면에는 안 나옵니다.`,
    },
  },
  {
    targets: ["kind", "daynight"],
    title: "간판 종류와 조명",
    body: "종류를 고르면 옆면 두께와 빛 나오는 방식이 바뀝니다. 위쪽 «주간·야간»으로 불이 켜진 모습을 봅니다. 화면의 밝기는 «표현»이라 실제와 다릅니다.",
  },
  {
    targets: ["wall"],
    title: "벽과 가게 사진",
    body: "흰 벽·도면·벽 색을 고르거나 가게 사진을 올립니다. 사진을 올리면 길이를 아는 곳(출입문 높이 등) 두 끝을 차례로 눌러 실제 크기를 맞춥니다. 사진은 이 브라우저 밖으로 나가지 않습니다.",
  },
  {
    targets: ["glyphs", "stage"],
    needsText: true,
    title: "글자 한 자씩",
    body: "벽 위의 글자를 두 번 누르면 그 한 자만 고릅니다. 색·크기·회전·위치를 따로 바꾸고, 화살표 키로도 옮깁니다.",
  },
  {
    targets: ["transform", "stage"],
    needsText: true,
    title: "회전과 네 점 원근",
    body: "선택한 글자 위 동그라미를 끌면 돌아갑니다(Shift 는 15° 단위). «원근 맞추기»를 켜고 네 모서리를 끌면 비스듬한 사진 벽에 간판 면을 맞춥니다. 보이는 모양만 바뀌고 치수는 그대로입니다.",
  },
  {
    targets: ["verdict"],
    title: "만들 수 있나",
    body: {
      customer: "글자 높이·가장 가는 획·글자 속공간을 재서 만들 수 있는지 알려 드립니다. «어려움»이 떠도 견적은 보낼 수 있습니다 — 담당자가 방법을 찾아 연락드립니다.",
      admin: `판정 기준은 /sign-proof 와 같은 자입니다 — 절곡 채널 획 ${FAB.bendMinStrokeMm}mm · 조명 글자 ${FAB.ledMinLetterMm}mm · 속공간 ${FAB.minHoleMm}mm. 회전·원근은 판정에 안 들어갑니다.`,
    },
  },
  {
    targets: ["finish"],
    title: { customer: "견적 받기", admin: "내보내기" },
    body: {
      customer: "이 디자인으로 견적을 보내면 미리보기 그림과 외곽선이 견적서에 붙습니다. 디자인은 이 브라우저에 남아 있어 다시 들어와도 이어서 합니다. 안내는 위 «도움말»로 다시 봅니다.",
      admin: "시안 그림(JPG)·제작용 외곽선(SVG, mm)·사양 요약을 내려받습니다. 외곽선은 «시안»이라 공장에서 칼선을 다시 뽑습니다. 안내는 위 «도움말»로 다시 봅니다.",
    },
  },
];

/**
 * 폰 화면의 처음 온 사람 안내 (2026-09-26). 폰은 칸들이 시트 속에 접혀 있어 PC 안내(`makerTour`)의 자리를
 * 못 찾습니다 — 그래서 **아래 탭과 무대**를 가리킵니다. 말투는 공공기관식(«~할 수 있습니다», 2026-09-26 A안).
 */
export const makerTourPhone: TourStep[] = [
  {
    targets: ["tab-add"],
    title: "넣기",
    body: "«넣기»에서 글자·로고·가게 사진을 올릴 수 있습니다. 로고와 사진은 휴대폰 앨범이나 카메라에서 바로 고를 수 있으며, 이 휴대폰 밖으로 나가지 않습니다.",
  },
  {
    targets: ["stage"],
    title: "손가락으로 다루기",
    body: `한 손가락으로 간판을 눌러 고르고 끌어서 옮길 수 있습니다. 두 손가락을 벌리면 화면이 커지고, 간판을 잡은 채 두 손가락을 벌리거나 비틀면 크기와 각도가 바뀝니다. 0°·90° 근처에서는 반듯하게 붙습니다.`,
  },
  {
    targets: ["tab-text", "tab-font"],
    title: "글자와 글꼴",
    body: {
      customer: `«글자»에서 문구와 실제 글자 높이(mm)를, «글꼴»에서 간판에 써도 되는 무료 글꼴을 바꿀 수 있습니다. 조명이 들어가는 간판은 글자 높이 ${FAB.ledMinLetterMm}mm 이상이어야 합니다.`,
      admin: `«글자»에서 문구와 글자 높이(mm)를, «글꼴»에서 글꼴을 바꿀 수 있습니다(조명 간판은 ${FAB.ledMinLetterMm}mm 이상). 이 PC 글꼴 목록은 PC 크롬·엣지에서만 됩니다.`,
    },
  },
  {
    targets: ["tab-kind", "daynight"],
    title: "간판 종류와 조명",
    body: "«종류»에서 간판 종류와 조명 색을 고를 수 있습니다. 위쪽 «주간·야간»으로 불이 켜진 모습을 확인할 수 있으며, 화면의 밝기는 «표현»이라 실제와 다릅니다.",
  },
  {
    targets: ["tab-wall"],
    title: "벽과 가게 사진",
    body: "흰 벽·벽 색을 고르거나 가게 사진을 올릴 수 있습니다. 사진을 올리면 길이를 아는 곳(출입문 높이 등) 두 끝을 차례로 눌러 실제 크기를 맞춥니다.",
  },
  {
    targets: ["finish-top", "tab-judge"],
    title: { customer: "판정과 견적", admin: "판정과 내보내기" },
    body: {
      customer: "«판정»에서 제작 가능 여부를 확인할 수 있습니다. 오른쪽 위 «완료»를 누르면 이 디자인으로 견적을 받을 수 있습니다. 안내는 왼쪽 위 «?»로 다시 볼 수 있습니다.",
      admin: "«판정»에서 제작 가능 여부와 시안 그림·제작용 외곽선·공유 링크를 다룰 수 있습니다. 안내는 왼쪽 위 «?»로 다시 볼 수 있습니다.",
    },
  },
];
