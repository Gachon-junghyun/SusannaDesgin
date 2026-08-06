-- =============================================================
--  페이지 문구 CMS — content_blocks
--  Supabase 대시보드 → SQL Editor 에 이 파일 전체를 붙여넣고 RUN 하세요.
--  두 번 실행해도 안전합니다 (idempotent).
--
--  이 표가 생기기 전까지 아래 내용은 전부 코드 안에 박혀 있어서,
--  "공장을 가졌다는 건…" 한 줄을 고치려 해도 개발자가 배포를 해야 했습니다.
--  이제 /admin/content 에서 바꾸면 다음 방문부터 바로 반영됩니다.
--
--  ⚠️ 한 표에 여러 구역을 담습니다. 구역마다 표를 따로 만들면 같은 CRUD 코드가
--     여섯 벌이 됩니다. 대신 `section` 으로 갈라 쓰고, 칸의 뜻이 구역마다
--     달라지는 것을 아래 표로 못박아 둡니다. 관리자 화면도 이 표대로 라벨을 답니다.
--
--     section      | eyebrow   | title      | sub        | points        | image_url
--     -------------+-----------+------------+------------+---------------+----------
--     copy         | 영문 머리말 | 큰 제목     | 설명        | —             | —
--     why          | —         | 근거 제목   | 근거 설명   | —             | —
--     stat         | 단위(평)   | 숫자(795)   | 이름        | —             | —
--     process      | 번호(01)   | 단계 이름   | 한 줄 설명  | 상세 항목      | 사진
--     fabrication  | —         | 공정 이름   | 한 줄 설명  | —             | 사진
--     sign_type    | 영문(OUTDOOR) | 분야 이름 | 소개 문단  | 특징 항목      | 사진
-- =============================================================

create table if not exists public.content_blocks (
  id         uuid primary key default gen_random_uuid(),
  -- 어느 구역인가
  section    text not null check (
               section in ('copy', 'why', 'stat', 'process', 'fabrication', 'sign_type')
             ),
  -- 코드가 이름으로 집어 오는 칸. copy 는 'home-why' 처럼,
  -- sign_type 은 /signs#outdoor 앵커로 씁니다. 나머지 구역은 빈 값.
  slug       text not null default '',
  eyebrow    text not null default '',
  title      text not null default '',
  sub        text not null default '',
  points     text[] not null default '{}',
  image_url  text not null default '',
  alt        text not null default '',
  sort_order int  not null default 0,
  published  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists content_blocks_section_idx
  on public.content_blocks (section, published, sort_order);

-- slug 는 코드가 이름으로 집어 오는 값이라 구역 안에서 겹치면 안 됩니다.
-- 빈 값(구역 전체를 순서로만 쓰는 경우)은 여러 개 있어도 됩니다.
create unique index if not exists content_blocks_slug_uniq
  on public.content_blocks (section, slug) where slug <> '';

drop trigger if exists content_blocks_touch on public.content_blocks;
create trigger content_blocks_touch
  before update on public.content_blocks
  for each row execute function public.touch_updated_at();


-- -------------------------------------------------------------
--  RLS — 다른 표와 같은 규칙. 읽기는 공개된 것만, 쓰기는 관리자만.
-- -------------------------------------------------------------
alter table public.content_blocks enable row level security;

drop policy if exists content_blocks_public_read on public.content_blocks;
drop policy if exists content_blocks_admin_all   on public.content_blocks;

create policy content_blocks_public_read on public.content_blocks
  for select using (published = true);

create policy content_blocks_admin_all on public.content_blocks
  for all using (public.is_admin()) with check (public.is_admin());


-- -------------------------------------------------------------
--  초기 데이터 — 지금 사이트에 나가고 있는 문구 그대로입니다.
--  `config/content.ts` 의 폴백과 같은 내용이라, 넣어도 화면은 안 바뀝니다.
--  구역 단위로 "비어 있을 때만" 넣으므로 여러 번 실행해도 덮어쓰지 않습니다.
-- -------------------------------------------------------------

-- 구역 머리말
insert into public.content_blocks (section, slug, eyebrow, title, sub, sort_order)
select * from (values
  ('copy', 'home-why',         'WHY SUSANNA',
   E'만드는 곳과 다는 곳이\n같아야 책임이 명확합니다',
   '제작과 시공이 나뉘면 문제가 생겼을 때 서로를 가리킵니다. 수산나디자인은 2012년부터 디자인·제작·시공·관리를 한 팀이 맡아 왔습니다.', 10),
  ('copy', 'home-process',     'PROCESS',
   '상담부터 시공까지, 이렇게 진행됩니다',
   '현장 확인과 시안 제작까지 무료로 진행합니다.', 20),
  ('copy', 'home-works',       'OUR WORK',
   '주요 실적',
   '관공서 · 금융 · 기업 · 상업시설 등 다양한 분야에서 시공했습니다.', 30),
  ('copy', 'home-fabrication', 'FABRICATION',
   E'공장을 가졌다는 건\n일정을 지킬 수 있다는 뜻입니다',
   '절단부터 검수까지 795평 자체 공장 안에서 끝냅니다. 외주 대기로 납기가 밀리지 않습니다.', 40),
  ('copy', 'home-cta',         '',
   '어느 정도 규모인지 알려주세요',
   '현장 확인과 디자인 시안까지 무료입니다. 부담 없이 문의하세요.', 50)
) as v(section, slug, eyebrow, title, sub, sort_order)
where not exists (select 1 from public.content_blocks where section = 'copy');

-- WHY SUSANNA 근거 네 줄
insert into public.content_blocks (section, title, sub, sort_order)
select * from (values
  ('why', '795평 자체 공장',        '절단·가공·도색·조립을 외주 없이 공장 안에서 끝냅니다.', 10),
  ('why', '사인물과 철구조물을 함께', '캐노피·파사드 같은 구조물까지 한 번에 설계하고 시공합니다.', 20),
  ('why', '대형 현장 경험',          '삼성화재, KAIST, 교보생명, 금성백조, 대전무역회관 등을 시공했습니다.', 30),
  ('why', '인증·등록 6종 보유',      '옥외광고사업 등록, 직접생산확인, 공장등록을 갖춘 정식 등록 업체입니다.', 40)
) as v(section, title, sub, sort_order)
where not exists (select 1 from public.content_blocks where section = 'why');

-- 신뢰 지표 (title = 숫자, eyebrow = 단위, sub = 이름)
insert into public.content_blocks (section, eyebrow, title, sub, sort_order)
select * from (values
  ('stat', '년~', '2012',  '설립',          10),
  ('stat', '평',  '795',   '자체 공장',      20),
  ('stat', '종',  '6',     '보유 인증·등록',  30),
  ('stat', '건',  '0,000', '누적 시공',      40)
) as v(section, eyebrow, title, sub, sort_order)
where not exists (select 1 from public.content_blocks where section = 'stat');

-- 업무 프로세스 5단계 (홈 + /process 가 같이 씁니다)
insert into public.content_blocks (section, eyebrow, title, sub, points, image_url, sort_order)
select * from (values
  ('process', '01', '상담 및 접수', '고객 요구사항을 파악하고 현장을 직접 확인합니다.',
   array[
     '요구사항을 듣고 현장을 직접 확인합니다.',
     '벽면 재질과 상태를 봅니다. 드라이비트·석재·유리마다 고정 방식이 달라집니다.',
     '전기 인입 위치, 층수, 도로 폭을 확인합니다. 고소작업차 진입 여부가 시공비를 좌우합니다.'
   ], '/images/step-1-consult.jpg', 10),
  ('process', '02', '디자인 기획', '콘셉트를 설정하고 시안을 제작합니다.',
   array[
     '건물 용도와 브랜드 톤에 맞춰 콘셉트를 잡습니다.',
     '실제 건물 사진에 사인물을 합성해 보여드립니다.',
     '주간 시안과 야간 점등 시안을 함께 드립니다.'
   ], '/images/step-2-design.jpg', 20),
  ('process', '03', '시안 확정', '고객 검토를 거쳐 최종 디자인을 확정합니다.',
   array[
     '시안을 검토하시고 최종안을 확정합니다.',
     '확정 전까지 수정해 드리며, 시안 제작에는 비용이 들지 않습니다.',
     '확정 후 제작 도면과 일정을 공유합니다.'
   ], '/images/step-3-confirm.jpg', 30),
  ('process', '04', '제작', '795평 자체 공장에서 전문 인력이 제작합니다.',
   array[
     '795평 자체 공장에서 절단·가공·도색·조립을 진행합니다.',
     '외주로 넘기지 않기 때문에 일정과 품질을 저희가 통제합니다.',
     '철구조물이 포함된 경우 구조 검토 후 함께 제작합니다.'
   ], '/images/step-4-production.jpg', 40),
  ('process', '05', '시공 및 완료', '현장 시공 후 A/S까지 관리합니다.',
   array[
     '자사 제작시공팀이 직접 설치합니다.',
     '옥외광고물 신고가 필요한 경우 행정 절차를 대행합니다.',
     '설치 후 점등·안전 확인까지 마치고 A/S를 관리합니다.'
   ], '/images/step-5-install.jpg', 50)
) as v(section, eyebrow, title, sub, points, image_url, sort_order)
where not exists (select 1 from public.content_blocks where section = 'process');

-- 공장 공정 6종 (홈 FABRICATION 구역)
insert into public.content_blocks (section, title, sub, image_url, sort_order)
select * from (values
  ('fabrication', '절단', '판재·형강 재단',       '/images/fab-1-cut.jpg',      10),
  ('fabrication', '가공', '밴딩·성형 가공',       '/images/fab-2-form.jpg',     20),
  ('fabrication', '도색', '분체·우레탄 도장',     '/images/fab-3-paint.jpg',    30),
  ('fabrication', '조립', '구조 조립 및 배선',    '/images/fab-4-assemble.jpg', 40),
  ('fabrication', '설치', '현장 시공·고소작업',   '/images/fab-5-install.jpg',  50),
  ('fabrication', '검수', '점등·안전 최종 확인',  '/images/fab-6-inspect.jpg',  60)
) as v(section, title, sub, image_url, sort_order)
where not exists (select 1 from public.content_blocks where section = 'fabrication');

-- 사업영역 4종 (홈 상단 바 + /signs)
insert into public.content_blocks (section, slug, eyebrow, title, sub, points, image_url, sort_order)
select * from (values
  ('sign_type', 'outdoor', 'OUTDOOR', '옥외광고물',
   '빌딩 외벽, 도로변, 건물 옥상 등 다양한 옥외 광고물을 기획하고 제작합니다.',
   array['옥상 광고탑 · 외벽 사인', '고소작업 시공 및 유지보수', '옥외광고물 행정 신고 대행'],
   '/images/biz-outdoor.jpg', 10),
  ('sign_type', 'sign', 'SIGNAGE', '간판디자인',
   '상가, 오피스, 상업시설 등 공간에 맞춘 간판을 디자인하고 시공합니다.',
   array['채널 · 스카시 · 돌출 간판', 'CI 교체 및 브랜드 통일 작업', '다점포 일괄 시공'],
   '/images/biz-sign.jpg', 20),
  ('sign_type', 'steel', 'STEEL STRUCTURE', '철구조물',
   '캐노피, 파사드, 구조물 등 철재 구조물을 설계하고 제작·시공합니다.',
   array['주차장 캐노피 · 파사드', '구조 검토 후 설계 · 제작', '사인물과 구조물 동시 시공'],
   '/images/biz-steel.jpg', 30),
  ('sign_type', 'indoor', 'INDOOR', '옥내광고물',
   '실내 사인, 디스플레이, 인테리어 광고물을 전문적으로 기획하고 설치합니다.',
   array['로비 사인 · 이미지월', '층별 안내 · 유도 사인', '인테리어 연계 시공'],
   '/images/biz-indoor.jpg', 40)
) as v(section, slug, eyebrow, title, sub, points, image_url, sort_order)
where not exists (select 1 from public.content_blocks where section = 'sign_type');
