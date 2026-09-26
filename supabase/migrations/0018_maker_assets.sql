-- 0018_maker_assets.sql — 메이커 «프로젝트 에셋»: 손님 시안에서 뽑은 로고·레터링·아이콘·그림 (F26-j · 2026-09-26)
--
-- 무엇: `maker_assets`(에셋 한 장 — 프로젝트 이름 · 보이는 이름 · 종류(svg/png/jpg/webp) · 저장 위치 · 크기)
--       비공개 스토리지 버킷 `maker-assets`
--
-- 왜:   2026-09-26 사람 요청 — *"클로드 코드가 제미나이 등으로 초안을 뽑아 올리고, 내가 수산나 메이커에서 컨펌·조립하면,
--       클로드가 받아서 일러로 굽는다."* 그 첫 칸(올리기)이 이 표입니다. 올리는 쪽은 `npm run cms -- maker-assets upload`
--       (관리자 로그인 세션), 보는 쪽은 `/admin/maker/assets` 와 관리자 메이커의 «프로젝트 에셋» 칸입니다.
--
-- 🔴 **관리자만 읽고 씁니다** [A2] — 에셋은 손님이 준 시안(상호·전화번호·로고)에서 뽑은 것이라 손님 자료입니다(P7).
--    익명에게는 표도 버킷도 한 줄도 안 엽니다. 손님 메이커·공유 링크(F26-b)엔 그림 에셋이 안 나갑니다
--    (공유 검사가 `data:`·`blob:` 을 거부하고, 그림 아이템은 관리자 화면에서만 만들어집니다).
--    보유 기간은 견적과 같게 — 상담이 끝나면 관리자 화면에서 프로젝트째 지웁니다(§7 에 부채로 적음: 자동 삭제 없음).
--
-- 안 돌려도 홈페이지는 안 죽습니다 — 에셋 화면이 «0018 실행» 을 띄웁니다 [A1].
-- 실행: Supabase 대시보드 → SQL Editor → 붙여넣고 RUN (운영 DB 실행은 대표님이 하십니다). 재실행 안전합니다.

create table if not exists public.maker_assets (
  id          uuid primary key default gen_random_uuid(),
  -- 프로젝트 = 손님 한 건 (예: 서원건축전기조경공사). 폴더처럼 묶는 이름입니다
  project     text not null,
  name        text not null,                  -- 보이는 이름 (예: 로고_원안정리)
  kind        text not null,                  -- svg · png · jpg · webp
  path        text not null unique,           -- 버킷 안 키: <uuid>.<확장자> (한글 파일명을 키에 안 씁니다 — lib/quote-files.ts 와 같은 이유)
  width       integer not null default 0,     -- 원본 픽셀(그림) 또는 viewBox(SVG)
  height      integer not null default 0,
  bytes       integer not null default 0,
  note        text not null default '',       -- 어떻게 뽑았나 (예: 제미나이 재현 · IoU 0.998)
  created_at  timestamptz not null default now(),
  constraint maker_assets_project_len check (char_length(project) between 1 and 80),
  constraint maker_assets_name_len    check (char_length(name) between 1 and 120),
  constraint maker_assets_kind        check (kind in ('svg', 'png', 'jpg', 'webp')),
  constraint maker_assets_note_len    check (char_length(note) <= 400)
);

create index if not exists maker_assets_project_idx on public.maker_assets (project, created_at desc);

alter table public.maker_assets enable row level security;
revoke all on public.maker_assets from anon;

drop policy if exists maker_assets_admin on public.maker_assets;
create policy maker_assets_admin on public.maker_assets
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());


-- -------------------------------------------------------------
-- 버킷 — 비공개. 관리자가 볼 때마다 서명 URL(수명 있는 임시 주소)을 새로 받습니다 (0006 과 같은 방식)
-- 20MB = 풀밭 띠 같은 투명 PNG(6,000px 안팎)가 들어갈 만큼
-- -------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('maker-assets', 'maker-assets', false, 20971520)
on conflict (id) do update
  set public = false,
      file_size_limit = 20971520;

drop policy if exists maker_assets_obj_read   on storage.objects;
drop policy if exists maker_assets_obj_insert on storage.objects;
drop policy if exists maker_assets_obj_delete on storage.objects;

create policy maker_assets_obj_read on storage.objects
  for select to authenticated
  using (bucket_id = 'maker-assets' and public.is_admin());

create policy maker_assets_obj_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'maker-assets' and public.is_admin());

create policy maker_assets_obj_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'maker-assets' and public.is_admin());

-- =============================================================
--  ⚠️ 위 create policy 가 "must be owner of table objects" 로 실패하면
--     대시보드 → Storage → maker-assets → Policies 에서 같은 내용을 만드세요.
--       SELECT · INSERT · DELETE  대상 authenticated   조건: (select public.is_admin())
-- =============================================================
