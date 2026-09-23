"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { fontGroups, type FontGroup, type SpecimenFont } from "@/config/fonts";

/**
 * `/fonts` 의 견본 격자 (F25, 2026-09-23).
 *
 * 배치는 Figma 커뮤니티 «Free Fonts in Editable Components»(type.thats.tiptop, CC BY 4.0)의
 * 견본 카드를 옮겼습니다 — **글꼴 이름을 그 글꼴로 크게 · 가는 선 아래 한 줄 정보 ·
 * 큰 견본 문장 · 아래 칸에 자모 묶음과 큰 글자 하나 · 밝은 카드와 어두운 카드를 번갈아.**
 * 참고 화면의 라임 포인트는 브랜드 청록으로, 회색 바탕은 `paper` 로 앉혔습니다.
 * 🔴 **어두운 카드는 먹색이 아니라 짙은 청록(`brand-700`)입니다** (2026-09-23, 사람 지시 *"블랙 말고
 * 우리 브랜드 컬러"*). 원래 청록(`brand`)은 흰 글씨가 2.99:1 이라 한 단계 짙은 값을 골랐습니다.
 * 그 위의 작은 청록 글자는 `brand-400` 이 안 보여서 `brand-100` 으로 뺐습니다.
 * 카드 안에 상자를 또 두지 않고 선으로만 나눴습니다.
 *
 * 🔴 **견본은 우리 회사 정보로 시작합니다** — 상호·영문 상호·전화번호(사람 지시, 2026-09-23).
 * 손님이 입력칸에 자기 가게 이름을 적으면 큰 견본만 그 글자로 바뀝니다.
 * 🔴 **견본 문장은 손님이 적은 글자입니다** — 간판은 결국 «우리 가게 이름이 어떻게 보이나»
 * 라서, 영문 pangram 대신 입력칸 하나를 모든 카드가 같이 씁니다.
 *
 * ⚠️ **글꼴은 카드가 화면에 들어올 때 붙입니다.** 14벌을 한꺼번에 받으면 모바일에서
 * 수 MB 입니다(정묵바위체 한 벌이 3.3MB). @font-face 는 그 이름으로 글자를 그릴 때에만
 * 받으므로, 안 보이는 카드엔 font-family 를 안 줍니다.
 */

/** 견본에 넣는 우리 회사 정보 — 페이지가 `config/site.ts` 에서 넘깁니다 [A5] */
export type SampleInfo = { name: string; nameEn: string; phone: string };
const MAX = 20;

function useSeen<T extends Element>() {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setSeen(true);
          io.disconnect();
        }
      },
      { rootMargin: "300px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [seen]);
  return [ref, seen] as const;
}

/** 글자 수에 따라 견본 크기를 줄입니다 — 긴 상호가 카드 밖으로 안 나가게 */
function sampleSize(text: string) {
  const n = [...text].length;
  if (n <= 5) return "text-[48px] md:text-[56px]";
  if (n <= 9) return "text-[38px] md:text-[44px]";
  if (n <= 14) return "text-[30px] md:text-[34px]";
  return "text-[24px] md:text-[28px]";
}

function Specimen({
  font,
  no,
  text,
  info,
  dark,
}: {
  font: SpecimenFont;
  no: number;
  text: string;
  info: SampleInfo;
  dark: boolean;
}) {
  const [ref, seen] = useSeen<HTMLElement>();
  const face = seen ? { fontFamily: font.family, fontWeight: font.weight } : undefined;
  const group = fontGroups.find((g) => g.key === font.group)?.label;

  const rule = dark ? "border-white/20" : "border-line";
  const sub = dark ? "text-white/70" : "text-ink-500";

  return (
    <article
      ref={ref}
      className={`flex flex-col rounded-lg p-6 md:p-7 ${dark ? "bg-brand-700 text-white" : "bg-white text-ink"}`}
    >
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="text-[26px] leading-tight md:text-[30px]" style={face}>
          {font.name}
        </h3>
        <span className={`text-[12px] tabular-nums ${sub}`}>
          {String(no).padStart(2, "0")}
        </span>
      </div>

      <p className={`mt-2 flex justify-between border-b pb-3 text-[12px] ${rule} ${sub}`}>
        <span>{group}</span>
        <a
          href={`https://noonnu.cc/font_page/${font.noonnu}`}
          target="_blank"
          rel="noopener noreferrer"
          className="underline-offset-2 hover:underline"
        >
          눈누에서 보기
        </a>
      </p>

      <p
        className={`mt-8 mb-6 min-h-[2.4em] leading-[1.15] break-keep ${sampleSize(text)}`}
        style={face}
      >
        {text || info.name}
      </p>

      {/* 쓰임 두 줄 — `config/fonts.ts` 의 seen·fits. 출처 없는 안내라 작게 둡니다 */}
      <dl className="mb-5 space-y-1 text-[13px] leading-relaxed">
        <div className="flex gap-3">
          <dt className={`shrink-0 ${sub}`}>많이 보이는 곳</dt>
          <dd>{font.seen}</dd>
        </div>
        <div className="flex gap-3">
          <dt className={`shrink-0 ${sub}`}>어울리는 간판</dt>
          <dd>{font.fits}</dd>
        </div>
      </dl>

      <div className={`mt-auto grid grid-cols-[1fr_auto] items-end gap-4 border-t pt-4 ${rule}`}>
        <p className={`text-[14px] leading-relaxed ${sub}`} style={face}>
          {info.nameEn}
          <br />
          {info.phone}
        </p>
        <span className="text-[64px] leading-none" style={face} aria-hidden>
          {[...info.name][0]}
        </span>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3 text-[13px]">
        <span className={dark ? "text-brand-100" : "text-brand-700"}>
          간판·로고 사용 가능
        </span>
        <Link
          href={`/quote?font=${font.slug}`}
          className={`font-bold transition-colors ${dark ? "hover:text-brand-100" : "hover:text-brand-700"}`}
        >
          이 글꼴로 견적 →
        </Link>
      </div>
    </article>
  );
}

export default function FontSpecimens({
  fonts,
  info,
}: {
  fonts: SpecimenFont[];
  info: SampleInfo;
}) {
  const [text, setText] = useState(info.name);
  const [on, setOn] = useState<"all" | FontGroup>("all");

  const list = on === "all" ? fonts : fonts.filter((f) => f.group === on);
  const tabs = [
    { key: "all" as const, label: "전체", count: fonts.length },
    ...fontGroups.map((g) => ({
      key: g.key,
      label: g.label,
      count: fonts.filter((f) => f.group === g.key).length,
    })),
  ];

  return (
    <>
      <div className="wrap pt-14 md:pt-20">
      <div className="mx-auto max-w-2xl">
        <label htmlFor="font-sample" className="block text-[14px] font-bold text-ink-500">
          간판에 들어갈 글자
        </label>
        <input
          id="font-sample"
          value={text}
          maxLength={MAX}
          onChange={(e) => setText(e.target.value)}
          placeholder={info.name}
          className="mt-2 w-full border-0 border-b-2 border-ink bg-transparent pb-3 text-center text-3xl font-bold tracking-tight outline-none placeholder:text-ink-500/40 focus:border-brand md:text-4xl"
        />
        <p className="mt-2 text-center text-[13px] text-ink-500">
          가게 이름을 적으면 아래 글꼴 {fonts.length}종에 한 번에 들어갑니다.
        </p>
      </div>

      <div className="mt-10 flex flex-wrap justify-center gap-2">
        {tabs.map((t) => {
          const active = t.key === on;
          return (
            <button
              key={t.key}
              type="button"
              aria-pressed={active}
              onClick={() => setOn(t.key)}
              className={`rounded-full border px-5 py-2.5 text-[14px] font-bold transition-colors ${
                active
                  ? "border-brand bg-brand text-white"
                  : "border-line bg-white text-ink-500 hover:border-ink-500 hover:text-ink"
              }`}
            >
              {t.label}
              <span className={`ml-1.5 text-[12px] ${active ? "text-white/70" : "text-ink-500"}`}>
                {t.count}
              </span>
            </button>
          );
        })}
      </div>
      </div>

      {/* 참고 화면의 회색 바탕 자리 — 화면 끝까지 까는 `paper` 띠 */}
      <div className="mt-10 bg-paper py-10 md:mt-12 md:py-14">
        <div className="wrap grid gap-4 sm:grid-cols-2 md:gap-5 lg:grid-cols-3">
          {list.map((f, i) => (
            <Specimen
              key={f.slug}
              font={f}
              no={fonts.indexOf(f) + 1}
              text={text.trim()}
              info={info}
              dark={i % 2 === 1}
            />
          ))}
        </div>
      </div>
    </>
  );
}
