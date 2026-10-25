import MakerShell from "@/components/maker/MakerShell";
import FontStudioLoader from "@/components/maker/fontstudio/FontStudioLoader";
import { requireAdmin } from "@/lib/auth";
import { fontStoreStatus } from "@/lib/maker/hfont-store";

/**
 * P19 메이커 관리자 — 글꼴 공방 (관리자 전용) · F26-m 2단계 2026-10-25 · 3단계(글자 고치기 · 저장) 같은 날.
 *
 * 🔴 **손님용 `/maker/font` 는 만들지 않습니다**(사람 결정 2026-10-24 — 정현님·이모님 내부용 먼저). 왼쪽 목록에도 관리자에게만 섭니다.
 * 저장소(0020 `maker_fonts`)가 있는지는 여기서 한 번 보고 넘깁니다 — 없으면 화면이 «저장소 준비 전»을 띄우고
 * 고친 것을 그 브라우저에 남깁니다(안 죽습니다, A1).
 */
export default async function AdminFontPage() {
  await requireAdmin();
  const store = await fontStoreStatus();
  return (
    <MakerShell mode="admin" base="/admin/maker">
      <FontStudioLoader store={store} />
    </MakerShell>
  );
}
