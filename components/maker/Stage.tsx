"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";

import type { MakerKind } from "@/config/maker";
import type { Design, Measured } from "@/lib/maker/design";
import { fmtMm } from "@/lib/maker/design";
import type { Pt } from "@/lib/maker/geom";

/**
 * 메이커의 무대 — 벽 위에 간판을 그립니다 (F26). 좌표계는 **벽의 mm** 입니다.
 *
 * 편집기답게(2026-09-25 사람 지시 *"에디터에 진짜 들어온 느낌"*): 벽 바깥은 회색 작업대, 위·왼쪽에
 * **m 눈금자**, Ctrl+휠로 확대, 빈 곳을 끌면 화면 이동. 손잡이는 셋 — 크기(오른쪽 아래) · 회전(위 동그라미) ·
 * 원근(네 모서리, 포토샵 «왜곡»처럼 벽면이 비스듬한 사진에 간판 면을 맞춤).
 *
 * 조명 표현은 3D 조명 실측(SIGNTYPES.md §8-4)의 약속을 따릅니다 — 번짐은 «세기»가 아니라 «넓게 옅게»
 * (세기를 올리면 획 속이 타서 ㅇ·ㅁ 이 메워짐), 후광은 **글자는 어둡고 벽이 번짐**(두 겹).
 * 번짐은 SVG 필터(단위 mm)로 합니다 — CSS blur 는 사파리와 «그림으로 내보내기»에서 믿을 수 없습니다.
 */

export type RPath = { d: string; color: string; glyph?: number };

/** 무대에 넘기는 «이미 벽 좌표로 옮긴» 아이템 */
export type RItem = {
  id: string;
  type: "text" | "logo" | "patch";
  /** 실제 크기 (회전·원근 전) */
  size: Measured;
  /** 벽 좌표로 옮긴 외곽선 */
  world: RPath[];
  /** 네 모서리 (벽 좌표) — 왼위·오위·오아래·왼아래 */
  quad: Pt[];
  cx: number;
  cy: number;
  /** 글자 높이 (번짐·트림 굵기의 기준) */
  letterH: number;
  /** 전기선 가림 바 (벽 좌표 네 점씩) */
  bars: Pt[][];
  /** 글자별 상자 (벽 좌표 네 점) — 선택 표시용 */
  glyphQuads: Record<number, Pt[]>;
  warped: boolean;
};

export type Calib = { a?: Pt; b?: Pt };
export type View = { x: number; y: number; w: number };

type Props = {
  design: Design;
  kind: MakerKind;
  items: RItem[];
  wall: { color: string; ink: string; photo?: string };
  night: boolean;
  ledOn: boolean;
  dims: boolean;
  selected: string | null;
  glyph: number | null;
  warpMode: boolean;
  board: { x: number; y: number; w: number; h: number } | null;
  calib: Calib | null;
  view: View;
  onView: (v: View) => void;
  onSelect: (id: string | null) => void;
  onGlyph: (id: string, g: number | null) => void;
  onMove: (id: string, x: number, y: number, done: boolean) => void;
  onResize: (id: string, factor: number, done: boolean) => void;
  onRotate: (id: string, deg: number, done: boolean) => void;
  onWarp: (id: string, corner: number, p: Pt, done: boolean) => void;
  onCalibPoint: (p: Pt) => void;
  /** 캔버스 크기(px)가 바뀔 때 — 「화면에 맞춤」 계산에 씁니다 */
  onMeasure?: (w: number, h: number) => void;
  svgRef: React.RefObject<SVGSVGElement | null>;
};

type Drag =
  | { kind: "move"; id: string; ox: number; oy: number; start: Pt }
  | { kind: "resize"; id: string; c: Pt; start: Pt }
  | { kind: "rotate"; id: string; c: Pt }
  | { kind: "warp"; id: string; corner: number }
  | { kind: "pan"; start: [number, number]; v: View };

const RULER = 22;

export default function Stage({ svgRef, ...p }: Props) {
  const { design: d, kind } = p;
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const box = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const [px, setPx] = useState({ w: 800, h: 500 });
  const [panning, setPanning] = useState(false);

  // 이벤트 처리기가 늘 최신 값을 보게 (휠·크기 감시는 한 번만 붙입니다)
  const live = useRef({ view: p.view, onView: p.onView, onMeasure: p.onMeasure });
  useEffect(() => {
    live.current = { view: p.view, onView: p.onView, onMeasure: p.onMeasure };
  });

  // 캔버스 크기 — 눈금자·손잡이 굵기가 «화면 픽셀» 기준이라 알아야 합니다
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const w = Math.max(100, el.clientWidth - RULER), h = Math.max(100, el.clientHeight - RULER);
      setPx({ w, h });
      live.current.onMeasure?.(w, h);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const vw = p.view.w, vh = (vw * px.h) / px.w;
  const mmPerPx = vw / px.w;
  const U = mmPerPx; // «화면 1px» 을 mm 로

  // Ctrl/⌘ + 휠 = 확대(커서 기준), 그냥 휠 = 이동 (트랙패드 두 손가락도 이동)
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const { view: v, onView } = live.current;
      const r = el.getBoundingClientRect();
      const k = v.w / r.width;
      if (e.ctrlKey || e.metaKey) {
        const f = Math.exp(e.deltaY * 0.0015);
        const mx = v.x + (e.clientX - r.left) * k, my = v.y + (e.clientY - r.top) * k;
        const w = Math.min(200000, Math.max(200, v.w * f));
        onView({ x: mx - (mx - v.x) * (w / v.w), y: my - (my - v.y) * (w / v.w), w });
      } else onView({ x: v.x + (e.shiftKey ? e.deltaY : e.deltaX) * k, y: v.y + (e.shiftKey ? 0 : e.deltaY) * k, w: v.w });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [svgRef]);

  const toMm = (e: { clientX: number; clientY: number }): Pt => {
    const svg = svgRef.current!;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const r = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    return [r.x, r.y];
  };

  const lit = p.night && p.ledOn;
  const front = lit && (kind.lit === "front" || kind.lit === "both");
  const halo = lit && (kind.lit === "halo" || kind.lit === "both");
  const depth = d.depth ?? kind.depthMm;
  const dir = ({ front: [0.55, 0.75], left: [-1, 0.15], right: [1, 0.15], below: [0.1, 1], above: [0.1, -1] } as Record<string, Pt>)[d.view ?? "below"];
  const depthK = d.view === "front" ? 0.12 : 0.32;
  const standoff = kind.standoffMm;
  const ink = p.night ? "#ffffff" : p.wall.ink;
  const blur = (id: string, mm: number, dilate = 0) => (
    <filter id={id} x="-50%" y="-50%" width="200%" height="200%">
      {dilate > 0 && <feMorphology operator="dilate" radius={dilate} />}
      <feGaussianBlur stdDeviation={mm} />
    </filter>
  );

  return (
    <div ref={box} className="relative h-full w-full overflow-hidden bg-[#e4e7e6]" style={{ paddingLeft: RULER, paddingTop: RULER }}>
      <Rulers view={p.view} vh={vh} px={px} wallW={d.wallW} wallH={d.wallH} />
      <svg
        ref={svgRef}
        data-wall-w={d.wallW}
        data-wall-h={d.wallH}
        viewBox={`${p.view.x} ${p.view.y} ${vw} ${vh}`}
        width={px.w}
        height={px.h}
        className="block touch-none select-none"
        role="img"
        aria-label="간판 미리보기"
        style={{ cursor: p.calib ? "crosshair" : panning ? "grabbing" : "default" }}
        onPointerDown={(e) => {
          if (p.calib) {
            p.onCalibPoint(toMm(e));
            return;
          }
          const t = e.target as Element;
          if (e.button === 1 || t === e.currentTarget || t.hasAttribute("data-bg")) {
            p.onSelect(null);
            capture(e.currentTarget as Element, e.pointerId);
            drag.current = { kind: "pan", start: [e.clientX, e.clientY], v: p.view };
            setPanning(true);
          }
        }}
        onPointerMove={(e) => {
          const g = drag.current;
          if (!g) return;
          if (g.kind === "pan") {
            p.onView({ x: g.v.x - (e.clientX - g.start[0]) * mmPerPx, y: g.v.y - (e.clientY - g.start[1]) * mmPerPx, w: g.v.w });
            return;
          }
          handle(g, toMm(e), false, e.shiftKey);
        }}
        onPointerUp={(e) => {
          const g = drag.current;
          drag.current = null;
          setPanning(false);
          if (g && g.kind !== "pan") handle(g, toMm(e), true, e.shiftKey);
        }}
      >
        <defs>
          <pattern id={`g1-${uid}`} width={100} height={100} patternUnits="userSpaceOnUse">
            <path d="M100 0H0V100" fill="none" stroke={p.wall.ink} strokeOpacity={0.08} strokeWidth={U * 0.8} />
          </pattern>
          <pattern id={`g10-${uid}`} width={1000} height={1000} patternUnits="userSpaceOnUse">
            <path d="M1000 0H0V1000" fill="none" stroke={p.wall.ink} strokeOpacity={0.2} strokeWidth={U * 1.1} />
          </pattern>
          {blur(`boardsh-${uid}`, 14)}
          {p.items.map((r) => {
            const lh = r.letterH;
            return (
              <g key={r.id}>
                {blur(`sh-${uid}-${r.id}`, 4 + standoff * 0.12)}
                {blur(`gl-${uid}-${r.id}`, Math.max(6, lh * 0.05))}
                {blur(`gl2-${uid}-${r.id}`, Math.max(18, lh * 0.15))}
                {blur(`ha-${uid}-${r.id}`, Math.max(18, lh * 0.15), Math.max(4, lh * 0.04))}
                {blur(`ht-${uid}-${r.id}`, Math.max(4, standoff * 0.28), Math.max(6, standoff * 0.35))}
              </g>
            );
          })}
        </defs>

        {/* 작업대 + 벽 */}
        <rect data-bg="" data-export-skip="" x={p.view.x - vw} y={p.view.y - vh} width={vw * 3} height={vh * 3} fill="#e4e7e6" />
        <rect data-bg="" x={0} y={0} width={d.wallW} height={d.wallH} fill={p.wall.color} />
        {p.wall.photo && (
          <image data-bg="" data-export-skip="" href={p.wall.photo} x={0} y={0} width={d.wallW} height={d.wallH} preserveAspectRatio="xMidYMid slice" />
        )}
        {d.grid !== false && (
          <g data-bg="" pointerEvents="none">
            <rect x={0} y={0} width={d.wallW} height={d.wallH} fill={`url(#g1-${uid})`} />
            <rect x={0} y={0} width={d.wallW} height={d.wallH} fill={`url(#g10-${uid})`} />
          </g>
        )}
        {p.night && <rect data-bg="" x={0} y={0} width={d.wallW} height={d.wallH} fill="#050a0a" opacity={0.76} />}
        <rect data-export-skip="" x={0} y={0} width={d.wallW} height={d.wallH} fill="none" stroke="#9aa3a1" strokeWidth={U} pointerEvents="none" />

        {/* 가리기 판 */}
        {p.items
          .filter((r) => r.type === "patch")
          .map((r) => (
            <path key={r.id} d={r.world[0]?.d} fill={r.world[0]?.color} opacity={p.night ? 0.35 : 1} style={{ cursor: "move" }} onPointerDown={(e) => startMove(e, r)} />
          ))}

        {/* 바탕판 (T5) — 그림자 + 두께 + 판 */}
        {p.board && (
          <g pointerEvents="none">
            {!p.night && <rect x={p.board.x + 18} y={p.board.y + 24} width={p.board.w} height={p.board.h} fill="#000" opacity={0.28} filter={`url(#boardsh-${uid})`} />}
            <rect x={p.board.x + dir[0] * 24} y={p.board.y + dir[1] * 24} width={p.board.w} height={p.board.h} fill={shade(d.board, p.night ? 0.2 : 0.6)} />
            <rect x={p.board.x} y={p.board.y} width={p.board.w} height={p.board.h} fill={p.night ? shade(d.board, 0.4) : d.board} />
          </g>
        )}

        {/* 글자·로고 */}
        {p.items
          .filter((r) => r.type !== "patch")
          .map((r) => {
            const lh = r.letterH;
            const shadowOff = 6 + standoff * 0.6;
            const dv = depth * depthK;
            const trimW = d.trim ? Math.max(3, lh * 0.012) : 0;
            const side = d.side || null;
            const F = (id: string) => `url(#${id}-${uid}-${r.id})`;
            const faces = (fill: (c: string) => string, extra?: React.SVGProps<SVGPathElement>) =>
              r.world.map((q, i) => <path key={i} d={q.d} fill={fill(q.color)} fillRule="evenodd" {...extra} />);
            const faceColor = (c: string) => (front ? litColor(c, d.led) : halo ? shade(c, 0.2) : p.night ? shade(c, 0.28) : c);
            return (
              <g
                key={r.id}
                style={{ cursor: "move" }}
                onPointerDown={(e) => startMove(e, r)}
                onDoubleClick={(e) => {
                  const g = (e.target as Element).getAttribute("data-glyph");
                  if (g !== null && r.type === "text") p.onGlyph(r.id, Number(g));
                }}
              >
                <polygon data-export-skip="" points={r.quad.map((q) => q.join(",")).join(" ")} fill="transparent" />
                {/* 전기선 가림 바 */}
                {r.bars.map((b, i) => (
                  <g key={`bar${i}`} pointerEvents="none">
                    {!p.night && <polygon points={b.map((q) => `${q[0] + 10},${q[1] + 14}`).join(" ")} fill="#000" opacity={0.25} filter={F("sh")} />}
                    <polygon points={b.map((q) => q.join(",")).join(" ")} fill={p.night ? shade(d.barColor ?? "#2b2f2e", 0.35) : d.barColor ?? "#2b2f2e"} />
                  </g>
                ))}
                {/* 낮 그림자 — 벽에서 띄운 만큼 멀어집니다(까치발은 그게 정의다) */}
                {!p.night && (
                  <g opacity={kind.lit === "standoff" ? 0.55 : 0.34} filter={F("sh")} pointerEvents="none">
                    <g transform={`translate(${shadowOff} ${shadowOff * 1.25})`}>{faces(() => "#000")}</g>
                  </g>
                )}
                {halo && (
                  <g pointerEvents="none">
                    <g opacity={0.9} filter={F("ha")}>{faces(() => d.led)}</g>
                    <g opacity={0.95} filter={F("ht")}>{faces(() => d.led)}</g>
                  </g>
                )}
                {front && (
                  <g pointerEvents="none">
                    <g opacity={0.45} filter={F("gl2")}>{faces((c) => litColor(c, d.led))}</g>
                    <g opacity={0.8} filter={F("gl")}>{faces((c) => litColor(c, d.led))}</g>
                  </g>
                )}
                {/* 옆면(두께) — 보는 쪽으로 겹겹이. 사진 속 간판을 아래·옆에서 보면 이 면이 보입니다 */}
                {depth > 8 &&
                  Array.from({ length: 10 }, (_, k) => 10 - k).map((k) => (
                    <g key={`ret${k}`} transform={`translate(${(dir[0] * dv * k) / 10} ${(dir[1] * dv * k) / 10})`} pointerEvents="none">
                      {faces((c) => {
                        const base = side ?? shade(c, 0.6);
                        return p.night ? shade(base, 0.3) : shade(base, 0.82 + (k / 10) * 0.18);
                      })}
                    </g>
                  ))}
                {/* 앞면 (+ 트림) */}
                {r.world.map((q, i) => (
                  <path
                    key={`f${i}`}
                    data-glyph={q.glyph}
                    d={q.d}
                    fillRule="evenodd"
                    fill={faceColor(q.color)}
                    stroke={trimW ? (p.night ? shade(d.trim!, 0.35) : d.trim) : undefined}
                    strokeWidth={trimW || undefined}
                    strokeLinejoin="round"
                  />
                ))}
              </g>
            );
          })}

        {/* 치수선 — 실제 크기(회전·원근 전)를 적습니다. 내보낸 그림에도 남깁니다 */}
        {p.dims &&
          p.items
            .filter((r) => r.type !== "patch")
            .map((r) => {
              const xs = r.quad.map((q) => q[0]), ys = r.quad.map((q) => q[1]);
              const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
              const gap = Math.max(16 * U, r.letterH * 0.08), fs = Math.max(11 * U, r.letterH * 0.06), sw = Math.max(U, fs * 0.08);
              const pre = r.warped ? "실제 " : "";
              return (
                <g key={`dim-${r.id}`} fill={ink} stroke={ink} strokeWidth={sw} fontFamily="'Malgun Gothic','Apple SD Gothic Neo',sans-serif" fontSize={fs} fontWeight={700} pointerEvents="none">
                  <line x1={x0} x2={x1} y1={y0 - gap} y2={y0 - gap} />
                  <line x1={x0} x2={x0} y1={y0 - gap * 1.4} y2={y0 - gap * 0.6} />
                  <line x1={x1} x2={x1} y1={y0 - gap * 1.4} y2={y0 - gap * 0.6} />
                  <text x={(x0 + x1) / 2} y={y0 - gap * 1.5} textAnchor="middle" stroke="none">
                    {pre}
                    {fmtMm(r.size.w)}
                  </text>
                  <line x1={x1 + gap} x2={x1 + gap} y1={y0} y2={y1} />
                  <line x1={x1 + gap * 0.6} x2={x1 + gap * 1.4} y1={y0} y2={y0} />
                  <line x1={x1 + gap * 0.6} x2={x1 + gap * 1.4} y1={y1} y2={y1} />
                  <text x={x1 + gap * 1.6} y={(y0 + y1) / 2 + fs * 0.35} stroke="none">
                    {pre}
                    {fmtMm(r.size.h)}
                  </text>
                </g>
              );
            })}

        {/* 선택 — 테두리 · 크기 · 회전 · 원근 손잡이 (내보내기에는 안 나갑니다) */}
        {p.selected &&
          (() => {
            const r = p.items.find((q) => q.id === p.selected);
            if (!r) return null;
            const hs = 10 * U;
            const q = r.quad;
            const tm: Pt = [(q[0][0] + q[1][0]) / 2, (q[0][1] + q[1][1]) / 2];
            const ex = q[1][0] - q[0][0], ey = q[1][1] - q[0][1], el = Math.hypot(ex, ey) || 1;
            const nrm: Pt = [ey / el, -ex / el];
            const rh: Pt = [tm[0] + nrm[0] * 32 * U, tm[1] + nrm[1] * 32 * U];
            const gq = p.glyph !== null ? r.glyphQuads[p.glyph] : null;
            return (
              <g data-export-skip="">
                <polygon points={q.map((v) => v.join(",")).join(" ")} fill="none" stroke="#00a79d" strokeWidth={U * 1.5} strokeDasharray={`${U * 6} ${U * 4}`} pointerEvents="none" />
                {gq && <polygon points={gq.map((v) => v.join(",")).join(" ")} fill="none" stroke="#ff5900" strokeWidth={U * 1.8} pointerEvents="none" />}
                {p.warpMode ? (
                  q.map((v, i) => (
                    <circle key={i} cx={v[0]} cy={v[1]} r={hs * 0.7} fill="#ff5900" stroke="#fff" strokeWidth={U * 1.5} style={{ cursor: "move" }} onPointerDown={(e) => begin(e, { kind: "warp", id: r.id, corner: i })} />
                  ))
                ) : (
                  <>
                    <line x1={tm[0]} y1={tm[1]} x2={rh[0]} y2={rh[1]} stroke="#00a79d" strokeWidth={U * 1.2} pointerEvents="none" />
                    <circle cx={rh[0]} cy={rh[1]} r={hs * 0.6} fill="#fff" stroke="#00a79d" strokeWidth={U * 1.8} style={{ cursor: "grab" }} onPointerDown={(e) => begin(e, { kind: "rotate", id: r.id, c: [r.cx, r.cy] })} />
                    <rect x={q[2][0] - hs / 2} y={q[2][1] - hs / 2} width={hs} height={hs} fill="#fff" stroke="#00a79d" strokeWidth={U * 1.8} style={{ cursor: "nwse-resize" }} onPointerDown={(e) => begin(e, { kind: "resize", id: r.id, c: [r.cx, r.cy], start: toMm(e) })} />
                  </>
                )}
              </g>
            );
          })()}

        {/* 축척 보정 십자선 */}
        {p.calib && (
          <g data-export-skip="" stroke="#ff5900" strokeWidth={U * 1.6} pointerEvents="none">
            {[p.calib.a, p.calib.b].map((pt, i) =>
              pt ? (
                <g key={i}>
                  <line x1={pt[0] - 14 * U} x2={pt[0] + 14 * U} y1={pt[1]} y2={pt[1]} />
                  <line x1={pt[0]} x2={pt[0]} y1={pt[1] - 14 * U} y2={pt[1] + 14 * U} />
                </g>
              ) : null,
            )}
            {p.calib.a && p.calib.b && <line x1={p.calib.a[0]} y1={p.calib.a[1]} x2={p.calib.b[0]} y2={p.calib.b[1]} strokeDasharray={`${8 * U} ${5 * U}`} />}
          </g>
        )}
      </svg>
    </div>
  );

  function begin(e: React.PointerEvent, g: Drag) {
    e.stopPropagation();
    capture(e.currentTarget as Element, e.pointerId);
    drag.current = g;
  }

  function startMove(e: React.PointerEvent, r: RItem) {
    if (p.calib || e.button !== 0) return;
    e.stopPropagation();
    if (p.selected !== r.id) p.onSelect(r.id);
    begin(e, { kind: "move", id: r.id, ox: r.cx, oy: r.cy, start: toMm(e) });
  }

  function handle(g: Exclude<Drag, { kind: "pan" }>, m: Pt, done: boolean, shift: boolean) {
    if (g.kind === "move") p.onMove(g.id, g.ox + m[0] - g.start[0], g.oy + m[1] - g.start[1], done);
    else if (g.kind === "resize") {
      const d0 = Math.hypot(g.start[0] - g.c[0], g.start[1] - g.c[1]), d1 = Math.hypot(m[0] - g.c[0], m[1] - g.c[1]);
      p.onResize(g.id, d0 > 1 ? d1 / d0 : 1, done);
    } else if (g.kind === "rotate") {
      let deg = (Math.atan2(m[1] - g.c[1], m[0] - g.c[0]) * 180) / Math.PI + 90;
      if (shift) deg = Math.round(deg / 15) * 15;
      p.onRotate(g.id, ((deg % 360) + 360) % 360, done);
    } else p.onWarp(g.id, g.corner, m, done);
  }
}

/** 끄는 동안 포인터를 무대에 묶습니다. 펜·일부 터치 기기에서 실패할 수 있어 삼킵니다(끌기는 그래도 됩니다) */
function capture(el: Element, id: number) {
  try {
    el.closest("svg")?.setPointerCapture(id);
  } catch {
    /* 이미 놓인 포인터 — 무시 */
  }
}

/* ================================================================ 눈금자 */

function Rulers({ view, vh, px, wallW, wallH }: { view: View; vh: number; px: { w: number; h: number }; wallW: number; wallH: number }) {
  const pxPerMm = px.w / view.w;
  const step = [10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000].find((s) => s * pxPerMm >= 64) ?? 10000;
  const minor = step / 5;
  const lab = (mm: number) => {
    const m = mm / 1000;
    return `${Number.isInteger(m) ? m : m.toFixed(step >= 100 ? 1 : 2)}m`;
  };
  const ticks = (from: number, len: number) => {
    const out: { v: number; major: boolean }[] = [];
    for (let v = Math.ceil(from / minor) * minor; v <= from + len; v += minor) {
      const r = Math.round(v / minor) * minor;
      out.push({ v: r, major: Math.abs(r / step - Math.round(r / step)) < 1e-6 });
    }
    return out;
  };
  const inX = (v: number) => v >= 0 && v <= wallW, inY = (v: number) => v >= 0 && v <= wallH;
  return (
    <>
      <div className="absolute left-0 top-0 z-10 border-b border-r border-[#c9cfcd] bg-[#f4f5f4]" style={{ width: RULER, height: RULER }} />
      <svg className="absolute top-0 z-10 bg-[#f4f5f4]" style={{ left: RULER, height: RULER, width: px.w }} aria-hidden="true">
        {ticks(view.x, view.w).map(({ v, major }) => {
          const x = (v - view.x) * pxPerMm;
          return (
            <g key={v} opacity={inX(v) ? 1 : 0.35}>
              <line x1={x} x2={x} y1={major ? 7 : 15} y2={RULER} stroke="#5a6b69" strokeWidth={1} />
              {major && (
                <text x={x + 3} y={10} fontSize={9} fill="#3a4745" fontFamily="sans-serif">
                  {lab(v)}
                </text>
              )}
            </g>
          );
        })}
        <line x1={0} x2={px.w} y1={RULER - 0.5} y2={RULER - 0.5} stroke="#c9cfcd" />
      </svg>
      <svg className="absolute left-0 z-10 bg-[#f4f5f4]" style={{ top: RULER, width: RULER, height: px.h }} aria-hidden="true">
        {ticks(view.y, vh).map(({ v, major }) => {
          const y = (v - view.y) * pxPerMm;
          return (
            <g key={v} opacity={inY(v) ? 1 : 0.35}>
              <line y1={y} y2={y} x1={major ? 7 : 15} x2={RULER} stroke="#5a6b69" strokeWidth={1} />
              {major && (
                <text x={10} y={y + 3} fontSize={9} fill="#3a4745" fontFamily="sans-serif" transform={`rotate(-90 10 ${y + 3})`}>
                  {lab(v)}
                </text>
              )}
            </g>
          );
        })}
        <line y1={0} y2={px.h} x1={RULER - 0.5} x2={RULER - 0.5} stroke="#c9cfcd" />
      </svg>
    </>
  );
}

/* ================================================================ 색 셈 */

function rgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16) || 0;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const toHex = (c: number[]) => "#" + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");

export function shade(hex: string, k: number) {
  return toHex(rgb(hex).map((v) => v * k));
}

/**
 * 켜진 앞면의 색 — 앞면(아크릴) 색에 LED 색을 비춘 것.
 * 🔴 완전한 흰색(#fff)으로 날리지 않습니다 — 획 속이 1.0 에 붙으면 글자 속이 메워져 보입니다(§8-4).
 */
function litColor(face: string, led: string) {
  const f = rgb(face), l = rgb(led);
  const lum = (f[0] * 0.299 + f[1] * 0.587 + f[2] * 0.114) / 255;
  const tint = f.map((v, i) => (v / 255) * l[i]);
  const mixK = lum > 0.85 ? 0.85 : 0.35;
  return toHex(tint.map((v, i) => Math.min(245, v * (1 - mixK) + l[i] * mixK + 30)));
}
