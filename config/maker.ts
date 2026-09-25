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
 * 손님용 `/maker` 를 열지. **지금은 닫혀 있습니다** — 대표님이 관리자 화면에서 먼저 써 보고
 * 정하기로 했습니다(2026-09-25 요청: «일단 관리자 홈페이지를 업그레이드, 나중엔 고객도»).
 * 켜면 셋이 같이 갈립니다: 페이지 404 해제 · 주 메뉴 「간판 만들기」 · 사이트맵 등재.
 */
export const SHOW_MAKER: boolean = false;

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
 * 안 섭니다(측면·구조물이 보여야 읽힘 — SIGNTYPES.md §9 T8 주석). 지금은 뺐고, 견적 폼으로 받습니다.
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

/* ------------------------------------------------------------------ 벽 */

export type Wall = { key: string; name: string; color: string; ink: string };

/**
 * 벽 — **흰 벽이 기본**입니다(2026-09-25 사람 지시: *"배경 에셋은 흰색으로, 에셋은 다 안 보이게 — 너무 구려서"*).
 * 처음엔 3D 렌더 재질 사진(화강석·벽돌 …)을 깔았는데 도면 도구처럼 안 보이고 간판보다 벽이 먼저 읽혀서 뺐습니다.
 * 실제 벽은 **가게 사진**으로 올립니다. `ink` 는 그 벽 위의 치수선·눈금 색입니다.
 */
export const walls: Wall[] = [
  { key: "white", name: "흰 벽", color: "#ffffff", ink: "#0f1a19" },
  { key: "blueprint", name: "도면", color: "#0f4a46", ink: "#ffffff" },
  { key: "dark", name: "어두운 벽", color: "#2a2d2c", ink: "#ffffff" },
];

/* ------------------------------------------------------------------ 주고받기 */

/**
 * 메이커 → 견적 폼. **주소가 아니라 `sessionStorage`** 로 건넵니다 — F24-c 규칙
 * («주소에서 온 글자를 폼에 그대로 넣지 않는다»), `/fonts` 커스텀 글꼴과 같은 길입니다.
 * 주소엔 `?maker=1` 만 가고, 폼이 이 열쇠로 요약·SVG·미리보기 그림을 꺼내 첨부로 붙입니다.
 */
export const MAKER_STORAGE_KEY = "susanna-maker-design";

/** «SVG 따기» → 간판 에디터로 보내기. 같은 브라우저 저장소(localStorage)로만 건넵니다 — 서버를 안 거칩니다 */
export const INCOMING_LOGO_KEY = "susanna-maker-incoming-logo";
export const MAKER_INTEREST = "간판 메이커 디자인";
