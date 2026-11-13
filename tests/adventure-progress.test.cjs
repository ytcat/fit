// Adventure progression core (GOTR-0008 slice B, GOTR-0041/0042): stars, stats, Fighter Level, boss gate, save integrity.
const assert=require('node:assert/strict');
const A=require('../adventure-progress.js');
const D=require('../game-domain.js');
const {CareerStore}=require('../career-progress.js');
const fs=require('fs'),vm=require('vm');global.window=global;vm.runInThisContext(fs.readFileSync(require('path').join(__dirname,'..','boxing-fight.js'),'utf8'));
const memory=()=>({values:new Map(),getItem(k){return this.values.get(k)||null;},setItem(k,v){this.values.set(k,v);}});
const setChannel=c=>{if(c)globalThis.APP_VERSION={number:'t',date:'t',channel:c};else delete globalThis.APP_VERSION;};
const rec=(s,id,value)=>{const r=s.gameAction({type:'adventure',adventure:'mission',missionId:id,measured:value});assert.equal(r.ok,true,id+' '+r.error);return r;};
const forged=(s,mutate)=>{const copy=JSON.parse(s.export());mutate(copy.data.profiles[0].game.adventure);return copy;};

setChannel('live');
// Data: 24 missions (15 in chapter 1: 9 older + 6 "The Dream" beats, GOTR-0078), 5 chapters, trilingual titles, boss entry levels.
assert.equal(A.missions.length,24);assert.equal(A.chapters.length,5);
assert.deepEqual(A.bosses.map(b=>b.entry),[5,12,20,30,40]);assert.deepEqual(A.bosses.map(b=>b.id),['brick','king_hyena','iron_bull','onyx','blaze']);
assert.equal(A.missions.filter(m=>m.chapter===1).length,15);assert.equal(A.missions.filter(m=>m.chapter===2).length,9);
for(const m of A.missions){assert.ok(['training','help','funny','event'].includes(m.type),m.id);assert.ok(m.titles.en&&m.titles.he&&m.titles.ru,m.id);assert.ok(A.metrics[m.metric],m.id);assert.equal(m.thresholds.length,3);assert.equal(!!m.stat,m.type==='training',m.id);
 const lower=A.metrics[m.metric].lower;assert.ok(m.thresholds.every((t,i)=>i===0||(lower?t<m.thresholds[i-1]:t>m.thresholds[i-1])),m.id+' thresholds ordered');}

// Stars: thresholds, lower-is-better metrics, best result kept, replay.
assert.equal(A.starsFor('one_two_mitts',7),0);assert.equal(A.starsFor('one_two_mitts',8),1);assert.equal(A.starsFor('one_two_mitts',14),2);assert.equal(A.starsFor('one_two_mitts',99),3);
assert.equal(A.starsFor('clean_hands',5),0);assert.equal(A.starsFor('clean_hands',4),1);assert.equal(A.starsFor('clean_hands',0),3);
const s=new CareerStore(memory());s.create('Hero');let g=s.game();
assert.equal(A.level(g),0);assert.equal(A.stars(g),0);assert.deepEqual(A.statPoints(g),{power:1,speed:1,stamina:1});
let r=rec(s,'one_two_mitts',{cleanHits:10});assert.equal(r.stars,1);assert.equal(r.newStars,1);
r=rec(s,'one_two_mitts',{cleanHits:3});assert.equal(r.stars,0);assert.equal(r.best,1,'worse replay keeps best');assert.equal(r.improved,false);
r=rec(s,'one_two_mitts',20);assert.equal(r.best,3);assert.equal(r.improved,true);assert.equal(s.game().adventure.missions.one_two_mitts.plays,3);
assert.equal(s.game().adventure.missions.one_two_mitts.value,20);
assert.equal(s.gameAction({type:'adventure',adventure:'mission',missionId:'nope',measured:1}).ok,false);
assert.equal(s.gameAction({type:'adventure',adventure:'mission',missionId:'bag_power',measured:{cleanHits:9}}).ok,false,'needs the mission metric');
assert.equal(s.gameAction({type:'adventure',adventure:'mission',missionId:'bag_power',measured:-1}).ok,false);
assert.equal(s.gameAction({type:'adventure',adventure:'mission',missionId:'rope_rhythm',measured:Infinity}).ok,false);
// Stats come only from training missions: 3 stars on a speed mission = +1 Speed (2 stars give none).
g=s.game();assert.deepEqual(A.statPoints(g),{power:1,speed:2,stamina:1});assert.equal(A.level(g),Math.floor(3/3)+1);
rec(s,'roll_under_hook',7);assert.equal(A.statPoints(s.game()).speed,2,'2 stars give no stat point');
rec(s,'heavy_bag_van',0);assert.deepEqual(A.statPoints(s.game()),{power:1,speed:2,stamina:1},'funny missions give no stat');
assert.equal(A.chapterOpen(s.game(),2),false);assert.equal(s.gameAction({type:'adventure',adventure:'mission',missionId:'curb_footwork',measured:12}).ok,false,'chapter 2 closed in live build');
// Stats cap at 10.
{const cap={adventure:{version:1,missions:{},bosses:{}}};for(const m of A.missions)if(m.stat)cap.adventure.missions[m.id]={stars:3,value:m.thresholds[2],plays:1};
 assert.ok(Object.values(A.statPoints(cap)).every(v=>v<=10));cap.adventure.missions.fake={stars:3,value:1,plays:1};}

// Design example: 30 stars, Power 3, Speed 2, Stamina 2 -> Level 14.
setChannel('dev');
const d=new CareerStore(memory());d.create('Example');
const plan={bag_power:5,morning_sparring:15,one_two_mitts:20,first_stance:3,heavy_bag_van:0,teach_the_kid:3,snoring_guard:9,rooftop_balloons:12,whistle_chase:20,kids_skateboard:9};
for(const [id,v] of Object.entries(plan))rec(d,id,v);
let gd=d.game();assert.equal(A.stars(gd),30);
assert.deepEqual(A.statPoints(gd),{power:3,speed:2,stamina:2});assert.equal(A.level(gd),14,'30 stars/3 + (3+2+2-3) = 14');
// Boss gate / chance.
setChannel('live');
const bossCases=[['brick',5],['king_hyena',12],['iron_bull',20],['onyx',30],['blaze',40]];
assert.equal(A.canChallenge(gd,'king_hyena'),true);assert.equal(A.canChallenge(gd,'iron_bull'),false);assert.equal(A.canChallenge(gd,'brick'),true);
assert.equal(A.canChallenge(s.game(),'brick'),false,'level 3 < 5');
let prev=-1;for(let lv=0;lv<=60;lv++){const c=A.chanceVs(lv,12);assert.ok(c>=prev,'chance monotonic at '+lv);assert.ok(c>=5&&c<=85);prev=c;}
assert.equal(A.chanceVs(12,12),50);assert.equal(A.chanceVs(17,12),85);assert.equal(A.chanceVs(40,12),85,'edge capped at +5 levels');assert.ok(A.chanceVs(7,12)<50);
assert.equal(A.chance(gd,'king_hyena'),A.chanceVs(14,12));assert.ok(A.chance(gd,'king_hyena')>A.chance(gd,'iron_bull'));
assert.deepEqual(A.bossEdge(gd,'king_hyena'),{levels:2,reaction:1.06,damage:.94});assert.equal(A.bossEdge(gd,'iron_bull').levels,0);
// Boss records: live build needs the level and the earlier chapter; losing costs nothing.
const live=new CareerStore(memory());live.create('Live');
assert.equal(live.gameAction({type:'adventure',adventure:'boss',bossId:'brick',won:true}).ok,false);
for(const id of ['bag_power','morning_sparring','one_two_mitts','roll_under_hook','rope_rhythm','first_stance','heavy_bag_van','teach_the_kid','snoring_guard'])rec(live,id,A.missions.find(m=>m.id===id).thresholds[2]);
assert.equal(A.level(live.game()),9+6);assert.ok(A.canChallenge(live.game(),'brick'));const before=live.wallet();
assert.equal(live.gameAction({type:'adventure',adventure:'boss',bossId:'brick',won:false}).ok,true);assert.deepEqual(live.wallet(),before,'loss costs nothing');assert.equal(A.bossWon(live.game(),'brick'),false);
assert.equal(live.gameAction({type:'adventure',adventure:'boss',bossId:'brick',won:true}).nextChapterOpen,true);assert.equal(A.chapterOpen(live.game(),2),true);
assert.equal(live.gameAction({type:'adventure',adventure:'boss',bossId:'iron_bull',won:true}).ok,false,'level 20 needed');
rec(live,'curb_footwork',12);

// Stat edge multipliers: 1.0 with no adventure profile; +2% / +1.5% / +3% per point.
assert.deepEqual(A.fightEdge(null),{impact:1,speed:1,stamina:1});assert.deepEqual(A.fightEdge({}),{impact:1,speed:1,stamina:1});assert.deepEqual(A.fightEdge(new CareerStore(memory()).game()||{}),{impact:1,speed:1,stamina:1});
const e=A.fightEdge(gd);assert.ok(Math.abs(e.impact-1.04)<1e-9&&Math.abs(e.speed-1.015)<1e-9&&Math.abs(e.stamina-1.03)<1e-9);
// Fight hook: no edge = identical fighters; edge scales power/tempo/recovery of the career actor only.
{const base=new BoxingFight({seed:7,careerActor:'lion',careerStats:{power:50,speed:50,defence:50,footwork:50,stamina:50,accuracy:50}}),none=new BoxingFight({seed:7,careerActor:'lion',careerStats:{power:50,speed:50,defence:50,footwork:50,stamina:50,accuracy:50},adventureEdge:{impact:1,speed:1,stamina:1}}),edged=new BoxingFight({seed:7,careerActor:'lion',careerStats:{power:50,speed:50,defence:50,footwork:50,stamina:50,accuracy:50},adventureEdge:e});
 assert.equal(none.fighters.lion.power,base.fighters.lion.power);assert.ok(Math.abs(edged.fighters.lion.power/base.fighters.lion.power-1.04)<1e-9);assert.ok(Math.abs(edged.fighters.lion.tempo/base.fighters.lion.tempo-1.015)<1e-9);assert.ok(Math.abs(edged.fighters.lion.recovery/base.fighters.lion.recovery-1.03)<1e-9);assert.equal(edged.fighters.rabbit.power,base.fighters.rabbit.power);}

// Opponent level/score and GOTR-0042 comparison with a big-gap threshold.
for(const id of Object.keys(A.opponentBase)){const o=A.opponent(id);assert.ok(o.level>=1&&o.score>=20&&o.score<=99,id);}
assert.equal(A.opponent('nobody'),null);assert.ok(A.opponent('shadow').level<A.opponent('forge').level);assert.ok(A.opponent('ember',100).score>A.opponent('ember',0).score);
const cmp=A.compare(new CareerStore(memory()).game()||{adventure:A.fresh()},{power:40,speed:40,accuracy:40,footwork:40,defence:40,stamina:40},'forge');
assert.equal(cmp.fighter.level,0);assert.equal(cmp.fighter.score,40);assert.equal(cmp.big,true);assert.ok(cmp.chance<=25);
const easy=A.compare(gd,{power:60,speed:60},'shadow');assert.equal(easy.big,false);assert.ok(easy.chance>=50);assert.equal(A.rules.bigGapLevels,5);

// Save round-trip and old-save compatibility.
{const disk=memory(),a=new CareerStore(disk);a.create('Saver');rec(a,'bag_power',3);const raw=a.export();const b=new CareerStore(disk);assert.equal(A.stars(b.game()),2);assert.equal(b.game().adventure.missions.bag_power.value,3);
 const c=new CareerStore(memory());c.import(raw);assert.equal(c.data.profiles.length,1);assert.equal(A.level(c.data.profiles[0].game),A.level(a.game()));}
{const old=new CareerStore(memory());old.create('Old');const oldData=JSON.parse(old.export());delete oldData.data.profiles[0].game.adventure;
 const loaded=new CareerStore(memory());loaded.import(JSON.stringify(oldData.data));assert.equal(loaded.data.profiles.length,1);assert.deepEqual(loaded.game().adventure,A.fresh(),'old saves load and gain an empty adventure');assert.equal(A.level(loaded.game()),0);
 const g2=D.fresh({id:'x',name:'X',boxers:{lion:{xp:0},rabbit:{xp:0}}});assert.deepEqual(g2.adventure,A.fresh());}
// Forged values are rejected.
{const f=new CareerStore(memory());f.create('Forger');rec(f,'one_two_mitts',9);
 const rejects=(mutate,label)=>{const copy=forged(f,mutate);assert.throws(()=>new CareerStore(memory()).import(JSON.stringify(copy)),undefined,label);};
 rejects(a=>{a.missions.one_two_mitts.stars=3;},'forged stars');
 rejects(a=>{a.missions.one_two_mitts.value=1;},'value below the star threshold');
 rejects(a=>{a.missions.one_two_mitts.value=-5;},'negative value');
 rejects(a=>{a.missions.one_two_mitts.plays=0;},'zero plays');
 rejects(a=>{a.missions.mystery={stars:1,value:1,plays:1};},'unknown mission');
 rejects(a=>{a.stats={power:10,speed:10,stamina:10};},'stored stats are not accepted');
 rejects(a=>{a.level=99;},'stored level is not accepted');
 rejects(a=>{a.bosses.king_hyena={wins:1,losses:0,free:false};},'boss win without level');
 rejects(a=>{a.bosses.brick={wins:1,losses:0,free:false};},'boss win below entry level');
 rejects(a=>{a.bosses.brick={wins:0,losses:0,free:true};},'free flag without a win');
 rejects(a=>{a.version=2;},'bad version');}

// Development build: everything open; levels and stars still compute; free boss wins are flagged.
setChannel('dev');
{const f=new CareerStore(memory());f.create('Dev');assert.equal(A.canChallenge(f.game(),'blaze'),true);assert.equal(A.chapterOpen(f.game(),5),true);
 rec(f,'curb_footwork',12);assert.equal(A.stars(f.game()),3);assert.equal(A.level(f.game()),1+1);assert.equal(A.summary(f.game()).free,true);
 assert.equal(f.gameAction({type:'adventure',adventure:'boss',bossId:'blaze',won:true}).ok,true);assert.equal(f.game().adventure.bosses.blaze.free,true);
 assert.equal(new CareerStore(Object.assign(memory(),{})).locked,false);const copy=JSON.parse(f.export());const again=new CareerStore(memory());again.import(JSON.stringify(copy));assert.equal(again.game().adventure.bosses.blaze.wins,1);
 assert.equal(A.summary(f.game()).chapters.every(c=>c.open&&c.canChallenge),true);}
setChannel('live');
{const f=new CareerStore(memory());f.create('Live2');const sum=A.summary(f.game());assert.equal(sum.free,false);assert.deepEqual(sum.chapters.map(c=>c.open),[true,false,false,false,false]);assert.equal(sum.maxStars,72);}
setChannel(undefined);
console.log('adventure-progress tests passed');
