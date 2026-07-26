-- =============================================================
--  주요실적 — 사진이 있는 현장 6건 추가 (2026-07-27)
--  Supabase 대시보드 → SQL Editor 에 이 파일 전체를 붙여넣고 RUN 하세요.
--  두 번 실행해도 안전합니다 (제목이 같은 행이 있으면 건너뜁니다).
--
--  ⚠️ 이 SQL 을 실행하기 전에 `public/images/work-16.jpg` ~ `work-21.jpg`
--     가 배포에 포함돼 있어야 합니다. 파일이 없으면 회색 플레이스홀더가 뜹니다.
--     (같은 내용이 config/content.ts 에도 들어 있습니다 — DB 를 못 읽을 때의 폴백)
--
--  sort_order 를 1~6 으로 둔 이유: 기존 15건은 10~150 이라 이 6건이 목록
--  맨 앞에 옵니다. **사진 있는 실적을 앞에 두는 것**이 규칙입니다.
--  목록 첫 화면이 회색 상자면 실적 없는 회사로 보이기 때문입니다.
-- =============================================================

insert into public.works (title, category, location, tags, image_url, sort_order)
select v.*
from (values
  ('빌딩 외벽 사인 고소작업', '기업',      '', array['외부 사인물','고소작업'],       '/images/work-16.jpg', 1),
  ('태평한우',               '상업시설',  '', array['채널 간판','야간 점등'],        '/images/work-17.jpg', 2),
  ('좋은교회',               '생활·문화', '', array['채널 간판','십자가 사인'],      '/images/work-18.jpg', 3),
  ('자자고호텔',             '상업시설',  '', array['후광 채널 사인','실내 사인'],   '/images/work-19.jpg', 4),
  ('커뮤니티 시설 사인',      '생활·문화', '', array['실내 사인','스카시 문자'],      '/images/work-20.jpg', 5),
  ('체육관 실내 사인',        '생활·문화', '', array['실내 사인','스카시 문자'],      '/images/work-21.jpg', 6)
) as v(title, category, location, tags, image_url, sort_order)
where not exists (
  select 1 from public.works w where w.title = v.title
);

-- 확인용 — 실행 후 이 결과가 21행이면 정상입니다.
-- select sort_order, title, category, image_url from public.works order by sort_order;
