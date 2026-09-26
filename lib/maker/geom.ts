/**
 * 메이커 좌표 변형 — 경로 문자열을 점 단위로 옮깁니다 (F26 · 2026-09-25).
 *
 * 회전·글자별 이동·**4점 원근(포토샵의 «왜곡»)** 을 전부 «경로의 좌표를 직접 바꾸는» 방식으로 합니다.
 * SVG 에는 원근 변형(transform)이 없어서입니다. 곡선은 제어점까지 같이 옮기므로 원근이 강하면 곡선이
 * 살짝 휘는 오차가 있습니다(간판 한 장을 벽면에 맞춰 보는 용도로는 눈에 안 띕니다).
 *
 * 🔴 **제작 판정·제작용 SVG 는 원근·회전을 «안 먹인» 모양으로 합니다** — 비스듬해 보이는 건 사진 탓이지
 * 글자가 비스듬하게 만들어지는 게 아닙니다.
 */
import type { Pt } from "@/lib/maker/trace";

export type { Pt };

/** 우리 쪽에서 만드는 경로는 절대 좌표 M·L·C·Q·Z 뿐입니다(opentype.js · trace.ts 출력). */
export function mapPath(d: string, f: (p: Pt) => Pt): string {
  const tok = d.match(/[MLCQZ]|-?\d*\.?\d+(?:e-?\d+)?/gi) ?? [];
  let out = "";
  let i = 0;
  const n = (v: number) => (Math.round(v * 100) / 100).toString();
  const pt = () => {
    const p = f([Number(tok[i]), Number(tok[i + 1])]);
    i += 2;
    return `${n(p[0])},${n(p[1])}`;
  };
  while (i < tok.length) {
    const c = tok[i++].toUpperCase();
    if (c === "M" || c === "L") out += c + pt();
    else if (c === "C") out += `C${pt()} ${pt()} ${pt()}`;
    else if (c === "Q") out += `Q${pt()} ${pt()}`;
    else if (c === "Z") out += "Z";
  }
  return out;
}

export function pathBox(d: string) {
  const nums = (d.match(/-?\d*\.?\d+(?:e-?\d+)?/gi) ?? []).map(Number);
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i + 1 < nums.length; i += 2) {
    x0 = Math.min(x0, nums[i]); x1 = Math.max(x1, nums[i]);
    y0 = Math.min(y0, nums[i + 1]); y1 = Math.max(y1, nums[i + 1]);
  }
  return { x0, y0, w: x1 - x0, h: y1 - y0 };
}

/** 2×3 아핀: [a b c d e f] → x' = a x + c y + e, y' = b x + d y + f */
export type Affine = [number, number, number, number, number, number];
export const I: Affine = [1, 0, 0, 1, 0, 0];
export const apply = (m: Affine, p: Pt): Pt => [m[0] * p[0] + m[2] * p[1] + m[4], m[1] * p[0] + m[3] * p[1] + m[5]];
export const mul = (a: Affine, b: Affine): Affine => [
  a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1],
  a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3],
  a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5],
];
export const translate = (x: number, y: number): Affine => [1, 0, 0, 1, x, y];
export const scaleAt = (s: number, cx: number, cy: number): Affine => [s, 0, 0, s, cx - s * cx, cy - s * cy];
export function rotateAt(deg: number, cx: number, cy: number): Affine {
  const r = (deg * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r);
  return [c, s, -s, c, cx - c * cx + s * cy, cy - s * cx - c * cy];
}

/**
 * 네 점 → 네 점 원근 변환(호모그래피). `src`·`dst` 는 왼위·오위·오아래·왼아래 순서.
 * 8×8 연립방정식을 가우스 소거로 풉니다.
 */
export function homography(src: Pt[], dst: Pt[]): (p: Pt) => Pt {
  const A: number[][] = [], b: number[] = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = src[i], [u, v] = dst[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v);
  }
  const h = solve(A, b);
  if (!h) return (p) => p;
  return ([x, y]) => {
    const w = h[6] * x + h[7] * y + 1;
    return [(h[0] * x + h[1] * y + h[2]) / w, (h[3] * x + h[4] * y + h[5]) / w];
  };
}

function solve(A: number[][], b: number[]): number[] | null {
  const n = b.length, M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (Math.abs(M[p][c]) < 1e-12) return null;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const k = M[r][c] / M[c][c];
      for (let j = c; j <= n; j++) M[r][j] -= k * M[c][j];
    }
  }
  return M.map((r, i) => r[n] / M[i][i]);
}

/* ================================================================ PRO — 가로·세로 따로 · 기울이기 (2026-09-26) */

/** 가로·세로를 따로 늘립니다(글자 «장평»·«세로 늘리기») */
export const scaleXYAt = (sx: number, sy: number, cx: number, cy: number): Affine => [sx, 0, 0, sy, cx - sx * cx, cy - sy * cy];

/** 가로 기울이기(°) — 윗부분이 오른쪽으로(양수). 이탤릭과 같은 방향입니다 */
export function skewXAt(deg: number, cy: number): Affine {
  const t = Math.tan((deg * Math.PI) / 180);
  return [1, 0, -t, 1, t * cy, 0];
}

/* ================================================================ PRO — 격자 왜곡(메쉬) */

/**
 * 격자 왜곡 — 상자 위에 `cols × rows` 칸 격자를 얹고, 격자점을 끌면 그 안의 모양이 따라 휩니다
 * (일러스트레이터 «엔벨로프 왜곡 → 메쉬로 만들기» 와 같은 생각). 칸 안은 쌍선형으로 섞습니다.
 * `off` 는 격자점마다의 이동량 — **상자 크기에 대한 비율**이라 글자 높이를 바꿔도 모양이 같이 따라갑니다.
 * 순서는 왼위부터 가로로: 점 (i, j) 는 `off[j * (cols + 1) + i]`.
 */
export type Mesh = { cols: number; rows: number; off: [number, number][] };
export type Box = { x0: number; y0: number; w: number; h: number };

export const meshNew = (n: number): Mesh => ({ cols: n, rows: n, off: Array.from({ length: (n + 1) * (n + 1) }, () => [0, 0] as [number, number]) });

/** 격자점 (i, j) 의 «움직인 뒤» 자리 */
export function meshNode(b: Box, m: Mesh, i: number, j: number): Pt {
  const o = m.off[j * (m.cols + 1) + i] ?? [0, 0];
  return [b.x0 + (i / m.cols) * b.w + o[0] * b.w, b.y0 + (j / m.rows) * b.h + o[1] * b.h];
}

export function meshIsFlat(m?: Mesh | null) {
  return !m || m.off.every((o) => !o[0] && !o[1]);
}

/** 상자 안(밖은 가장자리 칸을 늘려서)의 점을 격자 왜곡으로 옮기는 함수 */
export function meshMap(b: Box, m?: Mesh | null): (p: Pt) => Pt {
  if (!m || meshIsFlat(m) || b.w <= 0 || b.h <= 0) return (p) => p;
  return ([x, y]) => {
    const u = ((x - b.x0) / b.w) * m.cols, v = ((y - b.y0) / b.h) * m.rows;
    const i = Math.max(0, Math.min(m.cols - 1, Math.floor(u))), j = Math.max(0, Math.min(m.rows - 1, Math.floor(v)));
    const fu = u - i, fv = v - j;
    const a = meshNode(b, m, i, j), c = meshNode(b, m, i + 1, j), e = meshNode(b, m, i, j + 1), g = meshNode(b, m, i + 1, j + 1);
    return [
      (a[0] * (1 - fu) + c[0] * fu) * (1 - fv) + (e[0] * (1 - fu) + g[0] * fu) * fv,
      (a[1] * (1 - fu) + c[1] * fu) * (1 - fv) + (e[1] * (1 - fu) + g[1] * fu) * fv,
    ];
  };
}

/* ================================================================ PRO — 되짚기(역변환) */

/**
 * 어떤 매끄러운 변형 `f` 든 «화면에서 끈 자리 → 원래 좌표» 로 되짚습니다(뉴턴법, 야코비안은 차분).
 * 회전·원근(호모그래피)·격자 왜곡이 겹쳐 있어도 하나로 풉니다 — 변형마다 역함수를 따로 짜지 않습니다.
 */
export function invert(f: (p: Pt) => Pt, target: Pt, guess: Pt, iters = 10): Pt {
  let x: Pt = [guess[0], guess[1]];
  const e = 0.05;
  for (let k = 0; k < iters; k++) {
    const fx = f(x);
    const rx = target[0] - fx[0], ry = target[1] - fx[1];
    if (Math.abs(rx) + Math.abs(ry) < 1e-3) break;
    const fa = f([x[0] + e, x[1]]), fb = f([x[0], x[1] + e]);
    const a = (fa[0] - fx[0]) / e, b = (fb[0] - fx[0]) / e, c = (fa[1] - fx[1]) / e, d = (fb[1] - fx[1]) / e;
    const det = a * d - b * c;
    if (Math.abs(det) < 1e-12) break;
    x = [x[0] + (d * rx - b * ry) / det, x[1] + (-c * rx + a * ry) / det];
  }
  return x;
}

/* ================================================================ PRO — 점 편집 */

/** 경로 한 마디 — 우리 쪽 경로는 절대 좌표 M·L·C·Q·Z 뿐입니다(`mapPath` 와 같은 약속) */
export type Seg = { c: "M" | "L" | "C" | "Q" | "Z"; p: Pt[] };

export function parsePath(d: string): Seg[] {
  const tok = d.match(/[MLCQZ]|-?\d*\.?\d+(?:e-?\d+)?/gi) ?? [];
  const out: Seg[] = [];
  let i = 0;
  const pt = (): Pt => {
    const p: Pt = [Number(tok[i]), Number(tok[i + 1])];
    i += 2;
    return p;
  };
  while (i < tok.length) {
    const c = tok[i++].toUpperCase() as Seg["c"];
    if (c === "M" || c === "L") out.push({ c, p: [pt()] });
    else if (c === "C") out.push({ c, p: [pt(), pt(), pt()] });
    else if (c === "Q") out.push({ c, p: [pt(), pt()] });
    else if (c === "Z") out.push({ c, p: [] });
  }
  return out;
}

export function serializePath(segs: Seg[]): string {
  const n = (v: number) => (Math.round(v * 100) / 100).toString();
  return segs.map((s) => s.c + s.p.map((q) => `${n(q[0])},${n(q[1])}`).join(" ")).join("");
}

/** 편집할 수 있는 점 — `anchor` 는 선이 지나는 점(네모), 아니면 곡선을 당기는 조절점(동그라미) */
export type PathNode = { seg: number; pt: number; anchor: boolean };

export function nodesOf(segs: Seg[]): PathNode[] {
  const out: PathNode[] = [];
  segs.forEach((s, si) => s.p.forEach((_, pi) => out.push({ seg: si, pt: pi, anchor: pi === s.p.length - 1 })));
  return out;
}

/** 조절점과 그 점이 딸린 기준점을 잇는 선 (화면에 가는 선으로 그립니다) */
export function handleLines(segs: Seg[]): [Pt, Pt][] {
  const out: [Pt, Pt][] = [];
  let cur: Pt = [0, 0];
  for (const s of segs) {
    if (s.c === "C") out.push([cur, s.p[0]], [s.p[1], s.p[2]]);
    else if (s.c === "Q") out.push([cur, s.p[0]], [s.p[0], s.p[1]]);
    if (s.p.length) cur = s.p[s.p.length - 1];
  }
  return out;
}

/**
 * 기준점 하나를 끌 때 같이 움직일 점들 — 그 점에 붙은 조절점 둘(들어오는·나가는)과,
 * 같은 윤곽 안에서 **같은 자리에 겹친 기준점**(윤곽의 시작 M 과 마지막 점이 겹치는 글꼴이 많습니다).
 * 안 묶으면 시작점만 끌려가 윤곽이 찢어집니다.
 */
export function linkedNodes(segs: Seg[], node: PathNode): PathNode[] {
  if (!node.anchor) return [node];
  const at = segs[node.seg].p[node.pt];
  let s0 = node.seg;
  while (s0 > 0 && segs[s0].c !== "M") s0--;
  let s1 = node.seg + 1;
  while (s1 < segs.length && segs[s1].c !== "M") s1++;
  const out: PathNode[] = [];
  const seen = new Set<string>();
  const push = (n: PathNode) => {
    const k = `${n.seg}:${n.pt}`;
    if (!seen.has(k)) {
      seen.add(k);
      out.push(n);
    }
  };
  for (let si = s0; si < s1; si++) {
    const s = segs[si];
    if (!s.p.length) continue;
    const end = s.p[s.p.length - 1];
    if (Math.hypot(end[0] - at[0], end[1] - at[1]) > 0.01) continue;
    push({ seg: si, pt: s.p.length - 1, anchor: true });
    if (s.c === "C") push({ seg: si, pt: 1, anchor: false }); // 들어오는 조절점
    const nx = segs[si + 1];
    if (nx && nx.c === "C") push({ seg: si + 1, pt: 0, anchor: false }); // 나가는 조절점
  }
  return out;
}

/**
 * 점 나누기 — 모든 직선·곡선을 가운데서 반으로 잘라 **점을 두 배로** 만듭니다(모양은 그대로).
 * 사람 요청 *"글자 자체도 점으로 나눠서"* — 점이 모자라 원하는 곳을 못 휘게 할 때 누릅니다.
 */
export function subdivide(segs: Seg[]): Seg[] {
  const out: Seg[] = [];
  let cur: Pt = [0, 0], start: Pt = [0, 0];
  const mid = (a: Pt, b: Pt): Pt => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  for (const s of segs) {
    if (s.c === "M") {
      out.push(s);
      cur = start = s.p[0];
    } else if (s.c === "L") {
      out.push({ c: "L", p: [mid(cur, s.p[0])] }, s);
      cur = s.p[0];
    } else if (s.c === "C") {
      const [p1, p2, p3] = s.p;
      const a = mid(cur, p1), b = mid(p1, p2), c = mid(p2, p3), e = mid(a, b), f = mid(b, c), g = mid(e, f);
      out.push({ c: "C", p: [a, e, g] }, { c: "C", p: [f, c, p3] });
      cur = p3;
    } else if (s.c === "Q") {
      const [p1, p2] = s.p;
      const a = mid(cur, p1), b = mid(p1, p2), g = mid(a, b);
      out.push({ c: "Q", p: [a, g] }, { c: "Q", p: [b, p2] });
      cur = p2;
    } else {
      // 닫는 선(마지막 점 → 시작점)도 반으로 — 가운데에 점을 하나 넣고 닫습니다
      if (Math.hypot(cur[0] - start[0], cur[1] - start[1]) > 0.01) out.push({ c: "L", p: [mid(cur, start)] });
      out.push(s);
      cur = start;
    }
  }
  return out;
}

/* ================================================================ 판 모양 (2026-09-26) */

const KAPPA = 0.5523; // 사분원을 3차 곡선 하나로 그릴 때의 조절점 비율

/** 판 외곽 — 왼쪽 위가 0,0 인 mm. `mapPath` 가 읽을 수 있게 M·L·C·Z 만 씁니다(호 `A` 는 못 옮깁니다) */
export function platePath(shape: string, w: number, h: number): string {
  const f = (v: number) => (Math.round(v * 100) / 100).toString();
  const P = (x: number, y: number) => `${f(x)},${f(y)}`;
  const k = KAPPA;
  if (shape === "oval" || shape === "circle") {
    const rx = w / 2, ry = h / 2;
    return `M${P(rx, 0)}C${P(rx + rx * k, 0)} ${P(w, ry - ry * k)} ${P(w, ry)}C${P(w, ry + ry * k)} ${P(rx + rx * k, h)} ${P(rx, h)}C${P(rx - rx * k, h)} ${P(0, ry + ry * k)} ${P(0, ry)}C${P(0, ry - ry * k)} ${P(rx - rx * k, 0)} ${P(rx, 0)}Z`;
  }
  if (shape === "round") {
    const r = Math.min(w, h) * 0.18;
    return `M${P(r, 0)}L${P(w - r, 0)}C${P(w - r + r * k, 0)} ${P(w, r - r * k)} ${P(w, r)}L${P(w, h - r)}C${P(w, h - r + r * k)} ${P(w - r + r * k, h)} ${P(w - r, h)}L${P(r, h)}C${P(r - r * k, h)} ${P(0, h - r + r * k)} ${P(0, h - r)}L${P(0, r)}C${P(0, r - r * k)} ${P(r - r * k, 0)} ${P(r, 0)}Z`;
  }
  if (shape === "arch") {
    const rx = w / 2, ry = Math.min(h, w / 2);
    return `M${P(0, h)}L${P(0, ry)}C${P(0, ry - ry * k)} ${P(rx - rx * k, 0)} ${P(rx, 0)}C${P(rx + rx * k, 0)} ${P(w, ry - ry * k)} ${P(w, ry)}L${P(w, h)}Z`;
  }
  return `M${P(0, 0)}L${P(w, 0)}L${P(w, h)}L${P(0, h)}Z`;
}

/** 직사각형 하나를 경로로 (판을 다는 철물을 그릴 때) */
export const rectPath = (x: number, y: number, w: number, h: number) => `M${x},${y}L${x + w},${y}L${x + w},${y + h}L${x},${y + h}Z`;
