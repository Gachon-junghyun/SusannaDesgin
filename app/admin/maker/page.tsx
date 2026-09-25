import MakerLoader from "@/components/maker/MakerLoader";
import MakerShell from "@/components/maker/MakerShell";
import { requireAdmin } from "@/lib/auth";

/**
 * P19 — 간판 메이커 (관리자) · F26 · 2026-09-25.
 *
 * 관리자는 **모든 글꼴**(이 PC 에 설치된 것 + 파일 올리기)과 **제작용 SVG 내보내기**를 씁니다.
 * 손님용 `/maker` 와 같은 부품이고, 갈리는 건 `mode` 하나입니다.
 * 🔴 관리자 공통 껍데기(`AdminShell`) 대신 **메이커 껍데기**를 씁니다 — 편집기는 화면을 통째로 써야 해서입니다
 * (사람 지시 *"에디터에 진짜 들어온 느낌"*). 권한 검사(`requireAdmin`)는 그대로입니다 [A2].
 */
export default async function AdminMakerPage() {
  await requireAdmin();
  return (
    <MakerShell mode="admin" base="/admin/maker">
      <MakerLoader mode="admin" base="/admin/maker" />
    </MakerShell>
  );
}
