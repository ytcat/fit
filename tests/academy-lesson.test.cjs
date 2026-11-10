const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const L=require('../academy-lesson.js'),D=require('../game-domain.js');
const {repetitions:REPS,windowMs:WINDOW,strikes:STRIKES,graceMs:GRACE}=L.RULES;
// Feed presses spaced `gap` ms apart, starting after the previous press.
function player(sequence){const v=L.create(sequence);let now=1000;return {v,press(move,gap=300){now+=gap;return v.input(move,now);},wait(ms){now+=ms;return v.tick(now);},get now(){return now;}};}
{
 // The rules the lesson enforces are the rules the save file accepts.
 assert.equal(REPS,3);assert.equal(D.lesson.repetitions,REPS);assert.equal(D.lesson.windowMs,WINDOW);assert.ok(WINDOW>=1000&&WINDOW<=3000,'a sensible tempo window');assert.ok(GRACE<WINDOW);
 for(const bad of [null,[],['jab'],['jab',''],['jab',7],Array(9).fill('jab')])assert.throws(()=>L.create(bad),/sequence/);
 assert.throws(()=>L.create(['jab','cross'],{repetitions:0}),/rules/);assert.throws(()=>L.create(['jab','cross']).input('jab',NaN),/input/);
}
for(const combo of D.combos){
 // Exact order at a steady tempo: every box fills in turn, three run-throughs pass, and the proof is accepted by the game rules.
 const p=player(combo.sequence),n=combo.sequence.length;let last;
 assert.deepEqual(p.v.state(),{step:0,total:n,reps:0,required:REPS,strikes:0,locked:false,passed:false,next:combo.sequence[0],first:combo.sequence[0],deadline:null,graceUntil:null});
 for(let run=0;run<REPS;run++)for(let i=0;i<n;i++){last=p.press(combo.sequence[i],400);const end=i===n-1;
  assert.equal(last.type,end?(run===REPS-1?'pass':'rep'):'step',combo.id+' run '+run+' step '+i);assert.equal(last.reps,end?run+1:run);assert.equal(last.step,end?0:i+1);if(!end)assert.equal(last.next,combo.sequence[i+1]);}
 assert.equal(last.passed,true);assert.equal(last.next,null);assert.equal(last.evidence.reps.length,REPS);for(const run of last.evidence.reps){assert.deepEqual(run.moves,combo.sequence);assert.deepEqual(run.ms,combo.sequence.map((_,i)=>i*400));}
 assert.deepEqual(p.v.evidence(),last.evidence);assert.equal(p.press(combo.sequence[0]).type,'done','nothing counts after the pass');assert.equal(p.v.state().reps,REPS);
 // Two run-throughs are not enough.
 const short=player(combo.sequence);for(let run=0;run<REPS-1;run++)for(const move of combo.sequence)short.press(move);assert.equal(short.v.state().passed,false);assert.equal(short.v.state().reps,REPS-1);assert.equal(short.v.evidence().reps.length,REPS-1);
}
{
 // Wrong move: names what was pressed and what was needed, clears only the current run-through.
 const p=player(['jab','cross','hook']);for(const m of ['jab','cross','hook'])p.press(m);assert.equal(p.v.state().reps,1);
 p.press('jab');assert.equal(p.v.state().deadline,p.now+WINDOW,'the tempo deadline follows the last move');const wrong=p.press('hook');assert.equal(wrong.type,'wrong');assert.equal(wrong.deadline,null);assert.equal(wrong.graceUntil,p.now+GRACE);assert.equal(wrong.pressed,'hook');assert.equal(wrong.wanted,'cross');assert.equal(wrong.atStart,false);assert.equal(wrong.step,0);assert.equal(wrong.next,'jab');assert.equal(wrong.reps,1,'an earlier success is kept');assert.equal(wrong.strikes,1);assert.equal(wrong.rewatch,false);
 // Presses in the short grace after a mistake are ignored, so one slip is one mistake.
 assert.equal(p.press('cross',GRACE-100).type,'ignored');assert.equal(p.v.state().strikes,1);
 // Starting with the wrong move is a mistake too.
 const start=p.press('cross',GRACE);assert.equal(start.type,'wrong');assert.equal(start.atStart,true);assert.equal(start.wanted,'jab');assert.equal(start.strikes,2);
 // A clean run-through clears the mistake streak.
 p.wait(GRACE);for(const m of ['jab','cross','hook'])p.press(m);assert.equal(p.v.state().reps,2);assert.equal(p.v.state().strikes,0);
}
{
 // Too slow: reported by the clock without waiting for a press; the late press does not rescue the run-through.
 const p=player(['jab','cross']);assert.equal(p.wait(60000),null,'no clock before the first move');p.press('jab');assert.equal(p.wait(WINDOW),null,'the window itself is allowed');const slow=p.wait(1);assert.equal(slow.type,'slow');assert.equal(slow.wanted,'cross');assert.equal(slow.step,0);assert.equal(slow.strikes,1);assert.equal(p.wait(5000),null);
 const q=player(['jab','cross']);q.press('jab');const late=q.press('cross',WINDOW+1);assert.equal(late.type,'slow');assert.equal(q.v.state().reps,0);
 const edge=player(['jab','cross']);edge.press('jab');assert.equal(edge.press('cross',WINDOW).type,'rep');assert.deepEqual(edge.v.evidence().reps[0].ms,[0,WINDOW]);
 // Long pauses between run-throughs are fine; only the tempo inside a run-through is checked.
 const calm=player(['jab','cross']);for(let run=0;run<REPS;run++){calm.wait(30000);calm.press('jab');calm.press('cross');}assert.equal(calm.v.state().passed,true);
}
{
 // Extra presses never count: a longer flurry does not add run-throughs, and doubling a move breaks the order.
 const p=player(['jab','cross']);p.press('jab');p.press('cross');const extra=p.press('hook');assert.equal(extra.type,'wrong');assert.equal(extra.atStart,true);assert.equal(extra.reps,1);
 const d=player(['jab','cross','hook']);d.press('jab');const twice=d.press('jab');assert.equal(twice.type,'wrong');assert.equal(twice.pressed,'jab');assert.equal(twice.wanted,'cross');assert.equal(d.v.state().step,0);
 // A partial run-through followed by a restart does not carry its filled boxes over.
 const r=player(['jab','cross','hook']);r.press('jab');r.press('cross');r.press('jab');r.wait(GRACE);assert.equal(r.press('hook').type,'wrong');assert.equal(r.v.state().reps,0);
}
{
 // Three mistakes in a row: back to Watch. Nothing counts until the player resumes; earned run-throughs survive.
 const p=player(['jab','cross']);p.press('jab');p.press('cross');let ev;for(let i=0;i<STRIKES;i++){ev=p.press('hook',GRACE);assert.equal(ev.type,'wrong');assert.equal(ev.rewatch,i===STRIKES-1);}
 assert.equal(ev.locked,true);assert.equal(ev.next,null);assert.equal(ev.reps,1);for(const m of ['jab','cross','jab','cross','jab','cross'])assert.equal(p.press(m).type,'locked');assert.equal(p.wait(10000),null);assert.equal(p.v.state().passed,false);
 const resumed=p.v.resume();assert.equal(resumed.locked,false);assert.equal(resumed.reps,1);assert.equal(resumed.next,'jab');for(let run=0;run<2;run++){p.press('jab');p.press('cross');}assert.equal(p.v.state().passed,true);
}
{
 // Random tapping on the twelve Moves buttons never passes: every seeded session ends locked, far from three run-throughs.
 const buttons=['jab','hook','uppercut','slip_left','roll','step_left','cross','rear_hook','rear_uppercut','slip_right','guard','step_right'];let seed=0x2f6e2b1;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 for(const combo of D.combos){assert.ok(combo.sequence.every(m=>buttons.includes(m)),'every lesson move has a real Moves button');let presses=0,best=0;
  for(let session=0;session<400;session++){const p=player(combo.sequence);for(let i=0;i<500&&!p.v.state().locked&&!p.v.state().passed;i++){p.press(buttons[Math.floor(random()*buttons.length)],80+Math.floor(random()*900));presses++;}
   const s=p.v.state();assert.equal(s.passed,false,combo.id+' random session '+session);assert.equal(s.locked,true,'random tapping is sent back to Watch');best=Math.max(best,s.reps);}
  assert.ok(best<REPS);assert.ok(presses<400*40,'sessions end quickly: '+presses);}
 // Mashing one button, or hammering the right buttons out of order, does not pass either.
 const mash=player(['jab','cross']);for(let i=0;i<300;i++)mash.press('jab',120);assert.equal(mash.v.state().passed,false);assert.equal(mash.v.state().reps,0);
 const reversed=player(['jab','cross','hook']);for(let i=0;i<100;i++)for(const m of ['hook','cross','jab'])reversed.press(m,150);assert.equal(reversed.v.state().passed,false);assert.equal(reversed.v.state().reps,0);
}
{
 // The same file runs as a plain browser script.
 const context={};context.window=context;vm.runInNewContext(fs.readFileSync('academy-lesson.js','utf8'),context,{filename:'academy-lesson.js'});assert.equal(context.AcademyLesson.RULES.repetitions,REPS);const v=context.AcademyLesson.create(['jab','cross']);assert.equal(v.input('jab',1).type,'step');
}
console.log('PASS Academy lesson rules: exact order for all six combos, three run-throughs required, wrong/slow/extra presses clear only the current run-through, grace after a slip, three misses return to Watch without erasing successes, seeded random tapping and mashing never pass, browser load');
