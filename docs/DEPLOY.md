# 서버에 올리기 (배포)

> 지금까지는 대표님 컴퓨터에서만 볼 수 있었습니다. 이걸 인터넷에 올려 누구나
> 접속할 수 있게 하는 과정입니다. 30분쯤 걸립니다.
>
> 카페24·가비아 같은 일반 웹호스팅은 이 사이트를 돌릴 수 없습니다(PHP 용이라 구조가 다름).
> 아래 세 곳 중 하나를 씁니다.

## 어디에 올릴까 — Vercel 무료는 쓸 수 없습니다 ★

**수산나디자인 홈페이지는 Vercel 무료(Hobby) 플랜을 쓰면 약관 위반입니다.**

Vercel 공식 문서 [Fair Use Guidelines](https://vercel.com/docs/limits/fair-use-guidelines) 원문:

> Hobby teams are restricted to **non-commercial personal use only**.
> 상업적 사용의 예: **Advertising the sale of a product or service**

간판 제작·시공을 알리고 견적 문의를 받는 사이트는 정확히 여기 해당합니다.
결제 기능이나 광고가 없어도 상관없습니다. Vercel 은 위반 시 **사전 통보 없이
프로젝트를 중단할 수 있다**고 명시하고 있어, 회사 홈페이지가 어느 날 갑자기
사라질 수 있습니다.

### 선택지

| | 상업적 이용 | 비용 | 한도 | 소진되면 |
|---|---|---|---|---|
| **Cloudflare Workers** | ✅ 허용 | **0원** | 하루 10만 요청 · **대역폭 무제한** | 넉넉해서 사실상 안 닿음 |
| Netlify 무료 | ✅ 허용 | 0원 | 월 300크레딧 (배포 1회 = 15) | ⚠️ **사이트가 오프라인** 될 수 있음 |
| Vercel Pro | ✅ | 연 ~35만원 | 넉넉 | — |
| ~~Vercel Hobby~~ | ❌ **위반** | — | — | 통보 없이 중단 |

**Cloudflare Workers 를 권합니다.**

Netlify 는 2026년부터 크레딧제로 바뀌었는데, **배포 1회에 15크레딧**이라
초기에 고쳐가며 20번만 배포해도 월 한도 300이 소진됩니다. 그러면 공식 문서상
*"사이트가 오프라인이 될 수 있다"* 고 되어 있어, 회사 홈페이지에는 위험합니다.

Cloudflare 는 하루 10만 요청에 **대역폭 과금이 아예 없습니다.** 지역 간판업체
홈페이지가 닿을 수 있는 규모가 아닙니다.

> **예전에 Cloudflare 를 뺐던 이유는 해결했습니다.**
> 관리자 세션 갱신을 `proxy.ts`(구 middleware)에서 하고 있었는데, 이게
> Cloudflare 미지원이라 걸림돌이었습니다. 갱신을 브라우저 쪽으로 옮기고
> `proxy.ts` 를 없앴습니다(`components/admin/SessionKeeper.tsx`).
> 그 결과 **어느 호스팅에서든 돌아갑니다** — 나중에 옮기고 싶어도 자유롭습니다.

> **돈을 조금 써도 편한 게 낫다면** Vercel Pro 가 가장 매끄럽습니다.
> 연 35만원은 국내 웹에이전시 유지보수 계약(보통 월 5~15만원)보다 쌉니다.
> 아래 안내는 Cloudflare 기준입니다.

---

## 순서 요약

| 단계 | 하는 일 | 소요 |
|---|---|---|
| 0 | 견적 문의 테이블 만들기 ★ | 2분 |
| 1 | GitHub 에 코드 올리기 | 10분 |
| 2 | Cloudflare 연결 + 환경변수 | 10분 |
| 3 | 배포 확인 | 5분 |
| 4 | Supabase 정지 방지 켜기 | 3분 |
| 5 | (나중에) 도메인 연결 | 10분 |

---

## 0단계 — 견적 문의 테이블 ★ 건너뛰지 마세요

**이걸 안 하면 배포 후 견적 문의가 전부 사라집니다.**

서버(Vercel)에서는 파일을 저장할 수 없습니다. 지금까지는 대표님 컴퓨터의
`data/quotes.jsonl` 파일에 쌓였지만, 인터넷 서버에서는 그게 안 됩니다.
그러면 **고객은 "접수 완료"를 보는데 회사는 아무것도 못 받는** 상황이 됩니다.

Supabase 대시보드 → **SQL Editor** → [`supabase/migrations/0002_quotes.sql`](../supabase/migrations/0002_quotes.sql)
전체 복사해서 붙여넣고 **Run**.

확인:

```bash
npm run supabase:check
```

`테이블 'quotes'` 가 초록색 ✔ 이어야 합니다.

---

## 1단계 — GitHub 에 코드 올리기

Vercel 은 GitHub 에 있는 코드를 가져다 배포합니다. 앞으로 코드를 고칠 때마다
**자동으로 다시 배포**되므로, 한 번만 연결해두면 됩니다.

### 1-1. 저장소 만들기

[github.com/new](https://github.com/new) 에서:

| 항목 | 값 |
|---|---|
| Repository name | `susanna-design` |
| 공개 범위 | **Private** (비공개) ← 권장 |
| 나머지 | 아무것도 체크하지 마세요 (README·gitignore 등) |

**Create repository** 를 누르면 나오는 주소를 복사합니다.
(`https://github.com/사용자이름/susanna-design.git` 형태)

> **Private 을 권하는 이유**: 코드 자체에 비밀번호는 없지만(키는 `.env.local` 에
> 있고 이 파일은 올라가지 않습니다), 회사 홈페이지 코드를 굳이 공개할 이유도 없습니다.
> Private 이어도 Vercel 무료 배포는 됩니다.

### 1-2. 코드 올리기

프로젝트 폴더에서 아래를 실행합니다. `사용자이름` 부분만 본인 것으로 바꾸세요.

```bash
git remote add origin https://github.com/사용자이름/susanna-design.git
```

```bash
git push -u origin master
```

로그인 창이 뜨면 GitHub 계정으로 로그인합니다.

> **비밀번호를 물어보면**: GitHub 은 계정 비밀번호 대신 토큰을 요구합니다.
> 창이 안 뜨고 막히면 [GitHub Desktop](https://desktop.github.com/) 을 설치해
> 그래픽 화면으로 올리는 쪽이 훨씬 쉽습니다.

---

## 2단계 — Cloudflare 연결

Cloudflare 에서 돌리는 데 필요한 설정 파일(`wrangler.jsonc`, `open-next.config.ts`)은
이미 넣어 뒀고, **빌드가 통과하는 것까지 확인했습니다**
(용량 1.45 MiB / 무료 한도 3 MiB — 절반 정도).

### 2-1. 프로젝트 가져오기

1. [dash.cloudflare.com](https://dash.cloudflare.com) → 가입 (무료)
2. 왼쪽 메뉴 **Workers & Pages** → **Create** → **Workers** 탭 → **Import a repository**
3. GitHub 연결 → `susanna-design` 저장소 선택

빌드 설정을 아래와 같이 지정합니다.

| 항목 | 값 |
|---|---|
| Build command | `npm run cf:build` |
| Deploy command | `npx wrangler deploy` |

### 2-2. 환경변수 넣기 ★

**Settings → Variables and Secrets** 에서 아래 두 개를 넣습니다.
`.env.local` 파일에 있는 값과 **똑같이** 넣으면 됩니다.

| 이름 | 값 | 종류 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxxx.supabase.co` | Text |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGci...` (긴 문자열) | Text |

> **빌드 시점에도 필요한 값**이라 Secret 이 아니라 Text(플레인)로 넣습니다.
> 어차피 브라우저에 노출되는 게 정상인 키이고, 실제 권한은 DB 의 RLS 가 판단합니다.
>
> 이걸 빠뜨리면 관리자 화면이 안 열리고 견적 문의도 저장되지 않습니다.
> 나중에 추가하면 **재배포**를 해야 반영됩니다.

### 2-3. 배포

**Deploy** 클릭 → 3~5분 기다리면 끝입니다.

`susanna-design.<계정이름>.workers.dev` 같은 **임시 주소**가 나옵니다.
이 주소로 전 세계 어디서나 접속됩니다.

> **로컬에서 미리 확인하고 싶으면**: `npm run cf:preview`
> (Windows 에서는 OpenNext 가 경고를 띄웁니다. 실제 배포는 Cloudflare 서버(리눅스)에서
> 돌기 때문에 문제되지 않지만, 로컬 미리보기가 이상하면 WSL 을 쓰세요.)

> **임시 주소는 검색에 안 잡히게 막아 뒀습니다.** 임시 주소가 구글에 등록되면
> 나중에 진짜 도메인과 서로 순위를 깎아먹기 때문입니다. 도메인을 연결하면
> 자동으로 풀립니다(4단계).

---

## 3단계 — 배포 확인

임시 주소로 들어가 아래를 확인합니다.

- [ ] 홈페이지가 뜨는가
- [ ] 사진이 보이는가 (관리자에서 올린 사진 포함)
- [ ] **견적 문의를 실제로 넣어보고**, `임시주소/admin/quotes` 에 뜨는가 ★
- [ ] `임시주소/admin` 로그인이 되는가
- [ ] 휴대폰으로도 열어보기

**견적 문의 테스트는 꼭 하세요.** 이게 안 되면 일감이 새는 겁니다.

---

## 4단계 — Supabase 정지 방지 켜기

무료 Supabase 는 **7일간 요청이 하나도 없으면 자동으로 멈춥니다.**
멈추면 관리자 화면과 견적 문의 저장이 죽습니다. 방문자가 꾸준하면 안 멈추지만,
개업 초기나 비수기에는 며칠씩 비는 일이 실제로 생깁니다.

사흘에 한 번 자동으로 깨우는 장치를 넣어 뒀습니다
([`.github/workflows/keep-supabase-awake.yml`](../.github/workflows/keep-supabase-awake.yml)).
켜려면 열쇠만 등록하면 됩니다.

1. GitHub 저장소 → **Settings** → **Secrets and variables** → **Actions**
2. **New repository secret** 으로 두 개 등록 (`.env.local` 값과 동일):

   | Name | Secret |
   |---|---|
   | `SUPABASE_URL` | `https://xxxxx.supabase.co` |
   | `SUPABASE_ANON_KEY` | `eyJhbGci...` |

3. **Actions** 탭 → **Supabase 깨어 있게 유지** → **Run workflow** 로 한 번 눌러 확인
   → 초록 체크가 뜨면 됩니다.

---

## 5단계 — 도메인 연결 (도메인 구매 후)

### 5-1. 도메인 구매

`susannadesign.co.kr` 을 [가비아](https://www.gabia.com) · [후이즈](https://whois.co.kr) ·
[아사달](https://www.asadal.com) 등에서 구매합니다. `.co.kr` 은 연 **1~2만원**대입니다.

> 사업자등록증이 필요합니다(`.co.kr` 은 국내 사업자용 도메인입니다).
> 이 때문에 Cloudflare 같은 해외 등록기관에서는 살 수 없고, 국내 업체를 써야 합니다.
> `.com` 을 쓴다면 [Cloudflare Registrar](https://domains.cloudflare.com) 가 원가 판매라
> 가장 쌉니다(갱신 시 가격이 뛰지 않음). 다만 국내 고객 대상이라면 `.co.kr` 이
> 신뢰 신호로는 낫습니다.

### 5-2. Cloudflare 에 도메인 추가

Cloudflare 는 DNS 도 같이 관리하는 게 가장 간단합니다.

1. Cloudflare 대시보드 → **Add a domain** → `susannadesign.co.kr` 입력
2. Cloudflare 가 알려주는 **네임서버 2개**를 도메인 산 곳(가비아 등)의
   **네임서버 변경** 화면에 넣습니다
3. 반영되면(보통 몇 분~수 시간) Cloudflare 가 DNS 를 관리합니다

### 5-3. Worker 에 도메인 연결

1. **Workers & Pages** → `susanna-design` → **Settings** → **Domains & Routes**
2. **Add** → **Custom domain** → `susannadesign.co.kr`
3. `www.susannadesign.co.kr` 도 추가

**www 를 비 www 로 넘기기** — DNS 화면에서 규칙 하나를 추가합니다.

**Rules** → **Redirect Rules** → **Create rule**

| 항목 | 값 |
|---|---|
| 조건 | Hostname equals `www.susannadesign.co.kr` |
| 동작 | Dynamic redirect → `concat("https://susannadesign.co.kr", http.request.uri.path)` |
| 상태 코드 | **301** (영구 이동) |

> **왜 중요한가**: 두 주소가 모두 열리면 검색엔진이 서로 다른 사이트로 보고
> 평가를 반으로 쪼갭니다. HTTPS 인증서는 자동 발급됩니다.

### 5-4. 환경변수 정리

도메인이 붙으면 **Settings → Variables** 확인:

- `NEXT_PUBLIC_SITE_URL` 이 있다면 **삭제**하거나 `https://susannadesign.co.kr` 로 설정

그 뒤 **Deployments → 맨 위 → Retry deployment**.

이러면 검색 차단이 풀리고 sitemap·canonical 이 진짜 도메인으로 바뀝니다.

### 5-5. 검색엔진 등록

이제 [`SEO.md`](SEO.md) 의 **C 섹션**을 진행합니다.
네이버 서치어드바이저·구글 Search Console 소유확인 코드가 나오면
`config/site.ts` 의 `naverVerification` · `googleVerification` 에 넣고 다시 배포합니다.

---

## 앞으로 수정하는 법

코드를 고친 뒤:

```bash
git add -A
```

```bash
git commit -m "수정 내용 한 줄"
```

```bash
git push
```

푸시하면 Vercel 이 **자동으로 다시 배포**합니다. 2~3분이면 반영됩니다.

> **사진·실적 수정은 배포가 필요 없습니다.** `/admin` 에서 바꾸면 즉시 반영됩니다.
> 배포가 필요한 건 코드나 회사 정보(`config/`)를 고쳤을 때뿐입니다.

---

## 비용

| 항목 | 비용 | 한도 |
|---|---|---|
| Cloudflare Workers | 무료 | 하루 10만 요청 · 대역폭 무제한 |
| Supabase | 무료 | DB 500MB · 파일 1GB |
| 도메인 `.co.kr` | 연 1~2만원 | — |
| **합계** | **연 1~2만원** | |

지역 간판업체 홈페이지가 하루 10만 요청에 닿을 일은 없습니다.
(방문자 1명이 대략 20~40 요청이니, 하루 2,500명까지 무료입니다.)

Vercel Pro 를 쓰신다면 여기에 연 35만원(월 $20)이 추가됩니다.

Supabase 가 멈춰도 **공개 홈페이지는 계속 보입니다**(코드 안의 기본 내용으로 대체).
다만 관리자 화면과 견적 문의 저장이 죽으므로, 4단계의 자동 깨우기를 꼭 켜세요.
이미 멈췄다면 대시보드에서 **Restore project** 를 누르면 됩니다.

---

## 막힐 때

| 증상 | 확인할 것 |
|---|---|
| 배포는 됐는데 관리자 화면이 "아직 연결 전입니다" | 환경변수 2개를 넣었는지. 넣은 뒤 **재배포** 필요 |
| 견적 문의가 `/admin/quotes` 에 안 뜸 | 0단계 SQL 을 실행했는지 (`npm run supabase:check`) |
| `/admin` 이 로그인 화면으로 안 넘어감 | `proxy.ts` 미지원 플랫폼일 수 있습니다. **보안 문제는 아닙니다** — 각 화면의 `requireAdmin()` 과 DB RLS 가 여전히 막습니다. 로그인 화면으로 자동 이동만 안 되는 것 |
| 사진이 깨져 보임 | Supabase 프로젝트가 멈췄는지 (Restore project) |
| 도메인을 연결했는데 안 열림 | DNS 반영 대기(최대 수 시간). 배포처 도메인 화면에 초록 체크가 뜨면 완료 |
| 빌드 실패 | 배포 로그의 빨간 줄을 그대로 알려주세요 |
