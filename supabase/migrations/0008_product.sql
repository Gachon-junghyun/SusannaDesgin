-- 0008_product.sql — 제품(간판 유형) 구역 추가
--
-- 무엇: `content_blocks` 에 `section = 'product'` 를 허용하고 초기 6건을 넣습니다.
--       새 표를 만들지 않습니다 — 0005 가 "한 표에 구역을 나눠 담는다"로 정해 뒀고,
--       표를 늘리면 관리자 화면(F19)·폴백·RLS 가 한 벌씩 더 생깁니다.
--
-- 왜:   2026-08-17. 쿠팡·네이버쇼핑·오늘의집·아트네온(대전 경쟁사) 네 곳의 제품 리스트를
--       실제로 재고 나온 결론입니다 (`reference/reference.md` 부록 A).
--       🔴 **가격 칸이 없는 것이 설계입니다.** 아트네온은 Cafe24 쇼핑몰인데도 목록에
--       가격을 안 띄웁니다 — 맞춤 제작이라 정가가 성립하지 않기 때문입니다.
--       가격을 넣고 싶어지면 칸을 늘리기 전에 그 문서를 먼저 읽으세요.
--
-- 칸의 뜻 (이 구역에서만):
--   eyebrow  = 분류. **화면의 필터 탭이 이 값으로 만들어집니다** (실외 / 실내 / 구조물)
--   title    = 제품 이름 ("채널 간판")
--   sub      = 한 줄 설명
--   points   = 유형 키워드. 카드에서 `채널 간판 | 후광 간판 | 야간 점등` 로 붙습니다
--   image_url= 사진 (정사각으로 잘려 나갑니다)
--
-- ⚠️ 사진은 **한 장씩 실제로 보고** 골랐습니다 (`AGENTS.md` 의 실적 사진 절차와 같은 규칙).
--    처음에 `work-23`(홈센터)·`work-19`(자자고호텔)을 넣었다가 화면에서 보고 바꿨습니다 —
--    앞은 계산대 잡동사니와 날짜 스탬프가 찍혀 제품컷이 안 되고, 뒤는 후광 채널이라
--    채널 간판과 겹쳤습니다. **제품 이름도 사진에 맞춰 고쳤습니다**
--    ("층별 안내·유도 사인" → "실내 사인·스카시 문자") — 보여줄 수 없는 것을
--    이름으로 약속하지 않으려는 것입니다 (P6).
--
-- ⚠️ 초기 6건의 사진은 **기존 실적 사진을 다시 씁니다.** 제품 전용 촬영본이 없어서고,
--    빈 "사진 준비 중" 상자를 여섯 개 내보내지 않으려는 선택입니다 — 그렇게 했다가
--    구역을 통째로 내린 것이 FABRICATION 입니다(2026-08-07).
--    🔴 `public/images/work-NN.jpg` 의 **번호와 현장이 짝**이므로, 그 파일을 다른 현장으로
--    갈아 끼우면 **여기 제품 사진도 같이 바뀝니다.** 제품 전용 사진이 생기면
--    관리자 화면 "제품" 탭에서 갈아 끼우세요(배포 불필요).

alter table public.content_blocks
  drop constraint if exists content_blocks_section_check;

alter table public.content_blocks
  add constraint content_blocks_section_check check (
    section in ('copy', 'why', 'stat', 'process', 'fabrication', 'sign_type', 'product')
  );

-- 이미 넣은 적이 있으면 건너뜁니다 (0005 의 씨앗들과 같은 방식).
insert into public.content_blocks (section, eyebrow, title, sub, points, image_url, alt, sort_order)
select 'product', v.eyebrow, v.title, v.sub, v.points, v.image_url, v.alt, v.sort_order
from (values
  ('실외', '채널 간판',
   '글자 하나하나를 입체로 만들어 LED 를 넣습니다. 야간 점등이 필요한 상가·매장에 씁니다.',
   array['채널 간판', '후광 간판', '야간 점등'],
   '/images/work-17.jpg', '태평한우 채널 간판 야간 점등', 10),

  ('실외', '옥상 광고탑 · 외벽 사인',
   '건물 옥상과 외벽에 올리는 대형 사인입니다. 고소작업차와 로프 작업으로 시공합니다.',
   array['옥상 광고탑', '외벽 사인', '고소작업'],
   '/images/work-16.jpg', '빌딩 외벽 사인 고소작업 현장', 20),

  ('실외', '사옥 · 기업 CI 사인',
   '기업 CI 에 맞춘 사옥 사인입니다. 다점포 CI 교체를 일괄로 진행합니다.',
   array['사옥 사인', 'CI 교체', '다점포 일괄'],
   '/images/work-01.jpg', '삼성화재 사옥 사인 주간', 30),

  ('실내', '로비 사인 · 이미지월',
   '건물 로비의 첫 얼굴이 되는 사인입니다. 인테리어 공정과 맞물려 시공합니다.',
   array['로비 사인', '이미지월', '인테리어 연계'],
   '/images/work-05.jpg', 'K-water 기술 로비 벽면 사인', 40),

  ('실내', '실내 사인 · 스카시 문자',
   '글자를 판재에서 잘라 벽에 띄워 붙입니다. 층별 안내·실명판도 같은 방식으로 맞춥니다.',
   array['스카시 문자', '실내 사인', '층별 안내'],
   '/images/work-20.jpg', '커뮤니티 시설 벽면 스카시 문자', 50),

  ('구조물', '캐노피 · 파사드',
   '사인물을 얹을 구조부터 만듭니다. 구조 검토 후 설계·제작·시공까지 한 곳에서 합니다.',
   array['캐노피', '파사드', '철구조물'],
   '/images/work-07.jpg', '대전무역회관 캐노피', 60)
) as v(eyebrow, title, sub, points, image_url, alt, sort_order)
where not exists (
  select 1 from public.content_blocks where section = 'product'
);
