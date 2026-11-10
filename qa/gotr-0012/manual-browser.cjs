// GOTR-0012 real-app check of manual Play on the mitts: press the on-screen move buttons and
// read the striking arm at the pad-contact event. Usage: APP_URL=http://127.0.0.1:8141 node qa/gotr-0012/manual-browser.cjs
const {chromium}=require('playwright'),assert=require('node:assert/strict');const URL=process.env.APP_URL||'http://127.0.0.1:8141';
(async()=>{const b=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader']}),errors=[],out={};
 for(const [name,viewport] of Object.entries({phone:{width:393,height:852},desk:{width:1366,height:768}})){
  const p=await b.newPage({viewport});p.on('pageerror',e=>errors.push(e.message));
  await p.goto(URL);await p.waitForFunction(()=>window.ringfighterGame&&app.engine.coach?.anatomy,null,{timeout:180000});
  await p.evaluate(()=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());ringfighterGame.startTraining({mode:'pads',play:true});document.querySelectorAll('dialog[open]').forEach(d=>d.close());
   const e=app.engine;window.__hits=[];const old=e.onImpact;e.onImpact=hit=>{old?.(hit);if(hit.kind!=='pad')return;const V=()=>new THREE.Vector3(),j=e.coach.joints,s=j['arm'+hit.hand].getWorldPosition(V()),el=j['elbow'+hit.hand].getWorldPosition(V()),h=j['hand'+hit.hand].getWorldPosition(V());window.__hits.push({move:hit.move,elbow:+(s.clone().sub(el).angleTo(h.clone().sub(el))*180/Math.PI).toFixed(1),ext:+(100*s.distanceTo(h)/(s.distanceTo(el)+el.distanceTo(h))).toFixed(1)});};});
  await p.waitForTimeout(1500);
  const state=await p.evaluate(()=>({playerEnabled:app.engine.player.enabled,timing:app.engine.practiceTiming,mode:app.engine.targetMode,separation:+app.engine.coach.root.position.distanceTo(app.engine.arena.careerDrill.trainer.root.position).toFixed(3)}));
  if(!state.playerEnabled){await p.evaluate(()=>document.getElementById('playMode').click());await p.waitForTimeout(800);}
  const page=await p.$('[data-input-page="moves"]');if(page&&await page.isVisible()){await page.evaluate(n=>n.click());await p.waitForTimeout(600);}
  for(const move of ['jab','cross','hook','rear_uppercut','jab']){
   const button=await p.$(`[data-input-move="${move}"]`);
   if(button&&await button.isVisible())await button.evaluate(n=>n.click());else await p.evaluate(m=>app.engine.player.press(m),move);
   await p.waitForFunction(()=>!app.engine.player.current&&!app.engine.player.queue.length,null,{timeout:120000,polling:200});
  }
  out[name]={state,hits:await p.evaluate(()=>window.__hits)};
  if(name==='phone')await p.screenshot({path:require('path').join(__dirname,'manual-phone.png')});
  await p.close();
 }
 console.log(JSON.stringify(out,null,1));
 for(const [name,r] of Object.entries(out)){assert.equal(r.state.separation,1.74);const straight=r.hits.filter(h=>h.move==='jab'||h.move==='cross');assert.ok(straight.length>=3,name+': manual straights land');for(const h of straight)assert.ok(h.elbow>=150&&h.elbow<=175&&h.ext>=85,name+' '+JSON.stringify(h));assert.ok(r.hits.some(h=>h.move==='hook')&&r.hits.some(h=>h.move==='rear_uppercut'),name+': bent-arm punches land');}
 assert.deepEqual(errors,[]);console.log('GOTR-0012 MANUAL PLAY BROWSER ASSERTIONS PASSED');await b.close();})().catch(e=>{console.error('FAIL',e.message);process.exit(1);});
