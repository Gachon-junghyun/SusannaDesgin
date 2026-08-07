# 수산나디자인 홈페이지 — 구조 지도

> **이 문서의 목적**
> 코드를 처음 받는 사람이 30분 안에 전체 구조를 파악하고, 어디를 고치면 어디가
> 영향받는지 알 수 있게 하는 것. 대공사(리뉴얼·기능 추가) 전에 여기부터 읽습니다.
>
> **⚠️ 코드를 고치면 이 문서도 같이 고칩니다.** 규칙은 [`AGENTS.md`](../AGENTS.md) 참조.

| | |
|---|---|
| 최종 갱신 | 2026-08-07 (**숫자 지표 띠(`stat` 구역) 제거 — 홈·`/about` 양쪽.** 4칸 격자에 1건만 남아 **빈 회색 칸 3개**가 보이던 상태였고, 관리자 화면에서 마지막 1건을 지워도 **0건 → config 폴백**으로 되살아나 없앨 수가 없었습니다 [A1의 부작용]. 코드에서 걷어냈습니다 — 두 페이지의 `<dl>` · `config/sections.ts` 명세(관리자 탭) · `lib/cms.ts` `SiteBlocks.stats` · `config/content.ts` `stats`/`Stat`. 마이그레이션 `0005` 와 DB 행은 그대로 둡니다 · §3 F19 에 "구역을 비울 수 없다" 함정 기록) · 2026-08-07 (**주요실적 4건 추가 — CMS `works batch`, 코드·배포 없음.** `belkin · NEWNESS 매장 사인` · `라온카페` · `영림중문 도어 매장 실내 사인` · `청춘예찬` — 전부 상업시설·대전, 사진은 Supabase 스토리지. **F18 CLI 의 실계정 DB 작업이 이때 처음 실증됐습니다**(로그인·`list`·`batch` 4건) · §7.2 미검증 항목 축소) · 2026-08-06 (**Google Analytics 4 설치 — F22 신설**(`G-NNT57E6S9L`, 확정 도메인에서만 로드) · **개인정보처리방침 위탁·쿠키 조항 신설**(법적 의무) · §7 에 GA 속성 3개 정리 + Ads 미완성 캠페인 부채 신설) · 2026-08-06 (**우편번호 교정 `35374`(추정) → `35425`(대표님 확인)** — 푸터·회사개요·오시는길과 **구조화 데이터 `postalCode`** 5곳에 틀린 값이 나가고 있었습니다 · **구글 Search Console 색인 요청 5건**(`/works` `/about` `/process` `/support` `/quote`) · **구글 비즈니스 프로필 소유권 주장 진행중** — 기존 미소유 등록의 카테고리·주소·전화를 교정 · §7 갱신) · 2026-08-06 (**네이버 예약 개설 — 검수 신청까지 완료.** 예약 사업자 `1713161` · 상품 `간판 무료 상담`(날짜선택형·무료·노출중) · 상세소개에서 **사진/도면은 `susannadesign.co.kr/quote` 로 유도** · 적는 칸은 자유 입력(기타 요청사항) · §7 부채 1건 신설 · [`SEO.md`](SEO.md) C1-b 신설) · 2026-08-06 (**오시는길 링크 카드 — F21 신설.** `map.naver.com` 이 `x-frame-options: DENY` 라 지도 임베드가 불가능해, 주소·영업시간 + 네이버 플레이스·카카오맵 길찾기·전화 버튼으로 대체. `/support` 는 정적 유지) · 2026-08-06 (**네이버 스마트플레이스 — 가격정보 9건·영업시간·부가정보 직접 입력 완료**(플레이스 ID `1378209445`) · **`site.naverPlaceUrl` 신설 → `sameAs` 연결** · **`site.geo` 를 등록 좌표로 교체 — 이전 근사값이 실제 위치에서 약 10km 벗어나 있었음** · `site.mapUrl` 채움 · §7 부채 2건 해소·1건 신설(대표키워드·전화번호는 "업체 검토중" 으로 잠김)) · 2026-08-06 (**공장 전경 사진 투입 — 홈 `about-factory.jpg` + `/about` `about-office.jpg` · §7 사진 부채에서 "사옥 전경 1" 해소** · `public/images/README.md` 에 홈 자리가 누락돼 있던 것을 F4 함정으로 기록 · 알림 환경변수 `Secret` 재등록 완료) · 2026-08-06 (**견적 첨부파일 실보관 — F20 · `quote-files` 비공개 버킷 신설 · 알림 메일에 사진 직접 첨부 · `0006` 운영 실행 완료** · **Resend `susannadesign.co.kr` 도메인 인증 완료** — 회사 주소로 발송·수신자 2인) · 2026-08-06 (**페이지 문구 CMS — F19 · P14 `/admin/content` · `content_blocks` 표 신설** · **견적 알림 메일 미도착 원인 규명·수정** — 발신 도메인 미인증 403, 시험 발신 주소로 자동 우회) · 2026-07-28 (**당근 비즈프로필 등록 — `수산나디자인 간판제작`** · 채널 전략 4종(당근광고·숨고·플레이스→홈페이지 유입·블로그) [`SEO.md`](SEO.md) C1·C5·C6·C8 · **히어로 인사 슬라이드 추가 → 4장** · **네이버 소유확인 완료** · **URL 검사 느낌표 5건 해소** · 실적 사진 12장 투입 · F18 CMS 명령줄 도구 · IndexNow F17) |
| 서비스 주소 | **https://susannadesign.co.kr — 배포 완료·운영 중** (2026-07-26 확인) |
| 스택 | Next.js 16.2.11 (App Router, Turbopack) · React 19.2.4 · TypeScript 5 · Tailwind CSS v4 |
| 백엔드 | Supabase (Postgres + Auth + Storage) — **선택적**. 없어도 사이트는 동작 |
| 렌더링 | 정적 페이지(DB 안 쓰는 곳) · **DB 를 읽는 페이지는 요청 시 SSR** · 관리자 화면 동적 |
| 배포 | **Cloudflare Workers 무료** — Vercel Hobby 는 상업적 이용 금지, Netlify 무료는 크레딧 소진 시 사이트 중단 위험 ([DEPLOY.md](DEPLOY.md)) |

### 운영 배포 실측 (2026-07-26 · 검색 관련 항목은 07-27 갱신)

`curl` 로 실제 서비스 주소를 찔러 확인한 값입니다. 추측이 아닙니다.

| 항목 | 결과 |
|---|---|
| `https://susannadesign.co.kr/` | ✅ 200 · HTML 120KB · TTFB 0.78~1.58s |
| Supabase 연결 (Cloudflare 환경변수) | ✅ 됨 — `/admin/login` 이 안내문 대신 로그인 폼을 그림 |
| CMS 실동작 | ✅ 첫 슬라이드가 **관리자에서 업로드한 스토리지 사진**을 서비스 중 |
| `robots.txt` | ✅ 운영 모드 (`isProductionDomain=true`) · `/api/` `/admin` 차단 · sitemap 정상 |
| `sitemap.xml` | ✅ 전 주소가 `https://susannadesign.co.kr` |
| 정적 자산 캐시 (`public/_headers`) | ✅ 적용됨 — `logo.svg` `icon.png` = `max-age=86400` |
| `/rss.xml` 캐시 (`next.config.ts`) | ✅ 적용됨 — `s-maxage=3600` |
| **공개 HTML 캐시** | ❌ **없음** — `private, no-cache, no-store, must-revalidate` (§7 부채 실증) |
| **`www` → 비`www` 301** | ✅ **배포 확인** — 루트·다단경로·쿼리스트링 전부 301 + 주소 보존 (F13) |
| AI 크롤러 | ✅ **열렸습니다** — Cloudflare 관리형 블록 사라짐, `robots.txt` 가 우리 정책 24줄만 (F15) |
| 사진 | ⚠️ 실사진 **21장**(실적 17 · 사업영역 4 · 공정 1 · **공장/사옥 2**, 일부 공용). 2026-08-06 공장 전경 원본 1장으로 두 자리(`about-factory.jpg` 홈 · `about-office.jpg` `/about`)를 채웠습니다 — **배포해야 운영에 반영됩니다**. 남은 자리는 §7 |
| **견적 문의 접수** | ✅ **끝까지 확인** — 운영 API 에 실제 접수 → `{ok:true}`. 폴백 수정 후라 이 응답은 **DB 저장 성공**을 뜻합니다 |
| 견적 API 방어 | ✅ 허니팟 200(저장 안 함) · 빈 값 400 · 잘못된 번호 400 |
| 고객 개인정보 | ✅ 익명은 `quotes` 를 **넣기만 되고 못 읽음** — 방금 넣은 행도 안 보이는 것까지 확인 |
| **`http` → `https` 301** | ✅ 루트·하위경로·`www` 겹침 전부 301 (Cloudflare `Always Use HTTPS` — **코드 아님**, F13 아래 경고) |
| 크롤러 실접근 | ✅ Googlebot·GPTBot·OAI-SearchBot·ChatGPT-User·PerplexityBot·ClaudeBot·Yeti·bingbot **8종 전부 200** (UA 실측, 차단 0건) |
| 구글 검색 | ✅ "수산나디자인" **1위** / ⚠️ 색인은 **홈 1페이지뿐** (사이트맵 10개 중 1개) |
| 색인 통보 (IndexNow) | ✅ **전체중계 202 · Bing 202 · 네이버 200** — 소유확인 후 네이버 403 해소 (2026-07-28, F17) |
| 엔티티 신호 | ✅ `sameAs` 인스타그램 · `taxID` 사업자등록번호 · `WebSite` 사이트이름 |
| GitHub Actions 정지방지 | ❓ 확인 못 함 (`gh` CLI 없음) — Actions 탭에서 확인 필요 |

> ⚠️ **검색 노출을 확인할 때는 반드시 `hl=ko&gl=kr` 로 보세요.**
> 미국 기준 검색 도구로 보면 이 사이트가 **하나도 안 잡혀** "미색인" 으로 잘못
> 판정합니다. 2026-07-27 에 실제로 그렇게 오판했습니다.
>
> **구글이 반영하는 데 시간이 걸리는 것들** — 코드는 이미 맞으니 기다리면 됩니다.
> 파비콘(현재 기본 지구본)과 사이트 이름(현재 도메인 표기)은 재크롤링 후 바뀝니다.
> 구글 공식 문서 기준 **며칠~몇 주**. AI 개요가 자사 홈을 인용하기까지는 그보다 더 걸립니다.

---

## 0. 설계 원칙 (이걸 깨는 변경은 리뷰에서 막습니다)

| # | 원칙 | 이유 |
|---|---|---|
| **A1** | 공개 페이지는 **절대 죽지 않는다** | DB·네트워크가 죽어도 `config/content.ts` 로 폴백. 회사 홈페이지가 빈 화면이 되면 안 됨 |
| **A2** | 권한은 **DB(RLS)가 최종 판단**한다 | 화면·서버액션 검사는 1차 필터. 코드 실수가 권한 구멍이 되지 않게 |
| **A3** | 공개 페이지에서 **쿠키를 읽지 않는다** | 쿠키를 읽는 순간 정적 생성이 깨져 요청마다 SSR이 됨 |
| **A4** | 관리자 화면은 **정적으로 굽지 않는다** | 빌드 시점에 로그인 상태를 알 수 없음. 내용이 정적 파일로 새면 안 됨 |
| **A5** | 회사 정보·문구는 **`config/` 에만** 둔다 | 전화번호 하나 바꾸려고 컴포넌트를 뒤지지 않게 |
| **A6** | 사진은 **파일명 규칙으로 자동 교체**된다 | 코드 수정 없이 사진만 넣으면 반영 |

---

## 1. ROOT

```
Susanna/
│
├── app/                    ← 라우팅 + 페이지 (Next.js App Router)
├── components/             ← UI 조각
├── lib/                    ← 로직 (검증 · 데이터접근 · 인증)
├── config/                 ← 회사정보 · 콘텐츠 원본  ★수정 진입점
│                             site.ts(회사정보·SEO) · content.ts(문구 폴백)
│                             sections.ts(문구 구역 명세 — 관리자 화면이 읽음, F19)
├── public/                 ← 사진 · 로고 · 정적파일
├── supabase/migrations/    ← DB 스키마 SQL
├── docs/                   ← ARCHITECTURE.md(이 문서) · SEO.md · SUPABASE-SETUP.md
├── scripts/                ← check-supabase.mjs(연결 진단) · check-rls.mjs(권한 검증)
│                             submit-indexnow.mjs(색인 통보) · gen-image-manifest.mjs(빌드 시 사진 목록)
│                             cms.mjs(명령줄 콘텐츠 관리 — F18)
├── reference/              ← 레퍼런스 조사 자료 (SPEC.md + 캡처)
│
├── next.config.ts          ← 이미지 원격 호스트 허용
├── wrangler.jsonc          ← Cloudflare 배포 설정
├── open-next.config.ts     ← Next.js → Cloudflare 어댑터
├── .env.local              ← Supabase 키 (git 제외)
├── .env.local.example      ← 위 파일의 서식
├── AGENTS.md / CLAUDE.md   ← AI 에이전트 작업 규칙
└── README.md               ← 운영자용 안내서
```

---

## 2. 페이지

### 2.1 공개 페이지

| # | 경로 | 파일 | 렌더링 | 데이터 출처 |
|---|---|---|---|---|
| **P1** | `/` | `app/page.tsx` | **요청 시 SSR** (`dynamic="force-dynamic"`) | **CMS** `getSlides()` `getWorks()` `getBlocks()` + `config/content.ts` |
| **P2** | `/about` | `app/about/page.tsx` | **요청 시 SSR** (F19) | **CMS** `getBlocks()`(공정) + `config/site.ts` `content.ts`(연혁·비전) |
| **P3** | `/signs` | `app/signs/page.tsx` | **요청 시 SSR** (F19) | **CMS** `getBlocks().signTypes` |
| **P4** | `/works` | `app/works/page.tsx` | **요청 시 SSR** (`dynamic="force-dynamic"`) | **CMS** `getWorks()` |
| **P5** | `/process` | `app/process/page.tsx` | **요청 시 SSR** (F19) | **CMS** `getBlocks().process` (상세 항목 = `points`) |
| **P6** | `/support` | `app/support/page.tsx` | 정적 | `config/site.ts` (FAQ·오시는길) |
| **P7** | `/quote` | `app/quote/page.tsx` | 정적 | `content.ts` 선택지 |
| **P8** | `/privacy` `/terms` `/no-email-collect` | 각 `page.tsx` | 정적 | 하드코딩 ⚠️법률 검토 필요 |
| — | `/robots.txt` `/sitemap.xml` | `app/robots.ts` `sitemap.ts` | 정적 | `config/site.ts` |
| — | `/rss.xml` | `app/rss.xml/route.ts` | 요청 시 생성 + **CDN 캐시 1h** | **CMS** `getWorks()` — 네이버 서치어드바이저 제출용 |
| — | `/indexnow.txt` | `app/indexnow.txt/route.ts` | 정적 | `site.indexNowKey` — 색인 통보 소유확인 키 (F17) |
| — | 404 | `app/not-found.tsx` | 정적 | — |

> **왜 ISR 을 쓰지 않나** (2026-07-24 변경, 커밋 `d8342d7`)
> Cloudflare 배포에서 ISR 은 별도 캐시 저장소(R2 등)가 있어야 하는데, 없으면 요청마다
> 재생성을 시도하다 **타임아웃**이 납니다. 그래서 DB 를 읽는 세 곳(`/` `/works` `/rss.xml`)을
> `force-dynamic` 으로 바꿨습니다. 부작용은 §7 의 "방문마다 SSR" 항목 참조.
>
> ⚠️ **`next.config.ts` 의 `headers()` 는 동적 페이지에 안 먹습니다.** Next 가
> `no-cache, must-revalidate` 를 직접 붙이고 그게 우선합니다(실측 확인). HTML 은
> 캐시되지 않고, `public/_headers` 의 규칙은 **정적 자산에만** 적용됩니다.
> 라우트 핸들러(`/rss.xml`)는 예외로 정상 적용됩니다.

```
/ (P1)
├── HeroSlider          ← CMS: hero_slides
├── 사업영역 바          ← content.signTypes
├── WHY SUSANNA         ← CMS: content_blocks(why) + 페이지 내 하드코딩
├── PROCESS 5단계        ← content.steps
├── 주요실적 6건         ← CMS: works (앞에서 6개)
├── FABRICATION 6종      ← content.equipment
└── CTA 밴드            ← config/site.ts
```

### 2.2 관리자 페이지 (`/admin`)

전부 **동적 렌더링**(`app/admin/layout.tsx` 의 `dynamic = "force-dynamic"`), **noindex**.

| # | 경로 | 파일 | 권한 | 하는 일 |
|---|---|---|---|---|
| **P9** | `/admin/login` | `app/admin/login/page.tsx` | 공개 | 로그인. Supabase 미설정 시 안내문 표시 |
| **P10** | `/admin` | `app/admin/page.tsx` | admin | 대시보드 (항목 수 + 사용 안내) |
| **P11** | `/admin/hero` | `app/admin/hero/page.tsx` | admin | 첫 화면 사진 CRUD + 순서 |
| **P12** | `/admin/works` | `app/admin/works/page.tsx` | admin | 주요 실적 CRUD + 순서 |
| **P13** | `/admin/quotes` | `app/admin/quotes/page.tsx` | admin | 견적 문의함. 확인처리·삭제. 대시보드에 미확인 건수 노출. **맨 위에 알림이 켜졌는지·어디로 가는지 표시** (F16) |
| **P14** | `/admin/content` | `app/admin/content/page.tsx` | admin | **페이지 문구** — 구역 제목·강점·프로세스·공정·사업영역 CRUD + 순서 (F19) |

### 2.3 API

| 경로 | 파일 | 런타임 | 하는 일 |
|---|---|---|---|
| `POST /api/quote` | `app/api/quote/route.ts` | nodejs | 견적 문의 수신. 서버 재검증 · 허니팟 · IP 레이트리밋 → **DB `quotes` 테이블**(1순위) + 로컬 파일(2순위). **둘 다 실패하면 500** — 접수됐다고 거짓 응답하지 않음 |

---

## 3. 기능

### F1. 히어로 슬라이더 + 스크롤 연출
```
components/HeroSlider.tsx   (client)
├── 자동 전환         INTERVAL 6000ms
├── 패럴랙스          FADE_DISTANCE 520px — 배경 확대·카피 상승·페이드
├── 휠 글라이드       SNAP_MAX_SCROLL 80px 안 + 아래로 굴릴 때만 발동
│   ├── UP_GUARD_MS 700ms   위로 굴린 직후 개입 금지 (되돌림 방지)
│   ├── SNAP_MS 780ms       easeInOutCubic
│   └── behavior:"instant"  CSS smooth 와 겹쳐 두 번 애니메이션되는 것 방지
└── prefers-reduced-motion → 전부 해제
```
- 데이터: **F7 CMS** → `slides[]`
- 회귀 테스트 10건 존재 (스크래치패드 `wheeltest.mjs`)
- ⚠️ **`eyebrow`("01")는 손으로 적는 값이고, 뒤의 총 개수("/ 04")만 자동**입니다
  (`/ 0{slides.length}`). 슬라이드를 **중간에 끼워 넣으면 뒤 슬라이드의 번호를
  같이 고쳐야** 합니다 — 안 고치면 화면에 `01 / 04` 가 두 번 뜹니다.
- ⚠️ 인디케이터의 React key 가 `s.image` 입니다. **같은 사진을 두 슬라이드에 쓰면
  키가 겹칩니다** — 사진은 슬라이드마다 다른 것을 쓰세요.
- ⚠️ 상수를 만질 때는 "히어로 중간에서 읽는 사람을 끌어내리지 않는다"가 기준

### F2. 헤더 전환
```
components/Header.tsx (client)
└── SOLID_AT 40px
    ├── 홈 + 최상단  → 투명 오버레이 · 흰 로고 · 흰 메뉴 (사진 위)
    └── 그 외        → 흰 배경 · 청록 로고 · sticky
components/SiteChrome.tsx (client)
└── /admin 경로에서 Header·Footer·FloatingBar 를 통째로 숨김
```

### F3. 등장 애니메이션
```
components/Reveal.tsx (client)
├── IntersectionObserver (threshold .05, rootMargin -10%)
├── delay prop 으로 카드 순차 등장
└── 3초 failsafe — 관찰이 실패해도 콘텐츠가 영영 숨지 않게
```

### F4. 사진 자동 교체
> ⚠️ **파일 시스템으로 판단하면 안 됩니다** (2026-07-27 수정).
> Cloudflare Workers 에는 파일 시스템이 없습니다. `public/` 은 디스크가 아니라
> 정적 자산(URL)으로 서빙되므로 `fs.existsSync()` 는 Worker 안에서 **항상 false** 입니다.
> 그래서 사진을 넣어도 운영 사이트는 계속 회색 상자였습니다 — **A6 가 로컬에서만
> 동작하고 운영에서는 한 번도 동작하지 않던 상태**였습니다.
> 이제 빌드 때 `scripts/gen-image-manifest.mjs` 가 `public/` 목록을
> `lib/image-manifest.ts` 로 구워 두고, 런타임에는 그 목록만 봅니다.
> (개발 중에는 파일 시스템도 함께 봐서, 서버를 켜 둔 채 사진을 넣어도 바로 보입니다)
>
> 이 문제는 **이미지 URL 은 200 인데 페이지는 회색**이라는 모양으로 나타납니다.
> 같은 증상이 다시 보이면 목록 생성이 빌드에서 빠졌는지부터 확인하세요.

```
lib/images.ts
├── isRemoteImage()   https:// → 업로드된 사진
└── imageExists()     /images/... → public/ 실제 파일 확인 (production 캐시)
components/Img.tsx (server)  → 있으면 next/image, 없으면 Placeholder
components/Placeholder.tsx   → "파일명 + 필요 픽셀" 안내 박스
```
- 사진 목록·규격: `public/images/README.md`
- ⚠️ **그 README 가 코드보다 낡으면 자리가 조용히 빕니다.** 2026-08-06 에 홈의
  `about-factory.jpg` 가 README 에 없어서, 사진을 넣을 때 `/about` 만 채우고 홈은
  회색 박스로 남았습니다. **오류가 안 나고 플레이스홀더가 그대로 뜰 뿐**이라
  화면을 보기 전엔 모릅니다. 새 `Img` 자리를 만들면 README 에도 줄을 추가하세요.
  대조: `grep -rho 'src="/images/[^"]*"' --include=*.tsx app components | sort -u`

### F5. 견적 문의 폼
```
lib/validate.ts               클라이언트·서버 공용 검증
├── formatPhone()             자동 하이픈 (02·지역번호 포함)
├── isValidPhone/Email()
├── validateQuick/Full()
├── isAcceptedFile()          확장자 허용 검사 — 폼과 API 가 같은 함수를 씁니다
├── ACCEPTED_FILE_EXTS        사진·PDF·한글(hwp)·오피스·AI/PSD·CAD(dwg)·zip
└── MAX_FILES 5 · MAX_FILE_BYTES 50MB · MAX_TOTAL_BYTES 50MB

components/QuickQuoteForm.tsx  히어로 인라인 3필드
components/QuoteForm.tsx       전체 폼 (+ Daum 우편번호 API 지연로드)
components/PrivacyConsent.tsx  개인정보보호법 제15조 고지 4요소
components/Field.tsx           라벨·에러 공통 래퍼

app/api/quote/route.ts
├── 허니팟 company_website → 조용히 200 (저장 안 함)
├── IP 레이트리밋 10분 5회 (인메모리)
├── 서버 재검증 (클라이언트 우회 시 400)
├── 첨부 업로드 → quote-files 버킷  → F20   ← **INSERT 보다 먼저**
├── 저장  1순위 DB quotes  →  2순위 파일 (isCmsEnabled() 가 꺼졌을 때만)
│        둘 다 실패하면 500 — 접수됐다고 거짓 응답하지 않음
└── 저장 확정 후 notifyNewQuote()  → F16

lib/notify.ts (server-only)
└── 웹훅 · 이메일(Resend) — 설정 안 하면 조용히 꺼짐
```
- 회귀 테스트 12건 (`formtest.mjs`)
- ⚠️ **파일 폴백에 `if (!isCmsEnabled())` 조건이 반드시 있어야 합니다.** 없으면
  DB 저장이 실패해도 파일 쓰기가 성공하는 순간 `stored = true` 가 되어 고객에게
  "접수 완료" 가 나갑니다 — 문의를 조용히 삼키는 구조가 됩니다. 실제로 그렇게
  되어 있던 것을 2026-07-26 에 고쳤습니다.
- 이 조건 덕분에 **운영에서 `{ok:true}` 는 DB 저장 성공을 뜻합니다.** 파일 경로가
  운영에서 아예 안 타므로 응답만 보고도 판정할 수 있습니다.
- ⚠️ **행 ID 를 코드에서 먼저 만듭니다**(`crypto.randomUUID()`). DB 가 만들게 두면
  INSERT 후 `.select()` 로 되받아야 하는데, `quotes` 의 RLS 는 익명에게 **INSERT 만**
  허용하므로 그 조회가 막힙니다. 첨부 경로가 ID 를 필요로 해서 순서가 이렇습니다 → F20

### F16. 견적 문의 실시간 알림
```
lib/notify.ts   notifyNewQuote(q, attachments) → 보낸 경로 이름[]
├── QUOTE_WEBHOOK_URL   웹훅 — 슬랙·카카오워크·디스코드 ({text}/{content} 동시 전송)
├── RESEND_API_KEY      이메일 — 받는 주소는 QUOTE_NOTIFY_EMAIL, 없으면 site.email [A5]
│   └── HTML 본문: 연락처가 큰 버튼이고 tel: 링크 — 휴대폰에서 눌러 바로 통화
│       + text 대체본문 (HTML 막아 둔 메일 앱 대비)
├── toMailAttachments()  고객 사진을 base64 로 **메일에 직접 첨부** (총 12MB 이하)
├── 타임아웃 5초 (첨부 1MB 당 +2초, 상한 30초)
├── Promise.allSettled — 하나 실패해도 나머지 발송
└── 예외를 밖으로 던지지 않음

scripts/check-notify.mjs   npm run notify:test
└── 가짜 문의를 만들지 않고 알림만 시험 발송. 401/403 은 원인까지 안내
    한글 파일명 첨부 1개를 같이 보냅니다 (아래 참조)
```
- **사진을 메일에 그대로 붙입니다.** 간판 견적은 사진 한 장이 곧 사양서인데, 링크를
  눌러 로그인하고 관리자 화면까지 들어가야 보인다면 현장에서 휴대폰만 보는 상황에서
  사실상 못 보는 것과 같습니다. 관리자 화면 내려받기(F20)는 그 보조 경로입니다.
- **총 12MB 를 넘으면 하나도 안 붙이고** 관리자 화면으로 안내합니다. 폼 한도가
  10MB×5장 = 50MB 라 Resend 한도(40MB)를 넘길 수 있고, base64 로 1.37배 부풀기까지
  합니다. 일부만 붙이면 "왜 세 장만 왔지" 로 헷갈려 고객에게 되묻게 되므로 전부 아니면 전무.
- ⚠️ **웹훅에는 파일을 못 붙입니다.** 그래서 같은 문의라도 메일과 웹훅의 첨부 안내
  문구가 다릅니다(`attached` 플래그). 웹훅에까지 "이 메일에 첨부" 라고 쓰면 거짓말이 됩니다.
- ✅ **한글 파일명 실측 통과** (2026-08-06). 실제 문의에 `자석 게시판(필름마감).jpg`
  같은 이름이 들어와서, 시험 발송도 일부러 한글 파일명으로 보냅니다. 지메일 수신함에서
  `첨부 시험(한글 파일명).png` / `image/png` 로 온전히 도착하는 것을 확인했습니다.
  영문 파일명으로 시험하면 이 깨짐(RFC 2231 인코딩)을 못 잡습니다.
- ⚠️ **SMTP 는 못 씁니다.** Cloudflare Workers 가 TCP 소켓을 못 열어 네이버웍스·Gmail
  계정을 직접 붙이는 방식이 불가능합니다. HTTP API 방식(Resend)이라 이 제약을 피합니다.
- ✅ **`susannadesign.co.kr` Resend 인증 완료 (2026-08-06 11:14).** 아래 우회 경로는
  이제 **평상시에 타지 않습니다.** 회사 도메인으로 직접 나가고, 받는 주소도 여러 개
  됩니다. 실측: `noreply@susannadesign.co.kr → fivepeople201@gmail.com,poing7003@naver.com`
  한 요청 200, 지메일 받은편지함 도착(스팸 아님).

  넣은 DNS 레코드 4건 (Cloudflare):

  | Type | Name | Content | Priority |
  |---|---|---|---|
  | TXT | `resend._domainkey` | `p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDYAx79g/ObLh92KyDVDzJffYbxrO0lAFDAQArBhIGP/TRqqkJXn8M3PGrKUJStPurFVjuqJDXYmanTes4kpM/sYvmyB1ttBhW80R8HanOMRt2y4mz0glpiew6QTwfiqPP15fkW3Qy81vxdEUYaz/Kmg4t0pebNnaRx9aeFsnoJdwIDAQAB` | — |
  | MX | `send` | `feedback-smtp.ap-northeast-1.amazonses.com` | 10 |
  | TXT | `send` | `v=spf1 include:amazonses.com ~all` | — |
  | TXT | `_dmarc` | `v=DMARC1; p=none;` | — |

  ⚠️ **루트 MX(`@ → inbound-smtp.ap-northeast-1.amazonaws.com`)는 일부러 안 넣었습니다.**
  Resend 가 "Enable Receiving" 으로 같이 권하지만 그건 **수신**용입니다. 우리는 보내기만
  하면 되고, 넣으면 나중에 회사 메일(네이버웍스 등)을 붙일 때 충돌합니다.
  SPF 도 루트가 아니라 `send` 서브도메인에 있어 기존 TXT 와 겹치지 않습니다.
- 🔴 **알림 메일이 한 통도 안 가던 원인 (2026-08-06 규명·수정) — 아래는 인증 전 이야기입니다**
  `QUOTE_MAIL_FROM=noreply@susannadesign.co.kr` 인데 그 도메인이 Resend 에 인증돼
  있지 않아 **발송 요청 자체가 403 으로 거부**되고 있었습니다. 운영 키로 실측:

  ```
  POST /emails  from: noreply@susannadesign.co.kr
  → 403 {"message":"The susannadesign.co.kr domain is not verified"}
  ```

  스팸함 문제가 아니라 **아예 발송되지 않은** 것입니다. 저장은 정상이라 문의는
  `/admin/quotes` 에 다 쌓여 있었고, 알림만 조용히 죽어 있었습니다.
  받는 주소도 기본값(`site.email` = 한메일)이라 지메일로 올 수가 없었습니다.

  **수정 세 가지**
  1. `sendEmail()` 이 이 403 을 알아보고 **`onboarding@resend.dev` 로 자동 재시도**합니다.
     도메인 인증은 사람이 DNS 를 넣어야 하는 일이고, 그 사이 문의를 놓치는 게 더 큰
     손해라 우회를 둡니다. 우회가 돌면 로그가 남으니 **로그가 보이면 인증이 아직 안 끝난 것**입니다.
  2. 받는 주소를 `QUOTE_NOTIFY_EMAIL` 로 지정 (`fivepeople201@gmail.com`).
  3. `/admin/quotes` 맨 위에 **알림이 켜졌는지·어디로 가는지**를 표시합니다.
     꺼져 있으면 주황색 경고. 값은 배포 환경의 환경변수를 그대로 읽으므로,
     운영 화면에서 보면 Cloudflare 에 값이 들어갔는지까지 확인됩니다.
- ⚠️ **우회 경로는 안전망으로 남겨 둡니다.** 인증이 끝나 평상시엔 안 타지만, 키를
  갈아 끼우거나 DNS 가 흔들려 403 이 나면 그때 다시 살아납니다. 로그에 우회 문구가
  보이면 **인증이 깨진 것**이니 그때 확인하면 됩니다.
- **우회 경로에서는 받는 사람마다 따로 보냅니다 (2026-08-06 수정).**
  예전에는 한 요청에 주소를 모아 보냈습니다. 그러면 못 받는 주소가 **하나만 섞여도**
  Resend 가 요청 전체를 거부해서, **잘 가던 주소까지 같이 죽었습니다.** 즉 받을 사람을
  추가하는 행위가 기존 알림을 끄는 것과 같았습니다. 인증이 끝난 지금은 정상 경로가
  한 요청으로 나가므로 이 분리 로직은 우회할 때만 돕니다. 인증 전 실측(2026-08-06):

  ```
  to: [fivepeople201@gmail.com, poing7003@naver.com]  (한 요청)
  → 403 "You can only send testing emails to your own email address"   ← 둘 다 못 받음

  한 명씩 나눠 보낸 뒤
  → poing7003@naver.com   403 (도메인 인증 전까지 계속)
  → fivepeople201@gmail.com  200 ✅                                    ← 이건 살아남음
  ```

  못 받은 주소는 **로그에 반드시 남깁니다.** 조용히 넘어가면 "저 사람한테도 가고
  있겠지" 라고 믿게 되고, 그 믿음이 문의를 놓치는 경로가 됩니다.
- ✅ **수신자 3인 개통** — `fivepeople201@gmail.com` · `poing7003@naver.com` ·
  `sujin4003@hanmail.net`(회사 대표 메일 = `site.email`). 인증 후 **한 요청**으로 셋 다
  나가는 것을 실측했습니다(2026-08-06 11:51). 인증 전에는 지메일 하나뿐이었습니다.
- ⚠️ **한메일·네이버메일은 초기 스팸함 유입 가능성**이 있습니다. 도메인 인증은 발송
  자격이지 평판이 아니라서, 그 도메인에서 나간 이력이 쌓이기 전까지는 필터가 보수적으로
  잡습니다. 받는 사람이 "스팸 아님" 처리를 해 주는 게 가장 빠른 해결입니다.
- `scripts/check-notify.mjs` 도 **같은 우회 규칙**을 씁니다. 안 그러면 "시험은 실패인데
  운영은 도착" 하는 상태가 되어, 고칠 이유가 없는 값을 계속 고치게 됩니다.
- **미리보기**: `app/api/dev/mail-preview` (개발 전용, 운영에서는 404) 로 메일 본문을
  브라우저에서 확인할 수 있습니다. 서식을 고칠 때 실제 모양을 보고 작업하세요.
- **왜 전화 버튼이 큰가**: 견적은 먼저 연락한 곳이 가져갑니다. 받은 사람이 화면을
  옮겨 다니지 않고 그 자리에서 통화로 넘어갈 수 있어야 합니다.
- **저장이 확정된 뒤에만** 부릅니다. 알림 실패로 "접수 실패" 를 띄우면 고객이
  두 번 넣게 되므로, 실패는 로그만 남기고 응답은 정상 처리합니다.
- 환경변수가 없으면 **조용히 아무것도 안 합니다**(기본 꺼짐). 폼·저장은 그대로 동작 [A1 의 연장]
- ⚠️ **개인정보 위탁**: 알림에 고객 이름·연락처가 담깁니다. 켜면 개인정보처리방침의
  위탁 항목에 그 업체를 적어야 합니다(개인정보보호법 제26조). §7 참조.

### F6. 실적 필터
```
components/WorksGrid.tsx (client)
└── content.workCategories 로 탭 필터 · aria-live 건수 안내
```

### F7. CMS 콘텐츠 + 폴백 ★
```
lib/cms.ts (server-only)
├── getSlides() → hero_slides  ─┐
└── getWorks()  → works        ─┤  실패·미설정·빈결과 시
                                └→ config/content.ts 로 폴백  [원칙 A1]

lib/supabase/public.ts
└── createPublicClient()  쿠키 미사용 (persistSession:false)  [원칙 A3]
```
**왜 쿠키를 안 쓰나**: 공개 콘텐츠는 로그인과 무관하므로 익명으로 읽습니다.
쿠키를 붙이면 방문자별 응답이 되어 **나중에 CDN 캐시를 얹을 길이 막힙니다**
(§7 의 SSR 부채를 R2/Cache Rules 로 해소하려면 응답이 방문자와 무관해야 함).
지금은 `force-dynamic` 이라 어차피 요청마다 그려지지만, 원칙 A3 을 지켜 두면
캐시 전략을 되살릴 때 코드를 고칠 필요가 없습니다.

### F8. 인증 · 권한
```
components/admin/SessionKeeper.tsx (client, 화면 없음)
└── 브라우저 클라이언트가 토큰 자동 갱신 → 쿠키에 기록 → 서버도 그 쿠키를 읽음
    ※ 예전에는 proxy.ts(구 middleware)가 했으나 배포처를 가리는 원인이라 제거.
      지금은 특정 호스팅에 묶이지 않습니다.

접근 차단
└── 각 관리자 페이지의 requireAdmin() 이 redirect("/admin/login")
    /admin/login 은 이미 로그인돼 있으면 /admin 으로 되돌림
    ※ 레이아웃이 아니라 페이지마다 검사 — 레이아웃은 이동 시 다시 안 그려짐

lib/auth.ts (server-only)
├── getCurrentUser()  React cache 로 렌더당 1회. getUser()로 토큰 검증
│                     (getSession() 은 쿠키를 그대로 믿으므로 권한판단 금지)
└── requireAdmin()    화면 + 서버액션 양쪽에서 호출  [원칙 A2]

lib/supabase/
├── env.ts      키 · isCmsEnabled() · MEDIA_BUCKET
├── server.ts   서버 컴포넌트/액션용 (쿠키 O, RLS 적용)
├── browser.ts  로그인·업로드용
└── public.ts   공개 조회용 (쿠키 X)
※ service_role 키는 쓰지 않음 — RLS 를 통째로 무시하므로
```

### F9. 관리자 CRUD + 캐시 무효화
```
app/admin/actions.ts  ("use server")
├── adminClient()       ← 모든 액션이 여기서 requireAdmin() 재확인  [원칙 A2]
├── saveSlide / deleteSlide / moveSlide
├── saveWork  / deleteWork  / moveWork
├── signOut             (권한 불필요)
└── refreshPublicPages()  revalidatePath("/") + ("/works")

components/admin/
├── AdminShell.tsx      공통 셸 (네비 · 로그아웃)
├── SlideForm.tsx       useActionState + saveSlide
├── WorkForm.tsx        useActionState + saveWork
├── SubmitButton.tsx    useFormStatus — 중복 제출 잠금 · 삭제 확인창
└── LoginForm.tsx       signInWithPassword → router.replace + refresh
```
- **순서 변경**: 이웃과 `sort_order` 값을 맞바꾸는 방식
- **왜 `revalidatePath`인가**: `cacheComponents` 가 꺼져 있어 `use cache`/`updateTag`
  모델이 아님. `unstable_cache` 는 Next 16에서 deprecated

### F10. 이미지 업로드
```
components/admin/ImageField.tsx (client)
└── 브라우저 → Supabase Storage 직접 업로드
    ├── 이유: 서버 액션 본문 한도 기본 1MB → 사진이 안 넘어감
    ├── 파일명 crypto.randomUUID() — 원본 파일명 노출·충돌 방지
    ├── 검증: image/* + 10MB
    └── 결과 공개 URL 을 hidden input 으로 폼에 전달
next.config.ts → remotePatterns 에 Supabase 호스트 자동 등록
```

### F11. SEO · 구조화 데이터
```
config/site.ts → seo{}          지역×서비스×의도 키워드 · 홈 타이틀/설명 · 소유확인코드
config/site.ts → site.geo       좌표 (로컬팩 "거리" 요인)
                                ⚠️ 2026-08-06 네이버 플레이스 등록 좌표로 교체했습니다.
                                   이전 근사값은 실제 위치에서 **약 10km** 벗어나 있었습니다.
config/site.ts → naverPlaceUrl  네이버 스마트플레이스 (sameAs + 오시는길 지도 URL)
                                대전 유입의 8할이 네이버라, 이 연결이 인스타그램보다 큽니다

config/site.ts → seo.pages     하위 9개 페이지의 타이틀·설명 [A5]
config/site.ts → noindexPaths  검색 노출 제외 목록 ★ 사이트맵과 robots 의 단일 출처

lib/seo.ts → pageMetadata(path)   하위 페이지 metadata 생성 — 아래 두 함정을 함께 막습니다
├── ⚠️ Next.js 는 메타데이터를 **얕게 병합**합니다. 페이지가 openGraph 를 한 필드라도
│   적으면 layout 의 openGraph 가 통째로 교체돼 **og:image 가 조용히 사라집니다.**
│   그래서 이 함수가 매번 openGraph 전체를 다시 채웁니다.
│   페이지에서 직접 openGraph 를 적지 마세요.
├── ⚠️ 색인 대상 페이지에는 robots 를 **넣지 않습니다.** 넣으면 layout 을 덮어써서
│   임시 주소·미리보기 배포까지 index:true 가 됩니다 (layout 은 isProductionDomain 판단).
└── 이전 문제: 각 page.tsx 가 description 만 적어 **10개 페이지가 홈 설명을 공유**했습니다

app/layout.tsx
├── metadata   타이틀에 지역 키워드 앞배치 (60자↓) · 설명 **80자↓**
│              ⚠️ 네이버 URL 검사가 한글 80자 초과에 경고를 냅니다 (2026-07-28 실측)
│              verification 슬롯 (값 없으면 태그 미출력)
│              openGraph 이미지는 lib/seo.ts 의 ogImage 하나를 공유
├── JSON-LD LocalBusiness   geo · areaServed · openingHoursSpecification
│           ⚠️ site.hours 와 반드시 일치 (NAP 일관성)
│           ⚠️ AggregateRating/Review 금지 — 자사 게시 리뷰에만 허용
└── Noto Sans KR (next/font, display:swap)

app/page.tsx → WebSite JSON-LD  ★ 검색 결과에 뜨는 **사이트 이름**을 정합니다
├── 없으면 구글이 도메인(susannadesign.co.kr)을 그대로 씀 — 2026-07-27 실제로 그랬음
├── 신호 우선순위: WebSite 구조화 데이터 > og:site_name > title > 제목 태그
└── ⚠️ **홈에만** 넣습니다. 구글은 도메인 최상위 홈의 WebSite 만 인정하고
    하위 경로(/works 등)의 것은 무시합니다. 한 도메인에 사이트 이름은 하나뿐.
    그래서 layout.tsx(전 페이지)가 아니라 page.tsx 에 있습니다.

components/JsonLd.tsx           구조화 데이터 삽입 공통
components/Section.tsx PageHero  path prop → BreadcrumbList 자동 생성
app/support/page.tsx            FAQPage (화면의 faqs 배열 그대로)

app/robots.ts    disallow: /api/ · /admin · AI 크롤러 명시 허용(F15)
app/sitemap.ts   /admin 제외 + noindexPaths 자동 제외
                 ⚠️ noindex 페이지를 사이트맵에 넣으면 "색인해라 + 하지 마라" 모순
                    신호입니다. 실제로 제출 10건 중 3건이 영구 실패로 남아 있었습니다.
                    목록을 두 곳에서 따로 관리하면 반드시 어긋나므로 noindexPaths 하나만 봅니다.
app/rss.xml/     RSS — 네이버 서치어드바이저 제출용 (시공사례 자동 반영)
public/icon.png · public/apple-icon.png   ← 정적 자산 (캐시 헤더 적용 대상)
```
실행 지침과 운영자 할 일은 [`SEO.md`](SEO.md) 참조.

### F12. 접근성
스킵 링크 · `aria-current` · `aria-invalid` + `role="alert"` · label 연결 ·
`prefers-reduced-motion` 전면 대응 · 필터 `role="tablist"` · `aria-live` 건수 안내

### F13. www → 비www 301 (호스팅 독립)
```
config/site.ts   export const CANONICAL_URL   ★ 도메인 원본 (A5)
      ↓ import
next.config.ts   redirects()   has: [{ type:"host", value:"www.<도메인>" }]
├── source "/"       → CANONICAL_URL              statusCode 301
└── source "/:path+" → `${CANONICAL_URL}/:path+`  statusCode 301
```
- ⚠️ **규칙 두 개를 절대 하나로 합치지 마세요.** `source: "/:path*"` 하나로 두면
  `/works` 는 되는데 **루트(`/`)가 깨집니다** — `:path*` 가 0개 세그먼트에 매칭될 때
  Next 가 절대 URL 대상에서 토큰을 치환하지 못해 `https://.../:path*` 라는 깨진
  주소를 그대로 내보냅니다. **실제 배포에서 터뜨려 확인한 동작입니다**(커밋 `5f31644`
  → `5e6ba8f` 로 수정). 그래서 루트는 따로 잡고 나머지는 1개 이상인 `:path+` 로 받습니다.
- **왜 코드에 두나**: Cloudflare Redirect Rules 로도 되지만 그러면 설정이 대시보드에만
  남아 저장소만 봐서는 알 수 없고, 배포처를 옮기면 사라집니다. 이 프로젝트는
  `proxy.ts` 를 없애면서까지 호스팅 종속성을 걷어냈으므로 도메인 규칙도 코드에 둡니다.
- **왜 `statusCode: 301` 인가**: `permanent: true` 는 **308** 을 냅니다. 308 도 검색엔진은
  301 과 같이 취급하지만, 문서·SEO 자료가 전부 301 기준이라 굳이 다르게 둘 이유가 없습니다.
- 도메인을 바꿀 때는 `CANONICAL_URL` 한 줄만 고치면 리다이렉트까지 따라옵니다.
- 검증: `Host: www.susannadesign.co.kr` 로 **경로 모양을 전부** 찔러 봅니다 —
  루트 `/` · 1단 `/works` · 다단 `/admin/hero` · 쿼리스트링 · 정적자산 `/logo.svg` ·
  없는 경로. 한 가지만 보면 위의 루트 버그를 놓칩니다(실제로 놓쳤습니다).

> ### ⚠️ `http` → `https` 는 **코드로 하지 마세요** (같은 리다이렉트지만 판단이 다릅니다)
>
> `www` 는 위처럼 코드에 뒀지만 **프로토콜 리다이렉트는 Cloudflare 대시보드**에
> 맡깁니다 — **SSL/TLS → Edge Certificates → Always Use HTTPS**.
>
> 코드로 하려면 `x-forwarded-proto` 헤더를 믿어야 하는데, 그 값이 기대와 어긋나면
> **모든 요청이 무한 리다이렉트에 빠져 사이트가 통째로 죽습니다.** 운영 중인 회사
> 홈페이지에 걸 위험이 아닙니다. TLS 종단은 원래 엣지 계층의 일이고 어느 호스팅이든
> 기본 제공합니다.
>
> 배포처를 옮기면 **이 설정은 따라오지 않습니다.** 이사할 때 새 호스팅에서 같은
> 스위치를 켜세요. 확인:
>
> ```bash
> curl -s -L -o /dev/null -w "%{url_effective} (%{num_redirects}홉)\n" http://www.susannadesign.co.kr/works
> ```
>
> `https://susannadesign.co.kr/works (2홉)` 이 나와야 정상입니다.

### F14. 플레이스홀더 — 개발/운영 분리
```
components/Placeholder.tsx
├── 개발  파일명 + 필요 픽셀(work-01.jpg / 1200×900)  ← 무엇을 넣어야 하는지 알려주는 게 목적
└── 운영  설명 + "사진 준비 중" 만. 점선 테두리도 없앰
```
- **왜**: 사이트가 이미 고객에게 열린 뒤로는 `work-01.jpg 1200×900` 같은 개발자용
  정보가 화면에 찍히는 게 미완성으로 보입니다. A6(파일명 규칙 자동 교체)은 그대로 유지 —
  **표시만 가릴 뿐 동작은 같습니다.**
- 파일명 문자열은 클라이언트 컴포넌트(`WorksGrid`)로 넘어가는 props 직렬화 데이터에는
  여전히 남습니다(모든 Next 앱이 그렇습니다). **화면에 보이지 않는다**가 이 기능의 범위입니다.

### F15. AI 답변 엔진 크롤러 허용
```
app/robots.ts
├── AI_CRAWLERS[]  GPTBot · OAI-SearchBot · ClaudeBot · PerplexityBot ·
│                  Google-Extended · Applebot-Extended · CCBot · … 14종
└── POLICY         allow "/" + disallow ["/api/","/admin"]   ← 두 그룹이 공유
    ├── User-agent: *          + POLICY
    └── User-agent: <AI 14종>  + POLICY
```
- **왜 이름을 하나하나 적나**: Cloudflare 가 우리 `robots.txt` **앞에** 관리형 블록을
  끼워 넣어 이 봇들을 `Disallow: /` 로 막습니다(신규 도메인 기본값). robots.txt 는
  **같은 User-agent 그룹끼리 합쳐지고, 동일하게 구체적인 Allow/Disallow 충돌 시 Allow 가
  이깁니다**(RFC 9309 · 구글 문서). 그래서 이름을 지목해 `Allow` 를 선언하면 대개 뒤집힙니다.
- ⚠️ **AI 그룹에도 `/api/` `/admin` 차단을 반드시 같이 넣습니다.** 크롤러는 자기 이름의
  그룹이 있으면 `*` 그룹을 아예 보지 않으므로, 빼먹으면 **이 봇들에게만 관리자 화면이 열립니다.**
- ⚠️ 이건 **보조 장치**입니다. 확실한 해제는 Cloudflare 대시보드(§7). 크롤러마다
  규칙 해석이 조금씩 달라 100% 보장은 아닙니다.

### F22. 방문 통계 — Google Analytics 4
```
config/site.ts → site.gaMeasurementId   "G-NNT57E6S9L"  ★ 단일 출처 (A5)
      ↓
app/layout.tsx
└── site.isProductionDomain && site.gaMeasurementId 일 때만
    ├── <Script src="googletagmanager.com/gtag/js?id=..."  strategy="afterInteractive" />
    └── <Script id="ga4" strategy="afterInteractive">  gtag('config', ...)
```
- **왜 `@next/third-parties` 를 안 쓰나**: Next 문서가 그 패키지를 **experimental
  under active development** 라고 명시합니다. `next/script` 두 줄로 같은 동작이 나오는데
  실험 단계 의존성을 회사 홈페이지에 들일 이유가 없습니다.
- **왜 환경변수가 아니라 `config/` 인가**: 측정 ID 는 **비밀이 아닙니다.** 모든 방문자의
  페이지 소스에 그대로 찍히는 값이라 `indexNowKey` 와 같은 취급을 합니다 [A5].
- ⚠️ **`isProductionDomain` 조건이 반드시 있어야 합니다.** 미리보기·임시 주소의 방문이
  실제 통계에 한 번 섞이면 **되돌릴 수 없습니다.** GA 는 과거 데이터를 못 지웁니다.
- `afterInteractive` 라 첫 화면 렌더를 막지 않고, 스크립트가 실패해도 페이지는 그대로
  뜹니다 [원칙 A1 의 연장]. 값을 비우면 애널리틱스만 조용히 꺼집니다.
- 🔴 **GA 를 켜면 개인정보처리방침에 고지해야 합니다** — 쿠키로 방문자를 식별하므로
  법적 의무입니다. 2026-08-06 에 `app/privacy/page.tsx` 에 **제5조(위탁) 실제 업체 명시 +
  제5조의2(쿠키·분석도구)** 를 신설했습니다. 분석 도구를 바꾸면 여기도 같이 고칩니다.
- ⚠️ **`/admin/*` 방문도 집계됩니다.** 내부 트래픽이 통계를 오염시키므로, 신경 쓰이면
  GA 쪽에서 **관리 → 데이터 필터 → 내부 트래픽**으로 거르세요(코드로 막지 않았습니다).
- ⚠️ **속성을 헷갈리지 마세요.** 같은 계정에 이름이 비슷한 속성이 여럿 있습니다 — §7 참조.

### F21. 오시는길 — 지도 임베드 대신 길찾기 링크
```
app/support/page.tsx  (P6, 정적)
├── site.mapUrl 이 있으면      → iframe 으로 지도 임베드 (기존 경로 유지)
└── 비어 있으면(현재)          → 링크 카드
    ├── 주소 · 영업시간          config/site.ts [A5]
    ├── 네이버 지도에서 보기      site.naverPlaceUrl
    ├── 카카오맵 길찾기          map.kakao.com/link/to/{상호},{lat},{lng} ← site.geo
    └── 전화                    site.phoneHref
```
- ⚠️ **`site.mapUrl` 에 네이버 플레이스 주소를 넣지 마세요.** `map.naver.com` 은
  `x-frame-options: DENY` 입니다(2026-08-06 실측). 넣으면 **오류도 안 나고 빈 상자**가
  나가서, 예전 안내 플레이스홀더보다 나빠집니다. 여기 들어갈 수 있는 건 임베드
  전용 URL(카카오맵 "지도 퍼가기" 등)뿐입니다.
- **왜 그림 대신 링크인가**: 손님이 누르는 건 약도가 아니라 "길찾기" 이고, 그건 어차피
  지도 앱으로 넘어갑니다. 게다가 네이버 플레이스로 보내면 **방문·클릭이 쌓여 플레이스
  노출에도 도움**이 됩니다(플레이스는 클릭 이후 행동 데이터가 순위에 반영됩니다).
- 카카오맵 길찾기 URL 은 `site.geo` 좌표를 씁니다 — 좌표가 틀리면 **엉뚱한 곳으로
  안내합니다.** 2026-08-06 에 좌표를 실측값으로 고친 이유 중 하나입니다.
- `/support` 는 이 변경 뒤에도 **정적(`○`)** 입니다 (빌드 결과 확인).

### F17. IndexNow — 검색엔진 색인 즉시 통보
```
config/site.ts   site.indexNowKey   ★ 키 원본 (A5)
      ↓ import
app/indexnow.txt/route.ts   force-static · 본문은 키 한 줄뿐
      ↑ keyLocation 으로 지목
scripts/submit-indexnow.mjs   npm run indexnow
├── 1  /indexnow.txt 가 뜨고 키가 일치하는지 먼저 확인 (아니면 전부 403)
├── 2  운영 sitemap.xml 의 <loc> 를 그대로 목록으로 사용
└── 3  POST {host, key, keyLocation, urlList}
        ├── https://api.indexnow.org/indexnow    참여사 전체 중계
        ├── https://www.bing.com/indexnow        직접
        └── https://searchadvisor.naver.com/indexnow  직접
```
- **왜 필요한가**: 새 도메인은 백링크가 없으면 검색엔진이 **존재 자체를 모릅니다.**
  사이트맵은 "찾아온 뒤에" 읽는 것이라 발견 문제를 못 풉니다. IndexNow 는 순서를
  뒤집어 우리가 먼저 통보합니다. 계정·로그인이 필요 없는 유일한 경로입니다.
- ⚠️ **구글은 IndexNow 에 참여하지 않습니다.** 참여사는 Bing · 네이버 · Yandex ·
  Seznam · Yep · Internet Archive · Amazonbot 입니다
  (`https://www.indexnow.org/searchengines.json` 로 실측 확인). 구글은 Search Console
  등록 외에 길이 없고, 그건 코드로 할 수 없습니다 — [`SEO.md`](SEO.md) C 섹션.
- ⚠️ **네이버는 서치어드바이저 등록이 선행돼야 합니다 — 양쪽 다 실측했습니다.**
  2026-07-27(등록 전): 같은 `keyLocation` 으로 **Bing 202 · 전체중계 202 · 네이버만 403**.
  2026-07-28(소유확인 후): **네이버 200**. 키는 그대로였습니다.
  **네이버 403 이 보이면 키를 의심하기 전에 등록 여부부터 확인하세요.**
  Bing 은 등록 없이도 받습니다.
- **왜 표준 `/<키>.txt` 가 아니라 `/indexnow.txt` 인가**: 표준 경로를 쓰면 키 값이
  **파일 이름과 `config/site.ts` 양쪽**에 생겨, 키를 바꿀 때 한쪽만 고치면 조용히
  깨집니다. IndexNow 규격이 통보에 `keyLocation` 을 실어 임의 주소를 지정하도록
  허용하므로 키의 출처를 config 한 곳으로 모았습니다 [원칙 A5].
- ⚠️ **키 파일 본문은 키 한 줄뿐이어야 합니다.** 공백·줄바꿈·BOM 이 섞이면 403.
  빌드 산출물(`.next/server/app/indexnow.txt.body`)이 정확히 32바이트인지로 확인합니다.
- **키는 비밀이 아닙니다.** 공개돼야 소유확인이 되는 값이라 저장소에 그대로 둡니다.
- 스크립트는 `process.exit()` 를 쓰지 않습니다 — fetch 소켓이 닫히는 중에 종료되면
  Windows 에서 libuv assertion 이 찍힙니다(`check-notify.mjs` 와 같은 이유).

### F18. CMS 명령줄 도구 — 브라우저 없이 콘텐츠 관리
```
scripts/cms.mjs        npm run cms -- <명령>
├── 로그인   signInWithPassword(SUPABASE_ADMIN_EMAIL, SUPABASE_ADMIN_PASSWORD)
│           → profiles.role === "admin" 확인 후에만 진행
├── list    hero · works (미공개 포함) · quotes(건수만)
├── upload  로컬 파일 → media 버킷 → 공개 URL   (F10 과 같은 규칙)
├── hero    add · set · move · rm · renumber
└── works   add · set · move · rm · renumber · batch <계획.json>
             batch = 사진 여러 장을 한 번에 업로드 + 등록
```
- **왜 만들었나**: 사진 여러 장을 실적으로 넣는 일이 화면에서는 장당 여러 번 클릭입니다.
  또한 AI 에이전트(Claude Code)가 사진을 보고 제목·분류·태그를 채워 넣을 수 있게 됩니다 —
  브라우저 로그인이 필요한 화면으로는 못 하던 일입니다.
- **권한은 관리자 화면과 완전히 같은 경로**입니다. anon 키 + 관리자 계정 로그인 →
  RLS 가 최종 판단 [원칙 A2]. **`service_role` 키는 쓰지 않습니다.**
  viewer 계정이면 시작 단계에서 막습니다 — RLS 는 권한이 없을 때 오류가 아니라
  **조용히 0건**을 돌려주므로, "지웠는데 그대로" 같은 모양으로 나타나 원인 찾기가 어렵습니다.
- **배포가 필요 없습니다.** DB 를 바꾸면 `/` `/works` 가 `force-dynamic` 이라 다음 방문부터
  반영됩니다. `revalidatePath` 도 필요 없습니다(§4 의 관리자 흐름 주석과 같은 이유).
- ⚠️ **분류(`category`)는 `config/content.ts` 의 `workCategories` 에서 읽어 검사합니다** [A5].
  거기 없는 값을 넣으면 `/works` 의 필터 탭에 안 떠서 **그 실적이 아무 탭에도 안 보입니다.**
  그래서 저장 전에 막고, 새 분류는 config 를 먼저 고치라고 안내합니다.
- ⚠️ **`quotes` 는 건수만 출력합니다.** 행에 고객 이름·연락처가 있어서 터미널에 찍으면
  셸 기록과 작업 로그에 개인정보가 남습니다. 내용은 `/admin/quotes` 에서 봅니다.
- ⚠️ **`rm` 은 `--yes` 없이는 대상만 보여주고 아무것도 하지 않습니다.** 삭제는 되돌릴 수 없습니다.
- **`renumber`** 는 `sort_order` 가 겹쳐 순서 변경이 안 되는 상태(§7)를 10 단위로 다시 매겨
  풉니다. `move` 는 값이 겹친 것을 발견하면 맞바꾸지 않고 이걸 먼저 돌리라고 안내합니다 —
  겹친 값을 맞바꾸면 아무 일도 안 일어나는데 성공처럼 보입니다.
- **`batch` 는 넣기 전에 전부 검사합니다.** 4번째에서 분류가 틀려 멈추면 3건만 들어간
  상태가 되므로, 제목·사진 존재·분류를 먼저 다 확인하고 나서 업로드를 시작합니다.
- 비밀번호가 `.env.local` 에 평문으로 남습니다(§7). `NEXT_PUBLIC_` 접두어가 없어
  **브라우저·서버 코드로는 나가지 않습니다** — 이 스크립트만 읽습니다.
- 🔴 **Windows 에서 `npm run cms -- --title "여러 단어"` 는 값이 잘립니다.**
  npm 이 `--` 뒤 인자를 넘길 때 인용부호를 풀어 다시 쪼개기 때문에, 공백이 있는 값은
  **첫 낱말만 저장되고 나머지 플래그는 통째로 사라집니다.** 오류가 안 나고 `✔` 가 떠서
  목록을 확인하기 전엔 모릅니다 (2026-07-28 실제로 제목 둘째 줄·`--sub`·`--alt` 를
  잃었습니다). **공백이나 줄바꿈이 든 값을 넣을 때는 npm 을 건너뛰고 직접 부르세요:**
  ```bash
  node scripts/cms.mjs hero set <id> --title "두 낱말" --sub "설명 문장"
  ```
  줄바꿈은 Bash 의 `$'첫 줄\n둘째 줄'` 형식으로 넣습니다. 넣은 뒤에는 항상
  `node scripts/cms.mjs list hero` 로 **저장된 값을 눈으로 확인**합니다.

### F19. 페이지 문구 CMS ★
```
supabase/migrations/0005_content_blocks.sql
└── public.content_blocks   한 표에 여섯 구역. `section` 으로 갈라 씁니다.

config/sections.ts   SECTIONS[]   ★ 구역 명세 (A5)
      ├── 탭 이름 · 어디에 나오는지 설명
      ├── fixed?      항목 추가·삭제 금지 (copy 구역)
      └── fields{}    구역마다 칸의 뜻이 달라서, 라벨을 여기서 읽습니다
            ↓ import
components/admin/BlockForm.tsx   명세대로 칸을 그림 (구역별 폼 한 벌)
app/admin/content/page.tsx  P14   탭 + 목록 + 순서 + 삭제
app/admin/actions.ts              saveBlock · deleteBlock · moveBlock

lib/cms.ts  getBlocks()  → { copy, why, process, fabrication, signTypes }
      └── 조회 1회로 전부. 구역 단위 폴백 → config/content.ts   [원칙 A1]
            ↓
      app/page.tsx(P1) · about(P2) · signs(P3) · process(P5)
```

**칸의 뜻이 구역마다 다릅니다.** 이 표가 유일한 기준입니다 (마이그레이션 맨 위·`config/sections.ts` 와 동일):

| section | eyebrow | title | sub | points | image_url |
|---|---|---|---|---|---|
| `copy` | 영문 머리말 | 큰 제목 | 설명 | — | — |
| `why` | — | 근거 제목 | 근거 설명 | — | — |
| `process` | 번호(01) | 단계 이름 | 한 줄 설명 | 상세 항목 | 사진 |
| `fabrication` | — | 공정 이름 | 한 줄 설명 | — | 사진 |
| `sign_type` | 영문(OUTDOOR) | 분야 이름 | 소개 문단 | 특징 | 사진 |

- **왜 표를 하나로 합쳤나**: 구역마다 표를 만들면 같은 CRUD·폼·액션이 여섯 벌이 됩니다.
  그중 하나만 고치는 실수가 반드시 나므로, 표 하나 + 명세 하나로 두고 화면이 명세를
  읽어 그리게 했습니다. 대신 **칸의 뜻이 구역마다 다르다는 부담**을 위 표로 못박습니다.
- ⚠️ **`copy` 구역은 항목을 늘리거나 지울 수 없습니다.** 코드가 `slug`(`home-fabrication`
  같은 값)로 집어 오기 때문에, 새로 넣으면 아무 데도 안 나오고 지우면 그 구역 제목이
  통째로 사라집니다. 서버 액션과 화면 양쪽에서 막습니다.
- ⚠️ **`moveBlock` 은 반드시 `eq("section", …)` 을 겁니다.** 한 표에 여섯 구역이 섞여
  있어서 이걸 빼면 **다른 구역 항목과 순서를 맞바꿉니다** — 화면상 아무 일도 안 일어난
  것처럼 보이고 엉뚱한 구역이 흐트러집니다.
- **폴백은 구역 단위입니다.** `process` 만 DB 에 있고 `why` 가 비어 있으면 프로세스는
  DB, 강점은 config 값이 나갑니다. 전부-아니면-전무로 만들면 구역 하나를 비웠을 때
  멀쩡한 나머지까지 옛 내용으로 되돌아갑니다.
- 🔴 **그래서 관리자 화면에서 한 구역을 텅 비우는 것은 불가능합니다.** 마지막 항목을
  지우는 순간 0건이 되어 **config 내용이 대신 나옵니다** — 지운 것이 되살아난 것처럼
  보입니다. 2026-08-07 에 "숫자 지표 칸이 안 없어진다" 는 문의가 정확히 이것이었고,
  실제로는 4건 중 3건이 지워져 **1건만 남은 채 4칸 격자에 빈 회색 칸 3개**가 보이던
  상태였습니다(격자 배경이 `bg-line`). 구역을 없애려면 **코드에서 걷어내야** 합니다.
- ⚠️ **`stat`(숫자 지표) 구역은 2026-08-07 에 화면에서 제거됐습니다.** `config/sections.ts`
  에서 빠져 **관리자 탭도 안 뜹니다.** DB 의 `section='stat'` 행과 마이그레이션 `0005` 의
  `check` 목록·시드는 그대로 남아 있지만 어디에도 안 나옵니다(이미 실행된 마이그레이션은
  고치지 않습니다). 되살리려면 `config/sections.ts` 명세 · `lib/cms.ts` 의 `SiteBlocks`
  · 두 페이지의 `<dl>` 을 되돌려야 합니다.
- **SQL 을 안 돌려도 사이트는 그대로입니다** [A1]. `content_blocks` 가 없으면 조회가
  실패하고 `config/content.ts` 내용이 나갑니다 — 지금 화면과 같은 문구입니다.
  관리자 화면에는 "0005 를 실행하세요" 안내가 뜹니다.
- **대가**: `/about` `/signs` `/process` 가 정적에서 **요청 시 SSR** 로 바뀌었습니다.
  방문마다 DB 조회가 한 번 더 붙습니다(§7 의 SSR 부채 항목에 포함).
- 홈에서 구역 제목의 줄바꿈은 `whitespace-pre-line` 으로 살립니다. 관리자가 폼에서
  줄을 나누면 화면에서도 같은 자리에서 나뉩니다.

### F20. 견적 첨부파일 보관 ★
```
lib/quote-files.ts (server-only)
├── uploadQuoteFiles()   익명 키로 업로드. 실패해도 접수는 계속 (path 없이 반환)
├── signQuoteFiles()     관리자 세션으로 서명 URL 일괄 발급 (수명 1시간)
└── removeQuoteFiles()   문의 삭제 시 첨부도 제거

storage 'quote-files'    **비공개** 버킷 · 10MB 제한 · 키는 `문의ID/01.jpg`
├── INSERT  anon+authenticated  ← 홈페이지 폼은 로그인이 없습니다
├── SELECT  authenticated + is_admin()
└── DELETE  authenticated + is_admin()

quotes.files jsonb   [{ name, size, type, path? }]
                     path 없음 = 파일을 못 받았다는 뜻

scripts/check-quote-files.mjs   npm run quotes:check
└── 익명 업로드 성공 / 익명 열람 차단 / 관리자 열람·삭제를 실제로 왕복 검사
```
- 🔴 **왜 만들었나 (2026-08-06)**: 그전까지는 **이름과 크기만** 적고 파일을 버렸습니다.
  2026-08-03 연구개발특구진흥재단 문의에서 현판 예시 사진 2장이 실제로 그렇게
  사라졌습니다. 간판 견적은 사진 한 장이 곧 사양서라, 못 받으면 견적 자체를 못 냅니다.
- **`media` 버킷과 반대로 비공개입니다.** `media`(0001)는 홈페이지에 그대로 걸리는
  사진이라 공개가 맞지만, 여기는 고객 도면·매장 사진·개인정보가 들어옵니다.
  주소를 안다고 열려선 안 되므로 볼 때마다 서명 URL 을 새로 발급합니다.
- ⚠️ **업로드가 INSERT 보다 먼저입니다.** `quotes` 의 RLS 는 익명에게 INSERT 만 열려
  있어(0002) 행을 만든 뒤 경로를 채워 넣을 수가 없습니다. 그래서 ID 를 코드에서
  먼저 만들고, 그 폴더에 올린 뒤, 경로까지 담아 한 번에 넣습니다.
  **익명에게 UPDATE 를 열어 주는 쪽이 훨씬 나쁩니다** — 누구나 남의 문의를 고칩니다 [A2].
- **받는 형식은 확장자로 정합니다** (`ACCEPTED_FILE_EXTS`). MIME 타입은 브라우저·OS 마다
  제각각이라(`.hwp` 는 빈 문자열이나 `application/octet-stream` 으로 오는 일이 흔합니다)
  MIME 으로 막으면 멀쩡한 파일이 거부됩니다. 그래서 버킷의 `allowed_mime_types` 도
  비워 두고 **코드에서** 검사합니다.
  **관공서 사양서(`.hwp`)와 도면(`.dwg`)이 목록에서 빠지면 안 됩니다** — 2026-08-03
  연구개발특구진흥재단 문의가 그 부류였습니다.
- ⚠️ **폼의 `accept` 는 검증이 아닙니다.** 파일 선택창을 걸러 줄 뿐, 브라우저 밖에서
  요청을 만들면 아무 파일이나 들어옵니다. **서버에서 같은 함수로 다시 검사합니다.**
  실행 파일류는 일부러 뺐습니다 — 견적에 쓸 일이 없고, 나중에 그 파일을 내려받아
  여는 건 우리 쪽 사람입니다.
- 🔴 **용량 상한은 두 곳에 있고, 올릴 때는 DB 먼저입니다.**

  | 곳 | 값 |
  |---|---|
  | `lib/validate.ts` 의 `MAX_FILE_BYTES` | 폼·API 가 보는 값 |
  | `quote-files` 버킷의 `file_size_limit` | 스토리지가 보는 값 (마이그레이션) |

  **코드를 먼저 올리면 폼은 통과시키고 버킷이 거부해서 고객 파일이 사라집니다.**
  고객 화면에는 접수 완료가 뜨고요. 실제로 재현했습니다(2026-08-06):

  ```
  [견적문의] 첨부 업로드 실패 (간판 시안 원본.ai): The object exceeded the maximum allowed size
  ```

  반대 순서(버킷 먼저)는 무해합니다. **항상 DB → 코드 순으로 올리세요.**
- **합계 상한(`MAX_TOTAL_BYTES`)이 따로 있는 이유** — 개당 상한만 두면 5개 × 상한이
  한 요청으로 옵니다. 그러면 코드에 닿기 전에 Cloudflare 요청 본문 한도에 걸려
  **원인을 알 수 없는 오류**가 고객 화면에 뜨고, 워커 메모리(128MB)도 `formData()`
  하나로 찹니다. 그래서 사람이 읽을 수 있는 문구로 먼저 막습니다.
- ⚠️ **원본 파일명을 스토리지 키로 쓰지 않습니다.** 실제로 들어온 이름이
  `자석 게시판(필름마감).jpg` 였습니다. 한글·공백·괄호가 섞이면 URL 인코딩 단계마다
  깨질 자리가 생깁니다. 키는 `문의ID/01.jpg` 로 두고, 사람이 보는 이름은 DB 에 남겨
  내려받을 때 `?download=` 로 되살립니다.
- **service_role 키를 쓰지 않습니다** [§6]. 올리기는 익명 키 + INSERT 정책, 보기는
  관리자 세션 + `is_admin()` 정책으로 갈립니다. RLS 를 우회하는 코드가 없습니다.
- **파일 바이트는 라우트 맨 앞에서 딱 한 번 읽습니다 (`readQuoteFiles`).
  `File` 객체를 두 곳에 돌려쓰지 않습니다.**

  ※ 이 구조는 **예방 조치**입니다. 2026-08-06 운영 알림 장애의 원인으로 한때 지목했지만
  실제 원인은 환경변수 소멸이었습니다(§6). 다만 아래 위험 자체는 실재하고, workerd 에서
  첨부가 정상인 것도 확인했으므로 이 형태를 유지합니다.

  스토리지 업로드에 `File` 을 넘기고 같은 `File` 을 메일 첨부용으로 다시
  `arrayBuffer()` 하면 이렇게 갈립니다.

  | 런타임 | 결과 |
  |---|---|
  | Node (로컬 `npm run dev`) | `Blob` 이 메모리 기반이라 두 번 읽힘 → **통과** |
  | workerd (운영) | 첫 업로드가 본문 스트림을 소비 → 두 번째 읽기가 **빈 내용** |

  빈 첨부는 Resend 가 **요청 단계에서 거부**하고, 거부된 요청은 발송 로그에도 안 남습니다.
  그래서 "저장은 되는데 알림만 조용히 사라지는" 상태가 됐습니다 — 이 저장소가 이미
  한 번 겪은 실패 방식입니다(F16 의 403 건).

  **교훈 두 가지.** ① 첨부·업로드처럼 스트림을 다루는 코드는 **`npm run cf:preview`
  (workerd)로 확인해야 합니다.** `npm run dev` 통과는 운영 통과를 뜻하지 않습니다.
  ② 붙인 첨부 장수를 **로그에 남깁니다** — 조용히 0장이 되는 걸 그때 잡습니다.
- **base64 변환에 `Buffer` 를 쓰지 않습니다.** Node 전용 전역이 workerd 에 있으리라
  가정하지 않는 편이 안전합니다. `btoa` + 32KB 조각내기로 표준 API 만 씁니다
  (`String.fromCharCode(...arr)` 를 한 번에 부르면 큰 파일에서 스택이 넘칩니다).
- **`0006` 을 안 돌려도 접수는 됩니다** [A1 의 연장]. 버킷이 없으면 업로드만 실패하고
  문의는 그대로 저장됩니다. 관리자 화면에 "파일 없음" 으로 표시됩니다.
  실측으로도 확인했습니다 — 실행 전 접수는 `Bucket not found` 로그만 남기고 `{ok:true}`.
- ✅ **운영 DB 실측 완료 (2026-08-06).** `0006` 실행 후 폼으로 사진 2장을 실제 접수해
  한 바퀴 돌렸습니다:

  | 확인 | 결과 |
  |---|---|
  | 익명 업로드 (문의 폼 권한) | ✔ `{문의ID}/01.jpg` `02.jpg` 로 저장 |
  | 익명 직접 접근 | ✔ 차단 (HTTP 400) |
  | 익명 서명 URL 발급 | ✔ 차단 |
  | 관리자 서명 URL 내려받기 | ✔ HTTP 200 · **원본과 SHA-256 일치** (47,399 / 159,479 바이트) |
  | 삭제 시 첨부 제거 | ✔ 행·첨부 모두 제거 확인 |

  `npm run quotes:check` 가 이 중 앞의 다섯을 언제든 다시 검사합니다.
- 첨부를 알림 메일에 직접 붙이는 건 F16 쪽입니다. 이 화면 경로는 **보조**입니다 —
  메일이 12MB 를 넘겼거나, 지난 문의를 다시 찾아볼 때 씁니다.

---

## 4. 데이터 흐름

```
[공개 방문자]
  DB 안 쓰는 페이지 (/support /quote /privacy …)
    브라우저 → 빌드 시 만든 정적 HTML                        ← 캐시됨

  DB 읽는 페이지 (/ /works /about /signs /process /rss.xml)
    브라우저 → 요청마다 서버 렌더링 → lib/cms.ts
                   ├─ Supabase 연결됨 → hero_slides · works · content_blocks
                   │                    (RLS: published=true)
                   └─ 실패/미설정      → config/content.ts    [A1 폴백]
                 ※ 방문 1회 = SSR 1회 + DB 조회 1~3회 (§7 부채)
                   getBlocks() 는 여섯 구역을 조회 1회로 가져옵니다 (F19)

[관리자]
  브라우저 → /admin/* page.tsx → requireAdmin()
           ↑ SessionKeeper.tsx 가 브라우저에서 토큰 갱신 → 쿠키 기록 (구 proxy.ts 역할)
           → 서버액션 → requireAdmin() 재확인 → Supabase (RLS 재검증)
                      → revalidatePath("/", "/works")
                      → 공개 페이지는 force-dynamic 이라 애초에 매번 새로 그려짐.
                        이 호출은 클라이언트 라우터 캐시를 비우는 역할만 남았고,
                        나중에 캐시를 되살릴 때를 위해 남겨 둡니다.

[사진 업로드]
  브라우저 → Supabase Storage 직접 (서버 경유 안 함)
           → 공개 URL → 폼 → DB image_url

[명령줄 관리자 — F18]
  npm run cms → signInWithPassword(관리자 계정) → role==="admin" 확인
              → Supabase (RLS 재검증, service_role 아님)
              → 사진은 media 버킷에 직접 업로드 → 공개 URL → DB image_url
              ※ 웹서버를 거치지 않습니다. 배포도 필요 없습니다 —
                공개 페이지가 force-dynamic 이라 다음 방문에 새로 읽습니다.
```

---

## 5. 데이터베이스

마이그레이션은 **Supabase 대시보드 → SQL Editor 에 붙여넣고 실행**합니다. 전부 재실행 안전.

| 파일 | 내용 |
|---|---|
| `0001_init.sql` | 스키마 · RLS · 초기 데이터 |
| `0002_quotes.sql` | 견적 문의 테이블 |
| `0003_works_photos.sql` | 실적 6건 추가 (사진 있는 현장, `sort_order` 1~6) |
| `0004_works_brochure.sql` | 실적 2건 추가(`sort_order` 7~8) + **사진 없는 4건을 맨 뒤(200~230)로** |
| `0005_content_blocks.sql` | **페이지 문구 표 + RLS + 지금 나가는 문구 그대로 초기 데이터** (F19) |
| `0006_quote_files.sql` | **견적 첨부 보관 — `quote-files` 비공개 버킷 + storage RLS 3종** (F20) |
| `0007_quote_files_limits.sql` | 첨부 용량 상한 10MB → **50MB 실행 완료** (2026-08-06, 45MB 통과·55MB 거부 실측). 다시 올릴 때도 **DB 먼저, 코드 나중** — F20 |

> ⚠️ **`config/content.ts` 만 고치면 운영 사이트는 안 바뀝니다.**
> `getWorks()`/`getSlides()` 는 DB 에 published 행이 하나라도 있으면 그쪽을 씁니다
> (config 는 A1 폴백 전용). 실적·슬라이드를 늘릴 때는 **DB 와 config 양쪽**에
> 넣어야 합니다 — 마이그레이션 파일 + `config/content.ts`.
>
> **문구 블록(F19)도 같습니다.** `content_blocks` 에 그 구역 행이 하나라도 있으면
> `config/content.ts` 의 `sectionCopy`·`whyPoints`·`steps`·`equipment`·`signTypes`
> 는 **안 읽힙니다.** 운영 문구를 바꾸는 정상 경로는 `/admin/content` 입니다.

```
public.profiles          id(→auth.users) · email · role('admin'|'viewer')
public.hero_slides       eyebrow · title · sub · image_url · alt · sort_order · published
public.works             title · category · location · tags[] · image_url · sort_order · published
public.content_blocks    section · slug · eyebrow · title · sub · points[] · image_url · alt
                         · sort_order · published        ← F19. 칸의 뜻은 구역마다 다름
public.quotes            + files jsonb  [{ name, size, type, path? }]   ← F20
storage.buckets 'media'        public read
storage.buckets 'quote-files'  **비공개** — 서명 URL 로만 열람 (F20)

함수
├── public.is_admin()          SECURITY DEFINER — profiles 정책의 무한 재귀 회피
├── public.handle_new_user()   가입 트리거. 첫 사용자만 admin, 이후 viewer
└── public.touch_updated_at()

RLS
├── 공개 SELECT  : published = true
├── 관리자 ALL   : is_admin()
├── storage media       : 읽기 공개 / 쓰기·삭제 admin
└── storage quote-files : 쓰기 익명 허용(문의 폼) / 읽기·삭제 admin 전용   ← F20
```

**image_url 두 가지 형태를 모두 허용합니다**

| 값 | 의미 |
|---|---|
| `/images/hero-night.jpg` | `public/images/` 의 파일 |
| `https://xxx.supabase.co/storage/...` | 관리자가 올린 파일 |

---

## 6. 환경변수

| 키 | 필수 | 없으면 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | 관리자 기능에만 | CMS 꺼짐 → 폴백 동작, 공개 사이트 정상 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 관리자 기능에만 | 〃 |
| `NEXT_PUBLIC_SITE_URL` | ✕ (선택) | `config/site.ts` 의 확정 도메인을 씁니다. **임시 주소로 배포할 때만** 이 값을 넣으세요 — `site.isProductionDomain` 이 false 가 되어 `robots.txt` 가 전면 차단으로 바뀝니다 |
| `QUOTE_WEBHOOK_URL` | ✕ (선택) | 견적 알림 웹훅 꺼짐. 접수·저장은 정상 (F16) |
| `RESEND_API_KEY` | ✕ (선택) | 견적 알림 **이메일 꺼짐**. 이 키만 넣으면 `site.email` 로 갑니다 (F16) |
| `QUOTE_NOTIFY_EMAIL` | ✕ (선택) | `config/site.ts` 의 `site.email` 로 발송. **쉼표로 여러 주소 가능** — 도메인 인증 전에는 Resend 가입 계정 본인 메일만 실제로 받고, 나머지는 로그에 실패로 남습니다(F16). 현재값: `fivepeople201@gmail.com,poing7003@naver.com,sujin4003@hanmail.net` |
| `QUOTE_MAIL_FROM` | ✕ (선택) | `onboarding@resend.dev`(시험용)로 발송 — 한메일에서 스팸 위험. **도메인 인증을 마쳤으니 `noreply@susannadesign.co.kr` 을 넣으세요**(2026-08-06) |
| `SUPABASE_ADMIN_EMAIL` | ✕ (선택) | `npm run cms` 만 안 됩니다 (F18). 화면·홈페이지는 정상 |
| `SUPABASE_ADMIN_PASSWORD` | ✕ (선택) | 〃 — 관리자 화면에 쓰는 그 계정의 비밀번호 |

`SUPABASE_ADMIN_*` 에는 `NEXT_PUBLIC_` 접두어가 **없습니다.** 그래서 브라우저로 나가지 않고,
앱 코드도 읽지 않습니다 — `scripts/cms.mjs` 전용입니다.

확인 명령: `npm run notify:test` — 가짜 문의를 만들지 않고 알림만 시험 발송합니다
(한글 파일명 첨부 1개가 같이 갑니다 — 첨부 경로까지 한 번에 확인됩니다).
`npm run quotes:check` — 첨부 보관·권한이 실제로 도는지 왕복 검사 (F20).
콘텐츠 관리 명령: `npm run cms -- help` (F18).

**운영(Cloudflare) 환경변수는 들어가 있습니다** — 2026-07-26 확인
(`/admin/login` 이 "아직 연결 전입니다" 안내문이 아니라 로그인 폼을 그림 = 키가 읽힌다는 뜻).

### 🔴 배포는 `Plaintext` 환경변수를 지웁니다 — 반드시 `Secret` 으로

**이 저장소에서 가장 비싼 함정입니다.** 2026-08-06 에 같은 값을 두 번 잃었습니다.

Workers Builds 는 `npx wrangler deploy` 로 배포하고, 그 명령은 `wrangler.jsonc` 의
내용을 워커의 **최종 설정으로 덮어씁니다.** 대시보드에서 손으로 넣은 `Plaintext`
변수는 그 순간 사라집니다. 살아남는 건 **`Secret`(암호화)** 뿐입니다 — 시크릿은
스크립트 설정과 별도로 보관돼 `wrangler deploy` 가 건드리지 않습니다.

실제로 벌어진 순서(운영 로그·Resend 발송 로그로 확인). **같은 날 두 번 당했습니다.**

| 시각 | 사건 | 결과 |
|---|---|---|
| 12:03 | 값 3개를 **Plaintext** 로 넣음 | 접수 → 세 주소로 알림 도착 ✅ |
| 12:10 | 코드 배포(`wrangler deploy`) | **값 3개 소멸** |
| 12:12 | 접수 | `알림 경로가 설정되지 않아 아무 곳에도 알리지 않았습니다` ❌ |
| 13:3x | `RESEND_API_KEY` 는 **Secret**, `QUOTE_NOTIFY_EMAIL` 은 **Plaintext** 로 재등록 | 접수 → 세 주소 도착 ✅ |
| 13:50 | 코드 배포 | **Secret 은 살아남고 Plaintext 만 소멸** |
| 13:55 | 접수 | 메일은 **왔지만** 수신자가 `sujin4003@hanmail.net` 하나 ⚠️ |

🔴 **두 번째가 더 위험합니다.** 받는 주소가 없으면 `site.email` 로 폴백하도록 되어 있어
**메일이 오긴 왔습니다.** 그래서 두 사람이 빠진 걸 아무도 몰랐고, Resend 발송 로그의
수신자를 세어 보고서야 찾았습니다. **완전히 죽는 고장보다 조용히 반만 되는 고장이
훨씬 늦게 발견됩니다.**

그래서 폴백을 탈 때 **로그와 `/admin/quotes` 화면 양쪽에 경고**를 띄웁니다
(`notifyFellBack`). 로그는 아무도 안 보므로 화면 쪽이 실질적인 방어선입니다.

**그래서 값을 두 군데로 나눠 둡니다.**

| 값 | 어디에 | 왜 |
|---|---|---|
| `QUOTE_MAIL_FROM` | `wrangler.jsonc` 의 `vars` | 받는 사람 화면에 찍히는 공개 값. 버전 관리되고 배포에도 안 지워짐 |
| `RESEND_API_KEY` | 대시보드 **Secret** | 유출되면 남이 이 도메인으로 메일을 보냄 |
| `QUOTE_NOTIFY_EMAIL` | 대시보드 **Secret** | 개인 메일 주소 |

⚠️ **이 저장소는 공개(public)입니다.** `wrangler.jsonc` 의 `vars` 에 적는 값은 누구나
봅니다. API 키·개인 메일 주소를 거기 적으면 안 됩니다.

> ⚠️ **런타임 칸과 빌드 칸은 다른 저장소입니다.** `NEXT_PUBLIC_*` 는 빌드(Build →
> Variables and secrets), 서버가 실행 중 `process.env` 로 읽는 값은 **워커 최상단의
> Variables and secrets**. 8월 3일 문의 알림이 안 간 원인이 이 칸이 비어 있어서였습니다.
>
> ⚠️ **값을 넣은 직후의 요청은 아직 옛 설정으로 처리될 수 있습니다.** 12:01 접수는
> 알림이 안 갔고 12:03 접수는 갔습니다 — 그 사이에 값이 저장됐습니다.
> "안 온다"고 판단하기 전에 **저장 시각 이후로 한 번 더** 넣어 보세요.
>
> 🔴 **원인을 찾을 땐 운영 로그부터 보세요.** 이 건에서 저는 "첨부를 두 번 읽어
> workerd 에서 빈 내용이 된다" 고 **잘못 진단하고 코드를 고쳐 배포까지 했습니다.**
> Cloudflare Observability 로그 한 줄(`알림 경로가 설정되지 않아…`)이 진짜 원인을
> 바로 말해 주고 있었습니다. 증상이 같아 보여도(저장 O·알림 X) 원인은 다릅니다.

`SUPABASE_SERVICE_ROLE_KEY` 는 **의도적으로 사용하지 않습니다.**

설정 절차는 [`SUPABASE-SETUP.md`](SUPABASE-SETUP.md), 진단은 `npm run supabase:check`.
`.env.local` 은 서버 시작 시 한 번만 읽히므로 값 변경 후 **재시작 필수**입니다.

---

## 7. 미완료 · 부채

> **이 표에는 "남은 일"만 씁니다.** 해결된 항목은 지웁니다([`AGENTS.md`](../AGENTS.md) §9).
> 고친 이력을 여기 쌓아 두면 진짜 남은 일이 묻힙니다.
>
> 단, **다시 밟으면 안 되는 함정은 지우지 말고 §3 의 해당 기능 설명으로 옮깁니다.**
> 이 표는 "무엇이 남았나", §3 은 "왜 이렇게 되어 있나" 를 답합니다.

### 7.1 사람이 해야 하는 것 (코드로 안 되는 일)

| 구분 | 내용 | 위치 |
|---|---|---|
| 🔴 사진 | **남은 자리: 실적 4자리 + 히어로 2 + 공정 5.** 회사소개서에서 12장을 뽑아 넣어 실적 15자리 중 11자리·사업영역 4자리 전부가 채워졌고(2026-07-27), **사옥 전경은 대표님이 주신 현장 촬영본으로 채웠습니다**(2026-08-06). 급한 순서: ① **히어로 2·3 — 현장 촬영이 유일한 길입니다.** 네 개 PDF 를 전수 확인했고 1920px 이상은 스톡/합성 그래픽뿐, 자사 실사진 최대치는 1400×1050 ② 공장 공정 5칸(회사소개서엔 채널문자 제작 1장뿐) ③ 남은 실적 4건(교보생명·우리은행·KT탄방타워는 회사소개서에 4장이 한 띠로 합쳐져 435×276 밖에 안 나오고, 뉴코아는 사진 자체가 없음) | `public/images/README.md` |
| 🔴 개인정보 | **회사소개서 5·6페이지는 사업자등록증·여성기업확인서·옥외광고사업등록증·공장등록증명서 스캔입니다.** 사진을 더 뽑을 때 섞여 들어가지 않게 하세요 — 사업자등록번호·대표자 정보가 읽힙니다. 웹 게시 금지 | `public/images/README.md` |
| ⚠️ 등록 | **네이버 스마트플레이스 등록·사진 완료** (2026-08-06, 대표님 확인). 남은 건 소개글·대표키워드·가격·새소식 — 복붙 문구는 `_place-upload/네이버플레이스_등록내용.md`. **신규 90일 노출 우대 구간이라 지금 채우는 게 가장 효율이 좋습니다** | [`SEO.md`](SEO.md) C1 |
| 🔴 등록 | **플레이스 노출 전화번호가 `042-541-0171` 입니다** — 홈페이지 대표번호(`010-7449-4600`)와 다릅니다. NAP 불일치라 고쳐야 하는데, **신규 등록 직후엔 기본정보가 "업체 검토중" 으로 잠깁니다.** 검토 완료 후 스마트플레이스 → 업체정보 → 기본정보에서 대표번호를 010 으로 바꾸세요. 같은 화면의 **대표키워드도 아직 0개**입니다. **네이버 예약의 `예약문의` 도 이 값을 읽기 전용으로 끌어쓰므로 여기만 고치면 양쪽이 같이 바뀝니다** | [`SEO.md`](SEO.md) C1 |
| ⏳ 등록 | **네이버 예약 검수 진행중** (2026-08-06 신청, 영업일 2~3일). 예약 사업자 `1713161` · 상품 `간판 무료 상담` 노출중. 결과는 `poing7003@naver.com` 메일. **통과하면 `설정 → 운영설정`에서 ① `예약받기` 를 시작 ② `플레이스 연결하기`** — 그래야 플레이스에 [예약] 버튼이 붙습니다. 반려되면 사유가 메일에 옵니다 | [`SEO.md`](SEO.md) C1-b |
| 🔴 등록 | **구글 비즈니스 프로필 미등록.** 검색 우측 지식 패널(로고·사진·영업시간 카드)은 홈페이지가 아니라 여기서 만들어집니다 | [`SEO.md`](SEO.md) C2 |
| ⚠️ 색인 | **구글 색인이 홈 1페이지뿐.** 소유확인은 끝났습니다(2026-07-28, DNS TXT 실측 확인). 남은 건 Search Console 에서 **사이트맵 제출 + `/works` `/about` 색인 요청** | [`SEO.md`](SEO.md) C4 |
| ⚠️ 확인 | **색인 상태는 `hl=ko&gl=kr` 로만 판정합니다.** 미국 기준 검색 도구로는 결과가 안 보여서, 한 번 그것만 보고 "인덱스 0건" 으로 잘못 판정한 적이 있습니다 | [`SEO.md`](SEO.md) 맨 위 |
| 🔴 문의 | **2026-08-03 연구개발특구진흥재단(송예진) 문의가 미확인 상태**입니다. 알림 메일이 안 갔고(당시 Cloudflare 런타임에 `RESEND_API_KEY` 없음), 첨부 사진 2장은 보관 기능이 없어 **이미 유실**됐습니다. 사진은 고객께 다시 요청해야 합니다 | `/admin/quotes` |
| ✅ 확인 | **마이그레이션 `0001`~`0006` 전부 실행 완료** (2026-08-06). 운영 DB 에 직접 물어 확인: `content_blocks` 28행(copy 5 · why 4 · stat 4 · process 5 · fabrication 6 · sign_type 4). 프로젝트는 `Gachon-junghyun's Org / SusannaDesign`. ⚠️ 이때 `works` 를 **23건**으로 적어 뒀으나, 2026-08-07 `cms list works`(미공개 포함)는 **17건**이었습니다 — 4건 추가 후 **21건**. 차이의 원인은 확인하지 못했습니다. 실적 건수를 인용할 때는 이 줄이 아니라 `list works` 를 보세요 | §5 |
| ⚠️ 확인 | **Supabase 깨우기 Actions 시크릿 등록 여부** — 저장소 Actions 탭에 초록 체크가 있는지. 7일 무요청이면 DB 가 멈추고 견적 문의 저장이 죽습니다 | `.github/workflows/keep-supabase-awake.yml` |
| ⚠️ 정리 | 운영 `/admin/quotes` 에 검증용 테스트 문의 2건(`[검증] 지워주세요`) 남아 있음 | [`DEPLOY.md`](DEPLOY.md) 3단계 |
| ⚠️ 확인 | **알림 환경변수 `Secret` 재등록 — 대표님이 완료했다고 알려 주셨습니다** (2026-08-06). 코드에서는 확인할 수 없는 값이라, **다음 배포 뒤에 운영 `/admin/quotes` 맨 위 배너가 주황 경고가 아닌지** 한 번 보면 끝입니다. 주황이면 `Plaintext` 로 들어간 것입니다 | §6 · F16 |
| 🔴 보안 | **`RESEND_API_KEY` 를 새로 발급하고 기존 키 폐기** — 예전 키가 `Plaintext` 로 들어가 있어 대시보드 조회 권한만 있으면 보였고, 2026-08-06 작업 중 화면 캡처에도 값이 찍혔습니다. resend.com → API Keys 에서 재발급 후 기존 키 삭제 | F16 · §6 |
| TODO | `config/site.ts` 남은 값: 옥외광고사업 등록번호 · 누적건수 · 카카오채널 | `config/site.ts` |
| ⏳ 등록 | **구글 비즈니스 프로필 — 소유권 주장 진행중** (2026-08-06). 구글 지도에 **남이 만든 미소유 등록이 이미 있었고 내용이 틀렸습니다** — `그래픽 디자이너 / 유성구 원내동 98-1`. 주장 절차에서 **카테고리 → `간판제작업체`, 주소 → `대전 서구 사기점골길 128`, 전화 → `010-7449-4600`** 으로 교정했습니다. **다음은 구글이 지정하는 소유권 인증**(영상통화·엽서·전화 중 택일, 엽서면 2주)이라 대표님만 할 수 있습니다. 인증 후 사진 22장·영업시간·홈페이지·서비스지역을 채우면 검색 우측 지식 패널이 생깁니다 | [`SEO.md`](SEO.md) C2 |
| 미도입 | **오시는길에 지도 그림이 없습니다** — 주소·영업시간 + 길찾기 링크 카드로 대체했습니다(F21). 진짜 지도를 그리려면 **카카오맵 JS SDK**(개발자 키 무료 발급 필요)가 정석입니다. 급하지 않은 이유: 손님이 실제로 누르는 건 약도 그림이 아니라 길찾기이고 그건 이미 됩니다 | `app/support/page.tsx` |
| ⚠️ 확인 | **네이버 URL 검사 재실행 필요** — `robots.txt 없음` 경고가 남아 있는지. Yeti UA 실측은 `200 / text/plain / 500B` 로 정상이라 오탐으로 보고 있습니다. 배포 후에도 뜨면 다시 파야 합니다 | [`SEO.md`](SEO.md) 느낌표 표 3번 |
| 🔴 등록 | **서치어드바이저에 사이트맵·RSS 미제출** — 소유확인은 끝났습니다(2026-07-28). `요청 → 사이트맵 제출`에 `sitemap.xml`, `요청 → RSS 제출`에 `rss.xml`. **둘 다** 내야 합니다 | [`SEO.md`](SEO.md) C3 |
| 🔴 코드 | **당근 비즈프로필이 `sameAs` 에 없습니다** — 2026-07-28 등록 완료(`수산나디자인 간판제작`). `config/site.ts` 에 `daangnUrl` 을 신설해 프로필 URL 을 넣어야 검색엔진·AI 가 홈페이지와 같은 회사로 묶습니다. **URL 만 받으면 되는 작업** | `config/site.ts` · [`SEO.md`](SEO.md) C5 |
| TODO | `sameAs` 에 `blogUrl`·`kakaoChannelUrl` 이 비어 있음 — 채널이 생기면 넣으세요. 엔티티 연결이 한 겹 더 두꺼워집니다 | `config/site.ts` |
| ⚠️ 법률 | 개인정보처리방침의 **위탁(제5조)·쿠키(제5조의2)는 2026-08-06 에 실제 내용으로 채웠습니다**(Google·Resend·Cloudflare·Supabase). 나머지 조항과 **이용약관은 여전히 초안**이라 법률 검토가 필요합니다 | `app/privacy` `app/terms` |
| ⚠️ 정리 | **GA 속성이 3개입니다** — `수산나디자인 홈페이지(G-NNT57E6S9L, 실사용)` · `susanna1(G-BFTM7QMRF2, 정체 불명)` · `susanna-8bcad(G-G2CS3P127V, Firebase 앱 `com.example.susannaDesginApplication`)`. **홈페이지에 심은 건 첫 번째 하나뿐**입니다. `susanna1` 은 Ads 캠페인 흐름에서 딸려 생긴 것으로 보이며, 안 쓰는 속성은 지워야 나중에 어느 게 진짜인지 헷갈리지 않습니다 | F22 |
| ⚠️ 확인 | **Google Ads 미완성 캠페인** — 계정 `848-526-3219`, 캠페인 `24115193992` 가 생성 흐름 도중 중단된 채 남아 있습니다. **결제수단 미등록이라 게재·과금 없습니다.** 정리하려면 광고 차단기를 끈 뒤 계정 취소를, 아니면 그대로 두면 됩니다(권장). ⚠️ 그 흐름의 `건너뛰기`는 나가는 버튼이 아니라 **예산·결제로 더 들어가는** 버튼입니다 | — |
| ⚠️ 법률 | **견적 알림을 켜면 개인정보 위탁 고지가 필요합니다** — 고객 이름·연락처가 Resend·슬랙 등 외부로 나갑니다. 처리방침 위탁 항목에 업체명·위탁업무를 적어야 합니다(개인정보보호법 제26조). 켜기 전에는 해당 없음 | `app/privacy` · F16 |
| ⚠️ 배포 | **Vercel Hobby 사용 금지** — 상업적 이용 위반이라 사전 통보 없이 중단될 수 있습니다 | [`DEPLOY.md`](DEPLOY.md) |

### 7.2 코드 부채

| 구분 | 내용 | 위치 |
|---|---|---|
| 미검증 | 관리자 CRUD 중 **삭제 · 순서변경(`moveSlide`/`moveWork`) 이 실동작 미확인**. 저장·사진업로드는 운영에서 끝까지 통하는 것을 확인했습니다 | F9 F10 |
| 미검증 | **F18 CLI 중 `rm`·`move`·`renumber` 가 실계정 미검증.** 로그인 → `list works` → `works batch`(4건 업로드+등록)는 2026-08-07 운영 DB 에서 실증했습니다. 남은 셋은 되돌릴 수 없거나 순서를 흐트러뜨리는 명령이라, 시험용 `--draft` 행을 하나 만들어 그걸로 돌려 봐야 합니다 | F18 |
| 부채 | **관리자 비밀번호가 `.env.local` 에 평문** — F18 이 브라우저 없이 로그인하려면 필요합니다. git 제외지만 이 PC 를 쓰는 사람은 볼 수 있습니다. 화면 공유·녹화 시 주의 | F18 · §6 |
| 부채 | **방문마다 SSR + DB 조회** — ISR 을 걷어낸 대가(§2.1 주석). 홈 HTML 에 캐시가 없습니다(`no-store` 실측). **2026-08-06 F19 로 `/about` `/signs` `/process` 도 여기 들어왔습니다** — 정적이던 세 페이지가 요청 시 SSR 이 됐습니다(문구를 관리자가 바꾸려면 불가피). 트래픽이 커지면 Cache Rules 또는 R2 로 ISR 을 되살리는 게 정석 | `app/page.tsx` `works` `about` `signs` `process` |
| 부채 | 견적 폼 레이트리밋이 **인메모리** — 서버리스라 인스턴스마다 따로 세므로 사실상 헐거움 | F5 |
| 부채 | 관리자에서 사진 교체 시 **이전 파일이 스토리지에 남음** (고아 파일) | F10 |
| 부채 | **첨부를 올린 뒤 DB INSERT 가 실패하면 파일이 고아로 남습니다** (F20). 익명에게 UPDATE 를 안 주려고 업로드를 먼저 하는 구조의 대가입니다. INSERT 실패 자체가 드물고, 실패 시 고객에게 500 을 돌려주므로 문의를 삼키지는 않습니다. 쌓이면 `_check/` 와 함께 버킷에서 손으로 지웁니다 | F20 |
| 문서 | **`scripts/formtest.mjs` 가 저장소에 없습니다** — F5 설명이 "회귀 테스트 12건(`formtest.mjs`)" 이라고 적고 있는데 파일이 존재하지 않습니다. 문서가 낡았거나 파일이 유실된 것이라, 폼을 고칠 때 기댈 회귀 검사가 사실상 없습니다 | F5 |
| 부채 | `sort_order` 가 같으면 순서 변경이 동작하지 않음. **관리자 화면은 여전히 그렇습니다** — 걸리면 `npm run cms -- works renumber` 로 풉니다 (F18). **`content_blocks`(F19)에는 `renumber` 가 없습니다** — 초기 데이터가 10 단위라 당장은 안 걸리지만, 항목을 많이 넣고 지우다 겹치면 손으로 `sort_order` 를 고쳐야 합니다 | F9 · F19 |
| 부채 | 로고 SVG 가 저해상도 래스터 트레이싱본. 대형 출력엔 원본 AI/EPS 필요 | `public/logo.svg` |
| 미도입 | **시공사례 개별 페이지** — 로컬 SEO 최대 자산이나, 지금 데이터로 만들면 "얇은 콘텐츠" 페널티. 사례별 상세(위치·간판종류·기간·자재·현장 메모) 확보가 선행 | [`SEO.md`](SEO.md) B-1 |
| 🔴 배포 | **F19 코드가 아직 배포 전입니다** — DB(`content_blocks`)는 만들어졌지만 운영에 나가 있는 건 이전 코드라, 지금 `/admin/content` 로 들어가면 404 입니다. 배포해야 관리자 화면이 생깁니다 | F19 |
| 미도입 | **회사 개요·연혁·비전은 아직 CMS 미연결** — 사업영역·공정·프로세스·구역 제목은 2026-08-06 F19 로 연결됐습니다. 남은 셋은 바뀌는 빈도가 낮아 `config/` 에 둡니다 | `config/content.ts` `config/site.ts` |

---

## 8. 변경 전 체크리스트

**공개 페이지를 건드릴 때**
- [ ] Supabase 없이도 렌더되는가 (`.env.local` 을 잠시 비워 확인) — A1
- [ ] `cookies()` / `headers()` 를 새로 부르지 않았는가 — A3
- [ ] `npm run build` 결과에서 해당 라우트가 여전히 `○`(정적)인가

**관리자/데이터를 건드릴 때**
- [ ] 새 서버 액션에 `requireAdmin()` 이 있는가 — A2
- [ ] 새 테이블에 RLS 를 켜고 정책을 넣었는가 — A2
- [ ] 저장 후 `revalidatePath` 대상이 맞는가
- [ ] `/admin/*` 이 빌드 결과에서 `ƒ`(동적)인가 — A4

**공통**
- [ ] `npm run lint` · `npm run build` 통과
- [ ] 회귀 테스트 (스크롤 10건 · 폼 12건)
- [ ] **이 문서와 `README.md` 갱신** — 아래 참조

---

## 9. 이 문서를 고치는 법

코드 변경 유형별로 **반드시 같이 손봐야 할 곳**:

| 변경 | 갱신 대상 |
|---|---|
| 페이지 추가·삭제 | §2 표 · §1 트리 · `app/sitemap.ts` |
| 기능 추가 | §3 에 `F번호` 신설 · §4 흐름도 |
| DB 스키마 변경 | §5 · 새 마이그레이션 파일 · `lib/supabase/types.ts` |
| 환경변수 추가 | §6 · `.env.local.example` · `README.md` |
| 원칙에 어긋나는 결정 | §0 에 예외로 명시하거나 원칙 자체를 고칠 것 |
| 부채 해소 | §7 에서 해당 줄 삭제 |

맨 위 **최종 갱신** 날짜도 함께 바꿉니다.
