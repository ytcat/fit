/* GOTR-0051: true orthodox stance.
   The fighter rig and all its choreography were authored with the lead hand, shoulder and foot on local -x while
   facing +z. For a body facing +z, -x is its RIGHT side, so every stance in the game was a mirror image (southpaw)
   of the orthodox stance it was meant to be (tests/orthodox-stance measures this in world space).
   A reflection is the only transform that turns one into the other, and a reflection of the whole picture changes
   no pose, contact, range or timing. So the 3D view is shown mirrored left-to-right:
   - the stage canvas is flipped with CSS;
   - flat signage (posters, wall signs, banners, floor marks) has its texture flipped back so text still reads;
   - a horizontal orbit drag is reversed so the scene still follows the finger.
   Fighters and their gear are not un-flipped: on them the mirror is the point. */
(() => {
 const flipped=new WeakSet();
 function flipTexture(t){if(!t||flipped.has(t))return;flipped.add(t);t.wrapS=THREE.RepeatWrapping;t.offset.x+=t.repeat.x;t.repeat.x=-t.repeat.x;t.needsUpdate=true;}
 // Articulated characters (anything hanging under the root of a skinned mesh) keep the mirror.
 function characterRoots(scene){const roots=new Set();scene.traverse(n=>{if(!n.isSkinnedMesh)return;let r=n.parent||n;for(let p=r;p&&p!==scene;p=p.parent)if(/coach|partner|referee|trainer|boxer/i.test(p.name||'')){r=p;break;}roots.add(r);});return roots;}
 function unflipSigns(scene){
  const roots=characterRoots(scene),inside=n=>{for(let p=n;p;p=p.parent)if(roots.has(p))return true;return false;};
  scene.traverse(n=>{if(!n.isMesh||n.isSkinnedMesh||inside(n))return;for(const m of [].concat(n.material||[])){const t=m&&m.map;if(t&&t.image&&(t.isCanvasTexture||t.image.getContext))flipTexture(t);}});
 }
 function install(engine){
  const canvas=engine.canvas;if(!canvas||!canvas.style)return;
  canvas.style.transform='scaleX(-1)';engine.orthodoxView=true;
  const camera=engine.viewControls&&Object.getPrototypeOf(engine.viewControls);
  if(camera&&camera.rotate&&!camera.rotate.orthodox){const rotate=camera.rotate;camera.rotate=function(delta){return rotate.call(this,-delta);};camera.rotate.orthodox=true;}
  const sweep=()=>{try{if(engine.scene)unflipSigns(engine.scene);}catch(error){console.warn('orthodox view',error);}};
  sweep();setInterval(sweep,700);
 }
 const api={install,unflipSigns,flipTexture};
 if(typeof module!=='undefined')module.exports=api;
 if(typeof window!=='undefined'){window.OrthodoxView=api;
  if(typeof document!=='undefined'&&document.getElementById){const start=setInterval(()=>{const e=window.app?.engine;if(!e||!e.scene||!e.viewControls)return;clearInterval(start);install(e);},200);}}
})();
