import type ClipperLib from "clipper-lib";

import { parsePath, type Pt } from "@/lib/maker/geom";

/**
 * 글자 굵기 — 외곽선을 실제로 넓히고 좁힙니다 (F26-n «수산나 픽» · 2026-10-25).
 *
 * 🔴 **보이는 테두리(stroke)로 흉내 내지 않습니다.** 테두리로 굵게 보이게 하면 판정(가장 가는 획)·제작용 SVG·치수가
 * 전부 «굵게 하기 전» 모양으로 남아, 손님이 굵게 고른 간판이 «만들 수 없음»으로 나오거나 공장에 가는 외곽이 다릅니다.
 * 그래서 경로 자체를 옮깁니다(클리퍼 오프셋) — 그 뒤의 판정·SVG·치수는 굵어진 모양을 그대로 봅니다.
 *
 * - 클리퍼(`clipper-lib`, BSL 1.0)는 글꼴 공방(F26-m)이 이미 들인 것입니다. **굵기를 처음 바꿀 때만** 내려받습니다(`loadClipper`).
 * - 곡선은 꺾은선으로 풀어서 넓힙니다(0.4mm 오차). 글자 높이 200mm 이상인 간판에선 눈으로 차이가 안 납니다.
 * - 무대는 `fillRule="evenodd"` 로 칠하므로, 넓히기 전에 같은 규칙으로 한 번 정리합니다(겹친 획·구멍 방향이 제각각인 글꼴 대비).
 */
type CL = typeof ClipperLib;

let lib: Promise<CL> | null = null;
export const loadClipper = (): Promise<CL> =>
  (lib ??= import("clipper-lib").then((m) => ((m as unknown as { default?: CL }).default ?? (m as unknown as CL))));

/** 0.01mm 단위 정수 — 클리퍼는 정수 좌표로 셉니다 */
const S = 100;

/** 경로(M·L·C·Q·Z) → 닫힌 꺾은선들. 곡선은 길이에 맞춰 잘게 */
export function flattenPath(d: string, tol = 0.4): Pt[][] {
  const out: Pt[][] = [];
  let cur: Pt[] = [];
  let at: Pt = [0, 0];
  const close = () => {
    if (cur.length >= 3) out.push(cur);
    cur = [];
  };
  for (const s of parsePath(d)) {
    if (s.c === "M") {
      close();
      at = s.p[0];
      cur.push(at);
    } else if (s.c === "L") {
      at = s.p[0];
      cur.push(at);
    } else if (s.c === "C" || s.c === "Q") {
      const ctrl = [at, ...s.p];
      const len = ctrl.slice(1).reduce((a, p, i) => a + Math.hypot(p[0] - ctrl[i][0], p[1] - ctrl[i][1]), 0);
      const n = Math.max(2, Math.min(48, Math.ceil(Math.sqrt(len / tol))));
      for (let k = 1; k <= n; k++) {
        const t = k / n, u = 1 - t;
        const p: Pt =
          s.c === "C"
            ? [
                u * u * u * ctrl[0][0] + 3 * u * u * t * ctrl[1][0] + 3 * u * t * t * ctrl[2][0] + t * t * t * ctrl[3][0],
                u * u * u * ctrl[0][1] + 3 * u * u * t * ctrl[1][1] + 3 * u * t * t * ctrl[2][1] + t * t * t * ctrl[3][1],
              ]
            : [u * u * ctrl[0][0] + 2 * u * t * ctrl[1][0] + t * t * ctrl[2][0], u * u * ctrl[0][1] + 2 * u * t * ctrl[1][1] + t * t * ctrl[2][1]];
        cur.push(p);
      }
      at = s.p[s.p.length - 1];
    } else close();
  }
  close();
  return out;
}

/**
 * 외곽을 `mm` 만큼 바깥으로(음수면 안으로) 옮긴 경로. 모서리는 둥글게 이어집니다(채널 간판의 절곡 모서리와 같은 결).
 * 너무 가늘게 해서 획이 사라지면 그 조각은 빠집니다 — 판정이 «가장 가는 획»으로 알려 줍니다.
 */
export function thicken(CL: CL, d: string, mm: number): string {
  if (!mm || !d) return d;
  const paths = flattenPath(d).map((p) => p.map(([x, y]) => ({ X: Math.round(x * S), Y: Math.round(y * S) })));
  if (!paths.length) return d;
  const simple = CL.Clipper.SimplifyPolygons(paths, CL.PolyFillType.pftEvenOdd);
  const co = new CL.ClipperOffset(2, 0.25 * S);
  co.AddPaths(simple, CL.JoinType.jtRound, CL.EndType.etClosedPolygon);
  const sol = new CL.Paths();
  co.Execute(sol, mm * S);
  return sol
    .filter((p) => p.length >= 3)
    .map((p) => "M" + p.map((q) => `${(q.X / S).toFixed(2)},${(q.Y / S).toFixed(2)}`).join("L") + "Z")
    .join("");
}
