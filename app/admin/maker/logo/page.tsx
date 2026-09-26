import MakerLoader from "@/components/maker/MakerLoader";
import MakerShell from "@/components/maker/MakerShell";
import { requireAdmin } from "@/lib/auth";
import { IMAGE_API_READY } from "@/lib/maker/ai-image";

/**
 * P19-e — 로고 만들기 (관리자 전용 베타) · F26-k · 2026-09-27.
 *
 * 🔴 **손님용 `/maker/logo` 는 만들지 않습니다**(사람 결정) — 왼쪽 목록에도 관리자에게만 섭니다.
 * 단계는 형제 작업 `STARTUP/design-atlas/tree/로고.md` 를 그대로 화면으로 옮겼습니다. 이미지 API 는 아직 안 붙었습니다
 * (`lib/maker/ai-image.ts` — 붙일 자리는 거기 한 곳).
 */
export default async function AdminLogoPage() {
  await requireAdmin();
  return (
    <MakerShell mode="admin" base="/admin/maker">
      <MakerLoader mode="admin" tool="logo" base="/admin/maker" aiReady={IMAGE_API_READY} />
    </MakerShell>
  );
}
