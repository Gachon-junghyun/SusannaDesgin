"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";

import { makerFont } from "@/config/fonts";
import type { MakerKind } from "@/config/maker";
import { HeroGlow } from "@/components/Section";
import { fmtMm, kindOf, wallFill, type Design, type Level, type Measured, type Note, type PlateItem, type TextItem } from "@/lib/maker/design";
import { layoutLines, loadFontUrl, type Outline } from "@/lib/maker/fonts";
import { platePath } from "@/lib/maker/geom";
import type { PickViewMode, RenderView } from "./SignMaker";
import { PICK_LETTERS, TUNE0, TUNE_COLORS, TUNE_RANGE, isTuned, tuneLines, weightStep, type Pick, type Tune } from "@/lib/maker/pick";

/**
 * 수산나 픽 — 손님이 받는 «고르고 다듬는» 화면 (F26-n · 2026-10-25). 공유 링크(`/maker/s/<토큰>`)가 이걸 엽니다.
 *
 * 🔴 **배치는 현대자동차 «내 차 만들기»(견적)를 직접 열어 보고 옮겼습니다**(2026-10-25 `/errand`, 캡처는
 *    `reference/hyundai_configurator/`). 옮긴 것: 위쪽 단계 막대(«01 모델 선택 | 02 내 차 만들기 › 외장 색상 › 내장 색상 › 옵션» —
 *    오른쪽이 내려가면 지금 칸이 진해짐) · 트림 카드(이름, 그림, 사양, «자세히 보기 / 내 차 만들기» 두 단추, «Best» 표시) ·
 *    왼쪽 큰 무대가 서 있고 오른쪽만 내려가는 2단 · 무대 아래 «Exterior / Interior» 두 칸 전환 · «요약 보기» 창(항목, 합계, 완료 단추).
 *    **안 옮긴 것**: 가격(맞춤 제작이라 정가 없음 — F24 와 같은 근거) · 360° 회전(간판은 정면 그림) · «다른 구매자 41%» 통계(없는 숫자).
 *    색과 글꼴은 수산나 것입니다(먹색 머리말 + 청록 빛 `HeroGlow`, 고운바탕, 네모 단추). 남색 단추 → 먹색, 모래색 머리말 → 먹색.
 *
 * 🔴 **손님이 바꾸는 것은 `Tune` 뿐입니다**(크기, 굵기, 여백, 위치, 기울기, 색). 글자 내용, 글꼴, 간판 종류는 못 바꿉니다 —
 *    사람 요청이 «만들기가 아니라 고르기»였습니다. 다른 모양은 «다른 픽»으로 고릅니다.
 */

type Props = {
  picks: Pick[];
  pickIdx: number;
  onPick: (i: number) => void;
  tune: Tune;
  onTune: (t: Tune) => void;
  /** 다듬은 결과(그리는 디자인) */
  design: Design;
  kind: MakerKind;
  overall: Measured | null;
  verdict: Level;
  notes: Note[];
  stage: React.ReactNode;
  night: boolean;
  onNight: (v: boolean) => void;
  /** 도면(정면도) · 입체 · 모델링(블렌더 렌더) — 도면이 기본입니다 */
  view: PickViewMode;
  onView: (v: PickViewMode) => void;
  render: RenderView;
  ledOn: boolean;
  onLedOn: (v: boolean) => void;
  dims: boolean;
  onDims: (v: boolean) => void;
  zoomPct: number;
  onFit: () => void;
  onZoom: (f: number) => void;
  fontName: string;
  title: string;
  expiresAt?: string;
  canEdit: boolean;
  busy: string;
  err: string;
  /** 몇 번째로 받은 안인가(같은 링크에 담당자가 다시 올리면 2, 3 …) */
  round: number;
  /** 글자 묶음의 크기와 판 끝까지의 여백 — 판 안의 글자는 무대에 치수선이 없어 여기 숫자로 보여 줍니다 */
  letters: { w: number; h: number; side: { l: number; r: number; t: number; b: number } | null } | null;
  /** «보내기» — 고른 픽 + 다듬기 + 한마디를 담당자에게(0021). 견적이 아니라 «주고받기»입니다(사람 결정 2026-10-25) */
  onSend: (memo: string) => Promise<{ ok: boolean; error?: string }>;
  onSave: () => void;
  onContinue: () => void;
};

const SECTIONS = [
  { id: "size", label: "크기" },
  { id: "weight", label: "굵기" },
  { id: "space", label: "여백" },
  { id: "move", label: "위치" },
  { id: "color", label: "색상" },
] as const;
type SectionId = (typeof SECTIONS)[number]["id"];

const ymd = (iso: string) => {
  const t = new Date(iso);
  return Number.isNaN(t.getTime()) ? "" : `${t.getFullYear()}. ${t.getMonth() + 1}. ${t.getDate()}.`;
};

export default function PickView(p: Props) {
  const many = p.picks.length > 1;
  const [step, setStep] = useState<1 | 2>(many ? 1 : 2);
  const [summary, setSummary] = useState(false);
  const [memo, setMemo] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<{ at: Date; pick: number } | null>(null);
  const [sendErr, setSendErr] = useState("");
  const send = async () => {
    setSending(true);
    setSendErr("");
    const r = await p.onSend(memo.trim());
    setSending(false);
    if (r.ok) setSent({ at: new Date(), pick: p.pickIdx });
    else setSendErr(r.error || "지금은 보내지 못했습니다.");
  };
  const [active, setActive] = useState<SectionId>("size");
  const panel = useRef<HTMLDivElement>(null);
  const pick = p.picks[p.pickIdx];
  const base = pick.design;
  const t = p.tune;
  const set = (patch: Partial<Tune>) => p.onTune({ ...t, ...patch });

  // 오른쪽 칸이 내려가면 위쪽 단계 막대의 «지금 칸»이 따라옵니다(현대차와 같은 움직임)
  useEffect(() => {
    if (step !== 2) return;
    const root = panel.current;
    if (!root) return;
    // 관찰기는 «바뀐» 칸만 알려 줍니다 — 보이는 칸을 따로 들고 있다가 그중 맨 위를 고릅니다(바뀐 것만 보면 짧은 칸을 건너뜁니다)
    const seen = new Set<string>();
    const io = new IntersectionObserver(
      (es) => {
        for (const e of es) {
          const id = e.target.id.replace("pk-", "");
          if (e.isIntersecting) seen.add(id);
          else seen.delete(id);
        }
        const top = SECTIONS.find((x) => seen.has(x.id));
        if (top) setActive(top.id);
      },
      { root, rootMargin: "0px 0px -60% 0px" },
    );
    root.querySelectorAll("section[id^='pk-']").forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, [step]);

  useEffect(() => {
    if (!summary) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && setSummary(false);
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [summary]);

  const go = (id: SectionId) => {
    if (step !== 2) setStep(2);
    setActive(id);
    // 오른쪽 칸 안에서만 굴립니다 — scrollIntoView 는 바깥 상자(폰의 화면 전체)까지 밀어 올립니다(2026-10-25 390px 실측)
    requestAnimationFrame(() => {
      const root = panel.current, el = root?.querySelector<HTMLElement>(`#pk-${id}`);
      if (root && el) root.scrollTo({ top: el.offsetTop - (window.matchMedia("(min-width: 768px)").matches ? 0 : 46), behavior: "smooth" });
    });
  };
  const choose = (i: number) => {
    p.onPick(i);
    setStep(2);
  };

  const hasPlate = base.items.some((it) => it.type === "plate") || kindOf(base).backboard;
  const multiLine = base.items.some((it) => it.type === "text" && it.lines.filter((l) => l.text.trim()).length > 1 && !it.vertical);
  const hasText = base.items.some((it) => it.type === "text" || (it.type === "logo" && it.letterMm));
  const wStep = weightStep(base);
  const changed = tuneLines(base, t);
  // 색 고르기 창이 처음 띄울 «받은 안의 색»
  const baseColors = {
    face: base.items.find((it): it is TextItem => it.type === "text")?.face ?? "#1b1d1c",
    plate: base.items.find((it): it is PlateItem => it.type === "plate")?.fill ?? base.board,
  };
  const lettersNow = p.letters
    ? `${fmtMm(p.letters.w)} × ${fmtMm(p.letters.h)}${p.letters.side ? `, 양쪽 여백 ${fmtMm(p.letters.side.l)} / ${fmtMm(p.letters.side.r)}` : ""}`
    : "";
  const shownNotes = p.notes.filter((n) => n.level !== "ok");

  /* ------------------------------------------------------------ 머리말 (현대차 «모델 선택 | 내 차 만들기» 막대) */
  const header = (
    <header className="relative isolate shrink-0 overflow-hidden bg-ink text-white">
      <HeroGlow />
      <div className="flex h-14 items-center gap-4 px-5 lg:px-10">
        <Link href="/" className="flex items-center gap-2.5" aria-label="수산나디자인 홈으로">
          <PickMark />
          <span className="whitespace-nowrap text-[14px] font-black tracking-[0.14em]">
            SUSANNA <span className="text-brand-400">PICK</span>
          </span>
        </Link>
        <span className="hidden h-4 w-px bg-white/25 sm:block" />
        <span className="hidden min-w-0 truncate text-[14px] text-white/80 sm:block">
          {p.title || "간판 디자인"}
          {p.round > 1 && <span className="ml-3 text-brand-400">{p.round}차 시안</span>}
        </span>
        <span className="ml-auto flex items-center gap-2">
          <button type="button" onClick={() => setSummary(true)} className="h-9 border border-white/40 px-4 text-[13px] font-bold hover:bg-white hover:text-ink">
            요약 보기
          </button>
          <Link href="/" className="hidden h-9 items-center px-2 text-[13px] text-white/70 hover:text-white sm:flex">
            닫기
          </Link>
        </span>
      </div>
      <nav aria-label="단계" className="flex h-12 items-stretch gap-6 overflow-x-auto px-5 text-[15px] lg:h-14 lg:px-10">
        <StepTab n="01" label="수산나 픽" on={step === 1} onClick={() => setStep(1)} />
        <span className="my-auto h-5 w-px shrink-0 bg-white/20" />
        <StepTab n="02" label="세부 조정" on={step === 2 && p.view !== "model"} onClick={() => { setStep(2); if (p.view === "model") p.onView("flat"); }} />
        <span className="hidden items-center gap-3 whitespace-nowrap text-[14px] md:flex">
          {SECTIONS.map((s, i) => (
            <span key={s.id} className="flex items-center gap-3">
              {i > 0 && <Chevron />}
              <button type="button" onClick={() => go(s.id)} className={step === 2 && active === s.id ? "font-bold text-white" : "text-white/50 hover:text-white/80"}>
                {s.label}
              </button>
            </span>
          ))}
        </span>
        <span className="my-auto h-5 w-px shrink-0 bg-white/20" />
        <StepTab n="03" label="모델링" on={step === 2 && p.view === "model"} onClick={() => { setStep(2); p.onView("model"); }} />
      </nav>
    </header>
  );

  /* ------------------------------------------------------------ 01 수산나 픽 (현대차 트림 카드) */
  const stepPick = (
    <div className="min-h-0 flex-1 overflow-y-auto bg-paper">
      <div className="wrap py-10 lg:py-14">
        <p className="text-[12px] font-bold tracking-[0.22em] text-accent-600">SUSANNA PICK</p>
        <h1 className="mt-3 text-[28px] font-bold leading-tight tracking-tight lg:text-[36px]">
          {p.round > 1 ? `${p.round}차 시안 ${p.picks.length}종` : `담당자 추천 시안 ${p.picks.length}종`}
        </h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink-500">
          시안을 선택하시면 크기, 굵기, 여백, 위치, 색상을 직접 조정하실 수 있습니다. 조정하신 내용을 보내 주시면 담당자가 확인한 뒤 같은 링크로 회신드립니다.
        </p>
        <ul className={`mt-8 grid gap-5 ${p.picks.length >= 3 ? "lg:grid-cols-3" : p.picks.length === 2 ? "md:grid-cols-2" : "max-w-xl"}`}>
          {p.picks.map((pk, i) => {
            const k = kindOf(pk.design);
            const sel = i === p.pickIdx;
            const font = pk.design.items.find((it) => it.type === "text");
            const fname = font && font.type === "text" && font.font.src === "lib" ? makerFont(font.font.slug)?.name : null;
            return (
              <li key={i} className={`pk-fade flex flex-col border bg-white ${sel ? "border-ink" : "border-line"}`} style={{ animationDelay: `${i * 60}ms` }}>
                <div className="flex items-start gap-3 px-6 pt-6">
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-3 text-[12px] font-bold tracking-[0.2em]">
                      <span className="text-brand-700">PICK {PICK_LETTERS[i]}</span>
                      {i === 0 && many && <span className="tracking-normal text-accent-600">수산나 추천</span>}
                    </p>
                    <h2 className="mt-2 text-[22px] font-bold leading-snug tracking-tight">{pk.name}</h2>
                  </div>
                  <span className={`mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full border ${sel ? "border-brand bg-brand text-white" : "border-line text-line"}`} aria-hidden="true">
                    <CheckIcon />
                  </span>
                </div>
                <div className="mx-6 mt-5 aspect-[16/10] overflow-hidden" style={{ background: wallFill(pk.design) }}>
                  <PickThumb design={pk.design} />
                </div>
                <dl className="mx-6 mt-5 divide-y divide-line border-y border-line text-[14px]">
                  <Spec k="간판 종류" v={k.name} />
                  <Spec k="조명" v={k.needsLed || k.lit === "halo" ? "LED 조명" : "조명 없음"} />
                  {fname && <Spec k="글꼴" v={fname} />}
                  <Spec k="판 구성" v={pk.design.items.some((it) => it.type === "plate") || k.backboard ? "판 있음" : "글자 단독"} />
                </dl>
                {pk.note && <p className="mx-6 mt-4 text-[14px] leading-relaxed text-ink-500">{pk.note}</p>}
                <div className="mt-auto grid grid-cols-2 gap-2 p-6">
                  <button
                    type="button"
                    onClick={() => {
                      p.onPick(i);
                      setStep(2);
                      setSummary(false);
                    }}
                    className="h-12 border border-ink text-[15px] font-bold hover:bg-paper"
                  >
                    상세 보기
                  </button>
                  <button type="button" onClick={() => choose(i)} className="h-12 bg-ink text-[15px] font-bold text-white hover:bg-ink-700">
                    이 시안으로 조정
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
        <p className="mt-8 text-[13px] leading-relaxed text-ink-500">
          화면의 색과 밝기는 실제와 다르며, 치수와 위치는 현장 실측 후 확정합니다.
          {p.expiresAt ? ` 이 링크는 ${ymd(p.expiresAt)}까지 열립니다.` : ""}
        </p>
      </div>
    </div>
  );

  /* ------------------------------------------------------------ 02 내 간판 다듬기 */
  const info = (
    <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3 px-5 pt-3 lg:px-10 lg:pt-7">
      <div className="min-w-0">
        <p className="text-[12px] font-bold tracking-[0.2em] text-brand-700">{many ? `PICK ${PICK_LETTERS[p.pickIdx]}` : "SUSANNA PICK"}</p>
        <h1 className="mt-1 text-[19px] font-bold leading-tight tracking-tight lg:text-[30px]">{pick.name}</h1>
        <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-ink-500 lg:mt-1.5 lg:text-[14px]">
          <span className="max-md:hidden">{p.kind.name}</span>
          {many && (
            <button type="button" onClick={() => setStep(1)} className="flex items-center gap-1 font-bold text-brand-700">
              다른 시안 보기 <Chevron />
            </button>
          )}
        </p>
      </div>
      <dl className="hidden text-right sm:block">
        <div className="flex items-baseline justify-end gap-6">
          <dt className="text-[14px] text-ink-500">전체 크기</dt>
          <dd className="text-[16px] tabular-nums">{p.overall ? `${fmtMm(p.overall.w)} × ${fmtMm(p.overall.h)}` : "계산 중"}</dd>
        </div>
        {p.letters && (
          <div className="mt-1 flex items-baseline justify-end gap-6">
            <dt className="text-[14px] text-ink-500">글자 영역</dt>
            <dd className="text-[16px] tabular-nums">{lettersNow}</dd>
          </div>
        )}
        <div className="mt-1 flex items-baseline justify-end gap-6">
          <dt className="text-[14px] font-bold">제작 가능 여부</dt>
          <dd className={`text-[22px] font-bold ${p.verdict === "no" ? "text-accent-600" : p.verdict === "check" ? "text-ink" : "text-brand-700"}`}>{verdictWord(p.verdict)}</dd>
        </div>
      </dl>
    </div>
  );

  const stageBar = (
    <div className="flex items-center justify-center gap-x-4 px-4 py-2 lg:gap-x-5 lg:pb-4 lg:pt-3">
      <span className="flex" role="group" aria-label="보기">
        {(
          [
            ["flat", "도면"],
            ["model", "모델링"],
          ] as const
        ).map(([v, label]) => {
          const on = p.view === v;
          return (
            <button key={v} type="button" aria-pressed={on} onClick={() => p.onView(v)} className={`h-9 w-20 text-[14px] font-bold lg:h-10 lg:w-28 ${on ? "bg-brand-700 text-white" : "bg-[#ece9e2] text-ink"}`}>
              {label}
            </button>
          );
        })}
      </span>
      {p.view !== "model" && <Toggle label="치수" on={p.dims} onChange={p.onDims} />}
      <span className={`hidden items-center ${p.view !== "model" ? "lg:flex" : ""}`}>
        <button type="button" onClick={() => p.onZoom(1.25)} aria-label="축소" className="grid h-9 w-9 place-items-center text-[18px] text-ink-500 hover:text-ink">−</button>
        <button type="button" onClick={p.onFit} className="h-9 min-w-14 text-[13px] font-bold tabular-nums">{p.zoomPct}%</button>
        <button type="button" onClick={() => p.onZoom(0.8)} aria-label="확대" className="grid h-9 w-9 place-items-center text-[18px] text-ink-500 hover:text-ink">+</button>
      </span>
    </div>
  );

  const sizeNow = p.overall ? `${fmtMm(p.overall.w)} × ${fmtMm(p.overall.h)}` : "";
  const sec = (id: SectionId, title: string, value: string, children: React.ReactNode) => (
    <section id={`pk-${id}`} className="scroll-mt-4 border-b border-line px-5 py-9 lg:px-10">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-[24px] font-bold tracking-tight lg:text-[28px]">{title}</h2>
        <span className="text-right text-[14px] text-ink-500">{value}</span>
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );

  const controls = (
    <>
      {sec(
        "size",
        "크기",
        sizeNow,
        <>
          {hasPlate && (
            <div className="mb-7">
              <Range label="글자 크기 (판 크기 고정)" value={t.letter} {...TUNE_RANGE.letter} fmt={(v) => `${Math.round(v * 100)}%`} onChange={(v) => set({ letter: v })} />
              {p.letters && <p className="mt-1 text-[13px] tabular-nums text-ink-500">글자 {lettersNow}</p>}
            </div>
          )}
          <Range label={hasPlate ? "전체 크기 (판 포함)" : "전체 크기"} value={t.scale} {...TUNE_RANGE.scale} fmt={(v) => `${Math.round(v * 100)}%`} onChange={(v) => set({ scale: v })} />
          <Presets
            value={t.scale}
            items={[
              { v: 0.85, label: "축소" },
              { v: 1, label: "기본값" },
              { v: 1.15, label: "확대" },
            ]}
            onPick={(v) => set({ scale: v })}
          />
        </>,
      )}
      {sec(
        "weight",
        "굵기",
        t.weight ? `외곽 ${t.weight > 0 ? "+" : ""}${(t.weight * wStep).toFixed(1)}mm` : "기본값",
        hasText ? (
          <>
            <div className="grid grid-cols-7 border border-line" role="group" aria-label="굵기 단계">
              {Array.from({ length: TUNE_RANGE.weight.max - TUNE_RANGE.weight.min + 1 }, (_, i) => i + TUNE_RANGE.weight.min).map((w) => {
                const on = t.weight === w;
                return (
                  <button key={w} type="button" aria-pressed={on} onClick={() => set({ weight: w })} className={`flex h-16 flex-col items-center justify-center gap-1 border-l border-line first:border-l-0 ${on ? "bg-ink text-white" : "hover:bg-paper"}`}>
                    <span className="block bg-current" style={{ width: 18, height: Math.max(1, 4 + w * 1.6) }} aria-hidden="true" />
                    <span className="text-[12px] font-bold tabular-nums">{w === 0 ? "기본" : w > 0 ? `+${w}` : w}</span>
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-[13px] leading-relaxed text-ink-500">
              글자 높이는 유지하고 획의 굵기만 조정합니다. 1단계는 한쪽 약 {wStep}mm입니다. 제작이 어려운 굵기는 아래 제작 가능 여부에 바로 표시됩니다.
            </p>
          </>
        ) : (
          <p className="text-[14px] leading-relaxed text-ink-500">이 시안은 로고 이미지로 구성되어 굵기 조정이 적용되지 않습니다.</p>
        ),
      )}
      {sec(
        "space",
        "여백",
        "",
        <div className="space-y-6">
          {p.letters?.side && (
            <p className="text-[14px] tabular-nums">
              판 좌우 여백: 왼쪽 {fmtMm(p.letters.side.l)}, 오른쪽 {fmtMm(p.letters.side.r)}
            </p>
          )}
          {hasText && <Range label="자간" value={t.spacing} {...TUNE_RANGE.spacing} fmt={(v) => (v === 0 ? "기본값" : `${v > 0 ? "+" : ""}${v}mm`)} onChange={(v) => set({ spacing: v })} />}
          {multiLine && <Range label="행간" value={t.gap} {...TUNE_RANGE.gap} fmt={(v) => `${Math.round(v * 100)}%`} onChange={(v) => set({ gap: v })} />}
          {hasPlate && <Range label="판 여백" value={t.pad} {...TUNE_RANGE.pad} fmt={(v) => `${Math.round(v * 100)}%`} onChange={(v) => set({ pad: v })} />}
          {!hasText && !hasPlate && <p className="text-[14px] text-ink-500">이 시안에는 조정할 여백 항목이 없습니다.</p>}
        </div>,
      )}
      {sec(
        "move",
        "위치",
        t.dx || t.dy || t.rot ? "변경됨" : "기본값",
        <>
          <div className="flex items-center gap-6">
            <div className="grid grid-cols-3 grid-rows-3 border border-line" style={{ width: 132, height: 132 }} role="group" aria-label="옮기기">
              <span />
              <Nudge label="위로" onClick={() => set({ dy: t.dy - 100 })} dir="up" />
              <span />
              <Nudge label="왼쪽으로" onClick={() => set({ dx: t.dx - 100 })} dir="left" />
              <button type="button" onClick={() => set({ dx: 0, dy: 0 })} className="text-[11px] font-bold text-ink-500 hover:text-ink" aria-label="원래 위치로">
                원위치
              </button>
              <Nudge label="오른쪽으로" onClick={() => set({ dx: t.dx + 100 })} dir="right" />
              <span />
              <Nudge label="아래로" onClick={() => set({ dy: t.dy + 100 })} dir="down" />
              <span />
            </div>
            <p className="text-[13px] leading-relaxed text-ink-500">
              한 번 누를 때마다 10cm씩 이동합니다.
              <br />
              화면의 간판을 끌어서 이동하실 수도 있습니다.
            </p>
          </div>
          <div className="mt-7">
            <Range label="기울기" value={t.rot} {...TUNE_RANGE.rot} fmt={(v) => (v === 0 ? "0°" : `${v > 0 ? "+" : ""}${v}°`)} onChange={(v) => set({ rot: v })} />
          </div>
        </>,
      )}
      {sec(
        "color",
        "색상",
        "",
        <div className="space-y-8">
          {hasText && <Swatch title="글자 색상" items={TUNE_COLORS.face} value={t.face} base={baseColors.face} onPick={(v) => set({ face: v })} />}
          {(p.kind.needsLed || p.kind.lit === "halo") && <Swatch title="조명 색상" items={TUNE_COLORS.led} value={t.led} base={base.led} onPick={(v) => set({ led: v })} glow />}
          {hasPlate && <Swatch title="판 색상" items={TUNE_COLORS.plate} value={t.plate} base={baseColors.plate} onPick={(v) => set({ plate: v })} />}
          <Swatch
            title="벽면"
            items={[{ name: "흰 벽", hex: "white" }, { name: "어두운 벽", hex: "dark" }, ...TUNE_COLORS.wall]}
            value={t.wall}
            base={wallFill(base)}
            onPick={(v) => set({ wall: v })}
          />
          <p className="text-[13px] leading-relaxed text-ink-500">화면의 색은 실물과 다릅니다. 실제 색은 견본으로 확정합니다.</p>
        </div>,
      )}
      <section className="px-5 py-9 lg:px-10">
        <h2 className="text-[24px] font-bold tracking-tight lg:text-[28px]">제작 가능 여부</h2>
        <p className={`mt-4 text-[17px] font-bold ${p.verdict === "no" ? "text-accent-600" : p.verdict === "check" ? "text-ink" : "text-brand-700"}`}>{custLevel(p.verdict)}</p>
        {shownNotes.length > 0 && (
          <ul className="mt-3 space-y-2">
            {shownNotes.map((n, i) => (
              <li key={i} className="flex gap-2.5 text-[14px] leading-relaxed">
                <span className={`mt-[0.55em] h-1.5 w-1.5 shrink-0 ${n.level === "no" ? "bg-accent-600" : "bg-ink-500"}`} aria-hidden="true" />
                {n.text}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-[13px] leading-relaxed text-ink-500">보내 주시면 담당자가 제작 방식과 치수를 확인한 뒤 같은 링크로 회신드립니다.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <button type="button" onClick={() => setSummary(true)} className="h-14 min-w-56 flex-1 bg-ink px-6 text-[16px] font-bold text-white hover:bg-ink-700">
            조정 완료
          </button>
          {isTuned(t) && (
            <button type="button" onClick={() => p.onTune(TUNE0)} className="h-14 border border-line px-6 text-[15px] font-bold hover:bg-paper">
              초기화
            </button>
          )}
        </div>
      </section>
    </>
  );

  const stepTune = (
    <div className="flex min-h-0 flex-1 flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(420px,34%)]">
      <div className="flex shrink-0 flex-col bg-white lg:min-h-0">
        {info}
        <div className="relative mx-0 mt-3 h-[34dvh] min-h-[210px] lg:mx-10 lg:mt-4 lg:h-auto lg:min-h-0 lg:flex-1">
          {p.view === "model" ? <ModelView r={p.render} /> : p.stage}
          {p.busy && (
            <p className="absolute inset-x-0 top-6 z-20 mx-auto w-fit bg-ink px-4 py-2 text-[13px] font-bold text-white" role="status">
              {p.busy}
            </p>
          )}
        </div>
        {stageBar}
      </div>
      <div ref={panel} className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain border-line bg-white lg:border-l">
        {/* 폰 — 단계 막대의 다섯 칸이 머리말에 안 들어가 여기 한 줄로 */}
        <div className="sticky top-0 z-10 flex gap-5 overflow-x-auto border-b border-line bg-white px-5 py-3 text-[14px] md:hidden">
          {SECTIONS.map((s) => (
            <button key={s.id} type="button" onClick={() => go(s.id)} className={`whitespace-nowrap ${active === s.id ? "font-bold text-ink" : "text-ink-500"}`}>
              {s.label}
            </button>
          ))}
        </div>
        {p.err && (
          <p className="border-b border-line px-5 py-3 text-[14px] font-bold text-accent-600 lg:px-10" role="alert">
            {p.err}
          </p>
        )}
        {controls}
      </div>
    </div>
  );

  /* ------------------------------------------------------------ 요약 보기 (현대차 «나의 아이오닉 5») */
  const summaryEl = summary && (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/55 lg:items-start lg:justify-end lg:p-6 lg:pt-28" onClick={() => setSummary(false)}>
      <div role="dialog" aria-modal="true" aria-label="요약" className="pk-fade max-h-[88dvh] w-full overflow-y-auto bg-white px-7 pb-8 pt-7 lg:w-[460px]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-[22px] font-bold tracking-tight">선택 내역 요약</h2>
          <button type="button" onClick={() => setSummary(false)} aria-label="닫기" className="-mr-2 -mt-1 grid h-10 w-10 place-items-center text-ink-500 hover:text-ink">
            <CloseIcon />
          </button>
        </div>
        <dl className="mt-5 border-t-2 border-ink text-[14px]">
          <Row k="선택 시안" v={many ? `PICK ${PICK_LETTERS[p.pickIdx]}, ${pick.name}` : pick.name} />
          <Row k="간판 종류" v={p.kind.name} />
          {p.fontName && <Row k="글꼴" v={p.fontName} />}
          <Row k="전체 크기" v={sizeNow || "계산 중"} />
          {p.letters && <Row k="글자 영역" v={lettersNow} />}
          <Row k="변경 사항" v={changed.length ? changed.join("\n") : "없음 (기본 시안 그대로)"} />
          <div className="flex items-baseline justify-between gap-4 border-t-2 border-ink py-4">
            <dt className="text-[16px] font-bold">제작 가능 여부</dt>
            <dd className={`text-[18px] font-bold ${p.verdict === "no" ? "text-accent-600" : p.verdict === "check" ? "text-ink" : "text-brand-700"}`}>{custLevel(p.verdict)}</dd>
          </div>
        </dl>
        {sent && sent.pick === p.pickIdx ? (
          <div className="mt-2 border-t-2 border-brand-700 pt-4" role="status">
            <p className="text-[17px] font-bold text-brand-700">전송되었습니다</p>
            <p className="mt-1.5 text-[14px] leading-relaxed text-ink-700">
              담당자가 확인한 뒤 같은 링크로 회신드립니다. 회신 후 같은 주소에서 확인하실 수 있습니다.
            </p>
            <p className="mt-1 text-[13px] text-ink-500">
              {sent.at.getHours()}시 {String(sent.at.getMinutes()).padStart(2, "0")}분 전송. 추가로 조정하신 경우 다시 보내실 수 있습니다.
            </p>
          </div>
        ) : (
          <p className="text-[13px] leading-relaxed text-ink-500">화면의 색과 밝기는 실제와 다르며, 치수와 위치는 현장 실측 후 확정합니다.</p>
        )}
        <label className="mt-5 block">
          <span className="text-[14px] font-bold">담당자 전달 사항</span>
          <span className="ml-2 text-[13px] text-ink-500">(선택)</span>
          <textarea
            value={memo}
            maxLength={500}
            rows={3}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="예: 글자를 조금만 더 굵게 해 주세요."
            className="mt-2 block w-full resize-none border-b border-line bg-paper px-3 py-2.5 text-[15px] leading-relaxed outline-none focus:border-ink"
          />
        </label>
        {sendErr && (
          <p className="mt-2 text-[14px] font-bold text-accent-600" role="alert">
            {sendErr}
          </p>
        )}
        <button type="button" onClick={send} disabled={sending} className="mt-5 h-14 w-full bg-brand-700 text-[16px] font-bold text-white hover:bg-brand-600 disabled:opacity-60">
          {sending ? "전송 중" : sent && sent.pick === p.pickIdx ? "다시 보내기" : "보내기"}
        </button>
        <div className="mt-3 flex justify-center gap-6 text-[14px] font-bold text-ink-500">
          <button type="button" onClick={p.onSave} className="underline underline-offset-4 hover:text-ink">
            이미지 저장
          </button>
          {p.canEdit && (
            <button type="button" onClick={p.onContinue} className="underline underline-offset-4 hover:text-ink">
              편집기에서 열기
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="pk flex h-dvh flex-col overflow-hidden bg-white text-ink">
      {header}
      {step === 1 ? stepPick : stepTune}
      {/* 폰 — 아래에 늘 서 있는 단추(현대차 «내 차 만들기 완료») */}
      {step === 2 && (
        <div className="flex shrink-0 items-center gap-3 border-t border-line bg-white px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 lg:hidden">
          <span className="min-w-0 flex-1 text-[13px] leading-snug">
            <span className="block font-bold">{verdictWord(p.verdict)}</span>
            <span className="block truncate text-ink-500">{sizeNow}</span>
          </span>
          <button type="button" onClick={() => setSummary(true)} className="h-12 bg-ink px-6 text-[15px] font-bold text-white">
            요약 및 전송
          </button>
        </div>
      )}
      {summaryEl}
    </div>
  );
}

/** 손님 화면의 판정 말 — 공용 `LEVEL_LABEL` 은 «조건부 — 담당자 확인» 처럼 줄표가 들어가 손님 문구로 못 씁니다(D10) */
const custLevel = (v: Level) => (v === "ok" ? "제작 가능" : v === "check" ? "담당자 확인 필요" : "이대로는 제작이 어렵습니다");
/**
 * 모델링 화면 — 이 PC 의 블렌더가 그린 그림(0022). 다시 그리는 동안에도 마지막 그림을 둡니다(빈 화면이 깜빡이지 않게).
 * 일꾼이 꺼져 있으면 정직하게 말합니다 — 그림이 안 바뀌는데 «그리는 중»이 계속 떠 있으면 손님은 고장으로 읽습니다.
 */
function ModelView({ r }: { r: RenderView }) {
  return (
    <div className="relative flex h-full w-full items-center justify-center bg-[#e9e7e2]">
      {r.url ? (
        // eslint-disable-next-line @next/next/no-img-element -- 일꾼이 방금 그린 그림(data: 주소)
        <img src={r.url} alt="실제 크기로 지은 3D 모델 렌더" className={`h-full w-full object-contain transition-opacity ${r.state === "wait" ? "opacity-80" : ""}`} />
      ) : (
        <p className="px-6 text-center text-[15px] text-ink-500">{r.state === "off" || r.state === "error" ? "" : "모델을 불러오는 중입니다."}</p>
      )}
      <p className="absolute bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap bg-white/90 px-3 py-1.5 text-[13px]" role="status">
        {r.state === "wait"
          ? "변경 내용을 반영하는 중입니다."
          : r.state === "done"
            ? `실제 크기 3D 모델 렌더${r.total ? `, ${(r.total / 1000).toFixed(1)}초` : ""}`
            : r.state === "off"
              ? "모델링 서버가 꺼져 있습니다. 도면 보기로 확인해 주십시오."
              : r.state === "error"
                ? "모델을 그리지 못했습니다. 잠시 뒤 다시 시도해 주십시오."
                : "모델링 준비 중입니다."}
      </p>
    </div>
  );
}

const verdictWord = (v: Level) => (v === "ok" ? "제작 가능" : v === "check" ? "확인 필요" : "조정 필요");

/* ================================================================ 조각 */

function StepTab({ n, label, on, onClick }: { n: string; label: string; on: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-current={on ? "step" : undefined} className={`relative flex shrink-0 items-center gap-3 whitespace-nowrap ${on ? "text-white" : "text-white/45 hover:text-white/75"}`}>
      <span className={`tabular-nums ${on ? "text-brand-400" : ""}`}>{n}</span>
      <span className="font-bold">{label}</span>
      {/* 지금 단계 밑의 작은 삼각형 — 현대차 단계 막대와 같은 표시 */}
      {on && <span className="absolute -bottom-px left-6 h-0 w-0 border-x-[7px] border-b-[7px] border-x-transparent border-b-white" aria-hidden="true" />}
    </button>
  );
}

function Spec({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <dt className="text-ink-500">{k}</dt>
      <dd className="text-right">{v}</dd>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-6 border-t border-line py-3.5 first:border-t-0">
      <dt className="shrink-0 font-bold">{k}</dt>
      <dd className="whitespace-pre-line text-right text-ink-700">{v}</dd>
    </div>
  );
}

function Range({ label, value, min, max, step, fmt, onChange }: { label: string; value: number; min: number; max: number; step: number; fmt: (v: number) => string; onChange: (v: number) => void }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <label className="block">
      <span className="flex items-baseline justify-between text-[15px]">
        <span className="font-bold">{label}</span>
        <span className="tabular-nums text-ink-500">{fmt(value)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="pk-range mt-2"
        style={{ "--v": `${pct}%` } as React.CSSProperties}
      />
    </label>
  );
}

function Presets({ value, items, onPick }: { value: number; items: { v: number; label: string }[]; onPick: (v: number) => void }) {
  return (
    <div className="mt-4 grid grid-cols-3 border border-line">
      {items.map((it) => {
        const on = Math.abs(value - it.v) < 1e-6;
        return (
          <button key={it.label} type="button" aria-pressed={on} onClick={() => onPick(it.v)} className={`h-11 border-l border-line text-[14px] first:border-l-0 ${on ? "bg-ink font-bold text-white" : "hover:bg-paper"}`}>
            {it.label}
          </button>
        );
      })}
    </div>
  );
}

function Swatch({ title, items, value, base, onPick, glow }: { title: string; items: readonly { name: string; hex: string }[]; value?: string; base: string; onPick: (v: string | undefined) => void; glow?: boolean }) {
  const cur = items.find((c) => c.hex === value);
  const custom = !!value && !cur;
  const [open, setOpen] = useState(false);
  const shown = value === "white" ? "#ffffff" : value === "dark" ? "#2a2d2c" : value || base;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4 border-b border-line pb-3">
        <h3 className="text-[17px] font-bold">{title}</h3>
        <span className="text-[14px] tabular-nums text-ink-500">{cur ? cur.name : custom ? `직접 선택 ${value!.toUpperCase()}` : "기본값"}</span>
      </div>
      <ul className="mt-4 flex flex-wrap gap-2.5">
        <li>
          <button type="button" aria-pressed={!value} onClick={() => onPick(undefined)} title="기본값" className={`relative grid h-14 w-14 place-items-center border text-[11px] font-bold leading-tight ${!value ? "border-ink" : "border-line text-ink-500 hover:border-ink-500"}`}>
            기본값
          </button>
        </li>
        {items.map((c) => {
          const on = c.hex === value;
          const bg = c.hex === "white" ? "#ffffff" : c.hex === "dark" ? "#2a2d2c" : c.hex;
          return (
            <li key={c.hex}>
              <button
                type="button"
                aria-pressed={on}
                aria-label={c.name}
                title={c.name}
                onClick={() => onPick(c.hex)}
                className={`relative block h-14 w-14 border ${on ? "border-ink" : "border-line hover:border-ink-500"}`}
                style={{ background: bg, boxShadow: glow ? `inset 0 0 14px ${bg}, 0 0 10px ${bg}66` : undefined }}
              >
                {on && (
                  <span className="absolute -right-2 -top-2 grid h-5 w-5 place-items-center rounded-full bg-brand text-white">
                    <CheckIcon small />
                  </span>
                )}
              </button>
            </li>
          );
        })}
        <li>
          {/* 직접 선택 — 포토샵 색상 피커와 같은 방식(사람 지시 2026-10-25 «포토샵처럼 선택할 수 있게 RGB») */}
          <button
            type="button"
            aria-expanded={open}
            aria-pressed={custom}
            onClick={() => setOpen(!open)}
            title="직접 선택"
            className={`relative grid h-14 w-14 place-items-center border text-[11px] font-bold leading-tight ${custom || open ? "border-ink" : "border-line text-ink-500 hover:border-ink-500"}`}
            style={{ background: "conic-gradient(from 90deg, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)" }}
          >
            <span className="bg-white px-1 py-0.5 text-ink">직접</span>
            {custom && (
              <span className="absolute -right-2 -top-2 grid h-5 w-5 place-items-center rounded-full bg-brand text-white">
                <CheckIcon small />
              </span>
            )}
          </button>
        </li>
      </ul>
      {open && <ColorPicker hex={/^#[0-9a-f]{6}$/i.test(shown) ? shown : base} original={base} onChange={(hex) => onPick(hex)} />}
    </div>
  );
}

/* ---------------------------------------------------------------- 색상 피커 (포토샵 방식) */

type Hsv = { h: number; s: number; v: number };
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16) || 0;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const rgbToHex = (r: number, g: number, b: number) => "#" + [r, g, b].map((x) => Math.round(Math.max(0, Math.min(255, x))).toString(16).padStart(2, "0")).join("");
function rgbToHsv(r: number, g: number, b: number): Hsv {
  const R = r / 255, G = g / 255, B = b / 255, mx = Math.max(R, G, B), mn = Math.min(R, G, B), d = mx - mn;
  let h = 0;
  if (d) h = mx === R ? ((G - B) / d) % 6 : mx === G ? (B - R) / d + 2 : (R - G) / d + 4;
  return { h: ((h * 60) + 360) % 360, s: mx ? d / mx : 0, v: mx };
}
function hsvToRgb({ h, s, v }: Hsv): [number, number, number] {
  const c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

/**
 * 포토샵의 색상 피커처럼 — 왼쪽 큰 칸(가로 채도 · 세로 밝기), 그 옆 세로 띠(색상), 오른쪽 «새 색 / 원래 색», R·G·B 숫자와 HEX.
 * 라이브러리 없이 포인터 이벤트로 짰습니다(손가락·마우스 같음). 끄는 동안 화면이 바로 따라오고, 모델링은 손을 멈추면 다시 그립니다.
 */
function ColorPicker({ hex, original, onChange }: { hex: string; original: string; onChange: (hex: string) => void }) {
  // 내가 마지막으로 낸 색과 그때의 HSV — 받은 값이 그 색이면 그 HSV 를 그대로 씁니다(회색에서 색상 값이 0 으로 튀지 않게).
  // 견본을 눌러 바깥에서 색이 바뀌면 그 색에서 다시 셉니다(효과 없이 값에서 끌어냄)
  const [local, setLocal] = useState<{ hex: string; hsv: Hsv } | null>(null);
  const hsv: Hsv = local && local.hex === hex.toLowerCase() ? local.hsv : rgbToHsv(...hexToRgb(hex));
  const emit = (next: Hsv) => {
    const out = rgbToHex(...hsvToRgb(next));
    setLocal({ hex: out, hsv: next });
    onChange(out);
  };
  const rgb = hsvToRgb(hsv).map(Math.round) as [number, number, number];
  const cur = rgbToHex(...rgb);
  /** HEX 칸에 치는 중인 글자 — 여섯 자가 차기 전엔 색을 안 바꿉니다 */
  const [hexDraft, setHexDraft] = useState<string | null>(null);

  const drag = (el: HTMLElement, e: React.PointerEvent, f: (x: number, y: number) => void) => {
    const go = (ev: PointerEvent | React.PointerEvent) => {
      const r = el.getBoundingClientRect();
      f(clamp01((ev.clientX - r.left) / r.width), clamp01((ev.clientY - r.top) / r.height));
    };
    go(e);
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      /* 기기에 따라 던집니다 */
    }
    const mv = (ev: PointerEvent) => go(ev);
    const up = () => {
      el.removeEventListener("pointermove", mv);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
    };
    el.addEventListener("pointermove", mv);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
  };
  const setRgb = (i: number, v: number) => {
    const n = [...rgb] as [number, number, number];
    n[i] = Math.max(0, Math.min(255, Math.round(v || 0)));
    emit(rgbToHsv(...n));
  };
  const hue = rgbToHex(...hsvToRgb({ h: hsv.h, s: 1, v: 1 }));

  return (
    <div className="pk-fade mt-4 flex flex-wrap items-start gap-4 border border-line bg-white p-4">
      <div className="flex gap-3">
        <div
          role="slider"
          aria-label="채도와 밝기"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(hsv.s * 100)}
          aria-valuetext={`채도 ${Math.round(hsv.s * 100)}%, 밝기 ${Math.round(hsv.v * 100)}%`}
          tabIndex={0}
          onPointerDown={(e) => drag(e.currentTarget, e, (x, y) => emit({ ...hsv, s: x, v: 1 - y }))}
          onKeyDown={(e) => {
            const d = e.shiftKey ? 0.1 : 0.02;
            if (e.key === "ArrowRight") emit({ ...hsv, s: clamp01(hsv.s + d) });
            else if (e.key === "ArrowLeft") emit({ ...hsv, s: clamp01(hsv.s - d) });
            else if (e.key === "ArrowUp") emit({ ...hsv, v: clamp01(hsv.v + d) });
            else if (e.key === "ArrowDown") emit({ ...hsv, v: clamp01(hsv.v - d) });
            else return;
            e.preventDefault();
          }}
          className="relative h-[180px] w-[210px] cursor-crosshair touch-none select-none outline-none focus-visible:ring-2 focus-visible:ring-brand"
          style={{ background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${hue})` }}
        >
          <span
            className="pointer-events-none absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.45)]"
            style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%` }}
          />
        </div>
        <div
          role="slider"
          aria-label="색상"
          aria-valuemin={0}
          aria-valuemax={360}
          aria-valuenow={Math.round(hsv.h)}
          tabIndex={0}
          onPointerDown={(e) => drag(e.currentTarget, e, (_, y) => emit({ ...hsv, h: Math.min(359.9, y * 360) }))}
          onKeyDown={(e) => {
            const d = e.shiftKey ? 10 : 2;
            if (e.key === "ArrowDown") emit({ ...hsv, h: Math.min(359.9, hsv.h + d) });
            else if (e.key === "ArrowUp") emit({ ...hsv, h: Math.max(0, hsv.h - d) });
            else return;
            e.preventDefault();
          }}
          className="relative h-[180px] w-5 cursor-ns-resize touch-none select-none outline-none focus-visible:ring-2 focus-visible:ring-brand"
          style={{ background: "linear-gradient(to bottom, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)" }}
        >
          <span className="pointer-events-none absolute -left-1 -right-1 h-1.5 -translate-y-1/2 border border-ink bg-white/60" style={{ top: `${(hsv.h / 360) * 100}%` }} />
        </div>
      </div>
      <div className="min-w-[150px] flex-1 space-y-2.5 text-[14px]">
        <div className="flex border border-line" aria-hidden="true">
          <div className="flex-1">
            <div className="h-9" style={{ background: cur }} />
            <p className="py-1 text-center text-[11px] text-ink-500">선택한 색</p>
          </div>
          <button type="button" onClick={() => onChange(original)} className="flex-1 border-l border-line" title="원래 색으로">
            <div className="h-9" style={{ background: original }} />
            <p className="py-1 text-center text-[11px] text-ink-500">원래 색</p>
          </button>
        </div>
        {(["R", "G", "B"] as const).map((k, i) => (
          <label key={k} className="flex items-center gap-2">
            <span className="w-4 font-bold">{k}</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={255}
              value={rgb[i]}
              onChange={(e) => setRgb(i, Number(e.target.value))}
              className="w-full border-b border-line bg-paper px-2 py-1.5 text-right tabular-nums outline-none focus:border-ink"
              aria-label={`${k} 값 (0~255)`}
            />
          </label>
        ))}
        <label className="flex items-center gap-2">
          <span className="w-4 font-bold">#</span>
          <input
            value={hexDraft ?? cur.replace("#", "").toUpperCase()}
            maxLength={6}
            onChange={(e) => {
              const v = e.target.value.replace(/[^0-9a-f]/gi, "").slice(0, 6).toUpperCase();
              if (v.length === 6) {
                setHexDraft(null);
                emit(rgbToHsv(...hexToRgb(v)));
              } else setHexDraft(v);
            }}
            onBlur={() => setHexDraft(null)}
            className="w-full border-b border-line bg-paper px-2 py-1.5 text-right font-mono uppercase tabular-nums outline-none focus:border-ink"
            aria-label="HEX 값"
          />
        </label>
      </div>
      <p className="w-full text-[12px] leading-relaxed text-ink-500">도료나 시트의 색 번호를 아시면 RGB 또는 HEX 값으로 입력하실 수 있습니다. 화면 색은 실물과 다르며, 실제 색은 견본으로 확정합니다.</p>
    </div>
  );
}

function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" aria-pressed={on} onClick={() => onChange(!on)} className="flex items-center gap-2 text-[14px]">
      <span className={`grid h-4 w-4 place-items-center border ${on ? "border-ink bg-ink text-white" : "border-ink-500"}`} aria-hidden="true">
        {on && <CheckIcon small />}
      </span>
      {label}
    </button>
  );
}

function Nudge({ label, onClick, dir }: { label: string; onClick: () => void; dir: "up" | "down" | "left" | "right" }) {
  const r = { up: 0, right: 90, down: 180, left: 270 }[dir];
  return (
    <button type="button" onClick={onClick} aria-label={label} className="grid place-items-center hover:bg-paper">
      <svg width="14" height="14" viewBox="0 0 14 14" style={{ transform: `rotate(${r}deg)` }} aria-hidden="true">
        <path d="M2 9.5L7 4.5l5 5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    </button>
  );
}

function Chevron() {
  return (
    <svg width="7" height="11" viewBox="0 0 7 11" aria-hidden="true" className="opacity-60">
      <path d="M1 1l4.5 4.5L1 10" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function CheckIcon({ small }: { small?: boolean }) {
  const s = small ? 10 : 13;
  return (
    <svg width={s} height={s} viewBox="0 0 13 13" aria-hidden="true">
      <path d="M2 6.8l3 3L11 3.5" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
      <path d="M3 3l14 14M17 3L3 17" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

/** 메이커 표식과 같은 청록 칸(새 심벌이 아닙니다) — 격자 대신 체크 하나 */
function PickMark() {
  return (
    <svg width="24" height="24" viewBox="0 0 26 26" aria-hidden="true">
      <rect width="26" height="26" fill="#00a79d" />
      <path d="M6.5 0V26M13 0V26M19.5 0V26M0 6.5H26M0 13H26M0 19.5H26" stroke="#fff" strokeOpacity=".22" strokeWidth=".8" />
      <path d="M7 17.5c1.2 1.4 2.9 2 4.6 2 2.3 0 3.9-1.1 3.9-2.9 0-4-8-2.3-8-6.4 0-1.7 1.5-3 3.8-3 1.5 0 2.9.5 3.9 1.5" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="square" />
    </svg>
  );
}

/* ================================================================ 카드 그림 */

/**
 * 픽 카드의 작은 그림 — 주간 정면, 글자와 판과 로고만. 무대(Stage)를 셋 띄우면 무겁고 손잡이까지 따라와서 따로 그립니다.
 * 옆면 두께, 번짐, 원근(네 점)은 빼고 그립니다(카드는 «어떤 안인가»만 보이면 됩니다). 큰 그림은 «상세 보기»가 무대로 엽니다.
 */
function PickThumb({ design }: { design: Design }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const [outs, setOuts] = useState<Map<string, Outline>>(new Map());
  useEffect(() => {
    let alive = true;
    for (const it of design.items) {
      if (it.type !== "text" || it.font.src !== "lib") continue;
      const slug = it.font.slug;
      const s = makerFont(slug);
      if (!s) continue;
      loadFontUrl(s.file)
        .then((font) => {
          if (!alive) return;
          const o = layoutLines(font, it.lines, it.gap ?? 0.35, !!it.vertical);
          setOuts((m) => new Map(m).set(it.id, o));
        })
        .catch(() => {});
    }
    return () => {
      alive = false;
    };
  }, [design]);

  const parts = useMemo(() => {
    type Part = { key: string; plate?: boolean; border?: { color: string; w: number }; x: number; y: number; w: number; h: number; rot: number; scale?: number; paths: { d: string; fill: string }[] };
    const out: Part[] = [];
    for (const it of design.items) {
      if (it.type === "patch" || it.type === "image") continue;
      if (it.type === "plate") {
        out.push({ key: it.id, plate: true, x: it.x, y: it.y, w: it.w, h: it.h, rot: it.rot ?? 0, border: it.border ? { color: it.border, w: it.borderMm ?? 30 } : undefined, paths: [{ d: platePath(it.shape, it.w, it.h), fill: it.fill }] });
      } else if (it.type === "logo") {
        const k = it.w / Math.max(1, it.srcW), h = it.srcH * k;
        out.push({ key: it.id, x: it.x, y: it.y, w: it.w, h, rot: it.rot ?? 0, scale: k, paths: it.layers.map((l) => ({ d: l.d, fill: l.color })) });
      } else {
        const o = outs.get(it.id);
        if (!o) continue;
        out.push({ key: it.id, x: it.x, y: it.y, w: o.w, h: o.h, rot: it.rot ?? 0, paths: o.glyphs.map((g) => ({ d: g.d, fill: it.glyphs?.[g.i]?.color ?? it.face })) });
      }
    }
    // 판은 늘 글자 뒤 — 무대(Stage)와 같은 약속
    return [...out.filter((q) => q.plate), ...out.filter((q) => !q.plate)];
  }, [design, outs]);

  if (!parts.length) return <span className="block h-full w-full" />;
  // 그림이 카드 칸에 크게 들어오게 «간판 둘레 + 여유»만 봅니다(벽 전체를 보면 간판이 점처럼 작아집니다)
  const x0 = Math.min(...parts.map((q) => q.x - q.w / 2)), x1 = Math.max(...parts.map((q) => q.x + q.w / 2));
  const y0 = Math.min(...parts.map((q) => q.y - q.h / 2)), y1 = Math.max(...parts.map((q) => q.y + q.h / 2));
  const w = x1 - x0, h = y1 - y0;
  const vw = Math.max(w * 1.35, (h * 1.45 * 16) / 10), vh = (vw * 10) / 16;
  const vx = (x0 + x1) / 2 - vw / 2, vy = (y0 + y1) / 2 - vh / 2;
  // 후광 채널은 «벽이 빛나는» 게 그 제품입니다 — 글자 뒤 번짐 없이 그리면 어두운 벽 위 검은 글자가 안 보입니다(2026-10-25 C안 실측)
  const lit = kindOf(design).lit;
  const halo = lit === "halo" || lit === "both";
  const blur = Math.max(8, Math.min(...parts.filter((q) => !q.plate).map((q) => q.h), h) * 0.09);
  const at = (q: (typeof parts)[number]) => `translate(${q.x} ${q.y}) rotate(${q.rot}) translate(${-q.w / 2} ${-q.h / 2})${q.scale ? ` scale(${q.scale})` : ""}`;
  return (
    <svg viewBox={`${vx} ${vy} ${vw} ${vh}`} className="block h-full w-full" aria-hidden="true">
      {halo && (
        <>
          <filter id={`pkh-${uid}`} x="-30%" y="-60%" width="160%" height="220%">
            <feGaussianBlur stdDeviation={blur} />
          </filter>
          <g filter={`url(#pkh-${uid})`} opacity={0.9}>
            {parts
              .filter((q) => !q.plate)
              .map((q) => (
                <g key={q.key} transform={at(q)}>
                  {q.paths.map((pp, i) => (
                    <path key={i} d={pp.d} fill={design.led} fillRule="evenodd" />
                  ))}
                </g>
              ))}
          </g>
        </>
      )}
      {parts.map((q) => (
        <g key={q.key} transform={at(q)}>
          {q.paths.map((pp, i) => (
            <path key={i} d={pp.d} fill={pp.fill} fillRule="evenodd" stroke={q.border?.color} strokeWidth={q.border?.w} strokeLinejoin="round" />
          ))}
        </g>
      ))}
    </svg>
  );
}
