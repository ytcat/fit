// GOTR-0033 Shop UI: development build (APP_VERSION.channel 'dev') makes everything free while price tags stay.
// Fresh 0-coin profile per language at the owner's phone size: the Shop and Combo loadouts show the notice;
// via the UI get + equip one gear item (Jade gloves), one accessory (head ribbon) and one combo in the Shop
// (Corner Turn) plus one in Combo loadouts (Thunder Arc); coins stay 0; ownership survives a reload.
// Then the live channel: no notice, the same items show "Need N more" / Buy, nothing is granted.
// Usage: APP_URL=http://127.0.0.1:8171 OUT=qa/gotr-0030 node qa/gotr-0030/free-mode-browser.cjs
const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('path');
const URL=process.env.APP_URL||'http://127.0.0.1:8171',OUT=process.env.OUT||__dirname,W=+(process.env.W||402),H=+(process.env.H||690);
const NOTE={en:'Development build: everything is free.',he:'גרסת פיתוח: הכול בחינם.',ru:'Версия для разработки: всё бесплатно.'},GET={en:'Get free',he:'קבל בחינם',ru:'Взять бесплатно'};
(async()=>{const b=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader']});const errors=[];
 const ready=async(ctx,channel)=>{const p=await ctx.newPage();p.on('pageerror',x=>errors.push(x.message));await p.goto(URL+'/?v=free'+Date.now());await p.waitForFunction(()=>window.ringfighterGame&&app.engine.coach?.anatomy,null,{timeout:180000});
  await p.evaluate(async channel=>{window.APP_VERSION={...(window.APP_VERSION||{}),channel};document.querySelectorAll('dialog[open]').forEach(d=>d.close());if(!app.engine.career.store.game?.()){ringfighterGame.quick();await new Promise(r=>setTimeout(r,300));document.querySelectorAll('dialog[open]').forEach(d=>d.close());}},channel);return p;};
 // In the Shop: pick a category and card, return what the card and the detail row show.
 const shop=(p,cat,id)=>p.evaluate(async({cat,id})=>{const wait=ms=>new Promise(r=>setTimeout(r,ms));if(!document.querySelector('dialog[open].game-store')){document.querySelectorAll('dialog[open]').forEach(d=>d.close());ringfighterGame.open('club');await wait(900);}
  const d=document.querySelector('dialog[open].game-store');d.querySelector(`.store-category[data-category=${cat}]`).click();await wait(300);const card=d.querySelector(`.store-product[data-item-id=${id}]`);card.click();await wait(300);
  const det=d.querySelector('.store-detail');return {note:d.querySelector('.store-free-note')?.textContent||'',badge:card.querySelector('.store-badge').textContent,state:card.dataset.state,detail:det.innerText.replace(/\s+/g,' '),buttons:[...det.querySelectorAll('button')].map(b=>({t:b.textContent,disabled:b.disabled})),coins:app.engine.career.store.wallet().coins,scroll:d.scrollHeight>d.clientHeight+1||d.querySelector('.store-products').scrollHeight>d.querySelector('.store-products').clientHeight+1};},{cat,id});
 const press=(p,label)=>p.evaluate(async label=>{const d=document.querySelector('dialog[open].game-store');const b=[...d.querySelectorAll('.store-detail button')].find(b=>b.textContent===label||b.textContent.startsWith(label));if(!b)return false;b.click();await new Promise(r=>setTimeout(r,500));return true;},label);
 const pressFirst=p=>p.evaluate(async()=>{const b=document.querySelector('dialog[open].game-store .store-detail button');const t=b?.textContent;b?.click();await new Promise(r=>setTimeout(r,500));return t;});
 for(const lang of ['en','he','ru']){const ctx=await b.newContext({viewport:{width:W,height:H}}),p=await ready(ctx,'dev');await p.evaluate(l=>app.setLanguage(l),lang);
  const out=[];
  for(const [cat,id] of [['gloves','gloves_jade'],['accessory','headband'],['combo','corner_turn']]){const before=await shop(p,cat,id);
   assert.ok(before.note.startsWith(NOTE[lang]),lang+' notice: '+before.note);assert.equal(before.state,'free');assert.match(before.badge,/^\d+ ◈$/,'price tag stays on the card: '+before.badge);assert.ok(before.detail.includes(before.badge),'price tag in the detail row');assert.equal(before.buttons[0].t,GET[lang]);assert.equal(before.buttons[0].disabled,false);assert.equal(before.coins,0);assert.equal(before.scroll,false,'no scrolling');
   if(lang==='en'&&cat==='gloves'){await p.waitForTimeout(1500);await p.screenshot({path:path.join(OUT,`free-shop-${lang}.png`)});}
   assert.ok(await press(p,GET[lang]),'Get free pressed');const got=await shop(p,cat,id);assert.equal(got.state,'owned',id+' owned after Get free');assert.equal(got.coins,0,'no coins spent');
   const equipLabel=await pressFirst(p);const worn=await shop(p,cat,id);assert.equal(worn.state,'equipped',id+' equipped via '+equipLabel);out.push(`${id}: ${before.badge} → ${GET[lang]} → owned → ${equipLabel} → equipped`);}
  if(lang!=='en'){await p.evaluate(()=>document.querySelector('dialog[open] .store-category[data-category=gloves]').click());await p.waitForTimeout(1500);await p.screenshot({path:path.join(OUT,`free-shop-${lang}.png`)});}
  // Combo loadouts: notice, price on the card, Get free without a confirm row, then equip for Fight.
  const lab=await p.evaluate(async label=>{const wait=ms=>new Promise(r=>setTimeout(r,ms));document.querySelectorAll('dialog[open]').forEach(d=>d.close());ringfighterGame.open('lab');await wait(800);let d=document.querySelector('dialog[open]');const card=()=>document.querySelector('dialog[open] .loadout-card[data-combo=thunder_arc]');
   const r={note:d.querySelector('.store-free-note')?.textContent||'',pill:card().querySelector('.loadout-pill').textContent,first:document.querySelector('dialog[open] .loadout-card[data-combo=first_rhythm] .loadout-actions button')?.textContent};const get=[...card().querySelectorAll('button')].find(b=>b.textContent===label);r.get=!!get&&!get.disabled;get.click();await wait(900);
   r.state=card().dataset.state;r.confirmRows=document.querySelectorAll('dialog[open] .combo-confirm').length;const fight=card().querySelector('.loadout-toggle');fight.click();await wait(900);r.after=card().dataset.state;r.coins=app.engine.career.store.wallet().coins;return r;},GET[lang]);
  assert.ok(lab.note.startsWith(NOTE[lang]),'loadouts notice');assert.match(lab.pill,/^\d+ ◈$/);assert.equal(lab.get,true);assert.equal(lab.first,GET[lang],'the earned first combo can be taken too');assert.equal(lab.state,'owned');assert.equal(lab.confirmRows,0);assert.equal(lab.after,'equipped');assert.equal(lab.coins,0);
  await p.evaluate(()=>document.querySelector('dialog[open] .loadouts')?.scrollTo?.(0,0));await p.waitForTimeout(800);await p.screenshot({path:path.join(OUT,`free-loadouts-${lang}.png`)});
  // Reload keeps the grants (validated ledger rows).
  await p.reload();await p.waitForFunction(()=>window.ringfighterGame&&app.engine.coach?.anatomy,null,{timeout:180000});const kept=await p.evaluate(()=>{const g=app.engine.career.store.game();return {gloves:g.inventory.includes('gloves_jade'),ribbon:g.accessories.owned.includes('headband'),corner:g.combos.owned.includes('corner_turn'),thunder:g.combos.fight.includes('thunder_arc'),coins:app.engine.career.store.wallet().coins};});
  assert.deepEqual(kept,{gloves:true,ribbon:true,corner:true,thunder:true,coins:0});
  console.log(lang,'dev:',out.join(' | '),'| loadouts: Thunder Arc',lab.pill,'→',GET[lang],'→ Fight → equipped | reload kept',JSON.stringify(kept));await ctx.close();}
 // Live channel: today's behaviour.
 const ctx=await b.newContext({viewport:{width:W,height:H}}),p=await ready(ctx,'live');const live=await shop(p,'gloves','gloves_jade');
 assert.equal(live.note,'');assert.equal(live.state,'short');assert.equal(live.badge,'75 ◈');assert.ok(live.buttons.some(b=>/75 ◈/.test(b.t)),'Buy · 75 ◈ button');assert.ok(!live.buttons.some(b=>b.t===GET.en));
 const acc=await shop(p,'accessory','headband');assert.equal(acc.state,'short');const combo=await shop(p,'combo','first_rhythm');assert.equal(combo.state,'locked');
 const lab=await p.evaluate(async()=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());ringfighterGame.open('lab');await new Promise(r=>setTimeout(r,800));const d=document.querySelector('dialog[open]');return {note:!!d.querySelector('.store-free-note'),buy:[...d.querySelectorAll('.loadout-card[data-combo=thunder_arc] button')].map(b=>[b.textContent,b.disabled])};});
 assert.equal(lab.note,false);assert.ok(lab.buy.some(([t,dis])=>/40 ◈/.test(t)&&dis),'live: Buy disabled without coins '+JSON.stringify(lab.buy));
 console.log('live: no notice; Jade gloves',live.badge,live.state,'button',live.buttons.map(b=>b.t).join('/'),'; head ribbon',acc.state,'; First Rhythm',combo.state,'; loadouts Thunder Arc',JSON.stringify(lab.buy));
 console.log(JSON.stringify({errors}));await b.close();process.exitCode=errors.length?1:0;})().catch(x=>{console.error('FAIL',x.message);process.exit(1);});
