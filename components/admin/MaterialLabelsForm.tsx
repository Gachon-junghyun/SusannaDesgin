import { saveMaterialLabels } from "@/app/admin/actions";
import type { ContentBlockRow } from "@/lib/supabase/types";
import SubmitButton from "./SubmitButton";

/**
 * 재질 — 대분류·설명·숨기기·삭제 일괄 입력 (2026-09-05, 사람 지시 — "재질도?"
 * → "숨기기·삭제도 여기서 한 번에").
 *
 * `SignModelPricesForm` 과 같은 이유입니다 — 한 칸씩 열어 고치고 저장하고,
 * 지울 건 또 따로 열어 지우고를 반복하는 게 불편해서, 표 하나에 다 놓고
 * **저장 버튼 하나**로 전부 처리합니다(수정·숨기기·삭제 셋 다).
 *
 * ⚠️ **삭제 체크는 되돌릴 수 없습니다.** 체크하고 저장을 누르면 그 항목은
 * 글자 수정 없이 바로 지워집니다(`saveMaterialLabels` 참고) — 확인창을 안 띄우는
 * 대신 라벨에 "되돌릴 수 없음"을 박아 뒀습니다. 그냥 안 보이게만 하고 싶으면
 * "숨기기"를 쓰세요(다시 체크 해제하면 복원됩니다).
 *
 * ⚠️ **`material` 은 `fixed` 가 아닙니다** — 새 항목 추가는 이 표가 아니라
 * 아래 "+ 재질 항목 추가" 폼으로 합니다. 사진 교체도 항목을 열어야 합니다
 * (파일 선택 UI를 표 안에 욱여넣지 않으려는 것입니다).
 */
export default function MaterialLabelsForm({ blocks }: { blocks: ContentBlockRow[] }) {
  return (
    <form action={saveMaterialLabels} className="rounded-xl border border-line bg-white p-5">
      <p className="font-black">한 번에 수정·숨기기·삭제</p>
      <p className="mt-1 text-[13px] text-ink-500">
        다 정리하고 맨 아래 저장 한 번만 누르면 됩니다. <b>대분류</b>는 손님
        화면에 그대로 나가는 이름(화강석·벽돌·콘크리트 등)이고, <b>구분용 설명</b>은
        관리자 화면에서만 보이는 메모입니다. <b>삭제는 되돌릴 수 없습니다.</b>
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
            <label className="flex shrink-0 items-center gap-1.5 text-[13px] font-bold text-ink-500">
              <input
                type="checkbox"
                name={`hide-${b.id}`}
                defaultChecked={!b.published}
                className="h-4 w-4 accent-[#00a79d]"
              />
              숨기기
            </label>
            <label className="flex shrink-0 items-center gap-1.5 text-[13px] font-bold text-accent">
              <input type="checkbox" name={`delete-${b.id}`} className="h-4 w-4 accent-current" />
              삭제(되돌릴 수 없음)
            </label>
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
