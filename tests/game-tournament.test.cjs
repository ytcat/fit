const assert=require('node:assert/strict');
const T=require('../game-tournament.js'),{CareerStore}=require('../career-progress.js');
const clone=v=>JSON.parse(JSON.stringify(v));
function fixture(species='lion'){
 const disk={data:new Map(),getItem(k){return this.data.get(k)||null;},setItem(k,v){if(this.fail)throw Error('quota');this.data.set(k,v);}};
 const store=new CareerStore(disk);store.create('Cup player');let state=T.fresh(),serial=0;const records=new Map();
 const context=()=>({profileId:store.current().id,history:store.game().history.map(r=>records.get(r.id)||r),ledger:store.game().ledger});
 const act=a=>{const next=clone(state),result=T.action(next,a,context());T.validate(next,context());state=next;return result;};
 act({type:'start',species,seed:0xffffffff});
 function bind(){return act({type:'bind',stage:state.active.stage,matchId:'bout-'+(++serial)});}
 function award(binding,result='win',overrides={}){
  const event={id:state.active.pending.matchId,profileId:store.current().id,species,mode:'fight',control:'play',result,seconds:20,hits:7,attempts:10,defences:2,jumps:0,evidence:{seed:binding.seed,cupId:binding.cupId,cupStage:binding.stage,cupOpponentId:binding.opponent.id,method:'points',cardTotals:[[30,27],[30,27],[29,28]]},...overrides};
  const awarded=store.award(event);assert.ok(awarded,'fixture must use a real persisted CareerStore reward');
  // Proofs read the actual persisted canonical record and ordinary reward ledger.
  const record=clone(store.game().history.find(r=>r.id===event.id));records.set(record.id,record);
  return record;
 }
 return {store,disk,context,act,bind,award,get state(){return state;},set state(v){state=v;}};
}
for(const species of ['lion','rabbit']){
 const f=fixture(species),opponents=[];let result;
 for(let stage=0;stage<3;stage++){
  const entry=f.bind();opponents.push(entry.opponent.id);assert.equal(entry.species,species);assert.notEqual(entry.opponent.species,species);assert.equal(entry.stage,stage);assert.equal(entry.seed,(0xffffffff+stage)>>>0);
  const record=f.award(entry),canonical=JSON.stringify(f.context()),wallet=f.store.wallet(),boxers=JSON.stringify(f.store.current().boxers);
  result=f.act({type:'record',matchId:record.id});assert.equal(result.advanced,true);assert.equal(result.completed,stage===2);assert.equal(result.checkpoint,true);
  assert.equal(JSON.stringify(f.context()),canonical);assert.deepEqual(f.store.wallet(),wallet);assert.equal(JSON.stringify(f.store.current().boxers),boxers);
  const before=JSON.stringify(f.state);assert.deepEqual(f.act({type:'record',matchId:record.id}),{duplicate:true,advanced:false,completed:false});assert.equal(JSON.stringify(f.state),before);
  f.state=clone(f.state);T.validate(f.state,f.context());
 }
 assert.deepEqual(opponents,T.roster(species).map(r=>r.id));assert.equal(f.state.active,null);assert.equal(f.state.titles.length,1);assert.equal(result.title.kind,'local-school-cup-champion');assert.equal(result.title.wins.length,3);assert.deepEqual(result.title.sourceIds,result.title.wins.map(p=>p.id));assert.equal(f.state.nextCup,2);
 const proof=f.state.titles[0].wins[0],ctx=f.context();ctx.history=[];T.validate(f.state,ctx);assert.equal(T.action(f.state,{type:'record',matchId:proof.id},ctx).duplicate,true,'pruned history must remain idempotent');
 assert.throws(()=>T.validate(f.state,{...ctx,ledger:ctx.ledger.filter(t=>t.activityId!==proof.id)}),/ledger|unrecorded/);
 const tampered=clone(f.state);tampered.titles[0].wins[0].coins++;assert.throws(()=>T.validate(tampered,ctx),/ledger/);
}
{
 const f=fixture();for(const result of ['loss','draw']){const entry=f.bind(),record=f.award(entry,result),answer=f.act({type:'record',matchId:record.id});assert.equal(answer.advanced,false);assert.equal(answer.checkpoint,true);assert.equal(f.state.active.stage,0);assert.equal(f.state.active.pending,null);}
 assert.equal(f.state.active.wins.length,0);assert.equal(f.state.titles.length,0);
 const entry=f.bind(),record=f.award(entry);f.act({type:'record',matchId:record.id});assert.equal(f.state.active.stage,1);assert.equal(f.state.active.attempts.length,3);
 const checkpoint=clone(f.state);f.state=checkpoint;f.act({type:'resume'});assert.equal(f.state.active.stage,1);assert.equal(f.state.active.wins.length,1);
}
{
 const f=fixture(),entry=f.bind(),matchId=f.state.active.pending.matchId;
 assert.equal(f.act({type:'record',matchId}).reason,'not-persisted');assert.equal(f.state.active.pending.matchId,matchId);
 f.act({type:'resume'});assert.equal(f.state.active.pending,null);assert.ok(f.store.award({id:matchId,profileId:f.store.current().id,species:'lion',mode:'fight',control:'play',result:'win',seconds:20,hits:7,attempts:10,defences:2,jumps:0}));// Abandoned late results are never bound again.
 assert.equal(f.act({type:'record',matchId}).reason,'not-bound');assert.throws(()=>f.act({type:'bind',stage:0,matchId}),/completed/);
 assert.throws(()=>f.act({type:'bind',stage:1,matchId:'wrong-stage'}),/stage/);
 const next=f.bind();assert.throws(()=>f.bind(),/checkpoint/);assert.equal(f.state.active.pending.stage,0);assert.equal(next.opponent.id,entry.opponent.id);
}
for(const mutate of [
 r=>r.control='watch',r=>r.species='rabbit',r=>r.mode='heavy',r=>r.evidence.cupId='school-cup:999',r=>r.evidence.cupStage=1,r=>r.evidence.cupOpponentId='circuit',r=>r.evidence.seed=5
]){
 const f=fixture(),entry=f.bind(),record=f.award(entry);mutate(record);assert.equal(f.act({type:'record',matchId:record.id}).reason,'ineligible-match');assert.equal(f.state.active.stage,0);assert.equal(f.state.active.pending,null);assert.equal(f.state.processed.length,0);
}
{
 const f=fixture(),entry=f.bind(),record=f.award(entry),before=JSON.stringify(f.state),ctx=f.context();
 assert.throws(()=>T.action(clone(f.state),{type:'record',matchId:record.id},{...ctx,profileId:'other-player'}),/another player/);assert.equal(JSON.stringify(f.state),before);
 assert.throws(()=>T.action(clone(f.state),{type:'record',matchId:record.id},{...ctx,ledger:[]}),/ledger/);
 assert.throws(()=>T.action(clone(f.state),{type:'record',matchId:record.id},{...ctx,history:[record,record]}),/Ambiguous/);
 assert.throws(()=>T.action(clone(f.state),{type:'record',matchId:record.id},{history:ctx.history,ledger:ctx.ledger}),/canonical/);
 assert.throws(()=>f.act({type:'bind',stage:0,matchId:record.id}),/checkpoint/);
}
{
 const f=fixture(),entry=f.bind(),record=f.award(entry);f.act({type:'record',matchId:record.id});
 const before=clone(f.state),ctx=f.context();assert.throws(()=>T.validate(before,{...ctx,history:[record,record]}),/Ambiguous/);
 const changed=clone(record);changed.evidence.method='KO';assert.throws(()=>T.validate(before,{...ctx,history:[changed]}),/contradicts/);
 const bad=clone(before);bad.active.wins[0].seed=3;assert.throws(()=>T.validate(bad,{...ctx,history:[]}),/seed/);
}
for(const bad of [null,{},[],{...T.fresh(),version:2},{...T.fresh(),extra:true},{...T.fresh(),nextCup:Infinity},{...T.fresh(),processed:['dup','dup']},{...T.fresh(),active:{}},{...T.fresh(),titles:Array(51).fill({})}])assert.throws(()=>T.validate(bad));
assert.throws(()=>T.validate({...T.fresh(),processed:Array(20001).fill('activity')}));assert.throws(()=>T.action(T.fresh(),{type:'simulate',result:'win'}));assert.throws(()=>T.roster('dragon'));assert.ok(Object.isFrozen(T.rosters.lion[0]));assert.throws(()=>T.action(T.fresh(),{type:'start',species:'lion',seed:-1}));
{
 const f=fixture(),entry=f.bind(),r=f.award(entry,'win',{control:'watch'});assert.equal(f.store.wallet().coins,0);assert.equal(f.act({type:'record',matchId:r.id}).reason,'ineligible-match');assert.equal(f.state.active.stage,0);
}
{
 const f=fixture(),entry=f.bind(),matchId=f.state.active.pending.matchId;f.disk.fail=true;
 assert.equal(f.store.award({id:matchId,profileId:f.store.current().id,species:'lion',mode:'fight',control:'play',result:'win',seconds:20,hits:7,attempts:10,defences:2,jumps:0,evidence:{seed:entry.seed,method:'points'}}),null);
 assert.equal(f.act({type:'record',matchId}).reason,'not-persisted');assert.equal(f.state.active.stage,0);f.disk.fail=false;
}
{
 const f=fixture(),entry=f.bind(),r=f.award(entry,'win',{seconds:61});assert.throws(()=>f.act({type:'record',matchId:r.id}),/proof/);assert.equal(f.state.active.stage,0);
}
{
 const f=fixture(),b=f.bind(),r=f.award(b),result=f.act({type:'record',matchId:r.id});result.cup.wins[0].result='loss';assert.equal(f.state.active.wins[0].result,'win');
 // Import assigns a new profile ID. Persisted titles/checkpoints still validate;
 // resume drops the old owner-bound in-flight entry before a new binding.
 const pending=f.bind(),newContext={...f.context(),profileId:'new-imported-profile'};T.validate(f.state,newContext);T.action(f.state,{type:'resume'},newContext);const rebound=T.action(f.state,{type:'bind',stage:1,matchId:'imported-next-bout'},newContext);assert.equal(rebound.opponent.id,pending.opponent.id);assert.equal(f.state.active.pending.profileId,newContext.profileId);
}
// Every processed ID needs retained canonical rewards; bounded attempt history
// does not drop the duplicate guard when the display history rolls over.
{
 const f=fixture();for(let i=0;i<23;i++){const b=f.bind(),r=f.award(b,'loss');f.act({type:'record',matchId:r.id});}
 assert.equal(f.state.active.attempts.length,20);assert.equal(f.state.processed.length,23);assert.equal(f.act({type:'record',matchId:'bout-1'}).duplicate,true);
}
// Simulate domain integration's cloned transaction: failed application must not
// publish an in-memory checkpoint when its persistence step fails.
{
 const f=fixture(),b=f.bind(),r=f.award(b),original=JSON.stringify(f.state),candidate=clone(f.state);T.action(candidate,{type:'record',matchId:r.id},f.context());assert.notEqual(JSON.stringify(candidate),original);assert.equal(JSON.stringify(f.state),original);
}
console.log('PASS canonical three-bout cups, both fixed rosters, retries/checkpoints, profile/entry/seed binding, proof provenance, pruning/idempotence, bounded validation and no extra rewards');
