// GOTR-0005 Burst: charge rules, Watch-order boundary, Play queueing, cost and lifecycle (round, count, KO).
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');global.window=global;
for(const f of ['boxing-input.js','boxing-fight.js'])vm.runInThisContext(fs.readFileSync(f,'utf8'));
const B=BoxingFight.burst,near=(a,b,e=1e-6)=>Math.abs(a-b)<=e;
const toRound=m=>{for(let i=0;i<400&&m.phase!=='round';i++)m.advance(1/60);assert.equal(m.phase,'round');};
const run=(m,seconds,each)=>{for(let i=0;i<Math.round(seconds*120);i++){m.advance(1/120);if(each&&each()===false)break;}};

// 1) Empty at the bell, unusable before it, slow time fill only while the round is live.
{const m=new BoxingFight({seed:3,preset:'quick'});
 assert.equal(m.burstState('lion').status,'bell');m.fighters.lion.burst.charge=1;assert.equal(m.requestBurst('lion'),false,'no burst during the intro');
 run(m,2.9);assert.equal(m.phase,'intro');toRound(m);assert.equal(m.fighters.lion.burst.charge,0,'charge is empty at the bell');assert.equal(m.fighters.rabbit.burst.charge,0);
 // isolate the clock: no contacts happen without the 3D arena, so only time fills the meter here
 run(m,10);assert.ok(near(m.fighters.lion.burst.charge,10*B.perSecond,.01),'time alone: '+m.fighters.lion.burst.charge);
 assert.equal(m.burstState('lion').status,'charging');assert.equal(m.requestBurst('lion'),false,'cannot order while charging');
 assert.ok(20*B.perSecond<.75,'time alone cannot fill the meter inside a 20 s round');}

// 2) Real play events fill it: clean hits for the attacker, blocks and evasions for the defender.
{const m=new BoxingFight({seed:4,preset:'quick'});toRound(m);const L=m.fighters.lion.burst,R=m.fighters.rabbit.burst;const c0=L.charge,r0=R.charge;
 let a=m.attack('lion','jab','head');m.contact({actor:'lion',action:a.id,part:'head',speed:2});assert.ok(near(L.charge-c0,B.hit,1e-9),'clean hit charges the hitter');assert.ok(near(R.charge,r0,1e-9));
 m.fighters.lion.action=null;a=m.attack('lion','cross','head');m.contact({actor:'lion',action:a.id,part:'glove',speed:2});assert.ok(near(R.charge-r0,B.defence,1e-9),'a block charges the defender');assert.ok(near(L.charge-c0,B.hit,1e-9),'a blocked punch earns the attacker nothing');
 m.fighters.lion.action=null;a=m.attack('lion','hook','head');a.facedDefence=true;const before=R.charge;for(let i=0;i<200&&m.fighters.lion.action===a;i++)m.advance(1/120);assert.ok(R.charge-before>=B.defence-1e-9,'an evaded punch charges the defender');
 // Shoulder contacts and misses do not charge the attacker.
 const l1=L.charge;m.fighters.lion.action=null;a=m.attack('lion','jab','head');m.contact({actor:'lion',action:a.id,part:'shoulder',speed:2});assert.ok(L.charge-l1<.001);
 // Typical round: 3 clean hits + 3 defences plus time fill it in the second half of a 20 s round (about once per round).
 const t=(1-3*B.hit-3*B.defence)/B.perSecond;assert.ok(t>8&&t<18,'about once per round: ready after '+t.toFixed(1)+' s');}

// 3) Watch (coach) order: queued at any time, starts only at the next action boundary, never mid-punch.
for(const seed of [11,12,13,14,15,16]){
 const m=new BoxingFight({seed,preset:'quick'});toRound(m);run(m,1.3);
 // wait for the AI lion to be mid-punch, then give the order
 run(m,6,()=>!(m.fighters.lion.action?.attack&&m.time-m.fighters.lion.action.start<.1));
 const busy=m.fighters.lion.action;assert.ok(busy?.attack,'lion is mid-punch when ordered');m.fighters.lion.burst.charge=1;
 assert.equal(m.burstState('lion').status,'ready');assert.ok(m.requestBurst('lion'));assert.equal(m.burstState('lion').status,'queued');assert.equal(m.requestBurst('lion'),false,'one order at a time');
 const seen=[];let start=null,interrupted=false;
 run(m,8,()=>{const a=m.fighters.lion.action;if(!start){const ev=m.events.find(e=>e.type==='burst-start'&&e.actor==='lion');if(ev)start=ev;else if(a&&a!==busy&&a.burst)interrupted=true;}
  if(a&&a.burst&&seen[seen.length-1]?.id!==a.id)seen.push({id:a.id,move:a.move,duration:a.duration,start:a.start});return !(m.fighters.lion.burst.open>0&&!m.fighters.lion.burst.run&&m.fighters.lion.action?.burstRecover);});
 assert.ok(start,'burst started');assert.equal(interrupted,false);
 assert.ok(start.time>=busy.start+busy.duration-1e-9,'started after the punch in progress finished ('+start.time.toFixed(3)+' vs '+(busy.start+busy.duration).toFixed(3)+')');
 assert.ok(start.previous&&start.previous.end<=start.time+1e-9,'previous action had ended at the boundary');
 assert.deepEqual(seen.map(s=>s.move),B.sequence.map(s=>s[0]),'the real punches, in order');
 for(const s of seen)assert.ok(s.duration<(s.move.includes('uppercut')?.98:.85)*1.3/m.fighters.lion.tempo*.95&&s.duration>=.25,'faster than an ordinary punch: '+s.move+' '+s.duration.toFixed(3));
 for(let i=1;i<seen.length;i++)assert.ok(near(seen[i].start,seen[i-1].start+seen[i-1].duration,1/60+.05),'back-to-back steps without gaps or overlap');
 assert.equal(m.fighters.lion.burst.charge,0,'spent');assert.equal(m.burstState('lion').status,'recover');assert.equal(m.fighters.lion.burst.used,1);
}

// 4) Fair cost: committed recovery step, stamina cost, and the opponent does not pause to reset.
{const m=new BoxingFight({seed:21,preset:'quick'});toRound(m);const f=m.fighters.lion;f.action=null;f.burst.charge=1;m.requestBurst('lion');
 const staminaBefore=[];run(m,8,()=>{if(f.action?.burst===B.sequence.length)staminaBefore[0]=f.stamina;return !f.action?.burstRecover;});
 assert.ok(f.action?.burstRecover,'recovery step follows the last punch');assert.equal(f.action.attack,false);assert.ok(!f.action.defend,'no defence during recovery');assert.ok(near(f.action.duration,B.recover));
 assert.ok(f.stamina<staminaBefore[0],'recovery costs stamina');assert.equal(m.requestPlayerMove({move:'slip',duration:.6}),false,'Watch: no player commands');
 const op=m.fighters.rabbit;let resets=0;for(let i=0;i<300;i++){op.action=null;op.plan=[];op.stamina=1;m.decide('rabbit');const a=op.action;if(!a.attack&&a.defend===undefined&&a.stepAdvance===undefined)resets++;}
 assert.equal(resets,0,'opponent attacks or plans instead of resetting while the burster is open');
 run(m,1);assert.equal(m.burstState('lion').status,'charging');const c=f.burst.charge;run(m,1);assert.ok(f.burst.charge>c,'charging resumes after recovery');}

// 5) The opponent can still read, block or slip burst punches.
{let defended=0,punches=0;for(let seed=31;seed<61;seed++){const m=new BoxingFight({seed,preset:'quick'});toRound(m);run(m,1);const f=m.fighters.lion,op=m.fighters.rabbit;run(m,4,()=>!!f.action);
 f.burst.charge=1;m.requestBurst('lion');let last=0;
 run(m,6,()=>{const a=f.action;if(a?.burst&&a.id!==last){last=a.id;punches++;}if(a?.burst&&op.action?.defend&&op.action.start>=a.start&&!op.action.counted){op.action.counted=true;defended++;}return !f.action?.burstRecover;});}
 assert.ok(punches>=100,'punches '+punches);assert.ok(defended>=10,'opponent defended '+defended+' of '+punches+' burst punches');console.log('opponent reacted to',defended,'of',punches,'burst punches');}

// 6) Play mode: same order path; player commands are refused while committed and accepted afterwards.
{const e={coach:{species:'rabbit'},arena:{mode:'fight',previousTime:0},targetMode:'fight',animTime:0},p=new BoxingInput(e),m=new BoxingFight({seed:41,preset:'quick'});e.arena.fightView={match:m};p.setEnabled(true);
 assert.equal(m.playerActor,'rabbit');toRound(m);assert.ok(p.press('cross'));const busy=m.fighters.rabbit.action;assert.ok(busy.attack);assert.ok(p.press('jab'),'queued behind the cross');
 m.fighters.rabbit.burst.charge=1;assert.ok(m.requestBurst('rabbit'));assert.equal(m.playerQueue.length,0,'Burst replaces queued commands');assert.equal(p.press('hook'),false,'committed: no new commands');assert.equal(p.press('combo_one_two'),false);
 assert.equal(m.fighters.rabbit.action,busy,'the punch in progress is not cut');let start;run(m,8,()=>{start=start||m.events.find(e=>e.type==='burst-start');return !m.fighters.rabbit.action?.burstRecover;});
 assert.ok(start.player&&start.time>=busy.start+busy.duration-1e-9);run(m,.8);assert.equal(m.burstState('rabbit').status,'charging');assert.ok(p.press('jab'),'commands accepted after recovery');}

// 7) Knockdown count cancels a queued order (meter kept); a running burst stops; round end and KO end it.
{const m=new BoxingFight({seed:51,preset:'quick'});toRound(m);const f=m.fighters.lion;run(m,4,()=>!(f.action?.attack&&m.time-f.action.start<.05));f.burst.charge=1;assert.ok(m.requestBurst('lion'));
 m.fighters.rabbit.pendingDown=true;m.advance(1/120);assert.equal(m.phase,'count');assert.equal(m.burstState('lion').status,'down');assert.equal(f.burst.order,null);assert.equal(f.burst.charge,1,'meter kept');assert.equal(m.requestBurst('lion'),false,'no order during the count');
 let started=false;run(m,m.knockdownSeconds-.05,()=>{if(m.events.some(e=>e.type==='burst-start'))started=true;});assert.equal(started,false,'never during the count');
 run(m,.2);assert.equal(m.phase,'round');assert.equal(m.burstState('lion').status,'ready','ready again after the count');
 assert.ok(m.requestBurst('lion'));run(m,3,()=>!f.burst.run||f.burst.run.index<2);assert.ok(f.burst.run);m.fighters.rabbit.pendingDown=true;m.advance(1/120);assert.equal(f.burst.run,null,'a knockdown stops the run');assert.equal(f.action,null);assert.ok(m.events.some(e=>e.type==='burst-cancel'&&e.started));}
{const m=new BoxingFight({seed:52,preset:'club'});toRound(m);const f=m.fighters.lion;run(m,19.2);f.action=null;f.burst.charge=1;assert.ok(m.requestBurst('lion'));run(m,1.2);assert.equal(m.phase,'rest');assert.equal(m.burstState('lion').status,'over');assert.equal(f.burst.run,null);assert.equal(f.burst.order,null);
 assert.equal(m.requestBurst('lion'),false);f.burst.charge=.9;run(m,m.restSeconds+1,()=>m.phase!=='round');assert.equal(m.phase,'round');assert.equal(f.burst.charge,0,'empty again at the next bell');
 f.burst.charge=1;m.fighters.rabbit.condition=0;m.advance(1/120);assert.ok(m.result);assert.equal(m.burstState('lion').status,'over');assert.equal(m.requestBurst('lion'),false,'no burst after KO');}

// 8) No damage multiplier: identical contacts score identically with or without Burst.
{const severity=burstFlag=>{const m=new BoxingFight({seed:61,preset:'quick'});toRound(m);const f=m.fighters.lion;f.action=null;let a;if(burstFlag){f.burst.charge=1;m.requestBurst('lion');m.burstStep('lion');a=f.action;assert.equal(a.burst,1);}else a=m.attack('lion','jab','head');f.stamina=1;return m.contact({actor:'lion',action:a.id,part:'head',speed:2.4}).severity;};
 assert.equal(severity(true),severity(false));}
console.log('PASS burst: empty at bell, time+hit+defence charge, Watch order at action boundary only, real faster punches, recovery cost, opponent defends, Play commit, count/round/KO stop');
