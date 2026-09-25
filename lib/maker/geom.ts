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
