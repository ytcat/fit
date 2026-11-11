/* GOTR-0037 labelled sheet: every muscle group of the definition atlas painted in its own colour on the
   fighter (rest pose, front and back), plus the projected screen position of each group for labels.
   Usage: OUT=<dir> node qa/gotr-0037/labels.cjs [url] [species]  ->  <OUT>/labels-<species>-<view>.png/.json */
const fs=require('fs'),path=require('path'),{open,shoot}=require('./rig.cjs');
const [,,url='http://127.0.0.1:8437/',species='rabbit']=process.argv,OUT=process.env.OUT||path.join(__dirname,'out');fs.mkdirSync(OUT,{recursive:true});
(async()=>{
 const app=await open(url),p=app.page;
 await p.evaluate(s=>{const e=app.engine;if(e.coach.species!==s)e.roster.select(s);e.arena.setTarget('none');e.coach.bodyFur.visible=false;},species);
 const names=await p.evaluate(()=>{
  const c=app.engine.coach,g=c.skin.geometry,col=g.attributes.color,d=c.definitionData;g.userData.restColor=Float32Array.from(col.array);
  const names=[...new Set(d.groups.map(n=>n.replace(/ [LR]$/,'')))];
  for(let i=0;i<d.count;i++){const k=d.group[i];let r=.30,gg=.30,b=.32;if(k>=0){const h=(names.indexOf(d.groups[k].replace(/ [LR]$/,''))*0.381966)%1,color=new THREE.Color().setHSL(h,.68,.56);r=color.r;gg=color.g;b=color.b;}col.setXYZ(i,r,gg,b);}
  col.needsUpdate=true;return names;
 });
 for(const view of ['atlasfront','atlasback','atlas34']){
  const png=await shoot(p,{pose:'tpose',view,size:900});fs.writeFileSync(path.join(OUT,`labels-${species}-${view}.png`),png);
  const anchors=await p.evaluate(({view,names})=>{
   const c=app.engine.coach,d=c.definitionData,cam=window.__qaCamera,camDir=cam.getWorldDirection(new THREE.Vector3()),out={};
   for(const [k,group] of d.groups.entries()){
    // Label the group on the side that faces the camera: average its visible vertices' skinned positions.
    let sum=new THREE.Vector3(),n=0;const v=new THREE.Vector3(),nrm=new THREE.Vector3();
    for(let i=0;i<d.count;i+=3){if(d.group[i]!==k)continue;c.skinPoint(c.skin,i,v);v.applyMatrix4(c.skin.matrixWorld);nrm.fromBufferAttribute(c.skin.geometry.attributes.normal,i).transformDirection(c.skin.matrixWorld);if(nrm.dot(camDir)>-.35)continue;sum.add(v);n++;}
    if(n<12)continue;sum.divideScalar(n).project(cam);const name=group.replace(/ [LR]$/,'');
    const prev=out[name];const pt={x:(sum.x*.5+.5)*900,y:(-sum.y*.5+.5)*900,n};if(!prev||pt.n>prev.n)out[name]=pt;
   }
   return out;
  },{view,names});
  fs.writeFileSync(path.join(OUT,`labels-${species}-${view}.json`),JSON.stringify({names,anchors},null,1));
 }
 await p.evaluate(()=>{const c=app.engine.coach,col=c.skin.geometry.attributes.color;col.array.set(c.skin.geometry.userData.restColor);col.needsUpdate=true;c.bodyFur.visible=true;});
 await app.close();console.log('labels done');process.exit(0);
})().catch(e=>{console.error('FAIL',e);process.exit(1);});
