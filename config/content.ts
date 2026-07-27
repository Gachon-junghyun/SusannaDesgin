/**
 * 사이트 콘텐츠 데이터. 내용은 회사소개서에서 옮겨 적었습니다.
 * 이미지 경로는 전부 `public/images/` 기준이며, 파일이 없으면 크기가 적힌
 * 플레이스홀더가 뜨고 같은 이름으로 넣으면 자동 교체됩니다.
 */

export type Slide = {
  eyebrow: string;
  title: string;
  sub: string;
  image: string;
  alt: string;
};

/** 히어로 슬라이드 — 1920×1080 (16:9) */
export const slides: Slide[] = [
  {
    eyebrow: "01",
    title: "건물의 이름을\n가장 높은 곳에",
    sub: "빌딩 외벽, 옥상 광고탑, 도로변 사인까지. 규모가 큰 현장을 다뤄 왔습니다.",
    image: "/images/hero-night.jpg",
    alt: "야간 점등된 옥상 광고탑",
  },
  {
    eyebrow: "02",
    title: "795평 자체 공장에서\n직접 만듭니다",
    sub: "절단·가공·도색·조립을 공장 안에서 끝내기 때문에 일정과 품질을 저희가 통제합니다.",
    image: "/images/hero-factory.jpg",
    alt: "수산나디자인 자체 공장 제작 현장",
  },
  {
    eyebrow: "03",
    title: "사인물을 넘어\n철구조물까지",
    sub: "캐노피, 파사드, 구조물 설계와 제작·시공을 함께 진행합니다.",
    image: "/images/hero-install.jpg",
    alt: "철구조물 시공 현장",
  },
];

export type SignType = {
  slug: string;
  name: string;
  en: string;
  desc: string;
  points: string[];
  image: string;
};

/** 사업 영역 — 회사소개서 05. 사업 소개 — 800×600 (4:3) */
export const signTypes: SignType[] = [
  {
    slug: "outdoor",
    name: "옥외광고물",
    en: "OUTDOOR",
    desc: "빌딩 외벽, 도로변, 건물 옥상 등 다양한 옥외 광고물을 기획하고 제작합니다.",
    points: [
      "옥상 광고탑 · 외벽 사인",
      "고소작업 시공 및 유지보수",
      "옥외광고물 행정 신고 대행",
    ],
    image: "/images/biz-outdoor.jpg",
  },
  {
    slug: "sign",
    name: "간판디자인",
    en: "SIGNAGE",
    desc: "상가, 오피스, 상업시설 등 공간에 맞춘 간판을 디자인하고 시공합니다.",
    points: [
      "채널 · 스카시 · 돌출 간판",
      "CI 교체 및 브랜드 통일 작업",
      "다점포 일괄 시공",
    ],
    image: "/images/biz-sign.jpg",
  },
  {
    slug: "steel",
    name: "철구조물",
    en: "STEEL STRUCTURE",
    desc: "캐노피, 파사드, 구조물 등 철재 구조물을 설계하고 제작·시공합니다.",
    points: [
      "주차장 캐노피 · 파사드",
      "구조 검토 후 설계 · 제작",
      "사인물과 구조물 동시 시공",
    ],
    image: "/images/biz-steel.jpg",
  },
  {
    slug: "indoor",
    name: "옥내광고물",
    en: "INDOOR",
    desc: "실내 사인, 디스플레이, 인테리어 광고물을 전문적으로 기획하고 설치합니다.",
    points: [
      "로비 사인 · 이미지월",
      "층별 안내 · 유도 사인",
      "인테리어 연계 시공",
    ],
    image: "/images/biz-indoor.jpg",
  },
];

export type Step = {
  no: string;
  title: string;
  desc: string;
  image: string;
};

/** 업무 프로세스 — 회사소개서 06 — 640×480 */
export const steps: Step[] = [
  {
    no: "01",
    title: "상담 및 접수",
    desc: "고객 요구사항을 파악하고 현장을 직접 확인합니다.",
    image: "/images/step-1-consult.jpg",
  },
  {
    no: "02",
    title: "디자인 기획",
    desc: "콘셉트를 설정하고 시안을 제작합니다.",
    image: "/images/step-2-design.jpg",
  },
  {
    no: "03",
    title: "시안 확정",
    desc: "고객 검토를 거쳐 최종 디자인을 확정합니다.",
    image: "/images/step-3-confirm.jpg",
  },
  {
    no: "04",
    title: "제작",
    desc: "795평 자체 공장에서 전문 인력이 제작합니다.",
    image: "/images/step-4-production.jpg",
  },
  {
    no: "05",
    title: "시공 및 완료",
    desc: "현장 시공 후 A/S까지 관리합니다.",
    image: "/images/step-5-install.jpg",
  },
];

export type Work = {
  slug: string;
  title: string;
  category: string;
  location: string;
  tags: string[];
  image: string;
};

/**
 * 주요 실적 — 회사소개서 07. 주요 실적 사진 기준.
 * 지역·연도는 확인되는 대로 채우세요. (TODO)
 *
 * **순서 규칙: 사진이 있는 실적을 앞에 둡니다.**
 * 목록 첫 화면이 회색 플레이스홀더로 채워지면 실적이 없는 회사로 보입니다.
 * 사진이 들어오는 대로 그 항목을 위로 올리세요.
 */
export const works: Work[] = [
  // --- 사진 있음 (w16~w21) ---
  { slug: "w16", title: "빌딩 외벽 사인 고소작업", category: "기업", location: "", tags: ["외부 사인물", "고소작업"], image: "/images/work-16.jpg" },
  { slug: "w17", title: "태평한우", category: "상업시설", location: "", tags: ["채널 간판", "야간 점등"], image: "/images/work-17.jpg" },
  { slug: "w18", title: "좋은교회", category: "생활·문화", location: "", tags: ["채널 간판", "십자가 사인"], image: "/images/work-18.jpg" },
  { slug: "w19", title: "자자고호텔", category: "상업시설", location: "", tags: ["후광 채널 사인", "실내 사인"], image: "/images/work-19.jpg" },
  { slug: "w20", title: "커뮤니티 시설 사인", category: "생활·문화", location: "", tags: ["실내 사인", "스카시 문자"], image: "/images/work-20.jpg" },
  { slug: "w21", title: "체육관 실내 사인", category: "생활·문화", location: "", tags: ["실내 사인", "스카시 문자"], image: "/images/work-21.jpg" },

  // --- 사진 있음 (회사소개서에서 추출, 2026-07-27) ---
  { slug: "w22", title: "청주 가경 아이파크 2단지 사인물", category: "주거", location: "청주", tags: ["단지 사인", "고소작업"], image: "/images/work-22.jpg" },
  { slug: "w23", title: "홈센터 실내 사인물", category: "상업시설", location: "", tags: ["실내 사인", "채널 간판"], image: "/images/work-23.jpg" },
  { slug: "w01", title: "삼성화재 사인물", category: "금융", location: "", tags: ["외부 사인물"], image: "/images/work-01.jpg" },
  { slug: "w04", title: "KAIST 사인물", category: "관공서·공공", location: "대전", tags: ["옥내외 사인"], image: "/images/work-04.jpg" },
  { slug: "w05", title: "K-water 기술 사인물", category: "관공서·공공", location: "대전", tags: ["외부 사인물"], image: "/images/work-05.jpg" },
  { slug: "w06", title: "대전무역회관 사옥 사인물", category: "관공서·공공", location: "대전", tags: ["외부 사인물"], image: "/images/work-06.jpg" },
  { slug: "w07", title: "대전무역회관 주차장 캐노피", category: "철구조물", location: "대전", tags: ["캐노피", "철구조물"], image: "/images/work-07.jpg" },
  { slug: "w09", title: "KT 매장 뉴 CI 간판 교체", category: "기업", location: "", tags: ["CI 교체", "다점포"], image: "/images/work-09.jpg" },
  { slug: "w10", title: "금성백조 본사 사옥 옥외간판", category: "기업", location: "대전", tags: ["옥외간판"], image: "/images/work-10.jpg" },
  { slug: "w11", title: "롯데하이마트 사인물", category: "상업시설", location: "", tags: ["외부 사인물"], image: "/images/work-11.jpg" },
  { slug: "w13", title: "힐스테이트 오피스텔 사인물", category: "주거", location: "", tags: ["단지 사인"], image: "/images/work-13.jpg" },
  { slug: "w14", title: "칼릭스빌딩 사인 작업", category: "기업", location: "", tags: ["외부 사인물"], image: "/images/work-14.jpg" },
  { slug: "w15", title: "기아 서비스 사인물", category: "기업", location: "", tags: ["외부 사인물"], image: "/images/work-15.jpg" },

  // --- 사진 대기 ---
  // 앞의 셋은 회사소개서 원본이 4장 합쳐진 띠 이미지라 잘라도 435×276 밖에 안 나옵니다.
  // 뉴코아는 회사소개서에 사진 자체가 없습니다. 원본 촬영본이 나오면 위로 올리세요.
  { slug: "w02", title: "교보생명 옥상 광고탑", category: "금융", location: "", tags: ["옥상 광고탑", "유지보수"], image: "/images/work-02.jpg" },
  { slug: "w03", title: "우리은행 사인물", category: "금융", location: "", tags: ["외부 사인물", "CI"], image: "/images/work-03.jpg" },
  { slug: "w08", title: "KT 탄방타워 사인물", category: "기업", location: "대전", tags: ["외부 사인물"], image: "/images/work-08.jpg" },
  { slug: "w12", title: "뉴코아 아울렛 사인물", category: "상업시설", location: "", tags: ["외부 사인물"], image: "/images/work-12.jpg" },
];

export const workCategories = [
  "전체",
  "금융",
  "관공서·공공",
  "기업",
  "상업시설",
  "철구조물",
  "주거",
  "생활·문화", // 교회·체육관·커뮤니티시설 등. 2026-07 실적 사진 추가하며 신설
];

/** 공장 공정 — 구 회사소개서 05. 업무프로세스 (절단→검수) — 800×600 */
export const equipment = [
  { name: "절단", desc: "판재·형강 재단", image: "/images/fab-1-cut.jpg" },
  { name: "가공", desc: "밴딩·성형 가공", image: "/images/fab-2-form.jpg" },
  { name: "도색", desc: "분체·우레탄 도장", image: "/images/fab-3-paint.jpg" },
  { name: "조립", desc: "구조 조립 및 배선", image: "/images/fab-4-assemble.jpg" },
  { name: "설치", desc: "현장 시공·고소작업", image: "/images/fab-5-install.jpg" },
  { name: "검수", desc: "점등·안전 최종 확인", image: "/images/fab-6-inspect.jpg" },
];

/** 주요 연혁 — 회사소개서 04 */
export const history = [
  { stage: "시작", date: "2012. 05", text: "(주)수산나디자인 설립" },
  { stage: "성장", date: "2013. 08", text: "회사 확장 이전" },
  { stage: "안정", date: "2016. 03", text: "공장 부지 및 공장 구입(795평) 이전" },
  {
    stage: "혁신",
    date: "2024",
    text: "옥외광고사업 등록 · 여성기업 · 중소기업 · 직접생산 · 공장등록 인증 취득",
  },
  { stage: "미래", date: "2026", text: "새로운 도약" },
];

/** 비전 — 회사소개서 08 */
export const vision = {
  headline: "대한민국 최고의 광고·간판 전문기업",
  body: "고객의 공간에 가치를 더하고 신뢰와 기술력으로 성장하는 수산나디자인이 되겠습니다.",
  goals: [
    { no: "01", title: "품질 고도화", desc: "최신 기술과 설비 투자로 제품 품질을 지속 향상합니다." },
    { no: "02", title: "사업 영역 확대", desc: "광고물·철구조물을 넘어 종합 공간솔루션 기업으로 도약합니다." },
    { no: "03", title: "고객 신뢰 구축", desc: "약속을 지키는 기업, 고객과 함께 성장하는 파트너가 됩니다." },
  ],
};

/** 신뢰 지표 */
export const stats = [
  { value: "2012", unit: "년~", label: "설립" },
  { value: "795", unit: "평", label: "자체 공장" },
  { value: "6", unit: "종", label: "보유 인증·등록" },
  { value: "0,000", unit: "건", label: "누적 시공" }, // TODO — 실제 건수로 교체
];

/** 견적폼 선택지 */
export const floorOptions = ["1층", "2~3층", "4~7층", "8층 이상", "옥상", "실내"];
export const timingOptions = ["1주 이내", "1개월 이내", "3개월 이내", "미정"];
export const signTypeOptions = signTypes.map((t) => t.name).concat("기타");
