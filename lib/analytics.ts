/**
 * Google Analytics 4 — 부트스트랩 스크립트와 견적 접수 이벤트 (F22).
 *
 * 서버(`app/layout.tsx`)와 브라우저(견적 폼 두 벌)가 같이 씁니다 — 그래서 `server-only` 가 아닙니다.
 * 이 파일은 `window` 를 모듈 최상단에서 만지지 않습니다.
 */

/**
 * «이 브라우저는 내부자(대표님·가족·관리자)» 표시 — localStorage 키.
 *
 * 🔴 **IP 로 거르지 않습니다.** 가족이 폰·여러 곳에서 들어오기 때문입니다.
 * 대신 브라우저에 표시를 남기고, 표시가 있으면 GA 에 `traffic_type: 'internal'` 을 실어 보냅니다.
 * GA 쪽 데이터 필터 «내부 트래픽»이 그 값을 보고 거릅니다.
 *
 * 세워지는 때: `/admin/*` 방문 · 관리자 로그인 상태로 공개 페이지 방문 · `?internal=1` 로 한 번 열기.
 * 내려가는 때: `?internal=0` 으로 한 번 열기.
 *
 * ⚠️ 아이폰 사파리(ITP)는 스크립트가 쓴 저장소를 **그 사이트에 7일 동안 안 들어오면** 지웁니다.
 *    그러면 다음 방문이 손님으로 잡힙니다 — 가족 폰은 가끔 `?internal=1` 을 다시 열어야 합니다.
 */
export const INTERNAL_KEY = "sd_internal";

/**
 * `gtag('config')` 를 아예 부르지 않는 주소.
 *
 * - `/maker/s/<토큰>` — GA 가 주소를 통째로 보내서 비밀 토큰이 구글에 남습니다 (F26-b).
 * - `/admin/*` — 관리 화면 조회는 통계가 아닙니다. 들어온 첫 페이지가 여기면 그 세션은 GA 가 아예 꺼집니다
 *   (클라이언트 이동으로 공개 페이지에 나가도 `config` 가 안 불렸으니 조회가 안 나갑니다).
 */
const NO_CONFIG = "p.indexOf('/maker/s/')===0||/^\\/admin(\\/|$)/.test(p)";

/**
 * `<Script id="ga4">` 안에 들어갈 한 덩어리.
 *
 * `isAdmin` 은 `getPreview()` 가 이미 판정한 값을 그대로 받습니다 — 쿠키를 새로 읽지 않습니다 [A3].
 * localStorage 가 막힌 브라우저(사생활 모드 일부)에서는 표시 없이 평소처럼 보냅니다 [A1].
 */
export function gaBootstrap(measurementId: string, isAdmin: boolean): string {
  return (
    "window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());" +
    "(function(){" +
    `var p=location.pathname,k='${INTERNAL_KEY}',i=${isAdmin ? 1 : 0};` +
    "try{" +
    "var q=new URLSearchParams(location.search).get('internal');" +
    "if(q==='0'){localStorage.removeItem(k);i=0;}" +
    "else{if(q==='1'||i||/^\\/admin(\\/|$)/.test(p))localStorage.setItem(k,'1');" +
    "if(localStorage.getItem(k)==='1')i=1;}" +
    "}catch(e){}" +
    `if(${NO_CONFIG})return;` +
    `gtag('config','${measurementId}',i?{traffic_type:'internal'}:{});` +
    "})();"
  );
}

/**
 * Clarity 를 안 켜는 주소 — `/admin/*` 과 **`/maker/*` 전부**(공유 링크 `/maker/s/` 포함).
 *
 * 🔴 **메이커를 빼는 이유는 무게입니다.** Clarity 는 화면이 바뀔 때마다 그 변화를 기록하는데, 메이커는
 * 끌 때마다 SVG 가 매 프레임 바뀌는 편집기라 손님 손에 걸리는 곳이 바로 여기입니다.
 * 손님이 그린 간판(상호·전화번호가 들어가기 쉬움)과 올린 사진이 녹화에 남지 않는 것도 같이 얻습니다.
 */
const CLARITY_SKIP = /^\/(admin|maker)(\/|$)/;

export function claritySkipped(pathname: string): boolean {
  return CLARITY_SKIP.test(pathname);
}

/**
 * `<Script strategy="lazyOnload">` 안에 들어갈 Clarity 공식 태그 + 문지기.
 *
 * - `lazyOnload` = 페이지 `load` 가 끝나고 브라우저가 한가할 때 실행 → 첫 화면·첫 터치와 겹치지 않습니다.
 *   (실측 2026-09-30: 켜지는 순간 화면 전체를 한 번 찍느라 0.12초 멈춤 1회, 그 뒤 스크롤 중 멈춤 0.)
 * - 내부자 표시(`INTERNAL_KEY`)나 관리자 로그인이면 아예 안 불러옵니다 — GA 부트스트랩이 `afterInteractive`
 *   라 이보다 먼저 돌아 표시를 세워 둡니다.
 * - 들어온 첫 페이지가 `CLARITY_SKIP` 이면 안 불러옵니다. 중간에 들어가면 `ClarityGate` 가 멈춥니다.
 */
export function clarityBootstrap(projectId: string, isAdmin: boolean): string {
  return (
    "(function(){" +
    (isAdmin ? "return;" : "") +
    `try{if(localStorage.getItem('${INTERNAL_KEY}')==='1')return;}catch(e){}` +
    `if(${CLARITY_SKIP}.test(location.pathname))return;` +
    '(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};' +
    't=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;' +
    "y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})" +
    `(window,document,"clarity","script","${projectId}");` +
    "})();"
  );
}

type Gtag = (...args: unknown[]) => void;

/**
 * 견적 접수 성공 직후 한 번 — GA4 권장 이벤트 `generate_lead`.
 *
 * 🔴 **이름·전화번호·지역·메모는 절대 싣지 않습니다.** 구글 약관 위반이고, 한 번 들어가면 못 지웁니다.
 * 실리는 건 어느 폼이었나(`quick`=간편 3칸 · `full`=/quote 전체 폼) 하나뿐입니다.
 *
 * GA 가 안 붙은 주소(개발 서버·미리보기 도메인)에서는 `gtag` 가 없어 조용히 아무것도 안 합니다.
 */
export function trackLead(form: "quick" | "full"): void {
  try {
    const gtag = (window as unknown as { gtag?: Gtag }).gtag;
    if (typeof gtag === "function") gtag("event", "generate_lead", { form_type: form });
  } catch {
    // 통계가 실패해도 접수 화면은 그대로 뜹니다 [A1]
  }
}
