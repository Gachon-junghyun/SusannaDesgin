import Image from "next/image";
import Placeholder from "./Placeholder";
import type { Block } from "@/lib/cms";

type SignModelWithFlag = Block & { available: boolean };

/**
 * 간판 종류 9가지 격자 — 실제로 모델링한 제작 방식 (`sign_model` 구역, F24 다음 단계).
 *
 * 🔴 **사진을 재질(`MaterialsGrid`)과 같은 230×230 정사각 고정 크기로 맞췄습니다**
 * (2026-09-05, 사람 지시). 렌더 원본은 4:3(1400×1050)이라 `object-cover`가 좌우를
 * 자릅니다 — 간판이 가운데 있어서 잘려도 알아보는 데는 지장이 없습니다.
 * 크기를 바꾸려면 `MaterialsGrid` 도 같이 고치세요(둘이 짝입니다).
 *
 * 🔴 **사양 문구 대신 가격대를 보여줍니다** (2026-09-05, 사람 지시).
 * `sub`(가격대)가 비어 있으면 **"가격 확인 필요"** 로 대체합니다 — 빈 칸을 화면에
 * 숫자처럼 보여주면 손님이 "0원"으로 오해합니다. 실제 가격은 관리자 화면에서
 * 채웁니다. 제작 사양(예: "알루미늄 80mm")은 `points[0]` 에 참고용으로만 남아
 * 있고 화면엔 안 나갑니다 — `SIGNTYPES.md` 대조용입니다.
 * ⚠️ 이 가격 표기는 `reference/reference.md` 부록 A 의 "가격 칸 없음" 결정과
 * 다릅니다 — 대표님이 알고 뒤집은 결정입니다(`0009_material_signmodel.sql` 머리말).
 */
export default function SignTypesGrid({ signTypes }: { signTypes: SignModelWithFlag[] }) {
  return (
    <ul className="grid grid-cols-[repeat(auto-fill,230px)] gap-3">
      {signTypes.map((t) => (
        <li key={t.slug} className="flex w-[230px] flex-col">
          <div className="relative aspect-square w-[230px] overflow-hidden rounded-xl bg-paper">
            {t.available ? (
              <Image
                src={t.image}
                alt={t.alt || `${t.title} 3D 렌더`}
                fill
                sizes="230px"
                className="object-cover"
              />
            ) : (
              <Placeholder src={t.image} width={600} height={600} label={t.title} className="h-full w-full" />
            )}
          </div>

          <div className="mt-3">
            <p className="font-mono text-[11px] text-ink-500">{t.eyebrow}</p>
            <h3 className="text-[16px] font-black tracking-tight">{t.title}</h3>
            <p className="mt-1 text-[13px] font-bold text-brand">
              {t.sub || "가격 확인 필요"}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
