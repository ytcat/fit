// Prints the GOTR-0012 before/after table from before.json and after.json (written by measure.cjs).
// Usage: node qa/gotr-0012/table.cjs > qa/gotr-0012/before-after.txt
const path=require('path'),load=n=>require(path.join(__dirname,n)),before=load('before.json'),after=load('after.json');
const pad=(v,w)=>String(v??'-').padEnd(w),cell=r=>r?(r.contact?`${r.ext}% / ${r.elbow} deg`:r.move==='roll'?(r.defence?'ducked':'NOT ducked'):'NO CONTACT'):'-';
const lines=['GOTR-0012 mitt range: before (3672c18) vs after. Headless, 120 Hz, Synchronized rhythm, arena-local frame.','Each cell: arm extension / elbow angle of the striking arm at the pad-contact event (roll: defence credit).',''];
for(const species of ['lion','rabbit']){
 const b=before.species[species],a=after.species[species];
 lines.push(`== ${species} boxer ==`);
 lines.push(`root separation            ${b.geometry.rootSeparation} -> ${a.geometry.rootSeparation} m`);
 lines.push(`guard head-to-head (bones) ${b.geometry.headToHead} -> ${a.geometry.headToHead} m      closest during the sequence ${b.watchIntegrity.minHeadToHead} -> ${a.watchIntegrity.minHeadToHead} m`);
 lines.push(`guard knuckle to mitt face ${b.geometry.guardKnuckleToPad} -> ${a.geometry.guardKnuckleToPad} m`);
 lines.push(`root drift                 ${b.watchIntegrity.rootDrift} -> ${a.watchIntegrity.rootDrift} m      planted-sole slide per tick ${b.watchIntegrity.plantedFootSlide} -> ${a.watchIntegrity.plantedFootSlide} m (before: roll overlay reported its lifted step as planted)`);
 lines.push(`boot lift while stepping   before ${JSON.stringify(b.watchIntegrity.liftedFeet)}  after ${JSON.stringify(a.watchIntegrity.liftedFeet)}`);
 lines.push(`wrist/forearm alignment    ${b.watchIntegrity.minWristAlignment} -> ${a.watchIntegrity.minWristAlignment} (1 = glove and mitt axes collinear with the forearm)`,'');
 lines.push(pad('move',15)+pad('Watch before',20)+pad('Watch after',20)+pad('Manual before',20)+pad('Manual after',20)+pad('closing m/s b->a',18)+pad('hips fwd b->a',16)+pad('shoulder fwd b->a',19)+'coach arm ext b->a');
 const first=(list,move,n=0)=>list.filter(r=>r.move===move)[n];
 for(const [move,n] of [['jab',0],['cross',0],['hook',0],['rear_hook',0],['uppercut',0],['rear_uppercut',0],['roll',0],['roll',1]]){
  const wb=first(b.watch,move,n),wa=first(a.watch,move,n),mb=first(b.manual,move),ma=first(a.manual,move);
  lines.push(pad(move+(move==='roll'?' #'+(n+1):''),15)+pad(cell(wb),20)+pad(cell(wa),20)+pad(n?'':cell(mb),20)+pad(n?'':cell(ma),20)+pad(`${wb.speed??'-'} -> ${wa.speed??'-'}`,18)+pad(`${wb.hipTravel} -> ${wa.hipTravel}`,16)+pad(`${wb.shoulderTravel} -> ${wa.shoulderTravel}`,19)+`${wb.coachExt??'-'}% -> ${wa.coachExt??'-'}%`);
 }
 lines.push('',`manual mixed chain (${a.manualChain.order.join(', ')}):`,`  before landed ${b.manualChain.landed.length}/9 punches, ${b.manualChain.defences} roll; straights at ${b.manualChain.contacts.filter(c=>['jab','cross'].includes(c.move)).map(c=>c.elbow).join('/')} deg`,`  after  landed ${a.manualChain.landed.length}/9 punches, ${a.manualChain.defences} roll; straights at ${a.manualChain.contacts.filter(c=>['jab','cross'].includes(c.move)).map(c=>c.elbow).join('/')} deg`,'');
}
console.log(lines.join('\n'));
