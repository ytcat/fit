'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const repo=process.env.GOTR_TEST_ROOT||path.join(__dirname,'..');
const T=require(path.join(repo,'assets/vendor/three.min.js'));
const script=p=>fs.readFileSync(path.join(repo,p),'utf8');
const fill=new Map(),programs=[];
const document={createElement(){const el={};el.getContext=()=>new Proxy({},{
  get(o,n){return ({fillText:(s)=>programs.push(s),fillRect:()=>{},strokeRect:()=>{},arc:()=>{},fill:()=>{},stroke:()=>{},beginPath:()=>{},lineTo:()=>{},moveTo:()=>{},translate:()=>{},save:()=>{},restore:()=>{}})[n]||o[n];},
  set(o,n,v){o[n]=v;return true;}
});return el;}};
const source=fs.readFileSync(path.join(__dirname,'../adventure/free-walk/city-storefronts.js'),'utf8');
const win={THREE:T}, env=vm.createContext({window:win,THREE:T,document,performance:{now:()=>0},console});
vm.runInContext(script('adventure/story/street-life.js'),env);
assert.equal(typeof win.StreetLife.walker,'function');
vm.runInContext(source,env);
for(const [lang,sample] of [['en','RING SPORTS'],['he','ספורט בזירה'],['ru','БОКС']]){
  programs.length=0;
  const s=win.CityStorefronts.build({lang});
  assert.deepEqual(JSON.parse(JSON.stringify(s.stats())),{shops:['tv','bar'],screens:12,channels:12,patrons:3});
  assert.ok(programs.includes(sample),lang+' channel label');
  const geometry=s.group.getObjectByName('12 lively televisions / 12 channels').geometry;
  assert.equal(geometry.attributes.position.count,72);
  assert.equal(geometry.attributes.uv.count,72);
  const get = a=>s.group.getObjectByName(a);
  const mesh=get('12 lively televisions / 12 channels'),v=mesh.material.map.version;
  s.update({x:100,z:100},null,1);assert.equal(mesh.material.map.version,v,'does not upload video atlas far from shop');
  s.update({x:-9.5,z:9.5},null,1.2);assert.equal(mesh.material.map.version,v+1,'redraw only when nearby');
  s.update({x:-9.5,z:9.5},null,1.21);assert.equal(mesh.material.map.version,v+1,'throttle atlas updates');
  const b=get('Copper Tap bartender');assert.ok(b.isSkinnedMesh,'staff is a 3D rig, not a flat card');
  s.update({x:9.15,z:12},null,1.5);assert.ok(Math.abs(b.userData.bones.foreR.rotation.x)>.55);
  assert.equal(get('Show window glass bar').material.depthWrite,false);
  assert.ok(s.group.getObjectByName('Localized shop sign bar'));
  s.dispose();
}
const stores=win.CityStorefronts.build({section:'market',lang:'he'});
assert.deepEqual(JSON.parse(JSON.stringify(stores.stats())).shops,['records','florist']);
stores.dispose();
console.log('PASS: 12 distinct local TV channels x 3 languages, single throttled near-field atlas, 3 rigged pub NPCs, 2 additional localized shopfronts');
