const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
class El {
 constructor(tag){this.tag=tag;this.children=[];this.attrs={};this.classes=new Set();this.classList={toggle:(n,on)=>on?this.classes.add(n):this.classes.delete(n),add:n=>this.classes.add(n)};this.listeners={};}
 append(...e){this.children.push(...e)} prepend(e){this.children.unshift(e)} setAttribute(k,v){this.attrs[k]=v}
 addEventListener(k,f){this.listeners[k]=f} click(){this.onclick?.()} showModal(){this.open=true} close(){this.open=false;this.listeners.close?.()} remove(){this.removed=true}
}
const els=new Map(),get=id=>{if(!els.has(id))els.set(id,new El(id));return els.get(id)};
const body=new El('body'),events={};let saved;
const app={lang:'en',isActive:false,isRest:false,drillIdx:0,clock:180,setLanguage(l){this.lang=l},renderDrill(){this.rendered=this.drillIdx},updateHUD(){},updatePlayBtnText(){}};
const ctx={window:{app,addEventListener:(n,f)=>events[n]=f},document:{body,readyState:'complete',createElement:t=>new El(t),getElementById:get,querySelector:get},localStorage:{getItem:()=>saved,setItem:(k,v)=>saved=v},I18N:{en:{drills:[{codes:'1–2'},{codes:'1–2–3'},{codes:'Slip–2'},{codes:'5–3–2'}]}},setInterval:f=>{ctx.pulse=f},clearInterval(){}};
vm.runInNewContext(fs.readFileSync('workout-experience.js','utf8'),ctx);
const tools=get('footer').children[0],plan=tools.children[0],focus=tools.children[1];
focus.click();assert.ok(body.classes.has('workout-focus'));focus.click();assert.ok(!body.classes.has('workout-focus'));
plan.click();let dialog=body.children.at(-1);assert.equal(dialog.children[2].children.length,28);
dialog.children[2].children[9].click();dialog=body.children.at(-1);assert.equal(JSON.parse(saved).selected,10);
dialog.children[4].click();assert.equal(app.clock,180);assert.equal(app.round,1);assert.equal(dialog.open,false);
events['shadowbox-workout-complete']();events['shadowbox-workout-complete']();assert.deepEqual(JSON.parse(saved).done,[10]);
app.setLanguage('he');assert.match(plan.textContent,/28/);assert.match(plan.textContent,/תוכנית/);
console.log('PASS challenge day selection, device persistence, idempotent completion, focus toggle and language switching');
