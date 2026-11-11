/* GOTR-0050 tape-measure girths of the rendered body (rest pose, muscle relief applied, scale 1).
   A plane cuts the skin; the girth is the perimeter of the convex hull of the cut (like a tape).
   Usage: node qa/gotr-0050/girths.cjs [repo root]   -> JSON (centimetres, rig units x100) */
const fs=require('fs'),vm=require('vm'),path=require('path');
const ROOT=path.resolve(process.argv[2]||path.join(__dirname,'../..'));
global.THREE=require(path.join(ROOT,'assets/vendor/three.min.js'));global.window=global;
global.document={createElement:()=>({getContext:()=>new Proxy({},{get:(_,k)=>k==='createImageData'?((w,h)=>({data:new Uint8ClampedArray(w*h*4)})):()=>{}})})};
for(const f of ['boxing-routines.js','avatar-anatomy.js','avatar-detail.js','avatar-shoulder.js','boxing-coach-v2.js'])vm.runInThisContext(fs.readFileSync(path.join(ROOT,f),'utf8'));
const data=JSON.parse(fs.readFileSync(path.join(ROOT,'assets/models/coach-surface-v2.json')));data.rabbitBody=JSON.parse(fs.readFileSync(path.join(ROOT,'assets/models/rabbit-surface-r78.json'))).body;
data.shoulderCorrectives=JSON.parse(fs.readFileSync(path.join(ROOT,'assets/models/shoulder-correctives-v2.json')));
const hull=pts=>{pts=pts.slice().sort((a,b)=>a[0]-b[0]||a[1]-b[1]);const cross=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]);const lo=[],hi=[];
 for(const p of pts){while(lo.length>1&&cross(lo[lo.length-2],lo[lo.length-1],p)<=0)lo.pop();lo.push(p);}
 for(const p of pts.slice().reverse()){while(hi.length>1&&cross(hi[hi.length-2],hi[hi.length-1],p)<=0)hi.pop();hi.push(p);}
 const h=lo.slice(0,-1).concat(hi.slice(0,-1));let L=0;for(let i=0;i<h.length;i++){const a=h[i],b=h[(i+1)%h.length];L+=Math.hypot(a[0]-b[0],a[1]-b[1]);}return {L,h};};
const out={};
for(const species of ['lion','rabbit']){
 const c=new LionCoach(data,{species}),g=c.skin.geometry,P=g.attributes.position,idx=g.index.array,d=g.attributes.avatarDefinition,R=(window.AvatarAnatomy.definition?.range||.03)/32767;
 const pos=new Float32Array(P.count*3);for(let i=0;i<P.count;i++){pos[i*3]=P.getX(i);pos[i*3+1]=P.getY(i);pos[i*3+2]=P.getZ(i);if(d)for(let k=0;k<3;k++)pos[i*3+k]+=d.array[i*4+k]*R;const m=g.attributes.avatarMass;if(m){const n=g.attributes.normal,s=m.array[i]/32767*AvatarAnatomy.definition.massRange;pos[i*3]+=n.getX(i)*s;pos[i*3+1]+=n.getY(i)*s;pos[i*3+2]+=n.getZ(i)*s;}}
 const cut=(axis,value,keep)=>{const pts=[];for(let k=0;k<idx.length;k+=3)for(let e=0;e<3;e++){const a=idx[k+e]*3,b=idx[k+(e+1)%3]*3,da=pos[a+axis]-value,db=pos[b+axis]-value;if(da*db>=0)continue;const t=da/(da-db),p=[0,1,2].map(j=>pos[a+j]+(pos[b+j]-pos[a+j])*t);if(keep(p))pts.push(axis===1?[p[0],p[2]]:axis===0?[p[1],p[2]]:[p[0],p[1]]);}return pts;};
 const girth=(axis,value,keep)=>+(hull(cut(axis,value,keep)).L*100).toFixed(1);
 const extent=(axis,value,keep,j)=>{const p=cut(axis,value,keep).map(q=>q[j]);return +((Math.max(...p)-Math.min(...p))*100).toFixed(1);};
 out[species]={
  chest_y1_50:girth(1,1.50,p=>Math.abs(p[0])<.36),chestDepth_y1_50:extent(1,1.50,p=>Math.abs(p[0])<.2,1),
  ribcage_y1_40:girth(1,1.40,p=>Math.abs(p[0])<.36),waist_y1_22:girth(1,1.22,()=>true),
  upperArm_x0_50:girth(0,.50,p=>p[1]>1.4),upperArm_x0_56:girth(0,.56,p=>p[1]>1.4),forearm_x0_74:girth(0,.74,p=>p[1]>1.4),
  deltoid_x0_38:girth(0,.38,p=>p[1]>1.45),
  calf_y0_42:girth(1,.42,p=>p[0]>0)
 };
}
console.log(JSON.stringify(out,null,1));
