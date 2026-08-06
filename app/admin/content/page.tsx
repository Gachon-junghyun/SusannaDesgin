import Link from "next/link";

import { deleteBlock, moveBlock } from "@/app/admin/actions";
import AdminShell from "@/components/admin/AdminShell";
import BlockForm from "@/components/admin/BlockForm";
import SubmitButton from "@/components/admin/SubmitButton";
import { SECTIONS, sectionSpec } from "@/config/sections";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ContentBlockRow } from "@/lib/supabase/types";

/**
 * 페이지 문구 관리 (F19).
 *
 * 구역이 여섯 개지만 화면은 하나입니다. 위쪽 탭으로 구역을 고르고, 폼은
 * `config/sections.ts` 의 명세를 읽어 스스로 라벨을 답니다.
 */
export default async function AdminContentPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string; saved?: string }>;
}) {
  const user = await requireAdmin();
  const { section, saved } = await searchParams;

  const spec = sectionSpec(section ?? "copy");

  const supabase = await createClient();
  const { data, error } = await supabase!
    .from("content_blocks")
    .select("*")
    .eq("section", spec.key)
    .order("sort_order", { ascending: true });

  const blocks = (data ?? []) as ContentBlockRow[];

  return (
    <AdminShell
      user={user}
      title="페이지 문구"
      desc="홈페이지에 적힌 문구와 사진입니다. 바꾸면 다음 방문부터 바로 반영됩니다."
    >
      <nav aria-label="구역 고르기" className="flex flex-wrap gap-1.5">
        {SECTIONS.map((s) => {
          const on = s.key === spec.key;
          return (
            <Link
              key={s.key}
              href={`/admin/content?section=${s.key}`}
              aria-current={on ? "page" : undefined}
              className={`rounded-lg px-4 py-2 text-[14px] font-bold transition-colors ${
                on
                  ? "bg-ink text-white"
                  : "border border-line bg-white text-ink-500 hover:text-ink"
              }`}
            >
              {s.label}
            </Link>
          );
        })}
      </nav>

      <p className="mt-4 text-[14px] leading-relaxed text-ink-500">{spec.where}</p>

      {saved && (
        <p className="mt-5 rounded-lg bg-brand/10 px-4 py-3 text-[14px] font-bold text-brand-700">
          저장했습니다. 홈페이지에 바로 반영됩니다.
        </p>
      )}

      {error && (
        <p className="mt-5 rounded-lg bg-accent/10 px-4 py-3 text-[14px] font-bold text-accent">
          문구를 불러오지 못했습니다. supabase/migrations/0005_content_blocks.sql 을
          실행했는지 확인해 주세요.
          <br />
          <span className="font-normal">({error.message})</span>
          <br />
          <span className="font-normal text-ink-500">
            그때까지 홈페이지에는 예전 문구가 그대로 나갑니다. 화면이 비지는 않습니다.
          </span>
        </p>
      )}

      <ul className="mt-6 space-y-4">
        {blocks.map((b, i) => (
          <li key={b.id} className="rounded-xl border border-line bg-white">
            <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-4">
              <span className="rounded-md bg-paper px-2 py-1 text-[12px] font-black text-ink-500">
                {i + 1}
              </span>
              <span className="font-bold">
                {b.title.split("\n")[0] || b.slug || "(내용 없음)"}
              </span>
              {!b.published && (
                <span className="rounded-md bg-ink-500/10 px-2 py-1 text-[12px] font-bold text-ink-500">
                  숨김
                </span>
              )}

              {!spec.fixed && (
                <div className="ml-auto flex items-center gap-1.5">
                  {(["up", "down"] as const).map((dir) => (
                    <form key={dir} action={moveBlock}>
                      <input type="hidden" name="section" value={spec.key} />
                      <input type="hidden" name="id" value={b.id} />
                      <input type="hidden" name="dir" value={dir} />
                      <SubmitButton
                        pendingLabel="…"
                        className="rounded-md border border-line px-2.5 py-1.5 text-[13px] font-bold hover:bg-paper"
                      >
                        {dir === "up" ? "↑" : "↓"}
                      </SubmitButton>
                    </form>
                  ))}
                  <form action={deleteBlock}>
                    <input type="hidden" name="section" value={spec.key} />
                    <input type="hidden" name="id" value={b.id} />
                    <SubmitButton
                      pendingLabel="삭제 중…"
                      confirm="이 항목을 삭제할까요? 되돌릴 수 없습니다."
                      className="rounded-md border border-line px-3 py-1.5 text-[13px] font-bold text-accent hover:bg-accent/5"
                    >
                      삭제
                    </SubmitButton>
                  </form>
                </div>
              )}
            </div>

            <details className="group">
              <summary className="cursor-pointer list-none px-5 py-3 text-[14px] font-bold text-ink-500 hover:text-ink">
                <span className="group-open:hidden">▸ 내용 수정하기</span>
                <span className="hidden group-open:inline">▾ 접기</span>
              </summary>
              <div className="border-t border-line px-5 py-5">
                <BlockForm spec={spec} block={b} />
              </div>
            </details>
          </li>
        ))}
      </ul>

      {!error && blocks.length === 0 && (
        <p className="mt-6 rounded-xl border border-dashed border-line px-5 py-10 text-center text-ink-500">
          이 구역은 아직 비어 있어 홈페이지에 <b>기본 문구</b>가 나가고 있습니다.
          <br />
          <span className="text-[14px]">
            supabase/migrations/0005_content_blocks.sql 을 실행하면 지금 문구가 그대로
            채워집니다.
          </span>
        </p>
      )}

      {!spec.fixed && (
        <details className="mt-8 rounded-xl border border-line bg-white">
          <summary className="cursor-pointer list-none px-5 py-4 font-black">
            + {spec.label} 항목 추가
          </summary>
          <div className="border-t border-line px-5 py-5">
            <BlockForm spec={spec} />
          </div>
        </details>
      )}

      {spec.fixed && (
        <p className="mt-8 rounded-xl bg-white px-5 py-4 text-[14px] leading-relaxed text-ink-500">
          이 구역은 <b className="text-ink">항목을 늘리거나 지울 수 없습니다.</b> 화면에
          자리가 정해져 있어서, 새로 넣어도 어디에도 나오지 않고 지우면 그 구역 제목이
          통째로 사라지기 때문입니다. 내용만 고쳐 주세요.
        </p>
      )}
    </AdminShell>
  );
}
