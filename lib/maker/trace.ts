/**
 * 이미지 → «간판으로 만들 수 있는» 베지어 아웃라인 (수산나 메이커, F26 · 2026-09-25).
 *
 * 🔴 **새로 지은 알고리즘이 아닙니다.** 형제 작업 폴더의 `STARTUP/font-ai/code/vclean.py` 를
 * 단계 그대로 옮겼습니다 — 그쪽이 `/sign-proof` 시안에서 이미 쓰는 벡터화기이고, 같은 테스트
 * 이미지로 겨뤄 **극점 누락 0 · 가짜 곡선 0 · IoU 0.995/0.978** 이 나왔습니다(potrace 는 극점 누락
 * 6/100, vtracer 는 얇은 붓 획을 12% 굵게 만들었습니다 — 2026-09-25 조사).
 *
 * 왜 potrace 를 안 쓰나 — **GPL-2 입니다.** 이 리포는 공개 저장소인데 LICENSE 가 없고, GPL 코드를
 * 손님 브라우저로 내보내면 목적코드 배포라 소스 제공 의무가 생깁니다. 이 파일은 의존성이 없습니다.
 *
 * 단계 (vclean.py 와 같은 이름을 씁니다):
 *   회색조 → 업샘플(2배) + 가우시안(σ=1) → 윤곽 추출 → 코너 검출 → 구간별 3차 베지어 적합(Schneider)
 *   → 극점에서 자르기 → 거의 직선인 곡선을 직선으로 → 이어진 직선 합치기
 *
 * ⚠️ **윤곽 추출만 다릅니다.** 원본은 OpenCV `findContours`(픽셀 경계) 인데, 여기서는 회색조에
 *    마칭 스퀘어(iso=128)를 돌려 **서브픽셀 등고선**을 얻습니다. 점 간격이 비슷해서(한 칸 안팎)
 *    코너 창(`win=6`)·오차 허용(`tol=0.55`) 값을 그대로 씁니다.
 */

export type Pt = [number, number];
export type Bez = [Pt, Pt, Pt, Pt];
export type Contour = Bez[];

/* ---------------------------------------------------------------- 벡터 연산 */

const sub = (a: Pt, b: Pt): Pt => [a[0] - b[0], a[1] - b[1]];
const add = (a: Pt, b: Pt): Pt => [a[0] + b[0], a[1] + b[1]];
const mul = (a: Pt, s: number): Pt => [a[0] * s, a[1] * s];
const dot = (a: Pt, b: Pt) => a[0] * b[0] + a[1] * b[1];
const norm = (a: Pt) => Math.hypot(a[0], a[1]);
const cross = (a: Pt, b: Pt) => a[0] * b[1] - a[1] * b[0];
const lerp = (a: Pt, b: Pt, t: number): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

function bezAt(b: Bez, t: number): Pt {
  const u = 1 - t;
  const a = u * u * u, c = 3 * u * u * t, d = 3 * u * t * t, e = t * t * t;
  return [
    a * b[0][0] + c * b[1][0] + d * b[2][0] + e * b[3][0],
    a * b[0][1] + c * b[1][1] + d * b[2][1] + e * b[3][1],
  ];
}

/* ---------------------------------------------------------------- 래스터 준비 */

/** 회색조 격자. `v` 는 0(먹)~255(바탕). 128 이 문턱입니다 — vclean 과 같은 약속. */
export type Gray = { w: number; h: number; v: Float32Array };

/** 쌍선형 업샘플 — 원본의 bicubic 대신. 뒤에 가우시안을 먹이므로 차이가 윤곽에 안 남습니다. */
function upsample(g: Gray, up: number): Gray {
  if (up === 1) return g;
  const W = g.w * up, H = g.h * up, v = new Float32Array(W * H);
  for (let y = 0; y < H; y++) {
    const sy = Math.min(g.h - 1, Math.max(0, (y + 0.5) / up - 0.5));
    const y0 = Math.floor(sy), y1 = Math.min(g.h - 1, y0 + 1), fy = sy - y0;
    for (let x = 0; x < W; x++) {
      const sx = Math.min(g.w - 1, Math.max(0, (x + 0.5) / up - 0.5));
      const x0 = Math.floor(sx), x1 = Math.min(g.w - 1, x0 + 1), fx = sx - x0;
      const a = g.v[y0 * g.w + x0], b = g.v[y0 * g.w + x1];
      const c = g.v[y1 * g.w + x0], d = g.v[y1 * g.w + x1];
      v[y * W + x] = (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy;
    }
  }
  return { w: W, h: H, v };
}

/** 분리형 가우시안 블러 (σ 픽셀). 가장자리는 복제. */
function blur(g: Gray, sigma: number): Gray {
  if (sigma <= 0) return g;
  const r = Math.ceil(sigma * 3), k = new Float32Array(2 * r + 1);
  let s = 0;
  for (let i = -r; i <= r; i++) s += k[i + r] = Math.exp(-(i * i) / (2 * sigma * sigma));
  for (let i = 0; i < k.length; i++) k[i] /= s;
  const { w, h } = g, tmp = new Float32Array(w * h), out = new Float32Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let acc = 0;
      for (let i = -r; i <= r; i++) acc += k[i + r] * g.v[y * w + Math.min(w - 1, Math.max(0, x + i))];
      tmp[y * w + x] = acc;
    }
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let acc = 0;
      for (let i = -r; i <= r; i++) acc += k[i + r] * tmp[Math.min(h - 1, Math.max(0, y + i)) * w + x];
      out[y * w + x] = acc;
    }
  return { w, h, v: out };
}

/* ---------------------------------------------------------------- 윤곽 (마칭 스퀘어) */

/**
 * iso=128 등고선을 **닫힌 고리들**로 돌려줍니다. 안쪽 = 값 < 128(먹).
 *
 * 바깥 한 칸을 바탕(255)으로 둘러 모든 고리가 닫히게 합니다 — 테두리에 닿은 글자가
 * 열린 선으로 끝나 «통째로 사라지는» 일을 막습니다(`/sign-proof` 가 2026-09-23 에 밟은 함정의 반대편).
 * 안장(5·10) 칸은 네 모서리 평균으로 갈라 먹끼리 잇습니다(획이 끊기지 않는 쪽).
 */
function contours(g: Gray, iso = 128): Pt[][] {
  const W = g.w + 2, H = g.h + 2;
  const val = (x: number, y: number) =>
    x <= 0 || y <= 0 || x >= W - 1 || y >= H - 1 ? 255 : g.v[(y - 1) * g.w + (x - 1)];

  // 모서리 번호: 가로변 (x,y)-(x+1,y) = 2*(y*W+x), 세로변 (x,y)-(x,y+1) = 2*(y*W+x)+1
  const pos = new Map<number, Pt>();
  const next = new Map<number, number>();
  const edgePt = (id: number): Pt => {
    let p = pos.get(id);
    if (p) return p;
    const cell = id >> 1, x = cell % W, y = (cell / W) | 0;
    const a = val(x, y);
    if ((id & 1) === 0) {
      const b = val(x + 1, y), t = (iso - a) / (b - a || 1e-9);
      p = [x + t - 1, y - 1];
    } else {
      const b = val(x, y + 1), t = (iso - a) / (b - a || 1e-9);
      p = [x - 1, y + t - 1];
    }
    pos.set(id, p);
    return p;
  };
  const link = (a: number, b: number) => {
    edgePt(a); edgePt(b);
    next.set(a, b);
  };

  for (let y = 0; y < H - 1; y++)
    for (let x = 0; x < W - 1; x++) {
      const tl = val(x, y), tr = val(x + 1, y), br = val(x + 1, y + 1), bl = val(x, y + 1);
      const c = (tl < iso ? 8 : 0) | (tr < iso ? 4 : 0) | (br < iso ? 2 : 0) | (bl < iso ? 1 : 0);
      if (c === 0 || c === 15) continue;
      const T = 2 * (y * W + x), B = 2 * ((y + 1) * W + x);
      const L = 2 * (y * W + x) + 1, R = 2 * (y * W + x + 1) + 1;
      // 방향: 먹을 왼쪽에 두고 도는 쪽으로 잇습니다 — 고리 방향이 바깥/구멍에서 서로 반대가 됩니다
      switch (c) {
        case 1: link(L, B); break;
        case 2: link(B, R); break;
        case 3: link(L, R); break;
        case 4: link(R, T); break;
        case 6: link(B, T); break;
        case 7: link(L, T); break;
        case 8: link(T, L); break;
        case 9: link(T, B); break;
        case 11: link(T, R); break;
        case 12: link(R, L); break;
        case 13: link(R, B); break;
        case 14: link(B, L); break;
        case 5: {
          const mid = (tl + tr + br + bl) / 4;
          if (mid < iso) { link(L, T); link(R, B); } else { link(L, B); link(R, T); }
          break;
        }
        case 10: {
          const mid = (tl + tr + br + bl) / 4;
          if (mid < iso) { link(B, L); link(T, R); } else { link(T, L); link(B, R); }
          break;
        }
      }
    }

  const loops: Pt[][] = [];
  const seen = new Set<number>();
  for (const start of next.keys()) {
    if (seen.has(start)) continue;
    const loop: Pt[] = [];
    let cur: number | undefined = start;
    while (cur !== undefined && !seen.has(cur)) {
      seen.add(cur);
      loop.push(pos.get(cur)!);
      cur = next.get(cur);
    }
    if (loop.length >= 3) loops.push(loop);
  }
  return loops;
}

function polyArea(P: Pt[]) {
  let s = 0;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) s += P[j][0] * P[i][1] - P[i][0] * P[j][1];
  return s / 2;
}

/* ---------------------------------------------------------------- 코너 검출 */

function corners(P: Pt[], deg = 58, win = 6): number[] {
  const n = P.length, cand: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = sub(P[(i - win + n) % n], P[i]), b = sub(P[(i + win) % n], P[i]);
    const na = norm(a), nb = norm(b);
    if (na < 1e-6 || nb < 1e-6) continue;
    const ang = (Math.acos(Math.max(-1, Math.min(1, dot(a, b) / (na * nb)))) * 180) / Math.PI;
    if (ang < 180 - deg) cand.push([i, ang]);
  }
  cand.sort((p, q) => p[1] - q[1]);
  const used = new Uint8Array(n), out: number[] = [];
  for (const [i] of cand) {
    let hit = false;
    for (let k = Math.max(0, i - win); k < Math.min(n, i + win); k++) if (used[k]) { hit = true; break; }
    if (hit) continue;
    used[i] = 1;
    out.push(i);
  }
  return out.sort((a, b) => a - b);
}

/* ---------------------------------------------------------------- 3차 베지어 적합 (Schneider) */

function fitCubic(P: Pt[], t1: Pt, t2: Pt): Bez {
  const n = P.length, p0 = P[0], p3 = P[n - 1];
  if (n === 2) {
    const d = norm(sub(p3, p0)) / 3;
    return [p0, add(p0, mul(t1, d)), add(p3, mul(t2, d)), p3];
  }
  const u = new Float64Array(n);
  for (let i = 1; i < n; i++) u[i] = u[i - 1] + norm(sub(P[i], P[i - 1]));
  if (u[n - 1] < 1e-9) for (let i = 0; i < n; i++) u[i] = i / (n - 1);
  else for (let i = 0; i < n; i++) u[i] /= u[n - 1];

  let c00 = 0, c01 = 0, c11 = 0, x0 = 0, x1 = 0;
  for (let i = 0; i < n; i++) {
    const t = u[i], s = 1 - t;
    const A1 = 3 * s * s * t, A2 = 3 * s * t * t;
    const a1: Pt = mul(t1, A1), a2: Pt = mul(t2, A2);
    const tmp = sub(sub(P[i], mul(p0, s * s * s)), mul(p3, t * t * t));
    c00 += dot(a1, a1); c01 += dot(a1, a2); c11 += dot(a2, a2);
    x0 += dot(a1, tmp); x1 += dot(a2, tmp);
  }
  const det = c00 * c11 - c01 * c01;
  const L = norm(sub(p3, p0));
  let al: number, ar: number;
  if (Math.abs(det) < 1e-12) al = ar = L / 3;
  else {
    al = (x0 * c11 - c01 * x1) / det;
    ar = (c00 * x1 - x0 * c01) / det;
    if (al < 1e-6 || ar < 1e-6 || al > L * 2 || ar > L * 2) al = ar = L / 3;
  }
  return [p0, add(p0, mul(t1, al)), add(p3, mul(t2, ar)), p3];
}

/** 점들에서 곡선까지의 최대 거리 (원본은 cKDTree — 여기선 표본 전수 비교) */
function fitErr(P: Pt[], b: Bez) {
  const m = Math.max(16, P.length), S: Pt[] = [];
  for (let i = 0; i < m; i++) S.push(bezAt(b, i / (m - 1)));
  let worst = 0;
  for (const p of P) {
    let best = Infinity;
    for (const s of S) {
      const d = (p[0] - s[0]) ** 2 + (p[1] - s[1]) ** 2;
      if (d < best) best = d;
    }
    if (best > worst) worst = best;
  }
  return Math.sqrt(worst);
}

function tangent(P: Pt[], i: number, win = 4, fwd = true): Pt {
  const n = P.length, j = fwd ? (i + win) % n : (i - win + n) % n;
  const v = sub(P[j], P[i]), nv = norm(v);
  return nv > 1e-9 ? mul(v, 1 / nv) : [1, 0];
}

function fitSpan(P: Pt[], t1: Pt, t2: Pt, tol: number, depth = 0): Bez[] {
  const b = fitCubic(P, t1, t2);
  if (P.length <= 3 || depth > 12 || fitErr(P, b) <= tol) return [b];
  const k = P.length >> 1;
  let tm = sub(P[Math.min(k + 2, P.length - 1)], P[Math.max(k - 2, 0)]);
  const nm = norm(tm);
  tm = nm > 1e-9 ? mul(tm, 1 / nm) : t1;
  return [
    ...fitSpan(P.slice(0, k + 1), t1, mul(tm, -1), tol, depth + 1),
    ...fitSpan(P.slice(k), tm, t2, tol, depth + 1),
  ];
}

/* ---------------------------------------------------------------- 극점 */

function extremaTs(b: Bez, lo: number, hi: number): number[] {
  const ts: number[] = [];
  for (const d of [0, 1]) {
    const p0 = b[0][d], p1 = b[1][d], p2 = b[2][d], p3 = b[3][d];
    const a = 3 * (-p0 + 3 * p1 - 3 * p2 + p3), bb = 6 * (p0 - 2 * p1 + p2), c = 3 * (p1 - p0);
    if (Math.abs(a) < 1e-9) {
      if (Math.abs(bb) > 1e-9) {
        const t = -c / bb;
        if (t > lo && t < hi) ts.push(t);
      }
    } else {
      const disc = bb * bb - 4 * a * c;
      if (disc >= 0)
        for (const s of [1, -1]) {
          const t = (-bb + s * Math.sqrt(disc)) / (2 * a);
          if (t > lo && t < hi) ts.push(t);
        }
    }
  }
  return ts;
}

function deCasteljau(b: Bez, t: number): [Bez, Bez] {
  const [p0, p1, p2, p3] = b;
  const q0 = lerp(p0, p1, t), q1 = lerp(p1, p2, t), q2 = lerp(p2, p3, t);
  const r0 = lerp(q0, q1, t), r1 = lerp(q1, q2, t), s = lerp(r0, r1, t);
  return [[p0, q0, r0, s], [s, r1, q2, p3]];
}

function splitExtrema(b: Bez): Bez[] {
  const ts = [...new Set(extremaTs(b, 1e-3, 1 - 1e-3))].sort((x, y) => x - y);
  if (!ts.length) return [b];
  const out: Bez[] = [];
  let cur = b, prev = 0;
  for (const t of ts) {
    const tt = (t - prev) / (1 - prev);
    prev = t;
    const [a, rest] = deCasteljau(cur, tt);
    out.push(a);
    cur = rest;
  }
  out.push(cur);
  return out;
}

/* ---------------------------------------------------------------- 직선화·병합 */

function lineDev(b: Bez) {
  const L = norm(sub(b[3], b[0]));
  if (L < 1e-6) return 0;
  const u = mul(sub(b[3], b[0]), 1 / L);
  return Math.max(Math.abs(cross(u, sub(b[1], b[0]))), Math.abs(cross(u, sub(b[2], b[0]))));
}

const asLine = (p0: Pt, p3: Pt): Bez => [p0, lerp(p0, p3, 1 / 3), lerp(p0, p3, 2 / 3), p3];

function straighten(c: Contour, tol = 0.14): Contour {
  return c.map((b) => (lineDev(b) < tol ? asLine(b[0], b[3]) : b));
}

function mergeLines(c: Contour, deg = 4): Contour {
  if (!c.length) return c;
  const res: Bez[] = [c[0]];
  for (const b of c.slice(1)) {
    const a = res[res.length - 1];
    if (lineDev(a) < 1e-3 && lineDev(b) < 1e-3) {
      const v1 = sub(a[3], a[0]), v2 = sub(b[3], b[0]), n1 = norm(v1), n2 = norm(v2);
      if (n1 > 1e-9 && n2 > 1e-9) {
        const ang = (Math.acos(Math.max(-1, Math.min(1, dot(v1, v2) / (n1 * n2)))) * 180) / Math.PI;
        if (ang < deg) {
          res[res.length - 1] = asLine(a[0], b[3]);
          continue;
        }
      }
    }
    res.push(b);
  }
  return res;
}

/* ---------------------------------------------------------------- 본체 */

export type TraceOpts = {
  up?: number;
  blur?: number;
  tol?: number;
  cornerDeg?: number;
  /** 원본 픽셀² 기준. 이보다 작은 덩이는 버립니다 (잡티) */
  minArea?: number;
};

/**
 * 회색조(먹 < 128) → 윤곽 목록. 좌표는 **원본 픽셀** 단위입니다.
 * vclean.clean() 과 같은 순서: trace → straighten → merge_lines.
 */
export function traceGray(g: Gray, o: TraceOpts = {}): Contour[] {
  const up = o.up ?? 2, tol = o.tol ?? 0.55, minArea = o.minArea ?? 20;
  const m = blur(upsample(g, up), o.blur ?? 1);
  const out: Contour[] = [];
  for (const loopUp of contours(m)) {
    if (Math.abs(polyArea(loopUp)) < minArea * up * up) continue;
    const P: Pt[] = [];
    for (const p of loopUp) {
      // 업샘플 칸 번호 → 원본 좌표. `+0.5` 는 «픽셀 i 가 [i, i+1] 을 덮는다»는 SVG 약속에 맞추는 것
      // (vclean 은 `/up` 만 해서 0.25px 치우쳐 있습니다 — OpenCV fillPoly 로 되그릴 땐 그쪽이 맞습니다)
      const q: Pt = [(p[0] + 0.5) / up, (p[1] + 0.5) / up];
      const last = P[P.length - 1];
      if (!last || norm(sub(q, last)) > 1e-9) P.push(q);
    }
    if (P.length < 8) continue;
    let ks = corners(P, o.cornerDeg ?? 58);
    if (!ks.length) ks = [0];
    let segs: Bez[] = [];
    for (let k = 0; k < ks.length; k++) {
      const a = ks[k], b = k + 1 < ks.length ? ks[k + 1] : ks[0] + P.length;
      const S: Pt[] = [];
      for (let i = a; i <= b; i++) S.push(P[i % P.length]);
      if (S.length < 2) continue;
      const t1 = tangent(P, a % P.length, 4, true);
      const t2 = mul(tangent(P, b % P.length, 4, false), -1);
      segs = segs.concat(fitSpan(S, t1, t2, tol));
    }
    segs = segs.flatMap(splitExtrema);
    out.push(mergeLines(straighten(segs)));
  }
  return out;
}

/* ---------------------------------------------------------------- 지표 */

/** 세그먼트 «내부»에 극점이 있으면 그 자리에 온커브 점이 없다는 뜻 (fontbakery missing-extremum) */
export function missingExtrema(cs: Contour[]) {
  let bad = 0, tot = 0;
  for (const c of cs)
    for (const b of c) {
      tot++;
      if (extremaTs(b, 0.02, 0.98).length) bad++;
    }
  return { bad, tot };
}

export const nodeCount = (cs: Contour[]) => cs.reduce((s, c) => s + c.length, 0);

/* ---------------------------------------------------------------- 출력 */

const f1 = (n: number) => (Math.round(n * 10) / 10).toString();

/** SVG path `d` (fill-rule=evenodd 로 칠하세요 — 구멍이 XOR 로 빠집니다) */
export function toPathD(cs: Contour[], scale = 1, dx = 0, dy = 0): string {
  const P = (p: Pt) => `${f1(p[0] * scale + dx)},${f1(p[1] * scale + dy)}`;
  let d = "";
  for (const c of cs) {
    if (!c.length) continue;
    d += `M${P(c[0][0])}`;
    for (const b of c) d += lineDev(b) < 1e-3 ? `L${P(b[3])}` : `C${P(b[1])} ${P(b[2])} ${P(b[3])}`;
    d += "Z";
  }
  return d;
}

export function bbox(cs: Contour[]) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const c of cs)
    for (const b of c)
      for (const p of b) {
        if (p[0] < x0) x0 = p[0];
        if (p[1] < y0) y0 = p[1];
        if (p[0] > x1) x1 = p[0];
        if (p[1] > y1) y1 = p[1];
      }
  return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0 };
}

/* ---------------------------------------------------------------- 이미지 → 층 */

/** 오츠 문턱 (0~255) */
export function otsu(v: Float32Array): number {
  const hist = new Float64Array(256);
  for (let i = 0; i < v.length; i++) hist[Math.max(0, Math.min(255, v[i] | 0))]++;
  const total = v.length;
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sumB = 0, wB = 0, best = 0, thr = 128;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (!wB) continue;
    const wF = total - wB;
    if (!wF) break;
    sumB += t * hist[t];
    const mB = sumB / wB, mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) ** 2;
    if (between > best) { best = between; thr = t; }
  }
  return thr;
}

export type Layer = { name: string; gray: Gray; color: string };

const hex = (r: number, g: number, b: number) =>
  "#" + [r, g, b].map((x) => Math.round(x).toString(16).padStart(2, "0")).join("");

/**
 * 로고 이미지 → 칠할 층들.
 *
 * - `ink` : 밝은 바탕의 어두운 로고(가장 흔함). 오츠 문턱. `invert` 면 어두운 바탕의 밝은 로고.
 * - `colors` : 색이 여럿인 로고. 바탕색(테두리 중앙값)을 빼고 k-평균으로 색을 나눠 **층마다** 따로 땁니다.
 *   간판에서는 색마다 아크릴·시트가 따로라 층으로 갈라 두면 그대로 제작 단위가 됩니다.
 *
 * 문턱 근처를 부드럽게(`gain`) 두는 건 letter_svg.py `_soft()` 와 같은 이유 — 계단 대신 경사를 줘야
 * 마칭 스퀘어가 서브픽셀 경계를 잡습니다.
 */
export function layersFromImage(
  img: ImageData,
  mode: "ink" | "colors",
  opts: { invert?: boolean; k?: number } = {},
): Layer[] {
  const { width: w, height: h, data } = img;
  const n = w * h;
  const lum = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const a = data[i * 4 + 3] / 255;
    // 투명은 흰 바탕으로 합성합니다 (PNG 로고의 흔한 모양)
    const r = data[i * 4] * a + 255 * (1 - a), g = data[i * 4 + 1] * a + 255 * (1 - a), b = data[i * 4 + 2] * a + 255 * (1 - a);
    lum[i] = 0.299 * r + 0.587 * g + 0.114 * b;
  }

  if (mode === "ink") {
    const t = otsu(lum), gain = 6, v = new Float32Array(n);
    let sr = 0, sg = 0, sb = 0, cnt = 0;
    for (let i = 0; i < n; i++) {
      const dark = opts.invert ? lum[i] - t : t - lum[i];
      v[i] = Math.max(0, Math.min(255, 128 - dark * gain));
      if (v[i] < 128) { sr += data[i * 4]; sg += data[i * 4 + 1]; sb += data[i * 4 + 2]; cnt++; }
    }
    const color = cnt ? hex(sr / cnt, sg / cnt, sb / cnt) : "#0f1a19";
    return [{ name: "로고", gray: { w, h, v }, color }];
  }

  // --- colors: 바탕색 = 테두리 픽셀의 중앙값
  const border: number[][] = [];
  for (let x = 0; x < w; x++) for (const y of [0, h - 1]) border.push(px(x, y));
  for (let y = 0; y < h; y++) for (const x of [0, w - 1]) border.push(px(x, y));
  const med = [0, 1, 2].map((c) => border.map((p) => p[c]).sort((a, b) => a - b)[border.length >> 1]);
  function px(x: number, y: number) {
    const i = (y * w + x) * 4, a = data[i + 3] / 255;
    return [data[i] * a + 255 * (1 - a), data[i + 1] * a + 255 * (1 - a), data[i + 2] * a + 255 * (1 - a)];
  }

  const fg: number[] = [];
  const isFg = new Uint8Array(n);
  const col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const p = px(i % w, (i / w) | 0);
    col[i * 3] = p[0]; col[i * 3 + 1] = p[1]; col[i * 3 + 2] = p[2];
    if (Math.hypot(p[0] - med[0], p[1] - med[1], p[2] - med[2]) > 60) { fg.push(i); isFg[i] = 1; }
  }
  const k = Math.max(1, Math.min(4, opts.k ?? 2));
  if (!fg.length) return [];

  /*
   * 🔴 **색 나누기는 «속» 픽셀로만 합니다** (2026-09-25 실측으로 고침).
   * 캔버스·포토샵에서 나온 로고는 가장자리가 부드럽게(안티에일리어싱) 번져 있어서, 빨강 원과 남색 글자의
   * 테두리에 «흰색과 섞인 중간색» 띠가 생깁니다. 이걸 k-평균에 같이 넣었더니 **중간색 띠가 한 색으로 뽑히고
   * 빨강·남색이 한 덩이로 합쳐졌습니다**(#ae2936 + #a598b1) — 그 띠가 «획 1.9mm·잡티 2개»로 판정됐습니다.
   * 그래서: ① 상하좌우가 전부 잉크인 «속» 픽셀로만 색을 정하고 ② 씨앗을 «바탕에서 가장 먼 색»부터 고르고
   * ③ 가장자리 픽셀은 주변 속 픽셀의 다수결로 붙입니다(letter_svg.py 가 네온 번짐에 쓰는 것과 같은 수법).
   */
  const core: number[] = [];
  for (const i of fg) {
    const x = i % w, y = (i / w) | 0;
    if (x > 0 && y > 0 && x < w - 1 && y < h - 1 && isFg[i - 1] && isFg[i + 1] && isFg[i - w] && isFg[i + w]) core.push(i);
  }
  const pool = core.length > 50 ? core : fg;
  const step = Math.max(1, Math.floor(pool.length / 4000));
  const dist2 = (i: number, c: number[]) => (col[i * 3] - c[0]) ** 2 + (col[i * 3 + 1] - c[1]) ** 2 + (col[i * 3 + 2] - c[2]) ** 2;
  const at = (i: number) => [col[i * 3], col[i * 3 + 1], col[i * 3 + 2]];

  // 씨앗: 바탕에서 가장 먼 색 → 그다음은 이미 고른 씨앗들에서 가장 먼 색
  let first = pool[0], fd0 = -1;
  for (let j = 0; j < pool.length; j += step) {
    const dd = dist2(pool[j], med);
    if (dd > fd0) { fd0 = dd; first = pool[j]; }
  }
  const cent: number[][] = [at(first)];
  while (cent.length < k) {
    let far = pool[0], fd = -1;
    for (let j = 0; j < pool.length; j += step) {
      const dd = Math.min(...cent.map((c) => dist2(pool[j], c)));
      if (dd > fd) { fd = dd; far = pool[j]; }
    }
    cent.push(at(far));
  }
  const lab = new Int8Array(n).fill(-1);
  const nearest = (i: number) => {
    let bi = 0, bd = Infinity;
    cent.forEach((c, ci) => {
      const dd = dist2(i, c);
      if (dd < bd) { bd = dd; bi = ci; }
    });
    return bi;
  };
  for (let it = 0; it < 10; it++) {
    const acc = cent.map(() => [0, 0, 0, 0]);
    for (const i of pool) {
      const bi = nearest(i);
      lab[i] = bi;
      acc[bi][0] += col[i * 3]; acc[bi][1] += col[i * 3 + 1]; acc[bi][2] += col[i * 3 + 2]; acc[bi][3]++;
    }
    acc.forEach((a, ci) => { if (a[3]) cent[ci] = [a[0] / a[3], a[1] / a[3], a[2] / a[3]]; });
  }

  // 가장자리: 이웃(5×5) 가운데 이미 색이 정해진 픽셀의 다수결 — 몇 번 번지면 다 붙습니다
  let left = fg.filter((i) => lab[i] < 0);
  for (let pass = 0; pass < 4 && left.length; pass++) {
    const next: number[] = [];
    const set: [number, number][] = [];
    for (const i of left) {
      const x = i % w, y = (i / w) | 0, votes = new Array(k).fill(0);
      for (let dy = -2; dy <= 2; dy++)
        for (let dx = -2; dx <= 2; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const l = lab[ny * w + nx];
          if (l >= 0) votes[l]++;
        }
      const best = votes.indexOf(Math.max(...votes));
      if (votes[best] > 0) set.push([i, best]);
      else next.push(i);
    }
    for (const [i, l] of set) lab[i] = l;
    left = next;
  }
  for (const i of left) lab[i] = nearest(i);

  return cent
    .map((c, ci) => {
      const v = new Float32Array(n).fill(255);
      let cnt = 0;
      for (let i = 0; i < n; i++)
        if (lab[i] === ci) { v[i] = 0; cnt++; }
      return { name: `색 ${ci + 1}`, gray: { w, h, v }, color: hex(c[0], c[1], c[2]), cnt };
    })
    .filter((l) => l.cnt > n * 0.002)
    .sort((a, b) => b.cnt - a.cnt)
    .map(({ gray, color }, i) => ({ name: `색 ${i + 1}`, gray, color }));
}

/** 그림 파일 → 픽셀 (긴 변을 `max` 로 줄여서) */
export async function imageDataOf(file: File, max: number): Promise<ImageData> {
  const bmp = await createImageBitmap(file);
  const s = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const cv = document.createElement("canvas");
  cv.width = Math.max(1, Math.round(bmp.width * s));
  cv.height = Math.max(1, Math.round(bmp.height * s));
  const ctx = cv.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.drawImage(bmp, 0, 0, cv.width, cv.height);
  return ctx.getImageData(0, 0, cv.width, cv.height);
}
