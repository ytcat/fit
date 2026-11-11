document.querySelectorAll('dialog[open]').forEach(d=>d.close());await new Promise(r=>setTimeout(r,400));
const t=window.__tab;const b=[...document.querySelectorAll('button,[role=tab]')].find(b=>b.innerText.trim()===t&&!b.closest('dialog'));b.click();await new Promise(r=>setTimeout(r,2500));
const ds=[...document.querySelectorAll('dialog[open]')].map(d=>({cls:d.className,title:d.querySelector('h2,h1')?.innerText,text:d.innerText.replace(/\n+/g,' | ').slice(0,1500)}));
const vis=e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&getComputedStyle(e).visibility!=='hidden'};
return {ds,controls:[...document.querySelectorAll('button,select,input')].filter(b=>vis(b)&&!b.closest('dialog')).map(b=>(b.innerText||b.getAttribute('aria-label')||'').trim().replace(/\s+/g,' ').slice(0,40)+(b.disabled?'(dis)':''))};
