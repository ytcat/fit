// Probe: fight clock rate and Burst state in the real app (diagnostic only).
const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader']});const p=await b.newPage({viewport:{width:1366,height:768}});p.on('pageerror',e=>console.log('ERR',e.message));
 await p.goto('http://127.0.0.1:'+(process.argv[2]||8152));await p.waitForFunction(()=>window.ringfighterGame&&app.engine.coach?.anatomy,null,{timeout:180000});
 await p.evaluate(()=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());ringfighterGame.startFight({watch:true,seed:20261111});});
 for(let i=0;i<12;i++){await p.waitForTimeout(5000);console.log(JSON.stringify(await p.evaluate(()=>{const e=app.engine,m=e.arena.fightView.match,a=e.player.actor(),b=document.getElementById('burstControl');return {wall:performance.now()/1000|0,phase:m.phase,t:+m.time.toFixed(2),rt:+m.roundTime.toFixed(2),anim:+e.animTime.toFixed(2),playing:e.isPlaying,dir:e.cameraDirector?.mode,s:m.burstState(a),ui:b.dataset.state,hidden:b.hidden,landed:m.totals[a].landed,blocked:m.totals[a].blocked,evaded:m.totals[a].evaded};})));}
 await b.close();})();
