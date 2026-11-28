'use strict';
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const path = require('node:path');
const {runInNewContext} = require('node:vm');
const root = path.resolve(__dirname, '..'), Three = require(process.env.THREE_PATH || path.join(root, 'assets/vendor/three.min.js'));
const file = readFileSync(path.join(root,'adventure/free-walk/free-walk.js'),'utf8');
const tail = file.lastIndexOf('})();');
assert.ok(tail > 0);
const win = {};
runInNewContext(file.slice(0,tail) + 'window.cameraTest = { cameraView, cameraRay, place, openYaw, setRun(v) { run = v; } };' + file.slice(tail), {
  window: win, THREE: Three, document: { readyState: 'loading', addEventListener() {} }
});
const {cameraView, cameraRay, place, openYaw, setRun} = win.cameraTest;
const d = 11.5, P = .6, xEye = 0, zEye = Math.cos(P) * d, yEye = 1.25 + Math.sin(P)*d;
const abs = Math.abs;
const scene = (wall = () => false, cover = () => false, land = () => 0) => ({
  grid: { top: (x,z) => wall(x,z) ? 22 : land(x,z), allowed: (x,z) => !wall(x,z), height: () => 0 },
  cameraCover: cover
});
const query = (town,yaw=0,distance=d) => cameraView(town,0,1.25,0,yaw,distance);
const desired = query(scene());
assert.equal(desired.yaw,0); assert.equal(desired.pitch,P); assert.equal(desired.free,d);

const tree = (x,y,z) => abs(x-xEye)<2.1 && abs(z-zEye)<2.1 && y>yEye-2 && y<yEye+3;
const branch = query(scene(undefined,tree));
assert.ok(abs(branch.yaw) >= .32, JSON.stringify(branch)); assert.equal(branch.pitch,P); assert.equal(branch.free,d);
assert.equal(openYaw(scene(undefined,tree),{x:0,z:0},0),branch.yaw);
const solidLeaves = query(scene(undefined,() => true));
assert.equal(solidLeaves.pitch,P); assert.equal(solidLeaves.free,d);

let active = scene();
const rig = {town:active, s:{x:0,z:0}, groundY:0, yaw:0, zoom:1, center:new Three.Vector3(),camera:new Three.PerspectiveCamera()};
setRun(rig);
place(true);
active = rig.town = scene(undefined,tree);
for (let j=0;j<40;j++) { place(false,1/60); assert.equal(rig.camD,d); assert.equal(rig.camP,P); }
assert.ok(abs(rig.camYaw) >= .30);
const eased=rig.camYaw;
rig.town=scene();
place(false,1/60);
assert.ok(abs(rig.camYaw) <= abs(eased) + .003 && abs(rig.camYaw) > .1, 'camera should hold briefly, then ease back');
for (let j=0;j<95;j++) place(false,1/60);
assert.ok(abs(rig.camYaw)<.001);
assert.ok(rig.camera.position.distanceTo(new Three.Vector3(0,yEye,zEye))<.025);
for (const m of [.55,1.45]) {
 rig.zoom=m;
 place(true);
 assert.ok(abs(rig.camD - d*m)<1e-8);
 assert.equal(rig.camP,P);
}

// If old eased yaw crosses a wooden wall, never render through it. A normal-height side is available.
rig.zoom=1; place(true);
const wall=(x,z)=>abs(x)<1.8&&z>=.75&&z<=6;
rig.town=scene(wall);
for (let j=0;j<70;j++) {
 const previous = rig.camYaw;
 place(false,1/60);
 const delta = Math.atan2(Math.sin(rig.camYaw-previous), Math.cos(rig.camYaw-previous));
 assert.ok(Math.abs(delta)<.45, 'never snap to a distant avoidance heading');
 const hit = cameraRay(rig.town,0,1.25,0,rig.camYaw,rig.camP,d,false);
 assert.ok(rig.camD<=hit.free+1e-6,'actual interpolated ray stayed before wall');
 assert.equal(rig.camP,P);
}
assert.ok(rig.camD>10.8,'side escape restores distance without player movement');
assert.ok(!wall(rig.camera.position.x,rig.camera.position.z));
const incline = query(scene(undefined,undefined,(x,z) => Math.hypot(x,z)*1.05));
assert.ok(incline.pitch>P && incline.pitch<=.96,'can raise horizon for real steep walkable grade, within bound');
const boxed = query(scene((x,z)=>z>=.70 || abs(x)>=.6),0);
assert.ok(boxed.free>=d*.9 && abs(boxed.yaw)>1.6,'solid corridor can choose a front-facing safe shot');
console.log('PASS Free Walk camera: tree side escape without zoom or pitch, standing recovery, manual endpoints, protective eased wall ray, walkable incline and narrow corner.');

// A manually selected low view must still avoid solids and recover the same view on clearance.
rig.zoom=1; rig.pitchTarget=-.22; rig.town=scene(); rig.yaw=0;
place(true);
assert.ok(rig.camera.position.y>1.25&&rig.skyTilt>.22);
const retired=rig.camera.position.clone();
rig.town=scene((x,z)=>Math.abs(x)<.9&&z>2.1&&z<5);
for(let i=0;i<90;i++) {
  place(false,1/60);
  const safe=cameraRay(rig.town,0,1.25,0,rig.camYaw,rig.camP,rig.camD,false);
  assert.equal(safe.free,rig.camD);
}
assert.ok(rig.camera.position.distanceTo(retired)>1&&rig.pitchTarget===-.22);
rig.town=scene(); place(false,1/60);
assert.ok(rig.camera.position.distanceTo(retired)>.2,'underlying target should ease back after occluder');
for(let i=0;i<135;i++)place(false,1/60);
assert.ok(rig.camera.position.distanceTo(retired)<.01&&rig.pitchTarget===-.22);
console.log('PASS manual pitch is preserved through hard wall avoidance and easing.');
