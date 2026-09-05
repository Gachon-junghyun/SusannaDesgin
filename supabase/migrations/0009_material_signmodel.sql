-- 0009_material_signmodel.sql — 재질(전체 58종) + 간판 종류 9가지(가격 포함) 구역 추가
--
-- 무엇: `content_blocks` 에 `section = 'material'` 과 `section = 'sign_model'` 을
--       허용하고 초기 데이터를 넣습니다. 새 표를 만들지 않습니다 — 0005 가
--       "한 표에 구역을 나눠 담는다" 로 정해 뒀고, 표를 늘리면 관리자 화면(F19)·
--       폴백·RLS 가 한 벌씩 더 생깁니다.
--
-- 왜:   2026-09-05. `/products` 에 재질·간판 종류를 코드(`config/content.ts`)에
--       박아 놓고 화면 확인 → 수정 → 재배포를 반복했는데, 대표님이 "내가 관리자
--       화면에서 직접 지우고 가격도 고칠 수 있게 해달라" 고 정했습니다. `product`
--       구역(0008)과 완전히 같은 방식입니다 — 코드 배포 없이 `/admin/content` 에서
--       바로 CRUD 됩니다.
--
-- 칸의 뜻 (재질 구역, `material`):
--   eyebrow  = 재질 대분류 한글명 ("화강석" · "벽돌" · "콘크리트" 등, 11종)
--   title    = 같은 대분류 안에서 이 장을 구분하는 짧은 설명 ("오래된 벽")
--   sub      = 안 씁니다(빈 문자열) — 화면에 글자를 더 안 보여줍니다(사람 지시,
--              "재질 아래에 글씨 아예 없애고"). 관리자 화면에서도 안 보이게
--              `config/sections.ts` 가 이 구역의 `sub` 필드를 뺍니다.
--   points   = 안 씁니다.
--   image_url= 재질 표면 사진 (정사각으로 잘려 나갑니다). **실사진이 아니라
--              애셋의 diffuse 텍스처 스캔입니다** — 화면 문구가 그렇게 밝힙니다 [P6].
--
-- 🔴 **초기 58건은 형제 저장소 `DeGaJa_Agent` 의**
--    `users/hanjeonghyun/domains/susanna/blender/assets/materials`
--    **(ambientCG CC0, 2K 원본) 58종 전부입니다.** 대표님이 "가지고 있는 후보를
--    다 보여주고 관리자 화면에서 직접 골라 지우게 해달라" 고 해서, 큐레이션을
--    미리 하지 않고 전부 넣었습니다. 어떤 걸 남기고 지울지는 `/admin/content?
--    section=material` 에서 사람이 정합니다.
--
-- 칸의 뜻 (간판 종류 9가지 구역, `sign_model`):
--   eyebrow  = 조합 번호 ("T1"~"T9", `SIGNTYPES.md` 의 번호와 그대로 맞춥니다)
--   title    = 방식 이름 ("전면발광 채널")
--   sub      = **가격대**("150만원 ~ 300만원" 같은 자유 문장). 🔴 처음엔 빈
--              문자열입니다 — **실제 가격은 대표님만 압니다, 지어내면 안 됩니다
--              (P6).** 관리자 화면에서 채워 주세요. 비어 있으면 화면에 "가격
--              확인 필요" 로 뜹니다(빈 칸을 손님에게 숫자처럼 보여주지 않습니다).
--   points   = 제작 사양 한 줄(과거 "알루미늄 80mm · 직부착 · 앞면만 빛난다").
--              참고용으로 남겨 뒀습니다 — 화면엔 이제 안 나가고 관리자 화면
--              "제작 사양(참고)" 칸에서만 보입니다.
--   image_url= 3D 렌더 사진. 같은 점포 파사드·같은 재질(화강석)로 고정하고
--              **제작 방식만 바꿔** 9장을 뽑았습니다(`RENDER.md` 의 "변수 하나만
--              바꾼다" 규칙과 같습니다) — 형제 저장소의 522장 렌더 카탈로그 중
--              화강석 계열 9장.
--
-- ⚠️ **가격표를 만든 것이 `reference/reference.md` 부록 A 의 "가격 칸 없음"
--    결정과 부딪힙니다.** 그 결정의 근거(맞춤 제작이라 정가가 성립하지 않음,
--    아트네온도 목록에 가격을 안 띄움)는 여전히 유효합니다 — 다만 대표님이
--    "그래도 대략의 폭은 보여주고 싶다" 고 **알면서 뒤집은 결정**입니다.
--    `sub` 를 자유 문장으로 열어 둔 것도 그래서입니다("150만원~" 처럼 확정 가격이
--    아니라 폭·조건을 적을 수 있게).

alter table public.content_blocks
  drop constraint if exists content_blocks_section_check;

alter table public.content_blocks
  add constraint content_blocks_section_check check (
    section in (
      'copy', 'why', 'stat', 'process', 'fabrication', 'sign_type', 'product',
      'material', 'sign_model'
    )
  );

-- ── 재질 58종 ──────────────────────────────────────────────────
insert into public.content_blocks (section, slug, eyebrow, title, sub, points, image_url, alt, sort_order)
select 'material', v.slug, v.eyebrow, v.title, '', '{}', v.image_url, v.alt, v.sort_order
from (values
  ('brick-bricks038', '벽돌', '오래된 벽', '/images/material-brick-bricks038.jpg', '벽돌 재질 표면 (오래된 벽)', 10),
  ('brick-bricks051', '벽돌', '모던 주황', '/images/material-brick-bricks051.jpg', '벽돌 재질 표면 (모던 주황)', 20),
  ('brick-bricks074', '벽돌', '패치워크', '/images/material-brick-bricks074.jpg', '벽돌 재질 표면 (패치워크)', 30),
  ('brick-bricks075a', '벽돌', '베이지 옐로우', '/images/material-brick-bricks075a.jpg', '벽돌 재질 표면 (베이지 옐로우)', 40),
  ('brick-bricks075b', '벽돌', '낡은 이끼낀', '/images/material-brick-bricks075b.jpg', '벽돌 재질 표면 (낡은 이끼낀)', 50),
  ('brick-bricks084', '벽돌', '베이지 사암', '/images/material-brick-bricks084.jpg', '벽돌 재질 표면 (베이지 사암)', 60),
  ('brick-bricks085', '벽돌', '공장풍 레드', '/images/material-brick-bricks085.jpg', '벽돌 재질 표면 (공장풍 레드)', 70),
  ('brick-bricks097', '벽돌', '브라운 파손된', '/images/material-brick-bricks097.jpg', '벽돌 재질 표면 (브라운 파손된)', 80),
  ('concrete-concrete013', '콘크리트', '거친 벽', '/images/material-concrete-concrete013.jpg', '콘크리트 재질 표면 (거친 벽)', 90),
  ('concrete-concrete025', '콘크리트', '그레이 밝은', '/images/material-concrete-concrete025.jpg', '콘크리트 재질 표면 (그레이 밝은)', 100),
  ('concrete-concrete037', '콘크리트', '거친', '/images/material-concrete-concrete037.jpg', '콘크리트 재질 표면 (거친)', 110),
  ('concrete-concrete040', '콘크리트', '브라운 거친', '/images/material-concrete-concrete040.jpg', '콘크리트 재질 표면 (브라운 거친)', 120),
  ('concrete-concrete045', '콘크리트', '인더스트리얼 모던', '/images/material-concrete-concrete045.jpg', '콘크리트 재질 표면 (인더스트리얼 모던)', 130),
  ('concrete-rock025', '콘크리트', '절벽 암석', '/images/material-concrete-rock025.jpg', '콘크리트 재질 표면 (절벽 암석)', 140),
  ('facade-facade001', '파사드', '빌딩 유리 1', '/images/material-facade-facade001.jpg', '파사드 재질 표면 (빌딩 유리 1)', 150),
  ('facade-facade005', '파사드', '빌딩 유리 2', '/images/material-facade-facade005.jpg', '파사드 재질 표면 (빌딩 유리 2)', 160),
  ('facade-facade006', '파사드', '빌딩 유리 3', '/images/material-facade-facade006.jpg', '파사드 재질 표면 (빌딩 유리 3)', 170),
  ('facade-facade009', '파사드', '빌딩 유리 4', '/images/material-facade-facade009.jpg', '파사드 재질 표면 (빌딩 유리 4)', 180),
  ('facade-facade017', '파사드', '야간 고층', '/images/material-facade-facade017.jpg', '파사드 재질 표면 (야간 고층)', 190),
  ('facade-paintedplaster006', '파사드', '파손 도장', '/images/material-facade-paintedplaster006.jpg', '파사드 재질 표면 (파손 도장)', 200),
  ('granite-granite001a', '화강석', '카운터탑 1', '/images/material-granite-granite001a.jpg', '화강석 재질 표면 (카운터탑 1)', 210),
  ('granite-granite002a', '화강석', '카운터탑 2', '/images/material-granite-granite002a.jpg', '화강석 재질 표면 (카운터탑 2)', 220),
  ('granite-granite002b', '화강석', '카운터탑 3', '/images/material-granite-granite002b.jpg', '화강석 재질 표면 (카운터탑 3)', 230),
  ('granite-granite005a', '화강석', '카운터탑 4', '/images/material-granite-granite005a.jpg', '화강석 재질 표면 (카운터탑 4)', 240),
  ('granite-granite005b', '화강석', '카운터탑 5', '/images/material-granite-granite005b.jpg', '화강석 재질 표면 (카운터탑 5)', 250),
  ('ground-asphalt015', '바닥', '아스팔트 그레이 1', '/images/material-ground-asphalt015.jpg', '바닥 재질 표면 (아스팔트 그레이 1)', 260),
  ('ground-asphalt023s', '바닥', '아스팔트 그레이 2', '/images/material-ground-asphalt023s.jpg', '바닥 재질 표면 (아스팔트 그레이 2)', 270),
  ('ground-asphalt031', '바닥', '아스팔트 그레이 3', '/images/material-ground-asphalt031.jpg', '바닥 재질 표면 (아스팔트 그레이 3)', 280),
  ('ground-rocks022', '바닥', '자갈 암석', '/images/material-ground-rocks022.jpg', '바닥 재질 표면 (자갈 암석)', 290),
  ('marble-marble006', '대리석', '그레이 석재', '/images/material-marble-marble006.jpg', '대리석 재질 표면 (그레이 석재)', 300),
  ('marble-marble012', '대리석', '그레이', '/images/material-marble-marble012.jpg', '대리석 재질 표면 (그레이)', 310),
  ('marble-marble016', '대리석', '반사', '/images/material-marble-marble016.jpg', '대리석 재질 표면 (반사)', 320),
  ('metal-corrugatedsteel009', '금속', '골강판 그레이', '/images/material-metal-corrugatedsteel009.jpg', '금속 재질 표면 (골강판 그레이)', 330),
  ('metal-diamondplate009', '금속', '다이아몬드 플레이트', '/images/material-metal-diamondplate009.jpg', '금속 재질 표면 (다이아몬드 플레이트)', 340),
  ('metal-metal007', '금속', '스틸 1', '/images/material-metal-metal007.jpg', '금속 재질 표면 (스틸 1)', 350),
  ('metal-metal009', '금속', '스틸 2', '/images/material-metal-metal009.jpg', '금속 재질 표면 (스틸 2)', 360),
  ('metal-metal032', '금속', '그레이 매끈', '/images/material-metal-metal032.jpg', '금속 재질 표면 (그레이 매끈)', 370),
  ('metal-metal046b', '금속', '낡은', '/images/material-metal-metal046b.jpg', '금속 재질 표면 (낡은)', 380),
  ('metal-metalwalkway014', '금속', '보도', '/images/material-metal-metalwalkway014.jpg', '금속 재질 표면 (보도)', 390),
  ('paint-concrete034', '도장·미장', '그레이 밝은', '/images/material-paint-concrete034.jpg', '도장·미장 재질 표면 (그레이 밝은)', 400),
  ('paint-paintedplaster017', '도장·미장', '도장 미장', '/images/material-paint-paintedplaster017.jpg', '도장·미장 재질 표면 (도장 미장)', 410),
  ('paint-paintedplaster018', '도장·미장', '파손된 도장', '/images/material-paint-paintedplaster018.jpg', '도장·미장 재질 표면 (파손된 도장)', 420),
  ('paint-plaster001', '도장·미장', '모던 미장', '/images/material-paint-plaster001.jpg', '도장·미장 재질 표면 (모던 미장)', 430),
  ('paint-plaster007', '도장·미장', '파손 오래된', '/images/material-paint-plaster007.jpg', '도장·미장 재질 표면 (파손 오래된)', 440),
  ('rust-metal021', '녹슨 금속', '오래된 1', '/images/material-rust-metal021.jpg', '녹슨 금속 재질 표면 (오래된 1)', 450),
  ('rust-metal022', '녹슨 금속', '오래된 2', '/images/material-rust-metal022.jpg', '녹슨 금속 재질 표면 (오래된 2)', 460),
  ('rust-metal024', '녹슨 금속', '오래된 3', '/images/material-rust-metal024.jpg', '녹슨 금속 재질 표면 (오래된 3)', 470),
  ('rust-metal025', '녹슨 금속', '오래된 4', '/images/material-rust-metal025.jpg', '녹슨 금속 재질 표면 (오래된 4)', 480),
  ('tile-pavingstones130', '타일', '포장 석재', '/images/material-tile-pavingstones130.jpg', '타일 재질 표면 (포장 석재)', 490),
  ('tile-pavingstones136', '타일', '그레이 모던', '/images/material-tile-pavingstones136.jpg', '타일 재질 표면 (그레이 모던)', 500),
  ('tile-tiles038', '타일', '낡은 그레이', '/images/material-tile-tiles038.jpg', '타일 재질 표면 (낡은 그레이)', 510),
  ('tile-tiles098', '타일', '포장', '/images/material-tile-tiles098.jpg', '타일 재질 표면 (포장)', 520),
  ('tile-tiles130', '타일', '파손 오래된', '/images/material-tile-tiles130.jpg', '타일 재질 표면 (파손 오래된)', 530),
  ('wood-bark014', '목재', '나무껍질 브라운', '/images/material-wood-bark014.jpg', '목재 재질 표면 (나무껍질 브라운)', 540),
  ('wood-planks009', '목재', '오래된 판재', '/images/material-wood-planks009.jpg', '목재 재질 표면 (오래된 판재)', 550),
  ('wood-planks021', '목재', '브라운 판재', '/images/material-wood-planks021.jpg', '목재 재질 표면 (브라운 판재)', 560),
  ('wood-wood092', '목재', '브라운 주황', '/images/material-wood-wood092.jpg', '목재 재질 표면 (브라운 주황)', 570),
  ('wood-woodsiding009', '목재', '판재 사이딩', '/images/material-wood-woodsiding009.jpg', '목재 재질 표면 (판재 사이딩)', 580)
) as v(slug, eyebrow, title, image_url, alt, sort_order)
where not exists (
  select 1 from public.content_blocks where section = 'material'
);

-- ── 간판 종류 9가지 (T1~T9) ────────────────────────────────────
-- 🔴 sub(가격대)는 일부러 빈 문자열입니다 — 실제 숫자는 대표님이 관리자
--    화면에서 채웁니다. 화면은 빈 값을 "가격 확인 필요" 로 보여줍니다(P6).
insert into public.content_blocks (section, slug, eyebrow, title, sub, points, image_url, alt, sort_order)
select 'sign_model', v.slug, v.code, v.title, '', array[v.spec], v.image_url, v.alt, v.sort_order
from (values
  ('channel-front', 'T1', '전면발광 채널', '알루미늄 80mm · 직부착 · 앞면만 빛남',
   '/images/type-channel-front.jpg', '전면발광 채널 3D 렌더', 10),
  ('channel-halo', 'T2', '후광 채널', '60mm · 벽 이격 60mm · 빛이 벽으로 샘',
   '/images/type-channel-halo.jpg', '후광 채널 3D 렌더', 20),
  ('channel-both', 'T3', '전후면 발광', '90mm · 벽 이격 50mm · 앞뒤로 빛남',
   '/images/type-channel-both.jpg', '전후면 발광 3D 렌더', 30),
  ('scasi', 'T4', '무점등 스카시', '20mm · 벽 이격 30mm · 그림자로 읽힘',
   '/images/type-scasi.jpg', '무점등 스카시 3D 렌더', 40),
  ('facade', 'T5', '외벽사인 · 파사드', '갈바 통판 위에 전광 채널',
   '/images/type-facade.jpg', '외벽사인 파사드 3D 렌더', 50),
  ('projecting', 'T6', '돌출간판', '벽에서 1.15m 직각으로',
   '/images/type-projecting.jpg', '돌출간판 3D 렌더', 60),
  ('rooftop', 'T7', '옥상광고탑', '옥상 철골 구조 · 사전 심의 대상',
   '/images/type-rooftop.jpg', '옥상광고탑 3D 렌더', 70),
  ('hanging', 'T8', '행잉형', '처마에서 봉 2개로 매닮',
   '/images/type-hanging.jpg', '행잉형 3D 렌더', 80),
  ('bracket', 'T9', '까치발 철문자', '철판 5mm + 환봉 80mm · 무점등',
   '/images/type-bracket.jpg', '까치발 철문자 3D 렌더', 90)
) as v(slug, code, title, spec, image_url, alt, sort_order)
where not exists (
  select 1 from public.content_blocks where section = 'sign_model'
);
