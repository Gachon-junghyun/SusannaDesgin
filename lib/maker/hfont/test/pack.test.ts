/** Port of pack_check.js: all 189 pack checks are retained. HFONT_NET=1 downloads
 * Google originals; HFONT_PACK_DIR optionally supplies the other 151 prototype packs.
 * Font files/cache/generated TTFs never enter the source tree or public assets.
 */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import opentype from 'opentype.js';
import type { Font } from 'opentype.js';
import * as G from '../geom.ts';
import * as E from '../engine.ts';
import type { Store } from '../engine.ts';
interface Entry {id: string; file: string; srcFile: string; unitsPerEm: number; syllables: number; ks2350: number; copyright: string; licenseUrl: string; packed?: string}
const catalog: Entry[] = JSON.parse(fs.readFileSync(new URL('./pack_catalog.json', import.meta.url),'utf8'));
const enabled = process.env.HFONT_NET === '1', packDir = process.env.HFONT_PACK_DIR;
const outDir = path.resolve('.hfont-test-out');
async function googleOriginal(entry: Entry): Promise<Buffer> {
  const file = path.join(outDir, 'downloads', entry.id + '.ttf');
  if (fs.existsSync(file)) return fs.readFileSync(file);
  const family = entry.id.slice(2);
  const url = `https://raw.githubusercontent.com/google/fonts/main/ofl/${family}/${encodeURIComponent(entry.srcFile)}`;
  const response = await fetch(url, {signal: AbortSignal.timeout(90000)});
  assert(response.ok, `${response.status} ${url}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  fs.mkdirSync(path.dirname(file),{recursive:true}); fs.writeFileSync(file,bytes);
  return bytes;
}
const decoder=new TextDecoder('euc-kr',{fatal:true}), ks=new Set<number>();
for(let a=0xB0;a<=0xC8;a++) for(let b=0xA1;b<=0xFE;b++) {
  const cp=decoder.decode(Uint8Array.of(a,b)).codePointAt(0)!; if(cp>=0xAC00&&cp<=0xD7A3) ks.add(cp);
}
assert.strictEqual(ks.size,2350);
const ab=(b: Buffer) => b.buffer.slice(b.byteOffset,b.byteOffset+b.length) as ArrayBuffer;
function distance(p: number[],a: number[],b: number[]) {
  const dx=b[0]-a[0],dy=b[1]-a[1],den=dx*dx+dy*dy;
  const t=den?Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/den)):0;
  return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy);
}
// Independent command sampler: recursively split Beziers until their control
// polygon lies within 0.025 font units of the chord.
function originalPolys(cmds: G.PathCommand[]) {
  const out: number[][][]=[]; let poly: number[][] | null=null; let last: number[] = [];
  function curve(points: number[][],depth=0) {
    if(depth>=20||points.slice(1,-1).every(p=>distance(p,points[0],points[points.length-1])<.025)) { poly!.push(points[points.length-1]); return; }
    const left=[points[0]],right=[points[points.length-1]]; let row=points;
    while(row.length>1) { row=row.slice(1).map((p,i)=>[(p[0]+row[i][0])/2,(p[1]+row[i][1])/2]); left.push(row[0]);right.unshift(row[row.length-1]); }
    curve(left,depth+1);curve(right,depth+1);
  }
  for(const c of cmds) {
    if(c.type==='M') { poly=[];out.push(poly);last=[c.x!,c.y!];poly!.push(last); }
    else if(c.type==='Z') { last=poly![0]; }
    else { const end=[c.x!,c.y!]; if(c.type==='L') poly!.push(end); else if(c.type==='Q') curve([last,[c.x1!,c.y1!],end]); else if(c.type==='C') curve([last,[c.x1!,c.y1!],[c.x2!,c.y2!],end]); else throw Error('Unsupported command '+c.type); last=end; }
  }
  // A zero-length source contour has no outline; the converter discards it too.
  return out.filter(p=>p.length>1 && p.some(q=>Math.hypot(q[0]-p[0][0],q[1]-p[0][1])>1e-9));
}
type Edge = {a: number[]; b: number[]; box: number[]};
type EdgeTree = {box: number[]; edges?: Edge[]; left?: EdgeTree; right?: EdgeTree};
function edgeTree(edges: Edge[]): EdgeTree {
  const box=[Infinity,Infinity,-Infinity,-Infinity];
  for (const e of edges) { box[0]=Math.min(box[0],e.box[0]);box[1]=Math.min(box[1],e.box[1]);box[2]=Math.max(box[2],e.box[2]);box[3]=Math.max(box[3],e.box[3]); }
  if(edges.length<=8) return {box,edges};
  const axis=box[2]-box[0]>box[3]-box[1]?0:1;
  edges.sort((a,b)=>(a.box[axis]+a.box[axis+2])-(b.box[axis]+b.box[axis+2]));
  const mid=edges.length>>1;
  return {box,left:edgeTree(edges.slice(0,mid)),right:edgeTree(edges.slice(mid))};
}
function boxDistance(p: number[],box: number[]): number {
  return Math.hypot(Math.max(box[0]-p[0],0,p[0]-box[2]),Math.max(box[1]-p[1],0,p[1]-box[3]));
}
// Exact nearest-segment distance, indexed only to avoid quadratic work on brush fonts.
// Sampling and distance formulas remain independent of the ported geometry.
function directed(a: number[][][],b: number[][][]): number {
  const edges=b.flatMap(poly=>poly.map((p,i)=>{const q=poly[(i+1)%poly.length];return {a:p,b:q,box:[Math.min(p[0],q[0]),Math.min(p[1],q[1]),Math.max(p[0],q[0]),Math.max(p[1],q[1])]};}));
  assert(edges.length);
  const tree=edgeTree(edges); let max=0;
  for(const p of a.flat()) {
    let best=Infinity;
    function nearest(node: EdgeTree): void {
      if(boxDistance(p,node.box)>best) return;
      if(node.edges) { for(const e of node.edges) best=Math.min(best,distance(p,e.a,e.b));return; }
      const left=node.left!,right=node.right!;
      if(boxDistance(p,left.box)<boxDistance(p,right.box)) {nearest(left);nearest(right);} else {nearest(right);nearest(left);}
    }
    nearest(tree);max=Math.max(max,best);
  }
  return max;
}
test('independent pack distance index agrees with exhaustive segment search',()=>{
  const b=Array.from({length:3},(_,k)=>Array.from({length:20},(_,i)=>[Math.cos(i*2.3+k)*100,Math.sin(i*1.7-k)*100]));
  const a=[Array.from({length:31},(_,i)=>[Math.sin(i*7)*130,Math.cos(i*3)*130])];
  const edges=b.flatMap(poly=>poly.map((p,i)=>[p,poly[(i+1)%poly.length]]));
  const expected=Math.max(...a.flat().map(p=>Math.min(...edges.map(([a,b])=>distance(p,a,b)))));
  assert.equal(directed(a,b),expected);
});
function checkGlyph(font: Font,cp: number,issues: string[]) {
  const cmds=font.charToGlyph(String.fromCodePoint(cp)).path.commands, cs=G.commandsToContours(cmds,font.unitsPerEm);
  assert(cs.length,`U+${cp.toString(16)} empty conversion`);
  // Nonzero outlines can overlap. Nesting depth is not a hole test here (CONTRACT).
  // Independently sample the source and compare each contour's relative winding.
  const original = originalPolys(cmds);
  const signedArea = (p: number[][]) => p.reduce((s,a,i) => {const b=p[(i+1)%p.length];return s+a[0]*b[1]-b[0]*a[1];},0)/2;
  const largest = original.reduce((a,p) => Math.abs(signedArea(p))>Math.abs(a)?signedArea(p):a,0);
  assert.equal(cs.length,original.length, `U+${cp.toString(16)} contour count`);
  cs.forEach((c,i)=>{
    assert(c.n.length>=2); assert(c.n.every(n=>n.length===7&&n.every(Number.isFinite)));
    const area=G.contourArea(c), expected=signedArea(original[i])*Math.sign(largest);
    if (Math.abs(expected)>1 && Math.sign(area)!==Math.sign(expected)) issues.push(`U+${cp.toString(16)} contour ${i}: winding differs from source`);
  });
  const k=font.unitsPerEm/1000;
  const back=cs.map(c=>G.flatten(c,.025/(.92*k)).map(([x,y])=>[(40+.92*x)*k,(840-.92*y)*k]));
  const orig=originalPolys(cmds), error=Math.max(directed(orig,back),directed(back,orig));
  assert(error<.5,`U+${cp.toString(16)} round-trip error=${error} (expected <0.5 font units)`);
  return error;
}
for(const entry of catalog) test('pack: '+entry.id, {skip: !enabled || (!entry.id.startsWith('g-') && !packDir), timeout: 180000}, async () => {
  const expectedSyllables=entry.packed==='ks' ? entry.ks2350 : entry.syllables;
  const start=performance.now(); let font: Font | undefined; const available: number[]=[]; let count=0; let ksCount=0; let max=0; const issues: string[]=[];
  try {
    const bytes = entry.id.startsWith('g-') ? await googleOriginal(entry) : fs.readFileSync(path.join(packDir!,entry.file));
    font=opentype.parse(ab(bytes));
    assert.strictEqual(font!.unitsPerEm,entry.unitsPerEm,'unitsPerEm');
    for(let cp=0xAC00;cp<=0xD7A3;cp++) if(font!.charToGlyphIndex(String.fromCodePoint(cp))>0) available.push(cp);
    count=available.length;ksCount=[...ks].filter(cp=>font!.charToGlyphIndex(String.fromCodePoint(cp))>0).length;
    if(count!==expectedSyllables) issues.push(`syllables expected ${expectedSyllables}, actual ${count}`);
    if(ksCount!==entry.ks2350) issues.push(`KS expected ${entry.ks2350}, actual ${ksCount}`);
    const fixed=[...'가각한글뷁힣'].map(ch=>ch.codePointAt(0)!);
    // Missing fixed probes are documented; substitute available seeded probes
    // so every pack still receives 40 distinct real-glyph checks.
    // Some source fonts encode placeholders with no outline; sample real glyphs,
    // while retaining the independent cmap counts above.
    const encoded=new Set(available);
    const hasOutline=(cp: number) => encoded.has(cp) && font!.charToGlyph(String.fromCodePoint(cp)).path.commands.some(c=>c.type==='L'||c.type==='Q'||c.type==='C');
    const samples=new Set(fixed.filter(hasOutline)); let seed=0x5EED1234, attempts=0;
    while(samples.size<40) {
      assert(attempts++<available.length*100, 'at least 40 real syllable outlines');
      seed=(Math.imul(seed,1664525)+1013904223)>>>0;
      const cp=available[seed%available.length]; if(hasOutline(cp)) samples.add(cp);
    }
    for(const cp of samples) try { max=Math.max(max,checkGlyph(font,cp,issues)); } catch(e) { issues.push(String(e)); }
    const missing=fixed.filter(cp=>!hasOutline(cp)).map(cp=>'U+'+cp.toString(16));
    if(missing.length) console.log(`NOTE ${entry.id}: unavailable fixed probes ${missing.join(',')}; replaced with seeded available syllables`);
  } catch(e) { issues.push(String(e)); }
  const line=`${entry.id} parsed=${!!font} syllables=${count}/${expectedSyllables} KS=${ksCount}/${entry.ks2350} maxError=${max.toFixed(6)}fu ms=${Math.round(performance.now()-start)}${issues.length?' FAIL':' PASS'}`;
  console.log(line);  for(const issue of issues) { console.error(`FAIL ${entry.id}: ${issue}`); }
  if(font&&['g-nanumpenscript','g-gaegu','g-notosanskr'].includes(entry.id)) {
    try {
      const startBuild=performance.now(),store: Store & Required<Pick<Store, 'overrides' | 'extra'>>={frames:{cho:{},jung:{},jong:{}},cells:{},overrides:{},extra:{}};
      for(let i=1;i<=8;i++) store.frames.cho[i]=[0,0,1000,1000];
      for(let i=1;i<=4;i++) { store.frames.jong[i]=[0,0,1000,1000]; for(const kind of ['세로','가로ㅗ','가로ㅜ','겹ㅗ','겹ㅜ']) store.frames.jung[i+'/'+kind]=[0,0,1000,1000]; }
      const convert=(cp: number)=>G.commandsToContours(font!.charToGlyph(String.fromCodePoint(cp)).path.commands,font!.unitsPerEm).map(c=>G.contourToTT(c,.3));
      for(const cp of available) store.overrides[String.fromCodePoint(cp)]={contours:convert(cp)};
      for(let cp=33;cp<=126;cp++) if(font!.charToGlyphIndex(String.fromCodePoint(cp))) store.extra[cp]={contours:convert(cp),advance:font!.charToGlyph(String.fromCodePoint(cp)).advanceWidth!*1000/font!.unitsPerEm};
      const bytes=Buffer.from(E.buildTTF(store,{composite:true,familyName:'Pack Check '+entry.id,copyright:entry.copyright,license:'SIL Open Font License 1.1',licenseUrl:entry.licenseUrl,spaceAdvance:font!.charToGlyph(' ').advanceWidth!*1000/font!.unitsPerEm}));
      fs.mkdirSync(outDir,{recursive:true});fs.writeFileSync(path.join(outDir,`pack_${entry.id}.ttf`),bytes);
      console.log(`BUILD ${entry.id} bytes=${bytes.length} ms=${Math.round(performance.now()-startBuild)} overrides=${available.length} extras=${Object.keys(store.extra).length}`);
    } catch(e) { issues.push(String(e)); }
  }
  assert.deepStrictEqual(issues, [], entry.id);
});
