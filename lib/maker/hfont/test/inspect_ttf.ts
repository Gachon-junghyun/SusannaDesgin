
// Independent byte-level reader used only by the tests. Deliberately does not
// call writer internals, so directory offsets and cmap/glyf layouts are checked.
import assert from 'node:assert/strict';
function checksum(bytes: Uint8Array) {
  let sum=0;
  for(let i=0;i<bytes.length;i+=4) {
    let word=0;
    for(let j=0;j<4;j++) word=word*256+(bytes[i+j]||0);
    sum=(sum+word)>>>0;
  }
  return sum;
}
export function inspectTTF(bytes: Buffer) {
  const tables: Record<string, Buffer>={}, tags: string[]=[];
  assert.strictEqual(bytes.readUInt32BE(0),0x10000);
  const count=bytes.readUInt16BE(4);
  assert.strictEqual(checksum(bytes),0xB1B0AFBA);
  let nextOffset=12+16*count;
  for(let i=0;i<count;i++) {
    const p=12+i*16, tag=bytes.toString('ascii',p,p+4);
    const sum=bytes.readUInt32BE(p+4), offset=bytes.readUInt32BE(p+8), length=bytes.readUInt32BE(p+12);
    tags.push(tag);
    assert.strictEqual(offset,nextOffset);
    assert.strictEqual(offset%4,0);
    assert(offset+length<=bytes.length);
    const table=Buffer.from(bytes.subarray(offset,offset+length));
    tables[tag]=table;
    if(tag==='head') {
      const adjusted=Buffer.from(bytes), adjustment=table.readUInt32BE(8);
      adjusted.writeUInt32BE(0,offset+8);
      assert.strictEqual(adjustment,(0xB1B0AFBA-checksum(adjusted))>>>0);
      table.writeUInt32BE(0,8);
    }
    assert.strictEqual(checksum(table),sum,`${tag} table checksum`);
    nextOffset=offset+((length+3)&~3);
    for(let j=offset+length;j<nextOffset;j++) assert.strictEqual(bytes[j],0);
  }
  assert.deepStrictEqual(tags,tags.slice().sort());
  assert.deepStrictEqual(tags,['OS/2','cmap','glyf','head','hhea','hmtx','loca','maxp','name','post']);
  assert.strictEqual(tables.head.length,54); assert.strictEqual(tables.hhea.length,36);
  assert.strictEqual(tables.maxp.length,32); assert.strictEqual(tables['OS/2'].length,96);
  assert.strictEqual(tables.post.length,32);
  assert.strictEqual(tables.head.readUInt16BE(18),1000);
  assert.strictEqual(tables.head.readInt16BE(50),1);
  assert.strictEqual(tables.hhea.readInt16BE(4),880); assert.strictEqual(tables.hhea.readInt16BE(6),-120);
  assert.strictEqual(tables.maxp.readUInt32BE(0),0x10000);
  assert.strictEqual(tables['OS/2'].readUInt16BE(0),4);
  assert.strictEqual(tables['OS/2'].readUInt16BE(8),0);
  assert.strictEqual(tables['OS/2'].readUInt16BE(74),880);
  assert.strictEqual(tables['OS/2'].readUInt16BE(76),120);
  assert(tables['OS/2'].readUInt32BE(46)&(1<<20));
  assert(tables['OS/2'].readUInt32BE(46)&(1<<24));
  assert(tables['OS/2'].readUInt32BE(78)&(1<<19));
  assert.strictEqual(tables.post.readUInt32BE(0),0x30000);
  const numGlyphs=tables.maxp.readUInt16BE(4);
  assert.strictEqual(tables.hhea.readUInt16BE(34),numGlyphs);
  assert.strictEqual(tables.hmtx.length,numGlyphs*4);
  assert.strictEqual(tables.loca.length,(numGlyphs+1)*4);
  const cmap=tables.cmap;
  assert.strictEqual(cmap.readUInt16BE(2),2);
  assert.deepStrictEqual([cmap.readUInt16BE(4),cmap.readUInt16BE(6)],[0,3]);
  assert.deepStrictEqual([cmap.readUInt16BE(12),cmap.readUInt16BE(14)],[3,1]);
  assert.strictEqual(cmap.readUInt32BE(8),cmap.readUInt32BE(16));
  const sub=cmap.subarray(cmap.readUInt32BE(8)), segs=sub.readUInt16BE(6)/2;
  assert.strictEqual(sub.readUInt16BE(0),4);
  assert.strictEqual(sub.length,sub.readUInt16BE(2));
  function glyphId(cp: number) {
    for(let i=0;i<segs;i++) if(cp<=sub.readUInt16BE(14+2*i)) {
      const start=sub.readUInt16BE(16+2*segs+2*i);
      if(cp<start) return 0;
      const delta=sub.readInt16BE(16+4*segs+2*i);
      assert.strictEqual(sub.readUInt16BE(16+6*segs+2*i),0);
      return (cp+delta)&0xFFFF;
    }
    return 0;
  }
  assert.strictEqual(glyphId(0x20),1);
  for(let cp=0xAC00;cp<=0xD7A3;cp++) assert.strictEqual(glyphId(cp),2+cp-0xAC00);
  for(let cp=0x3131;cp<=0x3163;cp++) assert.strictEqual(glyphId(cp),11174+cp-0x3131);
  const names: Record<number, string>={};
  assert.strictEqual(tables.name.readUInt16BE(2),6);
  for(let i=0;i<6;i++) {
    const p=6+i*12, table=tables.name;
    assert.deepStrictEqual([table.readUInt16BE(p),table.readUInt16BE(p+2),table.readUInt16BE(p+4)],[3,1,0x409]);
    const id=table.readUInt16BE(p+6), length=table.readUInt16BE(p+8), offset=table.readUInt16BE(4)+table.readUInt16BE(p+10);
    let str=''; for(let j=0;j<length;j+=2) str+=String.fromCharCode(table.readUInt16BE(offset+j));
    names[id]=str;
  }
  assert(/^[\x21-\x7E]{1,63}$/.test(names[6]));
  type Glyph = {points: number[][]; contourCount: number; components: number[]; bbox: number[] | null; box: number[]};
  const cache=new Map<number, Glyph>();
  function glyph(id: number): Glyph {
    if(cache.has(id)) return cache.get(id)!;
    assert(id>=0&&id<numGlyphs);
    const start=tables.loca.readUInt32BE(id*4), end=tables.loca.readUInt32BE(id*4+4);
    assert(start<=end&&end<=tables.glyf.length);
    assert.strictEqual(start%4,0);
    const data=tables.glyf.subarray(start,end);
    let points: number[][]=[]; let contourCount=0; const components: number[]=[]; let box=[0,0,0,0];
    if(data.length) {
      contourCount=data.readInt16BE(0);
      box=[2,4,6,8].map(p=>data.readInt16BE(p));
      let p=10;
      if(contourCount>=0) {
        const ends=[];
        for(let i=0;i<contourCount;i++,p+=2) ends.push(data.readUInt16BE(p));
        const n=ends.length?ends[ends.length-1]+1:0;
        const instructions=data.readUInt16BE(p); p+=2+instructions;
        const flags=[];
        for(let i=0;i<n;i++) {
          const f=data[p++]; flags.push(f);
          if(f&8) { const repeats=data[p++]; for(let j=0;j<repeats;j++) { flags.push(f); i++; } }
        }
        assert(flags[0]&0x40);
        assert(flags.every(f=>f&1));
        const coords: number[][]=[[],[]];
        for(let a=0;a<2;a++) {
          let value=0;
          for(const f of flags) {
            const short=f&(a===0?2:4), same=f&(a===0?16:32);
            if(short) value+=(same?1:-1)*data[p++];
            else if(!same) { value+=data.readInt16BE(p); p+=2; }
            coords[a].push(value);
          }
        }
        points=coords[0].map((x,i)=>[x,coords[1][i]]);
        let first=0;
        for(const last of ends) {
          const contour=points.slice(first,last+1);
          assert(new Set(contour.map(pt=>pt.join(','))).size>=3);
          for(let i=0;i<contour.length;i++) assert.notDeepStrictEqual(contour[i],contour[(i+1)%contour.length]);
          first=last+1;
        }
      } else {
        assert.strictEqual(contourCount,-1);
        let flags;
        contourCount=0;
        do {
          flags=data.readUInt16BE(p); const child=data.readUInt16BE(p+2); p+=4;
          assert(flags&1); assert(flags&2); assert(flags&0x40); assert(flags&0x400); assert(flags&0x1000);
          const dx=data.readInt16BE(p),dy=data.readInt16BE(p+2),sx=data.readInt16BE(p+4)/16384,sy=data.readInt16BE(p+6)/16384; p+=8;
          assert(sx>0&&sy>0);
          const base=glyph(child);
          assert.strictEqual(base.components.length,0);
          points.push(...base.points.map(([x,y])=>[x*sx+dx,y*sy+dy]));
          contourCount+=base.contourCount;
          components.push(child);
        } while(flags&0x20);
      }
      for(;p<data.length;p++) assert.strictEqual(data[p],0);
    }
    const bbox=points.length?[Math.min(...points.map(p=>p[0])),Math.min(...points.map(p=>p[1])),Math.max(...points.map(p=>p[0])),Math.max(...points.map(p=>p[1]))]:null;
    if(bbox) assert.deepStrictEqual(box,bbox.map(Math.round));
    assert.strictEqual(tables.hmtx.readUInt16BE(id*4),id===1?300:1000);
    assert.strictEqual(tables.hmtx.readInt16BE(id*4+2),box[0]);
    const g={points,contourCount,components,bbox,box}; cache.set(id,g); return g;
  }
  const maxima=[0,0,0,0], boxes=[];
  let maxComponents=0;
  for(let i=0;i<numGlyphs;i++) {
    const g=glyph(i), base=g.components.length?2:0;
    maxima[base]=Math.max(maxima[base],g.points.length); maxima[base+1]=Math.max(maxima[base+1],g.contourCount);
    maxComponents=Math.max(maxComponents,g.components.length);
    if(g.points.length) boxes.push(g.box);
  }
  assert.deepStrictEqual([6,8,10,12].map(p=>tables.maxp.readUInt16BE(p)),maxima);
  assert.strictEqual(tables.maxp.readUInt16BE(28),maxComponents);
  assert.strictEqual(tables.maxp.readUInt16BE(30),maxComponents?1:0);
  const fontBox=boxes.length?[Math.min(...boxes.map(b=>b[0])),Math.min(...boxes.map(b=>b[1])),Math.max(...boxes.map(b=>b[2])),Math.max(...boxes.map(b=>b[3]))]:[0,0,0,0];
  assert.deepStrictEqual([36,38,40,42].map(p=>tables.head.readInt16BE(p)),fontBox);
  return {glyph,glyphId,numGlyphs,names,tables};
};
