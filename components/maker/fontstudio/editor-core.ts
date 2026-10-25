/**
 * 글자 고치기 캔버스 (F26-m 3단계, 2026-10-25) — 시제품 `page/app.js` 의 «점, 선택» 도구와 «점 도구 단추»를 옮긴 것.
 *
 * 🔴 **펜·지우개는 없습니다**(6단계, perfect-freehand 와 함께). 자모 칸·틀 고치기도 없습니다 — 음절 한 자(덮어쓰기)만 고칩니다.
 * 좌표는 음절 네모 0~1000(y 아래로), 윤곽은 v2 노드 `[x, y, ix, iy, ox, oy, s]`(CONTRACT §7). 기하는 `lib/maker/hfont/geom.ts`.
 *
 * React 밖의 작은 상태 기계입니다 — 끌 때마다 React 를 다시 그리지 않으려고(점이 수백 개). 화면 단추가 보는 값만 `onState` 로 알립니다.
 */
import ClipperLib from "clipper-lib";

import type { Affine } from "@/lib/maker/geom";
import * as G from "@/lib/maker/hfont/geom";

type Contour = G.Contour;
type P = number[];
export type Tool = "node" | "select";
export type EditorState = { tool: Tool; multi: boolean; nodes: number; sel: number; canUndo: boolean; canRedo: boolean; edited: boolean };
type Snap = { work: Contour[]; edited: boolean };
type Gesture =
  | { kind: "handle"; ci: number; i: number; which: "in" | "out"; snap: Snap; moved?: boolean }
  | { kind: "nodes"; start: P; last: P; snap: Snap; moved: boolean }
  | { kind: "segment"; seg: { ci: number; i: number; t: number }; start: P }
  | { kind: "box"; start: P }
  | { kind: "move" | "scale" | "rotate"; base: Contour[]; targets: number[][] | null; snap: Snap; start?: P; anchor?: P; from?: P; c?: P; a0?: number; moved?: boolean }
  | { kind: "pan"; last: number[] };

const C = { ink: "#0f1a19", ghost: "rgba(15,26,25,0.12)", accent: "#00726c", line: "#e3e6e4", paper: "#ffffff", frame: "#cfd5d3" };
const CL = ClipperLib;

export class GlyphEditor {
  work: Contour[] = [];
  private ghost: Contour[] = [];
  private sel: number[][] = [];
  private tool: Tool = "node";
  private multi = false;
  private edited = false;
  private undoStack: Snap[] = [];
  private redoStack: Snap[] = [];
  private view = { s: 0.5, ox: 0, oy: 0 };
  private g: Gesture | null = null;
  private box: [P, P] | null = null;
  private raf = 0;
  private refitBase: { work: Contour[]; snap: Snap } | null = null;
  private lastTap = { t: 0, ci: -1, i: -1 };
  private ctx: CanvasRenderingContext2D;
  private ro: ResizeObserver;
  roundR = 14;

  constructor(
    private cv: HTMLCanvasElement,
    private cb: { onState: (s: EditorState) => void; onCommit: (work: Contour[] | null) => void; toast: (m: string) => void },
  ) {
    this.ctx = cv.getContext("2d")!;
    cv.addEventListener("pointerdown", this.down);
    cv.addEventListener("pointermove", this.move);
    cv.addEventListener("pointerup", this.up);
    cv.addEventListener("pointercancel", this.cancel);
    cv.addEventListener("wheel", this.wheel, { passive: false });
    this.ro = new ResizeObserver(() => {
      this.resize();
      this.fit();
    });
    this.ro.observe(cv.parentElement!);
  }
  destroy() {
    this.cv.removeEventListener("pointerdown", this.down);
    this.cv.removeEventListener("pointermove", this.move);
    this.cv.removeEventListener("pointerup", this.up);
    this.cv.removeEventListener("pointercancel", this.cancel);
    this.cv.removeEventListener("wheel", this.wheel);
    this.ro.disconnect();
    cancelAnimationFrame(this.raf);
  }

  /** 글자 열기 — `start` 는 고친 윤곽(있으면) 또는 바탕 글꼴 모양, `ghost` 는 바탕 글꼴 모양(회색) */
  load(start: Contour[], ghost: Contour[], edited: boolean) {
    this.work = G.cloneAll(start);
    this.ghost = ghost;
    this.edited = edited;
    this.sel = [];
    this.undoStack = [];
    this.redoStack = [];
    this.fit();
    this.emit();
  }

  /* ---------- 상태 ---------- */
  private emit() {
    this.cb.onState({
      tool: this.tool,
      multi: this.multi,
      nodes: this.work.reduce((n, c) => n + c.n.length, 0),
      sel: this.sel.length,
      canUndo: this.undoStack.length > 0,
      canRedo: this.redoStack.length > 0,
      edited: this.edited,
    });
    this.draw();
  }
  private snap(): Snap {
    return { work: G.cloneAll(this.work), edited: this.edited };
  }
  /** 시제품 commit — 되돌리기에 넣고, 가장 큰 윤곽 방향으로 맞추고, 문서에 적음 */
  private commit(before: Snap) {
    this.undoStack.push(before);
    if (this.undoStack.length > 120) this.undoStack.shift();
    this.redoStack = [];
    this.work = G.orientByLargest(this.work.filter((c) => c.n.length >= 2));
    this.edited = true;
    this.cb.onCommit(this.work);
    this.emit();
  }
  private restore(s: Snap) {
    this.work = G.cloneAll(s.work);
    this.edited = s.edited;
    this.sel = [];
    this.cb.onCommit(this.edited ? this.work : null);
    this.emit();
  }
  undo() {
    const s = this.undoStack.pop();
    if (!s) return this.cb.toast("되돌릴 것이 없습니다.");
    this.redoStack.push(this.snap());
    this.restore(s);
  }
  redo() {
    const s = this.redoStack.pop();
    if (!s) return this.cb.toast("다시 할 것이 없습니다.");
    this.undoStack.push(this.snap());
    this.restore(s);
  }
  /** «처음 모양으로» — 바탕 글꼴 모양으로 돌아가고 고친 기록을 지웁니다(되돌리기 가능) */
  reset() {
    if (!this.edited) return this.cb.toast("아직 고치지 않은 글자입니다.");
    this.undoStack.push(this.snap());
    this.redoStack = [];
    this.work = G.cloneAll(this.ghost);
    this.edited = false;
    this.sel = [];
    this.cb.onCommit(null);
    this.emit();
  }
  setTool(t: Tool) {
    this.tool = t;
    if (t !== "node") this.sel = this.tool === "select" ? this.sel : [];
    this.emit();
  }
  setMulti(on: boolean) {
    this.multi = on;
    this.emit();
  }

  /* ---------- 점 도구 단추 (시제품 그대로) ---------- */
  private withSnap(fn: () => boolean | void) {
    const before = this.snap();
    if (fn() !== false) this.commit(before);
  }
  private byContour() {
    const m: Record<number, number[]> = {};
    this.sel.forEach((s) => (m[s[0]] = m[s[0]] || []).push(s[1]));
    return m;
  }
  deleteSelected() {
    if (!this.sel.length) return this.cb.toast("지울 점을 먼저 고르십시오.");
    this.withSnap(() => {
      const m = this.byContour();
      Object.keys(m).forEach((ci) => m[+ci].sort((a, b) => b - a).forEach((i) => G.deleteNode(this.work[+ci], i)));
      this.work = this.work.filter((c) => c.n.length >= 3);
      this.sel = [];
    });
  }
  toggleSmooth() {
    if (!this.sel.length) return this.cb.toast("바꿀 점을 먼저 고르십시오.");
    this.withSnap(() => {
      const anyCorner = this.sel.some((s) => !this.work[s[0]].n[s[1]][6]);
      this.sel.forEach((s) => G.setSmooth(this.work[s[0]], s[1], anyCorner));
    });
  }
  roundSelected() {
    if (!this.sel.length) return this.cb.toast("둥글게 할 모서리 점을 고르십시오.");
    this.withSnap(() => {
      const m = this.byContour();
      Object.keys(m).forEach((ci) => m[+ci].sort((a, b) => b - a).forEach((i) => G.roundCorner(this.work[+ci], i, this.roundR)));
      this.sel = [];
    });
  }
  tame() {
    let n = 0;
    this.withSnap(() => {
      this.work.forEach((c) => (n += G.tameSpikes(c, { radius: this.roundR })));
      this.sel = [];
      if (!n) return false;
    });
    this.cb.toast(n ? `꺾임 ${n}곳을 다듬었습니다.` : "다듬을 꺾임이 없습니다.");
  }
  nudge(dx: number, dy: number) {
    if (!this.sel.length) return;
    this.withSnap(() => this.sel.forEach((s) => G.moveNode(this.work[s[0]], s[1], dx, dy)));
  }
  refitStart() {
    if (!this.refitBase) this.refitBase = { work: G.cloneAll(this.work), snap: this.snap() };
  }
  refitApply(err: number) {
    this.refitStart();
    this.sel = [];
    this.work = this.refitBase!.work.length ? G.refit(this.refitBase!.work, err, 55) : [];
    this.emit();
  }
  refitEnd() {
    if (!this.refitBase) return;
    const s = this.refitBase.snap;
    this.refitBase = null;
    this.commit(s);
  }
  /** 그림에서 딴 윤곽 — 바꾸기 또는 더하기(클리퍼 합집합) */
  applyImport(result: Contour[], mode: "replace" | "add") {
    if (!result.length) return;
    this.withSnap(() => {
      if (mode === "add" && this.work.length) {
        const merged = G.union(CL, G.flattenAll(this.work, 0.3).concat(G.flattenAll(result, 0.3)));
        this.work = G.polygonsToContours(merged, 1.5, 55);
      } else this.work = G.cloneAll(result);
      this.sel = [];
    });
  }

  /* ---------- 화면 ---------- */
  private resize() {
    const r = this.cv.parentElement!.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
    this.cv.width = Math.round(r.width * dpr);
    this.cv.height = Math.round(r.height * dpr);
    this.cv.style.width = `${r.width}px`;
    this.cv.style.height = `${r.height}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  fit() {
    const r = this.cv.parentElement!.getBoundingClientRect(), size = Math.min(r.width, r.height || r.width), pad = size * 0.06;
    this.view.s = (size - pad * 2) / 1000;
    this.view.ox = (r.width - 1000 * this.view.s) / 2;
    this.view.oy = ((r.height || size) - 1000 * this.view.s) / 2;
    this.draw();
  }
  private toScreen = (p: P): P => [p[0] * this.view.s + this.view.ox, p[1] * this.view.s + this.view.oy];
  private toSyl = (x: number, y: number): P => [(x - this.view.ox) / this.view.s, (y - this.view.oy) / this.view.s];
  private pathOf(cs: Contour[]) {
    const p = new Path2D(), m = this.toScreen;
    cs.forEach((c) => {
      if (!c.n.length) return;
      const a = m(c.n[0]);
      p.moveTo(a[0], a[1]);
      for (let i = 0; i < c.n.length; i++) {
        const s = G.segment(c, i), p1 = m(s[1]), p2 = m(s[2]), p3 = m(s[3]);
        if (G.isLineSeg(s)) p.lineTo(p3[0], p3[1]);
        else p.bezierCurveTo(p1[0], p1[1], p2[0], p2[1], p3[0], p3[1]);
      }
      p.closePath();
    });
    return p;
  }
  private draw() {
    if (!this.raf) this.raf = requestAnimationFrame(() => {
      this.raf = 0;
      this.paint();
    });
  }
  private isSel(ci: number, i: number) {
    return this.sel.some((s) => s[0] === ci && s[1] === i);
  }
  private paint() {
    const ctx = this.ctx, r = this.cv.parentElement!.getBoundingClientRect();
    ctx.clearRect(0, 0, r.width, r.height);
    const a = this.toScreen([0, 0]), b = this.toScreen([1000, 1000]);
    ctx.fillStyle = C.paper;
    ctx.fillRect(a[0], a[1], b[0] - a[0], b[1] - a[1]);
    ctx.save();
    ctx.strokeStyle = C.line;
    ctx.lineWidth = 1;
    for (let g = 100; g < 1000; g += 100) {
      const p = this.toScreen([g, 0]), q = this.toScreen([g, 1000]), u = this.toScreen([0, g]), v = this.toScreen([1000, g]);
      ctx.beginPath();
      ctx.moveTo(p[0], p[1]);
      ctx.lineTo(q[0], q[1]);
      ctx.moveTo(u[0], u[1]);
      ctx.lineTo(v[0], v[1]);
      ctx.stroke();
    }
    ctx.strokeStyle = C.frame;
    ctx.strokeRect(a[0], a[1], b[0] - a[0], b[1] - a[1]);
    ctx.restore();
    if (this.edited && this.ghost.length) {
      ctx.fillStyle = C.ghost;
      ctx.fill(this.pathOf(this.ghost), "nonzero");
    }
    if (this.work.length) {
      ctx.fillStyle = C.ink;
      ctx.globalAlpha = 0.82;
      ctx.fill(this.pathOf(this.work), "nonzero");
      ctx.globalAlpha = 1;
    }
    this.paintNodes();
    if (this.tool === "select") this.paintBox();
    if (this.box) {
      const p = this.toScreen(this.box[0]), q = this.toScreen(this.box[1]);
      ctx.save();
      ctx.strokeStyle = C.accent;
      ctx.setLineDash([5, 4]);
      ctx.strokeRect(p[0], p[1], q[0] - p[0], q[1] - p[1]);
      ctx.restore();
    }
  }
  private paintNodes() {
    const ctx = this.ctx;
    ctx.save();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = C.accent;
    ctx.stroke(this.pathOf(this.work));
    this.work.forEach((c, ci) =>
      c.n.forEach((p, i) => {
        const q = this.toScreen(p), sel = this.isSel(ci, i);
        if (this.tool === "node" && sel) {
          [[p[2], p[3]], [p[4], p[5]]].forEach((h) => {
            if (Math.hypot(h[0], h[1]) < 1e-6) return;
            const e = this.toScreen([p[0] + h[0], p[1] + h[1]]);
            ctx.strokeStyle = C.accent;
            ctx.beginPath();
            ctx.moveTo(q[0], q[1]);
            ctx.lineTo(e[0], e[1]);
            ctx.stroke();
            ctx.fillStyle = C.paper;
            ctx.beginPath();
            ctx.arc(e[0], e[1], 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
          });
        }
        const r = sel ? 6 : 4;
        ctx.fillStyle = sel ? C.accent : C.paper;
        ctx.strokeStyle = sel ? C.accent : C.ink;
        ctx.beginPath();
        if (p[6]) ctx.arc(q[0], q[1], r, 0, Math.PI * 2);
        else ctx.rect(q[0] - r, q[1] - r, r * 2, r * 2);
        ctx.fill();
        ctx.stroke();
      }),
    );
    ctx.restore();
  }
  private selBox() {
    const pts: P[] = [];
    if (this.sel.length) this.sel.forEach((s) => this.work[s[0]]?.n[s[1]] && pts.push(this.work[s[0]].n[s[1]]));
    else this.work.forEach((c) => G.flatten(c, 2).forEach((p) => pts.push(p)));
    return pts.length ? G.bbox([pts]) : null;
  }
  private paintBox() {
    const b = this.selBox();
    if (!b) return;
    const ctx = this.ctx, a = this.toScreen([b[0], b[1]]), c = this.toScreen([b[2], b[3]]);
    ctx.save();
    ctx.strokeStyle = C.accent;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(a[0], a[1], c[0] - a[0], c[1] - a[1]);
    ctx.setLineDash([]);
    ctx.fillStyle = C.accent;
    [[a[0], a[1]], [c[0], a[1]], [c[0], c[1]], [a[0], c[1]]].forEach((q) => ctx.fillRect(q[0] - 6, q[1] - 6, 12, 12));
    const top = [(a[0] + c[0]) / 2, a[1] - 28];
    ctx.beginPath();
    ctx.moveTo(top[0], a[1]);
    ctx.lineTo(top[0], top[1]);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(top[0], top[1], 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /* ---------- 끌기 ---------- */
  private hitR(e: PointerEvent) {
    return (e.pointerType === "mouse" ? 12 : 22) / this.view.s;
  }
  private at(e: { clientX: number; clientY: number }): P {
    const r = this.cv.getBoundingClientRect();
    return this.toSyl(e.clientX - r.left, e.clientY - r.top);
  }
  private hitNode(p: P, r: number) {
    let best: { ci: number; i: number; d: number } | null = null;
    this.work.forEach((c, ci) => c.n.forEach((q, i) => {
      const d = G.dist(p, q);
      if (d < r && (!best || d < best.d)) best = { ci, i, d };
    }));
    return best as { ci: number; i: number; d: number } | null;
  }
  private hitHandle(p: P, r: number) {
    let best: { ci: number; i: number; which: "in" | "out"; d: number } | null = null;
    this.sel.forEach((s) => {
      const q = this.work[s[0]]?.n[s[1]];
      if (!q) return;
      ([["in", q[2], q[3]], ["out", q[4], q[5]]] as const).forEach((h) => {
        if (Math.hypot(h[1], h[2]) < 1e-6) return;
        const d = G.dist(p, [q[0] + h[1], q[1] + h[2]]);
        if (d < r && (!best || d < best.d)) best = { ci: s[0], i: s[1], which: h[0], d };
      });
    });
    return best as { ci: number; i: number; which: "in" | "out"; d: number } | null;
  }
  private down = (e: PointerEvent) => {
    if (this.g) return;
    try {
      this.cv.setPointerCapture(e.pointerId);
    } catch {
      /* 기기에 따라 던집니다 */
    }
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      this.g = { kind: "pan", last: [e.clientX, e.clientY] };
      return;
    }
    const p = this.at(e), r = this.hitR(e), multi = this.multi || e.shiftKey;
    if (this.tool === "select") return this.selectDown(p, r);
    const h = this.hitHandle(p, r);
    if (h) {
      this.g = { kind: "handle", ci: h.ci, i: h.i, which: h.which, snap: this.snap() };
      return;
    }
    const n = this.hitNode(p, r);
    if (n) {
      const now = Date.now();
      if (now - this.lastTap.t < 320 && this.lastTap.ci === n.ci && this.lastTap.i === n.i) {
        // 두 번 누르기 = 부드러운 점 ↔ 뾰족한 점
        this.withSnap(() => G.setSmooth(this.work[n.ci], n.i, !this.work[n.ci].n[n.i][6]));
        this.lastTap.t = 0;
        return;
      }
      this.lastTap = { t: now, ci: n.ci, i: n.i };
      if (!this.isSel(n.ci, n.i)) this.sel = multi ? this.sel.concat([[n.ci, n.i]]) : [[n.ci, n.i]];
      this.g = { kind: "nodes", start: p, last: p, snap: this.snap(), moved: false };
      this.emit();
      return;
    }
    const seg = G.nearestOnContours(this.work, p);
    if (seg && seg.d < r) {
      this.g = { kind: "segment", seg, start: p };
      return;
    }
    this.g = { kind: "box", start: p };
    this.box = [p, p];
  };
  private selectDown(p: P, r: number) {
    const b = this.selBox();
    if (!b) return;
    const corners: P[] = [[b[0], b[1]], [b[2], b[1]], [b[2], b[3]], [b[0], b[3]]];
    const cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2, rot = [cx, b[1] - 28 / this.view.s];
    const targets = this.sel.length ? this.sel.slice() : null, base = G.cloneAll(this.work), snap = this.snap();
    if (G.dist(p, rot) < r) {
      this.g = { kind: "rotate", c: [cx, cy], a0: Math.atan2(p[1] - cy, p[0] - cx), base, targets, snap };
      return;
    }
    for (let k = 0; k < 4; k++) if (G.dist(p, corners[k]) < r) {
      this.g = { kind: "scale", anchor: corners[(k + 2) % 4], from: corners[k], base, targets, snap };
      return;
    }
    if (p[0] >= b[0] - r && p[0] <= b[2] + r && p[1] >= b[1] - r && p[1] <= b[3] + r) this.g = { kind: "move", start: p, base, targets, snap };
  }
  private move = (e: PointerEvent) => {
    const g = this.g;
    if (!g) return;
    if (g.kind === "pan") {
      this.view.ox += e.clientX - g.last[0];
      this.view.oy += e.clientY - g.last[1];
      g.last = [e.clientX, e.clientY];
      return this.draw();
    }
    const p = this.at(e);
    if (g.kind === "handle") {
      G.setHandle(this.work[g.ci], g.i, g.which, p);
      g.moved = true;
    } else if (g.kind === "nodes") {
      if (!g.moved && G.dist(p, g.start) < 2 / this.view.s) return;
      const dx = p[0] - g.last[0], dy = p[1] - g.last[1];
      g.moved = true;
      g.last = p;
      this.sel.forEach((s) => G.moveNode(this.work[s[0]], s[1], dx, dy));
    } else if (g.kind === "box") this.box = [g.start, p];
    else if (g.kind === "move" || g.kind === "scale" || g.kind === "rotate") {
      let m: Affine | null = null;
      if (g.kind === "move") m = [1, 0, 0, 1, p[0] - g.start![0], p[1] - g.start![1]];
      else if (g.kind === "scale") {
        let sx = (p[0] - g.anchor![0]) / (g.from![0] - g.anchor![0] || 1), sy = (p[1] - g.anchor![1]) / (g.from![1] - g.anchor![1] || 1);
        if (this.multi || e.shiftKey) {
          const u = Math.max(Math.abs(sx), Math.abs(sy));
          sx = Math.sign(sx) * u;
          sy = Math.sign(sy) * u;
        }
        m = G.aroundPoint([sx, 0, 0, sy, 0, 0], g.anchor![0], g.anchor![1]);
      } else {
        const a = Math.atan2(p[1] - g.c![1], p[0] - g.c![0]) - g.a0!, co = Math.cos(a), si = Math.sin(a);
        m = G.aroundPoint([co, si, -si, co, 0, 0], g.c![0], g.c![1]);
      }
      g.moved = true;
      this.work = G.cloneAll(g.base);
      if (!g.targets) this.work = G.transform(this.work, m);
      else {
        const by: Record<number, number[]> = {};
        g.targets.forEach((s) => (by[s[0]] = by[s[0]] || []).push(s[1]));
        Object.keys(by).forEach((ci) => G.transformNodes(this.work[+ci], by[+ci], m!));
      }
    }
    this.draw();
  };
  private up = (e: PointerEvent) => {
    const g = this.g;
    this.g = null;
    if (!g || g.kind === "pan") return;
    const p = this.at(e);
    if ((g.kind === "handle" || g.kind === "nodes") && g.moved) this.commit(g.snap);
    else if ((g.kind === "move" || g.kind === "scale" || g.kind === "rotate") && g.moved) this.commit(g.snap);
    else if (g.kind === "segment" && G.dist(p, g.start) < 4 / this.view.s) {
      const before = this.snap(), ni = G.insertNode(this.work[g.seg.ci], g.seg.i, g.seg.t);
      this.sel = [[g.seg.ci, ni]];
      this.commit(before);
    } else if (g.kind === "box") {
      const b = [Math.min(g.start[0], p[0]), Math.min(g.start[1], p[1]), Math.max(g.start[0], p[0]), Math.max(g.start[1], p[1])], picked: number[][] = [];
      this.work.forEach((c, ci) => c.n.forEach((q, i) => q[0] >= b[0] && q[0] <= b[2] && q[1] >= b[1] && q[1] <= b[3] && picked.push([ci, i])));
      this.sel = this.multi || e.shiftKey ? this.sel.concat(picked) : picked;
      this.box = null;
      this.emit();
    } else this.emit();
  };
  private cancel = () => {
    const g = this.g;
    this.g = null;
    this.box = null;
    if (g && "snap" in g && g.snap) {
      this.work = G.cloneAll(g.snap.work);
    }
    this.emit();
  };
  private wheel = (e: WheelEvent) => {
    e.preventDefault();
    const r = this.cv.getBoundingClientRect(), sx = e.clientX - r.left, sy = e.clientY - r.top;
    let k = Math.exp(-e.deltaY * 0.0015);
    const ns = Math.max(0.1, Math.min(8, this.view.s * k));
    k = ns / this.view.s;
    this.view.ox = sx - (sx - this.view.ox) * k;
    this.view.oy = sy - (sy - this.view.oy) * k;
    this.view.s = ns;
    this.draw();
  };
}

/* ---------- 그림 불러와 따기 — 메이커 `lib/maker/trace.ts` 의 traceGray(GPL 아님) ---------- */
/** 따낸 베지어(픽셀 좌표) → 음절 네모(0~1000) 안 v2 윤곽. 시제품 updateImport 의 맞추기 그대로(긴 변 기준 94%) */
export function fitTraced(beziers: number[][][][], fitErr = 1.2): Contour[] {
  const polys: P[][] = beziers
    .map((c) => {
      const pts: P[] = [];
      c.forEach((b) => {
        for (let k = 0; k < 8; k++) {
          const t = k / 8, u = 1 - t;
          pts.push([
            u * u * u * b[0][0] + 3 * u * u * t * b[1][0] + 3 * u * t * t * b[2][0] + t * t * t * b[3][0],
            u * u * u * b[0][1] + 3 * u * u * t * b[1][1] + 3 * u * t * t * b[2][1] + t * t * t * b[3][1],
          ]);
        }
      });
      return pts;
    })
    .filter((p) => p.length >= 3);
  if (!polys.length) return [];
  const oriented = G.orient(polys), b = G.bbox(oriented);
  const k = Math.min(1000 / (b[2] - b[0] || 1), 1000 / (b[3] - b[1] || 1)) * 0.94;
  const tx = 500 - ((b[0] + b[2]) / 2) * k, ty = 500 - ((b[1] + b[3]) / 2) * k;
  return G.polygonsToContours(oriented.map((p) => p.map((q) => [q[0] * k + tx, q[1] * k + ty])), fitErr, 55);
}
