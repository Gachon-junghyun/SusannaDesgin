import { saveMaterialLabels } from "@/app/admin/actions";
import type { ContentBlockRow } from "@/lib/supabase/types";
import SubmitButton from "./SubmitButton";

/**
 * 재질 — 대분류·구분용 설명 일괄 입력 (2026-09-05, 사람 지시 — "재질도?").
 *
 * `SignModelPricesForm` 과 같은 이유입니다 — 한 칸씩 열어 고치고 저장하고를
 * 반복하는 게 불편해서, 표로 늘어놓고 **저장 버튼 하나**로 전부 저장합니다.
 * 아래의 개별 "내용 수정하기" 폼(사진 교체·삭제 포함)은 그대로 남아 있습니다.
 *
 * ⚠️ **`material` 은 `fixed` 가 아닙니다** — 추가·삭제는 이 표가 아니라 기존
 * "+ 재질 항목 추가" 폼과 개별 삭제 버튼으로 합니다. 이 표는 **이미 있는 항목의
 * 글자만** 한 번에 저장합니다.
 */
export default function MaterialLabelsForm({ blocks }: { blocks: ContentBlockRow[] }) {
  return (
    <form action={saveMaterialLabels} className="rounded-xl border border-line bg-white p-5">
      <p className="font-black">대분류·설명 한 번에 입력</p>
      <p className="mt-1 text-[13px] text-ink-500">
        다 채우고 맨 아래 저장 한 번만 누르면 됩니다. <b>대분류</b>는 손님 화면에
        그대로 나가는 이름(화강석·벽돌·콘크리트 등)이고, <b>구분용 설명</b>은
        관리자 화면에서만 보이는 메모입니다.
      </p>

      <div className="mt-4 space-y-2">
        {blocks.map((b) => (
          <div key={b.id} className="flex items-center gap-3">
            {b.image_url && (
              // eslint-disable-next-line @next/next/no-img-element -- 관리자 전용 작은 썸네일
              <img
                src={b.image_url}
                alt=""
                className="h-12 w-12 shrink-0 rounded-lg object-cover"
              />
            )}
            <input
              name={`eyebrow-${b.id}`}
              defaultValue={b.eyebrow}
              placeholder="대분류 (화강석)"
              className="w-40 shrink-0 rounded-lg border border-line px-3 py-2 outline-none focus:border-brand"
            />
            <input
              name={`title-${b.id}`}
              defaultValue={b.title}
              placeholder="구분용 설명 (오래된 벽)"
              className="flex-1 rounded-lg border border-line px-3 py-2 outline-none focus:border-brand"
            />
          </div>
        ))}
      </div>

      <SubmitButton
        pendingLabel="저장 중…"
        className="mt-4 rounded-lg bg-brand px-6 py-3 font-black text-white transition-colors hover:bg-brand-600"
      >
        {blocks.length}개 다 저장
      </SubmitButton>
    </form>
  );
}
