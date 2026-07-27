-- =============================================================
--  주요실적 — 회사소개서 사진 투입에 따른 정리 (2026-07-27)
--  Supabase 대시보드 → SQL Editor 에 이 파일 전체를 붙여넣고 RUN 하세요.
--  두 번 실행해도 안전합니다.
--
--  이 마이그레이션이 하는 일은 두 가지입니다.
--
--  1) 새 현장 2건 추가 — 회사소개서에는 있었는데 기존 15건 목록에 없던 현장입니다.
--  2) **사진이 없는 4건을 목록 맨 뒤로** 보냅니다.
--
--  (2) 가 필요한 이유: 회사소개서에서 11건의 사진을 넣었지만
--  교보생명·우리은행·KT 탄방타워는 원본이 4장 합쳐진 띠 이미지라 435×276 밖에
--  안 나오고, 뉴코아 아울렛은 사진 자체가 없습니다. 이 넷이 목록 중간에
--  회색 상자로 남아 있으면 **사진 있는 실적 사이에 구멍이 뚫려 보입니다.**
--  규칙은 그대로 "사진 있는 실적을 앞에" 입니다.
--
--  ⚠️ 실행 전에 `public/images/work-22.jpg` `work-23.jpg` 가 배포에 포함돼
--     있어야 합니다. 파일이 없으면 회색 플레이스홀더가 뜹니다.
--     (같은 내용이 config/content.ts 에도 있습니다 — DB 를 못 읽을 때의 폴백)
-- =============================================================

-- 1) 새 현장 2건 — sort_order 7,8 은 0003 의 6건(1~6) 바로 뒤입니다.
insert into public.works (title, category, location, tags, image_url, sort_order)
select v.*
from (values
  ('청주 가경 아이파크 2단지 사인물', '주거',     '청주', array['단지 사인','고소작업'],   '/images/work-22.jpg', 7),
  ('홈센터 실내 사인물',             '상업시설', '',     array['실내 사인','채널 간판'],  '/images/work-23.jpg', 8)
) as v(title, category, location, tags, image_url, sort_order)
where not exists (
  select 1 from public.works w where w.title = v.title
);

-- 2) 사진 없는 4건을 맨 뒤로. 제목으로 찾으므로 여러 번 실행해도 결과가 같습니다.
update public.works set sort_order = 200 where title = '교보생명 옥상 광고탑';
update public.works set sort_order = 210 where title = '우리은행 사인물';
update public.works set sort_order = 220 where title = 'KT 탄방타워 사인물';
update public.works set sort_order = 230 where title = '뉴코아 아울렛 사인물';

-- 확인용 — 실행 후 23행이고, 마지막 4건이 위 넷이면 정상입니다.
-- select sort_order, title, image_url from public.works order by sort_order;
