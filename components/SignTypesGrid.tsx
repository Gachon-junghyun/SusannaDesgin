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
 * 🔴 **사양 칩(`points[0]`)은 화면에 안 나갑니다 — 두 번 내린 결정입니다.**
 * 2026-09-05 에 "사양 문구 «대신» 가격대" 로 한 번 내렸고, 2026-09-08 에 새 카드가
 * «가격과 사양이 각자 자리를 갖는» 배치라 잠깐 되살렸다가 **같은 날 사람이 보고
 * 다시 빼라고 했습니다**(`60mm · 벽 이격 60mm · 빛이 벽으로 샘` 같은 줄이 손님에게
 * 쓸모없다는 판단). **세 번째로 되살리지 마세요** — 되살릴 거면 그 전에 «이 문장이
 * 손님의 무슨 결정을 돕나» 부터 답이 있어야 합니다.
 * ⚠️ 값 자체는 `points[0]` 에 그대로 살아 있습니다(`SIGNTYPES.md` 대조용). 치수는
 * 3D 씬의 가정값이라 **화면에 내면 실측 약속이 됩니다** [P6].
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

              {/*
                상세 페이지가 아직 없어서 실제로 일어나는 일(견적 문의)로 보냅니다.
                🔴 `mt-auto` 는 «남는 공간이 있을 때만» 밉니다 — 사양 칩을 뺀 뒤에는 남는
                공간이 0 이라 버튼이 이름 줄에 딱 붙었습니다. 그래서 바깥 `div` 에
                `pt-4` 를 따로 줍니다(버튼 자체에 주면 버튼이 두꺼워집니다).
              */}
              <div className="mt-auto pt-4">
                <Link
                  href="/quote"
                  className="block rounded-xl bg-brand px-4 py-3 text-center text-[14px] font-black text-white transition-colors hover:bg-brand-600"
                >
                  이 간판 견적 받기
                </Link>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
