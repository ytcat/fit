const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
global.THREE=require('../assets/vendor/three.min.js');global.window=global;const globalEvents={};window.addEventListener=(t,f)=>globalEvents[t]=f;
vm.runInThisContext(fs.readFileSync('ring-camera.js','utf8'));
const events={},canvas={style:{},addEventListener:(t,f)=>events[t]=f,setPointerCapture(){}},camera=new THREE.PerspectiveCamera(38,.6,.1,100);camera.position.set(0,1.78,5.8);
const model=new THREE.Group(),engine={canvas,camera,activeModel:model,animTime:0,world:{update(){this.updated=true;}}},controls=new RingCamera(engine);
const fire=(type,id,x,y,extra={})=>events[type]({pointerId:id,clientX:x,clientY:y,button:0,...extra});
fire('pointerdown',1,100,200);fire('pointermove',1,140,200);assert.ok(Math.abs(controls.yaw+.4)<1e-10);assert.equal(model.rotation.y,0,'paused orbit must leave model/skin roots untouched');assert.ok(camera.position.x<0);fire('pointerup',1,140,200);
engine.arena={mode:'fight',group:new THREE.Group(),fightView:{}};engine.lastRenderStamp='paused';const yaw=controls.yaw;fire('pointerdown',1,100,200);fire('pointerdown',2,200,200);fire('pointermove',2,250,200);assert.equal(camera.zoom,1.5);assert.equal(controls.yaw,yaw);assert.equal(engine.arena.group.rotation.y,0);assert.equal(engine.lastRenderStamp,null);assert.equal(engine.arena.fightView.userView,true);
fire('pointercancel',2,250,200);fire('pointermove',1,110,200);assert.ok(Math.abs(controls.yaw-yaw+.1)<1e-10);globalEvents.blur();assert.equal(controls.points.size,0);
controls.zoom(.001);assert.equal(camera.zoom,.30);controls.zoom(100);assert.equal(camera.zoom,1.85);controls.zoom(NaN);assert.equal(camera.zoom,1.85);
let prevented=false;events.wheel({deltaY:100,preventDefault(){prevented=true;}});assert.ok(prevented&&camera.zoom<1.85);assert.equal(canvas.style.touchAction,'none');
// A missed end or unavailable pointer capture must never poison the next drag.
canvas.setPointerCapture=()=>{throw Error('capture unavailable');};fire('pointerdown',7,10,10,{pointerType:'touch',isPrimary:true});globalEvents.pointermove({pointerId:7,clientX:30,clientY:10,pointerType:'touch'});globalEvents.pointerup({pointerId:7});assert.equal(controls.points.size,0);
fire('pointerdown',8,10,10);fire('pointerdown',9,20,10,{pointerType:'touch',isPrimary:true});assert.equal(controls.points.size,1);assert.ok(controls.points.has(9));globalEvents.pageshow();assert.equal(controls.points.size,0);
fire('pointerdown',1,10,10,{pointerType:'mouse'});globalEvents.pointermove({pointerId:1,clientX:20,clientY:10,pointerType:'mouse',buttons:0});assert.equal(controls.points.size,0);
const before=controls.yaw,event={pointerId:11,clientX:50,clientY:10};fire('pointerdown',11,10,10);events.pointermove(event);globalEvents.pointermove(event);assert.ok(Math.abs(controls.yaw-before+.4)<1e-10,'bubbling a move must not rotate twice');controls.reset();
const oldYaw=controls.yaw;camera.position.set(0,1.8,7);controls.refit(new THREE.Vector3(0,1.3,0));assert.equal(controls.yaw,oldYaw);assert.ok(Math.abs(camera.position.z-7)>1e-3,'resize/refit preserves orbit');
controls.fit();assert.equal(camera.zoom,1);assert.equal(engine.animTime,0,'camera changes must keep a frozen exercise frozen');
console.log('PASS camera-only orbit, pinch, wider zoom, refit, interrupted capture, stale primary, lost mouse end, event deduplication and pause');
