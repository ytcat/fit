/* Local gesture controls; the same view transform moves boxer, equipment and room. */
(() => {
 class RingCamera {
  constructor(engine){
   this.engine=engine;this.points=new Map();this.last=null;
   const canvas=engine.canvas;canvas.style.touchAction='none';
   canvas.addEventListener('pointerdown',e=>{if(e.button>0)return;this.points.set(e.pointerId,{x:e.clientX,y:e.clientY});canvas.setPointerCapture?.(e.pointerId);this.last=this.measure();});
   canvas.addEventListener('pointermove',e=>{if(!this.points.has(e.pointerId))return;this.points.set(e.pointerId,{x:e.clientX,y:e.clientY});const now=this.measure();if(this.last&&now.count===this.last.count){if(now.count===2)this.zoom(now.distance/Math.max(1,this.last.distance));else this.rotate((now.x-this.last.x)*.01);}this.last=now;});
   const end=e=>{this.points.delete(e.pointerId);this.last=this.measure();};
   for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,end);
   canvas.addEventListener('wheel',e=>{e.preventDefault();this.zoom(Math.exp(-e.deltaY*.001));},{passive:false});
   window.addEventListener('blur',()=>{this.points.clear();this.last=null;});
  }
  measure(){const p=[...this.points.values()];if(!p.length)return null;return {count:p.length,x:p[0].x,distance:p.length===2?Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y):0};}
  rotate(delta){const e=this.engine,target=e.arena&&e.arena.mode!=='none'?e.arena.group:e.activeModel;if(!target)return;target.rotation.y+=delta;e.world?.update(e.animTime,e.arena?.mode||'none');e.lastRenderStamp=null;}
  zoom(ratio){if(!Number.isFinite(ratio)||ratio<=0)return;const e=this.engine,c=e.camera;c.zoom=Math.max(.65,Math.min(1.85,c.zoom*ratio));c.updateProjectionMatrix();e.lastRenderStamp=null;}
 }
 window.RingCamera=RingCamera;
})();
