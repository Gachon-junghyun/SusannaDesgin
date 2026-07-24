<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# 구조 지도를 항상 최신으로 유지할 것

이 저장소에는 [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) 라는 **구조 지도**가 있습니다.
루트 → 페이지(P번호) → 기능(F번호) 트리로 전체를 서술하고, 설계 원칙(A1~A6)과
미완료 부채를 추적합니다. 인수인계와 대규모 개편의 기준 문서입니다.

## 작업 시작 전

1. **`docs/ARCHITECTURE.md` 를 먼저 읽습니다.** §0 설계 원칙과, 손댈 영역의 §2·§3 항목.
2. 고칠 대상이 이미 문서에 있는지 확인합니다. 없으면 문서가 낡은 것이니 먼저 맞춥니다.

## 작업이 끝난 뒤 — 두 가지를 반드시 합니다

### 1) 문서 갱신

`docs/ARCHITECTURE.md` §9 의 표에 따라 해당 절을 고치고, 맨 위 **최종 갱신** 날짜를 바꿉니다.

| 변경 유형 | 갱신할 곳 |
|---|---|
| 페이지 추가·삭제 | §1 트리 · §2 표 · `app/sitemap.ts` |
| 기능 추가·변경 | §3 에 `F번호` 신설/수정 · §4 데이터 흐름도 |
| DB 스키마 변경 | §5 · 새 마이그레이션 파일 · `lib/supabase/types.ts` |
| 환경변수 추가 | §6 · `.env.local.example` · `README.md` |
| 부채 해소·발생 | §7 표 |

운영자가 알아야 할 변화(설정 절차, 사용법)는 `README.md` 도 함께 고칩니다.

### 2) 적합성 판단 — 결과를 사용자에게 보고

변경이 기존 구조와 맞는지 **스스로 점검하고, 판단 결과를 말로 보고**합니다.
문서만 고치고 넘어가지 않습니다.

점검 항목:

- [ ] **설계 원칙 위반이 없는가** (§0 의 A1~A6)
  - A1 Supabase 없이도 공개 페이지가 렌더되는가
  - A2 새 서버 액션에 `requireAdmin()`, 새 테이블에 RLS 정책이 있는가
  - A3 공개 페이지에서 `cookies()`/`headers()` 를 새로 부르지 않았는가
  - A4 `/admin/*` 이 빌드 결과에서 `ƒ`(동적)로 남아 있는가
  - A5 회사 정보·문구가 `config/` 밖으로 새지 않았는가
  - A6 사진 경로가 자동 교체 규칙을 지키는가
- [ ] **중복이 생기지 않았는가** — 같은 값·같은 로직이 두 곳에 있으면 합칩니다
- [ ] **기존 기능을 깨지 않았는가** — `npm run lint`, `npm run build`,
      그리고 영향 범위에 해당하는 회귀 테스트(스크롤 10건 / 폼 12건)
- [ ] **새 부채가 생겼는가** — 생겼다면 숨기지 말고 §7 에 적습니다

**원칙과 충돌하는 변경을 요청받았다면**, 조용히 따르지 말고 어떤 원칙과 왜 부딪히는지
먼저 알립니다. 사용자가 그대로 진행하겠다고 하면 진행하되, §0 에 예외로 명시하거나
원칙 자체를 고칩니다. 문서와 코드가 어긋난 채로 두지 않습니다.

## 보고 형식

작업 마무리에 이 정도로 짧게 남깁니다.

```
적합성: 통과 (A1~A6 위반 없음)
갱신: docs/ARCHITECTURE.md §3 F13 추가, §7 부채 1건 해소
검증: lint·build 통과 / 폼 회귀 12건 통과
```

문제가 있으면 통과로 적지 않고 무엇이 걸리는지 씁니다.
