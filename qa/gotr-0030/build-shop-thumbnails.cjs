// GOTR-0030: Shop thumbnails rendered from the REAL 3D models (no hand-drawn icons).
// For every Shop item (gloves, shorts, boots, waistbands, accessories) the fighter is posed in guard,
// the item's own meshes are isolated, moved into a neutral studio (soft key, fill and rim light, no
// arena, transparent background), framed on their bounds and rendered at 3x, then downsampled to
// 160x160 WebP (2x the largest card image) in assets/shop/<id>.webp. Default gloves and shorts differ
// by species, so they also get <id>-rabbit.webp. Head ribbons are shot on the rabbit, whose knot rests on
// the band (on the lion it sits out on the mane).
// Usage: python3 -m http.server 8171 --bind 127.0.0.1 &  APP_URL=http://127.0.0.1:8171 node qa/gotr-0030/build-shop-thumbnails.cjs [ids,comma]
// Env: RAW=<folder> keeps the full-size PNGs; ONLY_SPECIES=lion|rabbit.
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),{execFileSync}=require('child_process');
const URL=process.env.APP_URL||'http://127.0.0.1:8171',ROOT=path.join(__dirname,'../..'),OUT=path.join(ROOT,'assets/shop'),RAW=process.env.RAW||fs.mkdtempSync('/tmp/shop-thumbs-');
const only=(process.argv[2]||'').split(',').filter(Boolean);
(async()=>{fs.mkdirSync(OUT,{recursive:true});const b=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader']});const p=await b.newPage({viewport:{width:600,height:600}});const errors=[];p.on('pageerror',x=>errors.push(x.message));
 await p.goto(URL+'/?v=thumbs'+Date.now());await p.waitForFunction(()=>window.ringfighterGame&&app.engine.coach?.anatomy,null,{timeout:180000});
 await p.evaluate(()=>document.querySelectorAll('dialog[open]').forEach(d=>d.close()));
 const jobs=await p.evaluate(()=>[...GameDomain.catalog.map(i=>({id:i.id,slot:i.slot,variant:i.variant})),...GameAccessories.catalog.map(i=>({id:i.id,kind:i.kind}))]);
 const list=[];for(const j of jobs){if(only.length&&!only.includes(j.id))continue;const head=j.kind==='headband';if(process.env.ONLY_SPECIES!=='rabbit'||head)list.push({...j,species:head?'rabbit':'lion'});if(process.env.ONLY_SPECIES!=='lion'&&j.variant==='default'&&['gloves','shorts'].includes(j.slot))list.push({...j,species:'rabbit',suffix:'-rabbit'});}
 for(const job of list){
  const png=await p.evaluate(async job=>{const e=app.engine;e.isPlaying=false;if(e.coach.species!==job.species)e.roster.select(job.species);await new Promise(r=>setTimeout(r,250));
   const c=e.coach,root=c.root,V=(x,y,z)=>new THREE.Vector3(x,y,z),base={gloves:'gloves_default',shorts:'shorts_default',boots:'boots_default',belt:'belt_default'};
   GamePresentation.apply(c,job.slot?{...base,[job.slot]:job.id}:base,GameDomain.catalog);GameAccessories.look(c,job.kind?[job.id]:[]);
   c.update(.3,'guard','one_two');root.updateMatrixWorld(true);
   // The item's meshes.
   const inside=(n,roots)=>{for(let q=n;q;q=q.parent)if(roots.includes(q))return true;return false;},J=c.joints,keep=new Set();
   const training=/^Wrapped rope grip|^Professional focus mitt/;
   root.traverse(n=>{if(!n.isMesh)return;let want=false;
    if(job.slot==='gloves')want=inside(n,[J.handL,J.handR])&&!training.test(n.name)||n===c.gloveMeshes?.L||n===c.gloveMeshes?.R;
    else if(job.slot==='boots')want=inside(n,[J.footL]);
    else if(job.slot==='shorts'||job.slot==='belt')want=n===c.shorts||n===c.waistband||n===c.trunkWaistband||(n.parent===J.hips&&n.geometry?.type==='PlaneGeometry')||(job.slot==='shorts'&&(n.parent===J.thighL||n.parent===J.thighR)&&n.geometry?.type==='TubeGeometry');
    else if(job.kind==='armbands')want=/^Arm ribbon/.test(n.name)||n.name==='Fitted arm ribbons'||!!n.userData?.knots;
    else want=inside(n,[root.getObjectByName('Cosmetic '+job.id)].filter(Boolean));
    if(want&&n.visible)keep.add(n);});
   if(job.kind==='armbands'){const g=root.getObjectByName('Cosmetic armbands');if(g)g.traverse(n=>{if(n.isMesh&&n.visible)keep.add(n);});root.traverse(n=>{if(n.isMesh&&n.visible&&/Arm ribbon/.test(n.name))keep.add(n);});}
   if(!keep.size)return {error:'no meshes for '+job.id};
   // Bounds of what is drawn (skinned vertices included).
   const wbBox=new THREE.Box3().setFromObject(c.trunkWaistband?.visible?c.trunkWaistband:c.waistband),wbLow=root.worldToLocal(wbBox.min.clone()).y-(wbBox.max.y-wbBox.min.y)*1.1;
   const box=new THREE.Box3(),v=new THREE.Vector3();for(const n of keep){const P=n.geometry.attributes.position,step=Math.max(1,Math.floor(P.count/4000));for(let i=0;i<P.count;i+=step){v.fromBufferAttribute(P,i);if(n.isSkinnedMesh){n.boneTransform(i,v);v.applyMatrix4(n.matrixWorld);}else v.applyMatrix4(n.matrixWorld);
     const lp=root.worldToLocal(v.clone());if(job.kind==='armbands'&&lp.x<0)continue;     // Waistbands: a close-up of the left hip, where the woven label sits, with the top of the trunks.
     if(job.slot==='belt'&&(lp.x<.13||lp.y<wbLow))continue;box.expandByPoint(v);}}
   // Studio: isolate, light, frame.
   // Arm ribbons are shown worn on the upper arm (the fitted band alone reads as a crumpled ring).
   const context=job.kind==='armbands'?new Set([c.skin,c.bodyFur].filter(Boolean)):new Set();
   const hidden=[];root.traverse(n=>{if(n.isMesh&&n.visible&&!keep.has(n)&&!context.has(n)){hidden.push(n);n.visible=false;}});
   const sides=[];for(const n of keep)for(const m of [].concat(n.material)){if(n===c.waistband||n===c.trunkWaistband)continue;if(m.side!==THREE.DoubleSide&&!m.transparent){sides.push([m,m.side]);m.side=THREE.DoubleSide;m.needsUpdate=true;}}
   const parent=root.parent,studio=new THREE.Scene();studio.add(root);
   const q=root.getWorldQuaternion(new THREE.Quaternion()),L=(type,color,i,pos)=>{const l=new type(color,i);if(pos){l.position.copy(pos);l.target=root;}studio.add(l);return l;};
   L(THREE.HemisphereLight,0xf4f6ff,1.15).groundColor=new THREE.Color(0x2a2f38);
   L(THREE.DirectionalLight,0xfff3e2,3.1,V(-1.6,2.6,2.4).applyQuaternion(q).add(root.position));
   L(THREE.DirectionalLight,0xdfe8ff,1.2,V(2.2,.8,1.4).applyQuaternion(q).add(root.position));
   L(THREE.DirectionalLight,0xffffff,2.2,V(.6,1.8,-2.6).applyQuaternion(q).add(root.position));
   const view={gloves:[1.35,.18],shorts:[.36,.1],boots:[1.3,.2],belt:[1.2,.16],headband:[2.45,.42],armbands:[1.3,.1]}[job.slot||(job.kind==='belt'?'belt':job.kind)]||[.35,.2];
   if(job.id==='bandana')view[0]=-2.2;if(job.kind==='belt')view[0]=.32,view[1]=.24;
   const S=360,r=window.__thumbRenderer||(window.__thumbRenderer=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true}));r.setSize(S,S,false);r.setPixelRatio(1);r.setClearColor(0x000000,0);
   r.physicallyCorrectLights=true;r.outputEncoding=THREE.sRGBEncoding;r.toneMapping=THREE.ACESFilmicToneMapping;r.toneMappingExposure=1.05;
   const cam=new THREE.PerspectiveCamera(26,1,.01,50),center=box.getCenter(new THREE.Vector3()),dir=V(Math.sin(view[0])*Math.cos(view[1]),Math.sin(view[1]),Math.cos(view[0])*Math.cos(view[1])).applyQuaternion(q);
   // Fit: project the box corners for a first distance, then tighten so the item fills ~84% of the frame.
   let dist=box.getSize(new THREE.Vector3()).length()/(2*Math.tan(THREE.MathUtils.degToRad(13)));for(let k=0;k<4;k++){cam.position.copy(center).addScaledVector(dir,dist);cam.lookAt(center);cam.updateMatrixWorld(true);let m=0;
    for(let i=0;i<8;i++){const pt=V(i&1?box.max.x:box.min.x,i&2?box.max.y:box.min.y,i&4?box.max.z:box.min.z).project(cam);m=Math.max(m,Math.abs(pt.x),Math.abs(pt.y));}dist*=m/.84;}
   cam.position.copy(center).addScaledVector(dir,dist);cam.lookAt(center);cam.updateMatrixWorld(true);r.render(studio,cam);const url=r.domElement.toDataURL('image/png');
   // Waistbands: crop to the framed band (the rest of the trunks is context, not the item).
   let rect=null;if(job.slot==='belt'||job.kind==='armbands'){const xs=[],ys=[];for(let i=0;i<8;i++){const pt=V(i&1?box.max.x:box.min.x,i&2?box.max.y:box.min.y,i&4?box.max.z:box.min.z).project(cam);xs.push((pt.x+1)/2*S);ys.push((1-pt.y)/2*S);}rect=[Math.max(0,Math.min(...xs)),Math.max(0,Math.min(...ys)),Math.min(S,Math.max(...xs)),Math.min(S,Math.max(...ys))].map(Math.round);}
   // Restore the game scene exactly.
   parent.add(root);for(const n of hidden)n.visible=true;for(const [m,s] of sides){m.side=s;m.needsUpdate=true;}
   const g=app.engine.career.store.game?.();GamePresentation.apply(c,g?.equipment||base,GameDomain.catalog);GameAccessories.look(c,g?.accessories?.equipped||[]);e.lastRenderStamp=null;
   return {url,rect,meshes:keep.size};},job);
  if(png.error){console.log('FAIL',png.error);process.exitCode=1;continue;}
  const name=job.id+(job.suffix||''),raw=path.join(RAW,name+'.png');fs.writeFileSync(raw,Buffer.from(png.url.split(',')[1],'base64'));
  // Trim to the item, pad to a square with an even margin, downsample to 160 px WebP with alpha.
  execFileSync('python3',['-I','-c',`import sys
from PIL import Image
im=Image.open(sys.argv[1]).convert('RGBA')
if sys.argv[3]!='-':im=im.crop(tuple(int(v) for v in sys.argv[3].split(',')))
bb=im.getchannel('A').point(lambda a:255 if a>8 else 0).getbbox();im=im.crop(bb);w,h=im.size;s=int(max(w,h)*1.1)
sq=Image.new('RGBA',(s,s),(0,0,0,0));sq.paste(im,((s-w)//2,(s-h)//2));sq.resize((160,160),Image.LANCZOS).save(sys.argv[2],'WEBP',quality=88,method=6)`,raw,path.join(OUT,name+'.webp'),png.rect?png.rect.join(','):'-']);
  console.log(name,'meshes',png.meshes,fs.statSync(path.join(OUT,name+'.webp')).size,'bytes');}
 console.log(JSON.stringify({thumbnails:list.length,raw:RAW,errors}));await b.close();})().catch(x=>{console.error('FAIL',x.message);process.exit(1);});
