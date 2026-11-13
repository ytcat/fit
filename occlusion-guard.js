/* GOTR-0073: nothing may stand between the camera and the Fighter, the Coach / partner or the training target.
   The stations' own framing keeps props out of the way, but the camera is free (orbit, side lock, tall phone screens
   push it 7-12 m back, behind the gym's hanging bags, benches and racks). This guard is the safety net: once per drawn
   frame it tests the straight lines from the camera to each figure's head, chest and feet (and to the target's centre)
   against the oriented bounding boxes of the scenery, hides whatever a line crosses and shows it again shortly after the line
   is clear. Figures, the active target with its stand, the ring, the referee and the crowd are never touched (the
   crowd has its own near-side rule in fight-arena.js); a box the camera stands inside (the room itself) is not a prop.
   Poses, physics, cameras and scoring are untouched: only `visible` of scenery meshes / one instance's matrix. */
(() => {
 const HOLD=18,REBUILD=90,SHORT=.12,PAD=.02;
 const V=()=>new THREE.Vector3();
 class OcclusionGuard {
  constructor(engine){this.engine=engine;this.items=[];this.hidden=new Map();this.signature='';this.age=0;this.frame=0;this.a=V();this.b=V();this.d=V();this.count=0;}
  get suspended(){const e=this.engine,list=e.stage&&e.stage.classList;return !!(e.fightIQDemo||list&&list.contains('game-preview-live'));}
  // Roots that are never hidden and never tested: the figures and the station's own equipment.
  figures(){
   const e=this.engine,a=e.arena,fv=a&&a.mode==='fight'?a.fightView:null,coaches=[];
   if(fv&&fv.coaches)coaches.push(fv.coaches.lion,fv.coaches.rabbit);
   else{if(e.coach)coaches.push(e.coach);const partner=a&&(a.careerDrill&&a.careerDrill.trainer||(a.mode==='rabbit'?a.rabbit:null));if(partner)coaches.push(partner);}
   const target=!fv&&a&&a.models&&['heavy','dummy','speed'].includes(a.mode)?a.models[a.mode]:null;
   return {coaches:coaches.filter(c=>c&&c.root&&c.joints),target};
  }
  // World points that must stay in sight.
  points(){
   const {coaches,target}=this.figures(),out=[];
   for(const c of coaches){let shown=true;for(let q=c.root;q;q=q.parent)if(!q.visible){shown=false;break;}if(!shown)continue;
    for(const name of ['head','chest','footL','footR']){const j=c.joints[name];if(j)out.push(j.getWorldPosition(V()));}}
   if(target&&target.parent){const p=target.getWorldPosition(V());p.y+=this.engine.arena.mode==='speed'?1.75:1.25;out.push(p);}
   return out;
  }
  roots(){const e=this.engine,w=e.world,out=[];if(w&&w.gym)out.push(w.gym);if(w&&w.arena)out.push(w.arena);return out;}
  sign(){const e=this.engine,w=e.world,a=e.arena;return [a&&a.mode,a&&a.group&&a.group.rotation.y,w&&w.gym&&w.gym.rotation.y,w&&w.gym&&w.gym.visible,w&&w.arena&&w.arena.visible,w&&w.arena&&w.arena.children.length,a&&a.fightView&&a.fightView.ring&&a.fightView.ring.uuid].join('|');}
  // Each scenery mesh (or one instance of a batched fixture) is tested as its own oriented box: the geometry's bounding box
  // in the mesh's local frame. A long beam or grandstand tier that stands at an angle is therefore not mistaken for
  // everything inside its world-aligned box, and nothing is hidden unless the line really passes through it.
  entry(node,index,key,world){
   const g=node.geometry,inv=new THREE.Matrix4().copy(world).invert(),e=world.elements,box=g.boundingBox.clone();
   if(!Number.isFinite(inv.elements[0]+inv.elements[5]+inv.elements[10]+inv.elements[12]))return null;
   const sx=Math.hypot(e[0],e[1],e[2])||1,sy=Math.hypot(e[4],e[5],e[6])||1,sz=Math.hypot(e[8],e[9],e[10])||1;
   box.min.x-=PAD/sx;box.max.x+=PAD/sx;box.min.y-=PAD/sy;box.max.y+=PAD/sy;box.min.z-=PAD/sz;box.max.z+=PAD/sz;
   return {node,index,key,inv,box};
  }
  rebuild(){
   const items=[],mine=this.hidden,m=new THREE.Matrix4(),w=new THREE.Matrix4();
   for(const root of this.roots()){
    if(!root.visible)continue;root.updateMatrixWorld(true);
    const walk=node=>{
     if(!node.visible&&!mine.has(node))return;if(node.userData&&node.userData.occlusionKeep)return;
     if(node.layers&&node.layers.mask===0){for(const child of node.children)walk(child);return;}// masked by a venue set: not drawn
     if(node.isMesh&&!node.isSkinnedMesh&&node.geometry){
      const g=node.geometry;if(!g.boundingBox)g.computeBoundingBox();
      if(g.boundingBox&&!g.boundingBox.isEmpty()){
       if(node.isInstancedMesh){for(let i=0;i<node.count;i++){const key=node.uuid+':'+i,held=mine.get(key);if(held)m.copy(held.matrix);else node.getMatrixAt(i,m);
         if(Math.abs(m.elements[0])+Math.abs(m.elements[5])+Math.abs(m.elements[10])<1e-9)continue;
         const it=this.entry(node,i,key,w.multiplyMatrices(node.matrixWorld,m));if(it)items.push(it);}}
       else{const it=this.entry(node,-1,node,node.matrixWorld);if(it)items.push(it);}
      }
     }
     for(const child of node.children)walk(child);
    };
    walk(root);
   }
   this.items=items;this.age=0;
  }
  hide(item){
   if(this.hidden.has(item.key)){this.hidden.get(item.key).until=this.frame+HOLD;if(item.index<0&&item.node.visible){item.node.visible=false;this.engine.lastRenderStamp=null;}return;}
   if(item.index<0&&!item.node.visible)return;// already hidden by its owner (room cutaway, venue set): not ours to show again
   const entry={item,until:this.frame+HOLD};
   if(item.index>=0){entry.matrix=new THREE.Matrix4();item.node.getMatrixAt(item.index,entry.matrix);item.node.setMatrixAt(item.index,new THREE.Matrix4().makeScale(0,0,0));item.node.instanceMatrix.needsUpdate=true;}
   else item.node.visible=false;
   this.hidden.set(item.key,entry);this.engine.lastRenderStamp=null;
  }
  show(entry){
   const {item}=entry,w=this.engine.world;this.hidden.delete(item.key);
   if(item.index>=0){item.node.setMatrixAt(item.index,entry.matrix);item.node.instanceMatrix.needsUpdate=true;}
   else{item.node.visible=true;
    // Wall-side pieces follow the room's own cutaway: let it decide again.
    if(item.node.userData&&item.node.userData.wallZone&&w&&w.update){w.wallMask=null;w.viewYaw=null;w.update(this.engine.animTime||0,w.mode);}}
   this.engine.lastRenderStamp=null;
  }
  release(){for(const entry of [...this.hidden.values()])this.show(entry);}
  // True when the straight line from `from` to `to` (stopping SHORT of the figure) passes through the item's box.
  // A box the camera is inside (the room shell, a backdrop dome) is never an occluder.
  crosses(item,from,to){
   const a=this.a.copy(from).applyMatrix4(item.inv),b=this.b.copy(to).applyMatrix4(item.inv),box=item.box;
   if(box.containsPoint(a))return false;
   const world=this.d.copy(to).sub(from).length(),t1=1-SHORT/world;if(!(t1>0))return false;
   // slab test on the segment a + (b-a) t, t in [0, t1]
   let t0=0,tEnd=t1;
   for(const k of ['x','y','z']){const o=a[k],d=b[k]-o,lo=box.min[k],hi=box.max[k];
    if(Math.abs(d)<1e-12){if(o<lo||o>hi)return false;continue;}
    let n=(lo-o)/d,f=(hi-o)/d;if(n>f){const s=n;n=f;f=s;}if(n>t0)t0=n;if(f<tEnd)tEnd=f;if(t0>tEnd)return false;}
   return true;
  }
  // Called once per displayed frame, after the camera is placed and before drawing. Returns the number of hidden props.
  update(){
   const e=this.engine,c=e.camera;if(!c||typeof THREE==='undefined')return 0;
   if(this.suspended){if(this.hidden.size)this.release();return 0;}
   this.frame++;const s=this.sign();if(s!==this.signature||++this.age>=REBUILD||!this.items.length){this.signature=s;this.rebuild();}
   const from=c.getWorldPosition(V()),points=this.points();
   for(const item of this.items){let hit=false;for(const p of points)if(this.crosses(item,from,p)){hit=true;break;}if(hit)this.hide(item);}
   for(const entry of [...this.hidden.values()])if(entry.until<=this.frame)this.show(entry);
   this.count=this.hidden.size;return this.count;
  }
 }
 if(typeof module!=='undefined')module.exports={OcclusionGuard};
 if(typeof window!=='undefined')window.OcclusionGuard=OcclusionGuard;
})();
