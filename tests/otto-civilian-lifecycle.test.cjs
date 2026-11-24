const assert=require('node:assert/strict'), fs=require('node:fs'), path=require('node:path'),vm=require('node:vm'),cp=require('node:child_process');
const fixture=path.resolve(process.argv[2]||path.join(__dirname,'..')), root=path.join(__dirname,'..'), revision='9587e02ab464e5ab33136284d1580606242bb22a';
const ctx=new Proxy({}, {get:(o,k)=>k==='measureText'?()=>({width:20}):k==='createImageData'?((w,h)=>({data:new Uint8ClampedArray(w*h*4)})):()=>ctx});
global.window=global;global.self=global;global.THREE=require(fixture+'/assets/vendor/three.min.js');global.document={createElement:()=>({getContext:()=>ctx})};
for(const f of ['boxing-routines.js','avatar-anatomy.js','avatar-detail.js','avatar-shoulder.js','boxing-footwear.js','boxing-pose.js','boxing-coach-v2.js','adventure/story/story-cast.js','adventure/story/cast-market.js','adventure/story/dream-pose.js']){
 vm.runInThisContext(fs.readFileSync(fixture+'/'+f,'utf8'),{filename:f});
}
vm.runInThisContext(fs.readFileSync(root+'/adventure/story/otto-civilian.js','utf8'),{filename:'otto-civilian.js'});
const native={character:'otto',root:new THREE.Group()}, render=new THREE.Mesh(new THREE.PlaneGeometry(),new THREE.MeshBasicMaterial());render.layers.enable(7); render.castShadow=true; render.receiveShadow=false;native.root.add(render);
const mask=render.layers.mask;
const getFace=()=>native.root.children[1].getObjectByName('Mouth recess');
const gap=()=>{const p=getFace().geometry.attributes.position;return p.getY(22*51+25)-p.getY(25);};
assert.equal(OttoCivilian.enabled(''),false);
assert.equal(OttoCivilian.enabled('?walkPrototype=1&streetLife=1'),false);
assert.equal(OttoCivilian.enabled('?walkPrototype=1&streetLife=1&ottoCandidate=1'),true);
assert.equal(OttoCivilian.attach('dream_fight_night','otto',native),null);
assert.equal(OttoCivilian.attach('dream_otto_shop','fang',native),null);
assert.equal(OttoCivilian.attach('dream_otto_shop','otto',{character:'fang',root:native.root}),null);
for(const id of ['dream_otto_shop','dream_market_reward']){
 const a=OttoCivilian.attach(id,'otto',native);
 assert(a);assert.equal(render.layers.mask,0);assert.equal(render.castShadow,false);assert.equal(OttoCivilian.attach(id,'otto',native),null);
 const getIndex=()=>getFace().geometry.index;
 const originalIndex=getIndex();
 const line={who:'otto',t:id==='dream_otto_shop'?7.8:9};
 const suit={t:2,dt:1/60,arms:{R:'greet'},look:{yaw:.02,pitch:0},talk:1,walk:0,dist:0};
 const accentDone=id==='dream_otto_shop'?.3:1.11;
 a.update(suit,line,accentDone);assert(gap()>.02);
 a.update({...suit,t:5},line,3);assert(gap()<.003);
 a.update({...suit,t:5.02},line,accentDone);assert(gap()>.02);
 a.update({...suit,t:5.03},{who:'fighter',t:7.8},.3);assert(gap()<.003);
 a.update({...suit,t:5.04},line,accentDone);a.reset();assert(gap()<.003);
 assert.strictEqual(getIndex(),originalIndex);
 const geom=getFace().geometry;let disposal=0;geom.addEventListener('dispose',()=>disposal++);
 a.detach();a.detach();a.update(suit,line,.3);a.reset();
 assert.equal(disposal,1);assert.deepEqual(native.root.children,[render]);assert.equal(render.layers.mask,mask);assert.equal(render.castShadow,true);assert.equal(render.receiveShadow,false);
}
const m=JSON.parse(fs.readFileSync(root+'/offline-manifest.json','utf8')), read=f=>fs.readFileSync(root+'/'+f,'utf8'), w=read('offline-worker.js'), b=read('scripts/build_offline_manifest.py'), h=read('index.html');
assert(w.includes('ringfighter-offline-'+m.version)&&w.includes("manifest.version!=='"+m.version+"'")&&b.includes("'version':'"+m.version+"'"));
for(const f of ['./adventure/story/otto-civilian.js','./adventure/story/dream-scenes.js','./adventure/story/cast-market.js']){const n=m.urls.find(u=>u.split('?')[0]===f);assert(n&&h.includes(n),f+' loaded and in the offline pack (any cache version)');}
assert(m.urls.includes('./adventure/story/otto-civilian.js?v=otto492e63-lang'),'the approved Otto module (492e63; only its woven shop mark follows the language since lang-audit)');
assert(h.indexOf('dream-pose.js')<h.indexOf('otto-civilian.js')&&h.indexOf('otto-civilian.js')<h.indexOf('dream-scenes.js'));
const renderer=read('adventure/story/dream-scenes.js'),cull=renderer.indexOf('cullFr.setFromProjectionMatrix'),child=renderer.indexOf('ottoVisual.update(ottoState'),renderAt=renderer.indexOf('e.renderer.render(scene, camera)');
assert(!/OttoCivilian\?\.enabled|ottoCandidate/.test(renderer), 'no query is required');
assert(renderer.includes("if (rigs.otto && (id === 'dream_otto_shop' || id === 'dream_market_reward'))"));
assert(cull!==-1 && child>cull && renderAt>child);
assert(!/setIndex|lodRigs|userData\.lod|__lodShare/.test(renderer), 'v1.86 never swaps film indexes, including teardown');
assert(renderer.includes('const drawn = !!(ottoState && rigs.otto.root.visible)') && renderer.includes('else if (ottoWasDrawn) ottoVisual.reset()'));
assert(renderer.indexOf('releaseOtto();',renderer.indexOf('function cleanup()'))<renderer.indexOf('for (const b of borrowed) giveBack(b)'));
if(process.argv[3]){
 const exactBase=new Set(cp.execFileSync('git',['-C',process.argv[3],'ls-tree','-r','--name-only',revision],{encoding:'utf8'}).trim().split('\n'));
 for(const url of m.urls){const p=url.split('?')[0].replace(/^\.\//,'');assert(exactBase.has(p)||fs.existsSync(path.join(root,p)),url);}
}
console.log('PASS scoped shop/reward adapter; refusal elsewhere; native meshes/shadows restore; held line closes; seek/reset rest; dispose once; exact worker/manifest/index references. No browser/Service Worker execution.');
