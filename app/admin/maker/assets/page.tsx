import AssetsBoard from "@/components/maker/AssetsBoard";
import MakerShell from "@/components/maker/MakerShell";
import { requireAdmin } from "@/lib/auth";
import { listMakerAssets } from "@/lib/maker/assets";

/**
 * P19-d — 프로젝트 에셋 (관리자) · F26-j · 2026-09-26.
 *
 * 클로드 코드가 손님 시안에서 뽑아 올린 로고·레터링·아이콘·그림을 **프로젝트(손님 한 건)별로** 봅니다.
 * 여기서는 보고 지우기만 합니다 — 벽에 올리는 건 에디터의 «프로젝트 에셋» 칸, 올리기는 `npm run cms -- maker-assets upload`.
 * 🔴 손님 자료라 **관리자 전용**입니다(손님 `/maker` 에는 이 주소가 없습니다) [A2].
 */
export const dynamic = "force-dynamic";

export default async function AdminMakerAssetsPage() {
  await requireAdmin();
  const res = await listMakerAssets();
  return (
    <MakerShell mode="admin" base="/admin/maker">
      <AssetsBoard initial={res} />
    </MakerShell>
  );
}
