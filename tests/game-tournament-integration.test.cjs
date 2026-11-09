const assert=require('node:assert/strict');
const {CareerStore}=require('../career-progress.js'),D=require('../game-domain.js'),T=require('../game-tournament.js');
const clone=v=>JSON.parse(JSON.stringify(v));
function fixture(species='lion'){
 const disk={values:new Map(),getItem(k){return this.values.get(k)||null;},setItem(k,v){if(this.fail)throw Error('quota');this.values.set(k,v);}};
 let store=new CareerStore(disk);store.create('Cup owner');let serial=0;
 const act=a=>{const r=store.gameAction({type:'cup',...a});assert.equal(r.ok,true,r.error);return r;};
 function start(){return act({cupAction:'start',species,seed:0xffffffff});}
 function bind(){return act({cupAction:'bind',stage:store.game().cup.active.stage,matchId:'canonical-'+(++serial)});}
 function event(b,result='win',overrides={}){return {id:b.matchId,profileId:b.profileId,species:b.species,mode:'fight',control:'play',seconds:20,hits:7,attempts:10,defences:2,jumps:0,result,evidence:{cupId:b.cupId,cupStage:b.stage,cupOpponentId:b.opponent.id,seed:b.seed,rounds:1,method:'points',cardTotals:[[10,9],[10,9],[10,9]]},...overrides};}
 return {disk,act,start,bind,event,get store(){return store;},reload(){store=new CareerStore(disk);assert.equal(store.locked,false,store.error);return store;}};
}
for(const species of ['lion','rabbit']){
 const f=fixture(species);f.start();let totalXP=0,totalCoins=0;const ids=[];
 for(let stage=0;stage<3;stage++){
  const b=f.bind(),event=f.event(b),before=f.store.wallet();ids.push(event.id);assert.equal(b.profileId,f.store.current().id);assert.equal(b.stage,stage);assert.equal(b.seed,(0xffffffff+stage)>>>0);
  const award=f.store.award(event);assert.ok(award);assert.equal(award.cup.advanced,true);assert.equal(award.cup.completed,stage===2);totalXP+=award.xp;totalCoins+=award.coins;
  assert.equal(f.store.wallet().xp-before.xp,award.xp);assert.equal(f.store.wallet().coins-before.coins,award.coins);assert.equal(f.store.game().ledger.length,stage+2);
  const saved=f.store.export();assert.equal(f.store.award(event),null);assert.equal(f.store.export(),saved);f.reload();
  assert.equal(f.store.game().cup.active?.stage,stage===2?undefined:stage+1);
 }
 const title=f.store.game().cup.titles[0];assert.equal(title.kind,'local-school-cup-champion');assert.deepEqual(title.sourceIds,ids);assert.equal(new Set(title.sourceIds).size,3);assert.equal(title.wins.length,3);assert.equal(f.store.wallet().xp,totalXP);assert.equal(f.store.wallet().coins,totalCoins);assert.equal(f.store.current().boxers[species].wins,3);
 // Retained proofs survive the normal history window and still require ledger provenance.
 for(let i=0;i<52;i++)assert.ok(f.store.award({id:'prune-'+i,profileId:f.store.current().id,species,mode:'heavy',control:'play',seconds:15,hits:3,attempts:5}));
 assert.equal(f.store.game().history.some(r=>r.id===ids[0]),false);f.reload();assert.deepEqual(f.store.game().cup.titles[0].sourceIds,ids);
 const bad=clone(f.store.data);bad.profiles[0].game.cup.titles[0].wins[0].xp++;assert.throws(()=>f.store.import(JSON.stringify(bad)),/ledger/);
}
{
 const f=fixture();f.start();for(const result of ['loss','draw']){const b=f.bind(),award=f.store.award(f.event(b,result));assert.ok(award);assert.equal(award.cup.advanced,false);assert.equal(f.store.game().cup.active.stage,0);assert.equal(f.store.game().cup.active.pending,null);f.reload();}
 const b=f.bind(),watched=f.store.award(f.event(b,'win',{control:'watch'}));assert.ok(watched);assert.equal(watched.coins,0);assert.ok(watched.xp<=10);assert.equal(f.store.game().cup.active.stage,0);assert.equal(f.store.game().cup.active.pending,null);assert.equal(f.store.game().cup.processed.length,2);
 const interrupted=f.bind();f.reload();assert.equal(f.store.game().cup.active.pending.matchId,interrupted.matchId);f.act({cupAction:'resume'});assert.equal(f.store.game().cup.active.pending,null);const late=f.store.award(f.event(interrupted));assert.ok(late);assert.equal(f.store.game().cup.active.stage,0);assert.equal(late.cup,undefined);
 const next=f.bind();assert.notEqual(next.matchId,interrupted.matchId);f.act({cupAction:'abandon'});assert.equal(f.store.game().cup.active,null);f.start();assert.equal(f.store.game().cup.active.id,'school-cup:2');assert.equal(f.store.game().cup.nextCup,3);
}
{
 const f=fixture();f.start();const b=f.bind(),event=f.event(b),before=f.store.export(),raw=f.disk.getItem(f.store.key);f.disk.fail=true;
 assert.equal(f.store.award(event),null);assert.match(f.store.lastAwardError,/storage/);assert.equal(f.store.export(),before);assert.equal(f.disk.getItem(f.store.key),raw);assert.equal(f.store.game().cup.active.pending.matchId,b.matchId);assert.equal(f.store.game().cup.active.stage,0);
 f.disk.fail=false;assert.ok(f.store.award(event));assert.equal(f.store.game().cup.active.stage,1);assert.equal(f.store.award(event),null);f.reload();assert.equal(f.store.game().cup.active.stage,1);
}
{
 const f=fixture();f.start();const b=f.bind(),owner=f.store.current().id,other=f.store.create('Other');assert.equal(f.store.game().cup.active,null);assert.ok(f.store.award(f.event(b)));assert.equal(f.store.game().cup.active,null);f.store.select(owner);assert.equal(f.store.game().cup.active.stage,1);assert.equal(f.store.current().id,owner);assert.notEqual(other.id,owner);
 const pending=f.bind(),raw=f.store.export();f.store.import(raw);assert.notEqual(f.store.current().id,owner);assert.equal(f.store.game().cup.active.pending.profileId,owner);assert.equal(f.store.award({...f.event(pending),profileId:f.store.current().id}),null,'old pending owner cannot award an imported profile');assert.equal(f.store.game().cup.active.stage,1);f.act({cupAction:'resume'});const rebound=f.bind();assert.equal(rebound.profileId,f.store.current().id);assert.ok(f.store.award(f.event(rebound)));assert.equal(f.store.game().cup.active.stage,2);
}
for(const transform of [e=>e.evidence.seed=12,e=>e.species='rabbit',e=>e.evidence.cupId='school-cup:999',e=>{e.evidence.cupStage=1;e.evidence.cupOpponentId='circuit';},e=>e.evidence.cupOpponentId='ember']){
 const f=fixture();f.start();const b=f.bind(),event=f.event(b);transform(event);const award=f.store.award(event);assert.ok(award);assert.equal(f.store.game().cup.active.stage,0);assert.equal(f.store.game().cup.active.pending,null);assert.equal(f.store.game().cup.titles.length,0);
}
for(const evidence of [{cupId:'school-cup:1'},{cupId:'school-cup:01',cupStage:0,cupOpponentId:'shadow'},{cupId:'school-cup:1',cupStage:3,cupOpponentId:'shadow'},{cupId:'school-cup:1',cupStage:0,cupOpponentId:'unknown'},{cupId:'school-cup:1',cupStage:0,cupOpponentId:'shadow',eventId:'E02'}])assert.throws(()=>D.evidence(evidence),/cup/);
{
 const f=fixture();f.store.gameAction({type:'world',action:'selectOpportunity',kind:'event',id:'E02'});f.start();const b=f.bind();assert.equal(f.store.game().world.opportunity,null);assert.ok(f.store.award(f.event(b)));assert.equal(f.store.game().world.events.E02.attempts,0);assert.equal(f.store.game().world.rivals.shadow.encounters,0);assert.equal(f.store.game().world.rivals.circuit.encounters,0);
 const before=f.store.export();assert.equal(f.store.gameAction({type:'cup',cupAction:'record',matchId:b.matchId}).ok,false);assert.equal(f.store.export(),before,'UI cannot submit a simulated cup result');
}
// More than fifty complete cups remain playable: title proofs roll, entry IDs never repeat.
{
 const f=fixture();for(let cup=1;cup<=52;cup++){f.start();for(let stage=0;stage<3;stage++)assert.ok(f.store.award(f.event(f.bind())));}
 assert.equal(f.store.game().cup.titles.length,T.maxTitles);assert.equal(f.store.game().cup.titles[0].id,'school-cup:3');assert.equal(f.store.game().cup.titles.at(-1).id,'school-cup:52');assert.equal(f.store.game().cup.nextCup,53);assert.equal(f.store.game().cup.processed.length,156);f.reload();f.start();assert.equal(f.store.game().cup.active.id,'school-cup:53');
}
console.log('PASS actual CareerStore atomic cup awards/reload, standard rewards only, three proofs, retries/watch, import/profile/seed isolation, quota rollback/retry, stale opportunities, simulated-record rejection and rolling title archive');

{
 // Loading an existing cup without its bundled core must retain the original save.
 const fs=require('node:fs'),vm=require('node:vm'),f=fixture();f.start();const raw=f.disk.getItem(f.store.key),ctx={GameWorld:require('../game-world.js')};ctx.window=ctx;
 for(const file of ['game-domain.js','career-progress.js'])vm.runInNewContext(fs.readFileSync(file,'utf8'),ctx,{filename:file});
 const unavailable=new ctx.CareerProgress.CareerStore(f.disk);assert.equal(unavailable.locked,true);assert.throws(()=>unavailable.create('Must not replace'));assert.equal(f.disk.getItem(f.store.key),raw);
}
console.log('PASS missing tournament core preserves saved cup data and prevents replacement');
{
 const fs=require('node:fs'),vm=require('node:vm'),ctx={};ctx.window=ctx;vm.runInNewContext(fs.readFileSync('boxing-fight.js','utf8'),ctx);
 for(const tactic of ['counter','outside','pressure']){const m=new ctx.BoxingFight({seed:41,preset:'quick'});m.setPlayer('lion');m.phase='round';m.fighters.rabbit.cupTactic=tactic;for(let i=0;i<350;i++){m.fighters.rabbit.stamina=1;m.advance(.05);}const plans=m.events.filter(e=>e.type==='combination'&&e.actor==='rabbit');assert.ok(plans.length>2,'cup opponent should generate several actual AI phrases');assert.ok(plans.every(e=>e.tactic===tactic),'cup style persists beyond its opening phrase');}
}
console.log('PASS cup opponents use their authored existing AI tactic across repeated phrases');
