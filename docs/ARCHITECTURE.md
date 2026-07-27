# 수산나디자인 홈페이지 — 구조 지도

> **이 문서의 목적**
> 코드를 처음 받는 사람이 30분 안에 전체 구조를 파악하고, 어디를 고치면 어디가
> 영향받는지 알 수 있게 하는 것. 대공사(리뉴얼·기능 추가) 전에 여기부터 읽습니다.
>
> **⚠️ 코드를 고치면 이 문서도 같이 고칩니다.** 규칙은 [`AGENTS.md`](../AGENTS.md) 참조.

| | |
|---|---|
| 최종 갱신 | 2026-07-27 (**실적 사진 12장 투입** · **F18 CMS 명령줄 도구** · IndexNow F17 · `http`→`https` 301 · `sameAs` · `taxID` · `WebSite` 사이트이름) |
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
| 사진 | ⚠️ 실사진 **19장**(실적 17 · 사업영역 4 · 공정 1, 일부 공용). 2026-07-27 회사소개서에서 12장 추가 — **배포해야 운영에 반영됩니다**. 남은 자리는 §7 |
| **견적 문의 접수** | ✅ **끝까지 확인** — 운영 API 에 실제 접수 → `{ok:true}`. 폴백 수정 후라 이 응답은 **DB 저장 성공**을 뜻합니다 |
| 견적 API 방어 | ✅ 허니팟 200(저장 안 함) · 빈 값 400 · 잘못된 번호 400 |
| 고객 개인정보 | ✅ 익명은 `quotes` 를 **넣기만 되고 못 읽음** — 방금 넣은 행도 안 보이는 것까지 확인 |
| **`http` → `https` 301** | ✅ 루트·하위경로·`www` 겹침 전부 301 (Cloudflare `Always Use HTTPS` — **코드 아님**, F13 아래 경고) |
| 크롤러 실접근 | ✅ Googlebot·GPTBot·OAI-SearchBot·ChatGPT-User·PerplexityBot·ClaudeBot·Yeti·bingbot **8종 전부 200** (UA 실측, 차단 0건) |
| 구글 검색 | ✅ "수산나디자인" **1위** / ⚠️ 색인은 **홈 1페이지뿐** (사이트맵 10개 중 1개) |
| 색인 통보 (IndexNow) | ✅ 전체중계 202 · Bing 202 / ⚠️ 네이버 403 — 서치어드바이저 등록 후 재실행 (F17) |
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
| **P1** | `/` | `app/page.tsx` | **요청 시 SSR** (`dynamic="force-dynamic"`) | **CMS** `getSlides()` `getWorks()` + `config/content.ts` |
| **P2** | `/about` | `app/about/page.tsx` | 정적 | `config/site.ts` `content.ts` |
| **P3** | `/signs` | `app/signs/page.tsx` | 정적 | `content.signTypes` |
| **P4** | `/works` | `app/works/page.tsx` | **요청 시 SSR** (`dynamic="force-dynamic"`) | **CMS** `getWorks()` |
| **P5** | `/process` | `app/process/page.tsx` | 정적 | `content.steps` + 페이지 내 `detail` |
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
├── WHY SUSANNA         ← 페이지 내 하드코딩 + content.stats
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
| **P13** | `/admin/quotes` | `app/admin/quotes/page.tsx` | admin | 견적 문의함. 확인처리·삭제. 대시보드에 미확인 건수 노출 |

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

### F5. 견적 문의 폼
```
lib/validate.ts               클라이언트·서버 공용 검증
├── formatPhone()             자동 하이픈 (02·지역번호 포함)
├── isValidPhone/Email()
├── validateQuick/Full()
└── MAX_FILES 5 · MAX_FILE_BYTES 10MB

components/QuickQuoteForm.tsx  히어로 인라인 3필드
components/QuoteForm.tsx       전체 폼 (+ Daum 우편번호 API 지연로드)
components/PrivacyConsent.tsx  개인정보보호법 제15조 고지 4요소
components/Field.tsx           라벨·에러 공통 래퍼

app/api/quote/route.ts
├── 허니팟 company_website → 조용히 200 (저장 안 함)
├── IP 레이트리밋 10분 5회 (인메모리)
├── 서버 재검증 (클라이언트 우회 시 400)
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

### F16. 견적 문의 실시간 알림
```
lib/notify.ts   notifyNewQuote(q) → 보낸 경로 이름[]
├── QUOTE_WEBHOOK_URL   웹훅 — 슬랙·카카오워크·디스코드 ({text}/{content} 동시 전송)
├── RESEND_API_KEY      이메일 — 받는 주소는 QUOTE_NOTIFY_EMAIL, 없으면 site.email [A5]
│   └── HTML 본문: 연락처가 큰 버튼이고 tel: 링크 — 휴대폰에서 눌러 바로 통화
│       + text 대체본문 (HTML 막아 둔 메일 앱 대비)
├── 타임아웃 5초 · Promise.allSettled — 하나 실패해도 나머지 발송
└── 예외를 밖으로 던지지 않음

scripts/check-notify.mjs   npm run notify:test
└── 가짜 문의를 만들지 않고 알림만 시험 발송. 401/403 은 원인까지 안내
```
- ⚠️ **SMTP 는 못 씁니다.** Cloudflare Workers 가 TCP 소켓을 못 열어 네이버웍스·Gmail
  계정을 직접 붙이는 방식이 불가능합니다. HTTP API 방식(Resend)이라 이 제약을 피합니다.
- ⚠️ **Resend 도메인 등록은 선택이 아니라 필수입니다.** 등록 전에는 **가입 계정 본인
  메일로만** 발송되고 다른 주소는 403 으로 거부됩니다(실측 확인). 즉 `site.email`
  (`sujin4003@hanmail.net`)로 받으려면 `susannadesign.co.kr` 을 Resend 에 등록해야
  합니다. 스팸 필터 통과는 그 부수 효과입니다.
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

app/layout.tsx
├── metadata   타이틀에 지역 키워드 앞배치 (60자↓) · 설명 90~110자
│              verification 슬롯 (값 없으면 태그 미출력)
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
app/sitemap.ts   /admin 제외
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
- ⚠️ **네이버는 서치어드바이저 등록이 선행돼야 합니다 — 실측 확인** (2026-07-27
  첫 실행): 같은 `keyLocation` 으로 **Bing 202 · 전체중계 202 · 네이버만 403**.
  키 문제가 아니라 사이트가 서치어드바이저에 없어서입니다. 등록 후 재실행하면 됩니다.
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

---

## 4. 데이터 흐름

```
[공개 방문자]
  DB 안 쓰는 페이지 (/about /signs /process /support /quote …)
    브라우저 → 빌드 시 만든 정적 HTML                        ← 캐시됨

  DB 읽는 페이지 (/ /works /rss.xml)
    브라우저 → 요청마다 서버 렌더링 → lib/cms.ts
                   ├─ Supabase 연결됨 → hero_slides · works  (RLS: published=true)
                   └─ 실패/미설정      → config/content.ts    [A1 폴백]
                 ※ 방문 1회 = SSR 1회 + DB 조회 1~2회 (§7 부채)

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

> ⚠️ **`config/content.ts` 만 고치면 운영 사이트는 안 바뀝니다.**
> `getWorks()`/`getSlides()` 는 DB 에 published 행이 하나라도 있으면 그쪽을 씁니다
> (config 는 A1 폴백 전용). 실적·슬라이드를 늘릴 때는 **DB 와 config 양쪽**에
> 넣어야 합니다 — 마이그레이션 파일 + `config/content.ts`.

```
public.profiles          id(→auth.users) · email · role('admin'|'viewer')
public.hero_slides       eyebrow · title · sub · image_url · alt · sort_order · published
public.works             title · category · location · tags[] · image_url · sort_order · published
storage.buckets 'media'  public read

함수
├── public.is_admin()          SECURITY DEFINER — profiles 정책의 무한 재귀 회피
├── public.handle_new_user()   가입 트리거. 첫 사용자만 admin, 이후 viewer
└── public.touch_updated_at()

RLS
├── 공개 SELECT  : published = true
├── 관리자 ALL   : is_admin()
└── storage      : 읽기 공개 / 쓰기·삭제 admin
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
| `QUOTE_NOTIFY_EMAIL` | ✕ (선택) | `config/site.ts` 의 `site.email` 로 발송. 쉼표로 여러 주소 가능 |
| `QUOTE_MAIL_FROM` | ✕ (선택) | `onboarding@resend.dev`(시험용)로 발송 — 한메일에서 스팸 위험 |
| `SUPABASE_ADMIN_EMAIL` | ✕ (선택) | `npm run cms` 만 안 됩니다 (F18). 화면·홈페이지는 정상 |
| `SUPABASE_ADMIN_PASSWORD` | ✕ (선택) | 〃 — 관리자 화면에 쓰는 그 계정의 비밀번호 |

`SUPABASE_ADMIN_*` 에는 `NEXT_PUBLIC_` 접두어가 **없습니다.** 그래서 브라우저로 나가지 않고,
앱 코드도 읽지 않습니다 — `scripts/cms.mjs` 전용입니다.

확인 명령: `npm run notify:test` — 가짜 문의를 만들지 않고 알림만 시험 발송합니다.
콘텐츠 관리 명령: `npm run cms -- help` (F18).

**운영(Cloudflare) 환경변수는 들어가 있습니다** — 2026-07-26 확인
(`/admin/login` 이 "아직 연결 전입니다" 안내문이 아니라 로그인 폼을 그림 = 키가 읽힌다는 뜻).

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
| 🔴 사진 | **남은 자리: 실적 4자리 + 히어로 2 + 공정 5 + 사옥 전경 1.** 회사소개서에서 12장을 뽑아 넣어 실적 15자리 중 11자리·사업영역 4자리 전부가 채워졌습니다(2026-07-27). 급한 순서: ① **히어로 2·3 — 현장 촬영이 유일한 길입니다.** 네 개 PDF 를 전수 확인했고 1920px 이상은 스톡/합성 그래픽뿐, 자사 실사진 최대치는 1400×1050 ② 공장 공정 5칸(회사소개서엔 채널문자 제작 1장뿐) ③ 사옥·공장 전경 ④ 남은 실적 4건(교보생명·우리은행·KT탄방타워는 회사소개서에 4장이 한 띠로 합쳐져 435×276 밖에 안 나오고, 뉴코아는 사진 자체가 없음) | `public/images/README.md` |
| 🔴 개인정보 | **회사소개서 5·6페이지는 사업자등록증·여성기업확인서·옥외광고사업등록증·공장등록증명서 스캔입니다.** 사진을 더 뽑을 때 섞여 들어가지 않게 하세요 — 사업자등록번호·대표자 정보가 읽힙니다. 웹 게시 금지 | `public/images/README.md` |
| 🔴 등록 | **네이버 스마트플레이스·서치어드바이저 미등록.** 대전 지역 유입의 8할이 네이버입니다. 서치어드바이저를 하면 IndexNow 네이버 403 도 함께 풀립니다 | [`SEO.md`](SEO.md) C1·C3 |
| 🔴 등록 | **구글 비즈니스 프로필 미등록.** 검색 우측 지식 패널(로고·사진·영업시간 카드)은 홈페이지가 아니라 여기서 만들어집니다 | [`SEO.md`](SEO.md) C2 |
| ⚠️ 색인 | **구글 색인이 홈 1페이지뿐** (사이트맵 10개 중 1개). Search Console 에서 사이트맵 제출 + `/works` `/about` 색인 요청 | [`SEO.md`](SEO.md) C4 |
| 🔴 실행 | **`0004_works_brochure.sql` 미실행** — 돌리기 전에는 새 실적 2건(청주 아이파크·홈센터)이 안 보이고, 사진 없는 4건이 목록 중간에 회색 상자로 남습니다. 사진 파일은 이미 배포에 들어 있습니다. SQL Editor 에서 실행하세요 | §5 |
| ✅ 확인 | `0003_works_photos.sql` 은 **실행됐습니다** — 운영 홈이 `work-16`~`21` 을 앞에 그리는 것으로 확인(2026-07-27) | §5 |
| ⚠️ 확인 | **Supabase 깨우기 Actions 시크릿 등록 여부** — 저장소 Actions 탭에 초록 체크가 있는지. 7일 무요청이면 DB 가 멈추고 견적 문의 저장이 죽습니다 | `.github/workflows/keep-supabase-awake.yml` |
| ⚠️ 정리 | 운영 `/admin/quotes` 에 검증용 테스트 문의 2건(`[검증] 지워주세요`) 남아 있음 | [`DEPLOY.md`](DEPLOY.md) 3단계 |
| TODO | 견적 알림이 **꺼져 있습니다** — `RESEND_API_KEY` 를 넣어야 켜집니다. 안 넣으면 `/admin/quotes` 를 직접 봐야 새 문의를 압니다 | F16 · §6 |
| TODO | `config/site.ts` 남은 값: 옥외광고사업 등록번호 · 우편번호 · 운영시간 · 누적건수 · 카카오채널 · 지도 URL | `config/site.ts` |
| TODO | 네이버 소유확인 코드 미입력. (구글은 도메인 DNS TXT 방식으로 확인돼 `googleVerification` 은 비워 둬도 됩니다) | `config/site.ts` |
| TODO | `sameAs` 에 `blogUrl`·`kakaoChannelUrl` 이 비어 있음 — 채널이 생기면 넣으세요. 엔티티 연결이 한 겹 더 두꺼워집니다 | `config/site.ts` |
| ⚠️ SEO | `site.geo` 좌표가 대전 서구 근사값 — 로컬 검색의 "거리" 요인에 영향 | `config/site.ts` |
| ⚠️ 법률 | 개인정보처리방침 · 이용약관이 **초안 상태** | `app/privacy` `app/terms` |
| ⚠️ 법률 | **견적 알림을 켜면 개인정보 위탁 고지가 필요합니다** — 고객 이름·연락처가 Resend·슬랙 등 외부로 나갑니다. 처리방침 위탁 항목에 업체명·위탁업무를 적어야 합니다(개인정보보호법 제26조). 켜기 전에는 해당 없음 | `app/privacy` · F16 |
| ⚠️ 배포 | **Vercel Hobby 사용 금지** — 상업적 이용 위반이라 사전 통보 없이 중단될 수 있습니다 | [`DEPLOY.md`](DEPLOY.md) |

### 7.2 코드 부채

| 구분 | 내용 | 위치 |
|---|---|---|
| 미검증 | 관리자 CRUD 중 **삭제 · 순서변경(`moveSlide`/`moveWork`) 이 실동작 미확인**. 저장·사진업로드는 운영에서 끝까지 통하는 것을 확인했습니다 | F9 F10 |
| 미검증 | **F18 CLI 의 DB 작업이 실계정 미검증** — 로그인 실패 경로(잘못된 비밀번호 → 안내문)와 인자 파싱·분류 검사만 확인했습니다. `SUPABASE_ADMIN_*` 를 채운 뒤 `list` → `works add --draft` → `rm --yes` 순으로 한 바퀴 돌려 봐야 합니다 | F18 |
| 부채 | **관리자 비밀번호가 `.env.local` 에 평문** — F18 이 브라우저 없이 로그인하려면 필요합니다. git 제외지만 이 PC 를 쓰는 사람은 볼 수 있습니다. 화면 공유·녹화 시 주의 | F18 · §6 |
| 부채 | **방문마다 SSR + DB 조회** — ISR 을 걷어낸 대가(§2.1 주석). 홈 HTML 에 캐시가 없습니다(`no-store` 실측). 다만 홈 TTFB 0.78~1.58s 대 정적 `/about` 0.92s 로 체감 차이가 거의 없어 급하지 않습니다. 트래픽이 커지면 Cache Rules 또는 R2 로 ISR 을 되살리는 게 정석 | `app/page.tsx` `app/works/page.tsx` |
| 부채 | 견적 폼 레이트리밋이 **인메모리** — 서버리스라 인스턴스마다 따로 세므로 사실상 헐거움 | F5 |
| 부채 | 관리자에서 사진 교체 시 **이전 파일이 스토리지에 남음** (고아 파일) | F10 |
| 부채 | `sort_order` 가 같으면 순서 변경이 동작하지 않음. **관리자 화면은 여전히 그렇습니다** — 걸리면 `npm run cms -- works renumber` 로 풉니다 (F18) | F9 |
| 부채 | 로고 SVG 가 저해상도 래스터 트레이싱본. 대형 출력엔 원본 AI/EPS 필요 | `public/logo.svg` |
| 미도입 | **시공사례 개별 페이지** — 로컬 SEO 최대 자산이나, 지금 데이터로 만들면 "얇은 콘텐츠" 페널티. 사례별 상세(위치·간판종류·기간·자재·현장 메모) 확보가 선행 | [`SEO.md`](SEO.md) B-1 |
| 미도입 | 사업영역·공정·장비·회사정보는 아직 CMS 미연결 (코드 수정 필요) | `config/content.ts` |

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
