// Export actual CPU-deformed visible character meshes for an independent triangle check.
const path=require('path'),fileSystem=require('fs'),vm2=require('vm');const root=process.env.APP_ROOT||path.resolve(__dirname,'../..');process.chdir(root);global.require=require('module').createRequire(root+'/tests/training-motion.test.cjs');
const prefix=fileSystem.readFileSync('tests/training-motion.test.cjs','utf8').split("for(const species of ['lion','rabbit']){\n")[0];
const out=process.env.QA_OUT||'/tmp/r95-mesh';fileSystem.mkdirSync(out,{recursive:true});
vm2.runInThisContext(prefix+`
const exportOut=${JSON.stringify(out)},phases=${JSON.stringify(process.env.QA_PHASES?process.env.QA_PHASES.split(',').map(Number):[0,.125,.25,.375,.5,.625,.75,.875])};
e.targetMode='none';e.roster.select(${JSON.stringify(process.env.QA_SPECIES||'lion')});e.animTime=0;e.ropeDrill='two_feet';e.arena.setTarget('rope');const manifests=[];
for(const [frame,phase] of phases.entries()){
 e.arena.update(phase/1.72);const coach=e.coach,d=e.arena.careerDrill,meshes=[];coach.root.updateMatrixWorld(true);const inverse=d.root.matrixWorld.clone().invert();
 coach.root.traverse(n=>{if(!n.isMesh||!n.geometry?.attributes.position)return;for(let a=n;a;a=a.parent){if(!a.visible||a.name==='Knurled skipping handle')return;if(a===coach.root)break;}meshes.push(n);});
 const total=meshes.reduce((s,n)=>s+n.geometry.attributes.position.count,0),faceCount=meshes.reduce((s,n)=>s+(n.geometry.index?.count||n.geometry.attributes.position.count),0),positions=new Float32Array(total*3),indices=new Uint32Array(faceCount),regions=[];let vertex=0,index=0;const v=V();
 for(const mesh of meshes){const p=mesh.geometry.attributes.position,g=mesh.geometry,transform=new THREE.Matrix4().multiplyMatrices(inverse,mesh.matrixWorld),start=index;
  for(let i=0;i<p.count;i++){if(g.attributes.skinIndex)coach.skinPoint(mesh,i,v);else v.fromBufferAttribute(p,i);v.applyMatrix4(transform);positions[(vertex+i)*3]=v.x;positions[(vertex+i)*3+1]=v.y;positions[(vertex+i)*3+2]=v.z;}
  const count=g.index?.count||p.count;for(let i=0;i<count;i++)indices[index++]=vertex+(g.index?g.index.getX(i):i);regions.push({name:mesh.name||mesh.type,start:start/3,end:index/3});vertex+=p.count;
 }
 const rope=new Float32Array(d.ropePoints.flatMap(p=>p.toArray()));for(const [suffix,array] of [['vertices.f32',positions],['faces.u32',indices],['rope.f32',rope]])fs.writeFileSync(exportOut+'/phase-'+frame+'-'+suffix,Buffer.from(array.buffer));
 manifests.push({frame,phase,vertices:total,triangles:faceCount/3,regions});console.log('Exported actual mesh',phase,total,faceCount/3);
}
fs.writeFileSync(exportOut+'/manifest.json',JSON.stringify({root:${JSON.stringify(root)},species:e.coach.species,frames:manifests},null,2));
`);
