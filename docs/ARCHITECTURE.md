# 수산나디자인 홈페이지 — 구조 지도

> **이 문서의 목적**
> 코드를 처음 받는 사람이 30분 안에 전체 구조를 파악하고, 어디를 고치면 어디가
> 영향받는지 알 수 있게 하는 것. 대공사(리뉴얼·기능 추가) 전에 여기부터 읽습니다.
>
> **⚠️ 코드를 고치면 이 문서도 같이 고칩니다.** 규칙은 [`AGENTS.md`](../AGENTS.md) 참조.

| | |
|---|---|
| 최종 갱신 | 2026-07-24 (SEO 적용) |
| 스택 | Next.js 16.2.11 (App Router, Turbopack) · React 19.2.4 · TypeScript 5 · Tailwind CSS v4 |
| 백엔드 | Supabase (Postgres + Auth + Storage) — **선택적**. 없어도 사이트는 동작 |
| 렌더링 | 공개 페이지 정적(ISR) · 관리자 화면 동적 |
| 배포 | 미정 (Vercel 가정) |

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
├── reference/              ← 레퍼런스 조사 자료 (SPEC.md + 캡처)
│
├── proxy.ts                ← 구 middleware.ts. /admin 세션·접근제어
├── next.config.ts          ← 이미지 원격 호스트 허용
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
| **P1** | `/` | `app/page.tsx` | 정적 + ISR 600s | **CMS** `getSlides()` `getWorks()` + `config/content.ts` |
| **P2** | `/about` | `app/about/page.tsx` | 정적 | `config/site.ts` `content.ts` |
| **P3** | `/signs` | `app/signs/page.tsx` | 정적 | `content.signTypes` |
| **P4** | `/works` | `app/works/page.tsx` | 정적 + ISR 600s | **CMS** `getWorks()` |
| **P5** | `/process` | `app/process/page.tsx` | 정적 | `content.steps` + 페이지 내 `detail` |
| **P6** | `/support` | `app/support/page.tsx` | 정적 | `config/site.ts` (FAQ·오시는길) |
| **P7** | `/quote` | `app/quote/page.tsx` | 정적 | `content.ts` 선택지 |
| **P8** | `/privacy` `/terms` `/no-email-collect` | 각 `page.tsx` | 정적 | 하드코딩 ⚠️법률 검토 필요 |
| — | `/robots.txt` `/sitemap.xml` | `app/robots.ts` `sitemap.ts` | 정적 | `config/site.ts` |
| — | `/rss.xml` | `app/rss.xml/route.ts` | ISR 600s | **CMS** `getWorks()` — 네이버 서치어드바이저 제출용 |
| — | 404 | `app/not-found.tsx` | 정적 | — |

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
├── 허니팟 company_website → 조용히 200
├── IP 레이트리밋 10분 5회 (인메모리)
├── 서버 재검증 (클라이언트 우회 시 400)
└── data/quotes.jsonl append   ⚠️TODO: 이메일·알림톡·시트·슬랙
```
- 회귀 테스트 12건 (`formtest.mjs`)

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
**왜 쿠키를 안 쓰나**: 서버 컴포넌트에서 `cookies()` 를 부르면 그 페이지는
요청마다 새로 그려집니다. 공개 콘텐츠는 로그인과 무관하므로 익명으로 읽고
정적 유지 → 관리자가 저장할 때 `revalidatePath` 로 갱신하는 편이 훨씬 빠릅니다.

### F8. 인증 · 권한
```
proxy.ts                     matcher: ["/admin/:path*"] 만
├── Supabase 세션 토큰 갱신 (서버 컴포넌트는 쿠키를 못 써서 여기서만 가능)
├── 비로그인 + /admin → /admin/login?next=...
└── 로그인 + /admin/login → /admin
    ※ 전체 경로에 걸지 않음 — 방문자마다 인증서버 왕복이 생겨 공개 페이지가 느려짐

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

components/JsonLd.tsx           구조화 데이터 삽입 공통
components/Section.tsx PageHero  path prop → BreadcrumbList 자동 생성
app/support/page.tsx            FAQPage (화면의 faqs 배열 그대로)

app/robots.ts    disallow: /api/ · /admin
app/sitemap.ts   /admin 제외
app/rss.xml/     RSS — 네이버 서치어드바이저 제출용 (시공사례 자동 반영)
app/icon.png · apple-icon.png
```
실행 지침과 운영자 할 일은 [`SEO.md`](SEO.md) 참조.

### F12. 접근성
스킵 링크 · `aria-current` · `aria-invalid` + `role="alert"` · label 연결 ·
`prefers-reduced-motion` 전면 대응 · 필터 `role="tablist"` · `aria-live` 건수 안내

---

## 4. 데이터 흐름

```
[공개 방문자]
  브라우저 → 정적 HTML (ISR 600s)
              └ 빌드/재생성 시 lib/cms.ts
                   ├─ Supabase 연결됨 → hero_slides · works  (RLS: published=true)
                   └─ 실패/미설정      → config/content.ts    [A1 폴백]

[관리자]
  브라우저 → proxy.ts (세션 갱신·차단)
           → /admin/* page.tsx → requireAdmin()
           → 서버액션 → requireAdmin() 재확인 → Supabase (RLS 재검증)
                      → revalidatePath("/", "/works")
                      → 공개 페이지 즉시 재생성

[사진 업로드]
  브라우저 → Supabase Storage 직접 (서버 경유 안 함)
           → 공개 URL → 폼 → DB image_url
```

---

## 5. 데이터베이스

`supabase/migrations/0001_init.sql` — SQL Editor 에 붙여넣고 실행. 재실행 안전.

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

`SUPABASE_SERVICE_ROLE_KEY` 는 **의도적으로 사용하지 않습니다.**

설정 절차는 [`SUPABASE-SETUP.md`](SUPABASE-SETUP.md), 진단은 `npm run supabase:check`.
`.env.local` 은 서버 시작 시 한 번만 읽히므로 값 변경 후 **재시작 필수**입니다.

---

## 7. 미완료 · 부채

| 구분 | 내용 | 위치 |
|---|---|---|
| ⚠️ 미검증 | **로그인 후 CRUD(저장·삭제·순서변경·사진업로드) 미확인.** 아래는 실DB 검증 완료(2026-07-24): 접속·공개읽기(DB에서 읽는 것 확인)·RLS 8종 차단·스토리지 공개읽기·`next/image` 호스트 허용. 남은 건 관리자 세션이 필요한 경로뿐 | F9 |
| TODO | 견적 문의 **실시간 알림**(이메일·알림톡) 미연결 — DB 저장은 되므로 `/admin/quotes` 를 주기적으로 봐야 함 | `app/api/quote/route.ts` |
| TODO | 레이트리밋이 인메모리 — 서버리스에서 인스턴스마다 따로 세므로 사실상 헐거움 | 〃 |
| ⚠️ 배포 | `0002_quotes.sql` 미실행 시 **견적 문의 유실**. 배포 전 필수 | [`DEPLOY.md`](DEPLOY.md) 0단계 |
| TODO | 사업자등록번호 · 옥외광고사업 등록번호 · 도메인 · 우편번호 · 운영시간 · 누적건수 | `config/site.ts` |
| ⚠️ 배포 | 도메인은 `https://susannadesign.co.kr` (**www 없음**) 확정. 배포 시 **www → 비www 301 리다이렉트 필수** — 안 하면 중복 콘텐츠로 평가가 쪼개짐 | 호스팅 설정 |
| ⚠️ SEO | `site.geo` 좌표가 대전 서구 근사값 — 로컬팩 "거리" 요인에 영향 | `config/site.ts` |
| TODO | 네이버·구글 사이트 소유확인 코드 미입력 (슬롯만 준비됨) | 〃 |
| 미도입 | **시공사례 개별 페이지 미구현** — 로컬 SEO 최대 자산이나, 현재 데이터로 만들면 "얇은 콘텐츠" 페널티. 사례별 상세 내용 확보가 선행 | [`SEO.md`](SEO.md) B-1 |
| TODO | 사진 약 30장 미투입 (플레이스홀더 표시 중) | `public/images/` |
| ⚠️ 법률 | 개인정보처리방침 · 이용약관 초안 상태 | `app/privacy` `app/terms` |
| 부채 | 로고 SVG 가 저해상도 래스터 트레이싱본. 대형 출력엔 원본 AI/EPS 필요 | `public/logo.svg` |
| 부채 | 관리자에서 사진 교체 시 **이전 파일이 스토리지에 남음** (고아 파일) | F10 |
| 부채 | `sort_order` 가 같으면 순서 변경이 동작하지 않음 | F9 |
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
