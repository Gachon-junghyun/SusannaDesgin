"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Font } from "opentype.js";

import { getMakerAssets } from "@/app/admin/maker/assets/actions";
import { specimenFonts } from "@/config/fonts";
import {
  AI_DRAFT_NOTE,
  characterRules,
  impressions,
  INCOMING_ITEMS_KEY,
  INCOMING_SKETCH_KEY,
  industries,
  LOGO_BETA,
  LOGO_DRAFT_KEY,
  lockups,
  symbolWays,
  varyAxes,
  type Impression,
  type Lockup,
  type Palette,
  type SymbolWay,
  type VaryAxis,
} from "@/config/logo";
import { FAB, makerKinds } from "@/config/maker";
import { parseAssetSvg } from "@/lib/maker/asset-svg";
import type { MakerAsset } from "@/lib/maker/assets";
import { contrast, download, LEVEL_LABEL, type Level } from "@/lib/maker/design";
import { loadFontUrl } from "@/lib/maker/fonts";
import { compose, judgeLogo, logoSvg, trimSymbol, type Composed, type LogoVerdict, type SymbolSrc } from "@/lib/maker/logo";
import { pickSpots, readLabel, recommend } from "@/lib/maker/palette";
import { imageDataOf } from "@/lib/maker/trace";

/**
 * 로고 만들기 — 관리자 전용 베타 (F26-k · 2026-09-27).
 *
 * 사람 요청: *"로고 만들기 — 베타, 관리자에게만 … 단계(tree/로고.md 를 그대로 화면으로)"*. 여덟 단계를 **한 줄로** 세우고
 * 한 번에 한 단계만 엽니다(STARTUP/design-atlas `작업분해.md` «한 번에 하나씩»). 오른쪽은 늘 **3안 나란히**입니다 —
 * 3안은 **한 손잡이만** 다르게 세웁니다(작업분해 7: 둘 이상 바꾸면 무엇이 좋아졌는지 모른다).
 *
 * 🔴 **글자는 글꼴로 조판합니다** — AI 는 글자를 그리지 않습니다(로고.md). 🔴 **이미지 API 는 안 붙었습니다** —
 * «AI 초안» 칸은 자리만 있고, 그동안은 클로드 코드가 초안을 «프로젝트 에셋»으로 올립니다(F26-j).
 * 🔴 **건물 사진은 이 브라우저 밖으로 안 나갑니다**(F26-h 와 같은 규칙) — 색만 뽑아 씁니다.
 */

type Draft = {
  name: string;
  sub: string;
  industry: string;
  imps: Impression[];
  lockup: Lockup;
  way: SymbolWay;
  symbol: SymbolSrc | null;
  recolor: boolean;
  font: string;
  tracking: number | null;
  pal: number;
  vary: VaryAxis;
  H: number;
  kind: string;
  pick: number;
};

const START: Draft = {
  name: "",
  sub: "",
  industry: "cafe",
  imps: ["cute"],
  lockup: "badge",
  way: "none",
  symbol: null,
  recolor: true,
  font: "jua",
  tracking: null,
  pal: 0,
  vary: "font",
  H: 300,
  kind: "channel-front",
  pick: 0,
};

type Sketch = { name: string; d: string; w: number; h: number };

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

const STEPS = ["입력", "락업", "심벌", "글자", "색", "3안", "간판 판정", "에디터로 보내기"];

export default function LogoStudio({ base, aiReady }: { base: string; aiReady: boolean }) {
  const router = useRouter();
  const [d, setD] = useState<Draft>(() => ({ ...START, ...(readJson<Partial<Draft>>(LOGO_DRAFT_KEY) ?? {}) }));
  const set = (patch: Partial<Draft>) => setD((o) => ({ ...o, ...patch }));
  const [step, setStep] = useState(0);
  // 그림판에서 넘어온 스케치 — 이 브라우저 저장소로만 건너옵니다
  const [sketch] = useState<Sketch | null>(() => readJson<Sketch>(INCOMING_SKETCH_KEY));
  const [err, setErr] = useState("");

  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(LOGO_DRAFT_KEY, JSON.stringify(d));
      } catch {
        /* 저장소가 막힘 — 이번 탭에서만 삽니다 */
      }
    }, 300);
    return () => clearTimeout(t);
  }, [d]);

  /* ---------------------------------------------------------- 건물 사진 → 색 (F26-h·i 그대로) */
  const [photo, setPhoto] = useState<{ src: string; name: string } | null>(null);
  const [photoPal, setPhotoPal] = useState<Palette[]>([]);
  async function takePhoto(f: File) {
    setErr("");
    if (!f.type.startsWith("image/")) return setErr("사진 파일(JPG·PNG·WEBP)만 됩니다.");
    try {
      const img = await imageDataOf(f, 1200);
      const spots = pickSpots(img, 5, "area", true);
      const recs = recommend(spots.map((s) => ({ hex: s.hex, share: s.share })));
      setPhotoPal(recs.map((r) => ({ name: `${r.label}${r.best ? " · 추천" : ""}`, ground: r.wall, plate: r.plate, face: r.face, symbol: r.point ?? r.face, point: r.point })));
      setPhoto((old) => {
        if (old) URL.revokeObjectURL(old.src);
        return { src: URL.createObjectURL(f), name: f.name };
      });
      set({ pal: 0 });
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  /* ---------------------------------------------------------- 후보 목록 (손잡이마다) */
  const imps = d.imps.length ? d.imps.map((k) => impressions.find((i) => i.key === k)!).filter(Boolean) : [impressions[1]];
  const lead = imps[0];
  const leadFonts = [...new Set(imps.flatMap((i) => i.fonts))];
  const fontList = [...leadFonts, ...specimenFonts.map((f) => f.slug).filter((x) => !leadFonts.includes(x))];
  const palList: Palette[] = photoPal.length ? photoPal : [...lead.palettes, ...imps.slice(1).flatMap((i) => i.palettes.slice(0, 2))];
  const lockList: Lockup[] = [...new Set([...imps.flatMap((i) => i.lockups), ...lockups.map((l) => l.key)])];
  const tracking = d.tracking ?? lead.tracking;
  const palette = palList[Math.min(d.pal, palList.length - 1)];

  // 3안 — 고른 값을 첫 안으로, 같은 손잡이의 다음 후보 둘
  const three = <T,>(main: T, list: T[]) => [main, ...list.filter((x) => x !== main)].slice(0, 3);
  const fonts3 = d.vary === "font" ? three(d.font, fontList) : [d.font, d.font, d.font];
  const pals3 = d.vary === "color" ? three(palette, palList) : [palette, palette, palette];
  const locks3 = d.vary === "lockup" ? three(d.lockup, lockList) : [d.lockup, d.lockup, d.lockup];
  const plans = [0, 1, 2].map((i) => ({ font: fonts3[i], palette: pals3[i], lockup: locks3[i] }));

  /* ---------------------------------------------------------- 글꼴 받기 (3안에 쓰는 것만) */
  const [fonts, setFonts] = useState<Record<string, Font>>({});
  const [fontErr, setFontErr] = useState("");
  const needKey = [...new Set(plans.map((p) => p.font))].filter((x) => !fonts[x]).join(",");
  useEffect(() => {
    let alive = true;
    for (const slug of needKey ? needKey.split(",") : []) {
      const f = specimenFonts.find((x) => x.slug === slug);
      if (!f) continue;
      loadFontUrl(f.file)
        .then((font) => alive && setFonts((o) => ({ ...o, [slug]: font })))
        .catch((e) => alive && setFontErr(`${f.name}: ${(e as Error).message}`));
    }
    return () => {
      alive = false;
    };
  }, [needKey]);

  /* ---------------------------------------------------------- 조립 · 판정 */
  const symbol = d.way === "none" ? null : d.symbol;
  const kind = makerKinds.find((k) => k.key === d.kind) ?? makerKinds[0];
  const [built, setBuilt] = useState<(Composed | null)[]>([null, null, null]);
  const [verdicts, setVerdicts] = useState<(LogoVerdict | null)[]>([null, null, null]);
  // 다시 세울지는 «값»으로 가릅니다 — 목록·객체는 그릴 때마다 새로 만들어져 같은 값이어도 다른 것으로 보입니다
  const buildKey = JSON.stringify([
    plans.map((p) => [p.font, p.palette, p.lockup, !!fonts[p.font]]),
    d.name,
    d.sub,
    tracking,
    d.H,
    symbol ? [symbol.name, symbol.srcW, symbol.srcH, symbol.layers.length] : null,
    d.recolor,
  ]);
  useEffect(() => {
    const t = setTimeout(() => {
      setBuilt(
        plans.map((p) => {
          const font = fonts[p.font];
          if (!font) return null;
          return compose({ name: d.name, sub: d.sub, font, fontSlug: p.font, tracking, H: d.H, lockup: p.lockup, symbol, palette: p.palette, recolor: d.recolor });
        }),
      );
    }, 30);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 값이 바뀐 때만(buildKey) 다시 세웁니다
  }, [buildKey]);
  // 판정은 조금 늦게 — 캔버스에 칠해 재는 일이라 입력 중에는 미룹니다
  useEffect(() => {
    const t = setTimeout(() => setVerdicts(built.map((c) => (c ? judgeLogo(c, kind) : null))), 450);
    return () => clearTimeout(t);
  }, [built, kind]);

  /* ---------------------------------------------------------- ③ 프로젝트 에셋 */
  const [assets, setAssets] = useState<MakerAsset[] | null>(null);
  const [assetErr, setAssetErr] = useState("");
  const [project, setProject] = useState("");
  async function loadAssets() {
    setAssetErr("");
    const r = await getMakerAssets();
    if (!r.ok) return setAssetErr(r.error);
    setAssets(r.items);
    if (!project && r.items.length) setProject(r.items[r.items.length - 1].project);
  }
  async function pickAsset(a: MakerAsset) {
    setAssetErr("");
    if (!a.url) return setAssetErr("이 에셋의 주소를 받지 못했습니다 — 에셋 목록을 다시 불러오세요.");
    try {
      const txt = await fetch(a.url).then((r) => r.text());
      const p = parseAssetSvg(txt);
      const { sym, dropped } = trimSymbol({ name: a.name, layers: p.layers, srcW: p.srcW, srcH: p.srcH, from: "asset" });
      set({ symbol: sym, recolor: sym.layers.length === 1 });
      if (dropped) setAssetErr(`배경 사각형 ${dropped}장을 빼고 잉크만 썼습니다.`);
    } catch (e) {
      setAssetErr((e as Error).message);
    }
  }
  const projects = assets ? [...new Set(assets.map((a) => a.project))] : [];
  const shown = (assets ?? []).filter((a) => a.project === project);

  /* ---------------------------------------------------------- ⑧ 보내기 */
  const pick = Math.min(d.pick, 2);
  function toEditor(which: number[]) {
    const groups = which.map((i) => built[i]).filter((c): c is Composed => !!c);
    if (!groups.length) return;
    try {
      localStorage.setItem(
        INCOMING_ITEMS_KEY,
        JSON.stringify({ kind: d.kind, groups: groups.map((c, i) => ({ name: `${d.name || "로고"} ${"ABC"[which[i]]}안`, w: c.w, h: c.h, items: c.items })) }),
      );
      router.push(base);
    } catch {
      setErr("브라우저 저장소가 막혀 있어 보내지 못했습니다 — SVG 로 내려받아 주세요.");
    }
  }

  /* ---------------------------------------------------------- 화면 */
  const canNext = step !== 0 || d.name.trim().length > 0;
  const summary = [
    d.name ? `${d.name}${d.sub ? ` · ${d.sub}` : ""} · ${imps.map((i) => i.name).join("·")}` : "상호를 넣으세요",
    lockups.find((l) => l.key === d.lockup)?.name ?? "",
    d.way === "none" ? "없음" : `${symbolWays.find((w) => w.key === d.way)?.name}${d.symbol ? ` — ${d.symbol.name}` : " (아직 안 고름)"}`,
    specimenFonts.find((f) => f.slug === d.font)?.name ?? d.font,
    palette?.name ?? "",
    `${varyAxes.find((a) => a.key === d.vary)?.name}만 다르게`,
    verdicts[pick] ? LEVEL_LABEL[verdicts[pick]!.level] : "재는 중",
    "",
  ];

  return (
    <div className="grid lg:h-full lg:grid-cols-[420px_minmax(0,1fr)]">
      <section className="border-b border-line bg-white lg:min-h-0 lg:overflow-y-auto lg:border-b-0 lg:border-r">
        <header className="border-b border-line px-5 pb-3 pt-4">
          <h1 className="text-[18px] font-black">
            로고 만들기 <span className="ml-1 text-[12px] font-bold text-brand-700">{LOGO_BETA} · 관리자만</span>
          </h1>
          <p className="mt-1 text-[12px] leading-relaxed text-ink-500">
            한 번에 한 단계씩 정합니다. 오른쪽 세 안은 한 손잡이만 다르게 세웁니다. 글자는 글꼴로 짜고, AI 는 글자를 그리지 않습니다.
          </p>
        </header>

        <ol>
          {STEPS.map((title, i) => {
            const open = step === i;
            return (
              <li key={title} className="border-b border-line">
                <button
                  type="button"
                  onClick={() => setStep(i)}
                  aria-expanded={open}
                  className={`flex w-full items-baseline gap-3 px-5 py-3 text-left ${open ? "bg-brand-50" : "hover:bg-paper"}`}
                >
                  <span className={`w-5 shrink-0 text-[15px] font-black tabular-nums ${open ? "text-brand-700" : "text-ink-500"}`}>{i + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-black">{title}</span>
                    {!open && summary[i] && <span className="block truncate text-[12px] text-ink-500">{summary[i]}</span>}
                  </span>
                </button>
                {open && (
                  <div className="px-5 pb-5 pt-1">
                    {i === 0 && <StepInput d={d} set={set} photo={photo} onPhoto={takePhoto} onDropPhoto={() => { setPhoto(null); setPhotoPal([]); set({ pal: 0 }); }} />}
                    {i === 1 && <StepLockup d={d} set={set} lead={lead.lockups[0]} />}
                    {i === 2 && (
                      <StepSymbol
                        d={d}
                        set={set}
                        base={base}
                        aiReady={aiReady}
                        sketch={sketch}
                        motifs={industries.find((x) => x.key === d.industry)?.motifs ?? ""}
                        assets={assets}
                        assetErr={assetErr}
                        projects={projects}
                        project={project}
                        setProject={setProject}
                        shown={shown}
                        onLoad={loadAssets}
                        onPick={pickAsset}
                      />
                    )}
                    {i === 3 && <StepFont d={d} set={set} fontList={fontList} leadFonts={leadFonts} tracking={tracking} fontErr={fontErr} />}
                    {i === 4 && <StepColor d={d} set={set} list={palList} fromPhoto={!!photoPal.length} />}
                    {i === 5 && <StepThree d={d} set={set} plans={plans} />}
                    {i === 6 && <StepJudge d={d} set={set} v={verdicts[pick]} c={built[pick]} />}
                    {i === 7 && (
                      <div className="space-y-2">
                        <p className="text-[13px] leading-relaxed text-ink-500">
                          판(배지)은 «판», 심벌은 «로고», 상호는 <b className="text-ink">살아 있는 글자</b>로 벽에 섭니다 — 에디터에서 글꼴·높이를 다시 고칠 수 있습니다.
                        </p>
                        <button type="button" disabled={!built[pick]} onClick={() => toEditor([pick])} className="w-full bg-brand-700 px-4 py-3 text-[14px] font-bold text-white hover:bg-brand-600 disabled:opacity-40">
                          {"ABC"[pick]}안을 에디터로 보내기
                        </button>
                        <button type="button" disabled={built.some((c) => !c)} onClick={() => toEditor([0, 1, 2])} className="w-full border border-brand-700 px-4 py-2.5 text-[13px] font-bold text-brand-700 hover:bg-brand-50 disabled:opacity-40">
                          3안 모두 벽에 나란히 올리기
                        </button>
                        <button
                          type="button"
                          disabled={!built[pick]}
                          onClick={() => built[pick] && download(`로고_${d.name || "시안"}_${"ABC"[pick]}.svg`, logoSvg(built[pick]!))}
                          className="w-full border border-line px-4 py-2.5 text-[13px] font-bold hover:bg-paper disabled:opacity-40"
                        >
                          {"ABC"[pick]}안 SVG 내려받기 (mm)
                        </button>
                        <p className="pt-1 text-[11px] leading-relaxed text-ink-500">
                          SVG 는 «시안»입니다. 납품 전 상표 검색(KIPRIS)을 하고, 제작 칼선은 공장에서 다시 뽑습니다.
                        </p>
                      </div>
                    )}
                    {i < STEPS.length - 1 && (
                      <button type="button" disabled={!canNext} onClick={() => setStep(i + 1)} className="mt-4 text-[13px] font-bold text-brand-700 underline underline-offset-4 disabled:opacity-40">
                        다음 — {STEPS[i + 1]}
                      </button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
        {err && (
          <p className="px-5 py-3 text-[13px] font-bold text-accent-600" role="alert">
            {err}
          </p>
        )}
      </section>

      <section className="flex min-w-0 flex-col bg-[#e4e7e6] lg:min-h-0">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line bg-white px-4 py-2 text-[12px]">
          <b className="text-[13px]">3안</b>
          <span className="text-ink-500">
            «{varyAxes.find((a) => a.key === d.vary)?.name}»만 다르고 나머지는 같습니다
          </span>
          <span className="ml-auto flex gap-3">
            {varyAxes.map((a) => (
              <button key={a.key} type="button" aria-pressed={d.vary === a.key} onClick={() => set({ vary: a.key })} className={`font-bold ${d.vary === a.key ? "text-brand-700 underline underline-offset-4" : "text-ink-500 hover:text-ink"}`}>
                {a.name}
              </button>
            ))}
          </span>
        </div>
        <div className="grid flex-1 content-start gap-3 p-3 sm:p-4 xl:grid-cols-3 lg:overflow-y-auto">
          {plans.map((p, i) => (
            <Candidate
              key={i}
              label={"ABC"[i]}
              axis={d.vary === "font" ? (specimenFonts.find((f) => f.slug === p.font)?.name ?? p.font) : d.vary === "color" ? p.palette.name : (lockups.find((l) => l.key === p.lockup)?.name ?? "")}
              c={built[i]}
              ground={p.palette.ground}
              v={verdicts[i]}
              on={pick === i}
              onPick={() => set({ pick: i })}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

/* ================================================================== 단계별 칸 */

type StepProps = { d: Draft; set: (p: Partial<Draft>) => void };
const label = "block text-[12px] font-bold text-ink-500";
const field = "mt-1 w-full border-b border-line bg-transparent px-1 py-1.5 text-[15px] font-bold outline-none focus:border-brand-700";

function Choice({ on, onClick, title, note, tag }: { on: boolean; onClick: () => void; title: string; note?: string; tag?: string }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick} className={`block w-full border-l-[3px] px-3 py-2 text-left ${on ? "border-brand-700 bg-brand-100" : "border-transparent hover:bg-paper"}`}>
      <span className="flex items-baseline justify-between gap-2">
        <b className={`text-[14px] ${on ? "text-brand-700" : ""}`}>{title}</b>
        {tag && <span className="shrink-0 text-[11px] font-bold text-brand-700">{tag}</span>}
      </span>
      {note && <span className="mt-0.5 block text-[12px] leading-relaxed text-ink-500">{note}</span>}
    </button>
  );
}

function StepInput({ d, set, photo, onPhoto, onDropPhoto }: StepProps & { photo: { src: string; name: string } | null; onPhoto: (f: File) => void; onDropPhoto: () => void }) {
  return (
    <div className="space-y-4">
      <label className="block">
        <span className={label}>상호</span>
        <input value={d.name} maxLength={16} onChange={(e) => set({ name: e.target.value })} placeholder="예) 토닥커피" className={field} />
      </label>
      <label className="block">
        <span className={label}>부제 (선택 — 업종·영문 한 줄)</span>
        <input value={d.sub} maxLength={24} onChange={(e) => set({ sub: e.target.value })} placeholder="예) COFFEE & BAKE" className={field} />
      </label>
      <div>
        <span className={label}>업종</span>
        <select value={d.industry} onChange={(e) => set({ industry: e.target.value })} className={`${field} text-[14px]`}>
          {industries.map((x) => (
            <option key={x.key} value={x.key}>
              {x.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <span className={label}>원하는 인상 — 1~2개 ({d.imps.length}/2)</span>
        <div className="mt-1">
          {impressions.map((m) => {
            const on = d.imps.includes(m.key);
            return (
              <Choice
                key={m.key}
                on={on}
                title={m.name}
                note={on ? m.rule : undefined}
                tag={on ? `${d.imps.indexOf(m.key) + 1}순위` : undefined}
                onClick={() => {
                  if (on) return set({ imps: d.imps.filter((k) => k !== m.key) });
                  const next = [...d.imps, m.key].slice(-2);
                  // 첫 인상이 바뀌면 그 인상의 첫 글꼴·락업으로 맞춥니다(나중에 바꿀 수 있음)
                  const lead = impressions.find((x) => x.key === next[0])!;
                  set({ imps: next, font: lead.fonts[0], lockup: lead.lockups[0], tracking: null, pal: 0 });
                }}
              />
            );
          })}
        </div>
      </div>
      <div>
        <span className={label}>건물 사진 (선택) — 있으면 색을 건물에서 뽑습니다</span>
        {photo ? (
          <div className="mt-2 flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- 이 브라우저 안의 임시 사진(blob:) */}
            <img src={photo.src} alt="올린 건물 사진" className="h-16 w-24 object-cover" />
            <span className="min-w-0 flex-1 truncate text-[12px] text-ink-500">{photo.name}</span>
            <button type="button" onClick={onDropPhoto} className="text-[12px] font-bold text-ink-500 underline">
              빼기
            </button>
          </div>
        ) : (
          <label className="mt-2 block cursor-pointer border border-dashed border-[#b9c1bf] px-3 py-3 text-center text-[13px] font-bold hover:border-brand">
            사진 고르기
            <input type="file" accept="image/*" className="sr-only" onChange={(e) => e.target.files?.[0] && onPhoto(e.target.files[0])} />
          </label>
        )}
        <p className="mt-1 text-[11px] text-ink-500">사진은 이 브라우저 밖으로 나가지 않습니다 — «건물 색 찾기»와 같은 방식으로 색만 뽑습니다.</p>
      </div>
    </div>
  );
}

function StepLockup({ d, set, lead }: StepProps & { lead: Lockup }) {
  return (
    <div>
      {lockups.map((l) => (
        <Choice key={l.key} on={d.lockup === l.key} title={l.name} note={l.note} tag={l.key === lead ? "인상에 맞음" : undefined} onClick={() => set({ lockup: l.key })} />
      ))}
    </div>
  );
}

function StepSymbol(
  p: StepProps & {
    base: string;
    aiReady: boolean;
    sketch: Sketch | null;
    motifs: string;
    assets: MakerAsset[] | null;
    assetErr: string;
    projects: string[];
    project: string;
    setProject: (v: string) => void;
    shown: MakerAsset[];
    onLoad: () => void;
    onPick: (a: MakerAsset) => void;
  },
) {
  const { d, set } = p;
  return (
    <div className="space-y-3">
      <div>
        {symbolWays.map((w) => (
          <Choice key={w.key} on={d.way === w.key} title={w.name} note={d.way === w.key ? w.note : undefined} onClick={() => set({ way: w.key })} />
        ))}
      </div>
      {d.lockup === "word" && d.way !== "none" && <p className="text-[12px] font-bold text-accent-600">락업이 «글자만»이라 심벌은 안 들어갑니다 — 2단계에서 바꾸세요.</p>}

      {d.way === "motif" && (
        <p className="text-[12px] leading-relaxed">
          <b>이 업종의 모티프 후보</b> — {p.motifs}. <span className="text-ink-500">흔할수록 상표가 겹치기 쉽습니다.</span>
        </p>
      )}
      {d.way === "character" && (
        <ul className="list-disc space-y-1 pl-4 text-[12px] leading-relaxed">
          {characterRules.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      )}
      {d.way === "sketch" && (
        <div className="text-[12px] leading-relaxed">
          {p.sketch ? (
            <div className="flex items-center gap-3">
              <svg viewBox={`0 0 ${p.sketch.w} ${p.sketch.h}`} className="h-14 w-14 shrink-0 border border-line bg-white" aria-hidden="true">
                <path d={p.sketch.d} fillRule="evenodd" fill="#1b1d1c" />
              </svg>
              <span className="min-w-0 flex-1">
                그림판에서 온 스케치 «{p.sketch.name}»
                <button
                  type="button"
                  onClick={() => set({ symbol: { name: p.sketch!.name, layers: [{ name: "손그림", d: p.sketch!.d, color: "#1b1d1c" }], srcW: p.sketch!.w, srcH: p.sketch!.h, from: "sketch" }, recolor: true })}
                  className="ml-2 font-bold text-brand-700 underline"
                >
                  이걸로
                </button>
              </span>
            </div>
          ) : (
            <p className="text-ink-500">그림판에서 그린 게 아직 없습니다.</p>
          )}
          <Link href={`${p.base}/draw`} className="mt-1 inline-block font-bold text-brand-700 underline underline-offset-4">
            그림판 열기
          </Link>
          <span className="text-ink-500"> — «AI 로 다듬기» 결과(글꼴 느낌 여러 벌)는 아래 프로젝트 에셋으로 옵니다.</span>
        </div>
      )}

      {d.way !== "none" && (
        <div className="border-t border-line pt-3">
          <div className="flex items-center justify-between">
            <span className={label}>프로젝트 에셋에서 고르기 (SVG)</span>
            <button type="button" onClick={p.onLoad} className="text-[12px] font-bold text-brand-700 underline">
              {p.assets ? "다시 불러오기" : "불러오기"}
            </button>
          </div>
          {p.assetErr && <p className="mt-1 text-[12px] font-bold text-accent-600">{p.assetErr}</p>}
          {p.assets && (
            <>
              {p.projects.length ? (
                <select value={p.project} onChange={(e) => p.setProject(e.target.value)} className={`${field} text-[13px]`}>
                  {p.projects.map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              ) : (
                <p className="mt-1 text-[12px] text-ink-500">올라온 에셋이 없습니다.</p>
              )}
              <ul className="mt-2 grid grid-cols-4 gap-1.5">
                {p.shown.map((a) => (
                  <li key={a.id}>
                    <button
                      type="button"
                      disabled={a.kind !== "svg"}
                      title={a.kind !== "svg" ? "PNG·JPG 는 «SVG 따기»로 선을 딴 뒤 올려 주세요" : a.name}
                      onClick={() => p.onPick(a)}
                      className={`block aspect-square w-full border bg-[repeating-conic-gradient(#f1f2f1_0_25%,#fff_0_50%)] bg-[length:12px_12px] p-1 disabled:opacity-35 ${d.symbol?.name === a.name ? "border-brand-700 outline outline-2 outline-brand-700" : "border-line hover:border-brand"}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- 서명 URL(수명 있음) */}
                      {a.url && <img src={a.url} alt={a.name} className="h-full w-full object-contain" />}
                    </button>
                    <span className="block truncate text-[10px] text-ink-500">{a.name}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
          <button type="button" disabled={!p.aiReady} className="mt-3 w-full border border-line px-3 py-2.5 text-[13px] font-bold text-ink-500 disabled:cursor-not-allowed disabled:opacity-60">
            AI 초안 3장 만들기
          </button>
          {!p.aiReady && <p className="mt-1 text-[12px] leading-relaxed text-ink-500">{AI_DRAFT_NOTE} (`npm run cms -- maker-assets upload`).</p>}
        </div>
      )}

      {d.way !== "none" && d.symbol && (
        <div className="flex items-center justify-between border-t border-line pt-3 text-[12px]">
          <span>
            고른 심벌 <b>{d.symbol.name}</b> · 색 {new Set(d.symbol.layers.map((l) => l.color)).size}층
          </span>
          <span className="flex items-center gap-3">
            <label className="flex items-center gap-1 font-bold">
              <input type="checkbox" checked={d.recolor} onChange={(e) => set({ recolor: e.target.checked })} className="accent-brand" />
              색 한 벌로 칠하기
            </label>
            <button type="button" onClick={() => set({ symbol: null })} className="font-bold text-ink-500 underline">
              빼기
            </button>
          </span>
        </div>
      )}
    </div>
  );
}

function StepFont({ d, set, fontList, leadFonts, tracking, fontErr }: StepProps & { fontList: string[]; leadFonts: string[]; tracking: number; fontErr: string }) {
  return (
    <div className="space-y-3">
      <p className="text-[12px] leading-relaxed text-ink-500">간판·BI 사용이 «가능»으로 확인된 16종만 씁니다(글꼴 견본 페이지와 같은 목록). 인상에 맞는 것이 위에 옵니다.</p>
      <div className="max-h-[320px] overflow-y-auto">
        {fontList.map((slug) => {
          const f = specimenFonts.find((x) => x.slug === slug)!;
          return <Choice key={slug} on={d.font === slug} title={f.name} tag={leadFonts.includes(slug) ? "인상에 맞음" : undefined} onClick={() => set({ font: slug })} />;
        })}
      </div>
      <label className="block">
        <span className={label}>
          상호 자간 {tracking} <span className="font-normal">(부제는 넓게 고정)</span>
        </span>
        <input type="range" min={-40} max={400} step={10} value={tracking} onChange={(e) => set({ tracking: Number(e.target.value) })} className="mt-1 w-full accent-brand" />
      </label>
      {fontErr && <p className="text-[12px] font-bold text-accent-600">{fontErr}</p>}
    </div>
  );
}

function Swatches({ p }: { p: Palette }) {
  const cs = [p.ground, p.plate, p.face, p.symbol, p.point].filter((x, i, a): x is string => !!x && a.indexOf(x) === i);
  return (
    <span className="flex shrink-0">
      {cs.map((c) => (
        <span key={c} className="h-5 w-5 border border-black/10" style={{ background: c }} title={c} />
      ))}
    </span>
  );
}

function StepColor({ d, set, list, fromPhoto }: StepProps & { list: Palette[]; fromPhoto: boolean }) {
  return (
    <div className="space-y-2">
      <p className="text-[12px] leading-relaxed text-ink-500">
        {fromPhoto ? "건물 사진에서 뽑은 색으로 «건물 색 → 간판 색 추천»(에디터·건물 색 찾기와 같은 규칙)을 씁니다." : "건물 사진이 없어 인상 수칙의 색 세 벌을 씁니다. 사진을 넣으면 건물에서 뽑습니다."} 간판은 2~3색입니다.
      </p>
      {list.map((p, i) => {
        const r = contrast(p.face, p.plate ?? p.ground);
        return (
          <button key={p.name + i} type="button" aria-pressed={d.pal === i} onClick={() => set({ pal: i })} className={`flex w-full items-center gap-3 border-l-[3px] px-3 py-2 text-left ${d.pal === i ? "border-brand-700 bg-brand-100" : "border-transparent hover:bg-paper"}`}>
            <Swatches p={p} />
            <span className="min-w-0 flex-1">
              <b className="block text-[13px]">{p.name}</b>
              <span className={`text-[11px] ${r < 3 ? "font-bold text-accent-600" : "text-ink-500"}`}>
                글자 대비 {r.toFixed(1)} · {readLabel(r)}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function StepThree({ d, set, plans }: StepProps & { plans: { font: string; palette: Palette; lockup: Lockup }[] }) {
  return (
    <div className="space-y-3">
      <p className="text-[12px] leading-relaxed text-ink-500">
        세 안은 <b className="text-ink">한 손잡이만</b> 다릅니다 — 둘 이상 바꾸면 무엇 때문에 좋아졌는지 모릅니다(작업분해 7). 첫 안(A)은 지금까지 고른 값 그대로입니다.
      </p>
      <div>
        {varyAxes.map((a) => (
          <Choice key={a.key} on={d.vary === a.key} title={`${a.name}만 다르게`} onClick={() => set({ vary: a.key })} />
        ))}
      </div>
      <div>
        <span className={label}>고를 안</span>
        <div className="mt-1 flex border border-line">
          {plans.map((_, i) => (
            <button key={i} type="button" aria-pressed={d.pick === i} onClick={() => set({ pick: i })} className={`flex-1 py-2 text-[14px] font-black ${d.pick === i ? "bg-ink text-white" : "hover:bg-paper"}`}>
              {"ABC"[i]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

const LEVEL_TEXT: Record<Level, string> = { ok: "text-brand-700", check: "text-[#9a6a00]", no: "text-accent-600" };

function StepJudge({ d, set, v, c }: StepProps & { v: LogoVerdict | null; c: Composed | null }) {
  return (
    <div className="space-y-3">
      <label className="block">
        <span className={label}>간판 종류</span>
        <select value={d.kind} onChange={(e) => set({ kind: e.target.value })} className={`${field} text-[14px]`}>
          {makerKinds.map((k) => (
            <option key={k.key} value={k.key}>
              {k.code} {k.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className={label}>상호 글자 높이 (mm) — 실제 간판 크기</span>
        <input type="number" min={80} max={2000} step={10} value={d.H} onChange={(e) => set({ H: Math.max(80, Math.min(2000, Number(e.target.value) || 300)) })} className={field} />
      </label>
      {c && (
        <p className="text-[12px] text-ink-500">
          이 안 전체 {Math.round(c.w).toLocaleString()} × {Math.round(c.h).toLocaleString()}mm · 기준은 /sign-proof 와 같은 자(절곡 획 {FAB.bendMinStrokeMm}mm · 조명 글자 {FAB.ledMinLetterMm}mm · 속공간 {FAB.minHoleMm}mm)
        </p>
      )}
      {!v ? (
        <p className="text-[13px] text-ink-500">재는 중…</p>
      ) : (
        <>
          <p className={`text-[15px] font-black ${LEVEL_TEXT[v.level]}`}>{LEVEL_LABEL[v.level]}</p>
          <ul className="space-y-1.5 text-[12px] leading-relaxed">
            {v.notes.map((n, i) => (
              <li key={i} className={n.level === "ok" ? "text-ink-500" : LEVEL_TEXT[n.level]}>
                {n.text}
              </li>
            ))}
          </ul>
          <p className="text-[11px] leading-relaxed text-ink-500">그라데이션·수채·3D 광택은 채널 간판으로 못 만듭니다(면 하나가 한 색) — 이 도구는 면 색만 쓰므로 생기지 않지만, 에셋 심벌의 색 층이 많으면 위에서 경고합니다.</p>
        </>
      )}
    </div>
  );
}

/* ================================================================== 3안 한 칸 */

function Candidate({ label: L, axis, c, ground, v, on, onPick }: { label: string; axis: string; c: Composed | null; ground: string; v: LogoVerdict | null; on: boolean; onPick: () => void }) {
  const pad = c ? Math.max(c.w, c.h) * 0.14 : 0;
  return (
    <button type="button" onClick={onPick} aria-pressed={on} className={`flex flex-col bg-white text-left ${on ? "outline outline-[3px] -outline-offset-[3px] outline-brand-700" : "hover:outline hover:outline-1 hover:outline-line"}`}>
      <span className="flex items-baseline gap-2 px-3 pb-1 pt-2">
        <b className="text-[16px]">{L}</b>
        <span className="min-w-0 flex-1 truncate text-[12px] text-ink-500">{axis}</span>
        {v && <span className={`shrink-0 text-[12px] font-bold ${LEVEL_TEXT[v.level]}`}>{LEVEL_LABEL[v.level]}</span>}
      </span>
      <span className="grid aspect-[4/3] place-items-center p-2" style={{ background: ground }}>
        {c ? (
          <svg viewBox={`${-pad} ${-pad} ${c.w + pad * 2} ${c.h + pad * 2}`} className="h-full max-h-full w-full" role="img" aria-label={`${L}안 미리보기`}>
            {c.shapes.map((s, i) => (
              <path key={i} d={s.d} fill={s.color} fillRule="evenodd" stroke={s.border?.color} strokeWidth={s.border?.w} strokeLinejoin="round" />
            ))}
          </svg>
        ) : (
          <span className="text-[13px] text-ink-500">글꼴 받는 중…</span>
        )}
      </span>
      {c && (
        <span className="px-3 py-1.5 text-[11px] tabular-nums text-ink-500">
          {Math.round(c.w).toLocaleString()} × {Math.round(c.h).toLocaleString()}mm{v ? ` · 조각 ${v.pieces} · ${v.colors}색` : ""}
          {c.notes.length ? ` · ${c.notes.join(" ")}` : ""}
        </span>
      )}
    </button>
  );
}
