"use client";

import { useActionState } from "react";

import { saveWork, type ActionState } from "@/app/admin/actions";
import ImageField from "./ImageField";
import SubmitButton from "./SubmitButton";
import type { WorkRow } from "@/lib/supabase/types";

const empty: ActionState = {};

export default function WorkForm({
  work,
  categories,
}: {
  work?: WorkRow;
  categories: string[];
}) {
  const [state, action] = useActionState(saveWork, empty);

  return (
    <form action={action} className="space-y-4">
      {work && <input type="hidden" name="id" value={work.id} />}

      <ImageField
        defaultValue={work?.image_url ?? ""}
        hint="가로세로 4:3 사진이 가장 잘 맞습니다 (권장 1200×900). 10MB 이하."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-[14px] font-bold">현장 이름</label>
          <input
            name="title"
            required
            defaultValue={work?.title ?? ""}
            placeholder="교보생명 옥상 광고탑"
            className="mt-1.5 w-full rounded-lg border border-line px-3 py-2.5 outline-none focus:border-brand"
          />
        </div>

        <div>
          <label className="block text-[14px] font-bold">업종</label>
          <select
            name="category"
            defaultValue={work?.category ?? categories[0]}
            className="mt-1.5 w-full rounded-lg border border-line bg-white px-3 py-2.5 outline-none focus:border-brand"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[14px] font-bold">
            지역 <span className="font-normal text-ink-500">— 비워도 됩니다</span>
          </label>
          <input
            name="location"
            defaultValue={work?.location ?? ""}
            placeholder="대전"
            className="mt-1.5 w-full rounded-lg border border-line px-3 py-2.5 outline-none focus:border-brand"
          />
        </div>

        <div>
          <label className="block text-[14px] font-bold">
            태그 <span className="font-normal text-ink-500">— 쉼표로 구분</span>
          </label>
          <input
            name="tags"
            defaultValue={work?.tags?.join(", ") ?? ""}
            placeholder="옥상 광고탑, 유지보수"
            className="mt-1.5 w-full rounded-lg border border-line px-3 py-2.5 outline-none focus:border-brand"
          />
        </div>
      </div>

      <label className="flex items-center gap-2.5 text-[14px] font-bold">
        <input
          type="checkbox"
          name="published"
          defaultChecked={work?.published ?? true}
          className="h-4 w-4 accent-[#00a79d]"
        />
        홈페이지에 보이기
      </label>

      {state.error && (
        <p role="alert" className="text-[14px] font-bold text-accent">
          {state.error}
        </p>
      )}

      <SubmitButton className="rounded-lg bg-brand px-6 py-3 font-black text-white transition-colors hover:bg-brand-600">
        {work ? "저장" : "실적 추가"}
      </SubmitButton>
    </form>
  );
}
