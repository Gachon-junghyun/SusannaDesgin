-- =============================================================
--  견적 문의 첨부파일 실제 보관
--
--  왜 필요한가:
--    0002 까지는 첨부파일의 **이름과 크기만** 기록하고 파일 자체는 버렸습니다.
--    고객이 도면·현판 예시 사진을 올려도 회사는 볼 수 없어서, 다시 보내
--    달라고 연락해야 했습니다. 2026-08-03 연구개발특구진흥재단 문의에서
--    실제로 사진 2장이 그렇게 사라졌습니다.
--
--    간판 견적은 사진 한 장이 곧 사양서입니다. 그걸 못 받으면 견적을 못 냅니다.
--
--  실행: Supabase 대시보드 → SQL Editor → 붙여넣고 RUN
--  여러 번 실행해도 안전합니다.
-- =============================================================

-- -------------------------------------------------------------
-- 버킷 — **비공개**
--
--   'media' 버킷(0001)은 공개입니다. 홈페이지에 그대로 걸리는 사진이니까요.
--   여기는 반대입니다. 고객 도면·매장 사진·개인정보가 들어오므로 주소를
--   아는 것만으로 열려선 안 됩니다. 관리자가 볼 때마다 **서명 URL**(수명 있는
--   임시 주소)을 새로 발급하는 방식으로 갑니다.
-- -------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('quote-files', 'quote-files', false, 10485760)   -- 10MB = lib/validate.ts MAX_FILE_BYTES
on conflict (id) do update
  set public = false,
      file_size_limit = 10485760;


-- -------------------------------------------------------------
-- 권한
--   · 누구나 올릴 수 있어야 합니다 (홈페이지 문의 폼은 로그인이 없습니다)
--   · 올라간 파일은 관리자만 봅니다  [원칙 A2]
--
--   quotes 테이블(0002)과 같은 모양입니다 — "넣기는 누구나, 읽기는 관리자만".
--   조회 정책이 anon 에 없으므로, 익명 키를 쥐고 경로를 안다 해도 못 읽습니다.
-- -------------------------------------------------------------
drop policy if exists quote_files_public_insert on storage.objects;
drop policy if exists quote_files_admin_read    on storage.objects;
drop policy if exists quote_files_admin_delete  on storage.objects;

create policy quote_files_public_insert on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'quote-files');

create policy quote_files_admin_read on storage.objects
  for select to authenticated
  using (bucket_id = 'quote-files' and public.is_admin());

-- 문의를 지우면 첨부도 같이 지웁니다 (개인정보처리방침 보유기간 준수)
create policy quote_files_admin_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'quote-files' and public.is_admin());


-- =============================================================
--  ⚠️ 위 create policy 가 "must be owner of table objects" 로 실패하면
--     (일부 프로젝트에서 SQL Editor 역할이 storage.objects 소유자가 아닙니다)
--     대시보드 → Storage → quote-files → Policies 에서 같은 내용을 만드세요.
--
--       INSERT  대상 anon, authenticated   조건: 없음(전체 허용)
--       SELECT  대상 authenticated         조건: (select public.is_admin())
--       DELETE  대상 authenticated         조건: (select public.is_admin())
-- =============================================================
