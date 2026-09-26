/**
 * 로고 만들기(관리자 전용 베타) · 그림판 — 설정 «한 곳» (F26-k · F26-l · 2026-09-27).
 *
 * 🔴 **새 사실을 지어내지 않았습니다.** 단계·손잡이·인상→손잡이 수칙·간판 판정은 전부 형제 작업
 * `STARTUP/design-atlas/tree/로고.md`(2026-09-26, 사람이 로고 8개를 보여 주며 체계화하라고 한 것)를 옮겼습니다.
 * 그 문서도 스스로 «처음엔 전부 가설»이라고 적어 두었습니다 — 여기 값도 같은 등급입니다. 바꿀 때는 **그 문서를 먼저** 고치세요.
 *
 * 🔴 **글자는 AI 가 그리지 않습니다** — 로고.md «글자는 AI 로 안 그린다»: 한글 이미지 생성 점수가 오픈 모델 0.26~0.57 이라
 * 틀린 글자가 간판에 박힙니다. 상호는 `config/fonts.ts` 의 16종(간판·BI 사용이 «가능»으로 확인된 것)으로만 조판합니다.
 *
 * 🔴 **이미지 API 는 아직 안 붙였습니다**(2026-09-27 사람 결정 — 유료 API 는 대표님 결정: 누구 카드로, 월 상한 얼마).
 * 붙일 자리는 서버 함수 하나(`lib/maker/ai-image.ts`)로 모았고, 지금은 클로드 코드가 초안을 뽑아 «프로젝트 에셋»으로 올립니다(F26-j).
 */

/** 손님 화면에는 없는 도구라 «시범 운영»(손님용 `MAKER_BETA`)이 아니라 사람이 부른 이름 그대로 둡니다 */
export const LOGO_BETA = "베타";

/** «AI 초안»·«AI 로 다듬기» 칸의 안내 — 사람이 정한 문장 그대로(2026-09-27). API 가 붙으면 `lib/maker/ai-image.ts` 의 `IMAGE_API_READY` 가 켜집니다 */
export const AI_DRAFT_NOTE = "API 연결 전 — 클로드 코드가 초안을 만들어 프로젝트 에셋으로 올립니다";

/* ------------------------------------------------------------------ ① 입력 */

/** 원하는 인상 — 로고.md «인상 → 손잡이» 의 일곱 이름 그대로(`인상.md` 와 같은 이름을 쓴다는 약속) */
export type Impression = "luxury" | "cute" | "calm" | "trad" | "dynamic" | "beauty" | "warm";

export type ImpressionRule = {
  key: Impression;
  name: string;
  /** 로고.md 의 수칙 한 줄 — 화면에 그대로 보여 줍니다(왜 이 글꼴·색이 먼저 나오나) */
  rule: string;
  /** 먼저 권할 글꼴(`config/fonts.ts` slug) — 앞에서부터 3안 후보 */
  fonts: string[];
  /** 상호 줄 자간(em 의 1/1000) */
  tracking: number;
  /** 잘 맞는 락업(앞에서부터) */
  lockups: Lockup[];
  /** 건물 사진이 없을 때 쓰는 색 세 벌 */
  palettes: Palette[];
};

/**
 * 색 한 벌. 🔴 **2~3색**입니다 — 로고.md «간판은 면 하나가 한 색», F26-i «색은 2~3개».
 * `plate` 가 있으면 배지·판의 바탕, 없으면 로고가 벽(ground) 위에 바로 섭니다.
 */
export type Palette = {
  name: string;
  /** 로고가 올라갈 바탕(벽) — 미리보기 바탕이자 대비 계산 기준 */
  ground: string;
  plate?: string;
  face: string;
  symbol: string;
  /** 배지 테두리·부제에 조금 */
  point?: string;
};

const INK = "#1b1d1c", MILK = "#fbfbf8", CREAM = "#efe6d2", NAVY = "#23344d", GOLD = "#b08d3c";

export const impressions: ImpressionRule[] = [
  {
    key: "luxury",
    name: "고급스러운",
    rule: "라인아트 또는 면 1색 · 세리프 · 넓은 자간 부제 · 색 1~2 · 그라데이션 없음",
    fonts: ["maru-buri", "gowun-batang", "chosun-gungseo"],
    tracking: 140,
    lockups: ["stack", "word", "row"],
    palettes: [
      { name: "먹 + 금 심벌", ground: "#f2efe8", face: INK, symbol: GOLD },
      { name: "먹 판 + 유백", ground: "#d9d6cf", plate: INK, face: MILK, symbol: GOLD, point: GOLD },
      { name: "짙은 나무 판 + 크림", ground: "#e6e1d6", plate: "#3a2a1c", face: CREAM, symbol: CREAM },
    ],
  },
  {
    key: "cute",
    name: "귀여운",
    rule: "캐릭터 또는 둥근 면 · 둥근 산세리프 굵게 · 따뜻한 파스텔 2~3색 · 배지로 감싸기 흔함",
    fonts: ["jua", "cafe24-surround", "gmarket-sans"],
    tracking: 20,
    lockups: ["badge", "stack", "row"],
    palettes: [
      { name: "크림 배지 + 밤색 글자 + 살구 심벌", ground: "#fbf6ee", plate: "#f6e4c6", face: "#5a3b22", symbol: "#e07b5f", point: "#e07b5f" },
      { name: "살구 배지 + 흰 글자", ground: "#fbf6ee", plate: "#e38a6d", face: "#fffaf3", symbol: "#fffaf3", point: "#fffaf3" },
      { name: "흰 벽 + 살구 글자 + 밤색 심벌", ground: "#fffdf9", face: "#d76d52", symbol: "#5a3b22" },
    ],
  },
  {
    key: "calm",
    name: "차분한",
    rule: "천체·물 모티프 · 기하 산세리프 넓은 자간 · 그라데이션 대신 톤 띠(간판은 그라데이션 불가)",
    fonts: ["a2z", "noto-sans-kr", "paperlogy"],
    tracking: 220,
    lockups: ["row", "stack", "word"],
    palettes: [
      { name: "남색 글자 + 회청 심벌", ground: "#f3f4f3", face: NAVY, symbol: "#6f8fa8" },
      { name: "남색 판 + 유백", ground: "#dfe3e4", plate: NAVY, face: MILK, symbol: "#a9c0d0" },
      { name: "회녹 글자", ground: "#eef0ec", face: "#3d4a43", symbol: "#7d9486" },
    ],
  },
  {
    key: "trad",
    name: "전통",
    rule: "건축·문양 모티프 · 면 1~2색(남색·먹색) · 원 배지 · 한글 굵은 고딕이나 붓",
    fonts: ["nanum-brush", "chosun-gungseo", "black-han-sans"],
    tracking: 40,
    lockups: ["badge", "stack", "word"],
    palettes: [
      { name: "남색 원 배지 + 유백", ground: "#ece6da", plate: NAVY, face: MILK, symbol: MILK, point: CREAM },
      { name: "먹 글자 + 붉은 낙관", ground: "#f1ece2", face: INK, symbol: "#a3342a" },
      { name: "먹 판 + 크림", ground: "#e2dccf", plate: INK, face: CREAM, symbol: CREAM },
    ],
  },
  {
    key: "dynamic",
    name: "역동",
    rule: "파편·사선 · 굵은 글자 · 원색 — ⚠️ 3D·광택·그라데이션은 채널 간판으로 못 만듭니다(면 하나 한 색)",
    fonts: ["aggro", "isamanru", "black-han-sans"],
    tracking: 0,
    lockups: ["row", "word", "stack"],
    palettes: [
      { name: "먹 글자 + 빨강 심벌", ground: "#f4f4f2", face: INK, symbol: "#d7261e" },
      { name: "노랑 판 + 먹", ground: "#e9e9e6", plate: "#f7c600", face: INK, symbol: INK },
      { name: "빨강 판 + 흰 글자", ground: "#ececea", plate: "#d7261e", face: "#ffffff", symbol: "#ffffff" },
    ],
  },
  {
    key: "beauty",
    name: "여성·뷰티",
    rule: "식물·나비·옆얼굴 · 네거티브 스페이스 · 얇고 자간 넓은 글자 · 파스텔 + 금색 포인트",
    fonts: ["maru-buri", "a2z", "gowun-batang"],
    tracking: 200,
    lockups: ["stack", "word", "badge"],
    palettes: [
      { name: "먹회 글자 + 금 심벌", ground: "#f7efec", face: "#4a4444", symbol: GOLD },
      { name: "분홍베이지 판 + 먹회", ground: "#f5f1ef", plate: "#e9cfc6", face: "#4a4444", symbol: GOLD, point: GOLD },
      { name: "금 글자", ground: "#f4f0ea", face: "#9c7a35", symbol: "#9c7a35" },
    ],
  },
  {
    key: "warm",
    name: "따뜻한·볼드",
    rule: "톤 띠(한 색상 3~4단) · 아주 굵은 기하 산세리프 · 부제 작게 자간 넓게",
    fonts: ["paperlogy", "gmarket-sans", "black-han-sans"],
    tracking: 10,
    lockups: ["row", "stack", "badge"],
    palettes: [
      { name: "주황 글자 + 밤색 심벌", ground: "#fbf5ee", face: "#e0601c", symbol: "#7a3a14" },
      { name: "주황 판 + 크림", ground: "#f3eee8", plate: "#e0601c", face: "#fff4e6", symbol: "#fff4e6", point: "#f9b98c" },
      { name: "밤색 글자 + 주황 심벌", ground: "#fbf5ee", face: "#5b2c10", symbol: "#e0601c" },
    ],
  },
];

/**
 * 업종 → 모티프 후보 (로고.md «업종 → 모티프 후보»). 🔴 **흔한 모티프는 겹치기 쉬워 상표 검색 부담이 큽니다** —
 * 화면에도 적습니다. 만든 로고는 납품 전 KIPRIS 검색(로고.md 머리말).
 */
export const industries: { key: string; name: string; motifs: string }[] = [
  { key: "cafe", name: "카페", motifs: "컵 · 원두 · 김(증기)" },
  { key: "bakery", name: "빵집·디저트", motifs: "밀 · 빵 · 밀대 · 거품기" },
  { key: "food", name: "음식점", motifs: "그릇 · 젓가락 · 불꽃 · 재료 한 가지" },
  { key: "beauty", name: "미용·네일", motifs: "꽃 · 나비 · 옆얼굴 · 빗" },
  { key: "craft", name: "공방", motifs: "손 · 도구(대패·바늘·붓) · 나뭇결 · 실타래" },
  { key: "trad", name: "한식·전통주", motifs: "지붕 · 문양 · 항아리 · 잔" },
  { key: "flower", name: "꽃집", motifs: "꽃 · 잎 · 줄기" },
  { key: "edu", name: "학원", motifs: "책 · 연필 · 별" },
  { key: "etc", name: "그 밖", motifs: "상호 글자 변형 · 추상 도형" },
];

/* ------------------------------------------------------------------ ② 락업 */

export type Lockup = "stack" | "row" | "badge" | "word" | "mark";

/** 로고.md «구성(락업)» — 앱 아이콘 컨테이너는 간판에 안 맞아 뺐습니다 */
export const lockups: { key: Lockup; name: string; note: string }[] = [
  { key: "stack", name: "세로 쌓기", note: "심벌 위, 글자 아래. 정사각에 가깝습니다(가로÷세로 0.7~1.2) — 돌출·걸이 판에 맞습니다." },
  { key: "row", name: "가로 나란히", note: "심벌 왼쪽, 글자 오른쪽. 가로로 깁니다(2.5 이상) — 가로형 벽 간판에 바로 맞습니다." },
  { key: "badge", name: "배지", note: "원·둥근 판 안에 담습니다. 판의 윤곽이 로고의 윤곽이 됩니다 — 판은 에디터에서 «판»으로 섭니다." },
  { key: "word", name: "글자만", note: "글자 모양 자체가 로고입니다. 심벌을 골라도 쓰지 않습니다." },
  { key: "mark", name: "심벌만", note: "글자 없이 심벌 하나. 손그림 레터링(뾰족한 X 같은 것)을 로고로 쓸 때도 이것입니다." },
];

/* ------------------------------------------------------------------ ③ 심벌 */

export type SymbolWay = "none" | "motif" | "character" | "sketch";

export const symbolWays: { key: SymbolWay; name: string; note: string }[] = [
  { key: "none", name: "없음", note: "글자만으로 갑니다." },
  { key: "motif", name: "모티프", note: "업종에서 흔한 사물 하나를 면 1~2색으로. 흔할수록 상표가 겹칩니다." },
  { key: "character", name: "캐릭터", note: "실제 사진 → 특징 3개만 → 3~4조각 픽토그램. 귀여움은 비율로 잽니다(아래)." },
  { key: "sketch", name: "손그림", note: "그림판에서 대충 그린 것. 폰트로 안 나오는 뾰족한 획(X 로고 같은 것)은 그려야 합니다." },
];

/** 캐릭터화 — 로고.md «귀여움 비율(아기 도식)». 잴 수 있는 문장으로만 둡니다 */
export const characterRules = [
  "특징 3개만 — 그 동물을 그 동물로 알아보게 하는 것만(여우 = 뾰족 귀·흰 턱·굵은 꼬리).",
  "머리 ÷ 몸 높이 0.8 이상(실제 동물은 0.2~0.4).",
  "눈 중심은 머리 높이의 55~65% 아래, 눈 지름은 머리 폭의 15% 이상.",
  "모서리는 전부 둥글게 — 귀 끝도 끝을 굴립니다.",
  "사진 → 윤곽 → 면 5~8조각 → 3~4조각. 로고는 보통 3~4조각 단계입니다.",
];

/* ------------------------------------------------------------------ ⑥ 3안 */

/** 3안은 «한 손잡이만» 다르게 — 작업분해 7 «두 개 이상 바꾸면 무엇이 좋아졌는지 모른다» */
export const varyAxes = [
  { key: "font", name: "글꼴" },
  { key: "color", name: "색" },
  { key: "lockup", name: "락업" },
] as const;
export type VaryAxis = (typeof varyAxes)[number]["key"];

/* ------------------------------------------------------------------ 주고받기 */

/** 그림판 → 로고 만들기 «③ 손그림». 같은 브라우저 저장소로만 건넵니다(관리자 본인이 그린 것) */
export const INCOMING_SKETCH_KEY = "susanna-maker-incoming-sketch";
/**
 * 로고 만들기 → 간판 에디터. 판(배지)·로고(심벌 층)·글자(살아 있는 글자) 아이템 묶음 한 벌 또는 세 벌.
 * 🔴 글자는 **글자 아이템**으로 갑니다(외곽선으로 굳히지 않음) — 에디터에서 다시 고치고, 판정도 글자 줄 높이로 정확히 합니다.
 */
export const INCOMING_ITEMS_KEY = "susanna-maker-incoming-items";

/** 로고 만들기 화면의 입력을 이 브라우저에 남겨 둡니다(사진은 안 남김) */
export const LOGO_DRAFT_KEY = "susanna-maker-logo-draft-v1";

/* ------------------------------------------------------------------ 그림판 */

/** 캔버스 크기 — 정사각(심벌) · 가로(레터링) */
export const drawCanvases = [
  { key: "square", name: "정사각 (심벌)", w: 1000, h: 1000 },
  { key: "wide", name: "가로 (레터링)", w: 1600, h: 700 },
] as const;

/**
 * «AI 로 다듬기»가 뽑을 글꼴 느낌 — 사람이 예로 든 넷(2026-09-27). 클로드 코드가 `/gemini-image --ref <스케치>` 로 이 넷을 뽑아
 * 벡터화해 같은 프로젝트에 올립니다(STARTUP/aidesigner/STAGES.md «손그림 다듬기»).
 */
export const refineStyles = ["뾰족한 칼끝", "굵은 기하", "붓", "스텐실"] as const;
