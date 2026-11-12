/* GOTR-0051: glove centres in head space and elbow angles in the shadowboxing guard (Play idle). */
const path=require('path');const {engine}=require(path.join(__dirname,'..','gotr-0024','measure.cjs'));
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
for(const mode of ['none','heavy','fight']){
 const e=engine('lion');let c=e.coach;
 if(mode==='fight'){e.targetMode='fight';e.fightOptions={preset:'quick',seed:5};e.arena.setTarget('fight');const v=e.arena.fightView,m=v.match;m.phase='round';m.decide=()=>{};for(const f of Object.values(m.fighters)){f.action=null;f.next=Infinity;}for(let i=0;i<30;i++)v.step();c=v.coaches.lion;}
 else{e.targetMode=mode;e.player.setEnabled(true);e.arena.setTarget(mode);let t=0;for(;t<1.2;t+=1/120){e.animTime=t;e.arena.update(t,'combo','one_two');}}
 c.root.updateMatrixWorld(true);const inv=new THREE.Matrix4().copy(c.joints.head.matrixWorld).invert();
 for(const s of ['L','R']){const g=c.joints['hand'+s].localToWorld(V(0,-.12,0)).applyMatrix4(inv),w=c.point(c.joints['hand'+s]),el=c.point(c.joints['elbow'+s]),sh=c.point(c.joints['arm'+s]);
  console.log(mode,s,'glove centre in head space',g.toArray().map(x=>+x.toFixed(3)),'wrist',w.toArray().map(x=>+x.toFixed(3)),'elbow',el.toArray().map(x=>+x.toFixed(3)),'shoulder',sh.toArray().map(x=>+x.toFixed(3)));}
}
