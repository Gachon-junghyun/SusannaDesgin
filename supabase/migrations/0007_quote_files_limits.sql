-- =============================================================
--  견적 첨부 - 용량 상한 10MB → 50MB
--
--  왜 필요한가:
--    간판 견적에는 AI·PSD·CAD 원본이 옵니다. 그건 보통 수십 MB 라 10MB 상한으로는
--    애초에 못 받았습니다. 2026-08-03 연구개발특구진흥재단 문의도 "제작 확정시
--    AI파일 제공 예정" 이라고 적혀 있었습니다.
--
--  ⚠️ **`lib/validate.ts` 의 `MAX_FILE_BYTES` 와 항상 같이 움직여야 합니다.**
--     버킷 상한이 더 낮으면 폼은 통과시키고 업로드만 조용히 실패합니다 —
--     고객은 "접수 완료" 를 보는데 사진은 없는, 이 저장소가 가장 싫어하는 상태입니다.
--
--  형식 제한은 버킷(`allowed_mime_types`)에 걸지 않습니다.
--    `.hwp` 같은 국내 형식은 브라우저·OS 마다 MIME 이 제각각이라(빈 문자열이나
--    `application/octet-stream` 으로 오는 일이 흔합니다) MIME 으로 막으면
--    멀쩡한 파일이 거부됩니다. 확장자 검사는 서버 코드에서 합니다
--    (`lib/validate.ts` 의 `isAcceptedFile` — 폼과 API 가 같은 함수를 씁니다).
--
--  실행: Supabase 대시보드 → SQL Editor → 붙여넣고 RUN
--  여러 번 실행해도 안전합니다.
-- =============================================================

update storage.buckets
   set file_size_limit = 52428800   -- 50MB = lib/validate.ts MAX_FILE_BYTES
 where id = 'quote-files';

-- 확인용 — 아래 조회 결과가 52428800 이어야 합니다.
select id, public, file_size_limit, allowed_mime_types
  from storage.buckets
 where id = 'quote-files';
