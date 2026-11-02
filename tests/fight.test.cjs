const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
global.THREE=require('../assets/vendor/three.min.js');global.window=global;
global.document={readyState:'loading',addEventListener(){},createElement:()=>({getContext:()=>new Proxy({},{get:()=>()=>{}})})};
for(const file of ['boxing-routines.js','boxing-coach.js','contact-response.js','fight-session.js','training-arena.js','fight-experience.js'])vm.runInThisContext(fs.readFileSync(file,'utf8'));

// Timing uses the requested exhibition format and scores are immutable after a round.
const match=new FightSession(33);match.frame(2.99);assert.equal(match.phase,'countdown');match.frame(3);assert.equal(match.phase,'round');
const attack=match.exchange.attacker,receiver=attack==='lion'?'rabbit':'lion';
const hit={actor:attack,receiver,kind:'head',closingSpeed:4,localSide:-1};
match.record(hit,3.4);match.record(hit,3.4);assert.equal(match.total[attack].head,1,'one scoring event per punch');
const reaction=match.reaction(receiver,3.46);assert.ok(reaction.headPitch<-.1&&reaction.headYaw<0,'head responds in the impact direction');
match.frame(183);assert.equal(match.phase,'rest');const original=JSON.stringify(match.cards);assert.equal(match.cards.length,3);assert.ok(match.cards.every(c=>c[0][attack]===10&&c[0][receiver]===9));
match.record({...hit,kind:'body'},184);assert.equal(JSON.stringify(match.cards),original,'rest cannot change the completed score');
match.frame(243);assert.equal(match.round,2);assert.equal(match.phase,'round');
match.record({...hit,kind:'glove'},243.4);assert.equal(match.stats[attack].quality,0,'blocked shots earn no points');
match.frame(663);assert.equal(match.phase,'decision');assert.ok(match.cards.every(c=>c.length===3));match.frame(671);assert.equal(match.phase,'ceremony');

// Equal performance is an honest draw; no random judge numbers or forced winner.
const equal=new FightSession(5,{rounds:1,roundSeconds:1});equal.frame(4);assert.equal(equal.winner,null);assert.equal(equal.decision,'draw');
const body=new FightSession(7);body.frame(3);body.record({actor:body.exchange.attacker,receiver:body.exchange.attacker==='lion'?'rabbit':'lion',kind:'body',closingSpeed:4},3.2);
const br=body.reaction(body.exchange.attacker==='lion'?'rabbit':'lion',3.28);assert.ok(br.pitch>0&&br.crouch>0&&br.headYaw===0,'body hit folds torso through the knees');

const data=JSON.parse(fs.readFileSync('assets/models/coach-surface.json'));
function run(seed,hz){
 const e={scene:new THREE.Scene(),camera:new THREE.PerspectiveCamera(38,.6,.1,100),coach:new LionCoach(data),animTime:0,technique:'fight',currentAnim:'one_two',randomSeed:seed,fightConfig:{rounds:3,roundSeconds:7,restSeconds:2},fitCameraToModel(){}};
 e.demoModel=e.coach.root;e.scene.add(e.demoModel);const arena=e.arena=new TrainingArena(e,data);arena.setTarget('rabbit');arena.fightVisual=new FightVisual(arena);
 let clean=0,blocks=0;
 for(let i=0;i<=39*hz;i++){
  const m=arena.update(i/hz,'fight','one_two');
  clean+=m.contacts.filter(h=>['head','body'].includes(h.kind)).length;blocks+=m.contacts.filter(h=>h.kind==='glove').length;
  if(m.fight.phase!=='round')assert.equal(m.contacts.length,0,'no punches score during rest or ceremony');
  for(const pose of [m.hero,m.partner]){assert.ok(pose.hands.flat().every(Number.isFinite));assert.ok(pose.handErrors.every(x=>x<.001));assert.ok(pose.footTargets.every(x=>x.error<.001));}
 }
 assert.equal(arena.fightSession.phase,'ceremony');assert.ok(arena.fightVisual.root.visible);assert.ok(clean>0&&blocks>0,'bout must contain real hits and guarded contacts');
 const before=JSON.stringify(arena.fightSession.total);const frozen=arena.update(39,'fight','one_two');assert.equal(frozen.contacts.length,0);assert.equal(JSON.stringify(arena.fightSession.total),before);
 const winner=arena.fightSession.winner;
 if(winner){const c=winner==='lion'?e.coach:arena.rabbit;assert.ok(c.point(c.joints.handL).y>1.9&&c.point(c.joints.handR).y>1.9,'winner raises both gloves');}
 return {winner,total:arena.fightSession.total,cards:arena.fightSession.cards};
}
const low=run(42,30),high=run(42,90);assert.deepEqual(low,high,'refresh rate cannot change contact scores or the winner');
const outcomes=new Set([low.winner]);for(const seed of [11,91,112])outcomes.add(run(seed,30).winner);
assert.ok(outcomes.has('lion')&&outcomes.has('rabbit'),'either fighter can win based on the simulated fight');
console.log('PASS bout clocks, real contact scoring, blocked-shot exclusion, body/head reactions, pause, independent judges, refresh-rate agreement, both possible winners and ceremony');
