-- 0020_maker_fonts.sql — 글꼴 공방 «내 글꼴 작업» 저장 (F26-m 3단계 · 2026-10-25)
--
-- 무엇: `maker_fonts`      글꼴 작업 하나 = 한 줄 (이름 · 바탕 글꼴 id · 미리보기 문장 · 스타일 · 틀 · 만든 사람 · 만든 날 · 고친 날)
--       `maker_font_parts` 그 작업의 고친 글자 한 자(또는 직접 그린 자모 칸 하나) = 한 줄 (윤곽 v2 JSON)
--
-- 왜:   2026-10-24 사람 결정 — 글꼴 공방은 관리자 전용(정현님·이모님), 3단계에서 «고친 글자가 새로 고침 뒤에도 남고 받은 TTF 에 들어감».
--       계획 원문은 형제 저장소 `SusannaDesigner/study/2026-10-24_hangul-font/이식계획.md` §5, 형식은 같은 폴더 `CONTRACT.md` §7(v2).
--
-- 🔴 **왜 표가 둘인가 — 서버 액션 본문 1MB.** 고친 글자 한 자의 윤곽이 붓 글꼴이면 10KB 안팎이라, 한 줄 jsonb 에 통째로 넣고
--    통째로 보내면 수십 자에서 1MB(서버 액션 상한)를 넘습니다. 그래서 글자 한 자 = 한 줄로 나눠 **바뀐 글자만** 보냅니다.
--    화면은 한 번에 보내는 양을 70만 자 안으로 나눠 여러 번 부르고, 한 자가 256KB 를 넘으면 저장 전에 사람 말로 알립니다.
--
-- 저장되는 것: 글꼴 윤곽 좌표와 이름·스타일 숫자뿐입니다. 글꼴 파일(바탕 글꼴)은 저장하지 않습니다 — 바탕은 id 만 두고
--    배포처에서 다시 받습니다. ⚠️ 이 저장소(리포)는 공개라 고친 글자는 **여기 DB 에만** 둡니다(코드·목록 파일에 넣지 않음).
--
-- 🔴 **관리자만 읽고 씁니다** [A2]. 익명 표면 0 — 표 권한을 anon 에서 거두고, 정책은 authenticated + `is_admin()` 하나뿐,
--    익명이 부를 함수도 없습니다. 화면 서버 액션도 전부 `requireAdmin()` 이 먼저 막습니다.
--
-- 안 돌려도 홈페이지·글꼴 공방은 안 죽습니다 — 공방이 «저장소 준비 전(0020 실행 필요)»을 띄우고, 그동안 고친 것은
-- 그 브라우저 localStorage 에 남았다가 표가 생긴 뒤 첫 «저장» 때 올라갑니다 [A1].
-- 실행: Supabase 대시보드 → SQL Editor → 붙여넣고 RUN (운영 DB 실행은 사람이 합니다). 재실행 안전합니다.

create table if not exists public.maker_fonts (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,                    -- 폰트 이름(받은 TTF 의 family) — 예약 이름 검사는 화면이 합니다
  base        text,                             -- 바탕 글꼴 id (`config/fontLab.ts` 의 id). 없으면 직접 그린 글꼴
  sample      text not null default '',         -- 미리보기 문장
  style       jsonb not null default '{}'::jsonb,  -- {weight, slant, width, tracking}
  frames      jsonb,                            -- 틀(CONTRACT §3). null = 기본 틀
  created_by  uuid references auth.users (id) on delete set null default auth.uid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint maker_fonts_name_len   check (char_length(name) between 1 and 60),
  constraint maker_fonts_base_len   check (base is null or char_length(base) between 1 and 80),
  constraint maker_fonts_sample_len check (char_length(sample) <= 200),
  constraint maker_fonts_style_obj  check (jsonb_typeof(style) = 'object' and octet_length(style::text) <= 2000),
  constraint maker_fonts_frames_obj check (frames is null or (jsonb_typeof(frames) = 'object' and octet_length(frames::text) <= 100000))
);

create index if not exists maker_fonts_updated_idx on public.maker_fonts (updated_at desc);

create table if not exists public.maker_font_parts (
  font_id     uuid not null references public.maker_fonts (id) on delete cascade,
  kind        text not null,                    -- over = 고친 음절 한 자 · cell = 직접 그린 자모 칸(백업에서 들어온 것)
  key         text not null,                    -- over: 음절 한 글자(예: 한) · cell: 칸 키(예: cho/1/ㄱ)
  data        jsonb not null,                   -- CONTRACT §7 — over {ch, contours} · cell {mode, contours | link, adj}
  updated_at  timestamptz not null default now(),
  primary key (font_id, kind, key),
  constraint maker_font_parts_kind check (kind in ('over', 'cell')),
  constraint maker_font_parts_key  check (char_length(key) between 1 and 40),
  constraint maker_font_parts_data check (jsonb_typeof(data) = 'object' and octet_length(data::text) <= 262144)
);

alter table public.maker_fonts      enable row level security;
alter table public.maker_font_parts enable row level security;
revoke all on public.maker_fonts      from anon;
revoke all on public.maker_font_parts from anon;

drop policy if exists maker_fonts_admin on public.maker_fonts;
create policy maker_fonts_admin on public.maker_fonts
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists maker_font_parts_admin on public.maker_font_parts;
create policy maker_font_parts_admin on public.maker_font_parts
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
