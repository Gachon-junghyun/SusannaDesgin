import Link from "next/link";

import AdminShell from "@/components/admin/AdminShell";
import SiteCreateForm from "@/components/admin/SiteCreateForm";
import { requireAdmin } from "@/lib/auth";
import { driveReady } from "@/lib/gdrive";
import { getPhotoBucket } from "@/lib/r2";
import { ocrReady } from "@/lib/sign-ocr";
import { photoUrl, sortPhotos } from "@/lib/sites";
import { createClient } from "@/lib/supabase/server";
import type { SitePhotoRow, SiteRow } from "@/lib/supabase/types";

/**
 * P24 — 현장 폴더 목록 (F29 · 2026-09-26). 현장 한 건 = 사진 여러 장 + 사실 몇 칸 → 공개하면 `/works/<주소>`.
 * 사진 저장소(R2)·원본 전송(드라이브)·상호 읽기(AI)는 각각 따로 켜집니다 — 안 켜진 것만 «설정 필요»로 보입니다 [A1].
 */
export const dynamic = "force-dynamic";

type Thumb = Pick<SitePhotoRow, "id" | "site_id" | "thumb_key" | "stage" | "taken_at">;

export default async function SitesPage() {
  const user = await requireAdmin();
  const supabase = await createClient();
  const storage = Boolean(await getPhotoBucket());

  let sites: SiteRow[] = [];
  let photos: Thumb[] = [];
  let problem = "";
  if (supabase) {
    const { data, error } = await supabase.from("sites").select("*").order("updated_at", { ascending: false }).limit(200);
    if (error)
      problem =
        /PGRST205|42P01/.test(error.code ?? "") || /sites/.test(error.message)
          ? "현장 표가 아직 없습니다 — supabase/migrations/0016_sites.sql 을 Supabase 대시보드에서 실행해 주세요."
          : `현장을 읽지 못했습니다: ${error.message}`;
    else {
      sites = (data ?? []) as SiteRow[];
      if (sites.length) {
        const { data: ph } = await supabase
          .from("site_photos")
          .select("id, site_id, thumb_key, stage, taken_at")
          .in(
            "site_id",
            sites.map((s) => s.id),
          );
        photos = (ph ?? []) as Thumb[];
      }
    }
  }

  const setup = [
    {
      ok: storage,
      label: "사진 저장소 (Cloudflare R2)",
      how: "Cloudflare 대시보드 → R2 → 버킷 «susanna-site-photos» 만들기 → wrangler.jsonc 의 r2_buckets 주석을 풀고 배포",
      href: "",
    },
    { ok: driveReady(), label: "원본 → 구글 드라이브 → 비스테이션", how: "", href: "/admin/sites/drive" },
    { ok: ocrReady(), label: "상호 읽기 (AI 사진 인식 · 유료, 장당 수 원)", how: "Anthropic API 키를 Cloudflare Secret ANTHROPIC_API_KEY 로", href: "" },
  ];

  return (
    <AdminShell user={user} title="현장 폴더" desc="현장마다 사진을 모으고, 사실 몇 칸을 채워 공개하면 홈페이지에 시공사례 페이지가 생깁니다.">
      <div className="space-y-10">
        {problem && <p className="border-l-4 border-accent bg-white px-4 py-3 text-[14px]">{problem}</p>}

        <section aria-label="연결 상태">
          <ul className="divide-y divide-line border-y border-line bg-white text-[14px]">
            {setup.map((s) => (
              <li key={s.label} className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-2.5">
                <span className="font-bold">
                  <span className={s.ok ? "text-brand-700" : "text-accent-600"}>{s.ok ? "켜짐" : "설정 필요"}</span> · {s.label}
                </span>
                {!s.ok &&
                  (s.href ? (
                    <Link href={s.href} className="text-[13px] font-bold text-brand-700">
                      연결하러 가기 →
                    </Link>
                  ) : (
                    <span className="text-[12px] text-ink-500">{s.how}</span>
                  ))}
              </li>
            ))}
          </ul>
        </section>

        <SiteCreateForm />

        <section aria-label="현장 목록">
          {sites.length === 0 && !problem && <p className="text-[14px] text-ink-500">아직 현장이 없습니다. 위에서 하나 만들어 보세요.</p>}
          <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {sites.map((s) => {
              const mine = sortPhotos(photos.filter((p) => p.site_id === s.id));
              const cover = mine.find((p) => p.id === s.cover_photo) ?? mine.find((p) => p.stage === "done") ?? mine[0];
              return (
                <li key={s.id}>
                  <Link href={`/admin/sites/${s.id}`} className="group block bg-white">
                    <div className="aspect-[4/3] bg-paper">
                      {cover && (
                        // eslint-disable-next-line @next/next/no-img-element -- 관리자 전용 썸네일
                        <img src={photoUrl(cover.thumb_key)} alt="" className="h-full w-full object-cover" loading="lazy" />
                      )}
                    </div>
                    <div className="px-3 py-3">
                      <p className="text-[16px] font-black group-hover:text-brand-700">{s.title}</p>
                      <p className="mt-0.5 text-[12px] text-ink-500">
                        {[s.location, s.sign_type].filter(Boolean).join(" · ") || "정보 없음"} · 사진 {mine.length}장 ·{" "}
                        <b className={s.published ? "text-brand-700" : "text-ink-500"}>{s.published ? "공개" : "비공개"}</b>
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </AdminShell>
  );
}
