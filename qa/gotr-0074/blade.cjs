/* GOTR-0074: torso blade in the guard = angle of the shoulder line from square to the target, in world space. */
const path=require('path');const {engine}=require(path.join(__dirname,'..','gotr-0024','measure.cjs'));
const V=()=>new THREE.Vector3();
for(const mode of ['none','heavy','fight']){
 const e=engine('lion');let c=e.coach;
 if(mode==='fight'){e.targetMode='fight';e.fightOptions={preset:'quick',seed:5};e.arena.setTarget('fight');const v=e.arena.fightView,m=v.match;m.phase='round';m.decide=()=>{};for(const f of Object.values(m.fighters)){f.action=null;f.next=Infinity;}for(let i=0;i<30;i++)v.step();c=v.coaches.lion;}
 else{e.targetMode=mode;e.player.setEnabled(true);e.arena.setTarget(mode);let t=0;for(;t<1.2;t+=1/120){e.animTime=t;e.arena.update(t,'combo','one_two');}}
 c.root.updateMatrixWorld(true);const f=new THREE.Vector3(0,0,1).transformDirection(c.root.matrixWorld),L=c.joints.armL.getWorldPosition(V()),R=c.joints.armR.getWorldPosition(V()),d=L.clone().sub(R).setY(0),ahead=d.dot(f),across=Math.sqrt(Math.max(0,d.lengthSq()-ahead*ahead));
 const hl=c.joints.thighL.getWorldPosition(V()),hr=c.joints.thighR.getWorldPosition(V()),hd=hl.sub(hr).setY(0),ha=hd.dot(f);
 console.log(mode,'shoulder line turned',(Math.atan2(ahead,across)*180/Math.PI).toFixed(1),'deg (lead shoulder',(ahead*100).toFixed(0),'cm ahead); hips',(Math.atan2(ha,Math.sqrt(Math.max(0,hd.lengthSq()-ha*ha)))*180/Math.PI).toFixed(1),'deg');
}
