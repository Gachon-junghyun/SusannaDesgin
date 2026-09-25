-- 0015_admin_desk.sql — 관리자 «업무» 화면(달력·할 일·마케팅 주기)이 쓰는 표 둘
--
-- 무엇: `desk_tasks`(할 일 — 기한이 있으면 달력에 뜬다) · `desk_rhythm`(마케팅 주기 — 항목별로 «마지막으로 한 날» 하나)
--       그리고 2026-09-26 에 정리한 할 일 목록을 첫 값으로 넣습니다(F28).
--
-- 왜:   2026-09-26 사람 요청 — *"우리 에이전트 데스크처럼 여기 자체용 캘린더 및 업무용 프로세스 …
--       관리자 페이지에 캘린더, 마케팅 이론 해야 할 것 체크할 수 있는 것들, 링크들, 해야 할 것 정리"*.
--
-- 🔴 **관리자만 읽고 씁니다.** RLS `is_admin()` 한 줄 + 서버 액션의 `requireAdmin()` [A2].
--    익명(anon)에게는 표 권한을 한 줄도 안 줍니다. 손님 화면은 이 표를 안 씁니다.
--    🔴 **손님 개인정보(이름·연락처)를 할 일 제목에 적지 마세요** — 견적 문의는 견적함에만 있습니다.
--
-- 마케팅 주기의 «항목 목록»(블로그 주 2회 등)은 표가 아니라 `config/desk.ts` 에 있습니다 [A5] —
-- 여기 표에는 «언제 마지막으로 했나»만 남습니다. 항목 이름을 바꿔도 `key` 가 같으면 기록이 이어집니다.
--
-- 안 돌려도 화면은 안 죽습니다 — 바로가기·주기 목록은 그대로 보이고 «0015 를 실행하면 저장됩니다» 를 띄웁니다 [A1].
-- 실행: Supabase 대시보드 → SQL Editor → 붙여넣고 RUN (운영 DB 실행은 대표님이 하십니다). 재실행 안전합니다
-- (첫 값은 `seed_key` 로 한 번만 들어갑니다 — 지운 걸 다시 살리지도 않습니다).

create table if not exists public.desk_tasks (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  -- 기한 없음 = null. 날짜만(시각 없음) — 달력은 한국 날짜 문자열로만 비교합니다
  due_on      date,
  -- 누가 하나: '대표님' · '정현님' · '홈페이지' 처럼 짧게
  who         text not null default '',
  -- 묶음: config/desk.ts 의 DESK_AREAS 키 (deadline · exposure · sales · steady · etc)
  area        text not null default 'etc',
  note        text not null default '',
  link        text not null default '',
  done_at     timestamptz,
  -- 첫 값으로 넣은 줄만 가진다. 재실행해도 두 번 안 들어가게
  seed_key    text unique,
  created_at  timestamptz not null default now(),
  constraint desk_tasks_title_len check (char_length(title) between 1 and 200),
  constraint desk_tasks_who_len   check (char_length(who) <= 20),
  constraint desk_tasks_area_fmt  check (area ~ '^[a-z]{1,20}$'),
  constraint desk_tasks_note_len  check (char_length(note) <= 2000),
  constraint desk_tasks_link_fmt  check (link = '' or (link ~ '^https?://' and char_length(link) <= 500))
);

create index if not exists desk_tasks_due_idx on public.desk_tasks (due_on);

create table if not exists public.desk_rhythm (
  key           text primary key,
  last_done_on  date not null,
  updated_at    timestamptz not null default now(),
  constraint desk_rhythm_key_fmt check (key ~ '^[a-z0-9_]{1,40}$')
);

alter table public.desk_tasks  enable row level security;
alter table public.desk_rhythm enable row level security;

drop policy if exists desk_tasks_admin_all on public.desk_tasks;
create policy desk_tasks_admin_all on public.desk_tasks
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists desk_rhythm_admin_all on public.desk_rhythm;
create policy desk_rhythm_admin_all on public.desk_rhythm
  for all using (public.is_admin()) with check (public.is_admin());

revoke all on public.desk_tasks  from anon;
revoke all on public.desk_rhythm from anon;

-- ── 첫 값 — 2026-09-26 에 정리한 할 일 (DeGaJa 원장 · /research 결과) ─────────────────
-- 날짜 뒤 (추정) 은 제목에 그대로 적었습니다. 확인되면 화면에서 고치세요.
insert into public.desk_tasks (seed_key, area, due_on, who, title, note, link) values
  ('s01', 'deadline', '2026-10-21', '대표님', '직접생산확인 재신청 (간판 품목 10/21 만료)',
   '만료일 전 30일 안(9/21~10/21)에 재신청하면 만료 다음 날부터 2년이 이어집니다. 끊기면 공공 간판 입찰·수의계약 자격이 같이 사라집니다. 안내판(5512171801) 품목을 같이 추가할지도 정하세요.',
   'https://www.smpp.go.kr'),
  ('s02', 'deadline', '2026-09-29', '대표님', '비즈머니 충전 (9/25 잔액 19,193원 — 9/29 전후 소진 추정)',
   '잔액이 0이 되면 파워링크가 자동으로 멈춥니다.', 'https://ads.naver.com/manage/ad-accounts/2570727/dashboard'),
  ('s03', 'deadline', '2026-10-05', '대표님', '첫 광고비 지원 마감 — 충전·예산 결정',
   '10/5까지 쓴 광고비만큼(최대 50만원) 비즈쿠폰으로 돌아옵니다. 9/25 기준 219,193원 한도가 남았습니다. 쿠폰은 광고에만 쓰고 1년 유효.',
   'https://ads.naver.com/sub/growth_support'),
  ('s04', 'deadline', '2026-10-06', '대표님', '손해배상 책임보험 증서 확인 (숨고 서류 검수 10/6 시작)',
   '옥외광고물 책임보험은 법정 의무입니다. 숨고 «간판 제작»은 이 서류가 필수입니다.', ''),
  ('s05', 'deadline', '2026-11-04', '', '플레이스 90일 노출 우대 끝 (추정 — 등록일 확인 필요)', '', ''),
  ('s06', 'exposure', null, '대표님', '시공사례 3~5건 자료 모으기 (위치·치수·자재·기간·사진)',
   '구글 «대전간판» 노출 40회에 클릭 0회 — 사례 페이지가 순위를 올릴 제일 큰 재료입니다.', ''),
  ('s07', 'exposure', null, '대표님', '플레이스 새소식 첫 글 올리기 (초안 3편 있음)',
   '새소식이 0건입니다. 방치하면 순위가 떨어집니다.', 'https://smartplace.naver.com/bizes'),
  ('s08', 'exposure', null, '대표님', '네이버 블로그 개설',
   '네이버 AI 브리핑은 블로그·카페·클립만 출처로 씁니다.', ''),
  ('s09', 'exposure', null, '정현님', '카카오맵 등록 + 카카오톡 채널 만들기 (무료)', '', 'https://business.kakao.com'),
  ('s10', 'exposure', '2026-10-10', '정현님', 'Brave 반영 확인 (9/26 8개 주소 제출)', 'Claude 웹 검색이 쓰는 색인으로 추정됩니다.', 'https://search.brave.com/search?q=site%3Asusannadesign.co.kr'),
  ('s11', 'sales', null, '대표님', '기관 담당자 영업 문구: «여성기업 1인 견적 5천만원까지»',
   '국가·지방 계약법 시행령 모두 여성기업은 5천만원 이하 1인 견적 수의계약이 됩니다(일반 2천만원).', ''),
  ('s12', 'sales', null, '정현님', '기관 고객 대형 간판 대장 만들기 (3년 연장·안전점검 시기)',
   '4층 이상·옥상·한 변 10m 이상 간판은 3년마다 연장하며 안전점검을 받습니다. 만료 전후 30일에 먼저 연락합니다.', ''),
  ('s13', 'sales', null, '대표님', 'S2B(학교장터)·K-water 업체 등록 알아보기', '', 'https://www.s2b.kr'),
  ('s14', 'sales', null, '대표님', '최근 문의 4건 — 어떻게 알고 연락했는지 한 줄씩', '광고를 계속할지 판단하는 근거가 됩니다.', ''),
  ('s15', 'sales', '2027-02-15', '정현님', '서구 소상공인 경영환경개선 공고 확인 (간판 교체 250만원 지원, 추정 시기)',
   '올해는 3/27 공고 · 3/30~4/13 접수였습니다. 신청 가게는 비교견적이 필요합니다.', ''),
  ('s16', 'etc', null, '대표님', '8/3 견적 문의 — 손님께 사진 다시 요청', '당시 첨부 사진이 유실됐습니다. 이름·연락처는 견적함에만 있습니다.', ''),
  ('s17', 'etc', null, '대표님', '견적함 맨 위 알림 배너가 주황색이 아닌지 확인', '주황이면 문의 알림 메일이 안 가고 있습니다.', ''),
  ('s18', 'etc', null, '대표님', '견적함의 빈 문의 1건 + [검증] 2건 지우기', '', ''),
  ('s19', 'etc', null, '대표님', '현장 사진 촬영 — 야간 점등샷 꼭', '사진 한 번이 블로그·플레이스·당근·홈페이지 네 곳에 쓰입니다.', '')
on conflict (seed_key) do nothing;
