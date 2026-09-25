import { notFound } from "next/navigation";

import AdminShell from "@/components/admin/AdminShell";
import SiteEditor from "@/components/admin/SiteEditor";
import { requireAdmin } from "@/lib/auth";
import { driveReady } from "@/lib/gdrive";
import { getPhotoBucket } from "@/lib/r2";
import { ocrReady } from "@/lib/sign-ocr";
import { createClient } from "@/lib/supabase/server";
import type { SitePhotoRow, SiteRow } from "@/lib/supabase/types";

/** P25 — 현장 한 건 편집 (F29) */
export const dynamic = "force-dynamic";

export default async function SitePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const supabase = await createClient();
  if (!supabase) notFound();
  const { data: site } = await supabase.from("sites").select("*").eq("id", id).maybeSingle();
  if (!site) notFound();
  const { data: photos } = await supabase.from("site_photos").select("*").eq("site_id", id);

  return (
    <AdminShell user={user} title={site.title} desc={[site.location, site.sign_type].filter(Boolean).join(" · ") || "현장 정보를 채워 주세요."}>
      <SiteEditor
        site={site as SiteRow}
        photos={(photos ?? []) as SitePhotoRow[]}
        storageReady={Boolean(await getPhotoBucket())}
        driveReady={driveReady()}
        ocrReady={ocrReady()}
      />
    </AdminShell>
  );
}
