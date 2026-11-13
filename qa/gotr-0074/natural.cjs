/* GOTR-0074: what the app itself draws at phone size (no staging): shadow training (default camera, then side
   lock), a quick fight intro, the fight itself and a held Guard. Usage (preview on 127.0.0.1:8161): node qa/gotr-0074/natural.cjs */
const path=require('path'),{chromium}=require('playwright');const out=path.join(__dirname,'frames');require('fs').mkdirSync(out,{recursive:true});
(async()=>{const b=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader']});try{const p=await b.newPage({viewport:{width:402,height:690}});p.setDefaultTimeout(300000);const errors=[];p.on('pageerror',e=>errors.push(e.message));
const skip=async()=>{for(let i=0;i<12&&await p.evaluate(()=>!!document.querySelector('.story-host'));i++){await p.keyboard.press('Escape');await p.waitForTimeout(700);}await p.evaluate(()=>document.querySelectorAll('dialog[open]').forEach(d=>d.close()));};
await p.goto(process.env.QA_URL||'http://127.0.0.1:8161/');await p.waitForFunction(()=>window.ringfighterGame&&app.engine.coach?.anatomy,null,{timeout:300000});
await p.evaluate(()=>{try{if(!app.engine.career?.store?.current?.())app.engine.career.store.guest();}catch{}});await skip();
await p.evaluate(()=>ringfighterGame.startTraining({mode:'none',play:true}));await skip();await p.waitForTimeout(7000);await p.screenshot({path:path.join(out,'natural-shadow.png')});
await p.evaluate(()=>app.engine.cameraDirector?.setLock(true));await p.waitForTimeout(6000);await p.screenshot({path:path.join(out,'natural-shadow-sidelock.png')});
await p.evaluate(()=>ringfighterGame.startTraining({mode:'heavy',play:true}));await skip();await p.waitForTimeout(7000);await p.screenshot({path:path.join(out,'natural-bag-sidelock.png')});
await p.evaluate(()=>{app.engine.cameraDirector?.setLock(false,true);ringfighterGame.quick();});await skip();await p.waitForTimeout(3500);await p.screenshot({path:path.join(out,'natural-fight-intro.png')});
await p.mouse.click(200,300);for(let i=0;i<40&&await p.evaluate(()=>app.engine.arena?.fightView?.match?.phase!=='round');i++)await p.waitForTimeout(1500);await p.waitForTimeout(1500);await p.screenshot({path:path.join(out,'natural-fight.png')});
const held=await p.evaluate(async()=>{const e=app.engine,v=e.arena.fightView,m=v.match;for(let i=0;i<40;i++){e.player.press('guard');await new Promise(r=>setTimeout(r,120));}const c=v.coaches[m.playerActor||'lion'];return {phase:m.phase,player:m.playerActor,cover:v.heldCover&&v.heldCover[m.playerActor]&&+v.heldCover[m.playerActor].v.toFixed(2),L:c.point(c.joints.handL).toArray().map(x=>+x.toFixed(2)),R:c.point(c.joints.handR).toArray().map(x=>+x.toFixed(2))};});
await p.screenshot({path:path.join(out,'natural-fight-guard.png')});
console.log('held guard',JSON.stringify(held),'errors',errors.length,errors.slice(0,3).join(' | '));}finally{await b.close();}})();
