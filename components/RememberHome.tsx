"use client";

import { useEffect } from "react";
import { rememberHome, type HomeVariant } from "@/lib/homeVariant";

/** 두 홈 나눠 보기(F37) — 이 홈으로 들어왔다는 걸 브라우저에 남깁니다. 화면에는 아무것도 안 그립니다. */
export default function RememberHome({ variant }: { variant: HomeVariant }) {
  useEffect(() => {
    rememberHome(variant);
  }, [variant]);
  return null;
}
