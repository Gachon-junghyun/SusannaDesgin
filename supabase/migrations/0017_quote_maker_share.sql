-- 0017_quote_maker_share.sql — 견적을 보내면 «디자인 방(공유 링크)»이 저절로 생깁니다
--
-- 무엇: 손님이 메이커에서 «이 디자인으로 무료 견적 받기» → 견적을 **보낼 때** 그 디자인 JSON 으로
--       `maker_shares` 한 줄을 만들고, 그 토큰을 견적 기록(`quotes.maker_token`)에 붙입니다.
--       관리자 견적함과 알림 메일에 «디자인 열기»(`/maker/s/<토큰>`)가 섭니다.
--
-- 왜:   2026-09-26 사람 요청 — *"문의 남길 때 미리보기 사진만 주니까 좀 그런 거 같아. 그 링크 만드는 거,
--       방 만드는 게 자동으로 돼서 관리자가 링크 볼 수 있게."* JPG 한 장은 확대·주야간 전환이 안 됩니다.
--       손님에게는 링크를 안 보여 줍니다(사람 결정: «관리자만 · 90일»). 만료는 0013 의 기본값 90일 그대로입니다.
--
-- 🔴 **익명에게 표 권한을 한 줄도 안 줍니다.** 이 리포엔 service_role 키가 없어서(§6) 서버(견적 API)도
--    익명 키로 돕니다 — 그래서 문은 **함수 하나**(`attach_quote_design`)이고, 그 함수가 스스로 막습니다:
--    ① **방금 들어온 견적 한 건에만** 붙습니다 — 견적 행이 있어야 하고(10분 안), 견적 하나에 방 하나(유일 색인).
--       즉 방을 늘리려면 견적을 늘려야 하고, 견적 넣기는 원래 익명에게 열린 문(0002)이라 **새 표면이 안 넓어집니다.**
--    ② 모양·크기 — 항목 1~100개, 사진 벽 금지, `data:`·`blob:` 금지, 크기(API 는 900KB — `lib/maker/share-check.ts`, DB 는 0013 표 상한 1,000,000)
--    ③ 분당 총량 — 견적에서 생긴 방이 최근 1분에 30개를 넘으면 더 안 만듭니다(견적 자체는 받습니다).
--    견적 API 의 IP 속도 제한(10분 5건)은 그 앞에서 한 번 더 걸립니다.
--    거절은 예외가 아니라 `null` 입니다 — **방을 못 만들어도 견적은 절대 잃지 않습니다**(API 가 그렇게 씁니다).
--
-- 🔴 **가게 사진은 여전히 안 들어옵니다**(P7). 손님 글꼴·이 PC 글꼴 글자는 브라우저에서 외곽선으로 굳혀 옵니다.
-- 🔴 **견적을 지우면 방도 같이 지워집니다**(`on delete cascade`) — 견적 보유 기간 원칙(상담 완료 후 6개월)을 따라갑니다.
--
-- ⚠️ **안 돌려도 견적은 멀쩡합니다** [A1]. 함수가 없으면 API 가 로그에 크게 남기고 JPG·SVG 첨부만으로 접수합니다.
--
-- 실행: Supabase 대시보드 → SQL Editor → 붙여넣고 RUN (**운영 DB 실행은 대표님이 하십니다**). 0013 이 먼저여야 합니다.
-- 여러 번 실행해도 안전합니다.

alter table public.maker_shares
  add column if not exists quote_id uuid references public.quotes (id) on delete cascade;

create unique index if not exists maker_shares_quote_uidx
  on public.maker_shares (quote_id) where quote_id is not null;

alter table public.quotes
  add column if not exists maker_token text not null default '';

create or replace function public.attach_quote_design(p_quote uuid, p_design jsonb, p_title text)
returns text
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_created timestamptz;
  v_token   text;
begin
  select q.created_at into v_created from public.quotes q where q.id = p_quote;
  if v_created is null or v_created < now() - interval '10 minutes' then return null; end if;
  if exists (select 1 from public.maker_shares s where s.quote_id = p_quote) then return null; end if;

  if jsonb_typeof(p_design) is distinct from 'object'
     or jsonb_typeof(p_design -> 'items') is distinct from 'array'
     or jsonb_typeof(p_design -> 'kind') is distinct from 'string' then return null; end if;
  if jsonb_array_length(p_design -> 'items') not between 1 and 100 then return null; end if;
  if p_design ->> 'wall' = 'photo' then return null; end if;
  if octet_length(p_design::text) > 1000000 then return null; end if;  -- jsonb 글자는 공백이 붙어 조금 커집니다(0013 표 상한과 같게)
  if p_design::text ~* '"(data|blob):' then return null; end if;

  if (select count(*) from public.maker_shares s
       where s.quote_id is not null and s.created_at > now() - interval '1 minute') >= 30 then
    return null;
  end if;

  insert into public.maker_shares (title, design, quote_id, created_by)
  values (left(btrim(regexp_replace(coalesce(p_title, ''), '[[:cntrl:]]', ' ', 'g')), 60), p_design, p_quote, null)
  returning token into v_token;

  update public.quotes set maker_token = v_token where id = p_quote;
  return v_token;
end;
$$;

revoke all on function public.attach_quote_design(uuid, jsonb, text) from public;
grant execute on function public.attach_quote_design(uuid, jsonb, text) to anon, authenticated;
