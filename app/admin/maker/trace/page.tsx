import MakerLoader from "@/components/maker/MakerLoader";
import MakerShell from "@/components/maker/MakerShell";
import { requireAdmin } from "@/lib/auth";

/** P19-b — SVG 따기 (관리자) · F26 · 2026-09-25. 손님용 `/maker/trace` 와 같은 부품입니다. */
export default async function AdminTracePage() {
  await requireAdmin();
  return (
    <MakerShell mode="admin" base="/admin/maker">
      <MakerLoader mode="admin" tool="trace" base="/admin/maker" />
    </MakerShell>
  );
}
