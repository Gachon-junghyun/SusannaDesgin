/** 폼 검증 — 클라이언트/서버 양쪽에서 같은 규칙을 씁니다. */

export type QuoteInput = {
  name: string;
  phone: string;
  email?: string;
  zip?: string;
  address?: string;
  addressDetail?: string;
  region?: string; // 간편폼 전용 (설치지역)
  floor?: string;
  signType?: string;
  timing?: string;
  message?: string;
  agree: boolean;
  /** 봇 트랩 — 사람은 절대 채우지 않는 필드 */
  company_website?: string;
};

export type Errors = Partial<Record<keyof QuoteInput, string>>;

/** 입력 중 자동 하이픈 (휴대폰 / 지역번호 / 대표번호) */
export function formatPhone(input: string): string {
  const d = input.replace(/\D/g, "").slice(0, 11);

  if (d.startsWith("02")) {
    if (d.length < 3) return d;
    if (d.length < 6) return `${d.slice(0, 2)}-${d.slice(2)}`;
    if (d.length < 10) return `${d.slice(0, 2)}-${d.slice(2, 5)}-${d.slice(5, 9)}`;
    return `${d.slice(0, 2)}-${d.slice(2, 6)}-${d.slice(6, 10)}`;
  }

  if (d.length < 4) return d;
  if (d.length < 8) return `${d.slice(0, 3)}-${d.slice(3)}`;
  if (d.length < 11) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6, 10)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7, 11)}`;
}

export function isValidPhone(v: string): boolean {
  const d = (v || "").replace(/\D/g, "");
  if (d.length < 9 || d.length > 11) return false;
  return /^(01[016789]|0[2-6]\d?|1[0-9]{3})/.test(d);
}

export function isValidEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
}

/** 히어로 간편 상담 (성함 / 연락처 / 설치지역) */
export function validateQuick(d: Partial<QuoteInput>): Errors {
  const e: Errors = {};
  if (!d.name?.trim()) e.name = "성함을 입력해 주세요.";
  if (!d.phone?.trim()) e.phone = "연락처를 입력해 주세요.";
  else if (!isValidPhone(d.phone)) e.phone = "연락처 형식을 확인해 주세요.";
  if (!d.region?.trim()) e.region = "설치지역을 입력해 주세요.";
  if (!d.agree) e.agree = "개인정보 수집·이용에 동의해 주세요.";
  return e;
}

/** 견적문의 전체 폼 */
export function validateFull(d: Partial<QuoteInput>): Errors {
  const e: Errors = {};
  if (!d.name?.trim()) e.name = "상호 또는 담당자명을 입력해 주세요.";
  if (!d.phone?.trim()) e.phone = "연락처를 입력해 주세요.";
  else if (!isValidPhone(d.phone)) e.phone = "연락처 형식을 확인해 주세요.";
  if (d.email?.trim() && !isValidEmail(d.email)) e.email = "이메일 형식을 확인해 주세요.";
  if (!d.address?.trim()) e.address = "설치 주소를 입력해 주세요.";
  if (!d.floor?.trim()) e.floor = "설치 층수를 선택해 주세요.";
  if (!d.signType?.trim()) e.signType = "문의 분야를 선택해 주세요.";
  if (!d.agree) e.agree = "개인정보 수집·이용에 동의해 주세요.";
  return e;
}

export const MAX_FILES = 5;

/**
 * 파일 하나당 상한.
 *
 * ⚠️ **여기만 고치면 안 됩니다.** `quote-files` 버킷에도 같은 상한이 걸려 있어서
 *    (`supabase/migrations/0007_quote_files_limits.sql`) 한쪽만 올리면 폼은 통과시키고
 *    업로드가 조용히 실패합니다. 두 값은 항상 같이 움직여야 합니다.
 *
 * 🔴 **순서가 있습니다 — DB 먼저, 코드 나중.**
 *    버킷보다 여기를 먼저 올리면 폼은 통과시키고 버킷이 거부해서 **고객 파일이
 *    사라집니다**(고객 화면에는 접수 완료가 뜹니다). 반대 순서는 무해합니다.
 *
 *    지금 값은 `0007_quote_files_limits.sql` 로 버킷을 50MB 로 올린 **뒤에**
 *    맞춘 것입니다(2026-08-06, 45MB 통과·55MB 거부 실측).
 *    다시 올릴 때도 같은 순서를 지키세요.
 */
export const MAX_FILE_BYTES = 50 * 1024 * 1024; // 50MB — 버킷과 같은 값

/**
 * 첨부 **전체** 합계 상한.
 *
 * 개당 상한만 두면 50MB × 5 = 250MB 가 한 요청으로 올 수 있는데, 그러면 코드에
 * 닿기도 전에 두 군데서 막힙니다.
 *   · Cloudflare 요청 본문 한도 — 넘으면 워커가 실행되지도 않고 413 이 나갑니다.
 *     고객 화면에는 원인을 알 수 없는 오류로 보입니다.
 *   · 워커 메모리 128MB — `formData()` 가 본문을 통째로 메모리에 올리므로
 *     합계가 크면 그것만으로 한도에 닿습니다.
 *
 * 그래서 **여기서 먼저, 사람이 읽을 수 있는 문구로** 막습니다.
 * 업로드를 한 개씩 순차 처리하는 것도 같은 이유입니다(`lib/quote-files.ts`).
 */
export const MAX_TOTAL_BYTES = 50 * 1024 * 1024; // 50MB

/**
 * 받는 파일 형식.
 *
 * 확장자로 씁니다. MIME 타입은 브라우저·OS 마다 제각각이라(특히 `.hwp` 는 빈 문자열이나
 * `application/octet-stream` 으로 오는 일이 흔합니다) 확장자가 훨씬 잘 맞습니다.
 *
 * **왜 이 목록인가** — 간판 견적에 실제로 오는 것들입니다.
 *   · 사진·PDF        현장 사진, 도면 출력본
 *   · ai psd eps cdr  로고·시안 원본 (사인 업계 표준)
 *   · dwg dxf         건물 도면·간판 상세도 (CAD)
 *   · hwp hwpx        **관공서·공공기관 사양서.** 2026-08-03 연구개발특구진흥재단
 *                     문의가 이 부류였습니다. 국내 발주에서 빠지면 안 됩니다
 *   · xlsx docx pptx  수량 산출서·발주 사양서
 *   · zip             여러 개를 묶어 보낼 때
 *
 * ⚠️ 실행 파일류(exe·bat·js·html 등)는 일부러 뺐습니다. 견적에 쓸 일이 없고,
 *    받아 두면 나중에 열어보는 사람이 위험합니다.
 */
export const ACCEPTED_FILE_EXTS = [
  // 이미지
  "jpg", "jpeg", "png", "gif", "webp", "heic", "heif", "bmp", "tif", "tiff",
  // 문서
  "pdf", "hwp", "hwpx", "xlsx", "xls", "docx", "doc", "pptx", "ppt", "txt", "csv",
  // 디자인 원본
  "ai", "psd", "eps", "cdr", "svg", "indd",
  // 도면
  "dwg", "dxf",
  // 묶음
  "zip", "7z", "rar",
] as const;

/** `<input accept>` 에 넣을 문자열 */
export const ACCEPTED_FILE_TYPES = ACCEPTED_FILE_EXTS.map((e) => `.${e}`).join(",");

/** 사람에게 보여줄 짧은 안내 (폼 아래 한 줄) */
export const ACCEPTED_FILE_LABEL = "사진 · PDF · 한글 · 오피스 · AI/PSD · CAD(dwg) · zip";

/** 파일명이 허용 형식인가 — **서버에서도 같은 함수로 검사합니다.** */
export function isAcceptedFile(name: string): boolean {
  const ext = /\.([a-zA-Z0-9]{1,8})$/.exec(name)?.[1]?.toLowerCase();
  return Boolean(ext) && (ACCEPTED_FILE_EXTS as readonly string[]).includes(ext!);
}
