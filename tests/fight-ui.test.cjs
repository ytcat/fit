const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
class El{
 constructor(tag){this.tag=tag;this.children=[];this.dataset={};this.attrs={};this.listeners={};this.classList={toggle(){}};}
 append(...nodes){for(const n of nodes){n.remove();this.children.push(n);n.parentElement=this;}}
 prepend(n){n.remove();this.children.unshift(n);n.parentElement=this;}
 remove(){if(this.parentElement){const a=this.parentElement.children;a.splice(a.indexOf(this),1);this.parentElement=null;}}
 replaceChildren(...nodes){this.children.forEach(n=>n.parentElement=null);this.children=[];this.append(...nodes);}
 setAttribute(k,v){this.attrs[k]=v;}addEventListener(k,f){(this.listeners[k]||=[]).push(f);}
 showModal(){this.open=true;}close(){this.open=false;for(const f of this.listeners.close||[])f();}
 click(){if(!this.disabled){this.onclick?.();for(const f of this.listeners.click||[])f();}}
}
const els=new Map(),get=id=>{if(!els.has(id)){const n=new El('div');n.id=id;els.set(id,n);}return els.get(id);};
const body=new El('body'),footer=get('footer');body.append(footer);
const techniques=['jab','cross','hook','uppercut','slip','roll','combo'].map(m=>{const n=new El('button');n.dataset.technique=m;return n;});
const e={technique:'combo',currentAnim:'one_two',animTime:0,speed:1,isPlaying:true,arena:{setTarget(m){this.mode=m;}}};
const app={lang:'en',engine:e,drillIdx:0,setLanguage(l){this.lang=l;},updatePlayBtnText(){get('playBtn').textContent=e.isPlaying?'Pause':'Resume';},renderDrill(){e.technique='combo';e.currentAnim=ctx.BOXING_ROUTINES.list[this.drillIdx].id;e.animTime=0;}};
get('motionPause').onclick=()=>e.isPlaying=!e.isPlaying;
const ctx={THREE:require('../assets/vendor/three.min.js'),app,document:{body,readyState:'complete',createElement:t=>new El(t),getElementById:get,querySelector:s=>s==='footer'?footer:null,querySelectorAll:()=>techniques},setInterval:f=>ctx.pulse=f};ctx.window=ctx;
for(const f of ['boxing-routines.js','boxing-coach-v2.js','boxing-fight.js','fight-ui.js','training-controls.js'])vm.runInNewContext(fs.readFileSync(f,'utf8'),ctx);

const ui=ctx.fightUI,mainFight=footer.children.find(n=>n.id==='trainingBar').children[3];assert.equal(mainFight.id,'fightBtn');mainFight.click();let d=body.children.at(-1);assert.equal(d.children[1].children.length,4);d.children[1].children[0].click();assert.equal(e.targetMode,'fight');assert.equal(e.fightOptions.preset,'quick');assert.equal(e.speed,1);assert.ok(techniques.every(b=>b.disabled));assert.ok(get('speedBtn').disabled);assert.equal(get('speedBtn').textContent,'1×');assert.ok(get('prevBtn').disabled);
const m=new ctx.BoxingFight({rounds:1});m.phase='round';const attack=m.attack('rabbit','cross','head');m.contact({actor:'rabbit',action:attack.id,part:'head',speed:3});m.finish(null,'points');const view={match:m};e.arena.fightView=view;
const text=n=>(n.textContent||'')+n.children.map(text).join(' ');
ui.render(view);let panel=footer.children.find(n=>n.id==='fightResults');assert.ok(!panel.hidden);assert.ok(!text(panel).includes('Rabbit won'),'winner must stay hidden before announcement');assert.ok(text(panel).includes('••'));
m.advance(1.2);ui.render(view);assert.ok(text(panel).includes(m.result.cards[0].totals.join(' – ')));assert.ok(text(panel).includes('••'));
m.advance(5);ui.render(view);assert.ok(!text(panel).includes('••'));assert.ok(!text(panel).includes('Rabbit won'),'all three cards must be shown before the announcement');
m.advance(4);ui.render(view);assert.ok(text(panel).includes('Rabbit won'));ui.detail(view);d=body.children.at(-1);assert.ok(d.children.some(n=>n.tag==='table'),'round-by-round cards must be inspectable');d.close();
e.animTime=51;app.setLanguage('he');ui.render(view);assert.equal(e.animTime,51);assert.ok(text(panel).includes('ארנב'));ctx.trainingControls.chooseTarget('none');assert.equal(e.technique,'combo');assert.ok(panel.hidden);assert.ok(!get('speedBtn').disabled&&techniques.every(b=>!b.disabled));
// GOTR-0075: a KO/TKO shows the winner line alone (no judges' cards); a decision on the cards shows the three cards.
{app.setLanguage('en');const k=new ctx.BoxingFight({rounds:1});k.phase='round';const hit=k.attack('lion','cross','head');k.contact({actor:'lion',action:hit.id,part:'head',speed:3});k.finish('lion','KO');for(let i=0;i<30&&k.phase!=='ceremony';i++)k.advance(.5);const kv={match:k};e.arena.fightView=kv;ctx.trainingControls.chooseTarget('fight');e.arena.fightView=kv;ui.render(kv);const kp=footer.children.find(n=>n.id==='fightResults');assert.ok(!kp.hidden);assert.equal(kp.dataset.cards,'false');assert.ok(!kp.children.some(n=>n.className==='fight-card-grid'),'no judges cards after a KO');assert.ok(!/Judge|••/.test(text(kp)),'no judges numbers after a KO');
 const d2=new ctx.BoxingFight({rounds:1});d2.phase='round';d2.finish(null,'points');for(let i=0;i<30&&d2.phase!=='ceremony';i++)d2.advance(.5);const dv={match:d2};e.arena.fightView=dv;ui.render(dv);assert.equal(kp.dataset.cards,'true');assert.equal(kp.children.find(n=>n.className==='fight-card-grid').children.length,3,'three score cards on a decision');}
console.log('PASS GOTR-0075 judges cards only when the bout goes to the cards');
console.log('PASS fight setup, full/short presets, locked live speed, staged cards before winner, round detail, translations and clean return to practice');
