-- =============================================================
--  수산나디자인 CMS — 초기 스키마
--  Supabase 대시보드 → SQL Editor 에 이 파일 전체를 붙여넣고 RUN 하세요.
--  두 번 실행해도 안전합니다 (idempotent).
-- =============================================================

-- -------------------------------------------------------------
-- 1. 공통 유틸
-- -------------------------------------------------------------

-- updated_at 자동 갱신
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- -------------------------------------------------------------
-- 2. 프로필 (권한)
--    auth.users 는 Supabase 가 관리하고, 역할만 여기서 관리합니다.
-- -------------------------------------------------------------
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text,
  role       text not null default 'viewer' check (role in ('admin', 'viewer')),
  created_at timestamptz not null default now()
);

-- 관리자 여부 확인 함수.
-- SECURITY DEFINER 로 RLS 를 우회합니다. 이렇게 하지 않으면 profiles 정책이
-- 자기 자신을 다시 조회하면서 무한 재귀에 빠집니다.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- 신규 가입자 자동 프로필 생성.
-- 첫 번째 사용자는 자동으로 admin 이 됩니다(초기 부트스트랩).
-- 그 다음부터는 viewer 로 생성되므로, 계정을 만든 뒤에는 반드시
-- Supabase 대시보드에서 이메일 회원가입을 꺼 두세요.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  admin_count int;
begin
  select count(*) into admin_count from public.profiles where role = 'admin';

  insert into public.profiles (id, email, role)
  values (
    new.id,
    new.email,
    case when admin_count = 0 then 'admin' else 'viewer' end
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 백필 — 이 SQL 을 실행하기 **전에** 만들어진 계정을 구제합니다.
-- 위 트리거는 계정이 새로 생길 때만 작동하므로, 순서를 반대로 진행한 경우
-- (계정 먼저 → SQL 나중) 프로필이 없어 로그인해도 권한이 없습니다.
-- 이 블록이 그런 계정에 프로필을 만들어 주고, 관리자가 하나도 없으면
-- 가장 먼저 가입한 계정을 관리자로 지정합니다.
insert into public.profiles (id, email, role)
select
  u.id,
  u.email,
  case
    when not exists (select 1 from public.profiles where role = 'admin')
     and u.created_at = (select min(created_at) from auth.users)
    then 'admin'
    else 'viewer'
  end
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);


-- -------------------------------------------------------------
-- 3. 히어로 슬라이드 (첫 화면 사진)
-- -------------------------------------------------------------
create table if not exists public.hero_slides (
  id         uuid primary key default gen_random_uuid(),
  eyebrow    text not null default '',
  title      text not null default '',
  sub        text not null default '',
  image_url  text not null default '',
  alt        text not null default '',
  sort_order int  not null default 0,
  published  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists hero_slides_order_idx
  on public.hero_slides (published, sort_order);

drop trigger if exists hero_slides_touch on public.hero_slides;
create trigger hero_slides_touch
  before update on public.hero_slides
  for each row execute function public.touch_updated_at();


-- -------------------------------------------------------------
-- 4. 주요 실적 (카드 박스)
-- -------------------------------------------------------------
create table if not exists public.works (
  id         uuid primary key default gen_random_uuid(),
  title      text not null default '',
  category   text not null default '',
  location   text not null default '',
  tags       text[] not null default '{}',
  image_url  text not null default '',
  sort_order int  not null default 0,
  published  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists works_order_idx
  on public.works (published, sort_order);

drop trigger if exists works_touch on public.works;
create trigger works_touch
  before update on public.works
  for each row execute function public.touch_updated_at();


-- -------------------------------------------------------------
-- 5. RLS — 읽기는 누구나(공개된 것만), 쓰기는 관리자만
-- -------------------------------------------------------------
alter table public.profiles    enable row level security;
alter table public.hero_slides enable row level security;
alter table public.works       enable row level security;

-- profiles: 본인 것만 읽기, 관리자는 전부
drop policy if exists profiles_select_self  on public.profiles;
drop policy if exists profiles_admin_all    on public.profiles;

create policy profiles_select_self on public.profiles
  for select using (id = auth.uid());

create policy profiles_admin_all on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

-- hero_slides
drop policy if exists hero_public_read on public.hero_slides;
drop policy if exists hero_admin_all   on public.hero_slides;

create policy hero_public_read on public.hero_slides
  for select using (published = true);

create policy hero_admin_all on public.hero_slides
  for all using (public.is_admin()) with check (public.is_admin());

-- works
drop policy if exists works_public_read on public.works;
drop policy if exists works_admin_all   on public.works;

create policy works_public_read on public.works
  for select using (published = true);

create policy works_admin_all on public.works
  for all using (public.is_admin()) with check (public.is_admin());


-- -------------------------------------------------------------
-- 6. 스토리지 — 사진 업로드 버킷
--    공개 읽기(사이트에 그대로 노출), 업로드·삭제는 관리자만.
-- -------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do update set public = true;

drop policy if exists media_public_read   on storage.objects;
drop policy if exists media_admin_insert  on storage.objects;
drop policy if exists media_admin_update  on storage.objects;
drop policy if exists media_admin_delete  on storage.objects;

create policy media_public_read on storage.objects
  for select using (bucket_id = 'media');

create policy media_admin_insert on storage.objects
  for insert with check (bucket_id = 'media' and public.is_admin());

create policy media_admin_update on storage.objects
  for update using (bucket_id = 'media' and public.is_admin());

create policy media_admin_delete on storage.objects
  for delete using (bucket_id = 'media' and public.is_admin());


-- -------------------------------------------------------------
-- 7. 초기 데이터 — 현재 사이트에 있는 내용 그대로
--    image_url 이 "/images/..." 이면 public 폴더의 기존 파일을 그대로 씁니다.
--    관리자 화면에서 사진을 올리면 스토리지 URL 로 교체됩니다.
-- -------------------------------------------------------------
insert into public.hero_slides (eyebrow, title, sub, image_url, alt, sort_order)
select * from (values
  ('01', E'건물의 이름을\n가장 높은 곳에',
   '빌딩 외벽, 옥상 광고탑, 도로변 사인까지. 규모가 큰 현장을 다뤄 왔습니다.',
   '/images/hero-night.jpg', '야간 점등된 옥상 광고탑', 10),
  ('02', E'795평 자체 공장에서\n직접 만듭니다',
   '절단·가공·도색·조립을 공장 안에서 끝내기 때문에 일정과 품질을 저희가 통제합니다.',
   '/images/hero-factory.jpg', '수산나디자인 자체 공장 제작 현장', 20),
  ('03', E'사인물을 넘어\n철구조물까지',
   '캐노피, 파사드, 구조물 설계와 제작·시공을 함께 진행합니다.',
   '/images/hero-install.jpg', '철구조물 시공 현장', 30)
) as v(eyebrow, title, sub, image_url, alt, sort_order)
where not exists (select 1 from public.hero_slides);

insert into public.works (title, category, location, tags, image_url, sort_order)
select * from (values
  ('삼성화재 사인물',            '금융',        '',     array['외부 사인물'],            '/images/work-01.jpg',  10),
  ('교보생명 옥상 광고탑',        '금융',        '',     array['옥상 광고탑','유지보수'], '/images/work-02.jpg',  20),
  ('우리은행 사인물',            '금융',        '',     array['외부 사인물','CI'],       '/images/work-03.jpg',  30),
  ('KAIST 사인물',              '관공서·공공',  '대전', array['옥내외 사인'],            '/images/work-04.jpg',  40),
  ('K-water 기술 사인물',        '관공서·공공',  '대전', array['외부 사인물'],            '/images/work-05.jpg',  50),
  ('대전무역회관 사옥 사인물',    '관공서·공공',  '대전', array['외부 사인물'],            '/images/work-06.jpg',  60),
  ('대전무역회관 주차장 캐노피',  '철구조물',    '대전', array['캐노피','철구조물'],      '/images/work-07.jpg',  70),
  ('KT 탄방타워 사인물',         '기업',        '대전', array['외부 사인물'],            '/images/work-08.jpg',  80),
  ('KT 매장 뉴 CI 간판 교체',    '기업',        '',     array['CI 교체','다점포'],       '/images/work-09.jpg',  90),
  ('금성백조 본사 사옥 옥외간판', '기업',        '대전', array['옥외간판'],               '/images/work-10.jpg', 100),
  ('롯데하이마트 사인물',        '상업시설',    '',     array['외부 사인물'],            '/images/work-11.jpg', 110),
  ('뉴코아 아울렛 사인물',        '상업시설',    '',     array['외부 사인물'],            '/images/work-12.jpg', 120),
  ('힐스테이트 오피스텔 사인물',  '주거',        '',     array['단지 사인'],              '/images/work-13.jpg', 130),
  ('칼릭스빌딩 사인 작업',        '기업',        '',     array['외부 사인물'],            '/images/work-14.jpg', 140),
  ('기아 서비스 사인물',          '기업',        '',     array['외부 사인물'],            '/images/work-15.jpg', 150)
) as v(title, category, location, tags, image_url, sort_order)
where not exists (select 1 from public.works);
