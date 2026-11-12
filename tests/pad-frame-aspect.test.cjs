// GOTR-0070: the pad's portrait safe frame must keep the real picture shape (three.js sets camera.aspect = fullWidth/fullHeight in setViewOffset).
const fs=require('fs'),assert=require('node:assert/strict'),src=fs.readFileSync('fighter-pad.js','utf8');
assert.ok(!/setViewOffset\(1,1,/.test(src),'setViewOffset with a square full size stretches the picture');
const m=src.match(/c\.setViewOffset\(([^;]+)\);ownView=true/);assert.ok(m,'view offset call');
// evaluate the call with a fake camera that mimics three r128
const cam={aspect:.5,setViewOffset(fw,fh,x,y,w,h){this.aspect=fw/fh;this.view={fw,fh,x,y,w,h};}};
new Function('c','A','frame','H',`c.setViewOffset(${m[1]});`)(cam,.535,{k:1.2,d:10},800);
assert.ok(Math.abs(cam.aspect-.535)<1e-9,'camera aspect stays the canvas aspect');
assert.ok(Math.abs(cam.view.w/cam.view.fw-cam.view.h/cam.view.fh)<1e-9,'the frame widens equally in both directions');
console.log('PASS pad safe frame keeps the canvas aspect');
