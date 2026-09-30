"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { claritySkipped } from "@/lib/analytics";

/**
 * 클라이언트 이동으로 `/maker`·`/admin` 에 들어가면 Clarity 를 멈추고, 나오면 다시 켭니다 (F22).
 *
 * 홈의 «수산나 메이커» 구역처럼 공개 페이지에서 메이커로 건너가는 링크가 있어서,
 * 첫 페이지에서만 거르면 메이커 안까지 따라 들어갑니다. 멈춘 동안에는 상태 신호(수백 바이트)만 나가고
 * 화면 변화는 기록하지 않습니다(2026-09-30 실측).
 *
 * 화면이 없고, Clarity 가 안 붙은 브라우저(내부자·개발 서버)에서는 아무것도 안 합니다.
 */
export default function ClarityGate() {
  const pathname = usePathname();
  const paused = useRef(false);

  useEffect(() => {
    const clarity = (window as unknown as { clarity?: (...a: unknown[]) => void }).clarity;
    if (typeof clarity !== "function") return;
    const skip = claritySkipped(pathname);
    if (skip && !paused.current) {
      clarity("pause");
      paused.current = true;
    } else if (!skip && paused.current) {
      clarity("resume");
      paused.current = false;
    }
  }, [pathname]);

  return null;
}
