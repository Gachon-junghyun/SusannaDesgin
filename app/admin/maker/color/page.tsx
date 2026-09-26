import MakerLoader from "@/components/maker/MakerLoader";
import MakerShell from "@/components/maker/MakerShell";
import { requireAdmin } from "@/lib/auth";

/** P19-c — 건물 색 찾기 (관리자) · F26-h · 2026-09-26. 손님용 `/maker/color` 와 같은 부품입니다. */
export default async function AdminColorPage() {
  await requireAdmin();
  return (
    <MakerShell mode="admin" base="/admin/maker">
      <MakerLoader mode="admin" tool="color" base="/admin/maker" />
    </MakerShell>
  );
}
