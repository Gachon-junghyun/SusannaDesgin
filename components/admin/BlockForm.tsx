"use client";

import { useActionState } from "react";

import { saveBlock, type ActionState } from "@/app/admin/actions";
import type { FieldSpec, SectionSpec } from "@/config/sections";
import type { ContentBlockRow } from "@/lib/supabase/types";
import ImageField from "./ImageField";
import SubmitButton from "./SubmitButton";

const empty: ActionState = {};

const inputClass =
  "mt-1.5 w-full rounded-lg border border-line px-3 py-2.5 outline-none focus:border-brand";

function Label({ spec }: { spec: FieldSpec }) {
  return (
    <label className="block text-[14px] font-bold">
      {spec.label}
      {spec.hint && <span className="font-normal text-ink-500"> — {spec.hint}</span>}
    </label>
  );
}

/**
 * 문구 블록 편집 폼 (F19).
 *
 * 구역마다 칸의 뜻이 다르므로 **라벨과 보이는 칸을 `config/sections.ts` 의 명세에서
 * 읽어 옵니다.** 구역별로 폼 컴포넌트를 따로 만들면 여섯 벌이 되고, 그중 하나만
 * 고치는 실수가 반드시 납니다.
 */
export default function BlockForm({
  spec,
  block,
}: {
  spec: SectionSpec;
  block?: ContentBlockRow;
}) {
  const [state, action] = useActionState(saveBlock, empty);
  const f = spec.fields;

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="section" value={spec.key} />
      {block && <input type="hidden" name="id" value={block.id} />}

      {/* 안 보이는 칸도 값을 실어 보냅니다. 빼면 저장할 때마다 "" 로 지워집니다. */}
      {!f.image && (
        <>
          <input type="hidden" name="image_url" value={block?.image_url ?? ""} />
          <input type="hidden" name="alt" value={block?.alt ?? ""} />
        </>
      )}

      {f.image && (
        <>
          <ImageField defaultValue={block?.image_url ?? ""} hint={f.image.hint} />
          <div>
            <label className="block text-[14px] font-bold">
              사진 설명
              <span className="font-normal text-ink-500">
                {" "}
                — 눈이 불편한 분과 검색엔진이 읽습니다. 비우면 이름을 대신 씁니다
              </span>
            </label>
            <input name="alt" defaultValue={block?.alt ?? ""} className={inputClass} />
          </div>
        </>
      )}

      <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
        {f.eyebrow ? (
          <div>
            <Label spec={f.eyebrow} />
            <input
              name="eyebrow"
              defaultValue={block?.eyebrow ?? ""}
              placeholder={f.eyebrow.placeholder}
              className={inputClass}
            />
          </div>
        ) : (
          <input type="hidden" name="eyebrow" value={block?.eyebrow ?? ""} />
        )}

        {f.title && (
          <div className={f.eyebrow ? "" : "sm:col-span-2"}>
            <Label spec={f.title} />
            {f.title.multiline ? (
              <textarea
                name="title"
                rows={2}
                defaultValue={block?.title ?? ""}
                placeholder={f.title.placeholder}
                className={`${inputClass} resize-y`}
              />
            ) : (
              <input
                name="title"
                defaultValue={block?.title ?? ""}
                placeholder={f.title.placeholder}
                className={inputClass}
              />
            )}
          </div>
        )}
      </div>

      {f.sub && (
        <div>
          <Label spec={f.sub} />
          <textarea
            name="sub"
            rows={2}
            defaultValue={block?.sub ?? ""}
            placeholder={f.sub.placeholder}
            className={`${inputClass} resize-y`}
          />
        </div>
      )}

      {f.points ? (
        <div>
          <Label spec={f.points} />
          <textarea
            name="points"
            rows={4}
            defaultValue={(block?.points ?? []).join("\n")}
            className={`${inputClass} resize-y`}
          />
        </div>
      ) : (
        <input type="hidden" name="points" value={(block?.points ?? []).join("\n")} />
      )}

      <label className="flex items-center gap-2.5 text-[14px] font-bold">
        <input
          type="checkbox"
          name="published"
          defaultChecked={block?.published ?? true}
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
        {block ? "저장" : "항목 추가"}
      </SubmitButton>
    </form>
  );
}
