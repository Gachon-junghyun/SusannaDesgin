import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import { test } from 'node:test';
import * as E from '../engine.ts';
import type { Store } from '../engine.ts';
import { FRAME_DEFAULTS } from '../frames.ts';
import { inspectTTF } from './inspect_ttf.ts';
const rules = JSON.parse(fs.readFileSync(new URL('./bul_rules.json', import.meta.url), 'utf8')) as typeof E.BUL_RULES;
const defaults = FRAME_DEFAULTS.frames;
const rect = [[0.1,0.1],[0.9,0.1],[0.9,0.9],[0.1,0.9]];
const area = (c: number[][]) => c.reduce((sum,p,i) => { const q=c[(i+1)%c.length]; return sum+p[0]*q[1]-q[0]*p[1]; },0);
const store: Store = {
  version:1, name:'Synthetic fixture',
  frames:{cho:defaults['초성'],jung:defaults['중성'],jong:defaults['종성']},
  cells:Object.fromEntries(E.allCellKeys().map(k=>[k,{contours:[rect.map(p=>p.slice())]}])),
  overrides:{'한':{contours:[[[100,100],[900,100],[900,900],[100,900]]]}}
};
test('344 unique cells in contract order',()=>{
  assert.strictEqual(E.CHO,'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ');
  assert.strictEqual(E.JUNG,'ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ');
  assert.strictEqual(E.JONG,'ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ');
  const expected=[];
  for (const [part,letters,count] of ([['cho',E.CHO,8],['jung',E.JUNG,4],['jong',E.JONG,4]] as [string,string,number][]))
    for(let b=1;b<=count;b++) for(const letter of letters) expected.push(`${part}/${b}/${letter}`);
  assert.strictEqual(new Set(E.allCellKeys()).size,344);
  assert.deepStrictEqual(E.allCellKeys(),expected);
  assert(area(rect)>0);
});
test('all 11172 syllables round-trip and invalid inputs',()=>{
  for(let cp=0xAC00;cp<=0xD7A3;cp++) {
    const ch=String.fromCharCode(cp), d=E.decompose(ch)!;
    assert.strictEqual(E.compose(d.cho,d.jung,d.jong),ch);
  }
  for(const ch of ['', 'A','ㄱ','가나','😀',null,'\uABFF','\uD7A4']) assert.strictEqual(E.decompose(ch),null);
  assert.throws(()=>E.compose(19,0,0),RangeError);
  assert.throws(()=>E.bulFor(0,21,0),RangeError);
});
test('embedded bul tables match JSON and all selections',()=>{
  for(const key of Object.keys(E.BUL_RULES)) assert.deepStrictEqual(E.BUL_RULES[key as keyof typeof E.BUL_RULES],rules[key as keyof typeof rules],key);
  for(let c=0;c<19;c++) for(let v=0;v<21;v++) for(let t=0;t<28;t++) {
    assert.deepStrictEqual(E.bulFor(c,v,t),{
      cho:(t?rules.cho_bul_with_jong:rules.cho_bul_without_jong)[v]+1,
      jung:(rules.jung_bul_gk_cho_index.includes(c)?1:2)+(t?2:0),
      jong:t?rules.jong_bul_by_jung[v]+1:null
    });
    assert.strictEqual(E.jungClass(v),rules.jung_class[E.JUNG[v]]);
  }
});
test('specified syllable cell keys',()=>{
  for(const [ch,keys] of ([
    ['가',['cho/1/ㄱ','jung/1/ㅏ']],['까',['cho/1/ㄲ','jung/2/ㅏ']],
    ['카',['cho/1/ㅋ','jung/1/ㅏ']],['각',['cho/6/ㄱ','jung/3/ㅏ','jong/1/ㄱ']],
    ['곡',['cho/7/ㄱ','jung/3/ㅗ','jong/4/ㄱ']],['왜',['cho/4/ㅇ','jung/2/ㅙ']],
    ['뷁',['cho/8/ㅂ','jung/4/ㅞ','jong/3/ㄺ']]
  ] as [string,string[]][])) assert.deepStrictEqual(E.cellKeysFor(ch),keys);
});
test('frames, coordinate mapping, overrides and missing cells',()=>{
  const frame=[0,62,625,625];
  assert.deepStrictEqual(E.frameFor(store,'cho/1/ㄱ'),frame);
  assert.deepStrictEqual(E.frameFor(store,'jung/4/ㅞ'),defaults['중성']['4/겹ㅜ']);
  assert.deepStrictEqual(E.assemble(store,'가').contours[0],rect.map(([u,v])=>[u*625,62+v*563]));
  const han=E.assemble(store,'한');
  assert.strictEqual(han.source,'override');
  assert.deepStrictEqual(han.contours,store.overrides!['한'].contours);
  han.contours[0][0][0]=0;
  assert.strictEqual(store.overrides!['한'].contours[0][0][0],100);
  const sparse={...store,cells:{...store.cells},overrides:{'한':{contours:[]}}};
  delete sparse.cells['cho/1/ㄱ'];
  sparse.cells['jung/1/ㅏ']={contours:[]};
  assert.deepStrictEqual(E.assemble(sparse,'가'),{contours:[],source:'assembled',missing:['cho/1/ㄱ','jung/1/ㅏ']});
  assert.strictEqual(E.assemble(sparse,'한').source,'assembled');
  assert.deepStrictEqual(E.stats(store),{cellsDrawn:344,cellsTotal:344,overrides:1});
  assert.deepStrictEqual(E.stats(sparse),{cellsDrawn:342,cellsTotal:344,overrides:0});
});
test('font mapping preserves point order and flips winding',()=>{
  const c=[[0,0],[1000,0],[1000,1000],[0,1000]];
  assert.deepStrictEqual(E.toFontUnits([c]),[[[40,840],[960,840],[960,-80],[40,-80]]]);
  assert(area(E.toFontUnits([c])[0])<0);
  const hole=c.slice().reverse();
  assert(area(E.toFontUnits([hole])[0])>0);
  assert.deepStrictEqual(E.toFontUnits([[[0.5,0.5]]]),[[[40,840]]]);
});
test('all 51 standalone jamo use prescribed cells and boxes',()=>{
  for(let cp=0x3131;cp<=0x3163;cp++) {
    const ch=String.fromCharCode(cp), v=E.JUNG.indexOf(ch);
    let box,key;
    if(v>=0) {
      const cls=rules.jung_class[ch];
      box=cls==='세로'?[250,62,750,938]:cls.startsWith('가로')?[62,250,938,750]:[62,62,938,938];
      key='jung/2/'+ch;
    } else { box=[150,150,850,850]; key=(E.CHO.includes(ch)?'cho/1/':'jong/2/')+ch; }
    assert.deepStrictEqual(E.standaloneJamo(store,cp),[rect.map(([u,v])=>[box[0]+u*(box[2]-box[0]),box[1]+v*(box[3]-box[1])])]);
    assert.deepStrictEqual(E.standaloneJamo({...store,cells:{...store.cells,[key]:{contours:[]}}},cp),[]);
  }
  assert.strictEqual(E.standaloneJamo(store,0x3130),null);
  assert.strictEqual(E.standaloneJamo(store,0x3164),null);
});
test('KS X 1001 decoding',()=>{
  const ks=E.ks2350();
  assert.strictEqual(ks.length,2350); assert.strictEqual(new Set(ks).size,2350);
  assert.strictEqual(ks[0],'가'); assert.strictEqual(ks[2349],'힝'); assert(!ks.includes('똠'));
  assert(ks.every(ch=>E.decompose(ch)));
});
test('browser-safe named exports without runtime imports',()=>{
  const source = fs.readFileSync(new URL('../engine.ts',import.meta.url),'utf8');
  assert(!/^import\s/m.test(source));
  const js = ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020}}).outputText.replace(/export\s+/g, '');
  const context = {TextDecoder, frames: store.frames, result: null as null | {ch: string; count: number; signature: number; buildFont: string}};
  vm.runInNewContext(js + `; result = {ch: compose(0,0,0),count: ks2350().length,signature: new DataView(buildTTF({frames,cells: {},overrides: {}})).getUint32(0),buildFont: typeof buildFont}`, context);
  assert.deepStrictEqual(context.result && {...context.result}, {ch:String.fromCharCode(0xAC00),count:2350,signature:0x10000,buildFont:'undefined'});
});
const built: Buffer[]=[];

test('build both TrueType modes from the complete 344-cell fixture',()=>{
  const out=path.resolve('.hfont-test-out'); fs.mkdirSync(out,{recursive:true});
  fs.writeFileSync(path.join(out,'fixture_meta.json'),JSON.stringify({baseKeys:E.allCellKeys()},null,2),'utf-8');
  for (const composite of [true,false]) {
    const mode=composite?'composite':'simple', start=performance.now();
    const buffer=E.buildTTF(store,{familyName:'시험 한글 Fixture',composite});
    const elapsed=performance.now()-start;
    assert(buffer instanceof ArrayBuffer);
    const bytes=Buffer.from(buffer);
    built.push(bytes);
    assert.strictEqual(bytes.readUInt32BE(0),0x10000);
    fs.writeFileSync(path.join(out,composite?'fixture.ttf':'fixture_simple.ttf'),bytes);
    console.log(`BUILD_TIME_MS (${mode}): ${elapsed.toFixed(2)}`);
    console.log(`TTF_SIZE_BYTES (${mode}): ${bytes.length}`);
    assert(elapsed<3000,`${mode} build exceeded 3 seconds`);
  }
});
test('independent sfnt checksums, cmap, all glyphs, flags, metrics and maxima',()=>{
  const [composite,simple]=built.map(inspectTTF);
  assert.strictEqual(composite.numGlyphs,11569);
  assert.strictEqual(simple.numGlyphs,11225);
  assert.strictEqual(composite.names[1],'시험 한글 Fixture');
  assert(/^HW[0-9a-f]{8}-Regular$/.test(composite.names[6]));
  assert(composite.glyph(composite.glyphId('가'.charCodeAt(0))).components.length>0);
  assert.strictEqual(composite.glyph(composite.glyphId('한'.charCodeAt(0))).components.length,0);
  assert(composite.glyph(composite.glyphId('힣'.charCodeAt(0))).points.length>0);
  for(const cp of [...Array.from({length:11172},(_,i)=>0xAC00+i),...Array.from({length:51},(_,i)=>0x3131+i)]) {
    const a=composite.glyph(composite.glyphId(cp)),b=simple.glyph(simple.glyphId(cp));
    assert.strictEqual(a.bbox===null,b.bbox===null);
    if(a.bbox) assert(a.bbox.every((v,i)=>Math.abs(v-b.bbox![i])<=1),`bbox U+${cp.toString(16)}: ${a.bbox} vs ${b.bbox}`);
    assert.strictEqual(a.points.length,b.points.length);
    a.points.forEach((p,i)=>p.forEach((v,j)=>assert(Math.abs(v-b.points[i][j])<=1)));
  }
  console.log('BINARY_SUMMARY: PASS - both modes, all tables and 11223 encoded Hangul/jamo outlines within 1 unit');
});
test('fractional points, duplicate removal, holes, degenerate contours and empty store',()=>{
  const outer=[[0.1234,0.1187],[0.1234,0.1187],[0.9678,0.1345],[0.8421,0.9321],[0.1567,0.8765],[0.1234,0.1187]];
  const hole=[[0.4,0.4],[0.4,0.6],[0.6,0.6],[0.6,0.4]];
  const degenerate=[[0,0],[0,0],[1,1],[0,0]];
  const custom={...store,cells:Object.fromEntries(E.allCellKeys().map(k=>[k,{contours:[outer,hole,degenerate]}])),overrides:{}};
  const c=inspectTTF(Buffer.from(E.buildTTF(custom))), s=inspectTTF(Buffer.from(E.buildTTF(custom,{composite:false})));
  for(let cp=0xAC00;cp<=0xD7A3;cp++) {
    const a=c.glyph(c.glyphId(cp)), b=s.glyph(s.glyphId(cp));
    assert.strictEqual(a.points.length,b.points.length);
    a.points.forEach((p,i)=>p.forEach((v,j)=>assert(Math.abs(v-b.points[i][j])<=1,`fractional point U+${cp.toString(16)}: ${v} vs ${b.points[i][j]}`)));
  }
  const blank={...store,cells:{},overrides:{}};
  for(const composite of [true,false]) {
    const font=inspectTTF(Buffer.from(E.buildTTF(blank,{composite,familyName:'ASCII Family'})));
    assert.strictEqual(font.numGlyphs,11225);
    assert.strictEqual(font.glyph(font.glyphId(0xAC00)).points.length,0);
    assert.strictEqual(font.names[6],'ASCIIFamily-Regular');
  }
});
