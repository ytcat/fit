const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');global.window=global;
for(const f of ['boxing-input.js','boxing-fight.js'])vm.runInThisContext(fs.readFileSync(f,'utf8'));
const e={coach:{species:'lion'},arena:{mode:'none',previousTime:0},targetMode:'none',animTime:0},p=new BoxingInput(e);p.setEnabled(true);
for(const [id,ids] of Object.entries(BoxingInput.combos)){
 e.targetMode=e.arena.mode=id.startsWith('combo_speed_')?'speed':'none';e.arena.previousTime=0;p.reset();
 assert.ok(p.press(id));assert.ok(p.press(id),'one next combination is buffered');assert.equal(p.press(id),false,'a third chain must not accumulate');
 const observed=[];let last=-1;
 for(let t=0;t<15;t+=.01){const f=p.frame(t);if(!f.rest&&f.index!==last){observed.push(f.input);last=f.index;}assert.ok(p.queue.length<=15);}
 assert.deepEqual(observed,[...ids,...ids]);assert.equal(p.sequence(),null);assert.ok(p.frame(15).rest);
}
e.targetMode=e.arena.mode='none';p.reset();assert.ok(p.press('combo_super'));const active=p.current.id;assert.ok(p.press('body_guard'));assert.equal(p.current.id,active,'defence must finish the active strike without a snapped arm');assert.equal(p.sequence(),null);assert.equal(p.queue.length,1);assert.equal(p.frame(.55).guardStyle,'body');assert.ok(p.frame(2).rest);
p.reset();assert.ok(p.press('combo_three'));assert.equal(p.frame(-.1).move,'guard');assert.equal(p.sequence(),null,'seeking clears the remaining chain');
e.arena.mode=e.targetMode='rope';p.reset();assert.equal(p.press('combo_super'),false,'automatic rope rhythm cannot queue an unconsumed punch chain');assert.equal(p.press('jab'),false);assert.equal(p.sequence(),null);
e.arena.mode=e.targetMode='none';p.reset();assert.ok(p.press('body_guard'));assert.ok(p.press('combo_one_two'),'queue behind low cover without replacing it');assert.equal(p.current.guardStyle,'body');p.frame(.56);assert.equal(p.current.move,'jab');
const m=new BoxingFight({seed:81});e.arena.fightView={match:m};e.arena.mode=e.targetMode='fight';e.coach.species='rabbit';p.setEnabled(true);assert.equal(p.press('combo_super'),false);m.phase='round';assert.ok(p.press('combo_super'));
let last=0;const actual=[];for(let i=0;i<1200;i++){const a=m.fighters.rabbit.action;if(a&&a.id!==last){actual.push(a.input);last=a.id;}m.advance(1/120);if(!m.playerCombo)break;}
assert.deepEqual(actual,BoxingInput.combos.combo_super);assert.equal(m.totals.rabbit.thrown,5);assert.equal(m.totals.rabbit.landed,0,'macros cannot manufacture scoring contacts');assert.ok(m.totals.lion.thrown>0,'opponent remains independent');
assert.ok(p.press('combo_three'));assert.ok(p.press('high_guard'));assert.equal(m.playerCombo,null);assert.equal(m.playerQueue.length,1);assert.equal(m.playerQueue[0].guardStyle,'high');m.phase='count';m.advance(.01);assert.equal(m.playerQueue.length,0);assert.equal(p.press('combo_three'),false);
m.phase='round';m.setPlayer(null);m.setPlayer('rabbit');m.fighters.rabbit.action={move:'guard',guardStyle:'left',start:m.time,duration:.55,attack:false};assert.ok(p.press('combo_three'));assert.equal(m.requestPlayerCombo([{move:'jab',duration:.54}],'direct'),false,'direct fight commands must also respect side-cover recovery');assert.equal(m.fighters.rabbit.action.guardStyle,'left');
console.log('PASS twelve one-press chains, bounded replay, defence interruption without teleporting, seek/count cancellation, selected rabbit and independent AI with contact-only scoring');
