const assert=require('node:assert/strict');
const {CareerStore}=require('../career-progress.js');
const D=require('../game-domain.js');
const memory=()=>({values:new Map(),fail:false,getItem(k){return this.values.get(k)||null;},setItem(k,v){if(this.fail)throw Error('quota');this.values.set(k,v);}});
function setup(){const disk=memory(),s=new CareerStore(disk);s.create('School Owner');return {s,disk};}
function event(s,id,more={}){return {id,profileId:s.current().id,species:'lion',mode:'heavy',seconds:60,hits:30,attempts:40,...more};}
function grant(s,id,more){const result=s.award(event(s,id,more));assert.ok(result,'valid activity '+id);return result;}
{
 const {s,disk}=setup();assert.equal(s.wallet().coins,0);assert.equal(D.catalog.filter(c=>c.price>0).length,12);assert.equal(s.game().inventory.length,4);
 const a=grant(s,'first');assert.equal(a.coins,35);assert.deepEqual(a.unlocks,['first_rhythm']);assert.deepEqual(s.game().combos.training,[]);assert.deepEqual(s.game().combos.fight,[]);assert.equal(s.wallet().xp,s.current().boxers.lion.xp);
 assert.equal(s.award(event(s,'first')),null);
 assert.equal(s.gameAction({type:'buy',itemId:'gloves_midnight'}).ok,true);assert.equal(s.wallet().coins,10);assert.equal(s.game().equipment.gloves,'gloves_default','purchase does not force equip');
 assert.equal(s.gameAction({type:'buy',itemId:'gloves_midnight'}).ok,false);assert.equal(s.wallet().coins,10);
 assert.equal(s.gameAction({type:'buy',itemId:'boots_sunrise'}).ok,false);assert.equal(s.wallet().coins,10);
 assert.equal(s.gameAction({type:'equip',slot:'boots',itemId:'gloves_midnight'}).ok,false);
 assert.equal(s.gameAction({type:'equip',slot:'gloves',itemId:'gloves_midnight'}).ok,true);
 assert.equal(s.gameAction({type:'combo',comboId:'first_rhythm',mode:'fight',enabled:true,species:'wolf'}).ok,false);
 assert.equal(s.gameAction({type:'combo',comboId:'first_rhythm',mode:'training',enabled:true,species:'rabbit'}).ok,true);
 assert.equal(s.gameAction({type:'school',name:'North Star',crest:'star',philosophy:'precision'}).ok,true);
 const r=new CareerStore(disk);assert.equal(r.game().equipment.gloves,'gloves_midnight');assert.equal(r.game().school.name,'North Star');assert.equal(r.wallet().coins,10);assert.equal(r.award(event(r,'first')),null);
 const oldId=r.current().id;r.create('Second');assert.equal(r.wallet().coins,0);const reward=r.award({...event(r,'isolated'),profileId:oldId});assert.ok(reward);assert.equal(r.wallet().coins,0);r.select(oldId);assert.equal(r.wallet().coins,45);
}
{
 const {s,disk}=setup();const snapshot=s.export();disk.fail=true;assert.equal(s.award(event(s,'failed')),null);assert.equal(s.export(),snapshot);assert.equal(s.wallet().coins,0);
 disk.fail=false;grant(s,'purchase-fail');const before=s.export(),raw=disk.getItem(s.key);disk.fail=true;assert.equal(s.gameAction({type:'buy',itemId:'gloves_midnight'}).ok,false);assert.equal(s.export(),before);assert.equal(disk.getItem(s.key),raw);disk.fail=false;const normalSet=disk.setItem.bind(disk);disk.setItem=(key,value)=>{if(key===s.key)throw Error('primary commit failed');normalSet(key,value);};assert.equal(s.gameAction({type:'buy',itemId:'gloves_midnight'}).ok,false);assert.equal(s.export(),before,'backup success plus primary failure rolls back memory');assert.equal(disk.getItem(s.key),raw);disk.setItem=normalSet;assert.equal(s.gameAction({type:'buy',itemId:'gloves_midnight'}).ok,true);
 const valid=s.export(),envelope=JSON.parse(valid);envelope.data.profiles[0].game.ledger[0].coins=999;assert.throws(()=>s.import(JSON.stringify(envelope)),/checksum/);assert.equal(s.export(),valid);
 assert.throws(()=>s.import(JSON.stringify({version:2,profiles:[]})));const corrupt=JSON.parse(valid).data;corrupt.profiles[0].game.combos.fight=['made_up'];assert.throws(()=>s.import(JSON.stringify(corrupt)));assert.equal(s.export(),valid);
 const future=JSON.parse(valid).data;future.profiles[0].game.version=2;assert.throws(()=>s.import(JSON.stringify(future)));
 disk.values.set(s.key,'{broken');const recovered=new CareerStore(disk);assert.ok(recovered.current());assert.match(recovered.error,/Recovered/);assert.equal(recovered.wallet().coins,35,'recovery restores previous complete transaction');
 const badDisk=memory();badDisk.values.set(s.key,'{broken');const broken=new CareerStore(badDisk);assert.throws(()=>broken.create('Temporary'));assert.equal(badDisk.getItem(s.key),'{broken','corrupt original never overwritten');
 const futureDisk=memory();const futureRaw=JSON.stringify({version:2,active:null,profiles:[]});futureDisk.values.set(s.key,futureRaw);futureDisk.values.set(s.backupKey,valid);const futureStore=new CareerStore(futureDisk);assert.throws(()=>futureStore.create('Temporary'));assert.equal(futureDisk.getItem(s.key),futureRaw,'future primary is never replaced with older backup');
 const target=setup().s;assert.equal(target.import(valid),1);assert.equal(target.wallet().coins,10);assert.equal(target.game().inventory.includes('gloves_midnight'),true);
}
{
 const {s}=setup();const watch=grant(s,'watch',{mode:'fight',result:'win',control:'watch',attempts:40,hits:30,defences:20});assert.equal(watch.coins,0);assert.ok(watch.xp<=10);assert.equal(s.game().activity.completed,0);assert.deepEqual(s.game().combos.owned,[]);assert.equal(s.current().boxers.lion.wins,0);
 grant(s,'rope-a',{mode:'rope',jumps:40,hits:0,attempts:0});grant(s,'rope-b',{mode:'rope',jumps:40,hits:0,attempts:0});assert.ok(s.game().combos.owned.includes('corner_turn'));
 grant(s,'defence',{mode:'pads',defences:12});assert.ok(s.game().combos.owned.includes('counter_chain'));
 for(let i=0;i<3;i++)grant(s,'fight-'+i,{mode:'fight',result:i?'loss':'win'});assert.deepEqual(new Set(s.game().combos.owned),new Set(D.combos.slice(0,4).map(c=>c.id)));
 for(const c of D.combos.slice(0,3))assert.equal(s.gameAction({type:'combo',comboId:c.id,mode:'fight',enabled:true}).ok,true);
 assert.equal(s.gameAction({type:'combo',comboId:'thunder_arc',mode:'fight',enabled:true}).ok,false);
 for(const c of D.combos.slice(0,4))assert.equal(s.gameAction({type:'combo',comboId:c.id,mode:'training',enabled:true}).ok,true);
 assert.equal(s.award(event(s,'fake',{hits:-1})),null);assert.equal(s.award(event(s,'fake',{hits:40,attempts:2})),null);assert.equal(s.award(event(s,'fake',{mode:'fight',result:'cancelled'})),null);
 for(let i=0;i<205;i++)grant(s,'long-'+i);assert.equal(s.current().boxers.lion.awards.includes('rope-a'),false);assert.equal(s.award(event(s,'rope-a',{mode:'rope',jumps:40,hits:0,attempts:0})),null,'idempotence outlives 200 award window');
}
{
 const {s,disk}=setup();grant(s,'legacy');const legacy=JSON.parse(s.export()).data;delete legacy.profiles[0].game;const original=JSON.stringify(legacy);disk.values.set(s.key,original);const migrated=new CareerStore(disk);assert.equal(migrated.wallet().coins,0);assert.equal(migrated.wallet().xp,legacy.profiles[0].boxers.lion.xp);assert.equal(disk.getItem(s.legacyKey),original);assert.equal(migrated.award(event(migrated,'legacy')),null);const again=new CareerStore(disk);assert.equal(again.game().ledger.length,migrated.game().ledger.length);assert.equal(again.wallet().xp,migrated.wallet().xp);
}
{
 const {s,disk}=setup();
 const evidence={seed:4294967295,rounds:1,method:'health',decision:'health',playerName:'School Owner',opponentName:'Shadow',stats:{lion:{landed:30,thrown:40},rabbit:{landed:15,thrown:30}},cardTotals:[[10,9],[10,9],[10,9]],moveCounts:{jab:20,cross:15,hook:5,rear_hook:0,uppercut:0,rear_uppercut:0}};
 const a=grant(s,'recorded-fight',{mode:'fight',control:'play',result:'win',defences:8,jumps:0,evidence});
 assert.equal(a.record.transactionId,a.transactionId);assert.equal(a.record.attempts,40);assert.equal(a.record.result,'win');assert.deepEqual(a.record.evidence,evidence);
 evidence.stats.lion.landed=0;assert.equal(s.game().history[0].evidence.stats.lion.landed,30,'record owns sanitized copy');
 const playerId=s.current().id,reloaded=new CareerStore(disk);assert.deepEqual(reloaded.game().history,s.game().history);assert.equal(reloaded.award(event(reloaded,'recorded-fight',{mode:'fight',result:'win'})),null);assert.equal(reloaded.game().history.length,1);
 reloaded.create('Other School');assert.deepEqual(reloaded.game().history,[]);reloaded.select(playerId);
 const before=reloaded.export();for(const bad of [{unknown:1},{stats:{lion:{landed:1,thrown:2,magic:4},rabbit:{landed:1,thrown:2}}},{moveCounts:{jab:-1}},{opponentName:'<script>run()</script>'},{cardTotals:[[10,9]]},{seed:-1}])assert.equal(reloaded.award(event(reloaded,'bad-evidence',{evidence:bad})),null);assert.equal(reloaded.export(),before,'invalid optional evidence rolls back the entire reward');
 const badImport=JSON.parse(before).data;badImport.profiles[0].game.history[0].evidence.stats.rabbit.landed=-1;assert.throws(()=>reloaded.import(JSON.stringify(badImport)));assert.equal(reloaded.export(),before);
 const mismatch=JSON.parse(before).data;mismatch.profiles[0].game.history[0].coins++;assert.throws(()=>reloaded.import(JSON.stringify(mismatch)),/ledger/);
 for(let i=0;i<52;i++)grant(reloaded,'recent-'+i);assert.equal(reloaded.game().history.length,50);assert.equal(reloaded.game().history[0].id,'recent-2');assert.equal(reloaded.game().history.at(-1).id,'recent-51');
 const old=JSON.parse(reloaded.export()).data;delete old.profiles[0].game.history;const target=setup().s;assert.equal(target.import(JSON.stringify(old)),2);target.select(target.data.profiles.find(p=>p.name.startsWith('School Owner')).id);assert.deepEqual(target.game().history,[],'older schema 1 imports get an empty local history');
 assert.equal(reloaded.gameAction({type:'school',name:'North\u0000\u202e Star',crest:'star',philosophy:'balance'}).ok,true);assert.equal(reloaded.game().school.name,'North Star');
 assert.notEqual(D.catalog.find(c=>c.id==='shorts_default').color,D.catalog.find(c=>c.id==='gloves_default').color);assert.equal(D.catalog.find(c=>c.id==='belt_default').color,0xd8ad4a);
}
{
 const {s,disk}=setup(),initial=s.current().id;s.create('Other');const selected=s.current().id;const before=s.export(),stored=disk.getItem(s.key);disk.fail=true;assert.throws(()=>s.create('Ghost'));assert.equal(s.export(),before);assert.equal(s.select(initial),false);assert.equal(s.current().id,selected);assert.equal(disk.getItem(s.key),stored);disk.fail=false;assert.equal(s.select(initial),true);const p=s.create('North\u0000\u202e Star');assert.equal(p.name,'North Star');assert.equal(s.game().school.name,'North Star School');assert.equal(new CareerStore(disk).current().name,'North Star');assert.throws(()=>s.create('\u0000\u202e'));assert.throws(()=>s.create('North Star'));
}
console.log('PASS R1 catalog, ledger, migration, idempotence beyond 200, purchase/equip, profile isolation, watch guardrails, four unlock routes, loadout slots, atomic failure, backup recovery, import validation and bounded local evidence history');
