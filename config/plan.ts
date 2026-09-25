/**
 * Supabase 요금제 한도 — 관리자 «사용량» 화면(`/admin/usage`, F27)이 이 값과 실제 사용량을 나란히 보여줍니다.
 *
 * 🔴 **숫자는 기억으로 적지 않았습니다.** 2026-09-25 에 https://supabase.com/pricing 을 브라우저로 열어
 * Free 칸을 그대로 옮겼습니다. Supabase 가 요금제를 바꾸면 이 파일이 틀려집니다 — 화면에 «확인일»과 출처를
 * 같이 띄우는 이유입니다. 바꿀 땐 그 페이지를 다시 열고 `checkedAt` 도 고치세요.
 *
 * 우리가 Free 인 근거: `.github/workflows/keep-supabase-awake.yml` — «1주일 요청 없으면 일시정지»는 Free 에만 있습니다
 * (같은 페이지 «Pausing: After 1 week of inactivity» — Pro 이상은 Never).
 */

export const SUPABASE_PLAN = {
  name: "Free",
  checkedAt: "2026-09-25",
  source: "https://supabase.com/pricing",
} as const;

const MB = 1024 * 1024;
const GB = 1024 * MB;

export type PlanLimit = {
  key: string;
  label: string;
  limit: number;
  unit: "bytes" | "count";
  /** 한도가 걸리는 단위 */
  per: "프로젝트" | "매월" | "파일 하나";
  /**
   * 이 화면이 직접 잴 수 있는가 — `admin_usage()`(0014)가 돌려주는 값의 이름.
   * null 이면 SQL 로는 못 잽니다(트래픽·호출 수는 Supabase 쪽 계량기에만 있습니다) → 대시보드에서 봅니다.
   */
  measure: "db" | "storage" | "mau" | null;
  /** 쓰는 양이 아니라 «한 번에 얼마까지» 인 한도 — 재지 않고 우리 설정값을 적습니다 */
  ours?: string;
  note: string;
};

export const planLimits: PlanLimit[] = [
  { key: "db", label: "데이터베이스 크기", limit: 500 * MB, unit: "bytes", per: "프로젝트", measure: "db", note: "견적 문의·실적·페이지 문구·공유 링크가 여기 쌓입니다. 글자 위주라 가볍습니다." },
  { key: "storage", label: "파일 저장", limit: 1 * GB, unit: "bytes", per: "프로젝트", measure: "storage", note: "관리자가 올린 사진(media)과 손님 견적 첨부(quote-files)입니다. 문의를 지우면 첨부도 같이 지워집니다." },
  { key: "mau", label: "월 활성 사용자 (MAU)", limit: 50_000, unit: "count", per: "매월", measure: "mau", note: "로그인하는 사람 수입니다. 손님은 로그인하지 않아 관리자 계정만 셉니다." },
  { key: "egress", label: "내보낸 데이터 (egress)", limit: 5 * GB, unit: "bytes", per: "매월", measure: null, note: "Supabase 에서 밖으로 나간 데이터 양입니다. 스토리지에 올린 사진이 홈페이지에 뜰 때도 여기로 셉니다." },
  { key: "cached", label: "캐시로 내보낸 데이터 (cached egress)", limit: 5 * GB, unit: "bytes", per: "매월", measure: null, note: "스토리지 사진이 Supabase CDN 캐시에서 나간 양입니다." },
  { key: "upload", label: "파일 하나 최대 크기", limit: 50 * MB, unit: "bytes", per: "파일 하나", measure: null, ours: "견적 첨부 50MB — 이미 최대", note: "견적 첨부 상한(50MB, 0007)이 이미 이 값입니다 — 무료 요금제에선 더 못 올립니다." },
  { key: "edge", label: "Edge Functions 호출", limit: 500_000, unit: "count", per: "매월", measure: null, note: "이 홈페이지는 쓰지 않습니다." },
  { key: "realtime", label: "Realtime 메시지", limit: 2_000_000, unit: "count", per: "매월", measure: null, note: "이 홈페이지는 쓰지 않습니다." },
];

/** 한도와 별개로 알아둘 무료 요금제의 성질 (같은 페이지에서 확인) */
export const planFacts: string[] = [
  "1주일 동안 요청이 하나도 없으면 프로젝트가 일시정지됩니다 — 그러면 견적 문의 저장과 관리자 화면이 멈춥니다. 깃허브 «Supabase 깨어 있게 유지» 작업이 사흘마다 깨우도록 짜여 있지만, 그 작업에 키(시크릿)가 등록됐는지는 아직 확인 못 했습니다 — 깃허브 Actions 탭에 초록 체크가 있는지 한 번 봐 주세요.",
  "자동 백업이 없습니다(Pro 부터 7일). 견적 문의·실적이 DB 에만 있으니, 중요한 문의는 알림 메일로도 받아 두는 게 안전합니다.",
  "로그 보관은 1일입니다 — 문제가 생기면 그날 안에 Supabase 대시보드 로그를 봐야 합니다.",
  "무료 프로젝트는 한 계정에 2개까지입니다.",
];
