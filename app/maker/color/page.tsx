import { notFound } from "next/navigation";

import MakerLoader from "@/components/maker/MakerLoader";
import MakerShell from "@/components/maker/MakerShell";
import { SHOW_MAKER } from "@/config/maker";
import { getPreview } from "@/lib/preview";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata("/maker/color");

export const dynamic = "force-dynamic";

/** P18-c — 건물 색 찾기 (손님) · F26-h · 2026-09-26. `/maker` 와 같은 스위치(`SHOW_MAKER`)로 열리고 닫힙니다. */
export default async function MakerColorPage() {
  const preview = await getPreview();
  if (!SHOW_MAKER && !preview.on) notFound();
  return (
    <MakerShell mode="customer" base="/maker" hidden={!SHOW_MAKER}>
      <MakerLoader mode="customer" tool="color" base="/maker" />
    </MakerShell>
  );
}
