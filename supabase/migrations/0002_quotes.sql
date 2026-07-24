-- =============================================================
--  견적 문의 보관
--
--  왜 필요한가:
--    배포 환경(서버리스)에서는 서버에 파일을 쓸 수 없습니다.
--    기존에는 data/quotes.jsonl 에 적었는데, 실제 서버에 올리면 이게 실패하고
--    **고객은 "접수 완료"를 보는데 회사는 문의를 못 받는** 상황이 됩니다.
--    그래서 DB 에 남깁니다.
--
--  실행: Supabase 대시보드 → SQL Editor → 붙여넣고 RUN
--  여러 번 실행해도 안전합니다.
-- =============================================================

create table if not exists public.quotes (
  id            uuid primary key default gen_random_uuid(),
  kind          text not null default 'full',      -- 'quick'(간편) | 'full'(전체)
  name          text not null default '',
  phone         text not null default '',
  email         text not null default '',
  zip           text not null default '',
  address       text not null default '',
  address_detail text not null default '',
  region        text not null default '',
  floor         text not null default '',
  sign_type     text not null default '',
  timing        text not null default '',
  message       text not null default '',
  files         jsonb not null default '[]',        -- 첨부파일 정보(이름·크기). 파일 자체는 미저장
  ip            text not null default '',
  handled       boolean not null default false,     -- 확인함 표시
  created_at    timestamptz not null default now()
);

create index if not exists quotes_created_idx
  on public.quotes (created_at desc);
create index if not exists quotes_handled_idx
  on public.quotes (handled, created_at desc);


-- -------------------------------------------------------------
-- 권한
--   · 누구나 남길 수 있어야 합니다 (홈페이지 문의 폼)
--   · 남긴 내용은 관리자만 봅니다 (고객 개인정보이므로)
-- -------------------------------------------------------------
alter table public.quotes enable row level security;

drop policy if exists quotes_public_insert on public.quotes;
drop policy if exists quotes_admin_read    on public.quotes;
drop policy if exists quotes_admin_all     on public.quotes;

-- 넣기만 가능. 조회 정책이 없으므로 남이 쓴 문의는 절대 못 읽습니다.
create policy quotes_public_insert on public.quotes
  for insert with check (true);

-- 관리자는 전부 가능 (조회·확인처리·삭제)
create policy quotes_admin_all on public.quotes
  for all using (public.is_admin()) with check (public.is_admin());
