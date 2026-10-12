-- 0019_quote_source.sql — 견적 문의에 «접수 경로» 두 칸 추가 (F33, 2026-10-12)
--
-- 무엇: `quotes` 에 `source`·`agent` 두 칸을 붙입니다. 표를 새로 만들지 않습니다 —
--       AI 가 넣은 문의도 같은 견적함·같은 알림·같은 «확인함» 흐름을 타야 해서입니다.
--
-- 왜:   2026-10-12 사람 결정. 손님이 ChatGPT·Claude·Gemini 같은 AI 비서와 대화하다
--       «수산나에 대신 문의 넣어 줘» 하면 그 AI 가 `/agent/quote` 로 문의를 넣게 했습니다.
--       그리고 폼의 숨은 칸(`company_website`)이 채워져 오면 예전엔 **조용히 버렸는데**,
--       손님 대신 폼을 채우는 AI 가 그 칸까지 채우면 손님은 «접수 완료»를 보고 회사는
--       아무것도 못 받습니다. 그래서 버리지 않고 분류해 저장합니다.
--
-- 칸의 뜻:
--   source = ''      사람이 홈페이지 폼으로 넣은 것 (기본)
--            'agent' AI 비서가 `/agent/quote` 로 넣은 것
--            'trap'  숨은 칸이 채워진 채 온 것 — 자동 입력 의심(AI 비서이거나 스팸)
--   agent  = AI 가 스스로 밝힌 이름(예: 'ChatGPT'). 🔴 **검증된 값이 아닙니다.**
--
-- ⚠️ **안 돌려도 문의는 안 잃습니다.** `lib/quote-store.ts` 가 이 칸이 없는 DB 를 만나면
--    그 칸만 빼고 다시 넣고, 접수 경로를 문의 내용 맨 앞에 «[AI 경유 (ChatGPT)]»처럼 적습니다
--    (로그에 크게 남깁니다). 알림 메일에는 그때도 경로가 나갑니다.
--
-- 권한: 바꾸지 않습니다. 익명은 여전히 INSERT 만(0002), 읽기는 관리자만.
--
-- 실행: Supabase 대시보드 → SQL Editor → 붙여넣고 RUN
-- 여러 번 실행해도 안전합니다.

alter table public.quotes
  add column if not exists source text not null default '';

alter table public.quotes
  add column if not exists agent text not null default '';
