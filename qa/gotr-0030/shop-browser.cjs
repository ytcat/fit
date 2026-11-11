// GOTR-0030: one card system in the Shop. For every category, viewport and language this checks that
// all product cards share one size, one image box and the same name/badge positions; that cards, the
// category tabs and the detail row stay inside the dialog without scrolling or clipping; that every
// item card shows a rendered thumbnail (not a drawn fallback) that actually loaded. Screenshots of the
// owner's phone size (402x690) go to OUT.
// Usage: APP_URL=http://127.0.0.1:8171 OUT=qa/gotr-0030 PREFIX=after node qa/gotr-0030/shop-browser.cjs
const {chromium}=require('playwright'),path=require('path');
const URL=process.env.APP_URL||'http://127.0.0.1:8171',OUT=process.env.OUT||__dirname,PRE=process.env.PREFIX||'after',CHECK=process.env.CHECK!=='0';
const sizes=(process.env.SIZES?JSON.parse(process.env.SIZES):[['owner',402,690],['phone',393,852],['small',360,640],['land',852,393],['desk',1366,768]]);
(async()=>{const b=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader']});let bad=0;const errors=[];
 for(const [name,width,height] of sizes){const p=await b.newPage({viewport:{width,height}});p.on('pageerror',x=>errors.push(x.message));await p.goto(URL+'/?v=qa'+Date.now());await p.waitForFunction(()=>window.ringfighterGame&&app.engine.coach?.anatomy,null,{timeout:180000});
  for(const lang of ['en','he','ru']){
   const r=await p.evaluate(async({lang,check})=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());app.setLanguage(lang);await new Promise(r=>setTimeout(r,200));ringfighterGame.quick();await new Promise(r=>setTimeout(r,300));document.querySelectorAll('dialog[open]').forEach(d=>d.close());ringfighterGame.open('club');await new Promise(r=>setTimeout(r,900));
    const d=document.querySelector('dialog[open]'),box=n=>n.getBoundingClientRect(),issues=[],sizes={},dr=box(d);
    for(const cat of [...d.querySelectorAll('.store-category')]){cat.click();await new Promise(r=>setTimeout(r,400));const id=cat.dataset.category,grid=d.querySelector('.store-products'),cards=[...grid.children];
     await Promise.all(cards.map(c=>{const img=c.querySelector('img');return img.complete?0:new Promise(res=>{img.onload=img.onerror=res;setTimeout(res,3000);});}));
     const det=box(d.querySelector('.store-detail')),gr=box(grid);
     for(const c of cards){const r=box(c),img=c.querySelector('img'),well=c.querySelector('.store-thumb')||img,nm=c.querySelector('.store-name')||c.querySelector('span'),bd=c.querySelector('small'),w=box(well),n=box(nm),g=box(bd);
      const key=[Math.round(r.width),Math.round(r.height),Math.round(w.width),Math.round(w.height),Math.round(w.top-r.top),Math.round(n.top-r.top),Math.round(g.top-r.top)].join('/');sizes[key]=(sizes[key]||[]).concat(id);
      if(r.bottom>gr.bottom+1||r.top<gr.top-1||r.right>dr.right+1||r.left<dr.left-1)issues.push(id+': card outside grid');
      if(r.bottom>det.top+1&&r.top<det.bottom)issues.push(id+': card under detail row');
      if(n.height<8||n.bottom>r.bottom+1)issues.push(id+': name hidden');if(!bd.textContent||g.height<8||g.bottom>r.bottom+1||g.right>r.right+1||g.left<r.left-1)issues.push(id+': badge hidden or clipped');
      if(w.bottom>n.top+1)issues.push(id+': image overlaps name');
      if(id!=='combo'&&(!/assets\/shop\//.test(img.currentSrc||img.src)||!img.naturalWidth))issues.push(id+': thumbnail not rendered '+(img.currentSrc||img.src).slice(0,40));}
     if(grid.scrollHeight>grid.clientHeight+1)issues.push(id+': products scroll');
     for(const n of d.querySelectorAll('.store-category')){if(n.scrollWidth>n.clientWidth+1)issues.push('category text clipped: '+n.textContent);if(box(n).height<24)issues.push('category too short: '+n.textContent);}
     for(const n of d.querySelector('.store-detail').children){const r=box(n);if(r.width&&(r.right>dr.right+1||r.left<dr.left-1||r.bottom>dr.bottom))issues.push(id+': detail child outside');if(n.scrollWidth>n.clientWidth+1&&!['STRONG','SMALL','SPAN','DIV'].includes(n.tagName))issues.push(id+': detail text clipped '+n.textContent);}
     if(d.scrollHeight>d.clientHeight+1)issues.push(id+': dialog scrolls');if(document.documentElement.scrollWidth>innerWidth)issues.push('horizontal scroll');}
    const keys=Object.keys(sizes);if(check&&keys.length>1)issues.push('card sizes differ: '+keys.map(k=>k+' '+[...new Set(sizes[k])].join(',')).join(' | '));
    d.querySelector('.store-category[data-category=gloves]').click();await new Promise(r=>setTimeout(r,500));return {issues:[...new Set(issues)],cards:keys};},{lang,check:CHECK});
   bad+=r.issues.length;console.log(name,lang,'cards',r.cards.join(' '),r.issues.length?JSON.stringify(r.issues):'ok');
   if(name==='owner'||lang==='en'){await p.waitForTimeout(1500);await p.screenshot({path:path.join(OUT,`${PRE}-${name}-${lang}.png`),timeout:180000});}}
  await p.close();}
 console.log('TOTAL SHOP ISSUES',bad,'page errors',errors.length,errors.slice(0,3));await b.close();process.exitCode=bad||errors.length?1:0;})();
