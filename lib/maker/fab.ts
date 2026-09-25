/**
 * 「이 간판이 만들어지나」 판정 — 최소 획·최소 속공간·잔조각 (수산나 메이커, F26 · 2026-09-25).
 *
 * 🔴 **자가 새것이 아닙니다.** `STARTUP/font-ai/code/letter_svg.py` 의 `fab_check()` 를 옮겼고,
 * 2026-09-25 조사에서 같은 이미지로 **획 폭이 파이썬과 소수 둘째 자리까지 같게**(122.16 / 19.12mm)
 * 나온 방식입니다. 속공간은 OpenCV 의 근사 거리변환과 1.8% 차이가 납니다(여기가 정확한 쪽).
 *
 * 방법: 벡터를 알려진 mm/px 로 캔버스에 칠함 → 정확 거리변환(Felzenszwalb) → Zhang–Suen 세선화
 *       → 이웃이 둘 이상인 골격점의 거리 **하위 10% × 2** = 획 폭
 *       (최솟값이 아닌 이유: 끝점·잡티가 최솟값을 끌어내립니다 — 원본 주석 그대로)
 *
 * 판정 문턱은 `config/maker.ts` 의 `FAB` 한 곳에 있습니다 — 여기 숫자를 박지 마세요 [A5].
 */

export type FabResult = {
  /** 최소 획 (mm) */
  strokeMm: number;
  /** 가장 좁은 글자 속공간 (mm). 구멍이 없으면 null */
  minHoleMm: number | null;
  /** 떨어진 조각 수 */
  pieces: number;
  /** 20×20mm 미만 조각 — 따로 오려 붙일 수 없는 잡티 */
  specks: number;
  /** 잰 해상도 (mm/px) — 결과를 읽을 때 오차 감각 */
  mmPerPx: number;
};

/** 1차원 정확 거리변환 (Felzenszwalb & Huttenlocher) — 제곱 거리 */
function edt1d(f: Float64Array, n: number, d: Float64Array, v: Int32Array, z: Float64Array) {
  let k = 0;
  v[0] = 0;
  z[0] = -Infinity;
  z[1] = Infinity;
  for (let q = 1; q < n; q++) {
    let s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (s <= z[k]) {
      k--;
      s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    }
    k++;
    v[k] = q;
    z[k] = s;
    z[k + 1] = Infinity;
  }
  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) k++;
    d[q] = (q - v[k]) ** 2 + f[v[k]];
  }
}

/** 칠해진 칸(1)에서 가장 가까운 빈 칸(0)까지의 유클리드 거리 */
function distanceTransform(mask: Uint8Array, w: number, h: number): Float32Array {
  const INF = 1e20, n = Math.max(w, h);
  const f = new Float64Array(n), d = new Float64Array(n), v = new Int32Array(n), z = new Float64Array(n + 1);
  const g = new Float64Array(w * h);
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) f[y] = mask[y * w + x] ? INF : 0;
    edt1d(f, h, d, v, z);
    for (let y = 0; y < h; y++) g[y * w + x] = d[y];
  }
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) f[x] = g[y * w + x];
    edt1d(f, w, d, v, z);
    for (let x = 0; x < w; x++) out[y * w + x] = Math.sqrt(d[x]);
  }
  return out;
}

/** Zhang–Suen 세선화 (OpenCV ximgproc.thinning 기본값과 같은 방식) */
function thin(src: Uint8Array, w: number, h: number): Uint8Array {
  const m = src.slice();
  const del: number[] = [];
  let changed = true;
  while (changed) {
    changed = false;
    for (let pass = 0; pass < 2; pass++) {
      del.length = 0;
      for (let y = 1; y < h - 1; y++)
        for (let x = 1; x < w - 1; x++) {
          const i = y * w + x;
          if (!m[i]) continue;
          const p2 = m[i - w], p3 = m[i - w + 1], p4 = m[i + 1], p5 = m[i + w + 1];
          const p6 = m[i + w], p7 = m[i + w - 1], p8 = m[i - 1], p9 = m[i - w - 1];
          const B = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9;
          if (B < 2 || B > 6) continue;
          const seq = [p2, p3, p4, p5, p6, p7, p8, p9, p2];
          let A = 0;
          for (let k = 0; k < 8; k++) if (!seq[k] && seq[k + 1]) A++;
          if (A !== 1) continue;
          if (pass === 0 ? p2 * p4 * p6 || p4 * p6 * p8 : p2 * p4 * p8 || p2 * p6 * p8) continue;
          del.push(i);
        }
      if (del.length) {
        changed = true;
        for (const i of del) m[i] = 0;
      }
    }
  }
  return m;
}

/** 연결 요소 라벨 (8방향). 반환: 라벨 배열(0=배경), 개수, 크기 */
function label(mask: Uint8Array, w: number, h: number, want: 0 | 1) {
  const lab = new Int32Array(w * h);
  const sizes: number[] = [0];
  const stack: number[] = [];
  let n = 0;
  for (let s = 0; s < w * h; s++) {
    if (mask[s] !== want || lab[s]) continue;
    n++;
    let size = 0;
    lab[s] = n;
    stack.push(s);
    while (stack.length) {
      const i = stack.pop()!;
      size++;
      const x = i % w, y = (i / w) | 0;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const j = ny * w + nx;
          if (mask[j] === want && !lab[j]) {
            lab[j] = n;
            stack.push(j);
          }
        }
    }
    sizes.push(size);
  }
  return { lab, n, sizes };
}

/**
 * 판정 본체.
 *
 * @param d          SVG path d (evenodd)
 * @param box        그 path 의 bbox (path 좌표 단위)
 * @param mmPerUnit  path 좌표 한 칸이 몇 mm 인가. 글자는 이미 mm 라 1, 로고는 원본 픽셀이라 «폭mm ÷ 폭px»
 * @param maxPx      긴 변을 이 픽셀 수로 칠합니다. 1600 이면 3m 간판에서 약 1.9mm/px 입니다.
 */
export function fabCheck(
  d: string,
  box: { x0: number; y0: number; w: number; h: number },
  mmPerUnit = 1,
  maxPx = 1600,
): FabResult | null {
  if (typeof document === "undefined" || !d || box.w <= 0 || box.h <= 0) return null;
  const unitPerPx = Math.max(box.w, box.h) / maxPx;
  const mmPerPx = unitPerPx * mmPerUnit;
  const pad = 4;
  const w = Math.ceil(box.w / unitPerPx) + pad * 2, h = Math.ceil(box.h / unitPerPx) + pad * 2;

  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.fillStyle = "#000";
  ctx.setTransform(1 / unitPerPx, 0, 0, 1 / unitPerPx, pad - box.x0 / unitPerPx, pad - box.y0 / unitPerPx);
  ctx.fill(new Path2D(d), "evenodd");

  const px = ctx.getImageData(0, 0, w, h).data;
  const a = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) a[i] = px[i * 4 + 3] > 127 ? 1 : 0;

  const dist = distanceTransform(a, w, h);
  const sk = thin(a, w, h);
  const core: number[] = [], all: number[] = [];
  for (let y = 1; y < h - 1; y++)
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      if (!sk[i]) continue;
      all.push(dist[i]);
      const nb = sk[i - w - 1] + sk[i - w] + sk[i - w + 1] + sk[i - 1] + sk[i + 1] + sk[i + w - 1] + sk[i + w] + sk[i + w + 1];
      if (nb >= 2) core.push(dist[i]);
    }
  const vals = (core.length > 20 ? core : all).sort((p, q) => p - q);
  const p10 = vals.length ? vals[Math.floor(vals.length * 0.1)] : 0;
  const strokeMm = p10 * 2 * mmPerPx;

  // 속공간: 가장자리에 안 닿는 빈 칸 덩이(= 구멍)마다 내부 거리 최댓값 × 2
  const inv = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) inv[i] = a[i] ? 0 : 1;
  const holes = label(inv, w, h, 1);
  const border = new Set<number>();
  for (let x = 0; x < w; x++) { border.add(holes.lab[x]); border.add(holes.lab[(h - 1) * w + x]); }
  for (let y = 0; y < h; y++) { border.add(holes.lab[y * w]); border.add(holes.lab[y * w + w - 1]); }
  const invDist = distanceTransform(inv, w, h);
  const holeMax = new Float32Array(holes.n + 1);
  for (let i = 0; i < w * h; i++) {
    const l = holes.lab[i];
    if (l && !border.has(l) && invDist[i] > holeMax[l]) holeMax[l] = invDist[i];
  }
  let minHole = Infinity;
  for (let l = 1; l <= holes.n; l++) if (!border.has(l) && holeMax[l] > 0) minHole = Math.min(minHole, holeMax[l]);

  const parts = label(a, w, h, 1);
  const pxArea = mmPerPx * mmPerPx;
  let specks = 0;
  for (let l = 1; l <= parts.n; l++) if (parts.sizes[l] * pxArea < 400) specks++;

  return {
    strokeMm,
    minHoleMm: Number.isFinite(minHole) ? minHole * 2 * mmPerPx : null,
    pieces: parts.n,
    specks,
    mmPerPx,
  };
}
