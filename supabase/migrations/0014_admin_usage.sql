-- 0014_admin_usage.sql — 관리자 «사용량» 화면이 읽는 함수 하나
--
-- 무엇: `admin_usage()` 가 DB 크기 · 스토리지 버킷별 파일 수와 용량 · 표마다 행 수와 크기 ·
--       로그인 계정 수(최근 30일 활동 포함)를 JSON 한 덩이로 돌려줍니다. 표를 새로 만들지 않습니다.
--
-- 왜:   2026-09-25 사람 요청 — *"supabase 우리 티어로 가능한 량 보여주는 거 모아서"*.
--       무료 요금제 한도(`config/plan.ts`)와 나란히 놓아 «얼마나 남았나»를 관리자 화면에서 봅니다(F27).
--
-- 🔴 **관리자만 부를 수 있습니다.** 함수 안에서 `is_admin()` 을 먼저 보고, 아니면 오류를 냅니다.
--    SECURITY DEFINER 인 이유: 크기·개수를 세려면 `storage.objects`·`auth.users` 를 읽어야 하는데,
--    그 표들은 로그인한 관리자에게도 직접 열려 있지 않습니다. 돌려주는 건 **숫자뿐**입니다 —
--    파일 이름·계정 이메일은 한 글자도 안 나갑니다.
--    익명(anon)에게는 실행 권한 자체를 안 줍니다.
--
-- ⚠️ **SQL 로 못 재는 것**: egress(내보낸 데이터)·Edge 호출·Realtime — Supabase 쪽 계량기에만 있습니다.
--    화면은 그 줄에 «대시보드에서 확인»을 띄웁니다. `service_role`·관리 API 토큰은 쓰지 않습니다(§6).
--
-- 안 돌려도 화면은 안 죽습니다 — 한도 표만 나오고 «0014 를 실행하면 실제 사용량이 보입니다» 를 띄웁니다 [A1].
-- 실행: Supabase 대시보드 → SQL Editor → 붙여넣고 RUN (운영 DB 실행은 대표님이 하십니다). 재실행 안전합니다.

create or replace function public.admin_usage()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  t record;
  n bigint;
  tables jsonb := '[]'::jsonb;
begin
  if not public.is_admin() then
    raise exception '관리자만 볼 수 있습니다' using errcode = '42501';
  end if;

  -- 우리 표마다 정확한 행 수 (표가 작아서 셀 만합니다)
  for t in
    select c.oid, c.relname
      from pg_class c
      join pg_namespace ns on ns.oid = c.relnamespace
     where ns.nspname = 'public' and c.relkind = 'r'
  loop
    execute format('select count(*) from public.%I', t.relname) into n;
    tables := tables || jsonb_build_object('name', t.relname, 'rows', n, 'bytes', pg_total_relation_size(t.oid));
  end loop;

  return jsonb_build_object(
    'db_bytes', pg_database_size(current_database()),
    'storage', coalesce((
      select jsonb_agg(jsonb_build_object('bucket', bucket_id, 'files', files, 'bytes', bytes) order by bytes desc)
        from (
          select bucket_id, count(*) as files, coalesce(sum((metadata ->> 'size')::bigint), 0) as bytes
            from storage.objects
           group by bucket_id
        ) s
    ), '[]'::jsonb),
    'users', (select count(*) from auth.users),
    'active_30d', (select count(*) from auth.users where last_sign_in_at > now() - interval '30 days'),
    'tables', tables,
    'measured_at', now()
  );
end;
$$;

revoke all on function public.admin_usage() from public;
revoke all on function public.admin_usage() from anon;
grant execute on function public.admin_usage() to authenticated;
