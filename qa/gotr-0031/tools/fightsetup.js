const wait=ms=>new Promise(r=>setTimeout(r,ms));
let d=document.querySelector('dialog[open]');if(d&&d.querySelector('input')){const i=d.querySelector('input');i.value='Maya';i.dispatchEvent(new Event('input',{bubbles:true}));[...d.querySelectorAll('button')].find(b=>/Create player/.test(b.innerText)).click();await wait(1200);}
document.querySelectorAll('dialog[open]').forEach(d=>d.close());
[...document.querySelectorAll('button,[role=tab]')].find(b=>b.innerText.trim()==='Fight'&&!b.closest('dialog')).click();await wait(1200);
d=document.querySelector('dialog[open]');[...d.querySelectorAll('button')].find(b=>/One short round/.test(b.innerText)).click();await wait(1500);
try{app.engine.cameraDirector?.skipIntro?.()}catch(e){}
document.querySelector('#compactControlMode').click();await wait(600);
const fv=app.engine.arena.fightView;for(let i=0;i<60*6;i++)fv.step();await wait(1500);
return {phase:fv.match.phase,rt:fv.match.roundTime};
