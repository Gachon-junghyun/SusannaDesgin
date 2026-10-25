/**
 * 수산나 픽 — 담당자가 고른 시안 A·B·C 와 손님의 «다듬기» (F26-n · 2026-10-25).
 *
 * 사람 요청(2026-10-25): *"만드는 거에 초점을 버리고 선택에 초점 … 포토샵에서 돌리고 크기 조정하고 굵기나 여백, 움직임, 색깔
 * 조정 정도만 … 현대차 견적 맞추는 사이트 스타일로 … 링크 던져 주면 젊은 분들이 굵기 조정하고 수산나 픽 A B C 고를 수 있게"*.
 *
 * 🔴 **새 표를 만들지 않았습니다.** 공유 링크(`maker_shares.design`, F26-b)의 디자인 JSON 에 `picks` 칸 하나를 더했습니다.
 *    맨 위 디자인이 곧 A 안이라 **옛 받는 화면·견적 방(0017)·DB 함수(0013 의 `design.items` 검사)가 그대로** 읽습니다.
 *    B·C 안만 `picks[1..]` 의 `design` 에 들어갑니다(A 를 두 번 담으면 900KB 한도를 반만 씁니다).
 *
 * 🔴 **손님의 다듬기(`Tune`)는 «받은 안 위에 얹는 값»입니다.** 받은 안은 그대로 두고 화면에서만 `applyTune` 으로 덮어 그립니다 —
 *    «처음으로»가 한 번에 되고, 견적에는 «어느 안을 골라 무엇을 바꿨나»가 따로 적힙니다(`tuneLines`).
 *    견적으로 넘길 때는 덮어 그린 «그 모양»을 방으로 만듭니다(담당자가 손님이 본 것과 같은 것을 봅니다).
 */
import { faceColors, ledColors, plateColors, wallColors } from "@/config/maker";
import { defaultDesign, type Design, type Item } from "@/lib/maker/design";

export type Pick = { name: string; note: string; design: Design };

/** 공유 JSON 의 `picks` 한 칸 — 첫 칸(A)은 `design` 이 없습니다(맨 위 디자인이 A) */
type StoredPick = { name?: string; note?: string; design?: unknown };

export const PICK_LETTERS = ["A", "B", "C"] as const;
export const PICK_MAX = PICK_LETTERS.length;

/** 손님이 바꿀 수 있는 것 — 이것뿐입니다(사람 결정: «만들기»가 아니라 «고르고 다듬기») */
export type Tune = {
  /** 크기 (배) — 판까지 같이 */
  scale: number;
  /**
   * 글자 크기 (배) — **판은 그대로** 두고 글자·로고만. 자리가 정해진 판(뮤제드폴 2,150×500)에서 손님이 실제로 바꾸고 싶은 것은 이쪽입니다.
   */
  letter: number;
  /** 굵기 — 단계(−2 ~ +4). 단계 하나의 mm 는 글자 높이로 정합니다(`weightStep`) */
  weight: number;
  /**
   * 글자 사이 — 더하는 mm(완성 크기 기준). 손님은 «10씩»처럼 mm 로 말합니다(뮤제드폴 10/24).
   * 글꼴마다 자간 1 의 mm 가 달라 `applyTune` 이 줄마다 `trackMm` 로 바꿉니다(모르면 글자 높이 ÷ 700 으로 어림).
   */
  spacing: number;
  /** 줄 간격 (배, 1 = 받은 그대로) */
  gap: number;
  /** 판·바탕판 여백 (배, 1 = 받은 그대로) */
  pad: number;
  /** 옮기기 (mm) */
  dx: number;
  dy: number;
  /** 돌리기 (°) */
  rot: number;
  /** 색 — 비우면 받은 안의 색 */
  face?: string;
  led?: string;
  plate?: string;
  /** 벽 — "white" · "dark" 또는 색 값(#…) */
  wall?: string;
};

export const TUNE0: Tune = { scale: 1, letter: 1, weight: 0, spacing: 0, gap: 1, pad: 1, dx: 0, dy: 0, rot: 0 };

/** 손님이 고를 수 있는 범위 — 화면의 슬라이더가 이 값을 씁니다(한 곳) */
export const TUNE_RANGE = {
  scale: { min: 0.7, max: 1.4, step: 0.05 },
  letter: { min: 0.7, max: 1.5, step: 0.05 },
  weight: { min: -2, max: 4, step: 1 },
  // 좁히기 쪽을 넓혔습니다(사람 지시 2026-10-25 «자간 좀 더 좁힐 수 있게») — 글자끼리 닿기 전까지 손님이 볼 수 있게
  spacing: { min: -60, max: 80, step: 1 },
  gap: { min: 0.6, max: 2, step: 0.1 },
  pad: { min: 0.85, max: 1.4, step: 0.05 },
  rot: { min: -15, max: 15, step: 0.5 },
} as const;

/** 손님용 색 견본 — 메이커의 색표 그대로(새 색을 만들지 않습니다) */
export const TUNE_COLORS = { face: faceColors, led: ledColors, plate: plateColors, wall: wallColors };

/** 받은 그대로인가 — «처음으로» 단추를 언제 세우나 */
export const isTuned = (t: Tune) => (Object.keys(TUNE0) as (keyof Tune)[]).some((k) => t[k] !== TUNE0[k]) || !!(t.face || t.led || t.plate || t.wall);

const isSignLike = (it: Item) => it.type !== "patch";

/** 가장 작은 글자 높이(mm) — 굵기 한 단계의 크기를 정합니다 */
export function minLetter(d: Design): number {
  const hs = d.items.flatMap((it) =>
    it.type === "text" ? it.lines.map((l) => l.heightMm) : it.type === "logo" && it.letterMm ? [it.letterMm] : [],
  );
  return hs.length ? Math.min(...hs) : 300;
}

/** 굵기 한 단계 = 가장 작은 글자 높이의 0.8% (최소 1.5mm) — 300mm 글자면 2.4mm, 한쪽으로 */
export const weightStep = (d: Design) => Math.max(1.5, Math.round(minLetter(d) * 0.008 * 10) / 10);

/** 아이템 중심들의 가운데 — 크기·돌리기의 기준점 */
function center(items: Item[]): [number, number] {
  const s = items.filter(isSignLike);
  if (!s.length) return [0, 0];
  const xs = s.map((it) => it.x), ys = s.map((it) => it.y);
  return [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2];
}

/**
 * 받은 안 + 다듬기 → 그릴 디자인. 순서: 크기 → 돌리기 → 옮기기 (가운데 기준).
 * 🔴 판정은 이 결과로 합니다 — 손님이 키우고 굵게 한 그 모양이 «만들 수 있나»의 대상입니다.
 */
export function applyTune(base: Design, t: Tune, trackMm?: Map<string, (number | undefined)[]>): Design {
  const [cx, cy] = center(base.items);
  const k = t.scale;
  const rad = (t.rot * Math.PI) / 180, cos = Math.cos(rad), sin = Math.sin(rad);
  const place = (x: number, y: number): [number, number] => {
    const px = (x - cx) * k, py = (y - cy) * k;
    return [cx + px * cos - py * sin + t.dx, cy + px * sin + py * cos + t.dy];
  };
  const rotWarp = (w: Item["warp"]) =>
    w ? w.map(([x, y]) => [(x * cos - y * sin) * k, (x * sin + y * cos) * k] as [number, number]) : w;
  const items = base.items.map((it): Item => {
    if (it.type === "patch") return it;
    const [x, y] = place(it.x, it.y);
    const common = { x, y, rot: it.warp ? it.rot : Math.round(((it.rot ?? 0) + t.rot) * 10) / 10, warp: rotWarp(it.warp) };
    if (it.type === "text") {
      const glyphs =
        t.face && it.glyphs
          ? Object.fromEntries(Object.entries(it.glyphs).map(([i, g]) => [i, { ...g, color: undefined }]))
          : it.glyphs;
      return {
        ...it,
        ...common,
        face: t.face || it.face,
        glyphs,
        gap: (it.gap ?? 0.35) * t.gap,
        lines: it.lines.map((l, li) => {
          const h = Math.max(20, Math.round((l.heightMm * k * t.letter) / 5) * 5);
          // 지금 그려진 줄의 «자간 1 = 몇 mm» (없으면 어림) — 크기를 바꾸면 같이 바뀌어 mm 가 완성 크기 기준으로 남습니다
          const per = trackMm?.get(it.id)?.[li] || h / 700;
          return { ...l, heightMm: h, tracking: t.spacing ? Math.round(l.tracking + t.spacing / per) : l.tracking };
        }),
      };
    }
    if (it.type === "logo")
      return {
        ...it,
        ...common,
        w: Math.max(50, Math.round(it.w * k * t.letter)),
        letterMm: it.letterMm ? it.letterMm * k * t.letter : it.letterMm,
        // 글자를 외곽선으로 굳힌 로고(공유 링크의 관리자 PC 글꼴)만 «글자 색»을 따릅니다 — 진짜 로고의 색은 손님 브랜드라 둡니다
        layers: t.face && it.letterMm ? it.layers.map((l) => ({ ...l, color: t.face! })) : it.layers,
      };
    if (it.type === "image") return { ...it, ...common, w: Math.max(50, Math.round(it.w * k)) };
    return { ...it, ...common, w: Math.round(it.w * k * t.pad), h: Math.round(it.h * k * t.pad), fill: t.plate || it.fill };
  });
  const wall = !t.wall ? {} : t.wall.startsWith("#") ? { wall: "color", wallColor: t.wall } : { wall: t.wall };
  return {
    ...base,
    ...wall,
    led: t.led || base.led,
    board: t.plate || base.board,
    boardPad: (base.boardPad ?? 0.8) * t.pad,
    weight: Math.round(((base.weight ?? 0) + t.weight * weightStep(base)) * 10) / 10 || undefined,
    items,
  };
}

/** 견본 이름, 직접 고른 색이면 «#E1C4BE (R225 G196 B190)» — 담당자가 도료·시트 번호를 맞출 수 있게 값을 그대로 적습니다 */
const colorName = (list: readonly { name: string; hex: string }[], hex: string) => {
  const hit = list.find((c) => c.hex.toLowerCase() === hex.toLowerCase());
  if (hit) return hit.name;
  const n = parseInt(hex.replace("#", ""), 16);
  return /^#[0-9a-f]{6}$/i.test(hex) ? `${hex.toUpperCase()} (R${(n >> 16) & 255} G${(n >> 8) & 255} B${n & 255})` : hex;
};

/** 견적 요약에 들어가는 «손님이 바꾼 것» — 바꾼 것만 */
export function tuneLines(base: Design, t: Tune): string[] {
  const L: string[] = [];
  if (t.scale !== 1) L.push(`전체 크기 ${Math.round(t.scale * 100)}%`);
  if (t.letter !== 1) L.push(`글자 크기 ${Math.round(t.letter * 100)}% (판 크기 고정)`);
  if (t.weight) L.push(`굵기 ${t.weight > 0 ? "+" : ""}${t.weight}단계 (외곽 ${t.weight > 0 ? "+" : ""}${(t.weight * weightStep(base)).toFixed(1)}mm)`);
  if (t.spacing) L.push(`자간 ${t.spacing > 0 ? "+" : ""}${t.spacing}mm`);
  if (t.gap !== 1) L.push(`행간 ${Math.round(t.gap * 100)}%`);
  if (t.pad !== 1) L.push(`판 여백 ${Math.round(t.pad * 100)}%`);
  if (t.dx || t.dy) L.push(`위치 가로 ${t.dx > 0 ? "+" : ""}${Math.round(t.dx)}mm, 세로 ${t.dy > 0 ? "+" : ""}${Math.round(t.dy)}mm`);
  if (t.rot) L.push(`기울기 ${t.rot > 0 ? "+" : ""}${t.rot}°`);
  if (t.face) L.push(`글자 색상 ${colorName(faceColors, t.face)}`);
  if (t.led) L.push(`조명 색상 ${colorName(ledColors, t.led)}`);
  if (t.plate) L.push(`판 색상 ${colorName(plateColors, t.plate)}`);
  if (t.wall) L.push(`벽면 ${t.wall === "white" ? "흰 벽" : t.wall === "dark" ? "어두운 벽" : colorName(wallColors, t.wall)}`);
  return L;
}

/* ------------------------------------------------------------------ 공유 JSON ↔ 픽 */

const asDesign = (raw: unknown): Design | null => {
  const d = raw as Design | null;
  if (!d || !Array.isArray(d.items)) return null;
  const rest = { ...(d as Design & { picks?: unknown; round?: unknown }) };
  delete rest.picks;
  delete rest.round;
  return { ...defaultDesign(), ...rest };
};

/**
 * 공유 링크의 디자인 → 픽 목록. `picks` 가 없는 옛 링크는 «픽 하나»로 읽습니다(그 화면도 같은 구성기로 엽니다).
 * 이름이 비어 있으면 `fallback`(링크 제목)을 씁니다.
 */
export function readPicks(raw: unknown, fallback = ""): Pick[] {
  const top = asDesign(raw);
  if (!top) return [];
  const stored = (raw as { picks?: StoredPick[] }).picks;
  if (!Array.isArray(stored) || !stored.length) return [{ name: fallback || "수산나 픽", note: "", design: top }];
  return stored.slice(0, PICK_MAX).flatMap((p, i): Pick[] => {
    const design = i === 0 ? top : asDesign(p.design);
    if (!design) return [];
    return [{ name: (p.name ?? "").trim() || `${PICK_LETTERS[i]}안`, note: (p.note ?? "").trim(), design }];
  });
}

/**
 * 픽 목록 → 공유 JSON (관리자 «픽 링크 만들기»). A 가 맨 위, B·C 는 `picks` 안.
 * `round` = 몇 번째로 보내는 안인가(같은 링크에 손님 답을 받아 고쳐 다시 올리면 2, 3 …, 0021). 손님 화면 머리에 «2차 시안»으로 섭니다.
 */
export function packPicks(picks: Pick[], round = 1): Design & { picks: StoredPick[]; round: number } {
  const [a, ...rest] = picks;
  const top = { ...a.design } as Design & { round?: number };
  delete top.round;
  return {
    ...top,
    round,
    picks: [{ name: a.name, note: a.note }, ...rest.map((p) => ({ name: p.name, note: p.note, design: p.design }))],
  };
}

/** 공유 JSON 의 차수 — 없으면 1 */
export const readRound = (raw: unknown) => Math.max(1, Math.round(Number((raw as { round?: unknown } | null)?.round) || 1));
