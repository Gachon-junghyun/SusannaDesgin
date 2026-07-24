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
export const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB
export const ACCEPTED_FILE_TYPES = "image/*,.pdf,.ai,.psd,.zip";
