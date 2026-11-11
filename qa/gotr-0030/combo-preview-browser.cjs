// GOTR-0039: the Shop combo preview must show the whole fighter while the combo plays, in the narrow phone
// preview and in Full view, in every arena/venue. For each venue: Shop -> Combos -> a combo -> Preview, sample
// several frames while it plays, project the fighter's head, hands and feet into the preview and ray-cast from
// the camera to each: all must be inside the frame and the first thing the ray hits must be the fighter.
// Usage: APP_URL=http://127.0.0.1:8171 OUT=qa/gotr-0030 node qa/gotr-0030/combo-preview-browser.cjs
const {chromium}=require('playwright'),path=require('path');
const URL=process.env.APP_URL||'http://127.0.0.1:8171',OUT=process.env.OUT||__dirname;
const sizes=process.env.SIZES?JSON.parse(process.env.SIZES):[['owner',402,690],['desk',1366,768]];
const combos=(process.env.COMBOS||'first_rhythm,school_signature').split(','),langs=(process.env.LANGS||'en,he,ru').split(',');
(async()=>{const b=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader']});let bad=0;const errors=[];
 for(const [name,width,height] of sizes){const p=await b.newPage({viewport:{width,height}});p.on('pageerror',x=>errors.push(x.message));await p.goto(URL+'/?v=cp'+Date.now());await p.waitForFunction(()=>window.ringfighterGame&&app.engine.coach?.anatomy,null,{timeout:180000});
  const venues=process.env.VENUES?process.env.VENUES.split(','):await p.evaluate(()=>GameDomain.venueIds);
  for(const lang of langs)for(const venue of (lang==='en'?venues:[venues[0]]))for(const combo of combos)for(const full of [false,true]){
   const r=await p.evaluate(async({lang,venue,combo,full})=>{const wait=ms=>new Promise(r=>setTimeout(r,ms)),e=app.engine,store=e.career.store;document.querySelectorAll('dialog[open]').forEach(d=>d.close());app.setLanguage(lang);
    if(!store.game?.()){ringfighterGame.quick();await wait(300);document.querySelectorAll('dialog[open]').forEach(d=>d.close());}
    store.gameAction({type:'venue',venueId:venue});ringfighterGame.open('club');await wait(900);const d=document.querySelector('dialog[open]');d.querySelector('.store-category[data-category=combo]').click();await wait(300);
    d.querySelector(`.store-product[data-item-id=${combo}]`).click();await wait(300);if(full){d.querySelector('.store-view-reset').click();await wait(200);}d.querySelector('.store-demo-play').click();
    const canvas=e.renderer.domElement,rc=new THREE.Raycaster(),c=e.coach,own=new Set();c.root.traverse(n=>own.add(n));const issues=[];let frames=0;
    for(const t of [250,700,1200,1700,2300]){await wait(t-(frames?[250,700,1200,1700,2300][frames-1]:0));frames++;if(!e.fightIQDemo)break;const cam=e.camera;cam.updateMatrixWorld(true);c.root.updateMatrixWorld(true);
     for(const [part,joint] of [['head','head'],['left hand','handL'],['right hand','handR'],['left foot','footL'],['right foot','footR']]){const w=c.joints[joint].getWorldPosition(new THREE.Vector3()),s=w.clone().project(cam);if(Math.abs(s.x)>1||Math.abs(s.y)>1||s.z>1)issues.push(part+' out of frame at '+t+'ms');
      rc.set(cam.position,w.clone().sub(cam.position).normalize());rc.far=cam.position.distanceTo(w)+.05;const shown=o=>{for(let q=o;q;q=q.parent)if(!q.visible)return false;return true;},hit=rc.intersectObjects(e.scene.children,true).find(h=>shown(h.object)&&h.object.material?.visible!==false&&!h.object.isSprite);if(hit&&!own.has(hit.object))issues.push(part+' hidden by '+(hit.object.name||hit.object.type)+' at '+t+'ms');}}
    const view=canvas.getBoundingClientRect(),dist=e.camera.position.distanceTo(c.joints.head.getWorldPosition(new THREE.Vector3()));
    return {issues:[...new Set(issues)],playing:!!e.fightIQDemo,frames,dist:+dist.toFixed(2),view:[Math.round(view.width),Math.round(view.height)],rect:[view.left,view.top,view.width,view.height]};},{lang,venue,combo,full});
   bad+=r.issues.length;console.log(name,lang,venue,combo,full?'full':'focus','camera',r.dist+'m','view',r.view.join('x'),r.issues.length?JSON.stringify(r.issues):'ok');
   if((lang==='en'&&venue===venues[0])||(name==='owner'&&lang!=='en')||process.env.SHOTS==='all')await p.screenshot({path:path.join(OUT,`combo-preview-${name}-${lang}-${venue}-${combo}-${full?'full':'focus'}.png`),timeout:180000});
   await p.evaluate(()=>document.querySelectorAll('dialog[open]').forEach(d=>d.close()));}
  await p.close();}
 console.log('TOTAL COMBO PREVIEW ISSUES',bad,'page errors',errors.length,errors.slice(0,3));await b.close();process.exitCode=bad||errors.length?1:0;})();
