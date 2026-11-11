const {chromium}=require('playwright');const URL=process.env.APP_URL||'http://127.0.0.1:8131';
(async()=>{const b=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader']});const errs=[];
for(const venue of (process.env.VENUES||'underground,boxing_club,street,docks,championship,regional').split(',')){const p=await b.newPage({viewport:{width:900,height:506}});p.on('pageerror',e=>errs.push(venue+': '+e.message));
 await p.goto(URL);await p.waitForFunction(()=>window.ringfighterGame&&app.engine.coach?.anatomy,null,{timeout:120000});
 const set=await p.evaluate(v=>{const st=app.engine.career.store;if(!st.current())st.guest();return st.gameAction({type:'venue',venueId:v});},venue);
 await p.evaluate(()=>{ringfighterGame.quick();document.querySelectorAll('dialog[open]').forEach(d=>d.close());});
 const frames=[];for(const [i,ms] of [[1,1800],[2,2600],[3,2600],[4,2600]]){await p.waitForTimeout(ms);const s=await p.evaluate(()=>{const e=app.engine,c=e.camera,d=e.cameraDirector;return {y:+c.position.y.toFixed(2),r:+Math.hypot(c.position.x,c.position.z).toFixed(2),intro:!!(d&&(d.intro||d.introActive||d.state==='intro'||d.holdsClock)),phase:e.arena?.fightView?.match?.phase};});frames.push(s);await p.screenshot({path:`intro-${venue}-${i}.png`});}
 console.log(venue,JSON.stringify({set:set.ok,frames}));await p.close();}
console.log('errors',JSON.stringify(errs.slice(0,4)));await b.close();})();
