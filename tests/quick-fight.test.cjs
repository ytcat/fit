const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
global.window=global;vm.runInThisContext(fs.readFileSync('boxing-fight.js','utf8'));
assert.deepEqual(BoxingFight.presets.quick,{rounds:1,roundSeconds:60,restSeconds:0});
const start=seed=>{const m=new BoxingFight({seed,preset:'quick'});m.phase='round';return m;};
function hit(m,actor,speed=3,part='head'){const action=m.attack(actor,'cross','head');return action?m.contact({actor,action:action.id,part,speed}):null;}
for(const winner of ['lion','rabbit']){
 const m=start(8),loser=winner==='lion'?'rabbit':'lion';
 let n=0;while(m.fighters[loser].condition>0&&n++<20)hit(m,winner,4);
 m.advance(1/60);assert.equal(m.result.winner,winner);assert.equal(m.result.method,'KO');assert.ok(m.time<60);assert.equal(m.fighters[loser].down,1);assert.equal(m.snapshot().health[loser],0);
 const totals=JSON.stringify(m.totals);assert.equal(hit(m,loser),null,'the result freezes scoring');assert.equal(JSON.stringify(m.totals),totals);
}
const soft=start(9),hard=start(9);hit(soft,'lion',1);hit(hard,'lion',5);assert.ok(hard.fighters.rabbit.condition<soft.fighters.rabbit.condition,'stronger observed contact removes more health');
const block=start(3);hit(block,'lion',5,'glove');assert.equal(block.fighters.rabbit.condition,100,'a blocked punch cannot manufacture damage');
const draw=start(4);draw.advance(60);assert.equal(draw.result.winner,null);assert.equal(draw.result.method,'draw');
for(const winner of ['lion','rabbit']){const m=start(4);hit(m,winner,3);m.advance(60);assert.equal(m.result.winner,winner);assert.equal(m.result.method,'health');assert.equal(m.round,1);}
const dwell=start(4);hit(dwell,'lion',3);dwell.time+=.03;const phase=dwell.spec('lion').phase;assert.ok(phase<.03/dwell.fighters.lion.action.duration,'contact slows follow-through before recovery');
console.log('PASS one-minute active clock, both health winners, tie, early KO, strength-dependent damage, blocked contact and impact dwell');
