"use client";

import dynamic from "next/dynamic";

import type { FontStoreStatus } from "@/lib/maker/hfont-store";

/**
 * 글꼴 공방(F26-m) 껍데기 — `MakerLoader` 와 같은 이유로 둡니다: `ssr: false` 는 서버 컴포넌트에서 못 쓰고,
 * 서버 컴포넌트에서 `next/dynamic` 으로 가져오면 코드 분할이 안 됩니다(F34 에서 실제로 밟음, Next 문서 «Lazy Loading»).
 * 화면 본체와 목록(170여 종)은 이 껍데기가 그려질 때 따로 내려오고, 엔진·클리퍼·opentype.js 는 글꼴을 고를 때 일꾼으로 내려옵니다.
 */
const FontStudio = dynamic(() => import("../FontStudio"), {
  ssr: false,
  loading: () => (
    <p className="px-5 py-16 text-center text-[15px] text-ink-500" role="status">
      글꼴 공방을 여는 중…
    </p>
  ),
});

/** `store` — 저장소(0020) 상태. 서버 페이지가 한 번 보고 넘깁니다 */
export default function FontStudioLoader({ store }: { store: FontStoreStatus }) {
  return <FontStudio store={store} />;
}
