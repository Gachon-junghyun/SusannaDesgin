/**
 * `/fonts` 글꼴 견본 — 손님이 «이 글꼴로 만들어 주세요» 를 고르는 목록 (F25, 2026-09-23).
 *
 * 🔴 **전부 눈누(noonnu.cc)의 상세 페이지 «라이선스 요약표»를 한 장씩 열어 보고 골랐습니다.**
 * 기준은 셋이 **모두** «사용 가능» 인 것만입니다:
 *   - **인쇄** — 간판 출력물
 *   - **BI/CI** — 간판 글자는 대개 손님의 상호명·로고입니다. 여기가 «조건부» 면 뺐습니다
 *   - **웹사이트** — 이 페이지가 그 글꼴로 견본을 그립니다
 * 그래서 인기 있어도 빠진 것이 있습니다(2026-09-23 실측): 여기어때 잘난체(BI/CI 조건부) ·
 * 가평 한석봉 큰붓(전 항목 조건부) · 메모먼트 꾹꾹체(웹 임베딩 금지) · 제주돌담체(임베딩 조건부).
 *
 * ⚠️ **라이선스는 바뀔 수 있습니다.** 눈누 스스로 «정확한 사용범위는 이용 전 폰트 저작권자에게
 * 확인» 이라 적어 둡니다. ⚠️ 화면의 고지 문단과 「눈누에서 보기」 링크는 2026-09-23 사람 지시로 뺐습니다 —
 * 그래서 **이 주석이 근거의 유일한 자리**입니다. 제작 전에 `noonnu` 번호로 다시 여세요.
 *
 * 글꼴 파일은 **눈누가 «웹폰트로 사용» 에 적어 둔 주소 그대로**입니다(jsdelivr·네이버 한글 CDN).
 * 굵기는 간판에 쓸 **한 벌만** 받습니다. `@font-face` 는 `app/fonts/specimen.css`.
 * 구글 폰트에 있는 둘(검은고딕·나눔손글씨붓)과 사이트 글꼴(고운바탕)은 `next/font/google` 입니다.
 */

export type FontGroup = "gothic" | "serif" | "brush" | "round";

export const fontGroups: { key: FontGroup; label: string }[] = [
  { key: "gothic", label: "굵은 고딕" },
  { key: "serif", label: "바탕·궁서" },
  { key: "brush", label: "붓·손글씨" },
  { key: "round", label: "둥근" },
];

export type SpecimenFont = {
  /** 주소에 싣는 값 — `/quote?font=<slug>` */
  slug: string;
  name: string;
  group: FontGroup;
  /** CSS `font-family` 값 (구글 폰트는 `var(--…)`) */
  family: string;
  weight: number;
  /** 눈누 상세 번호 — https://noonnu.cc/font_page/<noonnu> */
  noonnu: number;
  /**
   * 많이 보이는 곳 / 어울리는 간판 (2026-09-23, 사람 요청으로 추가).
   * ⚠️ **출처 없는 편집 판단입니다** — 눈누 본문엔 라이선스 문구뿐이라 쓰임을 확인할 원문이
   * 없었습니다 [P6]. 화면에서도 «사실»이 아니라 «안내» 로 읽히게 짧게 둡니다. 대표님이 고치세요.
   */
  seen: string;
  fits: string;
};

export const specimenFonts: SpecimenFont[] = [
  { slug: "paperlogy", name: "페이퍼로지", group: "gothic", family: "'SpecPaperlogy'", weight: 800, noonnu: 1456, seen: "발표 자료, 포스터 제목", fits: "카페, 학원, 사무실" },
  { slug: "gmarket-sans", name: "G마켓 산스", group: "gothic", family: "'SpecGmarket'", weight: 700, noonnu: 366, seen: "유튜브 썸네일, 쇼핑몰 배너", fits: "마트, 매장 가격표, 생활용품점" },
  { slug: "black-han-sans", name: "검은고딕", group: "gothic", family: "var(--font-black-han-sans)", weight: 400, noonnu: 106, seen: "포스터와 현수막의 큰 제목", fits: "식당, 정육점, 철물점" },
  { slug: "aggro", name: "어그로체", group: "gothic", family: "'SpecAggro'", weight: 700, noonnu: 738, seen: "유튜브 썸네일, 예능 자막", fits: "분식집, 주점, 오락실" },
  { slug: "isamanru", name: "이사만루", group: "gothic", family: "'SpecIsamanru'", weight: 700, noonnu: 463, seen: "스포츠와 게임 홍보물", fits: "치킨집, 호프, 체육관" },
  { slug: "a2z", name: "에이투지체", group: "gothic", family: "'SpecA2z'", weight: 800, noonnu: 1778, seen: "회사 홈페이지, 안내문", fits: "병원, 사무실, 부동산" },
  { slug: "kcc-ganpan", name: "KCC간판체", group: "gothic", family: "'SpecKccGanpan'", weight: 400, noonnu: 1095, seen: "관공서 안내판, 소상공인 간판", fits: "어느 업종에나 (간판용으로 만든 글꼴)" },
  { slug: "noto-sans-kr", name: "본고딕 (Noto Sans KR)", group: "gothic", family: "var(--font-noto-sans-kr)", weight: 900, noonnu: 34, seen: "안내문, 기업 문서, 웹사이트", fits: "병원, 약국, 관공서, 사무실" },
  { slug: "gowun-batang", name: "고운바탕", group: "serif", family: "var(--font-gowun-batang)", weight: 700, noonnu: 733, seen: "책 표지, 청첩장", fits: "한식당, 찻집, 공방" },
  { slug: "maru-buri", name: "마루 부리", group: "serif", family: "'SpecMaruBuri'", weight: 700, noonnu: 487, seen: "책과 잡지, 전시 포스터", fits: "서점, 갤러리, 꽃집" },
  { slug: "chosun-gungseo", name: "조선궁서체", group: "serif", family: "'SpecChosunGs'", weight: 400, noonnu: 416, seen: "신문 제목, 상장, 현판", fits: "한정식, 한의원, 전통 가게" },
  { slug: "nanum-brush", name: "나눔손글씨 붓", group: "brush", family: "var(--font-nanum-brush)", weight: 400, noonnu: 43, seen: "캘리그라피풍 현수막, 메뉴판", fits: "국밥집, 막걸리집" },
  { slug: "jeongmuk-bawi", name: "정묵바위체", group: "brush", family: "'SpecJeongmuk'", weight: 400, noonnu: 395, seen: "영화 포스터, 행사 제목", fits: "고깃집, 주점, 해산물집" },
  { slug: "dokrip", name: "독립체", group: "brush", family: "'SpecDokrip'", weight: 400, noonnu: 338, seen: "역사 행사 홍보물", fits: "복고풍 가게, 다방" },
  { slug: "jua", name: "주아체", group: "round", family: "'SpecJua'", weight: 400, noonnu: 53, seen: "배달 앱 광고풍 전단, 메뉴", fits: "분식집, 키즈 매장" },
  { slug: "cafe24-surround", name: "카페24 써라운드", group: "round", family: "'SpecSurround'", weight: 400, noonnu: 669, seen: "쇼핑몰 배너, 아동 교육물", fits: "키즈카페, 디저트 가게" },
];

/**
 * 맨 아래 «커스텀 글꼴» 카드 (2026-09-23). 손님이 적은 글씨 정보는 **주소에 안 싣고**
 * `sessionStorage` 이 열쇠로 견적 폼에 건넵니다 — 주소에서 온 글자를 폼에 그대로 넣지 않는다는
 * F24-c 규칙 때문입니다. 주소엔 `?font=custom` 만 가고, 견적 페이지가 그걸 목록처럼 대조합니다.
 */
export const CUSTOM_FONT_SLUG = "custom";
export const CUSTOM_FONT_STORAGE_KEY = "susanna-custom-font";

/** 라이선스 표를 마지막으로 연 날 [P6] — 화면에서는 뺐고(2026-09-23) 기록으로만 둡니다 */
export const FONTS_CHECKED_AT = "2026-09-23";

/**
 * 🔴 **손님에게 연 페이지입니다** (2026-09-24, 대표님 결정으로 켬). `SHOW_PRODUCTS` 와 같은
 * 모양의 스위치입니다 — 꺼면 `/fonts` 는 관리자(새 디자인 미리보기, F23) 말고는 404 이고,
 * `noindexPaths` 에 들어가 사이트맵에서도 빠집니다.
 *
 * ⚠️ **`SHOW_PRODUCTS`(제품) 는 여전히 꺼져 있습니다** — 이번에 «이것만» 열라는 지시였습니다.
 * 두 스위치를 같이 켜지 마세요.
 *
 * 켜면 한 값에서 셋이 같이 갈립니다: 페이지 공개(`app/fonts/page.tsx`) ·
 * 주 메뉴 「글꼴」(`components/Header.tsx` 의 `fontsVisible`) ·
 * 사이트맵 등재(`noindexPaths` 에서 빠짐 → `app/sitemap.ts` 가 저절로 싣습니다).
 */
export const SHOW_FONTS: boolean = true;
