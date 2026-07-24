import { deleteSlide, moveSlide } from "@/app/admin/actions";
import AdminShell from "@/components/admin/AdminShell";
import SlideForm from "@/components/admin/SlideForm";
import SubmitButton from "@/components/admin/SubmitButton";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { HeroSlideRow } from "@/lib/supabase/types";

export default async function AdminHeroPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const user = await requireAdmin();
  const { saved } = await searchParams;

  const supabase = await createClient();
  const { data } = await supabase!
    .from("hero_slides")
    .select("*")
    .order("sort_order", { ascending: true });

  const slides = (data ?? []) as HeroSlideRow[];

  return (
    <AdminShell
      user={user}
      title="첫 화면 사진"
      desc="홈페이지를 열면 가장 먼저 보이는 큰 사진입니다. 여러 장 넣으면 자동으로 넘어갑니다."
    >
      {saved && (
        <p className="mb-6 rounded-lg bg-brand/10 px-4 py-3 text-[14px] font-bold text-brand-700">
          저장했습니다. 홈페이지에 바로 반영됩니다.
        </p>
      )}

      <ul className="space-y-4">
        {slides.map((s, i) => (
          <li key={s.id} className="rounded-xl border border-line bg-white">
            <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-4">
              <span className="rounded-md bg-paper px-2 py-1 text-[12px] font-black text-ink-500">
                {i + 1}
              </span>
              <span className="font-bold">
                {s.title.split("\n")[0] || "(제목 없음)"}
              </span>
              {!s.published && (
                <span className="rounded-md bg-ink-500/10 px-2 py-1 text-[12px] font-bold text-ink-500">
                  숨김
                </span>
              )}

              <div className="ml-auto flex items-center gap-1.5">
                <form action={moveSlide}>
                  <input type="hidden" name="id" value={s.id} />
                  <input type="hidden" name="dir" value="up" />
                  <SubmitButton
                    pendingLabel="…"
                    className="rounded-md border border-line px-2.5 py-1.5 text-[13px] font-bold hover:bg-paper"
                  >
                    ↑
                  </SubmitButton>
                </form>
                <form action={moveSlide}>
                  <input type="hidden" name="id" value={s.id} />
                  <input type="hidden" name="dir" value="down" />
                  <SubmitButton
                    pendingLabel="…"
                    className="rounded-md border border-line px-2.5 py-1.5 text-[13px] font-bold hover:bg-paper"
                  >
                    ↓
                  </SubmitButton>
                </form>
                <form action={deleteSlide}>
                  <input type="hidden" name="id" value={s.id} />
                  <SubmitButton
                    pendingLabel="삭제 중…"
                    confirm="이 슬라이드를 삭제할까요? 되돌릴 수 없습니다."
                    className="rounded-md border border-line px-3 py-1.5 text-[13px] font-bold text-accent hover:bg-accent/5"
                  >
                    삭제
                  </SubmitButton>
                </form>
              </div>
            </div>

            <details className="group">
              <summary className="cursor-pointer list-none px-5 py-3 text-[14px] font-bold text-ink-500 hover:text-ink">
                <span className="group-open:hidden">▸ 내용 수정하기</span>
                <span className="hidden group-open:inline">▾ 접기</span>
              </summary>
              <div className="border-t border-line px-5 py-5">
                <SlideForm slide={s} />
              </div>
            </details>
          </li>
        ))}
      </ul>

      {slides.length === 0 && (
        <p className="rounded-xl border border-dashed border-line px-5 py-10 text-center text-ink-500">
          아직 슬라이드가 없습니다. 아래에서 첫 사진을 추가해 주세요.
        </p>
      )}

      <details className="mt-8 rounded-xl border border-line bg-white">
        <summary className="cursor-pointer list-none px-5 py-4 font-black">
          + 새 슬라이드 추가
        </summary>
        <div className="border-t border-line px-5 py-5">
          <SlideForm />
        </div>
      </details>
    </AdminShell>
  );
}
