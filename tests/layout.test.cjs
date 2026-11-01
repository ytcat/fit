const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
class Node {
 constructor(tag='div'){this.tag=tag;this.children=[];this.classList={add(){}};this.attrs={};}
 append(...nodes){for(const n of nodes){n.remove();n.parentElement=this;this.children.push(n)}}
 remove(){if(this.parentElement){const a=this.parentElement.children;a.splice(a.indexOf(this),1);this.parentElement=null}}
 before(n){const p=this.parentElement;n.remove();n.parentElement=p;p.children.splice(p.children.indexOf(this),0,n)}
 get firstElementChild(){return this.children[0]} get lastElementChild(){return this.children.at(-1)}
 setAttribute(k,v){this.attrs[k]=v} showModal(){this.open=true} close(){this.open=false}
 addEventListener(name,fn){this[name]=fn}
}
const nodes=new Map(),node=id=>{if(!nodes.has(id)){const n=new Node();n.id=id;nodes.set(id,n)}return nodes.get(id)};
const body=node('body'),header=node('header'),stage=node('stageContainer'),footer=node('footer');body.append(header,stage,footer);
header.append(node('logo'),node('headerTools'));stage.append(node('canvas'));
const group=(parent,ids)=>{const n=new Node();n.append(...ids.map(node));parent.append(n);return n};
const hud=new Node(),card=group(hud,['drillTier','comboCodes','comboCues']);stage.append(hud);
const techniques=node('techniqueBar');stage.append(techniques);
group(stage,['camFront','camBack','camSide']);group(stage,['defaultCoach','motionPause']);
const bio=new Node();group(bio,['biomechanicsLabel','exerciseNotes']);stage.append(bio);
group(stage,['modelStatusBadge']);stage.append(node('restModal'));
const stats=new Node();group(stats,['lblRound','roundCounter']);group(stats,['lblTimer','timerClock']);group(stats,['lblLevel','levelBadge']);footer.append(stats);
const actions=group(footer,['prevBtn','playBtn','nextBtn']);const hint=group(footer,['orbitHint']);
const tools=node('workout-tools');tools.append(node('plan'),node('focus'));footer.append(tools);
const app={lang:'en',setLanguage(lang){this.lang=lang}};
const document={body,readyState:'complete',getElementById:node,createElement:tag=>new Node(tag),querySelector:s=>s==='header'?header:s==='footer'?footer:s==='.workout-tools'?tools:null};
vm.runInNewContext(fs.readFileSync('practice-layout.js','utf8'),{document,window:{app}});
const dialog=body.children.find(n=>n.id==='practiceControls');assert.ok(dialog);
assert.deepEqual(stage.children.map(n=>n.id),['canvas','techniqueBar','restModal'],'only the side technique rail stays beside the canvas');
assert.equal(techniques.parentElement,stage);assert.equal(techniques.className,'practice-techniques');assert.equal(node('camFront').parentElement.parentElement,dialog);
assert.equal(header.children.length,1);assert.equal(actions.children.length,2);
assert.equal(actions.children[0],node('playBtn'));assert.equal(actions.children[1].id,'openPracticeControls');
assert.equal(hud.parentElement,body);assert.equal(hint.hidden,true);assert.equal(node('lblLevel').parentElement.hidden,true);
actions.children[1].onclick();assert.equal(dialog.open,true);dialog.firstElementChild.lastElementChild.onclick();assert.equal(dialog.open,false);
app.setLanguage('he');assert.equal(actions.children[1].textContent,'אפשרויות');
console.log('PASS unobstructed canvas, consolidated controls, dialog open/close and translations');
