/** HangulEngine: CONTRACT v1.1 assembly and TrueType writer, ported without algorithm changes.
 * No UI/config/font-loader dependency; callers supply resolved outlines.
 */
export type TTPoint = number[]; // [x,y] on-curve; [x,y,0] (legacy false accepted) off-curve
export type TTContour = TTPoint[];
export type Frame = [number, number, number, number];
export type Frames = Record<string, Record<string, Frame>>;
export interface Outline { contours: TTContour[]; advance?: number }
export interface Store { version?: number; name?: string; frames: Frames; cells?: Record<string, Outline>; overrides?: Record<string, Outline>; extra?: Record<number, Outline> }
export interface BuildOptions { familyName?: string; styleName?: string; advance?: number; spaceAdvance?: number; composite?: boolean; copyright?: string; license?: string; licenseUrl?: string }
interface Glyph { name: string; bytes: Uint8Array; box: number[]; contours?: TTContour[]; points: number; count: number; components: number; adv?: number }
interface Component { id: number; glyph: Glyph; scale: number[]; offset: number[] }
export const CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
export const JUNG = 'ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ';
export const JONG = 'ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ';
export const BUL_RULES = Object.freeze({
  jung_order: JUNG,
  cho_bul_without_jong: Object.freeze([0,0,0,0,0,0,0,0,1,3,3,3,1,2,4,4,4,2,1,3,0]),
  cho_bul_with_jong: Object.freeze([5,5,5,5,5,5,5,5,6,7,7,7,6,6,7,7,7,6,6,7,5]),
  jung_bul_gk_cho_index: Object.freeze([0,15]),
  jong_bul_by_jung: Object.freeze([0,2,0,2,1,2,1,2,3,0,2,1,3,3,1,2,1,3,3,1,1]),
  jung_class: Object.freeze<Record<string, string>>({
    'ㅏ':'세로','ㅐ':'세로','ㅑ':'세로','ㅒ':'세로','ㅓ':'세로','ㅔ':'세로','ㅕ':'세로','ㅖ':'세로','ㅣ':'세로',
    'ㅗ':'가로ㅗ','ㅛ':'가로ㅗ','ㅡ':'가로ㅗ','ㅜ':'가로ㅜ','ㅠ':'가로ㅜ',
    'ㅘ':'겹ㅗ','ㅙ':'겹ㅗ','ㅚ':'겹ㅗ','ㅢ':'겹ㅗ','ㅝ':'겹ㅜ','ㅞ':'겹ㅜ','ㅟ':'겹ㅜ'
  })
});
function validIndex(n: number, length: number): boolean { return Number.isInteger(n) && n >= 0 && n < length; }
export function decompose(ch: unknown): {cho: number; jung: number; jong: number} | null {
  if (typeof ch !== 'string' || ch.length !== 1) return null;
  const n = ch.charCodeAt(0) - 0xAC00;
  if (n < 0 || n >= 11172) return null;
  return {cho: Math.floor(n / 588), jung: Math.floor(n / 28) % 21, jong: n % 28};
}
function checkIndices(cho: number, jung: number, jong: number): void {
  if (!validIndex(cho,19) || !validIndex(jung,21) || !validIndex(jong,28)) throw new RangeError('Invalid Hangul indices');
}
export function compose(cho: number, jung: number, jong: number): string {
  checkIndices(cho,jung,jong);
  return String.fromCharCode(0xAC00 + (cho * 21 + jung) * 28 + jong);
}
export function jungClass(jung: number): string {
  if (!validIndex(jung,21)) throw new RangeError('Invalid vowel index');
  return BUL_RULES.jung_class[JUNG[jung]];
}
export function bulFor(cho: number, jung: number, jong: number): {cho: number; jung: number; jong: number | null} {
  checkIndices(cho,jung,jong);
  return {
    cho: (jong ? BUL_RULES.cho_bul_with_jong : BUL_RULES.cho_bul_without_jong)[jung] + 1,
    jung: (BUL_RULES.jung_bul_gk_cho_index.indexOf(cho) >= 0 ? 1 : 2) + (jong ? 2 : 0),
    jong: jong ? BUL_RULES.jong_bul_by_jung[jung] + 1 : null
  };
}
export function allCellKeys(): string[] {
  const keys: string[] = [];
  ([['cho',CHO,8],['jung',JUNG,4],['jong',JONG,4]] as [string,string,number][]).forEach(function (part) {
    for (let bul=1; bul<=part[2]; bul++) for (let i=0; i<part[1].length; i++) keys.push(part[0]+'/'+bul+'/'+part[1][i]);
  });
  return keys;
}
export function cellKeysFor(ch: string): string[] {
  const d = decompose(ch);
  if (!d) return [];
  const b = bulFor(d.cho,d.jung,d.jong);
  const keys = ['cho/'+b.cho+'/'+CHO[d.cho], 'jung/'+b.jung+'/'+JUNG[d.jung]];
  if (d.jong) keys.push('jong/'+b.jong+'/'+JONG[d.jong-1]);
  return keys;
}
export function frameFor(store: Store, key: string): Frame {
  const p = key.split('/');
  return store.frames[p[0]][p[1] + (p[0] === 'jung' ? '/'+jungClass(JUNG.indexOf(p[2])) : '')];
}
function contoursFor(store: Store, key: string): TTContour[] {
  const cell = store.cells && store.cells[key];
  return cell && cell.contours && cell.contours.length ? cell.contours : [];
}
// A point is [x, y] (on-curve) or [x, y, 0] (quadratic off-curve, CONTRACT v1.1). Every transform keeps the flag.
function isOff(p: TTPoint): boolean { return p.length > 2 && (p[2] === 0 || (p[2] as unknown) === false); }
function withFlag(p: TTPoint, q: TTPoint): TTPoint { if (isOff(p)) q.push(0); return q; }
function mapFrame(contours: TTContour[], f: Frame): TTContour[] {
  return contours.map(function (c) { return c.map(function (p) { return withFlag(p,[f[0]+p[0]*(f[2]-f[0]), f[1]+p[1]*(f[3]-f[1])]); }); });
}
export function assemble(store: Store, ch: string): {contours: TTContour[]; source: 'override' | 'assembled'; missing: string[]} {
  const override = store.overrides && store.overrides[ch];
  if (override && override.contours && override.contours.length) {
    return {contours: override.contours.map(function (c) { return c.map(function (p) { return p.slice(); }); }), source:'override', missing:[]};
  }
  let contours: TTContour[]=[]; const missing: string[]=[];
  cellKeysFor(ch).forEach(function (key) {
    const c = contoursFor(store,key);
    if (!c.length) missing.push(key);
    else contours = contours.concat(mapFrame(c,frameFor(store,key)));
  });
  return {contours:contours, source:'assembled', missing:missing};
}
// The single source of the CONTRACT §1 affine transform (before rounding).
function fontPoint(x: number, y: number): TTPoint { return [40+x*0.92,840-y*0.92]; }
export function toFontUnits(contours: TTContour[]): TTContour[] {
  return contours.map(function (c) { return c.map(function (p) { return withFlag(p,fontPoint(p[0],p[1]).map(Math.round)); }); });
}
function jamoPlacement(codepoint: number): {key: string; frame: Frame} | null {
  if (!validIndex(codepoint-0x3131,51)) return null;
  const ch=String.fromCharCode(codepoint); const idx=JUNG.indexOf(ch); let key; let f: Frame;
  if (idx >= 0) {
    key='jung/2/'+ch;
    const cls=jungClass(idx);
    f=cls==='세로' ? [250,62,750,938] : cls.indexOf('가로')===0 ? [62,250,938,750] : [62,62,938,938];
  } else {
    key=(CHO.indexOf(ch)>=0 ? 'cho/1/' : 'jong/2/')+ch;
    f=[150,150,850,850];
  }
  return {key:key,frame:f};
}
// Returns syllable-square coordinates, as does assemble().
export function standaloneJamo(store: Store, codepoint: number): TTContour[] | null {
  const placement=jamoPlacement(codepoint);
  return placement ? mapFrame(contoursFor(store,placement.key),placement.frame) : null;
}
export function ks2350(): string[] {
  const decoder=new TextDecoder('euc-kr',{fatal:true}), result=[];
  for (let lead=0xB0; lead<=0xC8; lead++) for (let trail=0xA1; trail<=0xFE; trail++) result.push(decoder.decode(new Uint8Array([lead,trail])));
  return result;
}
// Big-endian sfnt primitives. No Node APIs, imports, or external font library.
class Binary {
  data: number[] = [];
  u8(n: number): this { this.data.push(n & 255); return this; }
  u16(n: number): this { return this.u8(n >>> 8).u8(n); }
  u32(n: number): this { return this.u16(n >>> 16).u16(n); }
  zeros(n: number): this { for (let i=0;i<n;i++) this.u8(0); return this; }
  bytes(): Uint8Array { return new Uint8Array(this.data); }
}
function signed16(n: number): number {
  if (!Number.isInteger(n) || n < -32768 || n > 32767) throw new RangeError('TrueType coordinate or delta exceeds int16');
  return n;
}
function cleanContours(contours: TTContour[]): TTContour[] {
  return contours.map(function (c) {
    const out: TTPoint[]=[];
    c.forEach(function (p) {
      if (!Number.isFinite(p[0]) || !Number.isFinite(p[1])) throw new RangeError('Non-finite contour point');
      const q=withFlag(p,[signed16(Math.round(p[0])),signed16(Math.round(p[1]))]), last=out[out.length-1];
      if (!last || last[0]!==q[0] || last[1]!==q[1]) out.push(q);
    });
    if (out.length>1 && out[0][0]===out[out.length-1][0] && out[0][1]===out[out.length-1][1]) out.pop();
    return new Set(out.map(function (p) { return p.join(','); })).size >= 3 ? out : [];
  }).filter(function (c) { return c.length; });
}
function bounds(contours: TTContour[]): number[] {
  let box: number[] | null=null;
  contours.forEach(function (c) { c.forEach(function (p) {
    if (!box) box=[p[0],p[1],p[0],p[1]];
    else { box[0]=Math.min(box[0],p[0]); box[1]=Math.min(box[1],p[1]); box[2]=Math.max(box[2],p[0]); box[3]=Math.max(box[3],p[1]); }
  }); });
  return box || [0,0,0,0];
}
function glyphHeader(w: Binary, count: number, box: number[]): void {
  w.u16(count); box.forEach(function (v) { w.u16(signed16(v)); });
}
function simpleGlyph(contours: TTContour[], name: string): Glyph {
  contours=cleanContours(contours);
  const box=bounds(contours), points: TTPoint[]=[], w=new Binary();
  contours.forEach(function (c) { c.forEach(function (p) { points.push(p); }); });
  if (contours.length>32767 || points.length>65535) throw new RangeError('Too many TrueType contours or points');
  if (points.length) {
    glyphHeader(w,contours.length,box);
    let end=-1;
    contours.forEach(function (c) { end+=c.length; w.u16(end); });
    w.u16(0); // no instructions
    // Compact deltas (TrueType spec): a zero delta costs no bytes, |d| < 256 one byte, else two; equal flags repeat.
    const flags: number[]=[]; const xs=new Binary(); const ys=new Binary(); let px=0; let py=0;
    points.forEach(function (p,i) {
      let f=(isOff(p) ? 0 : 0x01) | (i===0 ? 0x40 : 0); const dx=signed16(p[0]-px); const dy=signed16(p[1]-py); px=p[0]; py=p[1];
      if (dx===0) f|=0x10; else if (dx>-256 && dx<256) { f|=0x02|(dx>0?0x10:0); xs.u8(Math.abs(dx)); } else xs.u16(dx);
      if (dy===0) f|=0x20; else if (dy>-256 && dy<256) { f|=0x04|(dy>0?0x20:0); ys.u8(Math.abs(dy)); } else ys.u16(dy);
      flags.push(f);
    });
    for (let fi=0;fi<flags.length;fi++) {
      let run=0;
      while (fi+1+run<flags.length && flags[fi+1+run]===flags[fi] && run<255) run++;
      if (run) { w.u8(flags[fi]|0x08).u8(run); fi+=run; } else w.u8(flags[fi]);
    }
    xs.data.forEach(function (b) { w.u8(b); }); ys.data.forEach(function (b) { w.u8(b); });
  }
  return {name:name,bytes:w.bytes(),box:box,contours:contours,points:points.length,count:contours.length,components:0};
}
function checksum(bytes: Uint8Array): number {
  let sum=0;
  for (let i=0;i<bytes.length;i+=4) sum=(sum+((bytes[i] || 0)*0x1000000+((bytes[i+1] || 0)<<16)+((bytes[i+2] || 0)<<8)+(bytes[i+3] || 0))) >>> 0;
  return sum;
}
function utf16be(s: string): Uint8Array {
  const w=new Binary(); for (let i=0;i<s.length;i++) w.u16(s.charCodeAt(i)); return w.bytes();
}
function nameTable(family: string, style: string, extra: BuildOptions = {}): Uint8Array {
  extra=extra || {};
  let hash=2166136261;
  for (let i=0;i<family.length;i++) hash=Math.imul(hash ^ family.charCodeAt(i),16777619) >>> 0;
  const psFamily=/^[\x20-\x7E]+$/.test(family) ? family.replace(/[^A-Za-z0-9-]/g,'') : 'HW'+('00000000'+hash.toString(16)).slice(-8);
  const ps=(psFamily || 'HW')+'-'+(style.replace(/[^A-Za-z0-9-]/g,'') || 'Regular');
  const full=family+' '+style;
  // OFL 파생 글꼴은 원작 저작권(0)과 라이선스(13, 14)를 같이 싣는다.
  const records: [number, string | undefined][]=[[0,extra.copyright],[1,family],[2,style],[3,ps+';1.000'],[4,full],[5,'Version 1.000'],[6,ps.slice(0,63)],
    [13,extra.license],[14,extra.licenseUrl]];
  const present = records.filter((r): r is [number, string] => Boolean(r[1]));
  const strings=present.map(function (r) { return utf16be(r[1]); }); const w=new Binary(); let offset=0;
  w.u16(0).u16(present.length).u16(6+12*present.length);
  strings.forEach(function (s,i) { w.u16(3).u16(1).u16(0x409).u16(present[i][0]).u16(s.length).u16(offset); offset+=s.length; });
  strings.forEach(function (s) { s.forEach(function (v) { w.u8(v); }); });
  return w.bytes();
}
/** Build an sfnt TrueType font. Base glyphs are unencoded and post v3 omits names. */
export function buildTTF(store: Store, options: BuildOptions = {}): ArrayBuffer {
  options=options || {};
  const advance=Math.round(options.advance || 1000), composite=options.composite !== false, family=options.familyName || 'Hangul Handwriting', style=options.styleName || 'Regular';
  // .notdef is a hollow box: an outline-less font has a zero-length glyf, which browsers (OTS) reject.
  const notdef=simpleGlyph([[[50,0],[50,800],[550,800],[550,0]],[[100,50],[500,50],[500,750],[100,750]]],'.notdef');
  const glyphs=[notdef,simpleGlyph([],'uni0020')], bases: Record<string, {id: number; glyph: Glyph}>=Object.create(null);
  // Encoded glyph IDs are stable in both modes. Unencoded cell bases follow them.
  const encodedCount=11225;
  if (composite) allCellKeys().forEach(function (key) {
    const c=contoursFor(store,key);
    if (!c.length) return;
    const parts=key.split('/'), letters=parts[0]==='cho'?CHO:parts[0]==='jung'?JUNG:JONG;
    const name=parts[0]+'_'+parts[1]+'_'+('0'+letters.indexOf(parts[2])).slice(-2);
    const base=simpleGlyph(c.map(function (contour) { return contour.map(function (p) { return withFlag(p,[p[0]*1000,(1-p[1])*1000]); }); }),name);
    if (base.points) bases[key]={id:encodedCount+Object.keys(bases).length,glyph:base};
  });
  function component(key: string, frame: Frame): Component | null {
    const base=bases[key]; if (!base) return null;
    // Positive scale in normalized y-up coordinates. Derive it from fontPoint,
    // so neither composite nor flattened mode duplicates the em transform.
    const origin=fontPoint(frame[0],frame[3]), opposite=fontPoint(frame[2],frame[1]);
    const scale=[0,1].map(function (a) {
      const fixed=Math.round((opposite[a]-origin[a])/1000*16384);
      if (fixed<=0 || fixed>32767) throw new RangeError('Frame scale exceeds positive F2Dot14 range');
      return fixed;
    });
    const target=bounds(cleanContours(toFontUnits(mapFrame(contoursFor(store,key),frame))));
    // Fit integer offsets to the actual cell's extrema, reducing accumulated
    // base-point, F2Dot14, and translation rounding error at the visible bbox.
    const offset=[0,1].map(function (a) {
      const s=scale[a]/16384, b=base.glyph.box;
      return signed16(Math.round(((target[a]-b[a]*s)+(target[a+2]-b[a+2]*s))/2));
    });
    return {id:base.id,glyph:base.glyph,scale:scale,offset:offset};
  }
  function compositeGlyph(parts: (Component | null)[], name: string): Glyph {
    const present = parts.filter((p): p is Component => p !== null);
    if (!present.length) return simpleGlyph([],name);
    const transformed=present.map(function (p) {
      const b=p.glyph.box;
      return [[b[0]*p.scale[0]/16384+p.offset[0],b[1]*p.scale[1]/16384+p.offset[1]],
        [b[2]*p.scale[0]/16384+p.offset[0],b[3]*p.scale[1]/16384+p.offset[1]]];
    });
    const box=bounds(transformed).map(Math.round), w=new Binary();
    glyphHeader(w,-1,box);
    present.forEach(function (p,i) {
      // ARG_1_AND_2_ARE_WORDS | ARGS_ARE_XY_VALUES | WE_HAVE_AN_X_AND_Y_SCALE
      // | OVERLAP_COMPOUND | UNSCALED_COMPONENT_OFFSET, plus MORE_COMPONENTS.
      w.u16(0x1443 | (i<present.length-1 ? 0x20 : 0)).u16(p.id)
        .u16(p.offset[0]).u16(p.offset[1]).u16(p.scale[0]).u16(p.scale[1]);
    });
    return {name:name,bytes:w.bytes(),box:box,points:present.reduce(function (n,p) { return n+p.glyph.points; },0),
      count:present.reduce(function (n,p) { return n+p.glyph.count; },0),components:present.length};
  }
  for (let cp=0xAC00;cp<=0xD7A3;cp++) {
    const ch=String.fromCharCode(cp), name='uni'+cp.toString(16).toUpperCase(), override=store.overrides && store.overrides[ch];
    if (!composite || (override && override.contours && override.contours.length)) {
      const sg=simpleGlyph(toFontUnits(assemble(store,ch).contours),name);
      if (override && override.advance) sg.adv=Math.round(override.advance); // 바탕 글꼴의 글자 폭(비례 폭 글꼴)
      glyphs.push(sg);
    }
    else glyphs.push(compositeGlyph(cellKeysFor(ch).map(function (key) { return component(key,frameFor(store,key)); }),name));
  }
  // 추가 글자(store.extra: 코드포인트 → {contours 음절 좌표, advance}). 낱자는 여기 있으면 이걸 쓴다.
  const extra=store.extra || {}, pairs=[[0x20,1]];
  function hasExtra(c: number): boolean { const e=extra[c]; return !!(e && e.contours); }
  for (let cp2=0xAC00;cp2<=0xD7A3;cp2++) pairs.push([cp2,2+cp2-0xAC00]);
  for (let j=0x3131;j<=0x3163;j++) {
    const placement=jamoPlacement(j); const jname='uni'+j.toString(16).toUpperCase(); let g;
    if (hasExtra(j)) { g=simpleGlyph(toFontUnits(extra[j].contours),jname); if (extra[j].advance) g.adv=Math.round(extra[j].advance!); }
    else g=composite ? compositeGlyph([component(placement!.key,placement!.frame)],jname) : simpleGlyph(toFontUnits(standaloneJamo(store,j)!),jname);
    glyphs.push(g); pairs.push([j,glyphs.length-1]);
  }
  Object.keys(bases).forEach(function (key) { glyphs.push(bases[key].glyph); });
  Object.keys(extra).map(Number).filter(function (c) {
    return c>0x20 && c<0xFFFF && !(c>=0x3131 && c<=0x3163) && !(c>=0xAC00 && c<=0xD7A3) && hasExtra(c);
  }).sort(function (a,b) { return a-b; }).forEach(function (c) {
    const g=simpleGlyph(toFontUnits(extra[c].contours),'uni'+('0000'+c.toString(16).toUpperCase()).slice(-4));
    g.adv=Math.round(extra[c].advance || advance); glyphs.push(g); pairs.push([c,glyphs.length-1]);
  });
  pairs.sort(function (a,b) { return a[0]-b[0]; });
  const n=glyphs.length; const tables: Record<string, Uint8Array>={}; let box: number[] | null=null; let maxPoints=0; let maxContours=0; let maxCP=0; let maxCC=0; let maxComponents=0;
  let minLSB=32767; let minRSB=32767; let maxExtent=-32768;
  const loca=new Binary(); const hmtx=new Binary(); let glyfLength=0;
  glyphs.forEach(function (g,i) {
    loca.u32(glyfLength); glyfLength+=(g.bytes.length+3)&~3;
    const width=g.adv || (i===1?Math.round(options.spaceAdvance || 300):advance), b=g.box;
    hmtx.u16(width).u16(b[0]);
    minLSB=Math.min(minLSB,b[0]); minRSB=Math.min(minRSB,width-b[2]); maxExtent=Math.max(maxExtent,b[2]);
    if (g.points) box=box ? [Math.min(box[0],b[0]),Math.min(box[1],b[1]),Math.max(box[2],b[2]),Math.max(box[3],b[3])] : b.slice();
    if (g.components) { maxCP=Math.max(maxCP,g.points); maxCC=Math.max(maxCC,g.count); maxComponents=Math.max(maxComponents,g.components); }
    else { maxPoints=Math.max(maxPoints,g.points); maxContours=Math.max(maxContours,g.count); }
  });
  if (maxCP>65535 || maxCC>65535) throw new RangeError('Too many points or contours in a composite glyph');
  box=box || [0,0,0,0]; loca.u32(glyfLength);
  tables.glyf=new Uint8Array(glyfLength);
  let cursor=0;
  glyphs.forEach(function (g) { tables.glyf.set(g.bytes,cursor); cursor+=(g.bytes.length+3)&~3; });
  tables.loca=loca.bytes(); tables.hmtx=hmtx.bytes();
  const head=new Binary();
  head.u32(0x10000).u32(0x10000).u32(0).u32(0x5F0F3CF5).u16(3).u16(1000)
    .u32(0).u32(2082844800).u32(0).u32(2082844800);
  box.forEach(function (v) { head.u16(v); });
  const bold=/bold/i.test(style), italic=/italic|oblique/i.test(style);
  head.u16((bold?1:0)|(italic?2:0)).u16(8).u16(2).u16(1).u16(0); tables.head=head.bytes();
  const hhea=new Binary();
  hhea.u32(0x10000).u16(880).u16(-120).u16(0).u16(advance).u16(signed16(minLSB)).u16(signed16(minRSB)).u16(signed16(maxExtent))
    .u16(1).u16(0).u16(0).zeros(8).u16(0).u16(n); tables.hhea=hhea.bytes();
  const maxp=new Binary();
  maxp.u32(0x10000).u16(n).u16(maxPoints).u16(maxContours).u16(maxCP).u16(maxCC).u16(1)
    .zeros(12).u16(maxComponents).u16(maxComponents?1:0); tables.maxp=maxp.bytes();
  const os=new Binary();
  os.u16(4).u16(advance).u16(bold?700:400).u16(5).u16(0)
    .u16(650).u16(600).u16(0).u16(75).u16(650).u16(600).u16(0).u16(350).u16(50).u16(300).u16(0)
    .zeros(10).u32(pairs.some(function (p) { return p[0]>0x20 && p[0]<0x80; }) ? 1 : 0).u32((1<<20)|(1<<24)).u32(0).u32(0) // Unicode bits 0, 52 and 56
    .u32(0x4857454E).u16((italic?1:0)|(bold?32:0)|(!bold&&!italic?64:0))
    .u16(0x20).u16(pairs[pairs.length-1][0]).u16(880).u16(-120).u16(0).u16(880).u16(120)
    .u32(1<<19).u32(0).u16(0).u16(0).u16(0).u16(0x20).u16(1); tables['OS/2']=os.bytes();
  // Format 4 from the real (codepoint, glyph) pairs: consecutive runs with a constant delta become one segment.
  const segs: {start: number; end: number; delta: number}[]=[];
  pairs.forEach(function (p) {
    const s=segs[segs.length-1];
    if (s && p[0]===s.end+1 && p[1]-p[0]===s.delta) s.end=p[0]; else segs.push({start:p[0],end:p[0],delta:p[1]-p[0]});
  });
  segs.push({start:0xFFFF,end:0xFFFF,delta:1});
  const segN=segs.length, pow2=Math.pow(2,Math.floor(Math.log2(segN))), cmap=new Binary();
  cmap.u16(0).u16(2).u16(0).u16(3).u32(20).u16(3).u16(1).u32(20)
    .u16(4).u16(16+8*segN).u16(0).u16(segN*2).u16(pow2*2).u16(Math.log2(pow2)).u16(segN*2-pow2*2);
  segs.forEach(function (s) { cmap.u16(s.end); }); cmap.u16(0);
  segs.forEach(function (s) { cmap.u16(s.start); });
  segs.forEach(function (s) { cmap.u16(s.delta & 0xFFFF); });
  segs.forEach(function () { cmap.u16(0); });
  tables.cmap=cmap.bytes();
  tables.name=nameTable(family,style,{copyright:options.copyright,license:options.license,licenseUrl:options.licenseUrl});
  tables.post=new Binary().u32(0x30000).u32(0).u16(-75).u16(50).zeros(20).bytes();
  const tags=Object.keys(tables).sort(), count=tags.length, power=Math.pow(2,Math.floor(Math.log2(count)));
  let size=12+16*count;
  tags.forEach(function (tag) { size+=(tables[tag].length+3)&~3; });
  const result=new Uint8Array(size), view=new DataView(result.buffer), directory=new Binary();
  directory.u32(0x10000).u16(count).u16(power*16).u16(Math.log2(power)).u16(count*16-power*16);
  cursor=12+16*count; let headOffset=0;
  tags.forEach(function (tag) {
    for (let i=0;i<4;i++) directory.u8(tag.charCodeAt(i));
    directory.u32(checksum(tables[tag])).u32(cursor).u32(tables[tag].length);
    result.set(tables[tag],cursor); if (tag==='head') headOffset=cursor;
    cursor+=(tables[tag].length+3)&~3;
  });
  result.set(directory.bytes());
  view.setUint32(headOffset+8,(0xB1B0AFBA-checksum(result)) >>> 0,false);
  return result.buffer;
}
export function stats(store: Store): {cellsDrawn: number; cellsTotal: number; overrides: number} {
  return {cellsDrawn:allCellKeys().filter(function (k) { return contoursFor(store,k).length>0; }).length,cellsTotal:344,
    overrides:Object.keys(store.overrides || {}).filter(function (k) { const o=store.overrides![k]; return o && o.contours && o.contours.length; }).length};
}
