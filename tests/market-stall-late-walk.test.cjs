'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const T=require('../assets/vendor/three.min.js');
global.THREE=T;global.window=global;global.self=global;
global.document={createElement(){return {getContext(){return new Proxy({}, {get(_,k){
 if(k==='measureText') return ()=>({width:10}); if(k==='getImageData')return () => ({data:new Uint8ClampedArray(4)});
 if(String(k).startsWith('create'))return ()=>({addColorStop(){}});
 return ()=>{};
 }});}};}};
require('../assets/vendor/GLTFLoader.js');
const Real=T.GLTFLoader;
const stuck=new Map(), calls=new Map();
let hold=true;
T.GLTFLoader=class extends Real {
 load(url,done,progress,fail){
  const leaf=url.split('/').at(-1); calls.set(leaf,(calls.get(leaf)||0)+1);
  const asset=() => {
   const data=fs.readFileSync(path.join(__dirname,'..',url));
   return this.parse(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength),'',done,fail);
  };
  if(hold) {stuck.set(leaf,(ok)=>ok?asset():fail(new Error('simulated first network error')));return;}
  return asset();
 }
};
require('../adventure/gloryland-map.js');
require('../adventure/story/story-sets.js');
require('../adventure/free-walk/market-stall-detail.js');
require('../adventure/free-walk/free-walk-sets.js');
(async()=>{
 const M=global.FreeWalkMarketStalls,F=global.FreeWalkSets;
 const scene=new T.Scene();
 const map={layout:{blocks:[],marketFrame:{o:[17,-24],U:[1,0],Wv:[0,1]},
        blockY:.5,landY:.08,landmarks:{}}};
 // Bounded work is allowed to settle before the held GLTF requests arrive.
 await F.prepare(0);
 const walk=F.build({map,scene,lang:'en',tier:'low'});
 const market=walk.sets.find(s=>s.id==='market');
 const status=()=>walk.marketStats();
 const stable=market.stalls.map(e=>e.root.children.filter(o=>o.userData.fwSolid));
 assert.equal(status().stock,7);assert.equal(status().authored.length,0);assert.equal(status().fallback.length,5);
 assert.equal(market.set.group.children.filter(o=>o.name.startsWith('Market loading fallback')).length,5);
 assert.ok(stable.every(l=>l.length===5));
 hold=false;
 // Test a real failed fish request and delayed asset arrival into THIS SAME set.
 for(const [file,release] of stuck)release(!file.startsWith('fish'));
 const until=Date.now()+6000;
 while(status().fallback.length && Date.now()<until)await new Promise(r=>setTimeout(r,40));
 assert.deepEqual(status(),{stock:7,authored:['baker','olive','spice','fish','textile'],fallback:[]});
 assert.equal(calls.get('fish-mid.glb'),2);assert.equal(calls.get('baker-mid.glb'),1);
 assert.equal(market.set.group.children.filter(o=>o.name.startsWith('Market loading fallback')).length,0);
 for(const [i,e] of market.stalls.entries()){
  assert.deepEqual(e.root.children.filter(o=>o.userData.fwSolid),stable[i]);
  let meshCount=0;e.root.getObjectByName('Authored mid stall '+e.id).traverse(o=>meshCount+=Number(!!o.isMesh));
  assert.ok(meshCount>0);
 }
 console.log('PASS real walk set + actual GLTF geometry: five late replacements, seven static stock slots, recovery from transient failed fish, same collision objects');
 walk.dispose();
})().catch(e=>{console.error(e);process.exitCode=1});
