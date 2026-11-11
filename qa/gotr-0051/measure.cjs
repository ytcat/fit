/* GOTR-0051 stance measurement: in the guard (between punches) of every mode, both species.
   Reports, in the fighter's own frame (root +z = facing): lead-minus-rear glove offset along the facing,
   glove heights, foot stagger along the facing and across, chest and pelvis turn from square (deg, positive =
   lead side forward = bladed orthodox), rear heel lift, knee bend.
   Usage (repo root): node qa/gotr-0051/measure.cjs [out.json] */
const fs=require('fs'),path=require('path');
const {engine}=require(path.join(__dirname,'..','gotr-0024','measure.cjs'));
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z),r=x=>Math.round(x*1000)/1000,deg=x=>Math.round(THREE.MathUtils.radToDeg(x)*10)/10;
function stance(c){
 const L=n=>c.point(c.joints[n]),q=n=>c.root.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(c.joints[n].getWorldQuaternion(new THREE.Quaternion()));
 const hl=L('handL'),hr=L('handR'),fl=L('footL'),fr=L('footR');
 // Turn of a bone's lateral axis (+x) about vertical: 0 = square to the facing; positive = left (lead) side forward.
 const turn=n=>{const x=V(1,0,0).applyQuaternion(q(n));return Math.atan2(-x.z,x.x);};
 const knee=s=>{const a=L('thigh'+s),b=L('knee'+s),f=L('foot'+s);return 180-THREE.MathUtils.radToDeg(b.clone().sub(a).angleTo(f.clone().sub(b)));};
 const heel=s=>{const foot=c.joints['foot'+s];const h=foot.localToWorld(V(0,-.102,-.02)),t=foot.localToWorld(V(0,-.102,.215));return h.y-t.y;};
 return {gloveLeadAhead:r(hl.z-hr.z),gloveLeadY:r(hl.y),gloveRearY:r(hr.y),gloveGapX:r(hr.x-hl.x),footStaggerZ:r(fl.z-fr.z),footWidthX:r(fr.x-fl.x),chestTurn:deg(turn('chest')),hipTurn:deg(turn('hips')),rearHeelLift:r(heel('R')),kneeBend:Math.round((knee('L')+knee('R'))/2)};
}
function mode(name,species){
 const e=engine(species);e.technique='combo';e.currentAnim='one_two';
 if(name==='shadow'){e.arena.setTarget('none');const out=e.coach.update(0,'guard','one_two',{});return stance(e.coach);}
 if(name==='fight'){e.targetMode='fight';e.fightOptions={preset:'quick',seed:5};e.arena.setTarget('fight');const v=e.arena.fightView,m=v.match;m.phase='round';m.decide=()=>{};for(const f of Object.values(m.fighters)){f.action=null;f.next=Infinity;}for(let i=0;i<30;i++)v.step();return stance(v.coaches[species==='rabbit'?'rabbit':'lion']);}
 if(name==='pads'){e.targetMode='pads';e.player.setEnabled(true);e.arena.setTarget('pads');let t=0;for(;t<1.2;t+=1/120){e.animTime=t;e.arena.update(t);}return {...stance(e.coach),coach:stance(e.arena.careerDrill.trainer)};}
 e.targetMode=name;e.player.setEnabled(true);e.arena.setTarget(name);let t=0;for(;t<1.2;t+=1/120){e.animTime=t;e.arena.update(t,'combo','one_two');}return stance(e.coach);
}
if(require.main===module){const report={};for(const s of ['lion','rabbit'])for(const m of ['shadow','heavy','pads','rabbit','fight']){const k=m+'-'+s;report[k]=mode(m,s);console.log(k.padEnd(14),JSON.stringify(report[k]));}if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(report,null,1));}
module.exports={stance,mode};
