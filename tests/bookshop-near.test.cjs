'use strict';
const a=require('node:assert/strict'),fs=require('node:fs'),p=require('node:path'),vm=require('node:vm');
const root=process.env.GOTR_QA_STAGE||p.join(__dirname,'..');
const T=require(p.join(root,'assets/vendor/three.min.js'));global.THREE=T;global.window=global;global.self=global;
const labels=[];
const ctx=()=>new Proxy({}, {get:(_,k)=>k==='createImageData'||k==='getImageData'?((w,h)=>({data:new Uint8ClampedArray((w||1)*(h||1)*4)})):k==='measureText'?()=>({width:10}):k==='fillText'?value=>labels.push(value):/^create(Linear|Radial)Gradient$|^createPattern$/.test(k)?()=>({addColorStop(){}}):()=>{}});
global.document={createElement:()=>({width:0,height:0,getContext:ctx})};
require(p.join(root,'adventure/gloryland-map.js'));require(p.join(root,'adventure/free-walk/free-walk-sets.js'));
require(p.join(root,'assets/vendor/GLTFLoader.js'));const Loader=T.GLTFLoader;
const src=fs.readFileSync(p.join(__dirname,'../adventure/free-walk/bookshop-detail.js'),'utf8');
const binary=fs.readFileSync(p.join(__dirname,'../assets/street/city-review/oldtown-bookshop-near.glb'));
const scene=new T.Scene();
const map=GlorylandMap.build(scene,{walk:true,scale:3,time:'morning',skip:FreeWalkSets.skip});
const bind=()=>vm.runInNewContext(src,{window:global,THREE:T,document,console});
const count=(root,want)=>{let n=0;root.traverse(o=>{if(want(o))n++;});return n;};
async function main(){
  const url='./assets/street/city-review/oldtown-bookshop-near.glb';
  let requested=0, loaded;
  T.GLTFLoader=class Stub{load(path,good,bad,error){
    a.equal(path,url);requested++;loaded=new Promise((resolve,reject)=>new Loader().parse(binary.buffer.slice(binary.byteOffset,binary.byteOffset+binary.byteLength),'', glb=>{good(glb);resolve(glb);},e=>{error(e);reject(e);}));
  }};
  bind();
  const site=FreeWalkBookshopDetail.site(map);
  a.ok(site,'matched actual Old Town shop fascia');
  a.ok(Math.abs(site.x-145.821)<.10&&Math.abs(site.z+99.516)<.10);
  const get=()=>scene.getObjectByName('Old Town / The Reading Nook (near detail only)');
  const m=FreeWalkBookshopDetail.mount(map,scene,'en');
  m.update({x:500,z:500});a.equal(requested,0);a.equal(m.visible(),false);a.equal(get().children.length,0);
  const who={x:site.x+Math.sin(site.ry)*4,z:site.z+Math.cos(site.ry)*4};
  m.update(who);await loaded;await Promise.resolve();m.update(who);
  a.equal(requested,1);a.equal(m.visible(),true);
  a.equal(count(get(),o=>o.isMesh&&o.userData.fwSolid!==false),0,'existing heightfield wall only');
  a.equal(count(get(),o=>o.isMesh&&[o.material].flat().some(m=>m.transparent&&!m.depthWrite)),1,'one clear glass mesh, no hidden opaque cover');
  a.ok(labels.includes('THE READING NOOK'));
  m.update({x:site.x,z:site.z-13});a.equal(m.visible(),true,'hysteresis prevents flicker');
  m.update({x:site.x,z:site.z-16});a.equal(m.visible(),false,'zero far draws');
  a.ok(map.meshes['facade shop'].visible,'atlas intact even far.');
  m.dispose();a.equal(get(),undefined);
  for(const [lang,text] of [['he','פינת הקריאה'],['ru','КНИЖНЫЙ УГОЛОК']]){
    const b=FreeWalkBookshopDetail.mount(map,scene,lang);b.update(who);a.ok(b.visible()&&labels.includes(text));b.dispose();
  }
  T.GLTFLoader=class NotCached{load(p,g,k,fail){fail();}};bind();
  const fallback=FreeWalkBookshopDetail.mount(map,scene,'en');fallback.update(who);await new Promise(resolve=>setImmediate(resolve));fallback.update(who);
  a.equal(fallback.visible(),false);a.equal(get().children.length,0);a.ok(map.meshes['facade shop'].visible);fallback.dispose();
  console.log('PASS actual map façade at',site,'actual GLTFLoader.parse called, EN/HE/RU, no near asset on fallback, no additional collider/far draws');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
