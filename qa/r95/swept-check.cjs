// Independent exact segment/ellipsoid minimum, using a tighter diagnostic shell.
const path=require('path'),fileSystem=require('fs'),vm2=require('vm');process.chdir(process.env.APP_ROOT||path.resolve(__dirname,'../..'));global.require=require('module').createRequire(process.cwd()+'/tests/training-motion.test.cjs');const prefix=fileSystem.readFileSync('tests/training-motion.test.cjs','utf8').split("for(const species of ['lion','rabbit']){\n")[0];
vm2.runInThisContext(prefix+`
const rows=[];
for(const species of ['lion','rabbit']){
 e.targetMode='none';e.roster.select(species);
 for(const exercise of Object.keys(CareerDrill.ropeDrills)){
  e.animTime=0;e.ropeDrill=exercise;e.arena.setTarget('rope');const d=e.arena.careerDrill,cadence=CareerDrill.ropeDrills[exercise].cadence;let worst=Infinity,part='';
  for(let tick=0;tick<=120;tick++){
   e.arena.update(tick/60/cadence);
   for(let k=0;k<96;k++)for(const volume of d.ropeClearance.volumes){
    const a=d.ropePoints[k],b=d.ropePoints[k+1],m=volume.inverse.elements,rx=volume.r.x/(volume.base.x+.012),ry=volume.r.y/(volume.base.y+.012),rz=volume.r.z/(volume.base.z+.012);
    const ax=(m[0]*a.x+m[4]*a.y+m[8]*a.z+m[12])*rx,ay=(m[1]*a.x+m[5]*a.y+m[9]*a.z+m[13])*ry,az=(m[2]*a.x+m[6]*a.y+m[10]*a.z+m[14])*rz;
    const dx=(m[0]*(b.x-a.x)+m[4]*(b.y-a.y)+m[8]*(b.z-a.z))*rx,dy=(m[1]*(b.x-a.x)+m[5]*(b.y-a.y)+m[9]*(b.z-a.z))*ry,dz=(m[2]*(b.x-a.x)+m[6]*(b.y-a.y)+m[10]*(b.z-a.z))*rz;
    const t=Math.max(0,Math.min(1,-(ax*dx+ay*dy+az*dz)/(dx*dx+dy*dy+dz*dz))),value=Math.hypot(ax+t*dx,ay+t*dy,az+t*dz)-1;
    if(value<worst){worst=value;part=volume.name;}assert.ok(value>=-1e-5,JSON.stringify({species,exercise,tick,k,part:volume.name,value}));
   }
  }
  rows.push({species,exercise,minimumNormalizedClearance:worst,part});console.log(rows.at(-1));
 }
}
fs.writeFileSync(process.env.QA_OUT||'/tmp/r95-swept.json',JSON.stringify({method:'Exact minimum over each continuous cable segment against posed diagnostic ellipsoids expanded 12 mm; 121 time samples over two revolutions, both species and four drills. Not a physical rope simulation.',pass:true,rows},null,2));console.log('PASS exact swept rope segments clear the complete posed exclusion union');
`);
