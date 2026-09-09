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
    title: "안녕하세요\n수산나디자인입니다",
    sub: "2012년부터 대전에서 간판을 디자인하고 만들고 세워 왔습니다. 상담부터 시공 후 관리까지 한자리에서 맡습니다.",
    image: "/images/work-01.jpg",
    alt: "저녁 무렵 점등된 고층 건물 옥상 간판",
  },
  {
    eyebrow: "02",
    title: "건물의 이름을\n가장 높은 곳에",
    sub: "빌딩 외벽, 옥상 광고탑, 도로변 사인까지. 규모가 큰 현장을 다뤄 왔습니다.",
    image: "/images/hero-night.jpg",
    alt: "야간 점등된 옥상 광고탑",
  },
  {
    eyebrow: "03",
    title: "795평 자체 공장에서\n직접 만듭니다",
    sub: "절단·가공·도색·조립을 공장 안에서 끝내기 때문에 일정과 품질을 저희가 통제합니다.",
    image: "/images/hero-factory.jpg",
    alt: "수산나디자인 자체 공장 제작 현장",
  },
  {
    eyebrow: "04",
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

export type Product = {
  /** 분류. 화면의 필터 탭이 이 값들로 만들어집니다 */
  group: string;
  name: string;
  desc: string;
  /** 유형 키워드. 카드에서 `채널 간판 | 후광 간판 | 야간 점등` 로 붙습니다 */
  tags: string[];
  image: string;
  alt: string;
};

/**
 * 제품(간판 유형) 카탈로그 — DB 가 죽었을 때 쓰는 폴백입니다 [A1].
 *
 * ⚠️ **여기를 고쳐서 제품을 늘리려 하지 마세요.** 원본은 DB(`content_blocks`
 * `section='product'`)고, 관리자 화면 **"제품" 탭**에서 배포 없이 고칩니다 (F19).
 * `works`·`slides` 와 같은 관계입니다 (`AGENTS.md` 경고).
 *
 * 🔴 **가격 칸이 없는 것이 설계입니다.** 조사한 네 곳 중 맞춤 제작을 파는 곳
 * (아트네온)은 쇼핑몰 껍데기를 쓰면서도 목록에 가격을 안 띄웁니다 —
 * 정가가 성립하지 않아서입니다 (`reference/reference.md` 부록 A).
 */
export const products: Product[] = [
  {
    group: "실외",
    name: "채널 간판",
    desc: "글자 하나하나를 입체로 만들어 LED 를 넣습니다. 야간 점등이 필요한 상가·매장에 씁니다.",
    tags: ["채널 간판", "후광 간판", "야간 점등"],
    image: "/images/work-17.jpg",
    alt: "태평한우 채널 간판 야간 점등",
  },
  {
    group: "실외",
    name: "옥상 광고탑 · 외벽 사인",
    desc: "건물 옥상과 외벽에 올리는 대형 사인입니다. 고소작업차와 로프 작업으로 시공합니다.",
    tags: ["옥상 광고탑", "외벽 사인", "고소작업"],
    image: "/images/work-16.jpg",
    alt: "빌딩 외벽 사인 고소작업 현장",
  },
  {
    group: "실외",
    name: "사옥 · 기업 CI 사인",
    desc: "기업 CI 에 맞춘 사옥 사인입니다. 다점포 CI 교체를 일괄로 진행합니다.",
    tags: ["사옥 사인", "CI 교체", "다점포 일괄"],
    image: "/images/work-01.jpg",
    alt: "삼성화재 사옥 사인 주간",
  },
  {
    group: "실내",
    name: "로비 사인 · 이미지월",
    desc: "건물 로비의 첫 얼굴이 되는 사인입니다. 인테리어 공정과 맞물려 시공합니다.",
    tags: ["로비 사인", "이미지월", "인테리어 연계"],
    image: "/images/work-05.jpg",
    alt: "K-water 기술 로비 벽면 사인",
  },
  {
    group: "실내",
    name: "실내 사인 · 스카시 문자",
    desc: "글자를 판재에서 잘라 벽에 띄워 붙입니다. 층별 안내·실명판도 같은 방식으로 맞춥니다.",
    tags: ["스카시 문자", "실내 사인", "층별 안내"],
    image: "/images/work-20.jpg",
    alt: "커뮤니티 시설 벽면 스카시 문자",
  },
  {
    group: "구조물",
    name: "캐노피 · 파사드",
    desc: "사인물을 얹을 구조부터 만듭니다. 구조 검토 후 설계·제작·시공까지 한 곳에서 합니다.",
    tags: ["캐노피", "파사드", "철구조물"],
    image: "/images/work-07.jpg",
    alt: "대전무역회관 캐노피",
  },
];

export type Material = {
  /** 화면 표시 안 함. 파일명 대응용 키 (`material-<key>.jpg`) */
  key: string;
  name: string;
  desc: string;
  image: string;
  alt: string;
};

/**
 * 재질 — **DB(`content_blocks` `section='material'`)가 죽었을 때 쓰는 폴백입니다** [A1].
 *
 * 🔴 **원본은 DB 입니다** (2026-09-05, `0009_material_signmodel.sql`). 처음엔 이
 * 배열이 유일한 원본이었는데, "관리자 화면에서 직접 추가·삭제하고 싶다"는 지시로
 * `product`(F19)와 같은 방식의 CMS 구역이 됐습니다. **이 배열을 고쳐서 재질을
 * 늘리려 하지 마세요** — `/admin/content?section=material` 에서 하세요(배포 불필요).
 * 이 배열은 그 화면·DB 가 전부 죽었을 때만 나가는 최소 세트(7종)입니다.
 *
 * 🔴 **재질끼리 묶을 분류축이 아직 없어 그룹·필터 탭을 안 만들었습니다** — 있는 재질을
 * 그대로 다 보여주는 것으로 시작합니다(`components/MaterialsGrid.tsx` 참고).
 * 제품(간판 유형)과 묶어 "이 재질 위의 이 간판" 조합까지 보여주는 건 다음 단계입니다.
 *
 * 🔴 **사진은 간판을 얹은 렌더가 아니라 재질 애셋의 원본 표면(diffuse 텍스처)입니다**
 * (2026-09-05, 사람이 정정했습니다 — 처음엔 T1 채널 간판을 얹은 렌더를 썼다가,
 * "이름·설명 대신 표면 자체를 보여달라"는 지시로 바꿨습니다). 형제 저장소
 * `DeGaJa_Agent` 의 `users/hanjeonghyun/domains/susanna/blender/assets/materials`
 * (ambientCG CC0, 2K 원본)에서 재질당 `<이름>_diff_2k.jpg` 하나를 골라 가운데
 * 정사각으로 잘라 900×900 로 앉혔습니다. **실사진이 아니라 텍스처 스캔입니다** [P6].
 *
 * 🔴 **10종에서 7종으로 줄었습니다** (2026-09-05, 사람이 화면을 보고 지시).
 * `metal`(Metal007)·`rust`(Metal022)·`tile`(Tiles098, 이끼 낀 포장석)는 사진만 보고
 * 무슨 재질인지 못 알아봤습니다 — 이름표를 안 쓰는 화면이라(위 "글자를 아예 안 씁니다"
 * 참고) 사진 자체가 재질을 설명해야 하는데, 이 셋은 그 역할을 못 했습니다.
 * `paint` 슬롯은 같은 날 `PaintedPlaster017`(이끼·얼룩진 외벽)에서 `Plaster001`
 * (매끈한 흰 미장벽)로 바꿨습니다 — 사람이 원하는 "평면"의 실제 예시가 이미
 * assets 폴더 안에 있었습니다. **더 애매한 재질을 새로 추가하기 전에 "사진만 보고
 * 알아볼 수 있나"부터 확인하세요.**
 */
export const materials: Material[] = [
  {
    key: "granite",
    name: "화강석",
    desc: "한국 상가 저층 마감의 기본입니다.",
    image: "/images/material-granite.jpg",
    alt: "화강석 재질 표면",
  },
  {
    key: "brick",
    name: "벽돌",
    desc: "상가 외벽에 가장 흔한 재질입니다.",
    image: "/images/material-brick.jpg",
    alt: "벽돌 재질 표면",
  },
  {
    key: "concrete",
    name: "콘크리트",
    desc: "노출 콘크리트, 시멘트 외벽입니다.",
    image: "/images/material-concrete.jpg",
    alt: "콘크리트 재질 표면",
  },
  {
    key: "facade",
    name: "파사드 통짜",
    desc: "지저분한 외벽을 통째로 가리는 통판입니다.",
    image: "/images/material-facade.jpg",
    alt: "파사드 통판 재질 표면",
  },
  {
    key: "marble",
    name: "대리석",
    desc: "고급 매장·로비 톤에 어울립니다.",
    image: "/images/material-marble.jpg",
    alt: "대리석 재질 표면",
  },
  {
    key: "paint",
    name: "도장·미장",
    desc: "매끈하게 마감한 도장 벽입니다.",
    image: "/images/material-paint.jpg",
    alt: "도장 마감 재질 표면",
  },
  {
    key: "wood",
    name: "목재",
    desc: "따뜻한 톤입니다. 시공 여부는 매장에 맞춰 확인합니다.",
    image: "/images/material-wood.jpg",
    alt: "목재 재질 표면",
  },
];

/**
 * ⚠️ **위 `SignType`(사업영역, `/signs`)과 이름이 겹치지 않게 `SignModel`로 지었습니다.**
 * 사업영역은 "무엇을 하는 회사인가"(업종 단위)이고, 이건 "어떻게 만드는가"(제작 방식
 * 단위)라 데이터 모양 자체가 다릅니다 — 하나로 합치면 두 화면 중 하나가 어긋납니다.
 */
export type SignModel = {
  /** 파일명 대응용 키 (`type-<key>.jpg`) — 제품 상세페이지 주소도 이 값입니다 */
  key: string;
  /** T1~T9 — `SIGNTYPES.md` 의 조합 번호와 그대로 맞춥니다 */
  code: string;
  name: string;
  spec: string;
  /**
   * 손님용 설명 (제품 상세페이지, F24-d) — **DB 가 죽었을 때의 폴백입니다** [A1].
   * 원본은 DB 이고 대표님이 `/admin/content?section=sign_model` 에서 고칩니다.
   * 🔴 여기 글을 고쳐도 화면은 안 바뀝니다(DB 값이 이깁니다) — 관리자 화면에서 고치세요.
   */
  desc: string;
  image: string;
};

/**
 * 간판 종류 9가지 — **DB(`content_blocks` `section='sign_model'`)가 죽었을 때 쓰는
 * 폴백입니다** [A1]. 원본은 DB 이고, **가격대(`sub`)는 관리자 화면에서 고칩니다**
 * (`0009_material_signmodel.sql`). 이 배열의 `spec` 은 화면에 안 나가는 참고용
 * 사양이라, 여기 가격 칸이 없는 게 정상입니다 — 가격을 지어내 넣지 마세요 [P6].
 *
 * 🔴 **사진 없이 "간판 있어요"만 말로 파는 게 아니라, 9가지를 전부 3D 로 지어
 * 렌더로 보여줍니다** (2026-09-05, 사람 지시 — "간판을 9개로 모델링한 걸 가져오라").
 * 형제 저장소 `DeGaJa_Agent` 의
 * `users/hanjeonghyun/domains/susanna/blender/_lab/03_signtypes/_catalog`
 * (재질 58종 × 간판 9종 = 522장) 중 **화강석(Granite002B) 한 재질로 고정**한 9장을
 * 골랐습니다 — 재질을 하나로 고정해야 "무엇이 다른가"가 제작 방식(축③·①)으로만
 * 읽힙니다(재질까지 같이 바뀌면 두 변수가 섞입니다, `RENDER.md` 의 규칙과 같습니다).
 *
 * 🔴 **여기 9종은 `SIGNTYPES.md` §9 "수산나가 실제로 하는 것" 목록입니다.**
 * 업계 일반의 나머지 방식은 안 냅니다 — 문의가 왔을 때 "그건 안 합니다"가 되는 게
 * 제일 큰 손해라서입니다.
 *
 * ⚠️ **치수는 전부 가정값입니다.** 실측이 아니라 3D 씬의 기본값입니다 — 견적·발주에
 * 그대로 쓰지 마세요(카탈로그 머리말과 같은 경고) [P6].
 */
export const signTypes9: SignModel[] = [
  {
    key: "channel-front",
    code: "T1",
    name: "전면발광 채널",
    spec: "알루미늄 80mm · 직부착 · 앞면만 빛남",
    desc:
      "글자 앞면이 빛나는 가장 대중적인 방식입니다. 알루미늄 채널 옆면에 전면 아크릴을 끼워 만들고, 야간 시인성이 아홉 가지 중 가장 좋습니다.\n\n글자 뒤에 전기선을 가리는 바가 들어갑니다. 정면이 잘 보이는 1층 상가에서 가장 많이 쓰는 구성입니다.",
    image: "/images/type-channel-front.jpg",
  },
  {
    key: "channel-halo",
    code: "T2",
    name: "후광 채널",
    spec: "60mm · 벽 이격 60mm · 빛이 벽으로 샘",
    desc:
      "빛이 글자 뒤로 나와 벽을 밝힙니다. 벽에서 띄워 달기 때문에 피스가 겉으로 보이지 않고, 눈부심이 적어 차분하게 읽힙니다.\n\n배선을 인테리어 단계부터 같이 잡아야 합니다. 나중에 손대면 전선이 겉으로 지저분하게 남습니다.",
    image: "/images/type-channel-halo.jpg",
  },
  {
    key: "channel-both",
    code: "T3",
    name: "전후면 발광",
    spec: "90mm · 벽 이격 50mm · 앞뒤로 빛남",
    desc:
      "앞면과 뒷면이 함께 빛납니다. 글자 자체의 밝기와 벽에 번지는 빛을 한 번에 씁니다.\n\n전면발광보다 두껍게 만들고 벽에서도 띄웁니다.",
    image: "/images/type-channel-both.jpg",
  },
  {
    key: "scasi",
    code: "T4",
    name: "무점등 스카시",
    spec: "20mm · 벽 이격 30mm · 그림자로 읽힘",
    desc:
      "빛 없이 입체감만으로 읽는 글자입니다. 그림자로 읽혀 차분하고, 조명 부품이 없어 아홉 가지 중 수명이 가장 깁니다(7~10년).\n\n아크릴·포멕스·목재·금속 등 재료 선택의 폭이 넓습니다.",
    image: "/images/type-scasi.jpg",
  },
  {
    key: "facade",
    code: "T5",
    name: "외벽사인 · 파사드",
    spec: "갈바 통판 위에 전광 채널",
    desc:
      "벽에 갈바 통판을 먼저 세우고 그 위에 글자를 얹습니다.\n\n벽면이 고르지 않거나 타일·벽돌이라 글자를 직접 붙이기 어려울 때, 또는 면 전체를 브랜드 색으로 덮고 싶을 때 씁니다.",
    image: "/images/type-facade.jpg",
  },
  {
    key: "projecting",
    code: "T6",
    name: "돌출간판",
    spec: "벽에서 1.15m 직각으로",
    desc:
      "벽에서 직각으로 튀어나오게 답니다.\n\n정면이 아니라 길을 따라 걸어오는 사람에게 보이는 것이 목적이라, 골목이나 상가 통로에서 정면 간판이 안 보이는 자리에 씁니다.",
    image: "/images/type-projecting.jpg",
  },
  {
    key: "rooftop",
    code: "T7",
    name: "옥상광고탑",
    spec: "옥상 철골 구조 · 사전 심의 대상",
    desc:
      "건물 옥상에 철골 구조를 세워 올립니다. 멀리서 보이는 것이 목적입니다.\n\n구조 검토와 사전 심의 대상이고 고소작업 장비가 들어갑니다. 그래서 다른 종류보다 준비 기간이 깁니다 — 일정이 정해져 있으면 미리 알려 주세요.",
    image: "/images/type-rooftop.jpg",
  },
  {
    key: "hanging",
    code: "T8",
    name: "행잉형",
    spec: "처마에서 봉 2개로 매닮",
    desc:
      "처마나 캐노피 아래에 봉 두 개로 매답니다.\n\n벽에 구멍을 내기 어렵거나 이미 처마가 있는 자리에서 씁니다. 판과 글자는 외벽사인과 같은 방식으로 만들고 거는 방법만 다릅니다.",
    image: "/images/type-hanging.jpg",
  },
  {
    key: "bracket",
    code: "T9",
    name: "까치발 철문자",
    spec: "철판 5mm + 환봉 80mm · 무점등",
    desc:
      "레이저로 자른 철판을 환봉으로 벽에서 띄워 답니다. 무점등입니다.\n\n낮에는 햇빛이, 밤에는 외부 조명이 만드는 그림자로 읽힙니다. 띄워서 생기는 그림자 자체가 이 방식의 인상입니다.",
    image: "/images/type-bracket.jpg",
  },
];

/**
 * `/products`(제품) 를 **손님에게도 보일지** — 지금은 꺼져 있습니다.
 *
 * 🔴 **2026-09-09 에 한 번 켰다가 같은 날 다시 껐습니다** (둘 다 대표님 지시).
 * 켠 상태로 상세페이지(F24-d)까지 만들어 화면을 확인한 뒤, **배포는 «관리자만 보는»
 * 상태로 하기로 정했습니다.** 그러니 이 값이 `false` 인 것은 «아직 안 만들어서» 가
 * 아니라 **«만들어 두고 아직 안 여는 것»** 입니다. 열 준비는 끝나 있습니다.
 *
 * 꺼져 있어도 **관리자는 «새 디자인 미리보기»(F23)로 봅니다.** 손님에게는 404 입니다 —
 * 목록(`/products`)도 상세(`/products/<슬러그>`)도 같이 막힙니다.
 *
 * 🔴 **켜는 것은 대표님 결정입니다.** 켜면 세 곳이 한꺼번에 열립니다:
 * 페이지 404 해제 · 주 메뉴의 "제품" · `noindexPaths` 에서 빠지며 사이트맵 자동 포함.
 * **셋이 이 한 값에서 갈리는 게 설계입니다** — 페이지는 404 인데 메뉴만 서 있는 상태가
 * 제일 나쁩니다. 코드에서 할 일은 이 한 줄뿐입니다.
 *
 * ⚠️ **열기 전에 같이 볼 것**: 간판 종류의 「손님용 설명」(`content_blocks.body`,
 * `0011`)이 비어 있으면 그 상세페이지는 색인에서 빠집니다 — 내용 없는 페이지 아홉 장을
 * 검색에 올리지 않으려는 것입니다(F24-d).
 *
 * `SHOW_FABRICATION` 과 같은 모양의 스위치지만 **방향이 반대**입니다 —
 * 저건 "사진이 없어서 내린 것", 이건 "만들어 뒀지만 아직 안 연 것".
 */
export const SHOW_PRODUCTS: boolean = false;

export type Step = {
  no: string;
  title: string;
  desc: string;
  image: string;
  /** `/process` 상세 페이지에서 단계마다 펼쳐 보여주는 항목 */
  points: string[];
};

/** 업무 프로세스 — 회사소개서 06 — 640×480 */
export const steps: Step[] = [
  {
    no: "01",
    title: "상담 및 접수",
    desc: "고객 요구사항을 파악하고 현장을 직접 확인합니다.",
    image: "/images/step-1-consult.jpg",
    points: [
      "요구사항을 듣고 현장을 직접 확인합니다.",
      "벽면 재질과 상태를 봅니다. 드라이비트·석재·유리마다 고정 방식이 달라집니다.",
      "전기 인입 위치, 층수, 도로 폭을 확인합니다. 고소작업차 진입 여부가 시공비를 좌우합니다.",
    ],
  },
  {
    no: "02",
    title: "디자인 기획",
    desc: "콘셉트를 설정하고 시안을 제작합니다.",
    image: "/images/step-2-design.jpg",
    points: [
      "건물 용도와 브랜드 톤에 맞춰 콘셉트를 잡습니다.",
      "실제 건물 사진에 사인물을 합성해 보여드립니다.",
      "주간 시안과 야간 점등 시안을 함께 드립니다.",
    ],
  },
  {
    no: "03",
    title: "시안 확정",
    desc: "고객 검토를 거쳐 최종 디자인을 확정합니다.",
    image: "/images/step-3-confirm.jpg",
    points: [
      "시안을 검토하시고 최종안을 확정합니다.",
      "확정 전까지 수정해 드리며, 시안 제작에는 비용이 들지 않습니다.",
      "확정 후 제작 도면과 일정을 공유합니다.",
    ],
  },
  {
    no: "04",
    title: "제작",
    desc: "795평 자체 공장에서 전문 인력이 제작합니다.",
    image: "/images/step-4-production.jpg",
    points: [
      "795평 자체 공장에서 절단·가공·도색·조립을 진행합니다.",
      "외주로 넘기지 않기 때문에 일정과 품질을 저희가 통제합니다.",
      "철구조물이 포함된 경우 구조 검토 후 함께 제작합니다.",
    ],
  },
  {
    no: "05",
    title: "시공 및 완료",
    desc: "현장 시공 후 A/S까지 관리합니다.",
    image: "/images/step-5-install.jpg",
    points: [
      "자사 제작시공팀이 직접 설치합니다.",
      "옥외광고물 신고가 필요한 경우 행정 절차를 대행합니다.",
      "설치 후 점등·안전 확인까지 마치고 A/S를 관리합니다.",
    ],
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

export type Fab = { name: string; desc: string; image: string };

/**
 * FABRICATION(공장 공정) 구역을 화면에 그릴지 — **홈과 `/about` 이 같이 쓰는 스위치.**
 *
 * 2026-08-07 에 `false` 로 내렸습니다. 여섯 칸 중 실사진이 `fab-4-assemble.jpg`
 * 하나뿐이라 **"사진 준비 중" 상자 다섯 개**가 나가고 있었습니다.
 * 처음에는 홈만 껐는데(`app/page.tsx` 안의 지역 상수였습니다) `/about` 에 같은
 * 구역이 그대로 남아 있었습니다. 같은 날 `/about` 도 내리면서 **스위치를 여기 하나로
 * 합쳤습니다** — 둘로 두면 사진이 들어왔을 때 한쪽만 켜고 끝납니다.
 *
 * **지우지 않고 스위치로 둔 이유**: 공장 공정 사진이 들어오면 다시 켤 자리입니다.
 * 되살리려면 이 값을 `true` 로 바꾸면 끝입니다 — 두 페이지의 JSX·DB·관리자 화면이
 * 전부 그대로 살아 있습니다.
 *
 * ⚠️ **관리자 화면(F19)의 "제작 공정" 탭은 계속 보입니다.** 이 값이 `false` 인 동안
 * 그 탭에서 무엇을 고쳐도 **어느 화면에도 안 나옵니다.** F19 의 "구역을 비울 수
 * 없다" 함정과 같은 계열입니다.
 */
export const SHOW_FABRICATION: boolean = false;

/** 공장 공정 — 구 회사소개서 05. 업무프로세스 (절단→검수) — 800×600 */
export const equipment: Fab[] = [
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

/**
 * 홈 각 구역의 머리말(작은 영문 · 큰 제목 · 설명).
 *
 * 예전에는 `app/page.tsx` 안에 그대로 적혀 있어서 문구 한 줄을 고치려면 코드를
 * 고치고 배포해야 했습니다. 회사 문구는 `config/` 밖으로 새지 않는다는 원칙(A5)에
 * 어긋나기도 했습니다. 지금은 여기 있고, **관리자 화면(F19)에서도 바꿉니다.**
 *
 * `title` 의 줄바꿈(`\n`)은 화면에서도 그대로 줄이 나뉩니다.
 */
export type SectionCopy = { eyebrow: string; title: string; desc: string };

export const sectionCopy: Record<string, SectionCopy> = {
  "home-why": {
    eyebrow: "WHY SUSANNA",
    title: "만드는 곳과 다는 곳이\n같아야 책임이 명확합니다",
    desc: "제작과 시공이 나뉘면 문제가 생겼을 때 서로를 가리킵니다. 수산나디자인은 2012년부터 디자인·제작·시공·관리를 한 팀이 맡아 왔습니다.",
  },
  "home-process": {
    eyebrow: "PROCESS",
    title: "상담부터 시공까지, 이렇게 진행됩니다",
    desc: "현장 확인과 시안 제작까지 무료로 진행합니다.",
  },
  "home-works": {
    eyebrow: "OUR WORK",
    title: "주요 실적",
    desc: "관공서 · 금융 · 기업 · 상업시설 등 다양한 분야에서 시공했습니다.",
  },
  "home-fabrication": {
    eyebrow: "FABRICATION",
    title: "공장을 가졌다는 건\n일정을 지킬 수 있다는 뜻입니다",
    desc: "절단부터 검수까지 795평 자체 공장 안에서 끝냅니다. 외주 대기로 납기가 밀리지 않습니다.",
  },
  "home-cta": {
    eyebrow: "",
    title: "어느 정도 규모인지 알려주세요",
    desc: "현장 확인과 디자인 시안까지 무료입니다. 부담 없이 문의하세요.",
  },
};

/** 홈 WHY SUSANNA 구역의 근거 네 줄 */
export type WhyPoint = { title: string; desc: string };

export const whyPoints: WhyPoint[] = [
  {
    title: "795평 자체 공장",
    desc: "절단·가공·도색·조립을 외주 없이 공장 안에서 끝냅니다.",
  },
  {
    title: "사인물과 철구조물을 함께",
    desc: "캐노피·파사드 같은 구조물까지 한 번에 설계하고 시공합니다.",
  },
  {
    title: "대형 현장 경험",
    desc: "삼성화재, KAIST, 교보생명, 금성백조, 대전무역회관 등을 시공했습니다.",
  },
  {
    title: "인증·등록 6종 보유",
    desc: "옥외광고사업 등록, 직접생산확인, 공장등록을 갖춘 정식 등록 업체입니다.",
  },
];

/** 견적폼 선택지 */
export const floorOptions = ["1층", "2~3층", "4~7층", "8층 이상", "옥상", "실내"];
export const timingOptions = ["1주 이내", "1개월 이내", "3개월 이내", "미정"];
export const signTypeOptions = signTypes.map((t) => t.name).concat("기타");
