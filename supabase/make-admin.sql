-- =============================================================
--  기존 계정을 관리자로 만들기
--
--  언제 쓰나:
--   · 계정을 만들었는데 로그인 후 "관리 권한이 없습니다" 가 뜰 때
--   · 0001_init.sql 을 실행하기 **전에** 계정을 먼저 만든 경우
--     (자동 등록 트리거는 계정이 새로 생길 때만 작동하므로,
--      그 전에 만들어진 계정은 프로필이 없습니다)
--
--  쓰는 법: Supabase 대시보드 → SQL Editor → 붙여넣고 RUN
--  여러 번 실행해도 안전합니다.
-- =============================================================


-- -------------------------------------------------------------
-- 1) 지금 어떤 계정이 있는지 먼저 봅니다
-- -------------------------------------------------------------
select
  u.email                                as "이메일",
  u.created_at                           as "가입일",
  coalesce(p.role, '(프로필 없음)')       as "현재 권한",
  case when u.email_confirmed_at is null
       then '❌ 미확인 — 로그인 안 됨'
       else '✅ 확인됨' end               as "이메일 확인"
from auth.users u
left join public.profiles p on p.id = u.id
order by u.created_at;


-- -------------------------------------------------------------
-- 2) 가장 먼저 만든 계정을 관리자로 승격
--    (프로필이 없으면 만들고, 있으면 권한만 올립니다)
--
--    ⚠️ 계정이 여러 개인데 특정 계정을 지정하고 싶으면
--       이 블록 대신 아래 3) 을 쓰세요.
-- -------------------------------------------------------------
insert into public.profiles (id, email, role)
select u.id, u.email, 'admin'
from auth.users u
order by u.created_at
limit 1
on conflict (id) do update
  set role  = 'admin',
      email = excluded.email;


-- -------------------------------------------------------------
-- 3) [선택] 특정 이메일을 관리자로 지정하고 싶을 때
--    아래 두 줄의 주석(--)을 지우고 이메일을 바꿔서 실행하세요.
-- -------------------------------------------------------------
-- insert into public.profiles (id, email, role)
-- select id, email, 'admin' from auth.users where email = '여기에@이메일.주소'
-- on conflict (id) do update set role = 'admin', email = excluded.email;


-- -------------------------------------------------------------
-- 4) 결과 확인 — "현재 권한" 이 admin 이면 성공입니다
-- -------------------------------------------------------------
select
  u.email                          as "이메일",
  coalesce(p.role, '(프로필 없음)') as "현재 권한",
  case when u.email_confirmed_at is null
       then '❌ 미확인 — 로그인 전에 확인 필요'
       else '✅ 로그인 가능' end     as "상태"
from auth.users u
left join public.profiles p on p.id = u.id
order by u.created_at;
