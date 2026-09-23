import { notFound } from "next/navigation";
import { Black_Han_Sans, Nanum_Brush_Script } from "next/font/google";

import FontSpecimens, { CustomFontCard } from "@/components/FontSpecimens";
import { PageHero } from "@/components/Section";
import { SHOW_FONTS, specimenFonts } from "@/config/fonts";
import { site } from "@/config/site";
import { getPreview } from "@/lib/preview";
import { pageMetadata } from "@/lib/seo";

import "./specimen.css";

export const metadata = pageMetadata("/fonts");

/** 요청 시 렌더링 — 미리보기 쿠키를 읽습니다(`app/products/page.tsx` 와 같은 이유) */
export const dynamic = "force-dynamic";

/**
 * 구글 폰트에도 있는 둘은 사이트 글꼴(고운바탕)과 같은 길로 받습니다 — 자체 호스팅 +
 * 글자 범위별 조각. `preload: false` 인 이유: 이 페이지 밖으로 한 바이트도 안 새게.
 */
const blackHanSans = Black_Han_Sans({
  variable: "--font-black-han-sans",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});
const nanumBrush = Nanum_Brush_Script({
  variable: "--font-nanum-brush",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

/**
 * 글꼴 견본 — «이 글꼴로 만들어 주세요» 를 고르는 페이지 (F25, 2026-09-23).
 *
 * 🔴 **`SHOW_FONTS` 가 꺼져 있으면 관리자 말고는 404 입니다** — `/products` 와 같은 규칙입니다.
 * 목록과 고른 기준(라이선스)은 `config/fonts.ts`, 카드 배치의 출처는 `components/FontSpecimens.tsx`.
 *
 * 메뉴 「글꼴」은 `SHOW_FONTS || 미리보기` 에서 섭니다(`components/Header.tsx`).
 * 카드의 「이 글꼴로 견적」은 `/quote?font=<slug>` 로 갑니다. 견적 폼은 그 값을
 * **목록과 대조해** 「보고 온 제품」 칸에 `글꼴: 이름` 으로 싣습니다(F24-c 와 같은 칸).
 * 손님이 적은 견본 글자는 **주소에 안 싣습니다** — 주소에서 온 글자를 그대로 폼에 넣지
 * 않는다는 F24-c 의 규칙을 그대로 따릅니다. 가게 이름은 폼의 문의 내용에 적으면 됩니다.
 */
export default async function FontsPage() {
  const preview = await getPreview();
  if (!SHOW_FONTS && !preview.on) notFound();

  return (
    <div className={`${blackHanSans.variable} ${nanumBrush.variable}`}>
      <PageHero
        eyebrow="FONTS"
        title="글꼴"
        desc="간판 글자는 글꼴이 인상의 절반입니다. 가게 이름을 적어 보고 마음에 드는 글꼴로 견적을 받으세요."
        path="/fonts"
      />

      {!SHOW_FONTS && (
        <div className="wrap pt-10">
          <p className="rounded-xl border-2 border-accent bg-white px-4 py-3 text-[14px] leading-relaxed text-ink">
            <strong className="font-black">아직 손님에게 안 보이는 페이지입니다.</strong>{" "}
            미리보기를 켠 동안에만 열립니다. 공개하려면 개발자에게 말씀해 주세요.
          </p>
        </div>
      )}

      <FontSpecimens
        fonts={specimenFonts}
        info={{ name: site.name, nameEn: site.nameEn }}
      />

      {/*
        커스텀 글꼴 문의 (2026-09-23, 사람 지시). 원래 여기 있던 라이선스 고지 문단과
        전화·견적 띠는 같은 날 사람 지시로 뺐습니다 — 라이선스 근거는 `config/fonts.ts` 머리말에 남아 있습니다.
        오른쪽은 «글씨 정보만 적는 카드»입니다(사람 지시). 연락처는 견적 페이지에서 받습니다 —
        폼을 새로 지으면 고장도 두 벌입니다. 문의에는 「보고 온 제품」 = `글꼴: 커스텀 글꼴` 이 붙습니다.
      */}
      <section className="wrap py-16 md:py-24">
        <div className="grid gap-10 lg:grid-cols-[1fr_420px] lg:items-start lg:gap-16">
          <div>
            <p className="mb-3 text-[13px] font-black tracking-[0.25em] text-brand-700">
              CUSTOM LETTERING
            </p>
            <h2 className="text-3xl leading-tight font-black tracking-tight md:text-[42px]">
              커스텀 글꼴 문의
            </h2>
            <p className="mt-5 max-w-xl leading-relaxed text-ink-500 md:text-lg">
              목록에 없는 글꼴을 쓰고 싶거나, 우리 가게 이름만의 글자가 필요하다면 원하는
              느낌을 적어 주세요. 참고할 간판 사진이나 로고가 있으면 함께 알려 주셔도 됩니다.
            </p>
            <ul className="mt-8 space-y-3 border-t border-line pt-6 text-[15px] leading-relaxed">
              <li>쓰고 싶은 글꼴 이름이나 비슷한 느낌의 글꼴</li>
              <li>간판에 들어갈 글자와 대략의 크기</li>
              <li>가게 분위기 (예: 오래된 노포 느낌, 깔끔한 카페 느낌)</li>
            </ul>
          </div>

          <CustomFontCard />
        </div>
      </section>
    </div>
  );
}
