import Image from "next/image";
import Link from "next/link";
import Placeholder from "./Placeholder";
import type { Block } from "@/lib/cms";

type SignModelWithFlag = Block & { available: boolean };

/**
 * 간판 종류 9가지 격자 — 실제로 모델링한 제작 방식 (`sign_model` 구역).
 *
 * 🔴 **2026-09-08 에 카드 모양을 바꿨습니다** (대표님이 렌터카 템플릿 화면을 주며
 * "레이아웃만 저 느낌으로, 색·디자인은 수산나 그대로"). 바뀐 것은 **배치뿐**이고
 * 팔레트·타이포·정사각 썸네일은 하나도 안 건드렸습니다.
 *   · 230px 고정 타일 → **반응형 3열 카드**(`sm:2 · lg:3`)
 *   · 글자를 사진 아래 흘려 두던 것 → **테두리 있는 카드 안**으로
 *   · 카드마다 **가로 꽉 찬 CTA 버튼**(참고 화면의 "View Details" 자리)
 *
 * 🔴 **썸네일은 여전히 `aspect-square` 입니다. 참고 화면이 가로형이라고 4:3 으로
 * 바꾸지 마세요** — 쿠팡·네이버쇼핑·오늘의집·아트네온 네 곳 전부 1:1 이었고
 * 예외가 없었습니다(`reference/reference.md` 부록 A 실측). 실적(`aspect-4/3`)과
 * **일부러 갈라 둔 것**이라, 통일하면 제품 목록이 실적 목록처럼 읽힙니다.
 *
 * ⚠️ **`MaterialsGrid` 와의 «230×230 짝» 은 이 변경으로 깨졌습니다** (2026-09-05
 * 사람 지시로 맞춰 뒀던 것). 짝을 없앤 게 아니라 **성격이 갈렸습니다** — 간판
 * 종류는 가격·사양·CTA 를 든 «파는 카드» 고, 재질은 이름표 한 줄짜리 «견본 조각»
 * 입니다. 재질까지 큰 카드로 키우면 빈 칸(가격·사양 없음)이 줄지어 나갑니다.
 *
 * 🔴 **가격(`sub`)은 관리자 화면에서 채웁니다. 비어 있으면 "가격 확인 필요" 이고,
 * 그때는 청록(가격 색)을 안 씁니다** — 빈 칸을 숫자 자리처럼 보여주면 "0원" 으로
 * 읽힙니다 [P6].
 *
 * ⚠️ **사양 칩(`points[0]`)을 2026-09-08 에 화면으로 되돌렸습니다.** 2026-09-05 에
 * "사양 문구 «대신» 가격대" 로 내렸던 것인데, 참고 화면의 카드는 **가격과 사양이
 * 각자 자리를 갖는** 배치라 둘이 안 부딪힙니다(가격이 여전히 더 큽니다).
 * 🔴 **치수는 3D 씬의 가정값이라** 격자 아래에 그 사실을 적어 뒀습니다
 * (`app/products/page.tsx`) — 그 줄을 지우면 이 칩들은 실측 약속이 됩니다 [P6].
 * 되돌리려면 `<SpecChips>` 한 줄만 빼면 됩니다.
 */
export default function SignTypesGrid({ signTypes }: { signTypes: SignModelWithFlag[] }) {
  return (
    <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {signTypes.map((t) => {
        const priced = Boolean(t.sub);
        return (
          <li
            key={t.slug}
            className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-white transition-colors hover:border-brand"
          >
            {/* 🔴 정사각. 위 머리말의 실측 근거를 읽기 전에 바꾸지 마세요 */}
            <div className="relative aspect-square overflow-hidden bg-paper">
              {t.available ? (
                <Image
                  src={t.image}
                  alt={t.alt || `${t.title} 3D 렌더`}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 420px"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <Placeholder
                  src={t.image}
                  width={900}
                  height={900}
                  label={t.title}
                  className="h-full w-full"
                />
              )}
            </div>

            <div className="flex flex-1 flex-col p-5">
              {/* 참고 화면의 «이름 + 오른쪽 가격» 줄 */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-[17px] font-black tracking-tight">{t.title}</h3>
                  <p className="mt-0.5 font-mono text-[11px] text-ink-500">{t.eyebrow}</p>
                </div>
                <div className="shrink-0 text-right">
                  {priced ? (
                    <>
                      <p className="text-[17px] font-black text-brand">{t.sub}</p>
                      <p className="text-[11px] text-ink-500">부터</p>
                    </>
                  ) : (
                    <p className="text-[13px] font-bold text-ink-500">가격 확인 필요</p>
                  )}
                </div>
              </div>

              <SpecChips spec={t.points[0]} />

              {/*
                상세 페이지가 아직 없어서 실제로 일어나는 일(견적 문의)로 보냅니다.
                `mt-auto` — 사양 줄 길이가 카드마다 달라도 버튼이 한 줄로 정렬됩니다.
              */}
              <Link
                href="/quote"
                className="mt-auto block rounded-xl bg-brand px-4 py-3 text-center text-[14px] font-black text-white transition-colors hover:bg-brand-600"
              >
                이 간판 견적 받기
              </Link>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * 참고 화면의 «아이콘 + 낱말» 사양 줄. 우리 데이터는 `"알루미늄 80mm · 직부착 ·
 * 앞면만 빛남"` 처럼 가운뎃점으로 이어 붙인 한 문장이라 그대로 쪼갭니다.
 *
 * ⚠️ **칸을 세 개로 맞추려고 없는 항목을 채우지 않습니다** — 종류에 따라 1~3개고,
 * 참고 화면처럼 항상 세 개가 서지는 않습니다. 빈 칸을 지어내면 재질 사진 때와
 * 같은 실패입니다 [P6].
 */
function SpecChips({ spec }: { spec?: string }) {
  const items = (spec ?? "")
    .split("·")
    .map((s) => s.trim())
    .filter(Boolean);
  if (items.length === 0) return null;

  return (
    <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-line pt-4">
      {items.map((s) => (
        <li key={s} className="flex items-center gap-1.5 text-[12px] text-ink-500">
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            aria-hidden="true"
            className="shrink-0 text-brand"
          >
            <rect x="1.5" y="1.5" width="9" height="9" rx="2" stroke="currentColor" strokeWidth="1.4" />
            <circle cx="6" cy="6" r="1.6" fill="currentColor" />
          </svg>
          {s}
        </li>
      ))}
    </ul>
  );
}
