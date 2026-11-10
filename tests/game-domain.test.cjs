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
{
 // GOTR-0004: combos can be bought with earned coins; activity unlocks stay available and never double-charge.
 const {s,disk}=setup();assert.deepEqual(D.combos.map(c=>c.price),[0,20,40,40,70,120]);
 const poor=s.gameAction({type:'combo-buy',comboId:'corner_turn'});assert.equal(poor.ok,false);assert.match(poor.error,/Not enough coins/);assert.deepEqual(s.game().combos.owned,[]);
 assert.equal(s.gameAction({type:'combo-buy',comboId:'made_up'}).ok,false);assert.equal(s.gameAction({type:'combo',comboId:'corner_turn',mode:'fight',enabled:true}).ok,false,'locked combos cannot be equipped');
 grant(s,'earn-a');assert.equal(s.wallet().coins,35);assert.match(s.gameAction({type:'combo-buy',comboId:'first_rhythm'}).error,/Already owned/);
 const bought=s.gameAction({type:'combo-buy',comboId:'corner_turn'});assert.equal(bought.ok,true);assert.equal(bought.transactionId,'purchase:combo:corner_turn');assert.equal(s.wallet().coins,15);assert.ok(s.game().combos.owned.includes('corner_turn'));assert.equal(s.game().activity.rope,0,'bought without meeting the activity requirement');
 const again=s.gameAction({type:'combo-buy',comboId:'corner_turn'});assert.equal(again.ok,false);assert.match(again.error,/Already owned/);assert.equal(s.wallet().coins,15,'no double charge');
 assert.equal(s.gameAction({type:'combo-buy',comboId:'rolling_return'}).ok,false);assert.equal(s.wallet().coins,15);
 assert.equal(s.gameAction({type:'combo',comboId:'corner_turn',mode:'fight',enabled:true,species:'lion'}).ok,true);assert.equal(s.gameAction({type:'combo',comboId:'corner_turn',mode:'training',enabled:true,species:'lion'}).ok,true);
 const reloaded=new CareerStore(disk);assert.ok(reloaded.game().combos.owned.includes('corner_turn'));assert.deepEqual(reloaded.game().combos.fight,['corner_turn']);assert.equal(reloaded.wallet().coins,15,'purchase and loadout survive reload');
 // Meeting the activity requirement later neither duplicates the combo nor refunds or re-charges it.
 grant(reloaded,'rope-1',{mode:'rope',jumps:40,hits:0,attempts:0});const second=grant(reloaded,'rope-2',{mode:'rope',jumps:40,hits:0,attempts:0});assert.ok(!second.unlocks.includes('corner_turn'));assert.equal(reloaded.game().combos.owned.filter(id=>id==='corner_turn').length,1);assert.equal(reloaded.game().ledger.filter(t=>t.comboId==='corner_turn').length,1);
 // Backups carry purchases; tampered purchases or unearned unlocks are rejected.
 const valid=reloaded.export(),target=setup().s;assert.equal(target.import(valid),1);assert.ok(target.game().combos.owned.includes('corner_turn'));
 const forged=JSON.parse(valid).data;forged.profiles[0].game.combos.owned.push('school_signature');assert.throws(()=>reloaded.import(JSON.stringify(forged)),/Invalid combo unlock/);
 const cheap=JSON.parse(valid).data;cheap.profiles[0].game.ledger.find(t=>t.comboId==='corner_turn').coins=-1;assert.throws(()=>reloaded.import(JSON.stringify(cheap)));
 const orphan=JSON.parse(valid).data;orphan.profiles[0].game.combos.owned=orphan.profiles[0].game.combos.owned.filter(id=>id!=='corner_turn');orphan.profiles[0].game.combos.fight=[];orphan.profiles[0].game.combos.training=[];assert.throws(()=>reloaded.import(JSON.stringify(orphan)),/Invalid combo purchase/);assert.equal(reloaded.export(),valid);
 // A failed save leaves coins and ownership untouched.
 grant(reloaded,'earn-b');grant(reloaded,'earn-c');const before=reloaded.export();disk.fail=true;assert.equal(reloaded.gameAction({type:'combo-buy',comboId:'counter_chain'}).ok,false);assert.equal(reloaded.export(),before);disk.fail=false;assert.equal(reloaded.gameAction({type:'combo-buy',comboId:'counter_chain'}).ok,true);
}
{
 // GOTR-0007: passing a Fight Academy lesson pays 15 coins once and unlocks that combo. No XP, no combat stats.
 const L=require('../academy-lesson.js'),clone=v=>JSON.parse(JSON.stringify(v));
 const proof=(id,gap=400)=>{const c=D.combos.find(c=>c.id===id),v=L.create(c.sequence);let t=0,ev;for(let run=0;run<3;run++)for(const m of c.sequence)ev=v.input(m,t+=gap);assert.equal(ev.type,'pass');return ev.evidence;};
 const pass=(s,id,evidence=proof(id))=>s.gameAction({type:'lesson',comboId:id,evidence});
 const {s,disk}=setup();assert.deepEqual(D.lesson,{coins:15,repetitions:3,windowMs:2000,rule:'academy-lesson-v1'});assert.equal(D.lessonPassed(s.game(),'first_rhythm'),false);
 const points=clone(s.current().boxers.lion.points),ratings=s.ratings('lion'),first=pass(s,'first_rhythm');
 assert.equal(first.ok,true);assert.equal(first.first,true);assert.equal(first.unlocked,true);assert.equal(first.coins,15);assert.equal(first.transactionId,'lesson:first_rhythm');assert.deepEqual(first.equipped,['training','fight']);assert.deepEqual(first.loadout,{training:true,fight:true});
 assert.deepEqual(s.game().combos,{owned:['first_rhythm'],training:['first_rhythm'],fight:['first_rhythm']});assert.equal(s.wallet().coins,15);assert.equal(s.wallet().xp,0);assert.equal(D.lessonPassed(s.game(),'first_rhythm'),true);
 assert.deepEqual(s.game().ledger.at(-1),{id:'lesson:first_rhythm',type:'earn',coins:15,xp:0,rule:'academy-lesson-v1',lessonId:'first_rhythm',evidence:proof('first_rhythm')});
 assert.deepEqual(s.current().boxers.lion.points,points,'a lesson never changes combat attributes');assert.deepEqual(s.ratings('lion'),ratings);assert.equal(s.current().boxers.lion.xp+s.current().boxers.rabbit.xp,0);assert.equal(s.game().activity.completed,0);assert.deepEqual(s.game().history,[]);
 // Practising again pays nothing and changes nothing, even with a different valid proof.
 const rows=s.game().ledger.length,again=pass(s,'first_rhythm',proof('first_rhythm',900));assert.equal(again.ok,true);assert.equal(again.first,false);assert.equal(again.unlocked,false);assert.equal(again.coins,0);assert.deepEqual(again.equipped,[]);assert.equal(again.transactionId,undefined);assert.equal(s.wallet().coins,15);assert.equal(s.game().ledger.length,rows);
 // A removed loadout choice is respected when practising again.
 assert.equal(s.gameAction({type:'combo',comboId:'first_rhythm',mode:'fight',enabled:false}).ok,true);assert.deepEqual(pass(s,'first_rhythm').loadout,{training:true,fight:false});assert.deepEqual(s.game().combos.fight,[]);
 // Evidence must be three exact, in-tempo run-throughs of this combo.
 const before=s.export(),good=proof('corner_turn'),edit=change=>{const e=clone(good);change(e);return e;};
 for(const bad of [null,{},[],'jab,cross,hook',edit(e=>e.version=2),edit(e=>e.reps.pop()),edit(e=>e.reps.push(clone(e.reps[0]))),edit(e=>e.reps[1].moves[2]='cross'),edit(e=>e.reps[0].moves.pop()),edit(e=>{e.reps[0].moves.push('hook');e.reps[0].ms.push(900);}),edit(e=>e.reps[2].ms[1]=2001),edit(e=>e.reps[2].ms[2]=100),edit(e=>e.reps[0].ms[0]=5),edit(e=>e.reps[0].ms[1]=1.5),edit(e=>e.reps[0].ms[1]=-1),edit(e=>e.reps[0].ms='0,400,800'),edit(e=>e.reps[0].note='trust me'),edit(e=>e.score=100),proof('first_rhythm')]){const r=pass(s,'corner_turn',bad);assert.equal(r.ok,false,JSON.stringify(bad));assert.match(r.error,/lesson evidence/i);}
 assert.equal(pass(s,'made_up',good).ok,false);assert.equal(s.gameAction({type:'lesson'}).ok,false);assert.match(s.gameAction({type:'lesson',comboId:'corner_turn'}).error,/lesson evidence/i,'a lesson cannot be claimed without proof');assert.equal(s.export(),before,'rejected lessons change nothing');assert.equal(D.lessonPassed(s.game(),'corner_turn'),false);
 assert.equal(pass(s,'corner_turn',edit(e=>e.reps[0].ms=[0,2000,4000])).ok,true,'gaps exactly at the tempo window are accepted');
 // A failed save grants neither coins nor the combo.
 const safe=s.export();disk.fail=true;const failed=pass(s,'counter_chain');assert.equal(failed.ok,false);assert.equal(s.export(),safe);assert.equal(s.game().combos.owned.includes('counter_chain'),false);disk.fail=false;
 // Reload and backup keep the lesson, the coins and the combo.
 const reloaded=new CareerStore(disk);assert.deepEqual(reloaded.game().combos.owned,['first_rhythm','corner_turn']);assert.equal(reloaded.wallet().coins,30);assert.equal(D.lessonPassed(reloaded.game(),'corner_turn'),true);assert.equal(pass(reloaded,'corner_turn').coins,0,'a reload does not pay again');
 const valid=reloaded.export(),target=setup().s;assert.equal(target.import(valid),1);assert.deepEqual(target.game().combos.owned,['first_rhythm','corner_turn']);assert.equal(target.wallet().coins,30);assert.equal(pass(target,'first_rhythm').coins,0,'an imported backup does not pay again');
 // Forged or malformed lesson rows are rejected on import; the current save is untouched.
 const forge=change=>{const data=JSON.parse(valid).data,g=data.profiles[0].game;change(g,g.ledger.find(t=>t.id==='lesson:corner_turn'));return JSON.stringify(data);};
 assert.throws(()=>reloaded.import(forge(g=>g.combos.owned.push('school_signature'))),/Invalid combo unlock/);
 assert.throws(()=>reloaded.import(forge((g,row)=>{row.coins=999;})),/Invalid lesson reward/);
 assert.throws(()=>reloaded.import(forge((g,row)=>{row.type='baseline';row.coins=0;})),/Invalid lesson reward/);
 assert.throws(()=>reloaded.import(forge((g,row)=>{row.rule='activity-v1';})),/Invalid lesson reward/);
 assert.throws(()=>reloaded.import(forge((g,row)=>{row.lessonId='first_rhythm';})),/Invalid lesson reward/);
 assert.throws(()=>reloaded.import(forge((g,row)=>{row.id='lesson:school_signature';row.lessonId='school_signature';})),/Invalid lesson reward/,'a lesson row cannot stand in for a combo that is not owned');
 assert.throws(()=>reloaded.import(forge((g,row)=>{row.bonus=1;})),/Invalid lesson reward/);
 assert.throws(()=>reloaded.import(forge((g,row)=>{delete row.evidence;})),/lesson evidence/i);
 assert.throws(()=>reloaded.import(forge((g,row)=>{row.evidence.reps.pop();})),/lesson evidence/i);
 assert.throws(()=>reloaded.import(forge((g,row)=>{row.evidence.reps[0].moves=['jab','cross'];row.evidence.reps[0].ms=[0,400];})),/Lesson evidence/);
 assert.throws(()=>reloaded.import(forge(g=>g.ledger.push({id:'reward:fake',type:'earn',coins:15,xp:0,rule:'academy-lesson-v1'}))),/Invalid lesson reward/);
 assert.throws(()=>reloaded.import(forge(g=>g.ledger.push({id:'lesson:thunder_arc',type:'earn',coins:500,xp:0,rule:'gift'}))),/Invalid lesson reward/);
 assert.throws(()=>reloaded.import(forge((g,row)=>g.ledger.push(clone(row)))),/Invalid ledger/,'a lesson cannot be paid twice');
 assert.throws(()=>reloaded.import(forge((g,row)=>{g.combos.owned=['first_rhythm'];g.combos.training=['first_rhythm'];g.combos.fight=[];})),/Invalid lesson reward/,'a paid lesson always carries its combo');
 assert.throws(()=>reloaded.import(forge((g,row)=>{row.xp=40;})));assert.equal(reloaded.export(),valid);
 // Shop and activity routes still work next to lessons and never double-pay or double-own.
 assert.match(reloaded.gameAction({type:'combo-buy',comboId:'corner_turn'}).error,/Already owned/);assert.equal(reloaded.wallet().coins,30);
 assert.equal(reloaded.gameAction({type:'combo-buy',comboId:'corner_turn'}).ok,false);grant(reloaded,'lesson-era-activity');assert.equal(reloaded.wallet().coins,65);
 const bought=reloaded.gameAction({type:'combo-buy',comboId:'counter_chain'});assert.equal(bought.ok,true);assert.equal(reloaded.wallet().coins,25);
 const late=pass(reloaded,'counter_chain');assert.equal(late.ok,true);assert.equal(late.first,true);assert.equal(late.unlocked,false,'already bought: the lesson still pays once but unlocks nothing new');assert.equal(late.coins,15);assert.equal(reloaded.wallet().coins,40);assert.equal(reloaded.game().combos.owned.filter(id=>id==='counter_chain').length,1);
 for(let i=0;i<3;i++)grant(reloaded,'lesson-era-fight-'+i,{mode:'fight',result:'win'});assert.ok(reloaded.game().combos.owned.includes('thunder_arc'),'activity unlock still works');
 // Loadouts: free slots are filled, full loadouts are left alone and reported.
 assert.deepEqual(reloaded.game().combos.fight,['corner_turn','counter_chain']);assert.equal(reloaded.gameAction({type:'combo',comboId:'first_rhythm',mode:'fight',enabled:true}).ok,true);
 const full=pass(reloaded,'thunder_arc');assert.equal(full.unlocked,false);assert.deepEqual(full.equipped,['training']);assert.deepEqual(full.loadout,{training:true,fight:false});assert.equal(reloaded.game().combos.fight.length,3);
 assert.deepEqual(pass(reloaded,'rolling_return').equipped,['training']);const last=pass(reloaded,'school_signature');assert.equal(last.unlocked,true);assert.deepEqual(last.equipped,[]);assert.deepEqual(last.loadout,{training:false,fight:false});assert.equal(reloaded.game().combos.training.length,5);
 assert.deepEqual(new Set(reloaded.game().combos.owned),new Set(D.combos.map(c=>c.id)));assert.equal(reloaded.game().ledger.filter(t=>t.rule==='academy-lesson-v1').length,6);assert.equal(reloaded.game().ledger.filter(t=>t.rule==='academy-lesson-v1').reduce((n,t)=>n+t.coins,0),90,'six lessons pay ninety coins in total, once');
 assert.equal(new CareerStore(disk).wallet().coins,reloaded.wallet().coins);
 // Saves written before lessons existed load unchanged.
 const old=setup();grant(old.s,'pre-lesson');old.s.gameAction({type:'combo-buy',comboId:'corner_turn'});const oldRaw=old.s.export(),oldStore=new CareerStore(old.disk);assert.equal(oldStore.export(),oldRaw);assert.deepEqual(oldStore.game().combos.owned,['first_rhythm','corner_turn']);assert.equal(D.lessonPassed(oldStore.game(),'first_rhythm'),false);assert.equal(pass(oldStore,'first_rhythm').coins,15,'an activity-earned combo can still collect its lesson reward once');
}
console.log('PASS R1 catalog, ledger, migration, idempotence beyond 200, purchase/equip, profile isolation, watch guardrails, four unlock routes, loadout slots, atomic failure, backup recovery, import validation, bounded local evidence history and Academy lesson rewards (pay once, unlock, reload/backup, forged rows rejected)');
