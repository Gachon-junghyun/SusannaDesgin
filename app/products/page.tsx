import Link from "next/link";
import { notFound } from "next/navigation";

import CatalogTabs from "@/components/CatalogTabs";
import MaterialsGrid from "@/components/MaterialsGrid";
import { PageHero } from "@/components/Section";
import SignTypesGrid from "@/components/SignTypesGrid";
import { SHOW_PRODUCTS } from "@/config/content";
import { site } from "@/config/site";
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
 * 🔴 **2026-09-08 — 배치를 다시 짰습니다.** 대표님이 렌터카 템플릿 화면을 주며
 * "레이아웃만 저 느낌으로, 색이랑 디자인은 수산나 그대로" 라고 정했습니다.
 * 가져온 것은 **배치 넷**뿐입니다 — ①가운데 정렬 큰 제목 ②그 밑 알약 탭 줄
 * ③테두리 있는 3열 카드(사진 → 이름·가격 → 사양 칩 → 가로 꽉 찬 버튼)
 * ④맨 아래 가로 띠. **팔레트·타이포·정사각 썸네일은 하나도 안 바꿨습니다** —
 * 참고 화면의 보라(`#5B36F2`)는 브랜드 청록(`#00a79d`)으로, 카드 바탕은
 * `paper`, 띠는 `ink` 로 앉혔습니다.
 *
 * ⚠️ **탭 축이 참고 화면과 다릅니다.** 저기는 «세단·SUV» 같은 제품 속성인데
 * 우리 데이터에는 그 자리에 넣을 축이 아직 없습니다 — 근거와 그때 할 일은
 * `components/CatalogTabs.tsx` 머리말에 적어 뒀습니다. **축을 지어내지 마세요** [P6].
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
          <p className="mb-10 rounded-xl border-2 border-accent bg-white px-4 py-3 text-[14px] leading-relaxed text-ink">
            <strong className="font-black">아직 손님에게 안 보이는 페이지입니다.</strong>{" "}
            주 메뉴의 “제품” 도 미리보기를 켠 동안에만 섭니다. 공개하려면 개발자에게
            말씀해 주세요.
          </p>
        )}

        {/* 참고 화면의 «가운데 큰 제목» 자리 */}
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl leading-tight font-black tracking-tight md:text-[42px]">
            무엇을 만드시나요
          </h2>
          <p className="mt-4 leading-relaxed text-ink-500 md:text-lg">
            간판 9종과 마감 재질을 사진으로 먼저 고르세요. 정확한 사양과 금액은 현장을
            보고 정합니다.
          </p>
        </div>

        <div className="mt-10 md:mt-12">
          <CatalogTabs
            tabs={[
              { key: "signs", label: "간판 종류", count: signTypeList.length },
              { key: "materials", label: "재질", count: materialList.length },
            ]}
            panels={{
              signs: (
                <>
                  <SignTypesGrid signTypes={signTypeList} />
                  {/*
                    🔴 **렌더 고지는 지우지 마세요.** 사진이 실사진이 아니라 3D 렌더라는
                    사실을 화면에서 밝히는 유일한 자리입니다 [P6] — F24-a 부터의 규칙입니다.
                    ⚠️ 원래 여기에 «카드에 적힌 치수는 모델 기준값» 이 같이 붙어 있었는데,
                    2026-09-08 에 사양 칩을 빼면서 그 조항도 같이 뺐습니다(화면에 치수가
                    없으니 가리킬 대상이 없습니다). 칩을 되살리면 그 문장도 같이 돌아와야 합니다.
                  */}
                  <p className="mt-6 text-[13px] leading-relaxed text-ink-500">
                    사진은 실제 시공 사진이 아니라 3D 렌더입니다. 정확한 사양과 금액은
                    현장 실측 후에 정합니다.
                  </p>
                </>
              ),
              materials: <MaterialsGrid materials={materialList} />,
            }}
          />
        </div>

        {/*
          참고 화면 맨 아래 가로 띠(로고 · 메뉴 · 전화번호) 자리입니다.
          ⚠️ **먹색으로 짰다가 되돌렸습니다** — 사이트 공통 푸터가 이미 먹색이라
          두 덩이가 붙어 서면 띠가 푸터의 일부로 읽힙니다. 참고 화면의 그 띠도
          밝은 바탕입니다.
          가격표 대신 두는 자리이기도 합니다 — 조사한 네 곳 중 맞춤 제작을 파는 곳은
          목록에 가격을 안 띄우고 전부 상담으로 보냅니다 (reference/reference.md 부록 A).
        */}
        <div className="mt-20 rounded-2xl border border-line bg-paper px-6 py-10 md:mt-28 md:px-10 md:py-12">
          <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-black tracking-tight md:text-3xl">
                어떤 간판이 맞는지 모르겠다면
              </h2>
              <p className="mt-3 leading-relaxed text-ink-500">
                건물 형태와 업종만 알려주셔도 됩니다. 현장을 보고 맞는 종류부터 골라
                시안과 견적을 함께 보내드립니다.
              </p>
            </div>

            <div className="flex shrink-0 flex-col items-start gap-4 sm:flex-row sm:items-center">
              <a
                href={site.phoneHref}
                className="text-[17px] font-black tracking-tight transition-colors hover:text-brand-700"
              >
                {site.phone}
              </a>
              <Link
                href="/quote"
                className="rounded-xl bg-brand px-8 py-4 font-black text-white transition-colors hover:bg-brand-600"
              >
                무료 견적 신청
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
