/**
 * 메이커 글꼴 — 파일을 받아 글자를 «외곽선(mm)»으로 바꿉니다 (F26 · 2026-09-25).
 *
 * 🔴 **손님과 관리자가 보는 글꼴이 다릅니다** (사람 결정 2026-09-25 — "관리자는 모든 폰트,
 * 고객은 KCC 및 무료 폰트만"):
 *   - 손님: `config/fonts.ts` 의 16종 — 인쇄·BI/CI·웹·임베딩이 전부 «사용 가능» 인 것만 골라 둔 목록
 *   - 관리자: 위 16종 + **이 PC 에 설치된 글꼴 전부**(크롬·엣지의 Local Font Access) + 글꼴 파일 올리기.
 *     🔴 **둘 다 브라우저 안에서만 읽습니다 — 서버로 올라가지 않습니다.** 회사가 산 글꼴을
 *     우리 서버에 올리면 그건 «배포»라 대개 약관 위반이고(9/24 조사: 임베딩 칸), 손님 화면에
 *     새면 라이선스 위험이 손님에게 갑니다. 그래서 관리자 글꼴은 **그 관리자 브라우저**에만 삽니다.
 *
 * 파이프라인 (2026-09-25 조사에서 16종 전부 실제로 파싱해 본 길):
 *   fetch(원본 주소, CORS `*`) → 앞 4바이트가 `wOF2` 면 woff2-encoder 로 풀기 → opentype.js 로 파싱
 *   → 줄마다 `getPath` → 잉크 높이를 원하는 mm 로 맞춰 축척
 * 한글 음절은 cmap 에 바로 있어 셰이핑(HarfBuzz)이 필요 없었습니다(12종 실측).
 *
 * ⚠️ **opentype.js 는 WOFF2 를 못 읽습니다**(README 원문) — 그래서 woff2-encoder 가 붙어 있습니다.
 * ⚠️ **TTC(글꼴 모음) 파일은 못 읽습니다** — 윈도우의 바탕·굴림이 그 형식입니다. 오류 문구로 알립니다.
 */
import type { Font, PathCommand } from "opentype.js";

const cache = new Map<string, Promise<Font>>();

async function parseBuffer(buf: ArrayBuffer): Promise<Font> {
  const head = new Uint8Array(buf, 0, 4);
  const sig = String.fromCharCode(...head);
  if (sig === "ttcf") throw new Error("글꼴 모음(TTC) 파일은 아직 읽지 못합니다. 같은 글꼴의 TTF/OTF 를 올려 주세요.");
  let data = buf;
  if (sig === "wOF2") {
    const { default: decompress } = await import("woff2-encoder/decompress");
    const out = await decompress(new Uint8Array(buf));
    data = out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength) as ArrayBuffer;
  }
  const { parse } = await import("opentype.js");
  return parse(data);
}

/** 원격 글꼴 — 한 번 받으면 이 탭에서는 다시 안 받습니다 */
export function loadFontUrl(url: string): Promise<Font> {
  let p = cache.get(url);
  if (!p) {
    p = fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`글꼴 파일을 받지 못했습니다 (${r.status})`);
        return r.arrayBuffer();
      })
      .then(parseBuffer);
    p.catch(() => cache.delete(url));
    cache.set(url, p);
  }
  return p;
}

/** 관리자가 고른 파일·로컬 글꼴 — 열쇠는 호출하는 쪽이 정합니다 */
export function loadFontBlob(key: string, blob: Blob): Promise<Font> {
  let p = cache.get(key);
  if (!p) {
    p = blob.arrayBuffer().then(parseBuffer);
    p.catch(() => cache.delete(key));
    cache.set(key, p);
  }
  return p;
}

/* ------------------------------------------------------------ Local Font Access (관리자 전용) */

type LocalFontData = { family: string; fullName: string; postscriptName: string; style: string; blob(): Promise<Blob> };

export type LocalFont = { key: string; family: string; fullName: string; style: string; get: () => Promise<Blob> };

export const localFontsSupported = () =>
  typeof window !== "undefined" && "queryLocalFonts" in window;

/**
 * 이 PC 에 설치된 글꼴 목록. **처음 부를 때 브라우저가 허락을 묻습니다**(사람이 누릅니다).
 * 크롬·엣지 데스크톱만 됩니다 — 사파리·파이어폭스에서는 파일 올리기를 쓰세요.
 */
export async function listLocalFonts(): Promise<LocalFont[]> {
  const q = (window as unknown as { queryLocalFonts?: () => Promise<LocalFontData[]> }).queryLocalFonts;
  if (!q) return [];
  const list = await q.call(window);
  return list
    .map((f) => ({
      key: `local:${f.postscriptName}`,
      family: f.family,
      fullName: f.fullName,
      style: f.style,
      get: () => f.blob(),
    }))
    .sort((a, b) => a.fullName.localeCompare(b.fullName, "ko"));
}

/* ------------------------------------------------------------ 글자 → 외곽선 */

export type TextLine = {
  text: string;
  /** 잉크 높이(mm) — 그 줄에서 가장 높은 글자의 위~아래. 간판 업계의 «글자 높이» */
  heightMm: number;
  /** 자간 (em 의 1/1000). 0 이 글꼴 기본 */
  tracking: number;
};

export type Glyph = {
  /** 공백을 뺀 글자 순번 (줄을 넘어 이어집니다) — 글자별 꾸미기의 열쇠 */
  i: number;
  ch: string;
  line: number;
  /** 이 글자의 외곽선 (mm, 아이템 왼쪽 위가 0,0) */
  d: string;
  /** 잉크 상자 (mm) */
  x0: number;
  y0: number;
  w: number;
  h: number;
};

export type Outline = {
  /** SVG path d — 좌표 단위 mm, 원점은 전체 잉크 상자의 왼쪽 위 */
  d: string;
  w: number;
  h: number;
  /** 줄마다 잉크 상자 (mm, 같은 좌표계) — 치수선 그리는 데 씁니다 */
  lines: { x0: number; y0: number; w: number; h: number }[];
  /** 글자 한 자씩 — 글자별 색·위치·크기·회전(해외 메이커의 «단어·글자별 색»에서 빌린 것) */
  glyphs: Glyph[];
  /** 이 글꼴에 없는 글자 — 손님에게 알립니다 (두부로 나가면 안 됩니다) */
  missing: string[];
};

/**
 * 여러 줄을 가운데 정렬로 쌓아 외곽선을 만듭니다. 줄 간격은 윗줄 높이의 `gap` 배.
 * 🔴 **글자 높이는 «잉크» 로 맞춥니다**(글꼴의 em 크기가 아니라). 같은 30cm 라도 글꼴마다
 * em 안에서 글자가 차지하는 비율이 달라, em 으로 맞추면 견적서의 «글자 높이» 와 어긋납니다.
 * 글자를 **한 자씩** 놓습니다 — 한 덩이로 뽑으면 글자별로 색·위치를 못 바꿉니다.
 */
export function layoutLines(font: Font, lines: TextLine[], gap = 0.35): Outline {
  const U = 1000;
  const f = (n: number) => (Math.round(n * 100) / 100).toString();
  type Raw = { ch: string; cmds: PathCommand[]; b: { x1: number; y1: number; x2: number; y2: number } };
  let gi = 0;
  const built = lines
    .map((l, li) => ({ l, li }))
    .filter(({ l }) => l.text.trim())
    .map(({ l, li }) => {
      const raws: Raw[] = [];
      let x = 0;
      let prev: ReturnType<Font["charToGlyph"]> | null = null;
      const scaleU = U / font.unitsPerEm;
      for (const ch of [...l.text]) {
        const g = font.charToGlyph(ch);
        if (prev && font.getKerningValue) x += font.getKerningValue(prev, g) * scaleU;
        if (ch.trim()) {
          const p = g.getPath(x, 0, U);
          const b = p.getBoundingBox();
          if (b.x2 > b.x1) raws.push({ ch, cmds: p.commands as PathCommand[], b });
        }
        x += (g.advanceWidth ?? font.unitsPerEm * 0.5) * scaleU + (l.tracking / 1000) * U;
        prev = g;
      }
      if (!raws.length) return null;
      const bx1 = Math.min(...raws.map((r) => r.b.x1)), bx2 = Math.max(...raws.map((r) => r.b.x2));
      const by1 = Math.min(...raws.map((r) => r.b.y1)), by2 = Math.max(...raws.map((r) => r.b.y2));
      const s = l.heightMm / Math.max(1e-6, by2 - by1);
      return { li, raws, b: { x1: bx1, y1: by1 }, s, w: (bx2 - bx1) * s, h: (by2 - by1) * s, gapMm: l.heightMm * gap };
    })
    .filter((v): v is NonNullable<typeof v> => !!v);

  const missing = [
    ...new Set(lines.flatMap((l) => [...l.text].filter((ch) => ch.trim() && font.charToGlyphIndex(ch) === 0))),
  ];

  const W = Math.max(0, ...built.map((l) => l.w));
  let y = 0, d = "";
  const boxes: Outline["lines"] = [];
  const glyphs: Glyph[] = [];
  built.forEach((l, k) => {
    const ox = (W - l.w) / 2;
    const tx = (x: number) => ox + (x - l.b.x1) * l.s;
    const ty = (yy: number) => y + (yy - l.b.y1) * l.s;
    for (const r of l.raws) {
      let gd = "";
      for (const c of r.cmds) {
        if (c.type === "M" || c.type === "L") gd += `${c.type}${f(tx(c.x))},${f(ty(c.y))}`;
        else if (c.type === "C") gd += `C${f(tx(c.x1))},${f(ty(c.y1))} ${f(tx(c.x2))},${f(ty(c.y2))} ${f(tx(c.x))},${f(ty(c.y))}`;
        else if (c.type === "Q") gd += `Q${f(tx(c.x1))},${f(ty(c.y1))} ${f(tx(c.x))},${f(ty(c.y))}`;
        else gd += "Z";
      }
      d += gd;
      glyphs.push({ i: gi++, ch: r.ch, line: l.li, d: gd, x0: tx(r.b.x1), y0: ty(r.b.y1), w: (r.b.x2 - r.b.x1) * l.s, h: (r.b.y2 - r.b.y1) * l.s });
    }
    boxes.push({ x0: ox, y0: y, w: l.w, h: l.h });
    y += l.h + (k < built.length - 1 ? l.gapMm : 0);
  });
  return { d, w: W, h: y, lines: boxes, glyphs, missing };
}

/** 글꼴 이름 (메타데이터에서) — 로컬·올린 파일의 표시용 */
export function fontDisplayName(font: Font): string {
  const n = font.names.fullName ?? font.names.fontFamily;
  return (n && (n.ko ?? n.en ?? Object.values(n)[0])) || "이름 없는 글꼴";
}
