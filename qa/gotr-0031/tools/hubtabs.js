const out={};const d=()=>[...document.querySelectorAll('dialog[open]')].pop();
for(const t of ['School','Rivals','Local cup','Events','Practice']){const b=[...d().querySelectorAll('button')].find(b=>b.innerText.trim()===t);if(!b){out[t]='NO TAB';continue}b.click();await new Promise(r=>setTimeout(r,700));
 const panel=d();const tabs=b.closest('[role=tablist]')||b.parentElement;let txt='';let sib=tabs.nextElementSibling;while(sib){if(!sib.hidden&&sib.offsetParent)txt+=sib.innerText+' || ';sib=sib.nextElementSibling}
 out[t]={text:txt.replace(/\n+/g,' | ').slice(0,1800),btns:[...panel.querySelectorAll('button')].filter(x=>x.offsetParent).map(x=>x.innerText.trim()).filter(Boolean).slice(-25)};}
return out;
