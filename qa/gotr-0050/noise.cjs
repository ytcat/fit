/* GOTR-0050 surface-noise metric: RMS angle (degrees) between the normals of neighbouring vertices
   (mesh edges ~6.5 mm), on the actually rendered skin surface, per body region.
   rest  = rest pose with the muscle relief/mass at scale 1;
   guard = the full CPU skin (skinning, correctives, axilla field, shoulder bake, relief) in guard.
   Lower = smoother. A flat or uniformly curved surface gives a small, constant value.
   Usage: node qa/gotr-0050/noise.cjs <repo root> [label]  -> JSON line */
const fs=require('fs'),vm=require('vm'),path=require('path');
const ROOT=path.resolve(process.argv[2]||path.join(__dirname,'../..')),label=process.argv[3]||path.basename(ROOT);
global.THREE=require(path.join(ROOT,'assets/vendor/three.min.js'));global.window=global;
global.document={createElement:()=>({getContext:()=>new Proxy({},{get:(_,k)=>k==='createImageData'?((w,h)=>({data:new Uint8ClampedArray(w*h*4)})):()=>{}})})};
for(const f of ['boxing-routines.js','avatar-anatomy.js','avatar-detail.js','avatar-shoulder.js','boxing-coach-v2.js'])vm.runInThisContext(fs.readFileSync(path.join(ROOT,f),'utf8'));
const data=JSON.parse(fs.readFileSync(path.join(ROOT,'assets/models/coach-surface-v2.json')));data.rabbitBody=JSON.parse(fs.readFileSync(path.join(ROOT,'assets/models/rabbit-surface-r78.json'))).body;
data.shoulderCorrectives=JSON.parse(fs.readFileSync(path.join(ROOT,'assets/models/shoulder-correctives-v2.json')));
const regions={torso:(x,y,z)=>Math.abs(x)<.30&&y>1.15&&y<1.72&&z>0,back:(x,y,z)=>Math.abs(x)<.30&&y>1.15&&y<1.72&&z<=0,sides:(x,y)=>Math.abs(x)>.18&&Math.abs(x)<.36&&y>1.25&&y<1.6,arms:(x,y)=>Math.abs(x)>.38&&Math.abs(x)<.85&&y>1.45};
function metric(pos,idx,P){
 const n=new Float32Array(pos.length);
 for(let k=0;k<idx.length;k+=3){const a=idx[k]*3,b=idx[k+1]*3,c=idx[k+2]*3,ux=pos[b]-pos[a],uy=pos[b+1]-pos[a+1],uz=pos[b+2]-pos[a+2],vx=pos[c]-pos[a],vy=pos[c+1]-pos[a+1],vz=pos[c+2]-pos[a+2],nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;for(const o of [a,b,c]){n[o]+=nx;n[o+1]+=ny;n[o+2]+=nz;}}
 for(let i=0;i<n.length;i+=3){const l=Math.hypot(n[i],n[i+1],n[i+2])||1;n[i]/=l;n[i+1]/=l;n[i+2]/=l;}
 const out={};
 for(const [name,test] of Object.entries(regions)){let s=0,c=0,p95=[];
  for(let k=0;k<idx.length;k+=3)for(let e=0;e<3;e++){const a=idx[k+e],b=idx[k+(e+1)%3];if(a>b)continue;if(!test(P.getX(a),P.getY(a),P.getZ(a)))continue;const d=Math.max(-1,Math.min(1,n[a*3]*n[b*3]+n[a*3+1]*n[b*3+1]+n[a*3+2]*n[b*3+2])),ang=Math.acos(d)*180/Math.PI;s+=ang*ang;c++;p95.push(ang);}
  p95.sort((x,y)=>x-y);out[name]={rms:+Math.sqrt(s/c).toFixed(3),p99:+p95[Math.floor(p95.length*.99)].toFixed(2)};}
 return out;
}
const result={label};
for(const species of ['lion','rabbit']){
 const c=new LionCoach(data,{species}),g=c.skin.geometry,P=g.attributes.position,N=g.attributes.normal,idx=g.index.array,d=g.attributes.avatarDefinition,m=g.attributes.avatarMass,D=window.AvatarAnatomy.definition;
 const rest=new Float32Array(P.count*3);
 for(let i=0;i<P.count;i++){rest[i*3]=P.getX(i);rest[i*3+1]=P.getY(i);rest[i*3+2]=P.getZ(i);
  if(d&&!process.env.NOREL){const R=(D.range||.03)/32767;for(let k=0;k<3;k++)rest[i*3+k]+=d.array[i*4+k]*R;}
  if(m&&!process.env.NOMASS){const s=D.massRange/32767;if(process.env.MASSN){const l=Math.hypot(m.array[i*3],m.array[i*3+1],m.array[i*3+2])*s;rest[i*3]+=N.getX(i)*l;rest[i*3+1]+=N.getY(i)*l;rest[i*3+2]+=N.getZ(i)*l;}else for(let k=0;k<3;k++)rest[i*3+k]+=m.array[i*3+k]*s;}}
 if(process.env.RESTONLY){result[species]={rest:metric(rest,idx,P)};continue;}
 c.update(0,"guard","one_two",{simulationTime:0});const posed=new Float32Array(P.count*3),v=new THREE.Vector3();
 for(let i=0;i<P.count;i++){c.skinPoint(c.skin,i,v);posed[i*3]=v.x;posed[i*3+1]=v.y;posed[i*3+2]=v.z;}
 result[species]={rest:metric(rest,idx,P),guard:metric(posed,idx,P)};
}
console.log(JSON.stringify(result));
