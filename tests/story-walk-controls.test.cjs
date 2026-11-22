const assert=require('node:assert/strict'), fs=require('node:fs'), W=require('../adventure/story/street-walk.js'), C=require('../adventure/story/dream-core.js');
const T=require('../assets/vendor/three.min.js');
assert.ok(!W.enabled('') && !W.enabled('?walkPrototype=0') && W.enabled('?walkPrototype=1'));
assert.deepEqual(['load','play','walk'].map(W.introSkip),['latch','start','ignore']);
assert.deepEqual(W.stickInput(.3,.3,18),[0,0]);
assert.ok(Math.abs(Math.hypot(...W.stickInput(25,-25,25))-1)<1e-8);
for(const city of [false,true]){
 const scene=city?C.withCity(C.scenes.dream_opening):C.scenes.dream_opening;
 const actor=C.sample(scene,W.START).actors.fighter;
 assert.ok(W.allowed(actor.x,actor.z),JSON.stringify(actor));
 const s=W.state(actor.x,actor.z,actor.ry);
 for(let i=0;i<1500&&!s.arrived;i++){
  const [p,q]=W.route(s.x,s.z).next,x=p-s.x,z=q-s.z,l=Math.hypot(x,z);
  W.move(s,(x*W.RIGHT[0]+z*W.RIGHT[1])/l,(x*W.UP[0]+z*W.UP[1])/l,.025);
  assert.ok(W.allowed(s.x,s.z));
 }
 assert.ok(s.arrived); const d=s.dist; W.move(s,0,1,.025); assert.equal(s.dist,d);
}
class Node extends EventTarget { constructor(){super();this.dataset={};this.style={};this.children=[];this.attrs={};} append(...ns){this.children.push(...ns); for(const n of ns)n.parent=this;} remove(){this.parent.children=this.parent.children.filter(n=>n!==this);} setAttribute(k,v){this.attrs[k]=v;} getBoundingClientRect(){return{left:12,top:160,width:106,height:106};} }
global.window=new EventTarget();window.THREE=T;global.document=new EventTarget();document.createElement=()=>new Node();
const kv=new Map();global.sessionStorage={getItem:k=>kv.get(k),setItem:(k,v)=>kv.set(k,v),removeItem:k=>kv.delete(k)};
function fire(o,name,p={}){const e=new Event(name,{cancelable:true});Object.assign(e,p);o.dispatchEvent(e);}
const dialog=new Node(), scene=new T.Scene(),camera=new T.PerspectiveCamera(40,402/690,.01,100),actor={x:3.5,z:5}; const api=W.open({dialog,scene,camera,actor,lang:'he',resumeKey:'test'});
const [layer]=dialog.children,[pad,zoom,hud]=layer.children;
assert.equal(layer.dir,'ltr'); assert.ok(pad.attrs['aria-label']?.length);
fire(pad,'pointerdown',{pointerId:9,pointerType:'touch',clientX:99,clientY:213});api.frame(.02);
const prev=api.s.dist; fire(window,'pointercancel',{pointerId:8}); fire(zoom.children[0],'click'); api.frame(.02); assert.ok(api.s.dist>prev && Number(layer.dataset.zoom)<W.DEFAULT_ZOOM);
fire(window,'pointercancel',{pointerId:9});const d=api.s.dist; api.frame(.02);assert.equal(api.s.dist,d);
fire(window,'keydown',{code:'KeyD'});api.frame(.02); assert.ok(api.s.dist>d);
fire(window,'blur');const d2=api.s.dist;api.frame(.02);assert.equal(api.s.dist,d2);
const look=new T.Vector3();api.view(look,.02,1); assert.ok(camera.position.y>look.y);
assert.match(hud.children[1].textContent,/^\d+ מ׳$/);
api.close(false);assert.equal(scene.children.length,0);assert.equal(dialog.children.length,0);assert.ok(W.resumePoint('test'));
const css=fs.readFileSync('adventure/story/dream.css','utf8');assert.match(css,/left:max\(12px,env\(safe-area-inset-left\)\)/);assert.match(css,/width:clamp\(96px,28vw,126px\)/);
console.log('story-walk-controls: flag, city/fallback route, ring, Hebrew HUD, radial analog/cancel/multi-touch, independent zoom, keyboard/blur, camera/resume PASS (mock DOM)');
