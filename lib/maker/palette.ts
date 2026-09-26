/**
 * 건물 사진 → «우리 가게 색»(퍼스널 컬러) · 간판 색 조합 추천 (F26-f · 2026-09-26).
 *
 * 사람 요청: *"건물을 넣으면 간판 퍼스널 색을 뽑게"*. 근거는 같은 날 조사한 한국 가게 전면 레퍼런스 20장의
 * 공통점 — **색은 1~2개이고 건물에서 뽑는다**(노란문약국 노랑 하나 · 리틀넥 문틀과 글자 같은 계열 ·
 * 맛지음 회녹+흰색). 그래서 «예쁜 색 목록»을 주는 대신 **사진 속 건물 색**에서 출발합니다.
 *
 * 🔴 **사진은 브라우저 밖으로 안 나갑니다** — 캔버스에서 픽셀을 읽고 끝입니다(가게 사진과 같은 규칙).
 * 🔴 **화면 색은 실물과 다릅니다.** 사진 색은 날씨·노출·화이트밸런스를 탑니다 — «출발점»이지 도료 번호가 아닙니다.
 *
 * 대비는 WCAG 대비비(`contrast`)로 셉니다. 간판은 멀리서 읽으니 **4.5 이상 «잘 읽힘» · 3 이상 «큰 글자면 읽힘»**
 * 을 문턱으로 씁니다(WCAG 본문/큰 글자 문턱을 그대로 빌린 것이지 간판 규정이 아닙니다 — 화면에도 그렇게 적습니다).
 */
import { contrast, luminance } from "@/lib/maker/design";

export type Swatch = {
  hex: string;
  /** 사진에서 차지한 비율 0~1 */
  share: number;
};

type RGB = [number, number, number];

const toHex = (c: RGB) => "#" + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
export function hexRgb(hex: string): RGB {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16) || 0;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/*
 * 🔴 옛 `extractPalette`(픽셀 k-평균 + «위쪽 40% 푸른·밝은 무채색 = 하늘») 는 2026-09-26 에 지웠습니다 — 흰 타일 벽을 하늘로
 * 빼는 고장이 있었고, «건물 색 찾기»(`pickSpots`)와 두 벌이 되면 두 화면이 다른 색을 말합니다. 지금은 에디터도 `pickSpots` 를 씁니다.
 * 하늘을 빼야 하는 까닭 자체는 그대로입니다 — 수산나 시공 사진(work-16)에서 **하늘색이 44% 로 1위, 건물 벽은 13%** 였습니다.
 */

/* ------------------------------------------------------------------ 색 셈 (HSL) */

function toHsl([r, g, b]: RGB): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}
function fromHsl(h: number, s: number, l: number): string {
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = (t: number) => {
    t = ((t % 1) + 1) % 1;
    return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p;
  };
  const H = h / 360;
  return toHex([f(H + 1 / 3) * 255, f(H) * 255, f(H - 1 / 3) * 255]);
}

/** 채도 (0~1) — 무채색(회색·흰·검정)을 가려낼 때 */
export const chroma = (hex: string) => {
  const c = hexRgb(hex);
  return (Math.max(...c) - Math.min(...c)) / 255;
};

/**
 * 톤온톤 — 같은 색상(色相)을 두고 밝기만 옮겨 바탕과 대비 `target` 을 맞춥니다(리틀넥: 크림 문틀 + 연두 글자).
 * 어두운 쪽·밝은 쪽 중 **덜 옮기고도** 맞는 쪽을 고릅니다. 끝까지 가도 못 맞추면 끝값을 돌려줍니다.
 */
export function toneOn(bg: string, target = 3.2): string {
  const [h, s, l] = toHsl(hexRgb(bg));
  const tries: string[] = [];
  for (const dir of [-1, 1]) {
    for (let k = 1; k <= 40; k++) {
      const L = l + dir * k * 0.025;
      if (L < 0.04 || L > 0.97) break;
      const c = fromHsl(h, Math.min(1, s * (dir < 0 ? 1.1 : 0.9)), L);
      if (contrast(c, bg) >= target) {
        tries.push(c);
        break;
      }
    }
  }
  if (!tries.length) return luminance(bg) > 0.4 ? fromHsl(h, s, 0.12) : fromHsl(h, s * 0.5, 0.94);
  return tries.sort((a, b) => Math.abs(luminance(a) - luminance(bg)) - Math.abs(luminance(b) - luminance(bg)))[0];
}

/* ------------------------------------------------------------------ 간판 색 추천 (F26-i · 2026-09-26) */

export const READ_GOOD = 4.5;
export const READ_OK = 3;
export const readLabel = (r: number) => (r >= READ_GOOD ? "잘 읽힘" : r >= READ_OK ? "큰 글자면 읽힘" : "대비 부족");

/** 먹 · 따뜻한 유백 — 간판 판·글자의 기본 무채색(레퍼런스 현판·세로 판의 두 색) */
export const INK = "#1b1d1c";
export const MILK = "#f4f1ea";

/**
 * 간판 색 추천 하나. 🔴 **색은 2~3개까지**입니다 — 바탕(판, 없으면 건물 벽) · 글자 · 포인트(선택).
 * 근거: 한국 가게 전면 레퍼런스 20장의 공통점 «색은 1~2개이고 건물에서 뽑는다»(2026-09-26 `/research`).
 */
export type Rec = {
  key: "tone" | "hyeonpan" | "onecolor";
  label: string;
  why: string;
  /** 간판이 붙을 건물 벽 색(사진에서 가장 넓은 색) */
  wall: string;
  /** 판 색 — 없으면 판 없이 벽에 글자만 */
  plate?: string;
  face: string;
  /** 포인트 — 판 테두리·보조 줄에 조금만 */
  point?: string;
  /** 글자와 그 바탕(판 또는 벽)의 대비 */
  ratio: number;
  /** 가장 먼저 권하는 안 */
  best?: boolean;
};

/** 같은 색상(色相)을 두고 밝기만 옮겨 `bg` 와 대비 `target` 을 맞춤 — 포인트 색을 판 위에서도 보이게 */
function fitContrast(color: string, bg: string, target: number): string {
  if (contrast(color, bg) >= target) return color;
  const [h, s, l] = toHsl(hexRgb(color));
  const dir = luminance(bg) > 0.35 ? -1 : 1;
  for (let k = 1; k <= 40; k++) {
    const L = l + dir * k * 0.025;
    if (L < 0.04 || L > 0.97) break;
    const c = fromHsl(h, s, L);
    if (contrast(c, bg) >= target) return c;
  }
  return dir < 0 ? INK : MILK;
}

const labC = (hex: string) => {
  const l = toLab(hexRgb(hex));
  return Math.hypot(l[1], l[2]);
};

/**
 * 건물 색(넓은 순) → 간판 색 추천 셋. 레퍼런스에서 본 세 결을 그대로 옮겼습니다:
 *   ① **톤온톤**(19 리틀넥) — 판 없이, 벽과 같은 색 계열의 글자. 건물과 한 벌로 보입니다.
 *   ② **현판형**(10 비담·07 창화당) — 먹 또는 유백 판에 반대 색 글자 + 건물에서 딴 포인트 한 색(테두리). 가장 잘 읽힙니다.
 *   ③ **한 색 판**(01 노란문약국) — 건물에서 가장 눈에 띄는 색 하나를 판 전체로, 글자는 먹/유백.
 * 🔴 **«추천» 표시는 대비(글자 ↔ 바탕)가 4.5 이상인 안 중 건물과 가장 한 벌인 것**입니다(톤온톤 → 한 색 판 → 현판 순).
 * 다 모자라면 현판형이 추천입니다(먹·유백은 어느 벽에서나 읽힘). 판단 기준이 규칙이라는 걸 화면에 적습니다(P6).
 */
export function recommend(pal: Swatch[]): Rec[] {
  if (!pal.length) return [];
  const sorted = [...pal].sort((a, b) => b.share - a.share);
  const wall = sorted[0].hex;
  const accentSw = sorted.filter((s) => labC(s.hex) >= 18 && s.hex !== wall).sort((a, b) => labC(b.hex) * Math.sqrt(b.share) - labC(a.hex) * Math.sqrt(a.share))[0];
  const accent = accentSw?.hex;
  const wallDark = luminance(wall) < 0.3;
  const out: Rec[] = [];

  // ① 톤온톤 — 판 없이
  const toneFace = toneOn(wall, READ_GOOD);
  out.push({
    key: "tone",
    label: "건물과 한 벌 (톤온톤)",
    why: `판 없이 벽(${colorName(wall)})과 같은 색 계열로 밝기만 달리한 글자. 간판이 건물 안에 머물러 정돈돼 보입니다.`,
    wall,
    face: toneFace,
    ratio: contrast(toneFace, wall),
  });

  // ② 현판형 — 먹/유백 판 + 포인트 테두리
  const plate2 = wallDark ? MILK : INK;
  const face2 = plate2 === INK ? MILK : INK;
  const point2 = accent ? fitContrast(accent, plate2, READ_OK) : undefined;
  out.push({
    key: "hyeonpan",
    label: `${plate2 === INK ? "먹" : "유백"} 판 + 건물 포인트`,
    why: `벽과 확실히 갈리는 ${plate2 === INK ? "먹" : "유백"} 판에 ${face2 === MILK ? "유백" : "먹"} 글자라 멀리서도 가장 잘 읽힙니다.${point2 ? ` 테두리는 건물의 ${colorName(accent!)}에서 땄습니다.` : ""}`,
    wall,
    plate: plate2,
    face: face2,
    point: point2,
    ratio: contrast(face2, plate2),
  });

  // ③ 한 색 판 — 건물에서 가장 눈에 띄는 색(없으면 벽 색을 한 단 진하게)
  const base3 = accent ?? toneOn(wall, 1.8);
  let plate3 = base3;
  if (contrast(plate3, wall) < 1.5) plate3 = fitContrast(base3, wall, 1.5);
  const face3 = contrast(MILK, plate3) >= contrast(INK, plate3) ? MILK : INK;
  out.push({
    key: "onecolor",
    label: accent ? `${colorName(accent)} 한 색 판` : "벽보다 한 단 진한 판",
    why: accent
      ? `건물에서 가장 눈에 띄는 ${colorName(accent)}을 판 전체에 — 한 색으로 끝내는 간판입니다. 글자는 ${face3 === MILK ? "유백" : "먹"}.`
      : `건물에 눈에 띄는 색이 없어 벽 색을 한 단 진하게 판으로 — 튀지 않고 건물과 이어집니다.`,
    wall,
    plate: plate3,
    face: face3,
    ratio: contrast(face3, plate3),
  });

  const order: Rec["key"][] = ["tone", "onecolor", "hyeonpan"];
  const pick = order.map((k) => out.find((r) => r.key === k)!).find((r) => r.ratio >= READ_GOOD) ?? out.find((r) => r.key === "hyeonpan")!;
  pick.best = true;
  return [pick, ...out.filter((r) => r !== pick)];
}

/* ================================================================== 건물 색 찾기 — 사진 속 «자리» 로 고르기 (F26-h · 2026-09-26) */

/*
 * 🔴 **원리는 어도비 컬러 «이미지에서 테마 추출»을 직접 열어 보고 옮겼습니다**(2026-09-26, 크롬 — color.adobe.com/kr/create/image,
 * 샘플 «집» 사진). 거기서 본 것:
 *   ① 다섯 색은 **사진 속 실제 다섯 지점의 픽셀**이다 — 손잡이가 늘 그 자리에 서 있고, 끌면 그 자리 색으로 바뀐다.
 *   ② «색상 분위기»(화려한·밝은·차분한·깊은·어두운)를 바꾸면 **손잡이 자리가 통째로 바뀐다**(같은 사진, 다른 기준으로 다시 고름).
 *      실측: 화려한 → 하늘·풀·노랑 꽃·지붕 갈색·창 주황 / 어두운 → 벽 검정·짙은 풀 넷·흰 하늘.
 *   ③ 끄는 동안 손잡이가 **큰 원 돋보기**가 되고 가운데 작은 네모가 따는 자리를 가리킨다.
 * 쿨러스(coolors.co/image-picker)는 같은 구조에 **색 개수 ±** 가 있었습니다(그것도 옮김).
 * 여기에 «건물 색»(넓게 차지한 색 — 벽·지붕·창틀) 기준을 하나 더 두고 기본으로 씁니다 — 간판 색은 건물에서 뽑는다는 레퍼런스 20장의 결론 때문입니다.
 */

export type Mood = "area" | "vivid" | "bright" | "muted" | "deep" | "dark";

export const MOODS: { v: Mood; label: string; hint: string }[] = [
  { v: "area", label: "건물 색", hint: "넓게 차지한 색부터 — 벽·지붕·창틀" },
  { v: "vivid", label: "화려한", hint: "채도가 높은 색" },
  { v: "bright", label: "밝은", hint: "밝고 가벼운 색" },
  { v: "muted", label: "차분한", hint: "채도가 낮은 중간 밝기" },
  { v: "deep", label: "깊은", hint: "진하고 어두운 쪽의 색" },
  { v: "dark", label: "어두운", hint: "가장 어두운 색들" },
];

type Lab = [number, number, number];

/** sRGB → CIELAB (D65) — 색끼리의 «눈으로 본 거리»(ΔE)를 재려고 */
export function toLab([r, g, b]: RGB): Lab {
  const f = (v: number) => {
    v /= 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const R = f(r), G = f(g), B = f(b);
  const X = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047, Y = R * 0.2126 + G * 0.7152 + B * 0.0722, Z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
  const h = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = h(X), fy = h(Y), fz = h(Z);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}
const dE = (a: Lab, b: Lab) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/** 사진 속 한 자리 — `x`·`y` 는 사진 가로·세로에 대한 비율(0~1) */
export type Spot = { x: number; y: number; hex: string; share: number };

type Cell = { x: number; y: number; c: RGB; lab: Lab; vary: number; top: boolean; sky: boolean; /** 비중 — 사진 아래 15%(바닥·도로)는 낮춥니다 */ w: number };

/**
 * 후보 칸 — 사진을 가로 약 96칸으로 나눠 칸마다 평균색과 «고른 정도»(이웃 칸과의 ΔE)를 잽니다.
 * 고르게 칠해진 칸(벽 한가운데)을 좋아합니다 — 경계에 손잡이가 서면 반쯤 다른 색이 섞여 탁해집니다.
 */
function cells(img: ImageData): Cell[] {
  const { width: W, height: H, data } = img;
  const n = 96, cw = W / n, rows = Math.max(1, Math.round(H / cw)), ch = H / rows;
  const grid: (Cell | null)[][] = [];
  for (let j = 0; j < rows; j++) {
    const row: (Cell | null)[] = [];
    for (let i = 0; i < n; i++) {
      let r = 0, g = 0, b = 0, k = 0;
      const x0 = Math.floor(i * cw), x1 = Math.max(x0 + 1, Math.floor((i + 1) * cw)), y0 = Math.floor(j * ch), y1 = Math.max(y0 + 1, Math.floor((j + 1) * ch));
      for (let y = y0; y < y1; y += 2)
        for (let x = x0; x < x1; x += 2) {
          const p = (y * W + x) * 4;
          if (data[p + 3] < 128) continue;
          r += data[p];
          g += data[p + 1];
          b += data[p + 2];
          k++;
        }
      if (!k) {
        row.push(null);
        continue;
      }
      const c: RGB = [r / k, g / k, b / k];
      const y = (j + 0.5) / rows;
      row.push({ x: (i + 0.5) / n, y, c, lab: toLab(c), vary: 0, top: j < rows * 0.4, sky: false, w: y > 0.85 ? 0.35 : 1 });
    }
    grid.push(row);
  }
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < n; i++) {
      const c = grid[j][i];
      if (!c) continue;
      let s = 0, m = 0;
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const o = grid[j + dj]?.[i + di];
        if (o) {
          s += dE(c.lab, o.lab);
          m++;
        }
      }
      c.vary = m ? s / m : 0;
    }
  /*
   * 하늘 가려내기 — 🔴 **사진 위 가장자리에서 이어진 덩어리만** 하늘로 봅니다(2026-09-26 실측으로 고침).
   * 처음엔 «위쪽 40% 의 푸른색·아주 밝은 무채색»을 전부 뺐더니, 흰 타일 모퉁이 가게 사진에서 **위쪽 흰 타일 벽이 통째로
   * 하늘로 빠졌습니다**(한국에 흔한 흰 타일·흰 도장 건물이 다 걸림). 그래서 ① 밝은 무채색은 매끈할 때만(타일은 줄눈 때문에
   * 이웃 칸과 ΔE 가 큼) 후보로 두고 ② 맨 윗줄 후보에서 시작해 이웃 후보로 번져 닿는 칸만 하늘로 칩니다.
   */
  const cand = (c: Cell | null) => {
    if (!c || !c.top) return false;
    const [r, g, b] = c.c;
    const blue = b > r + 25 && b >= g;
    const pale = Math.min(r, g, b) > 205 && Math.max(r, g, b) - Math.min(r, g, b) < 18 && c.vary < 3.5;
    return blue || pale;
  };
  const queue: [number, number][] = [];
  for (let i = 0; i < n; i++) if (cand(grid[0][i])) queue.push([i, 0]);
  while (queue.length) {
    const [i, j] = queue.pop()!;
    const c = grid[j]?.[i];
    if (!c || c.sky || !cand(c)) continue;
    c.sky = true;
    queue.push([i + 1, j], [i - 1, j], [i, j + 1], [i, j - 1]);
  }
  return grid.flat().filter((c): c is Cell => !!c);
}

/** 사진에서 하늘로 보고 뺄 부분의 비율 — «하늘 N% 는 뺐습니다» 로 알립니다 */
export function skyShare(img: ImageData): number {
  const all = cells(img);
  return all.length ? all.filter((c) => c.sky).length / all.length : 0;
}

/** 분위기별 점수 (0~1) — 높을수록 그 분위기에 맞는 칸 */
function moodScore(m: Mood, lab: Lab): number {
  const L = lab[0] / 100, C = Math.min(1, Math.hypot(lab[1], lab[2]) / 90);
  switch (m) {
    case "vivid":
      return C;
    case "bright":
      return L * (0.55 + 0.45 * Math.min(1, C * 1.6));
    case "muted":
      return (1 - Math.min(1, Math.abs(C - 0.18) / 0.3)) * (1 - Math.abs(L - 0.58) / 0.58);
    case "deep":
      return C * (1 - Math.abs(L - 0.35) / 0.65);
    case "dark":
      return 1 - L;
    default:
      return 1;
  }
}

/**
 * 사진에서 `n` 자리를 고릅니다.
 *   «건물 색»: 칸들을 k-평균으로 묶어 **넓은 무리부터**, 무리마다 가운데 색에 가장 가깝고 고른 칸 하나.
 *   나머지 분위기: 점수 × «이미 고른 색과 떨어진 정도»(ΔE) × 고른 정도 가 가장 큰 칸을 하나씩(탐욕).
 *     서로 떨어뜨리지 않으면 «화려한» 다섯이 전부 같은 노랑 꽃에 몰립니다.
 * `noSky` 면 하늘로 보이는 칸(위쪽 40% 의 푸른·아주 밝은 무채색)을 뺍니다.
 */
export function pickSpots(img: ImageData, n: number, mood: Mood, noSky = true): Spot[] {
  const all = cells(img);
  const cs = noSky && all.some((c) => !c.sky) ? all.filter((c) => !c.sky) : all;
  if (!cs.length) return [];
  const flat = (c: Cell) => 1 / (1 + c.vary / 6);
  const total = cs.reduce((a, c) => a + c.w, 0);
  const share = (lab: Lab) => cs.reduce((a, c) => a + (dE(c.lab, lab) < 12 ? c.w : 0), 0) / total;
  const spot = (c: Cell): Spot => ({ x: c.x, y: c.y, hex: toHex(c.c), share: share(c.lab) });

  if (mood === "area") {
    const k = Math.min(cs.length, n + 4);
    let cent: Lab[] = [];
    // 씨앗: 가장 고른 칸부터, 그다음은 이미 고른 씨앗에서 가장 먼 칸 — 결정적 방식(같은 사진이면 같은 답)
    cent.push(cs.reduce((a, c) => (c.vary < a.vary ? c : a), cs[0]).lab);
    while (cent.length < k) {
      let best = cs[0], bd = -1;
      for (const c of cs) {
        const d = Math.min(...cent.map((q) => dE(c.lab, q)));
        if (d > bd) {
          bd = d;
          best = c;
        }
      }
      cent.push(best.lab);
    }
    let asg = new Int32Array(cs.length);
    for (let it = 0; it < 10; it++) {
      const sum = cent.map(() => [0, 0, 0, 0]);
      cs.forEach((c, i) => {
        let bi = 0, bv = Infinity;
        cent.forEach((q, j) => {
          const v = dE(c.lab, q);
          if (v < bv) {
            bv = v;
            bi = j;
          }
        });
        asg[i] = bi;
        sum[bi][0] += c.lab[0] * c.w;
        sum[bi][1] += c.lab[1] * c.w;
        sum[bi][2] += c.lab[2] * c.w;
        sum[bi][3] += c.w;
      });
      cent = sum.map((s, j) => (s[3] ? ([s[0] / s[3], s[1] / s[3], s[2] / s[3]] as Lab) : cent[j]));
    }
    // 무리 크기는 «비중 합» — 사진 아래 바닥·도로가 넓어도 건물 색보다 앞서지 않게
    const groups = cent
      .map((q, j) => {
        const members = cs.filter((_, i) => asg[i] === j);
        return { q, members, size: members.reduce((a, c) => a + c.w, 0) };
      })
      .filter((g) => g.members.length);
    asg = new Int32Array(0);
    groups.sort((a, b) => b.size - a.size);
    /*
     * 🔴 넓이 순으로만 고르면 거리 사진은 **회색 넷 + 갈색 하나**가 됩니다(2026-09-26 실측 — 흰 타일 모퉁이 가게: 가게의 얼굴인
     * 원목 문 주황이 빠짐). 디자이너가 건물에서 색을 뽑는 방식대로 ① 비슷한 색은 한 칸(ΔE 18 안이면 같은 색으로 봄)
     * ② 유채색 덩어리(Lab 채도 18↑ · 사진의 1.5%↑)가 있으면 **두 자리까지 포인트 색에 남깁니다** — 나머지는 넓은 색부터.
     */
    const repOf = (g: (typeof groups)[number]) => g.members.reduce((a, c) => (dE(c.lab, g.q) / flat(c) < dE(a.lab, g.q) / flat(a) ? c : a), g.members[0]);
    const chroma = (l: Lab) => Math.hypot(l[1], l[2]);
    const accents = groups.filter((g) => chroma(g.q) >= 18 && g.size / total >= 0.015);
    const reserve = Math.min(2, accents.length, n - 1);
    const picked: { c: Cell; size: number }[] = [];
    const tryPick = (g: (typeof groups)[number]) => {
      const rep = repOf(g);
      if (picked.some((p) => dE(p.c.lab, rep.lab) < 18)) return false;
      picked.push({ c: rep, size: g.size });
      return true;
    };
    for (const g of groups) {
      if (picked.length >= n - reserve) break;
      tryPick(g);
    }
    for (const g of accents) {
      if (picked.length >= n) break;
      tryPick(g);
    }
    for (const g of groups) {
      if (picked.length >= n) break;
      tryPick(g);
    }
    return picked.sort((a, b) => b.size - a.size).map((p) => ({ ...spot(p.c), share: p.size / total }));
  }

  const picked: Cell[] = [];
  while (picked.length < n) {
    let best: Cell | null = null, bv = -1;
    for (const c of cs) {
      const far = picked.length ? Math.min(...picked.map((p) => dE(p.lab, c.lab))) : 40;
      const v = moodScore(mood, c.lab) * (1 - Math.exp(-far / 14)) * flat(c) * c.w;
      if (v > bv) {
        bv = v;
        best = c;
      }
    }
    if (!best || bv <= 0) break;
    picked.push(best);
  }
  return picked.map(spot);
}

/** 한 자리의 색 — 가운데 (2r+1)² 픽셀 평균(어도비 돋보기의 «가운데 네모»와 같은 생각). `x`·`y` 는 비율 */
export function sampleAt(img: ImageData, x: number, y: number, r = 2): string {
  const { width: W, height: H, data } = img;
  const cx = Math.round(x * (W - 1)), cy = Math.round(y * (H - 1));
  let R = 0, G = 0, B = 0, k = 0;
  for (let j = -r; j <= r; j++)
    for (let i = -r; i <= r; i++) {
      const px = Math.min(W - 1, Math.max(0, cx + i)), py = Math.min(H - 1, Math.max(0, cy + j));
      const p = (py * W + px) * 4;
      R += data[p];
      G += data[p + 1];
      B += data[p + 2];
      k++;
    }
  return toHex([R / k, G / k, B / k]);
}

/** 사진 안에서 이 색과 가까운(ΔE 12 안) 칸의 비율 — 손잡이를 끌어 색이 바뀌면 다시 잽니다 */
export function shareOf(img: ImageData, hex: string, noSky = true): number {
  const all = cells(img);
  const cs = noSky && all.some((c) => !c.sky) ? all.filter((c) => !c.sky) : all;
  const lab = toLab(hexRgb(hex));
  const total = cs.reduce((a, c) => a + c.w, 0);
  return total ? cs.reduce((a, c) => a + (dE(c.lab, lab) < 12 ? c.w : 0), 0) / total : 0;
}

/**
 * 색 이름 — **KS 계통색 이름(수식어 + 기본색)을 흉내 낸 어림**입니다(«밝은 회색», «탁한 주황», «어두운 갈색»).
 * 🔴 표준 색표에서 찾은 값이 아닙니다 — 화면에도 «어림»으로 적습니다. 도료·시트 번호는 견본으로 정합니다.
 */
export function colorName(hex: string): string {
  const lab = toLab(hexRgb(hex));
  const L = lab[0], C = Math.hypot(lab[1], lab[2]);
  const [h, , l] = toHsl(hexRgb(hex));
  if (C < 7) return L > 92 ? "흰색" : L > 72 ? "밝은 회색" : L > 45 ? "회색" : L > 22 ? "어두운 회색" : "검정";
  let base: string;
  if ((h >= 15 && h < 50 && L < 52) || ((h < 15 || h >= 345) && L < 38 && C < 45)) base = "갈색";
  else if (h < 15 || h >= 345) base = l > 0.72 ? "분홍" : "빨강";
  else if (h < 40) base = "주황";
  else if (h < 65) base = L < 60 && C < 40 ? "황토" : "노랑";
  else if (h < 90) base = "연두";
  else if (h < 150) base = "초록";
  else if (h < 190) base = "청록";
  else if (h < 235) base = "파랑";
  else if (h < 260) base = "남색";
  else if (h < 290) base = "보라";
  else if (h < 330) base = "자주";
  else base = "분홍";
  const mod = C < 22 ? (L > 70 ? "흐린" : L < 35 ? "어두운 회" : "탁한") : L > 78 ? "연한" : L < 32 ? "어두운" : C > 60 ? "선명한" : L > 62 ? "밝은" : "";
  return mod ? `${mod} ${base}`.replace("어두운 회 ", "어두운 회") : base;
}
