import Image from "next/image";
import Placeholder from "./Placeholder";
import type { Block } from "@/lib/cms";

type MaterialWithFlag = Block & { available: boolean };

/**
 * 재질 격자 — `/products` 안의 목록 (`material` 구역).
 *
 * 🔴 **글자는 대분류 이름 하나만 씁니다.** (2026-09-05, 사람 지시) 처음엔 글자를
 * 아예 없앴는데, 재질 사진만으로 못 알아보는 경우가 있어(금속·녹슨 금속·타일 —
 * `config/content.ts` `materials` 폴백 배열 주석 참고) **"뭔지는 쓰기"** 로
 * 정정됐습니다. `eyebrow`(대분류: 화강석·벽돌·콘크리트 등)만 보여주고,
 * `title`(관리자가 같은 대분류를 구별하는 설명)은 화면에 안 냅니다.
 *
 * ⚠️ 사진은 `ProductsGrid`처럼 T1(전면발광 채널) 을 얹은 렌더가 아니라 **재질 애셋의
 * 원본 diffuse 맵**입니다 — "이 재질이 간판 뒤에서 어떻게 보이나"가 아니라
 * "이 재질 자체가 뭔가"를 보여주는 자리라 소재가 다릅니다.
 *
 * 🔴 **`SignTypesGrid` 와 «230×230 짝» 이었던 것은 2026-09-08 에 끊었습니다.**
 * 짝을 잊은 게 아니라 **성격이 갈렸습니다** — 저쪽은 가격·사양·CTA 를 든 «파는
 * 카드» 라 참고 화면(렌터카 템플릿)대로 3열 카드가 됐고, 여기는 이름표 한 줄짜리
 * «견본 조각» 입니다. 재질까지 큰 카드로 키우면 **가격·사양 칸이 통째로 비어**
 * 줄지어 나갑니다 — FABRICATION 구역을 내린 것과 같은 실패입니다 [P6].
 * 대신 테두리·모서리·`paper` 바탕은 저쪽 카드와 맞춰서 **한 화면에서 같은 집안**
 * 으로 읽히게 했습니다. 크기를 바꾸려면 그쪽 머리말을 먼저 읽으세요.
 *
 * 분류 탭이 없습니다 — `eyebrow`(대분류) 로 묶을 수는 있고 실제로 묶입니다
 * (2026-09-08 실측: DB 15종 = 6개 대분류). **15종이 한 화면에 다 들어와서 안
 * 붙였습니다** — 거를 게 없는 거르개는 누를 이유가 없습니다. 재질이 늘면 여기에
 * 붙이세요(`CatalogTabs` 머리말에 같은 근거가 있습니다).
 * 서버 컴포넌트입니다(탭이 없어 상태가 필요 없습니다).
 */
export default function MaterialsGrid({ materials }: { materials: MaterialWithFlag[] }) {
  return (
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-4 sm:grid-cols-[repeat(auto-fill,minmax(180px,1fr))]">
      {materials.map((m) => (
        <li
          key={m.slug || m.image}
          className="overflow-hidden rounded-2xl border border-line bg-white"
        >
          {/* 🔴 정사각 — 간판 종류 카드와 같은 비율입니다(부록 A: 제품 썸네일은 1:1) */}
          <div className="relative aspect-square overflow-hidden bg-paper">
            {m.available ? (
              <Image
                src={m.image}
                alt={m.alt || m.eyebrow}
                fill
                sizes="(max-width: 640px) 50vw, 220px"
                className="object-cover"
              />
            ) : (
              <Placeholder
                src={m.image}
                width={600}
                height={600}
                label={m.eyebrow}
                className="h-full w-full"
              />
            )}
          </div>
          {m.eyebrow && (
            <p className="px-3 py-2.5 text-center text-[13px] font-bold text-ink-500">
              {m.eyebrow}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
