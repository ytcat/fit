const {chromium}=require('playwright');const URL='http://127.0.0.1:8131';
(async()=>{const b=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader']});const p=await b.newPage({viewport:{width:900,height:506}});
await p.goto(URL);await p.waitForFunction(()=>window.ringfighterGame&&app.engine.coach?.anatomy,null,{timeout:120000});
for(const venue of (process.env.VENUES||'underground').split(',')){
const r=await p.evaluate(async v=>{window.__rads=[5.4,6.0];if(v==="boxing_club")window.__rads=[5.6,6.4];const e=app.engine,st=e.career.store;if(!st.current())st.guest();st.gameAction({type:'venue',venueId:v});ringfighterGame.quick();document.querySelectorAll('dialog[open]').forEach(d=>d.close());await new Promise(r=>setTimeout(r,5000));
 const c=e.camera,pose=e.cameraDirector?.pose,target=pose?new THREE.Vector3(pose.lx,pose.ly,pose.lz):new THREE.Vector3(0,1.2,0),top=e.cameraDirector?.ceiling?.()||0;
 const ray=new THREE.Raycaster(),out={top,cam:c.position.toArray().map(n=>+n.toFixed(2)),target:target.toArray().map(n=>+n.toFixed(2)),blocked:[]};
 // The set group hides near-side sectors per frame; emulate by testing only meshes currently visible up the chain for each pose is not possible, so report raw hits with their sector flag.
 const meshes=[];e.scene.traverse(n=>{if(n.isMesh&&n.userData.arenaSet!==undefined||n.isMesh&&n.parent?.userData?.arenaSet!==undefined)meshes.push(n);});
 const setMeshes=[];e.scene.traverse(n=>{let q=n,inSet=false;while(q){if(q.userData&&('cameraCeiling' in q.userData||q.userData.arenaSet)){inSet=true;break;}q=q.parent;}if(n.isMesh&&inSet)setMeshes.push(n);});
 out.setMeshes=setMeshes.length;const y=top||3.1;
 for(let a=0;a<360;a+=15)for(const rad of (window.__rads||[7.2,8.2])){const from=new THREE.Vector3(target.x+Math.sin(a*Math.PI/180)*rad,y,target.z+Math.cos(a*Math.PI/180)*rad),dir=target.clone().sub(from),len=dir.length();ray.set(from,dir.normalize());ray.far=len-1.5;const hits=ray.intersectObjects(setMeshes,false).filter(h=>{let q=h.object;while(q){if(q.visible===false)return false;q=q.parent;}return true;});if(hits.length)out.blocked.push([a,rad,+hits[0].distance.toFixed(2),hits[0].object.name||hits[0].object.parent?.name||'?',hits.length]);}
 return out;},venue);
console.log(venue,JSON.stringify(r).slice(0,1500));}
await b.close();})();
