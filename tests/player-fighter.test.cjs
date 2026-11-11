// GOTR-0031 R1: the player's fighter (Lion or Rabbit) is saved per player; old saves keep working; the player's place is shown as their Gym.
const assert=require('node:assert/strict');
const {CareerStore}=require('../career-progress.js'),World=require('../game-world.js'),Domain=require('../game-domain.js');
const disk=()=>{const values=new Map();return {getItem:k=>values.has(k)?values.get(k):null,setItem:(k,v)=>values.set(k,v),values};};

// New players keep the fighter chosen on the first screen; a guest does too.
{const d=disk(),s=new CareerStore(d);const maya=s.create('Maya',false,'rabbit');assert.equal(maya.species,'rabbit');assert.equal(s.species(),'rabbit');
 const reloaded=new CareerStore(d);assert.equal(reloaded.species(),'rabbit','the choice survives a reload');
 const guest=reloaded.guest('lion');assert.equal(guest.name,'Guest');assert.equal(reloaded.species(),'lion');
 assert.equal(reloaded.setSpecies('rabbit'),true);assert.equal(new CareerStore(d).species(),'rabbit','changing the fighter is saved');
 assert.equal(reloaded.setSpecies('tiger'),false,'only lion or rabbit');assert.equal(reloaded.species(),'rabbit');
 assert.equal(reloaded.guest().species,'rabbit','returning to the guest without a choice keeps its fighter');}

// Older profiles have no saved fighter: the one trained with most, Lion on a tie. Nothing is rewritten just by reading.
{const d=disk(),s=new CareerStore(d);s.create('Old');const raw=JSON.parse(d.getItem('ringfighter-career-v1'));const p=raw.data.profiles[0];delete p.species;
 assert.equal(new CareerStore({getItem:()=>JSON.stringify(raw.data),setItem(){}}).species(),'lion','no sessions: Lion');
 p.boxers.rabbit.sessions=3;p.boxers.lion.sessions=1;const legacy=new CareerStore({getItem:()=>JSON.stringify(raw.data),setItem(){}});assert.equal(legacy.species(),'rabbit','most sessions: Rabbit');assert.equal(legacy.current().species,undefined);
 p.boxers.rabbit.sessions=2;p.boxers.lion.sessions=2;assert.equal(new CareerStore({getItem:()=>JSON.stringify(raw.data),setItem(){}}).species(),'lion','a tie: Lion');}

// Backups carry the fighter; a tampered value is rejected and an older backup without it imports.
{const a=new CareerStore(disk());a.create('Ana',false,'rabbit');const backup=a.export();const b=new CareerStore(disk());assert.equal(b.import(backup),1);assert.equal(b.species(),'rabbit');
 const bad=JSON.parse(backup);bad.data.profiles[0].species='tiger';delete bad.checksum;assert.throws(()=>new CareerStore(disk()).import(JSON.stringify(bad.data)),/Invalid player/);
 const old=JSON.parse(backup);delete old.data.profiles[0].species;assert.equal(new CareerStore(disk()).import(JSON.stringify(old.data)),1);}

// The automatic "<player> School" is shown as the player's Gym in their language; a name the player typed stays as typed.
{global.GameDomain=Domain;const p={name:'Maya'},g={school:{name:Domain.cleanName('Maya School')}};
 assert.equal(World.gymName(g,'Maya','en'),"Maya's Gym");assert.equal(World.gymName(g,'Maya','he'),'האולם של Maya');assert.equal(World.gymName(g,'Maya','ru'),'Зал «Maya»');
 assert.equal(World.gymName({school:{name:'Iron Paws'}},'Maya','en'),'Iron Paws');assert.equal(World.gymName(g,'','en'),'Maya School');delete global.GameDomain;void p;}

// Rival species: the engine pairs a lion with a rabbit, so a player keeps their fighter and faces rivals of the other species.
{const bySpecies=s=>World.rivals.filter(r=>r.species!==s).map(r=>r.id);assert.deepEqual(bySpecies('lion'),['shadow','circuit']);assert.deepEqual(bySpecies('rabbit'),['ember']);
 for(const r of World.rivals)for(const lang of ['en','he','ru'])assert.ok(!/adaptive|fictional|simulated|מאמן|тренер/i.test(r.description[lang]),'no developer notes or coach wording on rival cards: '+r.id+' '+lang);}
console.log('PASS player fighter: first-screen choice saved per player, old saves default to the most-used fighter, backups validated, Gym name localised, rivals faced across species');
