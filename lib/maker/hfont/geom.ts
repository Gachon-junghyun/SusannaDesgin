/** HWGeom: CONTRACT v2 nodes [x,y,ix,iy,ox,oy,s], y down; outer winding positive.
 * Removed prototype traceGray/blur/relax: use ../trace.ts traceGray (vclean marching squares).
 * Existing maker PRO uses SVG segments, not relative-handle node arrays; keep this adapter for stage 1.
 * Small vector operations are local: ../geom.ts exports affine operations, no add/sub/dot/lerp helpers.
 * ClipperLib and getStroke remain injected. No runtime clipper/freehand import.
 */
import { apply } from '../geom.ts';
import type { Affine } from '../geom.ts';
import type { Frame, TTContour } from './engine.ts';
import type ClipperLib from 'clipper-lib';
import type { PathCommand } from 'opentype.js';
export type { PathCommand } from 'opentype.js';
export type Point = number[]; // accepts anchors, TT points and pressure samples; operations use x/y only
export type Node = [number,number,number,number,number,number,number]; // exactly [x,y,ix,iy,ox,oy,s] at the v2 storage boundary
export interface Contour { n: Node[] }
export type Cubic = [Point, Point, Point, Point];
export type Polygon = Point[];
export interface StrokeOptions {size: number; stabilize?: number; straight?: boolean; pressure?: boolean; thinning?: number}
export type GetStroke = (points: number[][], options: {size: number; thinning: number; smoothing: number; streamline: number; simulatePressure: boolean; last: boolean; start: {cap: boolean; taper: number}; end: {cap: boolean; taper: number}}) => number[][];
type CL = typeof ClipperLib;
const EPS = 1e-9;
export function add(a: Point, b: Point): Point { return [a[0] + b[0], a[1] + b[1]]; }
export function sub(a: Point, b: Point): Point { return [a[0] - b[0], a[1] - b[1]]; }
export function mul(a: Point, s: number): Point { return [a[0] * s, a[1] * s]; }
export function dot(a: Point, b: Point): number { return a[0] * b[0] + a[1] * b[1]; }
export function len(a: Point): number { return Math.hypot(a[0], a[1]); }
export function dist(a: Point, b: Point): number { return Math.hypot(a[0] - b[0], a[1] - b[1]); }
export function norm(a: Point): Point { const l = len(a); return l > EPS ? [a[0] / l, a[1] / l] : [0, 0]; }
export function lerp(a: Point, b: Point, t: number): Point { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; }
export function clone(c: Contour): Contour { return { n: c.n.map(function (p) { return p.slice() as Node; }) }; }
export function cloneAll(cs: Contour[]): Contour[] { return (cs || []).map(clone); }

/* ---------- 베지어 ---------- */
export function segment(c: Contour, i: number): Cubic {
  const n = c.n, a = n[i], b = n[(i + 1) % n.length];
  return [[a[0], a[1]], [a[0] + a[4], a[1] + a[5]], [b[0] + b[2], b[1] + b[3]], [b[0], b[1]]];
}
export function isLineSeg(s: Cubic): boolean { return dist(s[0], s[1]) < 1e-7 && dist(s[2], s[3]) < 1e-7; }
export function bez(s: Cubic, t: number): Point {
  const mt = 1 - t, a = mt * mt * mt, b = 3 * mt * mt * t, c = 3 * mt * t * t, d = t * t * t;
  return [a * s[0][0] + b * s[1][0] + c * s[2][0] + d * s[3][0], a * s[0][1] + b * s[1][1] + c * s[2][1] + d * s[3][1]];
}
function bezD(s: Cubic, t: number): Point {
  const mt = 1 - t;
  const d0 = mul(sub(s[1], s[0]), 3 * mt * mt), d1 = mul(sub(s[2], s[1]), 6 * mt * t), d2 = mul(sub(s[3], s[2]), 3 * t * t);
  return add(add(d0, d1), d2);
}
function bezDD(s: Cubic, t: number): Point {
  const a = add(sub(s[2], mul(s[1], 2)), s[0]), b = add(sub(s[3], mul(s[2], 2)), s[1]);
  return add(mul(a, 6 * (1 - t)), mul(b, 6 * t));
}
export function splitBez(s: Cubic, t: number): [Cubic, Cubic] {
  const p01 = lerp(s[0], s[1], t), p12 = lerp(s[1], s[2], t), p23 = lerp(s[2], s[3], t);
  const p012 = lerp(p01, p12, t), p123 = lerp(p12, p23, t), m = lerp(p012, p123, t);
  return [[s[0], p01, p012, m], [m, p123, p23, s[3]]];
}
export function tangentAt(s: Cubic, t: number): Point {
  let d = bezD(s, t);
  if (len(d) < 1e-7) d = sub(s[3], s[0]);
  return norm(d);
}
function flatness(s: Cubic): number {
  const d = sub(s[3], s[0]), l = len(d);
  if (l < EPS) return Math.max(dist(s[1], s[0]), dist(s[2], s[0]));
  const nx = -d[1] / l; const ny = d[0] / l; let worst = 0;
  [s[1], s[2]].forEach(function (p) {
    const v = sub(p, s[0]), along = dot(v, d) / l;
    worst = Math.max(worst, Math.abs(v[0] * nx + v[1] * ny), -along, along - l);
  });
  return worst;
}
function flatSeg(s: Cubic, tol: number, out: Polygon, depth: number): void {
  if (depth > 14 || flatness(s) <= tol) { out.push(s[3]); return; }
  const h = splitBez(s, 0.5);
  flatSeg(h[0], tol, out, depth + 1); flatSeg(h[1], tol, out, depth + 1);
}
/** 닫힌 윤곽 → 다각형 점 목록(마지막 점 = 첫 점 아님). */
export function flatten(c: Contour, tol = 0.5): Polygon {
  const out = [[c.n[0][0], c.n[0][1]]];
  for (let i = 0; i < c.n.length; i++) {
    const s = segment(c, i);
    if (isLineSeg(s)) out.push(s[3]); else flatSeg(s, tol || 0.5, out, 0);
  }
  out.pop();
  return out;
}
export function flattenAll(cs: Contour[], tol: number): Polygon[] { return cs.map(function (c) { return flatten(c, tol); }).filter(function (p) { return p.length >= 3; }); }

/* ---------- 다각형 ---------- */
export function area(poly: Polygon): number {
  let s = 0;
  for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length]; s += a[0] * b[1] - b[0] * a[1]; }
  return s / 2;
}
export function contains(poly: Polygon, p: Point): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  return inside;
}
function dedupe(pts: Polygon, closed: boolean): Polygon {
  const out: Polygon = [];
  pts.forEach(function (p) { if (!out.length || dist(out[out.length - 1], p) > 1e-6) out.push([p[0], p[1]]); });
  if (closed) while (out.length > 1 && dist(out[0], out[out.length - 1]) <= 1e-6) out.pop();
  return out;
}
/** 겹침 깊이로 바깥(짝수)과 구멍(홀수)을 가려 방향을 CONTRACT §2 에 맞춘다. */
export function orient(polys: Polygon[]): Polygon[] {
  return polys.map(function (p, i) {
    const probe = p[0]; let depth = 0;
    polys.forEach(function (q, j) { if (i !== j && contains(q, probe)) depth++; });
    const a = area(p);
    return (depth % 2 === 0) === (a > 0) ? p : p.slice().reverse();
  });
}
export function contourArea(c: Contour): number { return area(flatten(c, 1)); }
export function orientContours(cs: Contour[]): Contour[] {
  const polys = cs.map(function (c) { return flatten(c, 1); });
  return cs.map(function (c, i) {
    let depth = 0; const probe = polys[i][0];
    polys.forEach(function (q, j) { if (i !== j && contains(q, probe)) depth++; });
    return (depth % 2 === 0) === (area(polys[i]) > 0) ? c : reverseContour(c);
  });
}
export function reverseContour(c: Contour): Contour {
  const n = c.n.slice().reverse().map<Node>(function (p) { return [p[0], p[1], p[4], p[5], p[2], p[3], p[6]]; });
  return { n: n };
}
/** 이동평균으로 손떨림을 줄인다(끝점은 그대로). */
export function smoothPoints(pts: Polygon, win: number): Polygon {
  if (win < 1 || pts.length < 3) return pts;
  return pts.map(function (p, i) {
    if (i === 0 || i === pts.length - 1) return p;
    let sx = 0; let sy = 0; let sp = 0; let n = 0;
    for (let k = Math.max(0, i - win); k <= Math.min(pts.length - 1, i + win); k++) { sx += pts[k][0]; sy += pts[k][1]; sp += (pts[k][2] == null ? 0.5 : pts[k][2]); n++; }
    return [sx / n, sy / n, sp / n];
  });
}
/** 거의 곧은 획이면 두 점으로 바꾼다. */
export function straighten(pts: Polygon, ratio: number): Polygon {
  if (pts.length < 3) return pts;
  const a = pts[0], b = pts[pts.length - 1], d = sub(b, a), l = len(d);
  if (l < 25) return pts;
  const nx = -d[1] / l; const ny = d[0] / l; let worst = 0; let pr = 0;
  pts.forEach(function (p) { worst = Math.max(worst, Math.abs((p[0] - a[0]) * nx + (p[1] - a[1]) * ny)); pr += (p[2] == null ? 0.5 : p[2]); });
  if (worst > l * (ratio || 0.035)) return pts;
  pr /= pts.length;
  const out: Polygon = [];
  for (let i = 0; i <= 8; i++) { const q = lerp(a, b, i / 8); out.push([q[0], q[1], pr]); }
  return out;
}

/* ---------- 곡선 맞추기 (Schneider 1990) ---------- */
function chordParam(pts: Polygon): number[] {
  const u = [0];
  for (let i = 1; i < pts.length; i++) u.push(u[i - 1] + dist(pts[i], pts[i - 1]));
  const total = u[u.length - 1] || 1;
  return u.map(function (v) { return v / total; });
}
function generateBezier(pts: Polygon, u: number[], t1: Point, t2: Point): Cubic {
  const first = pts[0]; const last = pts[pts.length - 1]; let c00 = 0; let c01 = 0; let c11 = 0; let x0 = 0; let x1 = 0;
  for (let i = 0; i < pts.length; i++) {
    const t = u[i], mt = 1 - t, b0 = mt * mt * mt, b1 = 3 * t * mt * mt, b2 = 3 * t * t * mt, b3 = t * t * t;
    const A1 = mul(t1, b1), A2 = mul(t2, b2);
    c00 += dot(A1, A1); c01 += dot(A1, A2); c11 += dot(A2, A2);
    const tmp = sub(pts[i], add(mul(first, b0 + b1), mul(last, b2 + b3)));
    x0 += dot(A1, tmp); x1 += dot(A2, tmp);
  }
  const det = c00 * c11 - c01 * c01; let a1 = 0; let a2 = 0;
  if (Math.abs(det) > 1e-12) { a1 = (x0 * c11 - x1 * c01) / det; a2 = (c00 * x1 - c01 * x0) / det; }
  const segLen = dist(first, last), eps = 1e-6 * segLen;
  if (a1 < eps || a2 < eps || a1 > segLen * 3 || a2 > segLen * 3) { a1 = a2 = segLen / 3; }
  return [first, add(first, mul(t1, a1)), add(last, mul(t2, a2)), last];
}
function maxError(pts: Polygon, s: Cubic, u: number[]): {err: number; index: number} {
  let worst = 0; let idx = Math.floor(pts.length / 2);
  for (let i = 1; i < pts.length - 1; i++) {
    const d = dist(bez(s, u[i]), pts[i]);
    if (d >= worst) { worst = d; idx = i; }
  }
  return { err: worst, index: idx };
}
function reparam(s: Cubic, pts: Polygon, u: number[]): number[] {
  return u.map(function (t, i) {
    const q = sub(bez(s, t), pts[i]), d1 = bezD(s, t), d2 = bezD2(s, t);
    const den = dot(d1, d1) + dot(q, d2);
    if (Math.abs(den) < EPS) return t;
    const nt = t - dot(q, d1) / den;
    return Math.min(1, Math.max(0, nt));
  });
}
function bezD2(s: Cubic, t: number): Point { return bezDD(s, t); }
export function fitCubic(pts: Polygon, t1: Point, t2: Point, err: number, depth = 0): Cubic[] {
  if (pts.length === 2 || depth > 24) {
    const d = dist(pts[0], pts[pts.length - 1]) / 3;
    return [[pts[0], add(pts[0], mul(t1, d)), add(pts[pts.length - 1], mul(t2, d)), pts[pts.length - 1]]];
  }
  let u = chordParam(pts); let s = generateBezier(pts, u, t1, t2); let r = maxError(pts, s, u);
  if (r.err < err) return [s];
  if (r.err < err * 4) {
    for (let k = 0; k < 16; k++) {
      u = reparam(s, pts, u); s = generateBezier(pts, u, t1, t2); r = maxError(pts, s, u);
      if (r.err < err) return [s];
    }
  }
  const c = Math.min(Math.max(r.index, 1), pts.length - 2);
  let tc = norm(sub(pts[c - 1], pts[c + 1]));
  if (len(tc) < 0.5) tc = norm(sub(pts[c - 1], pts[c]));
  return fitCubic(pts.slice(0, c + 1), t1, tc, err, (depth || 0) + 1).concat(fitCubic(pts.slice(c), mul(tc, -1), t2, err, (depth || 0) + 1));
}
function endTangent(run: Polygon, fromEnd: boolean): Point {
  const pts = fromEnd ? run.slice().reverse() : run; let total = 0; let k = 1;
  const span = Math.max(3, chordLength(run) * 0.04);
  for (; k < pts.length - 1; k++) { total += dist(pts[k], pts[k - 1]); if (total >= span) break; }
  return norm(sub(pts[Math.min(k, pts.length - 1)], pts[0]));
}
function segLength(s: Cubic): number { const pts = []; for (let k = 0; k <= 16; k++) pts.push(bez(s, k / 16)); return chordLength(pts); }
function chordLength(pts: Polygon): number { let s = 0; for (let i = 1; i < pts.length; i++) s += dist(pts[i], pts[i - 1]); return s; }
/** 꺾인 점(모서리)을 찾는다. 앞뒤로 일정 길이 떨어진 점과의 방향 차이로 잰다. */
export function findCorners(pts: Polygon, deg: number): number[] {
  const n = pts.length, box = bbox([pts]), w = Math.max(3, Math.hypot(box[2] - box[0], box[3] - box[1]) * 0.025);
  const limit = Math.cos(deg * Math.PI / 180), turn = [];
  function reach(i: number, dir: number): Point {
    let total = 0; let j = i;
    for (let step = 0; step < n - 1; step++) { const k = (j + dir + n) % n; total += dist(pts[k], pts[j]); j = k; if (total >= w) break; }
    return pts[j];
  }
  for (let i = 0; i < n; i++) {
    const a = norm(sub(pts[i], reach(i, -1))), b = norm(sub(reach(i, 1), pts[i]));
    turn.push(dot(a, b));
  }
  const corners = [];
  for (let i2 = 0; i2 < n; i2++) {
    if (turn[i2] > limit) continue;
    let isMin = true; let total = 0;
    for (let d = 1; d < n && total < w; d++) {
      total += dist(pts[(i2 + d) % n], pts[(i2 + d - 1) % n]);
      // 같은 값이 이어지면 맨 앞 하나만 남긴다
      if (turn[(i2 + d) % n] < turn[i2] || turn[(i2 - d + n) % n] <= turn[i2]) { isMin = false; break; }
    }
    if (isMin) corners.push(i2);
  }
  return corners;
}
function fromBeziers(bzs: Cubic[]): Contour {
  const nodes = bzs.map<Node>(function (s, i) {
    const prev = bzs[(i - 1 + bzs.length) % bzs.length];
    const inn = sub(prev[2], prev[3]), out = sub(s[1], s[0]);
    const smooth = len(inn) > 1e-6 && len(out) > 1e-6 && dot(norm(inn), norm(out)) < -Math.cos(8 * Math.PI / 180);
    return [s[0][0], s[0][1], inn[0], inn[1], out[0], out[1], smooth ? 1 : 0];
  });
  return { n: nodes };
}
/** 닫힌 다각형 → 곡선 윤곽. err 는 허용 오차(음절 단위), cornerDeg 는 모서리로 볼 꺾임 각. */
export function polygonToContour(poly: Polygon, err: number, cornerDeg: number): Contour | null {
  const pts = dedupe(poly, true);
  if (pts.length < 3) return null;
  const corners = findCorners(pts, cornerDeg || 55); let bzs: Cubic[] = [];
  if (!corners.length) {
    const t = norm(sub(pts[1], pts[pts.length - 1]));
    bzs = fitCubic(pts.concat([pts[0]]), t, mul(t, -1), err, 0);
  } else {
    for (let k = 0; k < corners.length; k++) {
      const a = corners[k], b = corners[(k + 1) % corners.length], run = [];
      let i = a;
      do { run.push(pts[i]); i = (i + 1) % pts.length; } while (i !== b);
      run.push(pts[b]);
      if (run.length < 2) continue;
      bzs = bzs.concat(fitCubic(run, endTangent(run, false), endTangent(run, true), err, 0));
    }
  }
  bzs = bzs.filter(function (s) { return dist(s[0], s[3]) > 1e-6 || !isLineSeg(s); });
  if (bzs.length < 2) return null;
  return fromBeziers(bzs);
}
export function polygonsToContours(polys: Polygon[], err: number, cornerDeg: number): Contour[] {
  return orientContours(polys.map(function (p) { return polygonToContour(p, err, cornerDeg); }).filter((c): c is Contour => c !== null));
}

/* ---------- 클리퍼(겹친 윤곽 합치기, 빼기, 굵기) ---------- */
const SCALE = 64;
function toPaths(polys: Polygon[]): ClipperLib.Paths { return polys.map(function (p) { return p.map(function (q) { return { X: Math.round(q[0] * SCALE), Y: Math.round(q[1] * SCALE) }; }); }); }
function fromPaths(paths: ClipperLib.Paths): Polygon[] { return paths.map(function (p) { return p.map(function (q) { return [q.X / SCALE, q.Y / SCALE]; }); }); }
function tidy(CL: CL, polys: Polygon[], minArea?: number): Polygon[] {
  const paths = CL.Clipper.CleanPolygons(toPaths(polys), 0.35 * SCALE);
  return orient(fromPaths(paths).filter(function (p) { return p.length >= 3 && Math.abs(area(p)) >= (minArea == null ? 3 : minArea); }));
}
/** 획 하나(스스로 꼬일 수 있다)를 단순 다각형 묶음으로. */
export function simplifyOne(CL: CL, poly: Polygon): Polygon[] {
  const sol = CL.Clipper.SimplifyPolygon(toPaths([poly])[0], CL.PolyFillType.pftNonZero);
  return orient(fromPaths(sol));
}
export function union(CL: CL, polys: Polygon[]): Polygon[] {
  const c = new CL.Clipper(), sol = new CL.Paths();
  c.AddPaths(toPaths(polys), CL.PolyType.ptSubject, true);
  c.Execute(CL.ClipType.ctUnion, sol, CL.PolyFillType.pftNonZero, CL.PolyFillType.pftNonZero);
  return tidy(CL, fromPaths(sol));
}
export function difference(CL: CL, subj: Polygon[], clip: Polygon[]): Polygon[] {
  const c = new CL.Clipper(), sol = new CL.Paths();
  c.AddPaths(toPaths(subj), CL.PolyType.ptSubject, true);
  c.AddPaths(toPaths(clip), CL.PolyType.ptClip, true);
  c.Execute(CL.ClipType.ctDifference, sol, CL.PolyFillType.pftNonZero, CL.PolyFillType.pftNonZero);
  return tidy(CL, fromPaths(sol));
}
let offsetSign: number | null = null;
export function offset(CL: CL, polys: Polygon[], delta: number): Polygon[] {
  if (!delta) return polys;
  if (offsetSign === null) offsetSign = CL.Clipper.Orientation(toPaths([[[0, 0], [10, 0], [10, 10], [0, 10]]])[0]) ? 1 : -1;
  const co = new CL.ClipperOffset(2, 0.2 * SCALE), sol = new CL.Paths();
  co.AddPaths(toPaths(polys), CL.JoinType.jtRound, CL.EndType.etClosedPolygon);
  co.Execute(sol, delta * SCALE * offsetSign);
  return tidy(CL, fromPaths(sol));
}

/* ---------- 2차 곡선으로 (TrueType) ---------- */
function splitN(s: Cubic, n: number): Cubic[] {
  const out = []; let rest = s;
  for (let i = 0; i < n - 1; i++) { const h = splitBez(rest, 1 / (n - i)); out.push(h[0]); rest = h[1]; }
  out.push(rest);
  return out;
}
export function cubicToQuads(s: Cubic, tol: number): [Point, Point][] {
  for (let n = 1; n <= 24; n++) {
    const parts = splitN(s, n); let ok = true; const quads: [Point, Point][] = [];
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i], q = mul(sub(mul(add(p[1], p[2]), 3), add(p[0], p[3])), 0.25);
      const e = len(add(sub(p[3], mul(p[2], 3)), sub(mul(p[1], 3), p[0]))) * Math.sqrt(3) / 36;
      if (e > tol) { ok = false; break; }
      quads.push([q, p[3]]);
    }
    if (ok) return quads;
  }
  return [[mul(add(s[1], s[2]), 0.5), s[3]]];
}
/** 3차 윤곽 → 엔진 점 목록([x,y] 위, [x,y,0] 조절점). */
export function contourToTT(c: Contour, tol = 0.35): TTContour {
  const out = [[c.n[0][0], c.n[0][1]]], m = c.n.length;
  for (let i = 0; i < m; i++) {
    const s = segment(c, i); const last = i === m - 1;
    if (isLineSeg(s)) { if (!last) out.push([s[3][0], s[3][1]]); continue; }
    cubicToQuads(s, tol || 0.35).forEach(function (qe, k, arr) {
      out.push([qe[0][0], qe[0][1], 0]);
      if (!(last && k === arr.length - 1)) out.push([qe[1][0], qe[1][1]]);
    });
  }
  return out;
}

/* ---------- 점 고치기 ---------- */
export function moveNode(c: Contour, i: number, dx: number, dy: number): void { c.n[i][0] += dx; c.n[i][1] += dy; }
export function setHandle(c: Contour, i: number, which: "in" | "out", pos: Point): void {
  const p = c.n[i], h = [pos[0] - p[0], pos[1] - p[1]];
  if (which === 'in') { p[2] = h[0]; p[3] = h[1]; } else { p[4] = h[0]; p[5] = h[1]; }
  if (p[6]) {
    const other = which === 'in' ? [p[4], p[5]] : [p[2], p[3]], l = len(other) || len(h), d = norm(h);
    const o = mul(d, -l);
    if (which === 'in') { p[4] = o[0]; p[5] = o[1]; } else { p[2] = o[0]; p[3] = o[1]; }
  }
}
export function setSmooth(c: Contour, i: number, smooth: boolean): void {
  const p = c.n[i], m = c.n.length;
  p[6] = smooth ? 1 : 0;
  if (!smooth) return;
  const prev = c.n[(i - 1 + m) % m], next = c.n[(i + 1) % m];
  const inn = [p[2], p[3]]; const out = [p[4], p[5]]; let li = len(inn); let lo = len(out);
  let d;
  if (li > 1e-6 && lo > 1e-6) d = norm(sub(out, inn));
  else if (lo > 1e-6) d = norm(out);
  else if (li > 1e-6) d = mul(norm(inn), -1);
  else d = norm(sub([next[0], next[1]], [prev[0], prev[1]]));
  if (li < 1e-6) li = dist(p, prev) / 3;
  if (lo < 1e-6) lo = dist(p, next) / 3;
  p[2] = -d[0] * li; p[3] = -d[1] * li; p[4] = d[0] * lo; p[5] = d[1] * lo;
}
export function insertNode(c: Contour, i: number, t: number): number {
  const m = c.n.length, s = segment(c, i), a = c.n[i], b = c.n[(i + 1) % m];
  if (isLineSeg(s)) { const q = bez(s, t); c.n.splice(i + 1, 0, [q[0], q[1], 0, 0, 0, 0, 0]); return i + 1; }
  const h = splitBez(s, t), L = h[0], R = h[1], mid = L[3];
  a[4] = L[1][0] - L[0][0]; a[5] = L[1][1] - L[0][1];
  b[2] = R[2][0] - R[3][0]; b[3] = R[2][1] - R[3][1];
  c.n.splice(i + 1, 0, [mid[0], mid[1], L[2][0] - mid[0], L[2][1] - mid[1], R[1][0] - mid[0], R[1][1] - mid[1], 1]);
  return i + 1;
}
export function deleteNode(c: Contour, i: number): boolean {
  const m = c.n.length;
  if (m <= 3) return false;
  const pi = (i - 1 + m) % m, s0 = segment(c, pi), s1 = segment(c, i), prev = c.n[pi], next = c.n[(i + 1) % m];
  if (isLineSeg(s0) && isLineSeg(s1)) { c.n.splice(i, 1); return true; }
  let pts = [s0[0]];
  flatSeg(s0, 0.2, pts, 0); flatSeg(s1, 0.2, pts, 0);
  pts = dedupe(pts, false);
  const t1 = len([prev[4], prev[5]]) > 1e-6 ? norm([prev[4], prev[5]]) : norm(sub(pts[1], pts[0]));
  const t2 = len([next[2], next[3]]) > 1e-6 ? norm([next[2], next[3]]) : norm(sub(pts[pts.length - 2], pts[pts.length - 1]));
  let u = chordParam(pts); let s = generateBezier(pts, u, t1, t2);
  for (let k = 0; k < 8; k++) { u = reparam(s, pts, u); s = generateBezier(pts, u, t1, t2); }
  prev[4] = s[1][0] - s[0][0]; prev[5] = s[1][1] - s[0][1];
  next[2] = s[2][0] - s[3][0]; next[3] = s[2][1] - s[3][1];
  c.n.splice(i, 1);
  return true;
}
/** 거리 r 만큼 떨어진 곳을 찾아 모서리를 둥근 두 점으로 바꾼다. */
export function roundCorner(c: Contour, i: number, r: number): boolean {
  const m = c.n.length, pi = (i - 1 + m) % m, P = [c.n[i][0], c.n[i][1]];
  const s0 = segment(c, pi), s1 = segment(c, i);
  const l0 = segLength(s0), l1 = segLength(s1);
  r = Math.min(r, l0 * 0.45, l1 * 0.45);
  if (r < 0.5) return false;
  function findT(s: Cubic, fromEnd: boolean): number {
    let lo = 0; let hi = 1;
    for (let k = 0; k < 40; k++) {
      const mid = (lo + hi) / 2, d = dist(bez(s, mid), P);
      if (fromEnd) { if (d > r) lo = mid; else hi = mid; } else { if (d > r) hi = mid; else lo = mid; }
    }
    return (lo + hi) / 2;
  }
  const t0 = findT(s0, true), t1 = findT(s1, false);
  const L = splitBez(s0, t0)[0], R = splitBez(s1, t1)[1];
  const A = L[3], B = R[0], dA = tangentAt(s0, t0), dB = tangentAt(s1, t1), k = r * 0.55;
  const prev = c.n[pi], next = c.n[(i + 1) % m];
  prev[4] = L[1][0] - L[0][0]; prev[5] = L[1][1] - L[0][1];
  next[2] = R[2][0] - R[3][0]; next[3] = R[2][1] - R[3][1];
  const nA: Node = [A[0], A[1], L[2][0] - A[0], L[2][1] - A[1], dA[0] * k, dA[1] * k, 1];
  const nB: Node = [B[0], B[1], -dB[0] * k, -dB[1] * k, R[1][0] - B[0], R[1][1] - B[1], 1];
  if (isLineSeg(s0)) { nA[2] = -dA[0] * 1e-3; nA[3] = -dA[1] * 1e-3; }
  if (isLineSeg(s1)) { nB[4] = dB[0] * 1e-3; nB[5] = dB[1] * 1e-3; }
  c.n.splice(i, 1, nA, nB);
  return true;
}
/** 꺾임 각을 잰다(도). 0 이면 곧게 이어지고 180 이면 되돌아간다. */
export function turnAngle(c: Contour, i: number): number {
  const m = c.n.length, din = tangentAt(segment(c, (i - 1 + m) % m), 1), dout = tangentAt(segment(c, i), 0);
  return Math.acos(Math.max(-1, Math.min(1, dot(din, dout)))) * 180 / Math.PI;
}
/** 뾰족한 데 다듬기: 가시처럼 날카로운 꺾임은 둥글게, 거의 곧은 꺾임은 부드러운 점으로. */
export function tameSpikes(c: Contour, opts: {spikeDeg?: number; gentleDeg?: number; radius?: number} = {}): number {
  opts = opts || {};
  const spike = opts.spikeDeg || 115; const gentle = opts.gentleDeg || 18; const r = opts.radius || 6; let changed = 0;
  for (let i = c.n.length - 1; i >= 0; i--) {
    if (c.n[i][6]) continue;
    const a = turnAngle(c, i);
    if (a >= spike) { if (roundCorner(c, i, r)) changed++; }
    else if (a <= gentle) { setSmooth(c, i, true); changed++; }
  }
  return changed;
}
/** 점 줄이기: 지금 모양을 다시 맞춘다(모서리는 살린다). */
export function refit(cs: Contour[], err: number, cornerDeg: number): Contour[] {
  return polygonsToContours(flattenAll(cs, Math.min(0.3, err / 4)), err, cornerDeg);
}

/* ---------- 찾기 ---------- */
export function nearestOnContours(cs: Contour[], p: Point): {ci: number; i: number; t: number; d: number; p: Point} | null {
  let best: ReturnType<typeof nearestOnContours> = null;
  cs.forEach(function (c, ci) {
    for (let i = 0; i < c.n.length; i++) {
      const s = segment(c, i); let bt = 0; let bd = Infinity;
      for (let k = 0; k <= 24; k++) { const t = k / 24, d = dist(bez(s, t), p); if (d < bd) { bd = d; bt = t; } }
      let lo = Math.max(0, bt - 1 / 24); let hi = Math.min(1, bt + 1 / 24);
      for (let it = 0; it < 24; it++) {
        const a = lo + (hi - lo) / 3, b = hi - (hi - lo) / 3;
        if (dist(bez(s, a), p) < dist(bez(s, b), p)) hi = b; else lo = a;
      }
      bt = (lo + hi) / 2; bd = dist(bez(s, bt), p);
      if (!best || bd < best.d) best = { ci: ci, i: i, t: bt, d: bd, p: bez(s, bt) };
    }
  });
  return best;
}
export function bbox(polysOrContours: (Polygon | Contour)[]): number[] {
  const b = [Infinity, Infinity, -Infinity, -Infinity];
  polysOrContours.forEach(function (p) {
    const pts = 'n' in p ? p.n : p;
    pts.forEach(function (q) { b[0] = Math.min(b[0], q[0]); b[1] = Math.min(b[1], q[1]); b[2] = Math.max(b[2], q[0]); b[3] = Math.max(b[3], q[1]); });
  });
  return b;
}
export function contoursBBox(cs: Contour[]): number[] { return bbox(flattenAll(cs, 1)); }

/* ---------- 변환 ---------- */
/** m = [a, b, c, d, e, f]: x' = a x + c y + e, y' = b x + d y + f */
export function transform(cs: Contour[], m: Affine): Contour[] {
  return cs.map(c => { const copy = clone(c); transformNodes(copy, copy.n.map((_, i) => i), m); return copy; });
}
export function transformNodes(c: Contour, idx: number[], m: Affine): void {
  const linear: Affine = [m[0],m[1],m[2],m[3],0,0];
  idx.forEach(i => { const p = c.n[i], a = apply(m,[p[0],p[1]]), inn = apply(linear,[p[2],p[3]]), out = apply(linear,[p[4],p[5]]);
    p[0]=a[0]; p[1]=a[1]; p[2]=inn[0]; p[3]=inn[1]; p[4]=out[0]; p[5]=out[1]; });
}
export function frameToSyl(f: Frame): Affine { return [f[2] - f[0], 0, 0, f[3] - f[1], f[0], f[1]]; }
export function sylToFrame(f: Frame): Affine { const w = f[2] - f[0], h = f[3] - f[1]; return [1 / w, 0, 0, 1 / h, -f[0] / w, -f[1] / h]; }
export function aroundPoint(m: Affine, cx: number, cy: number): Affine {
  return [m[0], m[1], m[2], m[3], cx - m[0] * cx - m[2] * cy + m[4], cy - m[1] * cx - m[3] * cy + m[5]];
}

/* ---------- 펜 획 → 다각형 ---------- */
export function strokePolygon(getStroke: GetStroke, raw: Polygon, o: StrokeOptions): Polygon {
  let pts = smoothPoints(raw, Math.round((o.stabilize || 0) * 5));
  if (o.straight) pts = straighten(pts, 0.035);
  const outline = getStroke(pts, {
    size: o.size, thinning: o.pressure ? (o.thinning == null ? 0.55 : o.thinning) : 0, smoothing: 0.6,
    streamline: 0.35 + (o.stabilize || 0) * 0.5, simulatePressure: false, last: true,
    start: { cap: true, taper: 0 }, end: { cap: true, taper: 0 }
  });
  return outline.map(function (p) { return [p[0], p[1]]; });
}

/* ---------- 바탕 글꼴 글리프 → 윤곽 ---------- */
/** opentype.js 의 path.commands(글꼴 단위, y 위로)를 음절 좌표 윤곽 v2 로. 2차 곡선은 3차로 정확히 올린다.
 *  내보낼 때 엔진의 fontPoint 를 거치면 원래 글꼴 단위(1000 기준)로 돌아온다. */
export function commandsToContours(cmds: PathCommand[], upm: number): Contour[] {
  const k = 1000 / upm; const out: Contour[] = []; let cur: Contour | null = null;
  function P(x: number, y: number): Point { return [(x * k - 40) / 0.92, (840 - y * k) / 0.92]; }
  function close() {
    if (!cur || !cur.n.length) { cur = null; return; }
    const f = cur.n[0], l = cur.n[cur.n.length - 1];
    if (cur.n.length > 1 && dist(f, l) < 1e-6) { f[2] = l[2]; f[3] = l[3]; cur.n.pop(); }
    cur.n.forEach(function (p) {
      const a = [p[2], p[3]], b = [p[4], p[5]];
      p[6] = len(a) > 1e-6 && len(b) > 1e-6 && dot(norm(a), norm(b)) < -Math.cos(4 * Math.PI / 180) ? 1 : 0;
    });
    if (cur.n.length >= 2) out.push(cur);
    cur = null;
  }
  cmds.forEach(function (c) {
    const last = cur && cur.n[cur.n.length - 1]; let e;
    if (c.type === 'M') { close(); e = P(c.x!, c.y!); cur = { n: [[e[0], e[1], 0, 0, 0, 0, 0]] }; }
    else if (c.type === 'L') { e = P(c.x!, c.y!); cur!.n.push([e[0], e[1], 0, 0, 0, 0, 0]); }
    else if (c.type === 'Q') {
      const q = P(c.x1!, c.y1!); e = P(c.x!, c.y!);
      last![4] = (q[0] - last![0]) * 2 / 3; last![5] = (q[1] - last![1]) * 2 / 3;
      cur!.n.push([e[0], e[1], (q[0] - e[0]) * 2 / 3, (q[1] - e[1]) * 2 / 3, 0, 0, 0]);
    } else if (c.type === 'C') {
      const c1 = P(c.x1!, c.y1!), c2 = P(c.x2!, c.y2!); e = P(c.x!, c.y!);
      last![4] = c1[0] - last![0]; last![5] = c1[1] - last![1];
      cur!.n.push([e[0], e[1], c2[0] - e[0], c2[1] - e[1], 0, 0, 0]);
    } else if (c.type === 'Z') close();
  });
  close();
  return orientByLargest(out);
}
/** 글꼴 윤곽은 서로 겹칠 수 있어(가변 글꼴의 획 겹침) 윤곽마다 안팎을 따지면 틀린다.
 *  글꼴은 바깥 방향이 한 가지로 정해져 있으니, 가장 큰 윤곽이 음수면 전체를 뒤집는다. */
function nodeArea(c: Contour): number { return area(c.n.map(function (p) { return [p[0], p[1]]; })); }
export function orientByLargest(cs: Contour[]): Contour[] {
  if (!cs.length) return cs;
  const big = cs.reduce(function (a, c) { const v = nodeArea(c); return Math.abs(v) > Math.abs(a) ? v : a; }, 0);
  return big < 0 ? cs.map(reverseContour) : cs;
}
/** 빠른 길: 고치지 않은 바탕 글자는 원래 2차 곡선 점에 변환 m(음절 좌표의 아핀)만 곱해 엔진 점 목록으로 바로 만든다. */
export function commandsToTT(cmds: PathCommand[], upm: number, m: Affine = [1,0,0,1,0,0]): TTContour[] {
  const k = 1000 / upm; let out: TTContour[] = []; let cur: TTContour | null = null;
  m = m || [1, 0, 0, 1, 0, 0];
  function P(x: number, y: number, off = false): Point {
    const sx = (x * k - 40) / 0.92, sy = (840 - y * k) / 0.92;
    const q = [m[0] * sx + m[2] * sy + m[4], m[1] * sx + m[3] * sy + m[5]];
    if (off) q.push(0); return q;
  }
  function close() {
    if (cur && cur.length > 1) {
      const f = cur[0], l = cur[cur.length - 1];
      if (l.length < 3 && Math.abs(f[0] - l[0]) < 1e-9 && Math.abs(f[1] - l[1]) < 1e-9) cur.pop();
      if (cur.length >= 3) out.push(cur);
    }
    cur = null;
  }
  let last: Point | null = null;
  cmds.forEach(function (c) {
    if (c.type === 'M') { close(); cur = [P(c.x!, c.y!)]; last = [c.x!, c.y!]; }
    else if (c.type === 'L') { cur!.push(P(c.x!, c.y!)); last = [c.x!, c.y!]; }
    else if (c.type === 'Q') { cur!.push(P(c.x1!, c.y1!, true)); cur!.push(P(c.x!, c.y!)); last = [c.x!, c.y!]; }
    else if (c.type === 'C') {
      const a = P(last![0], last![1]), s: Cubic = [a, P(c.x1!, c.y1!), P(c.x2!, c.y2!), P(c.x!, c.y!)];
      cubicToQuads(s, 0.3).forEach(function (qe) { cur!.push([qe[0][0], qe[0][1], 0]); cur!.push([qe[1][0], qe[1][1]]); });
      last = [c.x!, c.y!];
    } else if (c.type === 'Z') close();
  });
  close();
  const big = out.reduce(function (a, c) { const v = area(c.filter(function (p) { return p.length < 3; })); return Math.abs(v) > Math.abs(a) ? v : a; }, 0);
  // 점은 이미 m 을 거쳤으니 넓이 부호가 곧 최종 방향이다.
  if (big < 0) out = out.map(function (c) {
    const r = c.slice().reverse(), i = r.findIndex(function (p) { return p.length < 3; });
    return r.slice(i).concat(r.slice(0, i));
  });
  return out;
}

