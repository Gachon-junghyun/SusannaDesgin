"use client";

import { useActionState } from "react";

import { saveSlide, type ActionState } from "@/app/admin/actions";
import ImageField from "./ImageField";
import SubmitButton from "./SubmitButton";
import type { HeroSlideRow } from "@/lib/supabase/types";

const empty: ActionState = {};

export default function SlideForm({ slide }: { slide?: HeroSlideRow }) {
  const [state, action] = useActionState(saveSlide, empty);

  return (
    <form action={action} className="space-y-4">
      {slide && <input type="hidden" name="id" value={slide.id} />}

      <ImageField
        defaultValue={slide?.image_url ?? ""}
        hint="가로로 넓은 사진이 잘 맞습니다 (권장 1920×1080). 10MB 이하."
      />

      <div className="grid gap-4 sm:grid-cols-[100px_1fr]">
        <div>
          <label className="block text-[14px] font-bold">번호</label>
          <input
            name="eyebrow"
            defaultValue={slide?.eyebrow ?? ""}
            placeholder="01"
            className="mt-1.5 w-full rounded-lg border border-line px-3 py-2.5 outline-none focus:border-brand"
          />
        </div>
        <div>
          <label className="block text-[14px] font-bold">
            큰 제목 <span className="font-normal text-ink-500">— 줄바꿈하면 화면에서도 줄이 나뉩니다</span>
          </label>
          <textarea
            name="title"
            rows={2}
            defaultValue={slide?.title ?? ""}
            placeholder={"건물의 이름을\n가장 높은 곳에"}
            className="mt-1.5 w-full resize-y rounded-lg border border-line px-3 py-2.5 outline-none focus:border-brand"
          />
        </div>
      </div>

      <div>
        <label className="block text-[14px] font-bold">설명</label>
        <textarea
          name="sub"
          rows={2}
          defaultValue={slide?.sub ?? ""}
          className="mt-1.5 w-full resize-y rounded-lg border border-line px-3 py-2.5 outline-none focus:border-brand"
        />
      </div>

      <div>
        <label className="block text-[14px] font-bold">
          사진 설명 <span className="font-normal text-ink-500">— 눈이 불편한 분과 검색엔진이 읽습니다</span>
        </label>
        <input
          name="alt"
          defaultValue={slide?.alt ?? ""}
          placeholder="야간 점등된 옥상 광고탑"
          className="mt-1.5 w-full rounded-lg border border-line px-3 py-2.5 outline-none focus:border-brand"
        />
      </div>

      <label className="flex items-center gap-2.5 text-[14px] font-bold">
        <input
          type="checkbox"
          name="published"
          defaultChecked={slide?.published ?? true}
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
        {slide ? "저장" : "슬라이드 추가"}
      </SubmitButton>
    </form>
  );
}
