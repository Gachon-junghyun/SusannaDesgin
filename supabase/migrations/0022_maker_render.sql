-- 0022_maker_render.sql — 수산나 픽 «모델링»: 손님이 바꾸면 블렌더가 그 자리에서 다시 그립니다 (F26-n · 2026-10-25)
--
-- 무엇: 손님이 공유 링크(`/maker/s/<토큰>`)의 «모델링» 화면에서 크기·굵기·여백·위치·색을 바꾸면, 브라우저가 지금 모양
--       (글자·로고 외곽선 mm, 판 크기·색, 종류의 두께)을 이 표에 한 줄 넣습니다. **이 PC 에서 켜 둔 블렌더 일꾼**이
--       그 줄을 가져가(PC 가 물어보러 나갑니다 — PC 는 포트를 안 엽니다) EEVEE 로 한 장 그려 JPG 를 같은 줄에 넣고,
--       손님 화면이 그걸 받아 보여 줍니다.
--
-- 왜:   2026-10-25 사람 결정 — *"블랜더 렌더는 사용자에서 돌려야 자기가 바꾼 걸 바로 보지, 시간만 체크해서 가능한지 보고 결정하자"*
--       → 실측(RTX 3080, Blender 5.2, 뮤제드폴 판 + 5mm 글자): 켜 둔 블렌더에서 **글자 바꿔 넣고 1280×720 한 장 0.28초** →
--       *"모델링은 왜 아직 안 넣었어? 너가 넣어"*.
--
-- 🔴 **익명에게 표 권한을 한 줄도 안 줍니다.** 문은 함수 넷이고 스스로 막습니다:
--    · 손님 쪽 둘(`request_maker_render` · `get_maker_render`)은 **살아 있는 링크의 토큰**이 있어야 하고, 자기 링크의 줄만 봅니다.
--      한 링크에 1분 40장, 전체 대기 60장을 넘으면 거절(`null`). 같은 링크의 «아직 안 그린 옛 요청»은 새 요청이 오면 버립니다
--      (슬라이더를 끄는 동안 쌓인 중간 모양을 다 그리지 않게). 10분 지난 줄은 지웁니다(그림은 DB 에 오래 두지 않습니다).
--    · 일꾼 쪽 둘(`claim_maker_render` · `finish_maker_render`)은 **일꾼 열쇠**가 있어야 합니다. 열쇠 원문은 이 PC 의
--      `.env.local`(`MAKER_RENDER_KEY`)에만 있고, DB 에는 sha256 만 둡니다(`maker_render_worker.key_hash`, 아래 «열쇠 넣기»).
-- 🔴 **일꾼이 받는 것은 숫자·경로·색뿐입니다** — 블렌더 스크립트(`scripts/maker-render/blender_worker.py`)는 정해진 칸만 읽고,
--    문자열을 코드로 실행하지 않습니다. 사진은 여전히 안 들어옵니다(P7).
-- ⚠️ **PC 가 꺼져 있으면 아무도 안 그립니다.** 그래서 일꾼이 물어보러 올 때마다 `last_seen` 을 남기고, 손님 화면은 그 시각으로
--    «모델링 서버가 꺼져 있습니다»를 정직하게 말합니다.
--
-- 실행: Supabase 대시보드 → SQL Editor → 붙여넣고 RUN. 0013 이 먼저여야 합니다. 여러 번 실행해도 안전합니다.
-- 열쇠 넣기(따로, 원문 말고 해시만): update public.maker_render_worker set key_hash = '<sha256 hex>' where id = 1;

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.maker_renders (
  id         uuid primary key default gen_random_uuid(),
  share_id   uuid not null references public.maker_shares (id) on delete cascade,
  payload    jsonb not null,
  status     text not null default 'queued',
  jpg        text,
  error      text not null default '',
  ms         int,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  done_at    timestamptz,
  constraint maker_renders_status check (status in ('queued', 'busy', 'done', 'error', 'dropped')),
  constraint maker_renders_payload_size check (octet_length(payload::text) <= 900000),
  constraint maker_renders_jpg_size check (jpg is null or octet_length(jpg) <= 800000)
);
create index if not exists maker_renders_queue_idx on public.maker_renders (status, created_at);
create index if not exists maker_renders_share_idx on public.maker_renders (share_id, created_at desc);

alter table public.maker_renders enable row level security;
drop policy if exists maker_renders_admin_all on public.maker_renders;
create policy maker_renders_admin_all on public.maker_renders for all using (public.is_admin()) with check (public.is_admin());
revoke all on public.maker_renders from anon;

-- 일꾼 한 대(이 PC) — 열쇠 해시와 마지막으로 물어보러 온 시각
create table if not exists public.maker_render_worker (
  id        int primary key default 1,
  key_hash  text not null default '',
  last_seen timestamptz,
  constraint maker_render_worker_one check (id = 1)
);
insert into public.maker_render_worker (id) values (1) on conflict (id) do nothing;
alter table public.maker_render_worker enable row level security;
drop policy if exists maker_render_worker_admin_all on public.maker_render_worker;
create policy maker_render_worker_admin_all on public.maker_render_worker for all using (public.is_admin()) with check (public.is_admin());
revoke all on public.maker_render_worker from anon;

/* ---------------------------------------------------------------- 손님 쪽 */

create or replace function public.request_maker_render(p_token text, p_payload jsonb)
returns uuid
language plpgsql volatile security definer set search_path = public
as $$
declare
  v_share uuid;
  v_id    uuid;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{32}$' then return null; end if;
  select s.id into v_share from public.maker_shares s where s.token = p_token and s.expires_at > now();
  if v_share is null then return null; end if;
  if jsonb_typeof(p_payload) is distinct from 'object' or jsonb_typeof(p_payload -> 'items') is distinct from 'array' then return null; end if;
  if jsonb_array_length(p_payload -> 'items') not between 1 and 200 then return null; end if;
  if octet_length(p_payload::text) > 900000 then return null; end if;
  if p_payload::text ~* '"(data|blob):' then return null; end if;

  delete from public.maker_renders r where r.created_at < now() - interval '10 minutes';
  if (select count(*) from public.maker_renders r where r.share_id = v_share and r.created_at > now() - interval '1 minute') >= 40 then return null; end if;
  if (select count(*) from public.maker_renders r where r.status = 'queued') >= 60 then return null; end if;

  update public.maker_renders r set status = 'dropped', payload = '{"items":[]}'::jsonb where r.share_id = v_share and r.status = 'queued';
  insert into public.maker_renders (share_id, payload) values (v_share, p_payload) returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.get_maker_render(p_token text, p_id uuid)
returns table (status text, jpg text, ms int, worker_seen timestamptz)
language sql stable security definer set search_path = public
as $$
  select r.status, case when r.status = 'done' then r.jpg end, r.ms, (select w.last_seen from public.maker_render_worker w where w.id = 1)
    from public.maker_renders r
    join public.maker_shares s on s.id = r.share_id
   where p_token ~ '^[0-9a-f]{32}$' and s.token = p_token and s.expires_at > now() and r.id = p_id
   limit 1;
$$;

/* ---------------------------------------------------------------- 일꾼 쪽 (열쇠) */

create or replace function public.claim_maker_render(p_key text)
returns table (id uuid, payload jsonb)
language plpgsql volatile security definer set search_path = public, extensions
as $$
#variable_conflict use_column
declare
  v_ok boolean;
begin
  select w.key_hash <> '' and w.key_hash = encode(extensions.digest(convert_to(coalesce(p_key, ''), 'UTF8'), 'sha256'), 'hex')
    into v_ok from public.maker_render_worker w where w.id = 1;
  if not coalesce(v_ok, false) then return; end if;
  -- 쉴 때도 몇 초마다 물어보러 오므로, 표에 남기는 건 10초에 한 번까지
  update public.maker_render_worker w set last_seen = now() where w.id = 1 and (w.last_seen is null or w.last_seen < now() - interval '10 seconds');
  return query
    update public.maker_renders r set status = 'busy', started_at = now()
     where r.id = (select q.id from public.maker_renders q where q.status = 'queued' order by q.created_at limit 1 for update skip locked)
    returning r.id, r.payload;
end;
$$;

create or replace function public.finish_maker_render(p_key text, p_id uuid, p_jpg text, p_ms int, p_error text)
returns boolean
language plpgsql volatile security definer set search_path = public, extensions
as $$
declare
  v_ok boolean;
begin
  select w.key_hash <> '' and w.key_hash = encode(extensions.digest(convert_to(coalesce(p_key, ''), 'UTF8'), 'sha256'), 'hex')
    into v_ok from public.maker_render_worker w where w.id = 1;
  if not coalesce(v_ok, false) then return false; end if;
  update public.maker_renders r
     set status = case when coalesce(p_error, '') = '' and p_jpg is not null then 'done' else 'error' end,
         jpg = left(p_jpg, 800000), ms = p_ms, error = left(coalesce(p_error, ''), 500), done_at = now(), payload = '{"items":[]}'::jsonb
   where r.id = p_id and r.status = 'busy';
  return found;
end;
$$;

revoke all on function public.request_maker_render(text, jsonb) from public;
revoke all on function public.get_maker_render(text, uuid) from public;
revoke all on function public.claim_maker_render(text) from public;
revoke all on function public.finish_maker_render(text, uuid, text, int, text) from public;
grant execute on function public.request_maker_render(text, jsonb) to anon, authenticated;
grant execute on function public.get_maker_render(text, uuid) to anon, authenticated;
grant execute on function public.claim_maker_render(text) to anon, authenticated;
grant execute on function public.finish_maker_render(text, uuid, text, int, text) to anon, authenticated;
