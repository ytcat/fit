/* Camera orbit is independent of character poses and their cached skin matrices. */
(() => {
 const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
 class RingCamera {
  constructor(engine){
   this.engine=engine;this.points=new Map();this.last=null;this.yaw=0;this.minZoom=.30;this.maxZoom=1.85;
   const canvas=engine.canvas,stage=engine.stage||canvas;canvas.style.touchAction='none';if(stage.style)stage.style.touchAction='none';
   const down=e=>{
    if(this.downEvent===e)return;this.downEvent=e;
    if(e.button>0||e.target?.closest?.('button,a,input,select,textarea,[role="button"],.manual-rail,.practice-techniques'))return;
    const rect=canvas.getBoundingClientRect?.();if(rect&&(e.clientX<rect.left||e.clientX>rect.right||e.clientY<rect.top||e.clientY>rect.bottom))return;
    if(e.isPrimary||e.pointerType==='mouse')this.reset(e.pointerId);
    if(this.points.size>=2)return;
    this.points.set(e.pointerId,{x:e.clientX,y:e.clientY});
    try{canvas.setPointerCapture?.(e.pointerId);}catch{/* Window listeners retain a usable drag when capture is unavailable. */}
    this.last=this.measure();if(e.cancelable)e.preventDefault();
   };
   const end=e=>{this.points.delete(e.pointerId);this.last=this.measure();};
   const move=e=>{
    if(this.moveEvent===e)return;this.moveEvent=e;
    if(!this.points.has(e.pointerId))return;
    if(e.pointerType==='mouse'&&e.buttons===0){end(e);return;}
    this.points.set(e.pointerId,{x:e.clientX,y:e.clientY});const now=this.measure();
    if(this.last&&now.count===this.last.count){
     if(now.count===2){if(now.distance>=12&&this.last.distance>=12)this.zoom(now.distance/this.last.distance);}
     else this.rotate((now.x-this.last.x)*.01);
    }
    this.last=now;if(e.cancelable)e.preventDefault();
   };
   canvas.addEventListener('pointerdown',down);if(stage!==canvas)stage.addEventListener('pointerdown',down);
   canvas.addEventListener('pointermove',move,{passive:false});window.addEventListener('pointermove',move,{passive:false});
   for(const type of ['pointerup','pointercancel','lostpointercapture']){canvas.addEventListener(type,end);window.addEventListener(type,end,true);}
   canvas.addEventListener('wheel',e=>{e.preventDefault();this.zoom(Math.exp(-e.deltaY*.001));},{passive:false});
   for(const type of ['blur','pagehide','pageshow'])window.addEventListener(type,()=>this.reset());
   window.document?.addEventListener?.('visibilitychange',()=>{if(window.document.hidden)this.reset();});
   this.refit(engine.camera?.userData.orbitTarget||V(0,1,0));
  }
  reset(skipId){const ids=[...this.points.keys()];this.points.clear();this.last=null;for(const id of ids)if(id!==skipId)try{this.engine.canvas.releasePointerCapture?.(id);}catch{}}
  measure(){const p=[...this.points.values()];return p.length?{count:p.length,x:p[0].x,distance:p.length===2?Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y):0}:null;}
  markUserView(){if(this.engine.arena?.fightView)this.engine.arena.fightView.userView=true;}
  refit(target){const c=this.engine.camera;if(!c)return;this.target=target.clone();this.offset=c.position.clone().sub(target);if(Math.hypot(this.offset.x,this.offset.z)<.1)this.offset.z=5.8;c.userData.orbitTarget=target.clone();this.apply();}
  apply(){const e=this.engine,c=e.camera;if(!c||!this.offset)return;c.position.copy(this.target).add(this.offset.clone().applyAxisAngle(V(0,1,0),this.yaw));c.lookAt(this.target);c.updateMatrixWorld(true);e.lastRenderStamp=null;}
  rotate(delta){if(!Number.isFinite(delta))return;this.markUserView();this.yaw-=delta;this.apply();for(const id of ['camFront','camSide','camBack']){const b=window.document?.getElementById?.(id);if(b?.getAttribute?.('aria-pressed')!=='false')b?.setAttribute('aria-pressed','false');}}
  preset(groupYaw,soloYaw){const e=this.engine,target=e.arena&&e.arena.mode!=='none'?e.arena.group:e.activeModel;if(!target)return;this.reset();this.markUserView();this.yaw=target.rotation.y-(e.arena&&e.arena.mode!=='none'?groupYaw:soloYaw);e.fitCameraToModel?.(e.activeModel);this.apply();}
  zoom(ratio){const e=this.engine,c=e.camera;if(!c||!Number.isFinite(ratio)||ratio<=0)return;this.markUserView();c.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,c.zoom*ratio));c.updateProjectionMatrix();e.lastRenderStamp=null;}
  fit(){const e=this.engine;if(!e.camera)return;this.reset();e.camera.zoom=1;e.camera.updateProjectionMatrix();e.fitCameraToModel?.(e.activeModel);this.apply();}
 }
 window.RingCamera=RingCamera;
})();
