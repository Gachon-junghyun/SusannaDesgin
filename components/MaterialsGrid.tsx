import Image from "next/image";
import Placeholder from "./Placeholder";
import type { Block } from "@/lib/cms";

type MaterialWithFlag = Block & { available: boolean };

/**
 * 재질 격자 — `/products` 안의 목록 (F24 다음 단계, `material` 구역).
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
 * 분류 탭이 없습니다 — `eyebrow` 로 묶을 수는 있지만(58종을 11개 대분류로),
 * 지금은 있는 걸 그대로 다 보여줍니다. 관리자 화면에서 직접 추가·삭제합니다.
 * 서버 컴포넌트입니다(탭이 없어 상태가 필요 없습니다).
 */
export default function MaterialsGrid({ materials }: { materials: MaterialWithFlag[] }) {
  return (
    <ul className="grid grid-cols-[repeat(auto-fill,230px)] gap-3">
      {materials.map((m) => (
        <li key={m.slug || m.image}>
          {/* 🔴 230×230 고정(정사각). 사람 지시로 간판 종류와 크기를 맞췄습니다 — 바꾸기 전에 SignTypesGrid 도 같이 고치세요 */}
          <div className="relative aspect-square w-[230px] overflow-hidden rounded-xl bg-paper">
            {m.available ? (
              <Image
                src={m.image}
                alt={m.alt || m.eyebrow}
                fill
                sizes="230px"
                className="object-cover"
              />
            ) : (
              <Placeholder src={m.image} width={600} height={600} label={m.eyebrow} className="h-full w-full" />
            )}
          </div>
          {m.eyebrow && (
            <p className="mt-1.5 text-center text-[13px] font-bold text-ink-500">{m.eyebrow}</p>
          )}
        </li>
      ))}
    </ul>
  );
}
