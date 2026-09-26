"use client";

import dynamic from "next/dynamic";

import type { ShareInfo } from "./SignMaker";

/**
 * 메이커는 **브라우저에서만** 그립니다 (F26). 캔버스·글꼴 파일·저장소를 다 브라우저에서 쓰고,
 * 저장해 둔 초안을 첫 그림에서 바로 읽어야 하므로 서버에서 미리 그리면 화면이 한 번 튑니다.
 * `ssr: false` 는 서버 컴포넌트에서 못 쓰는 옵션이라 이 얇은 껍데기가 있습니다(Next 문서 «Lazy Loading»).
 * 덤으로 opentype.js·woff2 해제기(합계 수백 KB)가 **이 화면을 연 사람에게만** 내려갑니다.
 * `tool="view"` 는 공유 링크(F26-b) — 같은 에디터를 «보기 전용»으로 엽니다(두 벌을 만들지 않습니다).
 */
const loading = () => (
  <p className="px-5 py-16 text-center text-[15px] text-ink-500" role="status">
    수산나 메이커를 여는 중…
  </p>
);
const SignMaker = dynamic(() => import("./SignMaker"), { ssr: false, loading });
const TraceStudio = dynamic(() => import("./TraceStudio"), { ssr: false, loading });
const ColorStudio = dynamic(() => import("./ColorStudio"), { ssr: false, loading });

export default function MakerLoader({
  mode,
  tool = "editor",
  base,
  design,
  share,
}: {
  mode: "admin" | "customer";
  /** `color` = 건물 색 찾기(F26-h) */
  tool?: "editor" | "trace" | "color" | "view";
  base: string;
  /** 공유 링크의 디자인 (DB 에서 온 JSON — SignMaker 가 기본값과 합쳐 씁니다) */
  design?: unknown;
  share?: ShareInfo;
}) {
  if (tool === "trace") return <TraceStudio base={base} />;
  if (tool === "color") return <ColorStudio base={base} />;
  if (tool === "view") return <SignMaker mode="view" initial={design} share={share} />;
  return <SignMaker mode={mode} />;
}
