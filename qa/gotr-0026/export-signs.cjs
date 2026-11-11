// Render every club-world label texture to PNG, in the real browser, so overlap can be judged directly.
const {chromium}=require('playwright');const URL=process.env.APP_URL||'http://127.0.0.1:8131';
(async()=>{const b=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader']});const p=await b.newPage({viewport:{width:900,height:700}});
await p.goto(URL);await p.waitForFunction(()=>window.ringfighterGame&&app.engine.coach?.anatomy,null,{timeout:120000});
await p.evaluate(()=>{ringfighterGame.startTraining({mode:'none'});document.querySelectorAll('dialog[open]').forEach(d=>d.close());});await p.waitForTimeout(3000);
const shots=await p.evaluate(()=>{const out=[];app.engine.scene.traverse(n=>{const map=n.material?.map;if(n.isMesh&&map?.image instanceof HTMLCanvasElement&&/sign|label|poster|mark|scoreboard/i.test(n.name)){out.push({name:n.name,w:map.image.width,h:map.image.height,url:map.image.toDataURL('image/png')});}});return out;});
const fs=require('fs');shots.forEach((s,i)=>fs.writeFileSync(`${String(i).padStart(2,'0')}-${s.name.replace(/\W+/g,'_')}-${s.w}x${s.h}.png`,Buffer.from(s.url.split(',')[1],'base64')));
console.log(shots.length,'labels',shots.map(s=>s.name+' '+s.w+'x'+s.h).join(' | ').slice(0,600));await b.close();})();
