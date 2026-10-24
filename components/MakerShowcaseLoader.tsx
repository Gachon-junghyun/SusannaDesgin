"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type MakerShowcase from "./MakerShowcase";

// 서버의 표시 조건을 유지하고, 그려지는 경우에만 본체를 받습니다.
// SSR을 유지하므로 관리자 미리보기 구역도 처음 HTML에 들어갑니다.
const Showcase = dynamic(() => import("./MakerShowcase"));

export default function MakerShowcaseLoader(props: ComponentProps<typeof MakerShowcase>) {
  return <Showcase {...props} />;
}
