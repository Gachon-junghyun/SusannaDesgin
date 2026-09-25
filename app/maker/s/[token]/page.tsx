import type { Metadata } from "next";
import Link from "next/link";

import MakerLoader from "@/components/maker/MakerLoader";
import MakerShell from "@/components/maker/MakerShell";
import { SHOW_MAKER } from "@/config/maker";
import { loadShare } from "@/lib/maker/share";

/**
 * P18-c — 간판 메이커 공유 링크 (손님, 보기 전용) · F26-b · 2026-09-25.
 *
 * 🔴 **`SHOW_MAKER` 가 꺼져 있어도 열립니다**(사람 결정 — «관리자가 보낸 링크로 들어오면 오히려 좋다»).
 * 링크를 받은 사람만 봅니다: 토큰을 모르면 못 찾고, 검색엔진엔 안 걸리고(noindex), 사이트맵에도 없습니다.
 * «복사해서 이어 편집»만 `SHOW_MAKER` 를 따릅니다 — 닫혀 있으면 이어 갈 `/maker` 가 404 라서입니다.
 * 🔴 구글 애널리틱스는 이 주소로 «들어온» 방문을 안 셉니다(`app/layout.tsx`) — 토큰이 든 주소가 구글에 남지 않게.
 */
export const metadata: Metadata = {
  title: "간판 디자인 보기",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function MakerSharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const got = await loadShare(token);

  return (
    <MakerShell mode="customer" base="/maker" nav={SHOW_MAKER}>
      {got.state === "ok" ? (
        <MakerLoader
          mode="customer"
          tool="view"
          base="/maker"
          design={got.design}
          share={{ token, title: got.title, expiresAt: got.expiresAt, canEdit: SHOW_MAKER }}
        />
      ) : (
        <div className="mx-auto max-w-md px-5 py-20 text-center">
          <h1 className="text-[20px] font-black">{got.state === "gone" ? "열 수 없는 링크입니다" : "지금은 디자인을 불러오지 못했습니다"}</h1>
          <p className="mt-3 text-[15px] leading-relaxed text-ink-500">
            {got.state === "gone"
              ? "주소가 틀렸거나, 기간이 지났거나, 보낸 쪽에서 링크를 닫았습니다. 받은 곳에 다시 요청해 주세요."
              : "잠시 뒤 다시 열어 보세요. 급하시면 견적 문의로 연락 주세요."}
          </p>
          <p className="mt-8 flex justify-center gap-5 text-[15px] font-bold">
            <Link href="/quote" className="text-brand-700 underline">
              견적 문의
            </Link>
            <Link href="/" className="text-ink-500 underline">
              수산나디자인 홈
            </Link>
          </p>
        </div>
      )}
    </MakerShell>
  );
}
