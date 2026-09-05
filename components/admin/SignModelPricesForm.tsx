import { saveSignModelPrices } from "@/app/admin/actions";
import type { ContentBlockRow } from "@/lib/supabase/types";
import SubmitButton from "./SubmitButton";

/**
 * 간판 종류 9가지 — 가격대 일괄 입력 (2026-09-05, 사람 지시).
 *
 * "하나씩 열어서 고치고 저장하고, 또 열어서 고치고 저장하고" 가 9번 반복되는 게
 * 불편하다고 해서 만든 자리입니다. 9칸을 한 화면에 입력칸으로 늘어놓고
 * **저장 버튼 하나**로 전부 저장합니다 — 아래의 개별 "내용 수정하기" 폼은
 * 그대로 남겨 뒀습니다(사진·이름을 바꿀 땐 여전히 그걸 씁니다).
 *
 * `sign_model` 은 `fixed: true`(항목 추가·삭제 불가, 항상 9건)라 "몇 번째 칸이
 * 몇 번 항목인가" 가 안 흔들립니다 — 그래서 이런 표 형태 일괄 편집이 안전합니다.
 * 다른 구역(`material` 처럼 늘었다 줄었다 하는 목록)에는 이 패턴을 그대로 쓰지 마세요.
 */
export default function SignModelPricesForm({ blocks }: { blocks: ContentBlockRow[] }) {
  return (
    <form action={saveSignModelPrices} className="rounded-xl border border-line bg-white p-5">
      <p className="font-black">가격대 한 번에 입력</p>
      <p className="mt-1 text-[13px] text-ink-500">
        9칸 다 채우고 맨 아래 저장 한 번만 누르면 됩니다. 자유 문장입니다 — 예:
        “150만원 ~ 300만원”, “상담 후 안내”. 비워 두면 손님 화면에 “가격 확인
        필요”로 나갑니다.
      </p>

      <ul className="mt-4 space-y-2">
        {blocks.map((b) => (
          <li key={b.id} className="flex items-center gap-3">
            {b.image_url && (
              // eslint-disable-next-line @next/next/no-img-element -- 관리자 전용 작은 썸네일
              <img
                src={b.image_url}
                alt=""
                className="h-12 w-12 shrink-0 rounded-lg object-cover"
              />
            )}
            <div className="w-32 shrink-0">
              <p className="font-mono text-[11px] text-ink-500">{b.eyebrow}</p>
              <p className="text-[14px] font-bold">{b.title}</p>
            </div>
            <input
              name={`price-${b.id}`}
              defaultValue={b.sub}
              placeholder="150만원 ~ 300만원"
              className="flex-1 rounded-lg border border-line px-3 py-2 outline-none focus:border-brand"
            />
          </li>
        ))}
      </ul>

      <SubmitButton
        pendingLabel="저장 중…"
        className="mt-4 rounded-lg bg-brand px-6 py-3 font-black text-white transition-colors hover:bg-brand-600"
      >
        9개 다 저장
      </SubmitButton>
    </form>
  );
}
