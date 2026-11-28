'use strict';
const A = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
global.THREE = require('../assets/vendor/three.min.js'); global.window = global;
const ctx2d = () => new Proxy({}, { get: (_, k) => k === 'createImageData' || k === 'getImageData' ? ((w, h) => ({ data: new Uint8ClampedArray((w || 1) * (h || 1) * 4) })) : k === 'measureText' ? () => ({ width: 10 }) : /^create(Linear|Radial)Gradient$|^createPattern$/.test(k) ? () => ({ addColorStop() {} }) : () => {} });
global.document = { createElement: () => ({ width: 0, height: 0, getContext: ctx2d }) };
require('../adventure/gloryland-map.js');
const C = require('../adventure/free-walk/free-walk-core.js');
const town = fs.readFileSync(path.join(__dirname,'../adventure/free-walk/free-walk-town.js'), 'utf8');
const a = town.indexOf('const vehicleSegments ='), b = town.indexOf('    const crossing =', a);
A.ok(a>0 && b>a);
const makeGraphs = vm.runInNewContext('(segs, C, GlorylandMap, lay, S) => { '+town.slice(a,b)+'return { roads, trafficRoads }; }');
const map = GlorylandMap.build(new THREE.Scene(), { time: 'day', walk: true, scale: 3 });
const m = map.meshes['road marks'], P = m.geometry.attributes.position, I = m.geometry.index;
const mf = map.layout.marketFrame, local = (x,z) => {const dx=x-mf.o[0], dz=z-mf.o[1];return [dx*mf.U[0]+dz*mf.U[1],dx*mf.Wv[0]+dz*mf.Wv[1]];};
const pt = (u,w) => [mf.o[0]+mf.U[0]*u+mf.Wv[0]*w,mf.o[1]+mf.U[1]*u+mf.Wv[1]*w];
const within = ([u,w],p=0) => u > -1.5-p+1e-6 && u < 50.5+p-1e-6 && Math.abs(w)<3.5+p-1e-6;
const keepOut = (x,z) => !within(local(x,z));
let exterior = 0;
for (let k=0;k<(I?I.count:P.count);k++) {
  const j=I?I.getX(k):k, x=P.getX(j), z=P.getZ(j), p=local(x,z);
  A.ok(keepOut(x,z),'no painted stray or crosswalk vertex on central pedestrian plaza');
  if(p[0]>0 && p[0]<49 && Math.abs(p[1])>10 && Math.abs(p[1])<17)exterior++;
}
A.ok(exterior>48,'perimeter roads still have valid crossing/road paint');
const scale=3, scaled=p=>p.map(n=>n*scale);
const segs=map.layout.streets.map(s=>({a:scaled(s.a),b:scaled(s.b),w:s.w*scale,ext:s.w*scale/2}));
for(const s of map.layout.roads)for(let i=0;i+1<s.pts.length;i++)segs.push({a:scaled(s.pts[i]),b:scaled(s.pts[i+1]),w:s.w*scale,ext:0});
const {roads,trafficRoads}=makeGraphs(segs,C,GlorylandMap,map.layout,scale);
A.ok(roads.edges.length>trafficRoads.edges.length,'pedestrian connectivity remains; car network smaller');
const pivot=pt(22,0), near = o => Math.hypot(o.x/scale-pivot[0],o.z/scale-pivot[1]);
let neighborhood=0;
for(const E of trafficRoads.edges){
 for(const d of [-1,1])for(let i=0;i<=40;i++){
   const p=C.lanePose(trafficRoads,E.id,d,E.len*i/40);
   const c=local(p.x/scale,p.z/scale);
   A.ok(!within(c, .80),'both lane poses including chassis clearance avoid pedestrian plaza');
   for(const l of [-C.CAR.halfLen,C.CAR.halfLen])for(const w of [-C.CAR.halfWidth,C.CAR.halfWidth])
      A.ok(keepOut((p.x+p.ux*l+p.rx*w)/scale,(p.z+p.uz*l+p.rz*w)/scale),'each corner of the animated car footprint is outside');
   if(near(p)<19)neighborhood++;
 }
}
A.ok(neighborhood>100,'traffic still reaches the market perimeter');
for(const r of map.layout.inst.cars?.list || [])A.ok(!within(local(r.x,r.z),.79),'parked map cars out of the market area');
A.match(town,/const n = c.turn \|\| C.nextEdge\(trafficRoads,/,'runtime movement uses the same filtered graph');
console.log(`PASS market: playable graph ${roads.edges.length}; vehicle graph ${trafficRoads.edges.length}; ${neighborhood} nearby perimeter lane samples; ${exterior} outside-market paint vertices.`);
