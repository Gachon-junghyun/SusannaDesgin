/**
 * «건물 색 찾기» → 간판 에디터로 사진·색 건네기 (F26-h · 2026-09-26).
 *
 * 🔴 **서버를 안 거치고, 브라우저 저장소에도 사진을 안 씁니다.** 메이커 안의 이동은 전부 같은 문서 안의 클라이언트 이동
 * (`router.push`)이라 모듈 변수가 살아 있고, 사진의 `blob:` 주소도 그대로 열립니다. 그래서 여기 한 칸에 담아 두고
 * 에디터가 처음 뜰 때 한 번 꺼내 갑니다(꺼내면 비웁니다). 새로고침하면 사라집니다 — 가게 사진이 원래 그렇습니다(F26).
 * 색 값(hex)은 사진이 아니라서 `localStorage` 로도 한 번 더 건넵니다(새 탭으로 열어도 색은 남게).
 */
export type Handoff = {
  palette: string[];
  photo?: { url: string; w: number; h: number; name: string };
  /** «이 안으로 간판 만들기»(F26-i) — 판 색(없으면 판 없이) · 글자 색 · 포인트(판 테두리) · 상호 */
  rec?: { plate?: string; face: string; point?: string; name?: string };
};

let pending: Handoff | null = null;

export function giveToEditor(h: Handoff) {
  pending = h;
}

export function takeForEditor(): Handoff | null {
  const h = pending;
  pending = null;
  return h;
}
