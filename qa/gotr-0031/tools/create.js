const d=document.querySelector('dialog[open]');const i=d.querySelector('input');i.value='Maya';i.dispatchEvent(new Event('input',{bubbles:true}));
[...d.querySelectorAll('button')].find(b=>/Create player/.test(b.innerText)).click();
await new Promise(r=>setTimeout(r,1500));
const ds=[...document.querySelectorAll('dialog[open]')].map(d=>({cls:d.className,text:d.innerText.replace(/\n+/g,' | ').slice(0,3000)}));
return {ds,store:app.engine.career.store.current(),wallet:app.engine.career.store.wallet()};
