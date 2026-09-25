/**
 * 관리자 «업무» 화면(F28)의 고정 목록 — 할 일 묶음 · 마케팅 주기 · 바로가기.
 *
 * 할 일 «자체»와 «마지막으로 한 날»은 DB(`0015` 의 `desk_tasks`·`desk_rhythm`)에 있고,
 * 여기는 **바뀌지 않는 틀**만 둡니다 [A5]. 주기를 바꾸거나 링크를 더할 땐 이 파일 한 곳입니다.
 *
 * 마케팅 주기의 근거는 DeGaJa 쪽 `PLAYBOOK.md` 주기표(2026-08-06)와 2026-09-25 조사입니다.
 */

export const DESK_AREAS = [
  { key: "deadline", label: "기한", tone: "accent" },
  { key: "exposure", label: "노출", tone: "brand" },
  { key: "sales", label: "수주", tone: "ink" },
  { key: "steady", label: "꾸준히", tone: "brand" },
  { key: "etc", label: "기타", tone: "muted" },
] as const;

export type DeskAreaKey = (typeof DESK_AREAS)[number]["key"];

export const DESK_WHO = ["대표님", "정현님", "홈페이지"] as const;

export type Rhythm = {
  /** DB `desk_rhythm.key` — 바꾸면 기록이 끊깁니다 */
  key: string;
  label: string;
  /** 며칠마다 (이 날수를 넘기면 «밀림») */
  every: number;
  /** 한 줄 요령 */
  how: string;
  link?: string;
  /** 왜 하나 — 안 하면 무엇이 깎이나 */
  why: string;
};

export const RHYTHMS: Rhythm[] = [
  {
    key: "place_news",
    label: "플레이스 새소식",
    every: 30,
    how: "현장 사진 3~5장 + 두세 문장 + 숫자(가로 6m, 고소작업차 등) + 홈페이지 주소 한 줄",
    link: "https://smartplace.naver.com/bizes",
    why: "방치하면 플레이스 순위가 자동으로 떨어집니다.",
  },
  {
    key: "naver_blog",
    label: "네이버 블로그 글",
    every: 4,
    how: "주 2회. 제목 25~30자에 지역·간판 종류를 앞에. 현장 → 문제 → 어떻게 풀었나 → 결과 사진 → 대략 비용",
    link: "https://blog.naver.com",
    why: "네이버 AI 브리핑은 블로그·카페·클립만 출처로 씁니다. 간판 글만 50편 쌓여야 전문성이 인정됩니다.",
  },
  {
    key: "daangn_news",
    label: "당근 소식·스토리",
    every: 7,
    how: "시공 사진이나 1분 이내 세로 영상 한 개. 동네 반경으로 무료 노출됩니다",
    link: "https://business.daangn.com",
    why: "단골에게 알림이 가는 유일한 무료 반복 노출입니다.",
  },
  {
    key: "gbp_post",
    label: "구글 비즈니스 프로필 게시물·사진",
    every: 7,
    how: "현장 사진 + 짧은 글 + 버튼(전화·견적). 사진은 월 1회 이상",
    link: "https://business.google.com",
    why: "구글 지도 순위의 «인지도» 신호입니다.",
  },
  {
    key: "short_video",
    label: "세로 영상 (클립·릴스·쇼츠)",
    every: 14,
    how: "하나 찍어 네이버 클립(장소 태그)·당근 스토리·인스타 릴스에 같이. «창업자 간판 견적·가성비» 정보형이 조회수가 나옵니다",
    why: "네이버 클립은 통합검색·플레이스에 노출되는 공식 경로입니다.",
  },
  {
    key: "review_check",
    label: "리뷰 확인·답글",
    every: 2,
    how: "플레이스·구글 리뷰에 48시간 안에 답글. 리뷰 요청은 실제 시공 고객에게, 별점·문구 지정 없이",
    link: "https://smartplace.naver.com/bizes",
    why: "답글 속도가 양쪽 순위에 들어갑니다. 인센티브로 리뷰를 받으면 계정이 정지됩니다.",
  },
  {
    key: "ads_report",
    label: "파워링크 검색어·잔액 보기",
    every: 7,
    how: "광고주센터 대시보드에서 비즈머니 잔액, 광고 관리에서 7일 클릭·비용. 확장검색으로 엉뚱한 검색어에 나가지 않는지",
    link: "https://ads.naver.com/manage/ad-accounts/2570727/dashboard",
    why: "잔액이 0이 되면 광고가 멈추고, 안 보면 돈이 어디로 새는지 모릅니다.",
  },
  {
    key: "search_console",
    label: "서치콘솔 확인",
    every: 30,
    how: "실적(검색어·클릭) · 페이지 색인(새로 빠진 페이지가 있나)",
    link: "https://search.google.com/search-console?resource_id=sc-domain%3Asusannadesign.co.kr",
    why: "구글에 어떤 검색어로 몇 번 나오는지는 여기만 알려 줍니다.",
  },
  {
    key: "g2b_watch",
    label: "나라장터 간판·안내판 공고 보기",
    every: 7,
    how: "세부품명 «간판»·«안내판»으로 대전·충청 공고. 여성기업 1인 견적(5천만원 이하) 대상인지",
    link: "https://www.g2b.go.kr",
    why: "공공 간판은 중소기업자만 들어가는 경쟁제품입니다.",
  },
];

export type DeskLink = { label: string; href: string; note?: string };

/** 바로가기 — 채널 관리 화면들. 비밀번호·계정 정보는 여기 적지 않습니다 */
export const DESK_LINKS: { group: string; items: DeskLink[] }[] = [
  {
    group: "네이버",
    items: [
      { label: "스마트플레이스", href: "https://smartplace.naver.com/bizes", note: "새소식 · 사진 · 리뷰 · 통계" },
      { label: "광고주센터", href: "https://ads.naver.com/manage/ad-accounts/2570727/dashboard", note: "비즈머니 · 파워링크" },
      { label: "네이버 예약 파트너", href: "https://partner.booking.naver.com", note: "무료 상담 예약" },
      { label: "서치어드바이저", href: "https://searchadvisor.naver.com", note: "네이버 색인" },
      { label: "우리 플레이스 페이지", href: "https://map.naver.com/p/entry/place/1378209445", note: "손님이 보는 화면" },
    ],
  },
  {
    group: "구글",
    items: [
      { label: "서치콘솔", href: "https://search.google.com/search-console?resource_id=sc-domain%3Asusannadesign.co.kr", note: "색인 · 검색어" },
      { label: "비즈니스 프로필", href: "https://business.google.com", note: "지도 · 리뷰 · 게시물" },
      { label: "애널리틱스(GA4)", href: "https://analytics.google.com", note: "홈페이지 방문" },
    ],
  },
  {
    group: "동네 · 중개",
    items: [
      { label: "당근 비즈프로필", href: "https://business.daangn.com", note: "소식 · 스토리" },
      { label: "숨고 고수", href: "https://soomgo.com/pro", note: "10/6부터 책임보험 서류 검수" },
      { label: "간판의품격", href: "https://www.ganpoom.com", note: "간판 전문 중개 · 대전 28곳" },
      { label: "카카오비즈니스", href: "https://business.kakao.com", note: "카카오맵 · 톡채널 (무료)" },
    ],
  },
  {
    group: "공공 발주",
    items: [
      { label: "공공구매종합정보망", href: "https://www.smpp.go.kr", note: "직접생산확인 · 여성기업" },
      { label: "나라장터", href: "https://www.g2b.go.kr", note: "간판 5512190401 · 안내판 5512171801" },
      { label: "학교장터(S2B)", href: "https://www.s2b.kr", note: "학교 · 지자체 소액" },
      { label: "대전 서구 고시공고", href: "https://www.seogu.go.kr", note: "간판 교체 지원사업" },
    ],
  },
  {
    group: "도구",
    items: [
      { label: "Brave 주소 제출", href: "https://search.brave.com/submit-url", note: "Claude 검색 쪽 색인" },
      { label: "Supabase 대시보드", href: "https://supabase.com/dashboard", note: "SQL 실행 · 저장소" },
    ],
  },
];
