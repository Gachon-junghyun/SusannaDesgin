import Link from "next/link";
import { notFound } from "next/navigation";
import { Black_Han_Sans, Nanum_Brush_Script } from "next/font/google";

import FontSpecimens from "@/components/FontSpecimens";
import { PageHero } from "@/components/Section";
import { FONTS_CHECKED_AT, SHOW_FONTS, specimenFonts } from "@/config/fonts";
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
        info={{ name: site.name, nameEn: site.nameEn, phone: site.phone }}
      />

      <div className="wrap pb-16 md:pb-24">
        {/*
          🔴 라이선스 고지는 지우지 마세요 [P6]. 눈누 요약표는 «참고용» 이고,
          눈누 스스로 그렇게 적어 둡니다 — 그 문장을 그대로 옮긴 자리입니다.
        */}
        <p className="mt-6 max-w-3xl text-[13px] leading-relaxed text-ink-500">
          모두 눈누(noonnu.cc)에서 인쇄와 로고(BI/CI) 사용이 «사용 가능»으로 표시된 무료
          글꼴입니다({FONTS_CHECKED_AT} 확인). 눈누 안내대로 이 사용범위는 참고용이며, 정확한
          사용범위는 이용 전 폰트 저작권자에게 확인해야 합니다.
        </p>

        <div className="mt-16 flex flex-col gap-8 border-t border-line pt-10 md:mt-20 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-black tracking-tight md:text-3xl">
              어울리는 글꼴을 모르겠다면
            </h2>
            <p className="mt-3 leading-relaxed text-ink-500">
              업종과 간판 종류만 알려주세요. 시안에 글꼴 두세 가지를 같이 얹어 보내드립니다.
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
  );
}
