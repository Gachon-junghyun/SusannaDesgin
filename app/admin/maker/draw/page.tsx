import MakerLoader from "@/components/maker/MakerLoader";
import MakerShell from "@/components/maker/MakerShell";
import { requireAdmin } from "@/lib/auth";
import { IMAGE_API_READY } from "@/lib/maker/ai-image";

/**
 * P19-f — 그림판 (관리자 전용 베타) · F26-l · 2026-09-27.
 * 🔴 손님용 `/maker/draw` 는 없습니다. 결과는 «로고 만들기 ③ 손그림»이 불러 씁니다.
 */
export default async function AdminDrawPage() {
  await requireAdmin();
  return (
    <MakerShell mode="admin" base="/admin/maker">
      <MakerLoader mode="admin" tool="draw" base="/admin/maker" aiReady={IMAGE_API_READY} />
    </MakerShell>
  );
}
