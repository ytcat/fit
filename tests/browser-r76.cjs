// Run with the same Playwright/Chromium setup as browser.cjs.
const {chromium}=require('playwright'),http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..');
const server=http.createServer((req,res)=>{let f=path.join(root,decodeURIComponent(req.url.split('?')[0]));if(f.endsWith('/'))f+='index.html';try{res.end(fs.readFileSync(f));}catch{res.statusCode=404;res.end();}}).listen(0,'127.0.0.1');
(async()=>{const b=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE,args:['--no-sandbox','--enable-unsafe-swiftshader']});try{
for(const [width,height] of [[1100,950],[393,852]]){
 const p=await b.newPage({viewport:{width,height},hasTouch:true,bypassCSP:true}),errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await p.goto(`http://127.0.0.1:${server.address().port}`);await p.waitForFunction(()=>window.app?.engine?.coach);await p.evaluate(()=>{app.engine.isPlaying=false;});
 assert.equal(await p.evaluate(()=>app.audio.ctx===null),true);
 await p.locator('#stageSound').tap();await p.waitForFunction(()=>app.audio.ctx?.state==='running'&&app.audio.samples.size===10);
 assert.equal(await p.evaluate(()=>app.audio.muted),false,'first sound tap must enable, not immediately mute');
 assert.equal(await p.locator('#stageSound').getAttribute('aria-pressed'),'true');
 await p.evaluate(()=>app.audio.ctx.suspend());await p.locator('#stageSound').tap();await p.waitForFunction(()=>app.audio.ctx.state==='running');assert.equal(await p.evaluate(()=>app.audio.muted),false,'a suspended context must recover on a tap');
 await p.locator('#stageSound').tap();assert.equal(await p.evaluate(()=>app.audio.muted),true);await p.locator('#stageSound').tap();assert.equal(await p.evaluate(()=>app.audio.muted),false);
 await p.locator('#equipmentBtn').click();await p.locator('[data-target="speed"]').click();
 const ids=await p.evaluate(()=>BOXING_ROUTINES.speedDrills.map(d=>d.id));
 for(const id of ids){
  await p.locator('#combinationBtn').click();await p.locator(`[data-speed-drill="${id}"]`).click();
  assert.equal(await p.evaluate(()=>app.engine.speedDrill),id);
  const result=await p.evaluate(()=>{const e=app.engine;e.isPlaying=false;let contacts=0;for(let i=0;i<=90;i++){e.animTime=i/60;const m=e.arena.update(e.animTime,'speedbag','one_two');if(!m.hero.handErrors.every(n=>n<.002))throw Error('unreachable speed wrist');contacts+=m.contacts.length;}return contacts;});assert.ok(result>0,id+' rendered drill must contact the bag');
 }
 await p.evaluate(()=>{trainingControls.chooseTarget('heavy');app.engine.isPlaying=false;});
 await p.locator('#combinationBtn').click();await p.locator('[data-routine="fast_jabs_upper"]').click();
 assert.equal(await p.evaluate(()=>app.engine.currentAnim),'fast_jabs_upper');
 await p.evaluate(()=>{app.engine.isPlaying=false;});
 for(const lang of ['HE','RU','EN'])await p.evaluate(l=>document.getElementById('lang'+l).click(),lang);
 const bounds=await p.locator('#stageSound').boundingBox();assert.ok(bounds.x>=0&&bounds.x+bounds.width<=width,'sound control must fit mobile');
 const fight=await p.evaluate(()=>{
  const e=app.engine;e.fightOptions={seed:11,rounds:1,roundSeconds:30,restSeconds:1};trainingControls.chooseTarget('fight');e.isPlaying=false;
  const v=e.arena.fightView;let head=null;
  for(let i=0;i<2000;i++){v.step();const hit=v.contacts.find(c=>c.part==='head'&&c.legal);if(hit){head={receiver:hit.receiver,move:hit.move,speed:hit.speed};for(let n=0;n<3;n++)v.step();break;}}
  if(!head)throw Error('no geometric head contact in seeded bout');
  const c=v.coaches[head.receiver];c.metrics.gloves.forEach(g=>{const h=v.collision(c.root.localToWorld(new THREE.Vector3(...g.knuckles)),head.receiver==='lion'?'rabbit':'lion');if(h.penetration>.025)throw Error('rendered glove inside opponent');});
  e.animTime=0;v.tick=1; // Freeze the inspected pose without re-simulating it.
  return {...head,hairs:c.bodyFur.geometry.attributes.position.count/3};
 });
 await p.screenshot({path:`/tmp/r76-fight-${width}.png`,timeout:120000});
 await p.evaluate(()=>{const e=app.engine;trainingControls.chooseTarget('none');e.isPlaying=false;e.animTime=.55;e.technique='jab';e.coach.root.rotation.y=.0;e.camera.position.set(-1.35,1.65,2.65);e.camera.lookAt(0,1.4,0);});
 await p.screenshot({path:`/tmp/r76-avatar-${width}.png`,timeout:120000});assert.deepEqual(errors,[]);console.log('PASS R76 browser',width,{drills:ids.length,fight});await p.close();
}
}finally{await b.close();server.close();}})().catch(e=>{console.error(e);server.close();process.exit(1)});
