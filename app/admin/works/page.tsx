import { deleteWork, moveWork } from "@/app/admin/actions";
import AdminShell from "@/components/admin/AdminShell";
import SubmitButton from "@/components/admin/SubmitButton";
import WorkForm from "@/components/admin/WorkForm";
import { workCategories } from "@/config/content";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { WorkRow } from "@/lib/supabase/types";

/** 필터의 "전체" 는 실제 업종이 아니므로 입력 선택지에서 뺍니다. */
const categories = workCategories.filter((c) => c !== "전체");

export default async function AdminWorksPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const user = await requireAdmin();
  const { saved } = await searchParams;

  const supabase = await createClient();
  const { data } = await supabase!
    .from("works")
    .select("*")
    .order("sort_order", { ascending: true });

  const works = (data ?? []) as WorkRow[];

  return (
    <AdminShell
      user={user}
      title="주요 실적"
      desc="주요실적 페이지와 홈페이지 중간에 보이는 카드입니다. 홈에는 위에서부터 6개가 나옵니다."
    >
      {saved && (
        <p className="mb-6 rounded-lg bg-brand/10 px-4 py-3 text-[14px] font-bold text-brand-700">
          저장했습니다. 홈페이지에 바로 반영됩니다.
        </p>
      )}

      <ul className="space-y-3">
        {works.map((w, i) => (
          <li key={w.id} className="rounded-xl border border-line bg-white">
            <div className="flex flex-wrap items-center gap-3 px-5 py-4">
              <span className="rounded-md bg-paper px-2 py-1 text-[12px] font-black text-ink-500">
                {i + 1}
              </span>
              <span className="font-bold">{w.title || "(이름 없음)"}</span>
              <span className="text-[13px] text-ink-500">{w.category}</span>
              {i < 6 && w.published && (
                <span className="rounded-md bg-brand/10 px-2 py-1 text-[12px] font-bold text-brand-700">
                  홈 노출
                </span>
              )}
              {!w.published && (
                <span className="rounded-md bg-ink-500/10 px-2 py-1 text-[12px] font-bold text-ink-500">
                  숨김
                </span>
              )}

              <div className="ml-auto flex items-center gap-1.5">
                <form action={moveWork}>
                  <input type="hidden" name="id" value={w.id} />
                  <input type="hidden" name="dir" value="up" />
                  <SubmitButton
                    pendingLabel="…"
                    className="rounded-md border border-line px-2.5 py-1.5 text-[13px] font-bold hover:bg-paper"
                  >
                    ↑
                  </SubmitButton>
                </form>
                <form action={moveWork}>
                  <input type="hidden" name="id" value={w.id} />
                  <input type="hidden" name="dir" value="down" />
                  <SubmitButton
                    pendingLabel="…"
                    className="rounded-md border border-line px-2.5 py-1.5 text-[13px] font-bold hover:bg-paper"
                  >
                    ↓
                  </SubmitButton>
                </form>
                <form action={deleteWork}>
                  <input type="hidden" name="id" value={w.id} />
                  <SubmitButton
                    pendingLabel="삭제 중…"
                    confirm="이 실적을 삭제할까요? 되돌릴 수 없습니다."
                    className="rounded-md border border-line px-3 py-1.5 text-[13px] font-bold text-accent hover:bg-accent/5"
                  >
                    삭제
                  </SubmitButton>
                </form>
              </div>
            </div>

            <details className="group border-t border-line">
              <summary className="cursor-pointer list-none px-5 py-3 text-[14px] font-bold text-ink-500 hover:text-ink">
                <span className="group-open:hidden">▸ 내용 수정하기</span>
                <span className="hidden group-open:inline">▾ 접기</span>
              </summary>
              <div className="border-t border-line px-5 py-5">
                <WorkForm work={w} categories={categories} />
              </div>
            </details>
          </li>
        ))}
      </ul>

      {works.length === 0 && (
        <p className="rounded-xl border border-dashed border-line px-5 py-10 text-center text-ink-500">
          아직 실적이 없습니다. 아래에서 추가해 주세요.
        </p>
      )}

      <details className="mt-8 rounded-xl border border-line bg-white">
        <summary className="cursor-pointer list-none px-5 py-4 font-black">
          + 새 실적 추가
        </summary>
        <div className="border-t border-line px-5 py-5">
          <WorkForm categories={categories} />
        </div>
      </details>
    </AdminShell>
  );
}
