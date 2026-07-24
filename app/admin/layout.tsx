import type { Metadata } from "next";

/** 관리자 화면은 검색엔진에 절대 노출되면 안 됩니다. */
export const metadata: Metadata = {
  title: "관리자",
  robots: { index: false, follow: false, nocache: true },
};

/**
 * 관리자 화면은 절대 미리 구워두면 안 됩니다.
 * 이 설정이 없으면 빌드 시점에 로그인 상태를 판단할 수 없는 상황에서
 * 화면이 정적 파일로 굳어버릴 수 있습니다. 항상 요청 시점에 그립니다.
 */
export const dynamic = "force-dynamic";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  // 권한 확인은 각 페이지의 `requireAdmin()` 이 합니다.
  // 레이아웃은 화면을 옮겨 다닐 때 다시 그려지지 않아, 여기서 검사하면
  // 이동 중에 확인이 건너뛰어질 수 있습니다.
  return <>{children}</>;
}
