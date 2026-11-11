// GOTR-0043: a lost fight still pays participation coins, less than a draw, less than a win; Watch pays nothing.
const assert=require('node:assert/strict');
const {CareerStore}=require('../career-progress.js');
const D=require('../game-domain.js');
const memory=()=>({values:new Map(),getItem(k){return this.values.get(k)||null;},setItem(k,v){this.values.set(k,v);}});
const paid={};
for(const result of ['win','draw','loss']){
 const s=new CareerStore(memory());s.create('Pay '+result);
 const r=s.award({id:'f-'+result,profileId:s.current().id,species:'lion',mode:'fight',seconds:60,hits:20,attempts:40,defences:5,result});
 assert.ok(r,'fight '+result+' recorded: '+s.lastAwardError);paid[result]=r.coins;
}
assert.ok(paid.loss>0,'a loss pays participation coins');
assert.ok(paid.loss<paid.draw&&paid.draw<paid.win,'win > draw > loss: '+JSON.stringify(paid));
assert.equal(D.fightPay.loss,.6);assert.equal(D.fightPay.win,1.5);
{const s=new CareerStore(memory());s.create('Watcher');const r=s.award({id:'w1',profileId:s.current().id,species:'lion',mode:'fight',seconds:60,hits:20,attempts:40,defences:5,result:'loss',control:'watch'});assert.ok(r);assert.equal(r.coins,0,'Watch pays nothing');}
{const s=new CareerStore(memory());s.create('Trainer');const r=s.award({id:'t1',profileId:s.current().id,species:'lion',mode:'heavy',seconds:60,hits:30,attempts:40});assert.equal(r.coins,35,'training pay unchanged');}
console.log('fight-pay: ok',JSON.stringify(paid));
