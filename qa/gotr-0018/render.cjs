/* GOTR-0018 evidence: matched side-view renders of a landed jab and a landed
   cross from the real app, before (base fight-arena.js) and after.
   Usage: node qa/gotr-0018/render.cjs   (preview server on 127.0.0.1:8142)
   Software browser only; this is not a physical-phone check. */
const fs=require('fs'),path=require('path'),{execFileSync}=require('child_process'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../..'),out=__dirname,url=process.env.QA_URL||'http://127.0.0.1:8142/',base=process.env.QA_BASE||'3672c18';
const before=execFileSync('git',['show',base+':fight-arena.js'],{cwd:root,encoding:'utf8',maxBuffer:1<<26});
(async()=>{const browser=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader']}),results=[];try{
 for(const version of ['before','after']){
  const page=await browser.newPage({viewport:{width:900,height:700}});page.setDefaultTimeout(240000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  if(version==='before')await page.route('**/fight-arena.js*',r=>r.fulfill({contentType:'text/javascript',body:before}));
  await page.goto(url);await page.waitForFunction(()=>window.ringfighterGame&&app.engine.coach?.anatomy,null,{timeout:240000});
  await page.evaluate(()=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());});
  for(const [move,target,situation] of [['jab','head','guard up (typical Play press)'],['cross','body','clean body']]){
   const state=await page.evaluate(({move,target})=>{
    const e=app.engine,career=e.career;e.career=null;e.fightOptions={preset:'quick',seed:74};trainingControls.chooseTarget('fight');e.career=career;e.isPlaying=false;
    const v=e.arena.fightView,m=v.match;m.phase='round';m.roundTime=2;m.decide=()=>{};for(const f of Object.values(m.fighters)){f.action=null;f.next=Infinity;f.tempo=1;f.reaction=null;}
    const actor=v.match.playerActor||'lion';m.setPlayer(null);m.attack(actor,move,target);let contact=null,frames=0;
    while(!contact&&frames++<70){v.step();contact=v.contacts.find(c=>c.actor===actor)||null;}v.tick=1e9;
    const c=v.coaches[actor],side=move==='jab'?'L':'R',a=c.point(c.joints['arm'+side]),b=c.point(c.joints['elbow'+side]),d=c.point(c.joints['hand'+side]),roots=Object.values(v.coaches).map(k=>k.root.position);
    e.animTime=m.time;window.fightUI?.render(v);e.camera.zoom=1;
    const g=e.arena.group,mid=roots[0].clone().add(roots[1]).multiplyScalar(.5),axis=roots[1].clone().sub(roots[0]).normalize(),sideways=new THREE.Vector3(axis.z,0,-axis.x);
    e.camera.position.copy(g.localToWorld(mid.clone().addScaledVector(sideways,-3.3).setY(1.75)));e.camera.lookAt(g.localToWorld(mid.clone().setY(1.55)));e.camera.updateProjectionMatrix();e.world?.update(e.animTime,'fight');e.renderer.render(e.scene,e.camera);
    return {actor,move,target,part:contact?.part||null,blocked:contact?.blocked||false,elbow:+THREE.MathUtils.radToDeg(a.clone().sub(b).angleTo(d.clone().sub(b))).toFixed(1),extension:+(a.distanceTo(d)/(c.joints['elbow'+side].position.length()+c.joints['hand'+side].position.length())*100).toFixed(1),rootSeparation:+roots[0].distanceTo(roots[1]).toFixed(3)};
   },{move,target});
   const file=`${version}-${move}.png`;await page.locator('#boxerCanvas').screenshot({path:path.join(out,file)});results.push({version,situation,...state,file,errors:errors.slice()});console.log(JSON.stringify(results.at(-1)));
  }
  await page.close();
 }
 fs.writeFileSync(path.join(out,'render-results.json'),JSON.stringify({base,browser:browser.version(),physicalPhone:false,results},null,1));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
