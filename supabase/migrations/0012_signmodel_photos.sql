-- 0012_signmodel_photos.sql — 간판 종류에 «실제 시공 사진 여러 장» 칸 추가
--
-- 무엇: `content_blocks` 에 `photos text[]` 를 붙이고, 간판 9종에 **우리가 실제로
--       시공한 사진**을 종류별로 나눠 넣습니다. 표를 새로 만들지 않습니다
--       (0005 의 «한 표에 구역을 나눠 담는다» 를 그대로 따릅니다).
--
-- 왜:   2026-09-09. 제품 상세페이지(F24-d)에 사진이 **3D 렌더 한 장**뿐이었습니다.
--       대표님 지시: *"관리자가 사진도 추가할 수 있고, 기본적으로 주요시공한 거를
--       옆으로 넘겨볼 수 있게."* 그래서 ① 여러 장을 담을 칸을 만들고 ② 좌우로
--       넘기는 슬라이더를 붙였습니다(`components/PhotoCarousel.tsx`).
--
-- 칸의 뜻:
--   photos = 이 간판 종류로 **실제 시공한 사진**의 주소 배열. 순서가 곧 화면 순서입니다.
--            🔴 **대표 사진(`image_url`, 3D 렌더)은 여기 넣지 않습니다.** 화면이
--            «렌더 1장 + 이 목록» 순서로 이어 붙이므로 넣으면 같은 사진이 두 번 나옵니다.
--            빈 배열이면 슬라이더가 안 서고 렌더 한 장만 그대로 보입니다.
--
-- 🔴 **어디서 골랐나 — 「지금 살아 있는 실적 사진」에서만 골랐습니다** (사람 지시:
--    *"내린 사진은 여기에도 넣으면 안 되고"*). 스토리지 버킷을 통째로 긁지 않았습니다.
--    실적을 지워도 **스토리지의 파일은 남기 때문에**(§7 고아 파일) 버킷에는 화면에서
--    내린 사진이 섞여 있습니다. 그래서 **운영 `/works` 가 실제로 그리고 있는 주소**
--    (= `works.published = true`)만 대상으로 삼았습니다. 21건 중에서 골랐습니다.
--    ⚠️ 같은 이유로 **`work-23`(홈센터)은 뺐습니다** — 2026-08-17 에 제품 카드에서
--    이미 한 번 내린 사진입니다(계산대 잡동사니·날짜 스탬프).
--    ⚠️ **`work-07`(주차장 캐노피)·영림중문(시트 그래픽)도 뺐습니다** — 9종 어디에도
--    안 들어가는 작업입니다. 억지로 끼우면 «이 방식이다» 라는 틀린 말이 됩니다.
--
-- 🔴 **분류 근거 — 사진을 «한 장씩 열어 보고» 갈랐습니다** [P6]. 태그로는 안 갈립니다.
--    `works` 의 태그는 「채널 간판」까지만 말하는데, 전면발광(T1)이냐 후광(T2)이냐는
--    **빛이 어디로 나오는지**로 갈리고 그건 사진에만 있습니다.
--      · T1 전면발광  글자 «앞면» 이 밝게 빛남
--      · T2 후광      글자 «뒤» 로 빛이 새어 벽이 밝음 (자자고호텔·청춘예찬·이음마루)
--      · T4 무점등    빛 없이 입체만. 그림자로 읽힘
--      · T5 파사드    판을 먼저 세우고 그 «위에» 글자 (태평한우·기시맹·식생활교육관)
--      · T7 옥상      건물 옥상 위에 올라간 것 (삼성화재)
--      · T9 까치발    환봉으로 띄운 무점등 철문자. 브라켓이 보임 (커뮤니티 시설)
--
-- ⚠️ **T3(전후면 발광)·T6(돌출간판)·T8(행잉형)은 비워 뒀습니다.** 지금 실적 사진에
--    그 방식이 **확실하게 찍힌 장이 없습니다.** 비슷해 보이는 걸 끼워 넣으면
--    «이렇게 해준다» 는 약속이 되는데, 그게 실제로 그 방식인지 확인할 길이 없습니다
--    [P6]. 사진이 생기면 대표님이 관리자 화면에서 추가하면 됩니다.
--    ⚠️ `work-09`(kt plaza) 에 돌출간판이 찍혀 있지만 **우리 시공물이 아닙니다**(옆 은행).
--
-- ⚠️ **이미 채워진 목록은 안 덮어씁니다** (`where photos = '{}'`).
--    대표님이 관리자 화면에서 사진을 고른 뒤 이 파일을 다시 돌려도 안 날아갑니다.
--
-- 실행: Supabase 대시보드 → SQL Editor → 붙여넣고 RUN. 재실행 안전합니다.

alter table public.content_blocks
  add column if not exists photos text[] not null default '{}';


update public.content_blocks as b
   set photos = v.photos
  from (values
    -- T1 전면발광 채널 — 글자 «앞면» 이 빛나는 것만
    ('channel-front', array[
      '/images/work-16.jpg',  -- 빌딩 외벽 대형 채널 (고소작업 시공 장면)
      'https://xeecqpiowqgacdstwjae.supabase.co/storage/v1/object/public/media/a37619b7-9ae9-431c-84b2-84b572831461.jpg',  -- 라온카페 (공장 점등 시험)
      '/images/work-10.jpg',  -- 금성백조 사옥 (야간)
      '/images/work-13.jpg',  -- 힐스테이트 (야간)
      'https://xeecqpiowqgacdstwjae.supabase.co/storage/v1/object/public/media/da7d82a2-763b-46c9-896a-e0a61ef49ed7.jpg',  -- belkin · NEWNESS (실내)
      '/images/work-18.jpg',  -- 좋은교회
      '/images/work-14.jpg'   -- 칼릭스빌딩
    ]),

    -- T2 후광 채널 — 글자 뒤로 빛이 새어 벽이 밝은 것
    ('channel-halo', array[
      'https://xeecqpiowqgacdstwjae.supabase.co/storage/v1/object/public/media/095bcc78-dbc3-4021-a9d0-212e6bfadcd3.jpg',  -- 청춘예찬
      '/images/work-19.jpg',  -- 자자고호텔
      'https://xeecqpiowqgacdstwjae.supabase.co/storage/v1/object/public/media/744146f6-18a0-48d3-9ef7-52676d8453a0.png'   -- 이음마루
    ]),

    -- T3 전후면 발광 — 확실한 사진 없음(위 머리말)
    ('channel-both', array[]::text[]),

    -- T4 무점등 스카시 — 빛 없이 입체만
    ('scasi', array[
      '/images/work-05.jpg',  -- K water Tech (실내)
      '/images/work-06.jpg',  -- 대전무역회관 (스텐 입체문자)
      '/images/work-21.jpg'   -- 체육관 실내
    ]),

    -- T5 외벽사인·파사드 — 판을 세우고 그 위에 글자
    ('facade', array[
      '/images/work-17.jpg',  -- 태평한우 (야간)
      'https://xeecqpiowqgacdstwjae.supabase.co/storage/v1/object/public/media/55609a7f-18f2-4dff-816b-db367da2aaf3.jpeg', -- 기시맹
      'https://xeecqpiowqgacdstwjae.supabase.co/storage/v1/object/public/media/14347428-f2ab-4af7-8571-d394e5b1e43e.jpeg', -- 식생활교육관
      '/images/work-09.jpg',  -- kt plaza
      '/images/work-15.jpg'   -- 기아 서비스
    ]),

    -- T6 돌출간판 — 확실한 사진 없음(위 머리말)
    ('projecting', array[]::text[]),

    -- T7 옥상광고탑 — 건물 옥상 위
    ('rooftop', array[
      '/images/work-01.jpg'   -- 삼성화재
    ]),

    -- T8 행잉형 — 확실한 사진 없음(위 머리말)
    ('hanging', array[]::text[]),

    -- T9 까치발 철문자 — 환봉으로 띄운 무점등. 브라켓이 보임
    ('bracket', array[
      '/images/work-20.jpg'   -- 커뮤니티 시설 사인
    ])
  ) as v(slug, photos)
 where b.section = 'sign_model'
   and b.slug = v.slug
   and b.photos = '{}';       -- 이미 고르신 목록은 안 건드립니다
