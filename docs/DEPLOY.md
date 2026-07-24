# 서버에 올리기 (배포)

> 지금까지는 대표님 컴퓨터에서만 볼 수 있었습니다. 이걸 인터넷에 올려 누구나
> 접속할 수 있게 하는 과정입니다. 30분쯤 걸립니다.
>
> **Vercel** 을 씁니다. Next.js 를 만든 회사가 운영하는 서비스라 설정이 가장 적고,
> 이 규모에서는 **무료**입니다. (카페24·가비아 같은 일반 웹호스팅은 이 사이트를
> 돌릴 수 없습니다. PHP 용이라 구조가 다릅니다.)

---

## 순서 요약

| 단계 | 하는 일 | 소요 |
|---|---|---|
| 0 | 견적 문의 테이블 만들기 ★ | 2분 |
| 1 | GitHub 에 코드 올리기 | 10분 |
| 2 | Vercel 연결 + 환경변수 | 10분 |
| 3 | 배포 확인 | 5분 |
| 4 | (나중에) 도메인 연결 | 10분 |

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

## 2단계 — Vercel 연결

### 2-1. 프로젝트 가져오기

1. [vercel.com](https://vercel.com) → **Sign Up** → **Continue with GitHub**
2. **Add New...** → **Project**
3. 방금 만든 `susanna-design` 저장소 옆 **Import**

프레임워크는 Next.js 로 자동 인식됩니다. **아무것도 바꾸지 마세요.**

### 2-2. 환경변수 넣기 ★

**Deploy 를 누르기 전에** `Environment Variables` 를 펼치고 아래 두 개를 넣습니다.
`.env.local` 파일에 있는 값과 **똑같이** 넣으면 됩니다.

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGci...` (긴 문자열) |

> 이걸 빠뜨리면 관리자 화면이 안 열리고 견적 문의도 저장되지 않습니다.
> 나중에 추가해도 되지만, 그때는 **재배포**를 해야 반영됩니다.

### 2-3. 배포

**Deploy** 클릭 → 2~3분 기다리면 끝입니다.

`susanna-design-xxxx.vercel.app` 같은 **임시 주소**가 나옵니다.
이 주소로 전 세계 어디서나 접속됩니다.

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

## 4단계 — 도메인 연결 (도메인 구매 후)

### 4-1. 도메인 구매

`susannadesign.co.kr` 을 [가비아](https://www.gabia.com) · [후이즈](https://whois.co.kr) ·
[아사달](https://www.asadal.com) 등에서 구매합니다. `.co.kr` 은 연 **1~2만원**대입니다.

> 사업자등록증이 필요할 수 있습니다(`.co.kr` 은 사업자용 도메인입니다).

### 4-2. Vercel 에 등록

1. Vercel 프로젝트 → **Settings** → **Domains**
2. `susannadesign.co.kr` 입력 → **Add**
3. `www.susannadesign.co.kr` 도 입력 → **Add**
4. **`susannadesign.co.kr` 을 Primary 로 지정** ★
   → www 로 들어와도 자동으로 이쪽으로 넘어갑니다

> **왜 중요한가**: 두 주소가 모두 열리면 검색엔진이 서로 다른 사이트로 보고
> 평가를 반으로 쪼갭니다. Primary 지정이 이걸 막아 줍니다.

### 4-3. DNS 설정

Vercel 이 화면에 알려주는 값을 도메인 산 곳(가비아 등)의 **DNS 관리** 화면에 넣습니다.
보통 이런 형태입니다.

| 종류 | 호스트 | 값 |
|---|---|---|
| A | `@` | `76.76.21.21` |
| CNAME | `www` | `cname.vercel-dns.com` |

> 실제 값은 **Vercel 화면에 표시된 것**을 쓰세요. 위는 예시입니다.
> 반영에 10분~수 시간 걸립니다.

### 4-4. 환경변수 정리

도메인이 붙으면 Vercel → Settings → Environment Variables 에서 확인:

- `NEXT_PUBLIC_SITE_URL` 이 있다면 **삭제**하거나 `https://susannadesign.co.kr` 로 설정

그 뒤 **Deployments → 맨 위 항목 → Redeploy**.

이러면 검색 차단이 풀리고 sitemap·canonical 이 진짜 도메인으로 바뀝니다.

### 4-5. 검색엔진 등록

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

| 항목 | 비용 |
|---|---|
| Vercel | 무료 (이 규모에서는 넉넉합니다) |
| Supabase | 무료 (저장공간 1GB, 파일 5GB) |
| 도메인 | 연 1~2만원 |

Supabase 무료 플랜은 **일주일간 아무 접속이 없으면 자동으로 멈춥니다.**
실제로 운영되는 홈페이지라면 방문자가 있으니 문제되지 않지만, 한동안 방치했다면
대시보드에서 **Restore project** 를 눌러 되살려야 합니다.

---

## 막힐 때

| 증상 | 확인할 것 |
|---|---|
| 배포는 됐는데 관리자 화면이 "아직 연결 전입니다" | Vercel 환경변수 2개를 넣었는지. 넣은 뒤 **Redeploy** 필요 |
| 견적 문의가 `/admin/quotes` 에 안 뜸 | 0단계 SQL 을 실행했는지 (`npm run supabase:check`) |
| 사진이 깨져 보임 | Supabase 프로젝트가 멈췄는지 (Restore project) |
| 도메인을 연결했는데 안 열림 | DNS 반영 대기(최대 수 시간). Vercel Domains 화면에 초록 체크가 뜨면 완료 |
| 빌드 실패 | Vercel 배포 로그의 빨간 줄을 그대로 알려주세요 |
