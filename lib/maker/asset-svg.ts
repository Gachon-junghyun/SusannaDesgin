/**
 * 프로젝트 에셋 SVG → 로고 아이템의 층 (F26-j · 2026-09-26).
 *
 * 올리는 쪽(클로드 코드의 업로더)이 SVG 를 **평평하게** 만들어 올립니다 — `<path fill d>` 만, 좌표는 절대값,
 * 명령은 M·L·C·Z 만(변형 `<g transform>`·사각형·원은 경로로 풀어 둠). 그래서 여기는 그 모양만 읽습니다.
 * 🔴 **모르는 모양이면 조용히 빼지 않고 멈춥니다** — 글자 한 획이 빠진 로고가 «성공»으로 벽에 오르면 못 알아챕니다(P6).
 * 색이 같은 경로는 한 층으로 묶습니다(층 = 아크릴·시트 한 색, 로고 아이템과 같은 약속).
 */
import type { LogoLayer } from "@/lib/maker/design";
import { mapPath } from "@/lib/maker/geom";

export type ParsedSvg = { layers: LogoLayer[]; srcW: number; srcH: number };

/** 🔴 `mapPath` 는 명령 글자마다 점 한 벌만 읽습니다(암묵 반복·상대좌표 없음) — 대문자 M·L·C·Z 만 받습니다 */
const OK_CMDS = /^[\s\d.,\-MLCZ]*$/;

function fillOf(el: Element): string | null {
  const st = el.getAttribute("style") ?? "";
  const m = /fill\s*:\s*([^;]+)/.exec(st);
  const f = (m?.[1] ?? el.getAttribute("fill") ?? "").trim();
  if (!f || f === "none" || f === "transparent") return null;
  return f;
}

export function parseAssetSvg(text: string): ParsedSvg {
  const doc = new DOMParser().parseFromString(text, "image/svg+xml");
  const svg = doc.documentElement;
  if (!svg || svg.nodeName.toLowerCase() !== "svg" || doc.querySelector("parsererror")) throw new Error("SVG 를 읽지 못했습니다.");
  const vb = (svg.getAttribute("viewBox") ?? "").trim().split(/[\s,]+/).map(Number);
  if (vb.length !== 4 || vb.some((v) => !Number.isFinite(v)) || vb[2] <= 0 || vb[3] <= 0) throw new Error("SVG 에 viewBox 가 없습니다 — 업로더로 다시 올려 주세요.");
  const [x0, y0, w, h] = vb;
  if (svg.querySelector("[transform]")) throw new Error("평평하지 않은 SVG 입니다(변형이 남아 있음) — 업로더로 다시 올려 주세요.");
  const odd = svg.querySelector("rect,circle,ellipse,polygon,polyline,line,text,image,use");
  if (odd) throw new Error(`경로가 아닌 모양(${odd.nodeName})이 들어 있는 SVG 입니다 — 업로더로 다시 올려 주세요.`);
  const byColor = new Map<string, string>();
  for (const p of Array.from(svg.querySelectorAll("path"))) {
    const d = p.getAttribute("d") ?? "";
    const color = fillOf(p) ?? fillOf(p.parentElement ?? p);
    if (!d || !color) continue;
    if (!OK_CMDS.test(d)) throw new Error("M·L·C·Z 밖의 명령이 든 경로가 있습니다 — 업로더로 다시 올려 주세요.");
    byColor.set(color, (byColor.get(color) ?? "") + mapPath(d, (q) => [q[0] - x0, q[1] - y0]));
  }
  if (!byColor.size) throw new Error("SVG 안에 칠해진 경로가 없습니다.");
  return {
    layers: [...byColor].map(([color, d], i) => ({ name: byColor.size > 1 ? `색 ${i + 1}` : "로고", d, color })),
    srcW: w,
    srcH: h,
  };
}
