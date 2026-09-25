-- 0013_maker_share.sql — 간판 메이커 «공유 링크» (보기 전용)
--
-- 무엇: 관리자가 만든 간판 디자인을 **링크 하나로** 손님에게 보여 줍니다(«구글독스처럼»).
--       관리자가 «공유 링크 만들기» → 이 표에 **디자인 JSON 한 벌**이 들어가고,
--       손님은 `/maker/s/<토큰>` 을 열어 주간·야간을 보고, 그 디자인으로 견적을 넣습니다.
--
-- 왜:   2026-09-25 사람 요청. 지금까지 디자인은 만든 사람 브라우저(localStorage)에만 있어서,
--       손님에게 보이려면 JPG 를 따로 보내야 했습니다(확대·주야간 전환이 안 됨).
--
-- 🔴 **무엇을 «안» 넣나 — 가게 사진입니다.** 손님 가게·주변 사람·차량이 찍힌 사진이라 개인정보가
--    될 수 있고, 한 장에 수 MB 입니다. 사진 벽으로 만든 디자인은 공유할 때 **흰 벽으로 바뀌어** 들어갑니다
--    (앱 코드가 바꾸고, 서버 액션이 사진·`data:`·`blob:` 주소가 섞였으면 거부합니다).
--    사진까지 넣으려면 **개인정보처리방침 개정이 먼저**입니다.
--    디자인 JSON 에 남는 것은 상호·문구·색·치수·로고 외곽선입니다 — 손님 개인정보가 아니라 간판 내용입니다.
--    ⚠️ 관리자 PC 글꼴로 쓴 글자는 **외곽선(모양)으로 굳혀** 들어갑니다. 글꼴 파일은 안 들어갑니다.
--
-- 🔴 **익명에게 표 권한을 한 줄도 안 줍니다.** 익명이 닿는 표면은 함수 하나(`get_maker_share`)뿐이고,
--    그 함수는 **토큰이 정확히 맞는 한 건**만, **만료 전**에만 돌려줍니다. 표 전체 SELECT 를 열면
--    토큰을 몰라도 남의 디자인이 전부 보입니다.
--    토큰은 `gen_random_uuid()` 의 32자(무작위 122비트) — 추측으로는 못 찾습니다.
--
-- 쓰기(만들기·지우기)는 관리자만 — RLS `is_admin()` + 서버 액션의 `requireAdmin()` [A2].
-- 만료 기본값은 **90일**입니다. 지나면 함수가 아무것도 안 돌려줍니다(행은 남음 — 관리자 목록에서 지웁니다).
--
-- ⚠️ **안 돌려도 에디터는 멀쩡합니다** [A1]. «공유 링크 만들기»가 «0013 을 먼저 실행하세요» 를 띄우고,
--    공유 주소는 «링크를 열 수 없습니다» 화면을 냅니다.
--
-- 실행: Supabase 대시보드 → SQL Editor → 붙여넣고 RUN (**운영 DB 실행은 대표님이 하십니다**).
-- 여러 번 실행해도 안전합니다.

create table if not exists public.maker_shares (
  id          uuid primary key default gen_random_uuid(),
  token       text not null unique default replace(gen_random_uuid()::text, '-', ''),
  -- 관리자 목록에서 알아보기 위한 이름 (보통 상호). 손님 화면 제목에도 씁니다
  title       text not null default '',
  design      jsonb not null,
  created_by  uuid references auth.users (id) on delete set null default auth.uid(),
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default now() + interval '90 days',
  constraint maker_shares_token_fmt check (token ~ '^[0-9a-f]{32}$'),
  constraint maker_shares_title_len check (char_length(title) <= 80),
  -- 서버 액션 본문 한도(1MB)보다 조금 크게. 로고 외곽선이 큰 디자인도 이 안에 듭니다
  constraint maker_shares_design_size check (octet_length(design::text) <= 1000000)
);

create index if not exists maker_shares_created_idx on public.maker_shares (created_at desc);

alter table public.maker_shares enable row level security;

drop policy if exists maker_shares_admin_all on public.maker_shares;
create policy maker_shares_admin_all on public.maker_shares
  for all using (public.is_admin()) with check (public.is_admin());

-- Supabase 는 새 표에 anon·authenticated 권한을 기본으로 붙입니다. RLS 가 막지만 한 겹 더 걷어 둡니다
revoke all on public.maker_shares from anon;

-- 익명이 닿는 유일한 문 — 토큰 한 건, 만료 전만
create or replace function public.get_maker_share(p_token text)
returns table (title text, design jsonb, created_at timestamptz, expires_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select s.title, s.design, s.created_at, s.expires_at
    from public.maker_shares s
   where p_token ~ '^[0-9a-f]{32}$'
     and s.token = p_token
     and s.expires_at > now()
   limit 1;
$$;

revoke all on function public.get_maker_share(text) from public;
grant execute on function public.get_maker_share(text) to anon, authenticated;
