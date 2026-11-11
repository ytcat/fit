// GOTR-0033: development channel gives every item and combo free (price kept); live channel charges as before.
const assert=require('node:assert/strict');
const {CareerStore}=require('../career-progress.js');
const D=require('../game-domain.js');
const A=require('../game-accessories.js');
const memory=()=>({values:new Map(),getItem(k){return this.values.get(k)||null;},setItem(k,v){this.values.set(k,v);}});
const setChannel=c=>{if(c)globalThis.APP_VERSION={number:'t',date:'t',channel:c};else delete globalThis.APP_VERSION;};

// Live (and missing switch): nothing free.
for(const channel of ['live',undefined]){
 setChannel(channel);assert.equal(D.freeMode(),false);
 const s=new CareerStore(memory());s.create('Live Owner');assert.equal(s.wallet().coins,0);
 assert.equal(s.gameAction({type:'buy',itemId:'gloves_sunrise'}).ok,false);
 assert.equal(s.gameAction({type:'combo-buy',comboId:'school_signature'}).ok,false);
 assert.equal(s.gameAction({type:'combo-buy',comboId:'first_rhythm'}).ok,false,'first combo stays earned-only when live');
 assert.equal(s.gameAction({type:'accessory',action:'buy',itemId:A.catalog[0].id}).ok,false);
 assert.equal(s.gameAction({type:'accessory',action:'buy',itemId:A.catalog[0].id,free:true}).ok,false,'callers cannot force free');
}

// Development: a 0-coin player can take and equip everything; prices are unchanged; coins are not spent.
setChannel('dev');assert.equal(D.freeMode(),true);
const disk=memory(),s=new CareerStore(disk);s.create('Dev Owner');
const prices=D.catalog.map(c=>c.price).join();
for(const item of D.catalog.filter(c=>c.price>0)){const r=s.gameAction({type:'buy',itemId:item.id});assert.equal(r.ok,true,item.id);assert.equal(s.gameAction({type:'equip',slot:item.slot,itemId:item.id}).ok,true);}
for(const c of D.combos){assert.equal(s.gameAction({type:'combo-buy',comboId:c.id}).ok,true,c.id);}
for(const item of A.catalog){assert.equal(s.gameAction({type:'accessory',action:'buy',itemId:item.id}).ok,true,item.id);}
assert.equal(D.catalog.map(c=>c.price).join(),prices,'price tags unchanged');
assert.ok(D.combos.every(c=>typeof c.price==='number')&&D.combos.some(c=>c.price>0));
assert.equal(s.wallet().coins,0,'nothing charged');
const g=s.game();assert.equal(g.inventory.length,D.catalog.length);assert.equal(g.combos.owned.length,D.combos.length);assert.equal(g.accessories.owned.length,A.catalog.length);
assert.ok(g.ledger.filter(t=>t.type==='grant').every(t=>t.coins===0&&t.xp===0&&t.rule==='dev-free-v1'));
assert.equal(s.gameAction({type:'combo',comboId:'school_signature',mode:'fight',enabled:true}).ok,true);
assert.equal(s.gameAction({type:'buy',itemId:'gloves_sunrise'}).ok,false,'already owned');
// Coins earned in play still count.
assert.ok(s.award({id:'a1',profileId:s.current().id,species:'lion',mode:'heavy',seconds:60,hits:30,attempts:40}));const earned=s.wallet().coins;assert.ok(earned>0);

// Reload validates the grants, also after switching to live.
for(const channel of ['dev','live']){setChannel(channel);const r=new CareerStore(disk);assert.equal(r.error||'','',channel);assert.equal(r.game().combos.owned.length,D.combos.length);assert.equal(r.game().equipment.gloves,'gloves_sunrise');assert.equal(r.wallet().coins,earned);}

// Forged grants are rejected.
setChannel('live');
const live=new CareerStore(disk),valid=live.export();
const bad=[g=>{g.ledger.find(t=>t.type==='grant').coins=50;},g=>{g.ledger.find(t=>t.type==='grant').rule='shop-v1';},g=>{g.ledger.find(t=>t.type==='grant').id='reward:forged';},g=>{g.ledger.find(t=>t.type==='grant').xp=5;}];
for(const mut of bad){const data=JSON.parse(valid).data;mut(data.profiles[0].game);assert.throws(()=>live.import(JSON.stringify(data)),'forged grant must be rejected');assert.equal(live.export(),valid);}
{const data=JSON.parse(valid).data;assert.doesNotThrow(()=>live.import(JSON.stringify(data)),'untouched data imports');}
setChannel(undefined);
console.log('free-mode: ok');
