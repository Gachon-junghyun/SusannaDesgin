import assert from 'node:assert/strict';
import { test } from 'node:test';
import ClipperLib from 'clipper-lib';
import * as G from '../geom.ts';
import { DEFAULT_FRAMES } from '../frames.ts';
import type { Affine } from '../../geom.ts';
const square: G.Contour = {n:[[0,0,0,0,0,0,0],[100,0,0,0,0,0,0],[100,100,0,0,0,0,0],[0,100,0,0,0,0,0]]};
const near = (a: number[], b: number[], e=1e-7) => a.forEach((v,i)=>assert(Math.abs(v-b[i])<e, `${a} vs ${b}`));
const sumArea = (p: G.Polygon[]) => p.reduce((s,q)=>s+G.area(q),0);
test('frames: 32 measured boxes and normalized engine view',()=>{
  assert.deepStrictEqual(Object.values(DEFAULT_FRAMES).map(p=>Object.keys(p).length),[8,20,4]);
  assert.deepStrictEqual(DEFAULT_FRAMES.cho['1'],[0,62,625,625]);
});
test('cubic split/flatten, line preservation and nearest point',()=>{
  const s: G.Cubic = [[0,0],[0,100],[100,100],[100,0]], [a,b]=G.splitBez(s,.4);
  for(let i=0;i<=20;i++) { const t=i/20; near(G.bez(a,t),G.bez(s,t*.4)); near(G.bez(b,t),G.bez(s,.4+t*.6)); }
  assert.deepStrictEqual(G.flatten(square,.1),square.n.map(n=>n.slice(0,2)));
  const nearest=G.nearestOnContours([square],[50,-3]); assert(nearest); assert(Math.abs(nearest.d-3)<1e-6); near(nearest.p,[50,0],1e-4);
});
test('Schneider fitting and refit preserve shape and reduce points',()=>{
  const polygon=Array.from({length:120},(_,i)=>[50+40*Math.cos(i*Math.PI/60),50+40*Math.sin(i*Math.PI/60)]);
  const c=G.polygonToContour(polygon,.3,55); assert(c); assert(c.n.length<30);
  const sampled=G.flatten(c,.1); sampled.forEach(p=>assert(Math.abs(Math.hypot(p[0]-50,p[1]-50)-40)<.5));
  const fit=G.refit([c],.5,55); assert(fit.length); assert(G.contourArea(fit[0])>0);
});
test('cubic to quadratic tolerance and off-curve flags',()=>{
  const s: G.Cubic=[[0,0],[0,100],[100,100],[100,0]], qs=G.cubicToQuads(s,.1);
  assert(qs.length>1); near(qs.at(-1)![1],s[3]);
  qs.forEach(([q,end],i)=>{
    const start=i?qs[i-1][1]:s[0];
    for(let k=0;k<=10;k++) { const t=k/10, p=[(1-t)**2*start[0]+2*t*(1-t)*q[0]+t*t*end[0],(1-t)**2*start[1]+2*t*(1-t)*q[1]+t*t*end[1]]; near(p,G.bez(s,(i+t)/qs.length),.11); }
  });
  const c=G.clone(square); G.setSmooth(c,0,true); assert(G.contourToTT(c,.3).some(p=>p[2]===0));
});
test('node edits, smooth handles, exact insertion and deletion guard',()=>{
  const c=G.clone(square); G.moveNode(c,0,2,3); near(c.n[0].slice(0,2),[2,3]);
  G.setSmooth(c,0,true); G.setHandle(c,0,'out',[20,3]); assert(c.n[0][2]<0); assert(Math.abs(c.n[0][3])<1e-7);
  const before=G.segment(c,0); const i=G.insertNode(c,0,.3); assert.equal(i,1); near(c.n[1].slice(0,2),G.bez(before,.3));
  for(let k=0;k<=10;k++) near(G.bez(G.segment(c,0),k/10),G.bez(before,.3*k/10));
  assert(G.deleteNode(c,1)); assert.equal(c.n.length,4);
  const tri={n:c.n.slice(0,3)}; assert.equal(G.deleteNode(tri,0),false);
});
test('corner rounding and spike taming keep finite closed contours',()=>{
  const c=G.clone(square); assert(G.roundCorner(c,0,12)); assert.equal(c.n.length,5); assert(c.n.every(p=>p.length===7&&p.every(Number.isFinite)));
  const d=G.clone(square); assert(G.tameSpikes(d,{spikeDeg:80,radius:5})>0); assert(G.contourArea(d)>0);
});
test('direction: holes by containment; overlapping glyphs by largest contour',()=>{
  const inner=G.transform([square],[.3,0,0,.3,30,30])[0];
  const oriented=G.orientContours([G.reverseContour(square),inner]); assert(G.contourArea(oriented[0])>0); assert(G.contourArea(oriented[1])<0);
  const overlap=G.transform([square],[1,0,0,1,50,0])[0]; const same=G.orientByLargest([G.reverseContour(square),G.reverseContour(overlap)]);
  assert(same.every(c=>G.contourArea(c)>0));
});
test('font commands: quadratic/cubic conversion, winding, and affine TT path',()=>{
  const cmds: G.PathCommand[]=[{type:'M',x:100,y:100},{type:'Q',x1:50,y1:400,x:100,y:700},{type:'C',x1:300,y1:900,x2:700,y2:900,x:800,y:700},{type:'L',x:800,y:100},{type:'Z'}];
  const cs=G.commandsToContours(cmds,1000); assert.equal(cs.length,1); assert(cs[0].n.every(n=>n.length===7)); assert(G.contourArea(cs[0])>0);
  const m: Affine=[1.1,0,.2,.8,12,-5], fast=G.commandsToTT(cmds,1000,m), edited=G.transform(cs,m).map(c=>G.contourToTT(c,.3));
  assert(fast[0].some(p=>p[2]===0)); assert(edited[0].some(p=>p[2]===0));
  const box=(p: number[][][])=>G.bbox(p.map(c=>c.filter(p=>p.length===2)));
  near(box(fast),box(edited),.5);
});
test('affine adapters share maker application and round-trip frame coordinates',()=>{
  const f=DEFAULT_FRAMES.cho['1'], c=G.transform([square],G.sylToFrame(f)); const back=G.transform(c,G.frameToSyl(f));
  back[0].n.forEach((n,i)=>near(n,square.n[i]));
  const n=G.clone(square);G.transformNodes(n,[0],[2,0,0,3,10,20]);near(n.n[0].slice(0,2),[10,20]);near(n.n[1],square.n[1]);
  near(G.aroundPoint([2,0,0,2,0,0],50,50),[2,0,0,2,-50,-50]);
});
test('injected Clipper: union/difference/offset/simplify with holes',()=>{
  const a=G.flatten(square,.1), b=a.map(([x,y])=>[x+50,y]);
  assert.equal(sumArea(G.union(ClipperLib,[a,b])),15000);
  assert.equal(sumArea(G.difference(ClipperLib,[a],[b])),5000);
  const expanded=G.offset(ClipperLib,[a],5); assert(sumArea(expanded)>10000);
  const hole=G.transform([square],[.3,0,0,.3,30,30]).map(c=>G.flatten(c,.1));
  assert.equal(sumArea(G.difference(ClipperLib,[a],hole)),9100);
  assert(G.simplifyOne(ClipperLib,[[0,0],[100,100],[0,100],[100,0]]).length>0);
});
test('injected pen stroke: pressure/stabilization settings and polygon output',()=>{
  let called=false;
  const result=G.strokePolygon((points,options)=>{called=true;assert.equal(options.size,12);assert.equal(options.simulatePressure,false);assert(options.thinning>0);assert(points.every(p=>p.length>=2));return [[0,0],[10,0],[10,10]];},[[0,0,.2],[10,0,.5],[20,0,.7]],{size:12,pressure:true,stabilize:.5,straight:true});
  assert(called);assert.deepStrictEqual(result,[[0,0],[10,0],[10,10]]);
});
