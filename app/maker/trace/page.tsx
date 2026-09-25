import { notFound } from "next/navigation";

import MakerLoader from "@/components/maker/MakerLoader";
import MakerShell from "@/components/maker/MakerShell";
import { SHOW_MAKER } from "@/config/maker";
import { getPreview } from "@/lib/preview";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata("/maker/trace");

export const dynamic = "force-dynamic";

/** P18-b — SVG 따기 (손님) · F26 · 2026-09-25. `/maker` 와 같은 스위치(`SHOW_MAKER`)로 열리고 닫힙니다. */
export default async function MakerTracePage() {
  const preview = await getPreview();
  if (!SHOW_MAKER && !preview.on) notFound();
  return (
    <MakerShell mode="customer" base="/maker" hidden={!SHOW_MAKER}>
      <MakerLoader mode="customer" tool="trace" base="/maker" />
    </MakerShell>
  );
}
