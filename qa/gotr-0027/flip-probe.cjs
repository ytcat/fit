/* GOTR-0027 probe: which pose stage makes the guard hand flip for single ticks in mitt work.
   Records, per 120 Hz tick, the lead hand after each stage the coach exposes (via wrapping methods).
   Usage (repo root): node qa/gotr-0027/flip-probe.cjs [from] [to] */
const path=require('path');const M=require(path.join(__dirname,'measure.cjs'));
const [from='4.99',to='5.05']=process.argv.slice(2);
const e=M.setup('pads','lion'),coach=e.coach,P=Object.getPrototypeOf(coach),V=()=>new THREE.Vector3();
let log=null;const hand=()=>coach.joints.handL.getWorldPosition(V()).toArray().map(x=>x.toFixed(3)).join(',');
const head=()=>coach.joints.head.getWorldPosition(V()).toArray().map(x=>x.toFixed(3)).join(',');
for(const name of ['clearOwnFace','constrainGlove','constrainArm','orientGlove']){const f=P[name];P[name]=function(side,...a){if(log&&this===coach&&side==='L'&&name==='clearOwnFace')log.push('before clearOwnFace head '+head()+' hand '+hand()+' move '+coach.metrics?.move);const r=f.call(this,side,...a);if(log&&this===coach&&side==='L')log.push(name+'->'+hand());return r;};}
const update=P.update;P.update=function(...a){if(log&&this===coach)log.push('update-start '+hand());const r=update.apply(this,a);if(log&&this===coach)log.push('update-end '+hand());return r;};
let t=0;while(t<+to){t+=1/120;e.animTime=t;log=t>=+from?[]:null;e.arena.update(t,e.technique,e.currentAnim);if(log)console.log(t.toFixed(4),'final',hand(),'\n   '+log.filter((x,i,l)=>i===0||x.split(' ').pop()!==l[i-1].split(' ').pop()||x.startsWith('update')).join('\n   '));}
