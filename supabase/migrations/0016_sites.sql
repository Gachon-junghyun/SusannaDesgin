-- 0016_sites.sql — «현장 폴더»: 시공 현장 한 건 = 사진 여러 장 + 사실 몇 칸 → 공개하면 시공사례 페이지 (F29)
--
-- 무엇: `sites`(현장 — 상호·위치·간판 종류·치수·자재·기간·현장 이야기·공개 여부)
--       `site_photos`(사진 — 웹용·썸네일 저장 위치(R2 키), 촬영 시각(EXIF), 단계(전·시공·완공·야간), 원본 전송 상태)
--
-- 왜:   2026-09-26 사람 요청 — 사진 정리 + SEO 1순위(시공사례 개별 페이지, SEO.md B-1)를 한 번에.
--       구글 AI 가이드(«흔한 글이 아닌 직접 해 본 기록»)와 네이버 서치어드바이저(«전문성과 경험»)가 둘 다 이걸 가리킵니다.
--
-- 🔴 **사진 파일은 여기 없습니다.** 웹용(긴 변 1600px WebP)·썸네일은 Cloudflare R2 버킷 `SITE_PHOTOS`,
--    원본은 구글 드라이브를 거쳐 비스테이션으로 갑니다. 이 표는 «어디 있나»만 적습니다.
--    웹용은 브라우저가 다시 그려 저장하므로 **사진 속 GPS·촬영기기 정보가 남지 않습니다**(원본에는 남아 있고 비공개입니다).
--
-- 🔴 **읽기 권한이 둘로 갈립니다** [A2]:
--    · 관리자 — 전부 읽고 씁니다(`is_admin()`).
--    · 익명 — **공개(`published`)된 현장과 그 현장의 사진만** 읽습니다. 쓰기는 한 줄도 없습니다.
--
-- 안 돌려도 홈페이지는 안 죽습니다 — 실적 페이지는 기존 카드만 보이고, 관리자 «현장» 화면은 «0016 실행» 을 띄웁니다 [A1].
-- 실행: Supabase 대시보드 → SQL Editor → 붙여넣고 RUN (운영 DB 실행은 대표님이 하십니다). 재실행 안전합니다.

create table if not exists public.sites (
  id            uuid primary key default gen_random_uuid(),
  -- 공개 주소 /works/<slug>. 한글 가능(검색엔진이 읽습니다) — 예: 대전-서구-태평한우-채널간판
  slug          text not null unique,
  title         text not null,                 -- 상호 또는 현장 이름
  location      text not null default '',      -- 구·동까지 (번지는 적지 않습니다 — 손님 가게 주소)
  sign_type     text not null default '',
  size_text     text not null default '',      -- 치수 (예: 가로 6m × 세로 0.9m)
  materials     text not null default '',
  period        text not null default '',      -- 제작·시공 기간 (예: 제작 5일 · 시공 반나절)
  story         text not null default '',      -- 현장 이야기 — 벽 재질·높이·장비·어려웠던 점
  bee_link      text not null default '',      -- 비스테이션 사진 모으기/공유 링크 (관리자만 봄)
  cover_photo   uuid,
  published     boolean not null default false,
  published_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint sites_slug_fmt   check (slug ~ '^[0-9a-z가-힣-]{2,80}$'),
  constraint sites_title_len  check (char_length(title) between 1 and 80),
  constraint sites_loc_len    check (char_length(location) <= 60),
  constraint sites_type_len   check (char_length(sign_type) <= 40),
  constraint sites_size_len   check (char_length(size_text) <= 80),
  constraint sites_mat_len    check (char_length(materials) <= 120),
  constraint sites_period_len check (char_length(period) <= 60),
  constraint sites_story_len  check (char_length(story) <= 4000),
  constraint sites_bee_fmt    check (bee_link = '' or (bee_link ~ '^https://' and char_length(bee_link) <= 500))
);

create table if not exists public.site_photos (
  id               uuid primary key default gen_random_uuid(),
  site_id          uuid not null references public.sites (id) on delete cascade,
  -- R2 키. 예: sites/<site_id>/<uuid>.webp · 썸네일은 _t.webp
  key              text not null unique,
  thumb_key        text not null,
  taken_at         timestamptz,                -- 사진 속 촬영 시각(EXIF). 없으면 올린 시각
  stage            text not null default 'etc',
  width            integer not null default 0,
  height           integer not null default 0,
  bytes            integer not null default 0,
  caption          text not null default '',
  ocr_text         text not null default '',   -- «상호 읽기» 결과 (AI 인식 — 추정)
  original_status  text not null default 'none',
  drive_file_id    text not null default '',
  created_at       timestamptz not null default now(),
  constraint site_photos_stage_fmt  check (stage in ('before', 'work', 'done', 'night', 'etc')),
  constraint site_photos_orig_fmt   check (original_status in ('none', 'drive', 'failed')),
  -- WebP 가 기본, 브라우저가 WebP 로 못 굽는 경우(일부 사파리)만 JPEG
  constraint site_photos_key_fmt    check (key ~ '^sites/[0-9a-f-]{36}/[0-9a-f-]{36}\.(webp|jpg)$'),
  constraint site_photos_caption_len check (char_length(caption) <= 200),
  constraint site_photos_ocr_len    check (char_length(ocr_text) <= 1000)
);

create index if not exists site_photos_site_idx on public.site_photos (site_id, taken_at);

alter table public.sites       enable row level security;
alter table public.site_photos enable row level security;

drop policy if exists sites_admin_all on public.sites;
create policy sites_admin_all on public.sites
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists sites_public_read on public.sites;
create policy sites_public_read on public.sites
  for select using (published);

drop policy if exists site_photos_admin_all on public.site_photos;
create policy site_photos_admin_all on public.site_photos
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists site_photos_public_read on public.site_photos;
create policy site_photos_public_read on public.site_photos
  for select using (exists (select 1 from public.sites s where s.id = site_id and s.published));

-- 익명은 «읽기»만, 그것도 **칸 단위로** 좁힙니다.
-- 🔴 `bee_link`(비스테이션 링크)·`ocr_text`·`drive_file_id`·`original_status` 는 익명에게 안 보입니다 —
--    RLS 는 «어느 줄»만 거르고 «어느 칸»은 못 거르므로 칸 권한으로 막습니다.
--    그래서 공개 페이지 코드는 `select("*")` 가 아니라 칸 이름을 적어서 읽어야 합니다(`lib/sites.ts` PUBLIC_*_COLS).
revoke all on public.sites       from anon;
revoke all on public.site_photos from anon;
grant select (id, slug, title, location, sign_type, size_text, materials, period, story, cover_photo, published, published_at, created_at, updated_at)
  on public.sites to anon;
grant select (id, site_id, key, thumb_key, taken_at, stage, width, height, caption)
  on public.site_photos to anon;
