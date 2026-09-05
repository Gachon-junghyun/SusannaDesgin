import Link from "next/link";
import { notFound } from "next/navigation";

import MaterialsGrid from "@/components/MaterialsGrid";
import { PageHero } from "@/components/Section";
import SignTypesGrid from "@/components/SignTypesGrid";
import { SHOW_PRODUCTS } from "@/config/content";
import { getBlocks } from "@/lib/cms";
import { imageExists } from "@/lib/images";
import { getPreview } from "@/lib/preview";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata("/products");

/** 요청 시 렌더링 — 이유는 `app/page.tsx` 의 같은 설정 주석 참고. */
export const dynamic = "force-dynamic";

/**
 * 제품(간판 유형) 카탈로그 — **아직 손님에게 안 열린 페이지입니다** (F24).
 *
 * 🔴 **`SHOW_PRODUCTS` 가 꺼져 있으면 관리자 말고는 404 입니다.**
 * "링크만 안 걸어 두면 되겠지" 로 두지 마세요 — 주소는 짧고 추측 가능하고,
 * 크롤러는 사이트맵 없이도 주소를 주워 옵니다. `noindex` 는 «색인하지 말라» 지
 * «보여주지 말라» 가 아닙니다.
 *
 * 켜는 법은 `config/content.ts` 의 `SHOW_PRODUCTS` 주석에 있습니다 (대표님 결정).
 *
 * 🔴 **실적 사진 6장짜리 `ProductsGrid`(구 "제품" 카드)는 2026-09-05 에 화면에서
 * 뺐습니다** — 대표님이 "간판 종류 9가지(3D 모델링) 로 대신 보여달라" 고 정했습니다.
 * `product` 구역·컴포넌트·관리자 탭은 **지우지 않고 그대로 둡니다** — FABRICATION
 * 을 껐을 때와 같은 처방입니다(코드에서만 안 그리고, DB·관리자 화면은 살려 둡니다).
 * 다시 켤 일이 생기면 `git log -- app/products/page.tsx` 에서 `<ProductsGrid>` 줄을
 * 되살리면 됩니다.
 *
 * 재질·간판 종류 화면의 근거(정사각 썸네일·필터 축)는 `reference/reference.md`
 * 부록 A. **가격대 표기(간판 종류)만은 그 문서의 결론과 다릅니다** — 이유는
 * `0009_material_signmodel.sql` 머리말.
 */
export default async function ProductsPage() {
  const preview = await getPreview();
  if (!SHOW_PRODUCTS && !preview.on) notFound();

  const { materials, signModels } = await getBlocks();
  const materialList = materials.map((m) => ({ ...m, available: imageExists(m.image) }));
  const signTypeList = signModels.map((t) => ({ ...t, available: imageExists(t.image) }));

  return (
    <>
      <PageHero
        eyebrow="PRODUCTS"
        title="제품"
        desc="간판은 종류마다 만드는 법과 시공 방식이 다릅니다. 어떤 것이 맞는지부터 같이 정합니다."
        path="/products"
      />

      <div className="wrap py-14 md:py-20">
        {/*
          🔴 아직 안 연 페이지라는 표시. 손님에게는 애초에 404 라 이 띠를 볼 사람은
          관리자뿐입니다. **지우지 마세요** — 지우면 미리보기를 켠 대표님이 이 화면을
          «이미 공개된 것» 으로 읽습니다.
        */}
        {!SHOW_PRODUCTS && (
          <p className="mb-8 rounded-xl border-2 border-accent bg-white px-4 py-3 text-[14px] leading-relaxed text-ink">
            <strong className="font-black">아직 손님에게 안 보이는 페이지입니다.</strong>{" "}
            주 메뉴의 “제품” 도 미리보기를 켠 동안에만 섭니다. 공개하려면 개발자에게
            말씀해 주세요.
          </p>
        )}

        {/*
          간판 종류 9가지 — 실제로 모델링해서 낸 제작 방식 (`sign_model` 구역).
          가격대는 관리자 화면(F19, "간판 종류" 탭)에서 고칩니다.
        */}
        <div>
          <h2 className="text-2xl font-black tracking-tight md:text-3xl">간판 종류</h2>

          <div className="mt-8">
            <SignTypesGrid signTypes={signTypeList} />
          </div>
        </div>

        {/*
          재질 — `material` 구역(58종 후보). 관리자 화면에서 직접 추가·삭제합니다.
        */}
        <div className="mt-20 md:mt-28">
          <h2 className="text-2xl font-black tracking-tight md:text-3xl">재질</h2>

          <div className="mt-8">
            <MaterialsGrid materials={materialList} />
          </div>
        </div>

        {/*
          가격표 대신 두는 자리입니다. 조사한 네 곳 중 맞춤 제작을 파는 곳은
          목록에 가격을 안 띄우고 전부 상담으로 보냅니다 (reference/reference.md 부록 A).
        */}
        <div className="mt-16 rounded-2xl bg-paper px-6 py-12 text-center">
          <h2 className="text-2xl font-black tracking-tight">
            어떤 간판이 맞는지 모르겠다면
          </h2>
          <p className="mt-3 leading-relaxed text-ink-500">
            건물 형태와 업종만 알려주셔도 됩니다. 현장을 보고 맞는 종류부터 골라
            시안과 견적을 함께 보내드립니다.
          </p>
          <Link
            href="/quote"
            className="mt-6 inline-block rounded-xl bg-brand px-8 py-4 font-black text-white transition-colors hover:bg-brand-600"
          >
            무료 견적 신청
          </Link>
        </div>
      </div>
    </>
  );
}
