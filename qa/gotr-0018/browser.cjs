/* GOTR-0018 real-app check: one Quick Fight in Play mode (jab/cross presses
   through app.engine.player.press) and one in Watch mode, started with
   ringfighterGame.quick() and stepped to the result inside the page; records
   the striking arm on the frame each straight registers contact, plus page errors.
   Usage: node qa/gotr-0018/browser.cjs   (preview server on 127.0.0.1:8142)
   Headless software rendering; not a physical-phone check. */
const fs=require('fs'),path=require('path'),{chromium}=require('playwright');
const url=process.env.QA_URL||'http://127.0.0.1:8142/';
(async()=>{const browser=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader']}),report={url,browser:browser.version(),physicalPhone:false,runs:[]};try{
 for(const mode of ['play','watch']){
  const page=await browser.newPage({viewport:{width:393,height:852}});page.setDefaultTimeout(300000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url);await page.waitForFunction(()=>window.ringfighterGame&&app.engine.coach?.anatomy,null,{timeout:300000});
  await page.evaluate(()=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());ringfighterGame.quick();});
  await page.waitForFunction(()=>app.engine.arena?.fightView?.match,null,{timeout:300000});
  await page.evaluate(mode=>{
   document.querySelectorAll('dialog[open]').forEach(d=>d.close());document.getElementById(mode==='play'?'playMode':'watchMode')?.click();
   const e=app.engine,v=e.arena.fightView,m=v.match,step=v.step.bind(v),script=['jab','cross','jab','jab','cross'];let presses=0;window.__gotr18={rows:[],presses:0};
   v.step=()=>{
    if(mode==='play'&&m.phase==='round'&&m.playerActor&&!m.fighters[m.playerActor].action&&!m.playerQueue.length&&e.player.press(script[presses%script.length])){presses++;window.__gotr18.presses=presses;}
    const contacts=step();
    for(const c of v.contacts){if(c.move!=='jab'&&c.move!=='cross')continue;const k=v.coaches[c.actor],side=c.move==='cross'?'R':'L',a=k.point(k.joints['arm'+side]),b=k.point(k.joints['elbow'+side]),d=k.point(k.joints['hand'+side]);
     window.__gotr18.rows.push({actor:c.actor,player:c.actor===m.playerActor,move:c.move,part:c.part,blocked:c.blocked,clean:c.legal&&!c.blocked,elbow:THREE.MathUtils.radToDeg(a.clone().sub(b).angleTo(d.clone().sub(b))),extension:a.distanceTo(d)/(k.joints['elbow'+side].position.length()+k.joints['hand'+side].position.length())});}
    return contacts;
   };
   // Fast-forward the same simulation the page animates: the software
   // renderer on a shared machine cannot play 23 s of fight in real time.
   v.tick=1e9;let frames=0;while(!m.result&&frames++<60*60)v.step();window.__gotr18.frames=frames;
  },mode);
  await page.waitForFunction(()=>app.engine.arena?.fightView?.match?.result,null,{timeout:300000,polling:1000});
  const data=await page.evaluate(()=>({rows:window.__gotr18.rows,presses:window.__gotr18.presses,result:app.engine.arena.fightView.match.result.method,winner:app.engine.arena.fightView.match.result.winner,player:app.engine.arena.fightView.match.playerActor}));
  const median=xs=>xs.length?[...xs].sort((a,b)=>a-b)[xs.length>>1]:null,group=rows=>({n:rows.length,elbowMedian:rows.length?+median(rows.map(r=>r.elbow)).toFixed(1):null,elbowAtLeast150:rows.filter(r=>r.elbow>=150).length,elbowUnder120:rows.filter(r=>r.elbow<120).length,extensionAtLeast85:rows.filter(r=>r.extension>=.85).length});
  const run={mode,viewport:'393x852',player:data.player,presses:data.presses,result:data.result,winner:data.winner,errors,all:group(data.rows),clean:group(data.rows.filter(r=>r.clean)),blocked:group(data.rows.filter(r=>r.blocked)),playerStraights:group(data.rows.filter(r=>r.player))};
  report.runs.push(run);console.log(JSON.stringify(run));await page.close();
 }
 fs.writeFileSync(path.join(__dirname,'browser-results.json'),JSON.stringify(report,null,1));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
