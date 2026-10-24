import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as E from '../engine.ts';
import type { Store } from '../engine.ts';
import opentype from 'opentype.js';
const rect = [[100,100],[800,100],[800,800],[100,800]];
function tables(b: Buffer) {
  const out: Record<string, Buffer> = {};
  for (let i=0;i<b.readUInt16BE(4);i++) {
    const p=12+16*i, o=b.readUInt32BE(p+8);
    out[b.toString('ascii',p,p+4)]=b.subarray(o,o+b.readUInt32BE(p+12));
  }
  return out;
}
test('extra: BMP cmap, advances, jamo replacement, OFL names, OS/2, opentype',()=>{
  const options={composite:false,spaceAdvance:345,copyright:'Copyright 한글 test',license:'SIL Open Font License 1.1',licenseUrl:'https://openfontlicense.org'};
  const store: Store={frames: {cho:{},jung:{},jong:{}}, cells:{'cho/1/ㄱ':{contours:[[[.1,.1],[.9,.1],[.9,.9],[.1,.9]]]}},extra:{49:{contours:[rect],advance:550},65:{contours:[rect],advance:600},12593:{contours:[rect],advance:725}}};
  store.frames={cho:{},jung:{},jong:{}};
  for(let i=1;i<=8;i++) store.frames.cho[i]=[0,0,1000,1000];
  for(let i=1;i<=4;i++) { store.frames.jong[i]=[0,0,1000,1000]; for(const kind of ['세로','가로ㅗ','가로ㅜ','겹ㅗ','겹ㅜ']) store.frames.jung[i+'/'+kind]=[0,0,1000,1000]; }
  const b=Buffer.from(E.buildTTF(store,options)), t=tables(b), cmap=t.cmap;
  const s=cmap.subarray(cmap.readUInt32BE(8)), n=s.readUInt16BE(6)/2;
  assert.strictEqual(s.readUInt16BE(0),4);
  const power=2**Math.floor(Math.log2(n));
  assert.strictEqual(s.readUInt16BE(6),n*2);
  assert.strictEqual(s.readUInt16BE(8),power*2);
  assert.strictEqual(s.readUInt16BE(10),Math.log2(power));
  assert.strictEqual(s.readUInt16BE(12),n*2-power*2);
  const segments: {end: number; start: number; delta: number; range: number}[]=[];
  for(let i=0;i<n;i++) segments.push({end:s.readUInt16BE(14+2*i),start:s.readUInt16BE(16+2*n+2*i),delta:s.readInt16BE(16+4*n+2*i),range:s.readUInt16BE(16+6*n+2*i)});
  assert.deepStrictEqual(segments[n-1],{end:65535,start:65535,delta:1,range:0});
  for(let i=0;i<n;i++) { assert(segments[i].start<=segments[i].end); assert.strictEqual(segments[i].range,0); if(i) assert(segments[i-1].end<segments[i].start); }
  function gid(cp: number) { const seg=segments.find(x=>cp<=x.end); return !seg||cp<seg.start?0:(cp+seg.delta)&65535; }
  for(let cp=0;cp<=65535;cp++) {
    const expected=cp===32?1:cp===49?11225:cp===65?11226:cp>=0x3131&&cp<=0x3163?11174+cp-0x3131:cp>=0xAC00&&cp<=0xD7A3?2+cp-0xAC00:0;
    assert.strictEqual(gid(cp),expected,'cmap U+'+cp.toString(16));
  }
  for(const [cp,advance] of [[65,600],[49,550],[32,345],[0x3131,725]]) assert.strictEqual(t.hmtx.readUInt16BE(gid(cp)*4),advance);
  // Replacement is a simple glyph with precisely the supplied rectangle bbox.
  const o=t.loca.readUInt32BE(gid(0x3131)*4), g=t.glyf.subarray(o);
  assert.strictEqual(g.readInt16BE(0),1);
  assert.deepStrictEqual([2,4,6,8].map(p=>g.readInt16BE(p)),[132,104,776,748]);
  const names: Record<number, string>={}, ids: number[]=[], nt=t.name;
  for(let i=0;i<nt.readUInt16BE(2);i++) {
    const p=6+i*12,id=nt.readUInt16BE(p+6),len=nt.readUInt16BE(p+8),o=nt.readUInt16BE(4)+nt.readUInt16BE(p+10);
    let str=''; for(let j=0;j<len;j+=2) str+=String.fromCharCode(nt.readUInt16BE(o+j));
    ids.push(id); names[id]=str;
  }
  assert.deepStrictEqual(ids,ids.slice().sort((a,b)=>a-b));
  for(const [id,key] of ([[0,'copyright'],[13,'license'],[14,'licenseUrl']] as const)) assert.strictEqual(names[id],options[key]);
  assert.strictEqual(t['OS/2'].readUInt16BE(66),0xD7A3);
  assert(t['OS/2'].readUInt32BE(42)&1);
  const font=opentype.parse(b.buffer.slice(b.byteOffset,b.byteOffset+b.length));
  assert.strictEqual(font.charToGlyph('A').advanceWidth,600);
  console.log(`PASS extra_tests: exhaustive BMP cmap, ${n} segments/search fields, advances, jamo replacement, names, OS/2, opentype (${b.length} bytes)`);
});
