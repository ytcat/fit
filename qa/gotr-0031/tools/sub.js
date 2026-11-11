// open window.__open, then click button labelled window.__btn inside dialog
const wait=ms=>new Promise(r=>setTimeout(r,ms));document.querySelectorAll('dialog[open]').forEach(d=>d.close());await wait(300);
const w=window.__open;if(w.startsWith('top:'))[...document.querySelectorAll('button,[role=tab]')].find(b=>b.innerText.trim()===w.slice(4)&&!b.closest('dialog')).click();else ringfighterGame.open(w);await wait(1500);
let d=[...document.querySelectorAll('dialog[open]')].pop();const b=[...d.querySelectorAll('button')].find(b=>b.innerText.trim()===window.__btn);if(!b)return 'no btn '+window.__btn+' in '+d.innerText.slice(0,200);b.click();await wait(1800);
d=[...document.querySelectorAll('dialog[open]')].pop();if(!d)return 'no dialog after';d.scrollTop=0;
return {cls:d.className,h:d.querySelector('h2,h1')?.innerText,text:d.innerText.replace(/\n+/g,' | ').slice(0,2000),btns:[...d.querySelectorAll('button,[role=tab],select,input')].filter(b=>b.offsetParent).map(b=>(b.innerText||b.value||b.getAttribute('aria-label')||'').trim().replace(/\s+/g,' ').slice(0,30)+(b.disabled?'(dis)':'')).slice(0,40)};
