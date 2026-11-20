/**
 * 두 홈 나눠 보기 (F37, 2026-11-20 사람 결정).
 *
 * 사람: «new 페이지로 온 사람은 캐시로 저장했다가 홈 로고 누르면 new 페이지가 뜰 수 있도록
 *       … 전국, 원래 잘 안 되는 사람들을 기준으로 조금 비교하고 싶거든».
 *
 * - `/new` 에 한 번이라도 들어온 브라우저는 `localStorage` 에 «new» 를 남깁니다(`components/RememberHome.tsx`).
 * - 그 브라우저에서는 머리띠 로고(홈)가 `/` 대신 `/new` 로 갑니다(`components/Header.tsx`).
 * - GA 에는 `home_variant`(new / classic) 를 사용자 속성으로 실어 둡니다. GA 보고서에서 이 값으로 가르려면
 *   GA 관리 화면에서 «맞춤 측정기준» 하나를 등록해야 합니다 — 사람이 합니다. 등록 전에도 «방문 페이지»(/new 와 /) 로 가를 수 있습니다.
 *
 * 🔴 서버(cookies)를 안 씁니다 — 공개 페이지는 정적으로 남아야 합니다(ARCHITECTURE A3). 그래서 브라우저 저장소만 씁니다.
 */
export const HOME_VARIANT_KEY = "susanna_home_variant";
export type HomeVariant = "new" | "classic";

export function readHomeVariant(): HomeVariant | null {
  try {
    const v = window.localStorage.getItem(HOME_VARIANT_KEY);
    return v === "new" || v === "classic" ? v : null;
  } catch {
    return null; // 사생활 보호 모드 등 저장소가 막히면 나누지 않습니다(그냥 / 로 갑니다)
  }
}

/** 이 브라우저의 홈 주소 — 저장된 값이 «new» 면 /new */
export function homeHref(): "/" | "/new" {
  return readHomeVariant() === "new" ? "/new" : "/";
}

/**
 * 들어온 홈을 기록합니다. «new» 는 한 번 붙으면 유지하고, «classic» 은 아직 아무 값이 없을 때만 붙입니다
 * — `/new` 로 들어왔던 사람이 나중에 `/` 를 직접 쳐서 와도 «new» 묶음에 남습니다.
 */
export function rememberHome(v: HomeVariant) {
  try {
    const cur = readHomeVariant();
    if (v === "new" || !cur) window.localStorage.setItem(HOME_VARIANT_KEY, v);
  } catch {
    /* 저장 못 하면 나누지 않습니다 */
  }
  const g = (window as unknown as { gtag?: (...a: unknown[]) => void }).gtag;
  if (typeof g === "function") g("set", "user_properties", { home_variant: readHomeVariant() ?? v });
}
