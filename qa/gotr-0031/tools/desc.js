const vis=e=>{if(!e)return false;const r=e.getBoundingClientRect();const s=getComputedStyle(e);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none'&&r.bottom>0&&r.top<innerHeight+2000;};
const lab=b=>(b.innerText||b.value||b.placeholder||b.getAttribute('aria-label')||b.title||'').replace(/\s+/g,' ').trim().slice(0,50);
const ds=[...document.querySelectorAll('dialog[open]')].map(d=>({cls:d.className,id:d.id,text:d.innerText.replace(/\n+/g,' | ').slice(0,2500),ctrls:[...d.querySelectorAll('button,input,select,a,[role=tab]')].filter(vis).map(b=>b.tagName[0]+':'+lab(b))}));
const outside=[...document.querySelectorAll('button,select,input,a,[role=tab]')].filter(b=>vis(b)&&!b.closest('dialog')).map(b=>{const r=b.getBoundingClientRect();return lab(b)+'@'+Math.round(r.x)+','+Math.round(r.y)+(b.disabled?'(dis)':'')+(b.id?'#'+b.id:'')});
let st={};try{const s=app.engine.career.store;st={wallet:s.wallet(),profile:s.current&&s.current()?{name:s.current().name,id:s.current().id}:null};}catch(e){st.err=e.message}
return {dialogs:ds,controls:outside,state:st};
