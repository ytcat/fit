const wait=ms=>new Promise(r=>setTimeout(r,ms));
const my=[...document.querySelectorAll('button')].find(b=>b.innerText.trim()==='My turn');if(my){my.click();await wait(1500);}
const log=[];const panel=()=>{const p=[...document.querySelectorAll('button')].find(b=>/First Rhythm/.test(b.parentElement?.innerText||''));return (document.querySelector('[class*=academy-lesson],[class*=lesson-bar],.academy-bar')||{}).innerText};
const press=async m=>{const b=document.querySelector(`[data-input-move="${m}"]`);b.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));b.click();b.dispatchEvent(new PointerEvent('pointerup',{bubbles:true}));};
for(let rep=0;rep<3;rep++){await press('jab');await wait(900);await press('cross');await wait(2500);log.push((document.body.innerText.match(/\d ?\/ ?3|×3|Repeat[^\n]*|[0-9] of 3[^\n]*/g)||[]).join(','));}
await wait(2000);
const ds=[...document.querySelectorAll('dialog[open]')].map(d=>d.innerText.replace(/\n+/g,' | ').slice(0,1200));
return {log,ds,owned:app.engine.career.store.game().combos,wallet:app.engine.career.store.wallet(),toast:[...document.querySelectorAll('[class*=toast],[class*=banner],[role=status]')].filter(x=>x.offsetParent).map(x=>x.innerText.slice(0,200))};
