import MakerShell from "@/components/maker/MakerShell";
import FontStudioLoader from "@/components/maker/fontstudio/FontStudioLoader";
import { requireAdmin } from "@/lib/auth";

/**
 * P19 메이커 관리자 — 글꼴 공방 (관리자 전용) · F26-m 2단계 · 2026-10-25.
 *
 * 🔴 **손님용 `/maker/font` 는 만들지 않습니다**(사람 결정 2026-10-24 — 정현님·이모님 내부용 먼저). 왼쪽 목록에도 관리자에게만 섭니다.
 * 바탕 글꼴 고르기 · 미리보기 · 스타일 · TTF 받기까지입니다. 글자 고치기·저장은 3단계입니다.
 */
export default async function AdminFontPage() {
  await requireAdmin();
  return (
    <MakerShell mode="admin" base="/admin/maker">
      <FontStudioLoader />
    </MakerShell>
  );
}
