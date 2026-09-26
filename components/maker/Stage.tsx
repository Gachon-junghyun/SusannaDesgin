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
  type: "text" | "logo" | "patch" | "plate";
  /** 판(2026-09-26) — 색·테두리·철물(벽 좌표 경로). 철물은 돌출(까치발)·걸이(팔 + 봉 둘)에만 있습니다 */
  plate?: { fill: string; border?: string; borderW: number; hardware: string[] };
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
  /**
   * 두 손가락으로 고른 것을 키우고 돌립니다(폰, 2026-09-26). `k` = 처음 두 손가락 거리 대비 배율,
   * `deg` = 처음 각도 대비 돌린 각(°). 손을 떼면 `done` — 되돌리기 한 칸으로 쌓입니다.
   */
  onPinch?: (id: string, k: number, deg: number, done: boolean) => void;
  /** 두 손가락이 처음 닿았을 때(안내 말풍선 치우기) */
  onPinchStart?: () => void;
  /** 손가락 화면 — 손잡이를 44px 로 키우고, 두 번 두드리기·살짝 흔들림 무시를 켭니다 */
  touch?: boolean;
  /** 위·왼쪽 m 눈금자. 폰에서는 끕니다(화면을 무대에 다 줍니다) */
  rulers?: boolean;
  /** 보기 전용(공유 링크, F26-b) — 골라 옮기기·손잡이 없이 확대·이동만 됩니다 */
  readOnly?: boolean;
  /** 캔버스 크기(px)가 바뀔 때 — 「화면에 맞춤」 계산에 씁니다 */
  onMeasure?: (w: number, h: number) => void;
  /*
   * ---------- PRO 모드 (F26-g · 2026-09-26) ----------
   * 무대는 «어느 점을 어디로 끌었나(벽 좌표)» 만 알려 줍니다. 그 점을 글자 좌표로 되짚는 셈(회전·원근·격자 왜곡을 거꾸로)은
   * 에디터가 합니다 — 무대가 디자인 자료 모양을 알면 두 곳에서 같은 변형을 셈하게 됩니다.
   */
  /** 글자 한 자를 눌러 바로 끌기(두 번 누를 필요 없이). Shift 를 누른 채 끌면 전과 같이 글자 전체가 옮겨집니다 */
  glyphDrag?: boolean;
  onGlyphDrag?: (id: string, g: number, start: Pt, cur: Pt, done: boolean) => void;
  /** 점 편집·격자 손잡이 (벽 좌표) — 있으면 크기·회전 손잡이를 감춥니다(겹치면 못 잡습니다) */
  /** `hidden` 점은 안 그립니다(번호는 그대로 — 끌 때 에디터가 같은 번호로 찾습니다). 조절점은 고른 기준점 것만 보입니다 */
  pro?: { nodes: { p: Pt; anchor: boolean; hidden?: boolean; on?: boolean }[]; handles: [Pt, Pt][]; mesh?: { pts: Pt[]; cols: number; rows: number } } | null;
  onNodeDrag?: (i: number, p: Pt, done: boolean) => void;
  onMeshDrag?: (i: number, p: Pt, done: boolean) => void;
  svgRef: React.RefObject<SVGSVGElement | null>;
};

type Drag =
  | { kind: "gmove"; id: string; g: number; start: Pt }
  | { kind: "node"; i: number }
  | { kind: "mesh"; i: number }
  | { kind: "move"; id: string; ox: number; oy: number; start: Pt; touch?: boolean; sx?: number; sy?: number; moved?: boolean }
  | { kind: "resize"; id: string; c: Pt; start: Pt }
  | { kind: "rotate"; id: string; c: Pt }
  | { kind: "warp"; id: string; corner: number }
  | { kind: "pan"; start: [number, number]; v: View; touch?: boolean; moved?: boolean }
  /** 두 손가락 — 빈 곳이면 화면 확대·이동(`zoom`), 고른 것을 잡고 있었으면 그것의 크기·회전(`ipinch`) */
  | { kind: "zoom"; a: number; b: number; v: View; d0: number; anchor: Pt }
  | { kind: "ipinch"; id: string; a: number; b: number; d0: number; ang0: number; k: number; deg: number };

const RULER = 22;
/** 손가락이 이만큼(px) 안 움직였으면 «두드림»입니다 — 고르려다 조금 밀린 것을 옮기기로 치지 않습니다 */
const SLOP = 6;

export default function Stage({ svgRef, ...p }: Props) {
  const { design: d, kind } = p;
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const box = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const [px, setPx] = useState({ w: 800, h: 500 });
  const [panning, setPanning] = useState(false);
  /** 화면에 닿아 있는 손가락들 (포인터 번호 → 화면 좌표) */
  const pts = useRef(new Map<number, { x: number; y: number }>());
  /** 두 번 두드리기(글자 한 자 고르기) — 손가락은 dblclick 이 믿을 만하게 안 옵니다 */
  const lastTap = useRef<{ t: number; id: string } | null>(null);
  const R = p.rulers === false ? 0 : RULER;

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
      const w = Math.max(100, el.clientWidth - R), h = Math.max(100, el.clientHeight - R);
      setPx({ w, h });
      live.current.onMeasure?.(w, h);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [R]);

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
    // iOS 사파리는 두 손가락을 «페이지 확대»로 먼저 가져갑니다 — 무대 위에서만 막습니다(무대 밖 확대는 그대로)
    const noGesture = (e: Event) => e.preventDefault();
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("gesturestart", noGesture);
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("gesturestart", noGesture);
    };
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
    <div
      ref={box}
      className="relative h-full w-full touch-none select-none overflow-hidden overscroll-none bg-[#e4e7e6] [-webkit-touch-callout:none]"
      style={{ paddingLeft: R, paddingTop: R }}
    >
      {R > 0 && <Rulers view={p.view} vh={vh} px={px} wallW={d.wallW} wallH={d.wallH} />}
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
        onContextMenu={p.touch ? (e) => e.preventDefault() : undefined}
        onPointerDownCapture={(e) => {
          // 손가락을 먼저 셉니다(잡기 단계) — 두 번째 손가락이면 글자·손잡이까지 내려보내지 않고 두 손가락 동작을 시작합니다
          pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
          if (pts.current.size === 2 && !p.calib) {
            e.stopPropagation();
            startPinch(e);
          } else if (pts.current.size > 2) e.stopPropagation();
        }}
        onPointerDown={(e) => {
          if (p.calib) {
            p.onCalibPoint(toMm(e));
            return;
          }
          const t = e.target as Element;
          if (e.button === 1 || p.readOnly || t === e.currentTarget || t.hasAttribute("data-bg")) {
            const touch = e.pointerType === "touch";
            // 손가락은 «두드리면» 선택을 풉니다 — 화면을 밀 때마다 선택이 풀리면 칩·시트가 깜빡입니다
            if (!touch) p.onSelect(null);
            capture(e.currentTarget as Element, e.pointerId);
            drag.current = { kind: "pan", start: [e.clientX, e.clientY], v: p.view, touch };
            setPanning(true);
          }
        }}
        onPointerMove={(e) => {
          const at = pts.current.get(e.pointerId);
          if (at) {
            at.x = e.clientX;
            at.y = e.clientY;
          }
          const g = drag.current;
          if (!g) return;
          if (g.kind === "zoom" || g.kind === "ipinch") {
            pinchMove(g);
            return;
          }
          if (g.kind === "pan") {
            if (Math.hypot(e.clientX - g.start[0], e.clientY - g.start[1]) > SLOP) g.moved = true;
            p.onView({ x: g.v.x - (e.clientX - g.start[0]) * mmPerPx, y: g.v.y - (e.clientY - g.start[1]) * mmPerPx, w: g.v.w });
            return;
          }
          if (g.kind === "move" && g.touch && !g.moved) {
            if (Math.hypot(e.clientX - (g.sx ?? 0), e.clientY - (g.sy ?? 0)) < SLOP) return;
            g.moved = true;
          }
          handle(g, toMm(e), false, e.shiftKey);
        }}
        onPointerUp={(e) => release(e, false)}
        onPointerCancel={(e) => release(e, true)}
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
        {/* 🔴 사진 벽이면 이 바탕색은 그림으로 내보낼 때 빼야 합니다(2026-09-26 운영에서 밟음). 아래 <image> 는
            SVG→그림 변환에서 안 불러와져서(브라우저 보안) `composeJpeg` 가 사진을 캔버스에 먼저 그리는데,
            이 사각형이 같이 딸려 가 그 사진을 통째로 덮었습니다 — 견적에 «회색 벽 + 글씨만» 이 갔습니다. */}
        <rect data-bg="" data-export-skip={p.wall.photo ? "" : undefined} x={0} y={0} width={d.wallW} height={d.wallH} fill={p.wall.color} />
        {p.wall.photo && (
          <image data-bg="" data-export-skip="" className="[-webkit-user-drag:none]" href={p.wall.photo} x={0} y={0} width={d.wallW} height={d.wallH} preserveAspectRatio="xMidYMid slice" />
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

        {/* 판 (2026-09-26) — 철물 → 그림자 → 두께 → 앞면·테두리. 🔴 늘 글자·로고보다 먼저(뒤에) 그립니다 */}
        {p.items
          .filter((r) => r.type === "plate" && r.plate)
          .map((r) => {
            const pl = r.plate!, q = r.world[0];
            if (!q) return null;
            const tk = 24; // 판 두께의 «보이는» 양 — 바탕판(T5)과 같은 값
            return (
              <g key={r.id} style={{ cursor: p.readOnly ? undefined : "move" }} onPointerDown={(e) => startMove(e, r)}>
                <polygon data-export-skip="" points={r.quad.map((v) => v.join(",")).join(" ")} fill="transparent" />
                {pl.hardware.map((hd, i) => (
                  <path key={`hw${i}`} d={hd} fill={p.night ? "#1f2221" : "#34393a"} />
                ))}
                {!p.night && (
                  <g opacity={0.28} filter={`url(#boardsh-${uid})`} pointerEvents="none">
                    <path d={q.d} transform="translate(16 22)" fill="#000" />
                  </g>
                )}
                <path d={q.d} transform={`translate(${dir[0] * tk} ${dir[1] * tk})`} fill={shade(pl.fill, p.night ? 0.2 : 0.62)} pointerEvents="none" />
                <path
                  d={q.d}
                  fill={p.night ? shade(pl.fill, 0.32) : pl.fill}
                  stroke={pl.border ? (p.night ? shade(pl.border, 0.35) : pl.border) : undefined}
                  strokeWidth={pl.border ? pl.borderW : undefined}
                  strokeLinejoin="round"
                />
              </g>
            );
          })}

        {/* 글자·로고 */}
        {p.items
          .filter((r) => r.type === "text" || r.type === "logo")
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
                style={{ cursor: p.readOnly ? undefined : "move" }}
                onPointerDown={(e) => startMove(e, r)}
                onDoubleClick={(e) => {
                  if (p.readOnly) return;
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
            .filter((r) => r.type !== "patch" && !insidePlate(r, p.items))
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
            // 손가락이면 손잡이를 22px 로 그리고 44px 를 받습니다(애플·구글 터치 과녁 최소치)
            const hs = (p.touch ? 22 : 10) * U;
            const hit = 22 * U;
            const q = r.quad;
            const tm: Pt = [(q[0][0] + q[1][0]) / 2, (q[0][1] + q[1][1]) / 2];
            const ex = q[1][0] - q[0][0], ey = q[1][1] - q[0][1], el = Math.hypot(ex, ey) || 1;
            const nrm: Pt = [ey / el, -ex / el];
            const rd = (p.touch ? 46 : 32) * U;
            const rh: Pt = [tm[0] + nrm[0] * rd, tm[1] + nrm[1] * rd];
            const gq = p.glyph !== null ? r.glyphQuads[p.glyph] : null;
            return (
              <g data-export-skip="">
                <polygon points={q.map((v) => v.join(",")).join(" ")} fill="none" stroke="#00a79d" strokeWidth={U * 1.5} strokeDasharray={`${U * 6} ${U * 4}`} pointerEvents="none" />
                {gq && <polygon points={gq.map((v) => v.join(",")).join(" ")} fill="none" stroke="#ff5900" strokeWidth={U * 1.8} pointerEvents="none" />}
                {p.pro ? null : p.warpMode ? (
                  q.map((v, i) => {
                    const go = (e: React.PointerEvent) => begin(e, { kind: "warp", id: r.id, corner: i });
                    return (
                      <g key={i}>
                        {p.touch && <circle cx={v[0]} cy={v[1]} r={hit} fill="transparent" onPointerDown={go} />}
                        <circle cx={v[0]} cy={v[1]} r={p.touch ? hs * 0.5 : hs * 0.7} fill="#ff5900" stroke="#fff" strokeWidth={U * (p.touch ? 2.5 : 1.5)} style={{ cursor: "move" }} onPointerDown={go} />
                      </g>
                    );
                  })
                ) : (
                  <>
                    <line x1={tm[0]} y1={tm[1]} x2={rh[0]} y2={rh[1]} stroke="#00a79d" strokeWidth={U * 1.2} pointerEvents="none" />
                    {p.touch && <circle cx={rh[0]} cy={rh[1]} r={hit} fill="transparent" onPointerDown={(e) => begin(e, { kind: "rotate", id: r.id, c: [r.cx, r.cy] })} />}
                    <circle cx={rh[0]} cy={rh[1]} r={p.touch ? hs * 0.45 : hs * 0.6} fill="#fff" stroke="#00a79d" strokeWidth={U * 1.8} style={{ cursor: "grab" }} onPointerDown={(e) => begin(e, { kind: "rotate", id: r.id, c: [r.cx, r.cy] })} />
                    {p.touch && <rect x={q[2][0] - hit} y={q[2][1] - hit} width={hit * 2} height={hit * 2} fill="transparent" onPointerDown={(e) => begin(e, { kind: "resize", id: r.id, c: [r.cx, r.cy], start: toMm(e) })} />}
                    <rect x={q[2][0] - hs / 2} y={q[2][1] - hs / 2} width={hs} height={hs} rx={p.touch ? hs * 0.28 : 0} fill="#fff" stroke="#00a79d" strokeWidth={U * 1.8} style={{ cursor: "nwse-resize" }} onPointerDown={(e) => begin(e, { kind: "resize", id: r.id, c: [r.cx, r.cy], start: toMm(e) })} />
                  </>
                )}
              </g>
            );
          })()}

        {/* PRO — 격자(메쉬) · 조절선 · 점 (내보내기에는 안 나갑니다) */}
        {p.pro && !p.readOnly && (
          <g data-export-skip="">
            {p.pro.mesh &&
              (() => {
                const { pts, cols, rows } = p.pro.mesh;
                const at = (i: number, j: number) => pts[j * (cols + 1) + i];
                const lines: Pt[][] = [];
                for (let j = 0; j <= rows; j++) lines.push(Array.from({ length: cols + 1 }, (_, i) => at(i, j)));
                for (let i = 0; i <= cols; i++) lines.push(Array.from({ length: rows + 1 }, (_, j) => at(i, j)));
                return lines.map((l, k) => <polyline key={`ml${k}`} points={l.map((v) => v.join(",")).join(" ")} fill="none" stroke="#7b2d6b" strokeWidth={U * 1.2} strokeOpacity={0.8} pointerEvents="none" />);
              })()}
            {p.pro.handles.map(([a, b], i) => (
              <line key={`hl${i}`} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="#3d8bff" strokeWidth={U} pointerEvents="none" />
            ))}
            {p.pro.nodes.map((n, i) => {
              if (n.hidden) return null;
              const go = (e: React.PointerEvent) => begin(e, { kind: "node", i });
              // 붓·바탕체는 한 글자에 점이 수백 개라 크게 그리면 글자를 덮습니다(2026-09-26 실측 — 7px 네모가 «나» 를 다 가림)
              const s = (p.touch ? 10 : 5) * U;
              return (
                <g key={`n${i}`}>
                  {p.touch && <circle cx={n.p[0]} cy={n.p[1]} r={14 * U} fill="transparent" onPointerDown={go} />}
                  {n.anchor ? (
                    <rect x={n.p[0] - s / 2} y={n.p[1] - s / 2} width={s} height={s} fill={n.on ? "#3d8bff" : "#fff"} stroke="#3d8bff" strokeWidth={U} style={{ cursor: "move" }} onPointerDown={go} />
                  ) : (
                    <circle cx={n.p[0]} cy={n.p[1]} r={s * 0.5} fill="#3d8bff" stroke="#fff" strokeWidth={U * 0.8} style={{ cursor: "move" }} onPointerDown={go} />
                  )}
                </g>
              );
            })}
            {p.pro.mesh?.pts.map((q, i) => {
              const go = (e: React.PointerEvent) => begin(e, { kind: "mesh", i });
              return (
                <g key={`m${i}`}>
                  {p.touch && <circle cx={q[0]} cy={q[1]} r={20 * U} fill="transparent" onPointerDown={go} />}
                  <circle cx={q[0]} cy={q[1]} r={(p.touch ? 9 : 5.5) * U} fill="#fff" stroke="#7b2d6b" strokeWidth={U * 1.8} style={{ cursor: "move" }} onPointerDown={go} />
                </g>
              );
            })}
          </g>
        )}

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
    // 보기 전용이면 여기서 안 받고 무대로 흘려 보냅니다 — 글자 위를 끌어도 화면이 이동합니다
    if (p.readOnly || p.calib || e.button !== 0) return;
    e.stopPropagation();
    const touch = e.pointerType === "touch";
    // PRO — 글자 한 자를 누르면 그 한 자를 바로 끕니다(Shift 를 누르고 끌면 글자 전체)
    if (p.glyphDrag && r.type === "text" && !e.shiftKey) {
      const gl = (e.target as Element).getAttribute("data-glyph");
      if (gl !== null) {
        p.onGlyph(r.id, Number(gl));
        begin(e, { kind: "gmove", id: r.id, g: Number(gl), start: toMm(e) });
        return;
      }
    }
    if (touch) {
      // 두 번 두드리기 = 그 글자 한 자 (마우스의 두 번 누르기와 같은 일)
      const now = Date.now(), gl = (e.target as Element).getAttribute("data-glyph");
      const prev = lastTap.current;
      lastTap.current = { t: now, id: r.id };
      if (prev && prev.id === r.id && now - prev.t < 350 && gl !== null && r.type === "text") {
        lastTap.current = null;
        p.onGlyph(r.id, Number(gl));
        return;
      }
    }
    if (p.selected !== r.id) p.onSelect(r.id);
    begin(e, { kind: "move", id: r.id, ox: r.cx, oy: r.cy, start: toMm(e), touch, sx: e.clientX, sy: e.clientY });
  }

  /** 두 번째 손가락이 닿음 — 한 손가락으로 무엇을 하던 중이었나로 갈립니다 */
  function startPinch(e: React.PointerEvent) {
    const [a, b] = [...pts.current.keys()];
    const A = pts.current.get(a)!, B = pts.current.get(b)!;
    const g = drag.current;
    capture(e.currentTarget as Element, e.pointerId);
    setPanning(false);
    p.onPinchStart?.();
    const d0 = Math.max(1, Math.hypot(B.x - A.x, B.y - A.y));
    // 간판을 잡고 있었으면(옮기기·크기·회전) 그 간판을, 아니면 화면을
    if (!p.readOnly && p.onPinch && g && (g.kind === "move" || g.kind === "resize" || g.kind === "rotate")) {
      drag.current = { kind: "ipinch", id: g.id, a, b, d0, ang0: Math.atan2(B.y - A.y, B.x - A.x), k: 1, deg: 0 };
      return;
    }
    const r = svgRef.current!.getBoundingClientRect();
    const v = live.current.view;
    const k0 = v.w / r.width;
    const mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2;
    drag.current = { kind: "zoom", a, b, v, d0, anchor: [v.x + (mx - r.left) * k0, v.y + (my - r.top) * k0] };
  }

  function pinchMove(g: Extract<Drag, { kind: "zoom" | "ipinch" }>) {
    const A = pts.current.get(g.a), B = pts.current.get(g.b);
    if (!A || !B) return;
    const d = Math.max(1, Math.hypot(B.x - A.x, B.y - A.y));
    if (g.kind === "ipinch") {
      g.k = d / g.d0;
      g.deg = ((Math.atan2(B.y - A.y, B.x - A.x) - g.ang0) * 180) / Math.PI;
      p.onPinch?.(g.id, g.k, g.deg, false);
      return;
    }
    // 두 손가락 가운데 점 아래의 벽 자리가 손가락을 따라오게 — 벌리면 확대, 같이 밀면 이동
    const r = svgRef.current!.getBoundingClientRect();
    const w = Math.min(200000, Math.max(200, (g.v.w * g.d0) / d));
    const k1 = w / r.width;
    const mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2;
    p.onView({ x: g.anchor[0] - (mx - r.left) * k1, y: g.anchor[1] - (my - r.top) * k1, w });
  }

  /** 손가락·마우스를 뗌. 두 손가락 중 하나라도 떼면 그 동작은 끝입니다(남은 손가락이 갑자기 화면을 끌지 않게) */
  function release(e: React.PointerEvent, cancelled: boolean) {
    pts.current.delete(e.pointerId);
    const g = drag.current;
    if (g && (g.kind === "zoom" || g.kind === "ipinch")) {
      drag.current = null;
      if (g.kind === "ipinch") p.onPinch?.(g.id, g.k, g.deg, true);
      return;
    }
    drag.current = null;
    setPanning(false);
    if (!g) return;
    if (g.kind === "pan") {
      if (g.touch && !g.moved && !cancelled) p.onSelect(null);
      return;
    }
    // 손가락으로 두드리기만 했으면(안 움직임) 옮기기로 쌓지 않습니다
    if (g.kind === "move" && g.touch && !g.moved) return;
    handle(g, toMm(e), true, e.shiftKey);
  }

  function handle(g: Exclude<Drag, { kind: "pan" | "zoom" | "ipinch" }>, m: Pt, done: boolean, shift: boolean) {
    if (g.kind === "node") p.onNodeDrag?.(g.i, m, done);
    else if (g.kind === "mesh") p.onMeshDrag?.(g.i, m, done);
    else if (g.kind === "gmove") p.onGlyphDrag?.(g.id, g.g, g.start, m, done);
    else if (g.kind === "move") p.onMove(g.id, g.ox + m[0] - g.start[0], g.oy + m[1] - g.start[1], done);
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

/**
 * 판 안에 다 들어간 글자·로고인가 — 그러면 치수선은 판 것만 그립니다(2026-09-26 화면 확인: 걸이 판의 «800mm» 와
 * 그 안 글자의 «387mm» 가 같은 자리에 겹쳐 둘 다 안 읽혔습니다). 글자 높이는 오른쪽 칸에 그대로 있습니다.
 */
function insidePlate(r: RItem, all: RItem[]) {
  if (r.type !== "text" && r.type !== "logo") return false;
  const box = (q: Pt[]) => ({ x0: Math.min(...q.map((v) => v[0])), x1: Math.max(...q.map((v) => v[0])), y0: Math.min(...q.map((v) => v[1])), y1: Math.max(...q.map((v) => v[1])) });
  const a = box(r.quad);
  return all.some((pl) => {
    if (pl.type !== "plate") return false;
    const b = box(pl.quad);
    return a.x0 >= b.x0 && a.x1 <= b.x1 && a.y0 >= b.y0 && a.y1 <= b.y1;
  });
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
