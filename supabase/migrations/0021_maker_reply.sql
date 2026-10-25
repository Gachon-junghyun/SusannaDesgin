-- 0021_maker_reply.sql — 수산나 픽 «보내기»: 손님이 고르고 다듬은 안을 같은 링크로 돌려보냅니다 (F26-n · 2026-10-25)
--
-- 무엇: 손님이 공유 링크(`/maker/s/<토큰>`, 0013)에서 픽 하나를 골라 다듬고 «보내기»를 누르면, 그 모양(디자인 JSON)과
--       «어느 픽 + 무엇을 바꿨나 + 한마디»가 이 표에 한 줄로 들어갑니다. 관리자는 그 줄을 에디터로 열어 고치고,
--       **같은 링크에 다음 차수를 다시 올립니다**(`maker_shares.design` 갱신 — 관리자만, RLS). 손님은 같은 주소를 다시 엽니다.
--
-- 왜:   2026-10-25 사람 요청 — *"견적이 아니라 보내기 버튼으로 바꾸고, 이제 고객이랑 우리랑 왔다갔다 할 때 쓸 거"*.
--       지금까지는 손님 말(«양쪽 여백 10센티씩 글자 좀 더 두껍게»)을 카톡으로 받아 사람이 해석했고, 해석이 세 번 갈렸습니다
--       (뮤제드폴 10/24 — 판 여백 → 끝~끝 100 → 초기 +10mm). 손님이 직접 움직인 «그 모양»이 오면 해석할 것이 줄어듭니다.
--
-- 🔴 **익명에게 표 권한을 한 줄도 안 줍니다.** 문은 함수 하나(`send_maker_reply`)이고, 그 함수가 스스로 막습니다:
--    ① **살아 있는 링크의 토큰**을 알아야 합니다(32자 hex, 만료 전) — 링크를 받은 사람만 보낼 수 있습니다.
--    ② 모양·크기 — 0017 과 같은 문턱(항목 1~100개, 사진 벽 금지, `data:`·`blob:` 금지, 1,000,000 바이트).
--    ③ 횟수 — 한 링크에 하루 20번, 전체 1분에 30번. 넘으면 거절(`null`)하고 화면이 «잠시 뒤»라고 말합니다.
--    API(`/api/maker/reply`)의 IP 속도 제한(10분 10번)이 그 앞에서 한 번 더 걸립니다.
-- 🔴 **가게 사진은 여전히 안 들어옵니다**(P7). 손님이 쓴 «한마디»는 500자까지입니다.
-- 🔴 **링크를 끊으면 답도 같이 지워집니다**(`on delete cascade`).
--
-- ⚠️ **안 돌려도 공유 화면은 멀쩡합니다** [A1]. «보내기»만 «지금은 보내지 못했습니다»를 띄웁니다.
--
-- 실행: Supabase 대시보드 → SQL Editor → 붙여넣고 RUN (**운영 DB 실행은 대표님이 하십니다**). 0013 이 먼저여야 합니다.
-- 여러 번 실행해도 안전합니다.

create table if not exists public.maker_replies (
  id          uuid primary key default gen_random_uuid(),
  share_id    uuid not null references public.maker_shares (id) on delete cascade,
  -- 손님이 본 차수(디자인 JSON 의 round, 없으면 1)
  round       int  not null default 1,
  -- 고른 픽 (0 = A, 1 = B, 2 = C)과 그 이름
  pick        int  not null default 0,
  pick_name   text not null default '',
  -- «손님이 바꾼 것» 한 줄씩(화면이 만든 글) · 손님이 쓴 한마디
  changes     text not null default '',
  memo        text not null default '',
  design      jsonb not null,
  created_at  timestamptz not null default now(),
  -- 관리자가 열어 봤나
  read_at     timestamptz,
  constraint maker_replies_pick check (pick between 0 and 2),
  constraint maker_replies_round check (round between 1 and 999),
  constraint maker_replies_text_len check (char_length(pick_name) <= 80 and char_length(changes) <= 1000 and char_length(memo) <= 500),
  constraint maker_replies_design_size check (octet_length(design::text) <= 1000000)
);

create index if not exists maker_replies_share_idx on public.maker_replies (share_id, created_at desc);
create index if not exists maker_replies_created_idx on public.maker_replies (created_at desc);

alter table public.maker_replies enable row level security;

drop policy if exists maker_replies_admin_all on public.maker_replies;
create policy maker_replies_admin_all on public.maker_replies
  for all using (public.is_admin()) with check (public.is_admin());

revoke all on public.maker_replies from anon;

-- 익명이 닿는 유일한 문 — 살아 있는 링크의 토큰으로만, 한 번에 한 줄
create or replace function public.send_maker_reply(
  p_token text, p_round int, p_pick int, p_pick_name text, p_changes text, p_memo text, p_design jsonb
)
returns timestamptz
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_share uuid;
  v_at    timestamptz;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{32}$' then return null; end if;
  select s.id into v_share from public.maker_shares s where s.token = p_token and s.expires_at > now();
  if v_share is null then return null; end if;

  if jsonb_typeof(p_design) is distinct from 'object'
     or jsonb_typeof(p_design -> 'items') is distinct from 'array'
     or jsonb_typeof(p_design -> 'kind') is distinct from 'string' then return null; end if;
  if jsonb_array_length(p_design -> 'items') not between 1 and 100 then return null; end if;
  if p_design ->> 'wall' = 'photo' then return null; end if;
  if octet_length(p_design::text) > 1000000 then return null; end if;
  if p_design::text ~* '"(data|blob):' then return null; end if;

  if (select count(*) from public.maker_replies r where r.share_id = v_share and r.created_at > now() - interval '1 day') >= 20 then return null; end if;
  if (select count(*) from public.maker_replies r where r.created_at > now() - interval '1 minute') >= 30 then return null; end if;

  insert into public.maker_replies (share_id, round, pick, pick_name, changes, memo, design)
  values (
    v_share,
    greatest(1, least(999, coalesce(p_round, 1))),
    greatest(0, least(2, coalesce(p_pick, 0))),
    left(coalesce(p_pick_name, ''), 80),
    left(coalesce(p_changes, ''), 1000),
    left(coalesce(p_memo, ''), 500),
    p_design
  )
  returning created_at into v_at;
  return v_at;
end;
$$;

revoke all on function public.send_maker_reply(text, int, int, text, text, text, jsonb) from public;
grant execute on function public.send_maker_reply(text, int, int, text, text, text, jsonb) to anon, authenticated;
