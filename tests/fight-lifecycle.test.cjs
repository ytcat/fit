const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
global.THREE=require('../assets/vendor/three.min.js');global.window=global;global.document={createElement:()=>({getContext:()=>new Proxy({},{get:(_,key)=>key==='createImageData'?((w,h)=>({data:new Uint8ClampedArray(w*h*4)})):()=>{}})})};
for(const f of ['boxing-routines.js','boxing-coach-v2.js','contact-response.js','training-arena.js','boxing-fight.js','fight-referee.js','fight-arena.js'])vm.runInThisContext(fs.readFileSync(f,'utf8'));
const data=JSON.parse(fs.readFileSync('assets/models/coach-surface-v2.json')),coach=new LionCoach(data),engine={coach,demoModel:coach.root,scene:new THREE.Scene(),camera:new THREE.PerspectiveCamera(38,.5,.1,100),animTime:0,fitCameraToModel(){}};
const arena=new TrainingArena(engine,data);arena.setTarget('fight');const first=arena.fightView;let owned=0,shared=0,geometry=0;
first.referee.root.children.find(n=>n.isMesh).material.addEventListener('dispose',()=>owned++);arena.leather.addEventListener('dispose',()=>shared++);first.ring.children[0].geometry.addEventListener('dispose',()=>geometry++);
arena.setTarget('fight');assert.equal(owned,1);assert.equal(geometry,1);assert.equal(shared,0,'a new bout must not dispose shared arena materials');assert.equal(first.referee.root.parent,null);assert.ok(coach.root.parent===arena.group||coach.root.parent.parent===arena.group /* GOTR-0074: during a bout the fighters hang under the mirrored ring cast, itself a child of the arena group */);
arena.setTarget('none');assert.equal(arena.fightView,null);assert.equal(coach.root.parent,engine.scene);
console.log('PASS repeat-bout disposal releases transient geometry/materials and preserves shared assets');
