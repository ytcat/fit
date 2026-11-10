// GOTR-0022 gallery check in the shipped UI: nine cards, EN/HE/RU, four viewports, nothing clipped, selection saved.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const URL=process.env.APP_URL||'http://127.0.0.1:8147',OUT=process.env.OUT||path.join(__dirname,'raw');fs.mkdirSync(OUT,{recursive:true});
(async()=>{
 const b=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader']}),p=await b.newPage({viewport:{width:393,height:852}});p.setDefaultTimeout(180000);
 const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(URL);await p.waitForFunction(()=>window.ringfighterGame&&app.engine.coach?.anatomy,null,{timeout:180000});
 const ids=await p.evaluate(()=>{const s=app.engine.career.store;if(!s.current())s.create('QA');s.gameAction({type:'venue',venueId:'default'});return GameVenues.catalog.map(v=>v.id);});
 assert.equal(ids.length,9);const results=[];
 for(const size of [[393,852],[360,640],[852,393],[1366,768]])for(const lang of ['en','he','ru']){
  await p.setViewportSize({width:size[0],height:size[1]});
  await p.evaluate(lang=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());app.setLanguage(lang);ringfighterGame.open('venues');},lang);
  await p.waitForFunction(n=>{const imgs=[...document.querySelectorAll('.game-venue-gallery .venue-choice img')];return imgs.length===n&&imgs.every(i=>i.complete);},ids.length);await p.waitForTimeout(700);
  const r=await p.evaluate(async()=>{
   const d=document.querySelector('dialog.game-venue-gallery'),grid=d.querySelector('.venue-gallery-grid'),cards=[...d.querySelectorAll('.venue-choice')],dr=d.getBoundingClientRect(),out={dir:d.dir,dialog:[Math.round(dr.left),Math.round(dr.top),Math.round(dr.right),Math.round(dr.bottom)],scrolls:d.scrollHeight>d.clientHeight+1,columns:getComputedStyle(grid).gridTemplateColumns.split(' ').length,cards:[]};
   for(const c of cards){c.scrollIntoView({block:'nearest'});await new Promise(f=>requestAnimationFrame(f));const r=c.getBoundingClientRect(),img=c.querySelector('img'),name=c.querySelector('strong'),small=c.querySelector('small'),nr=name.getBoundingClientRect(),sr=small.getBoundingClientRect(),g=grid.getBoundingClientRect();
    out.cards.push({id:c.dataset.venueId,name:name.textContent,loaded:img.naturalWidth>0,insideViewport:r.left>=-.5&&r.right<=innerWidth+.5&&r.top>=-.5&&r.bottom<=innerHeight+.5,insideDialog:r.left>=dr.left-.5&&r.right<=dr.right+.5,insideGrid:r.left>=g.left-.5&&r.right<=g.right+.5,textFits:name.scrollWidth<=name.clientWidth+1&&nr.bottom<=sr.top+1&&sr.bottom<=r.bottom+.5&&nr.left>=r.left-.5&&nr.right<=r.right+.5,height:Math.round(r.height),touch:r.height>=44&&r.width>=44});}
   d.scrollTop=0;out.fitsViewport=dr.left>=0&&dr.right<=innerWidth&&dr.top>=0&&dr.bottom<=innerHeight;out.pageScroll=document.documentElement.scrollWidth>innerWidth+1;return out;});
  const tag=`${size[0]}x${size[1]}-${lang}`;results.push({tag,...r});
  assert.equal(r.cards.length,9,tag);assert.equal(r.dir,lang==='he'?'rtl':'ltr',tag);assert.equal(r.fitsViewport,true,tag+' dialog inside viewport');assert.equal(r.pageScroll,false,tag);
  for(const c of r.cards){assert.ok(c.name.trim().length>2,tag+' name '+c.id);for(const k of ['loaded','insideViewport','insideDialog','insideGrid','textFits','touch'])assert.equal(c[k],true,`${tag} ${c.id} ${k}`);}
  assert.equal(new Set(r.cards.map(c=>c.name)).size,9,tag+' distinct names');
  if(lang==='en'||size[0]===393)await p.screenshot({path:path.join(OUT,`gallery-${tag}.png`)});
  console.log(tag,'columns',r.columns,'scrolls',r.scrolls,'card h',r.cards[0].height);
 }
 // Select the last card through the UI: pressed state, saved venue, unchanged wallet, set attached; then reload.
 const last=ids[ids.length-1],sel=await p.evaluate(async id=>{const s=app.engine.career.store,coins=s.wallet().coins,card=document.querySelector(`.venue-choice[data-venue-id="${id}"]`);card.scrollIntoView({block:'nearest'});card.click();await new Promise(f=>setTimeout(f,300));return {pressed:card.getAttribute('aria-pressed'),others:[...document.querySelectorAll('.venue-choice[aria-pressed="true"]')].length,venue:s.game().venue,coins:s.wallet().coins===coins,status:document.querySelector('.venue-description').textContent.length>20};},last);
 assert.deepEqual(sel,{pressed:'true',others:1,venue:last,coins:true,status:true});
 await p.reload();await p.waitForFunction(()=>window.ringfighterGame&&app.engine.coach?.anatomy,null,{timeout:180000});
 const after=await p.evaluate(async()=>{const e=app.engine;document.querySelectorAll('dialog[open]').forEach(d=>d.close());const saved=e.career.store.game().venue;ringfighterGame.quick();document.querySelectorAll('dialog[open]').forEach(d=>d.close());await new Promise(f=>setTimeout(f,2500));const set=e.world.arena.children.find(n=>n.userData.arenaSet),bad=e.career.store.gameAction({type:'venue',venueId:'moon_base'}).ok;return {saved,set:set?.name,audienceHidden:e.arena.fightView.audience.root.visible===false,bad,still:e.career.store.game().venue};});
 assert.deepEqual(after,{saved:last,set:'Arena set '+last,audienceHidden:true,bad:false,still:last});
 fs.writeFileSync(path.join(__dirname,'gallery-results.json'),JSON.stringify(results.map(r=>({tag:r.tag,columns:r.columns,scrolls:r.scrolls,dialog:r.dialog,cardHeight:r.cards[0].height})),null,1));
 assert.deepEqual(errors,[]);console.log('PASS gallery: 9 cards x EN/HE/RU x 4 viewports, images loaded, nothing clipped, RTL, selection saved across reload, set built in the next fight, unknown id rejected');await b.close();
})().catch(e=>{console.error('FAIL',e.message);process.exit(1);});
