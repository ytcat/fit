/* GOTR-0032: fight uppercuts — peak glove speed before contact vs. speed on the last frame, part hit, timing.
   Usage (repo root): node qa/gotr-0032/fight-uppercut.cjs [seeds] */
const path=require('path');const {bout}=require(path.join(__dirname,'..','gotr-0024','measure.cjs'));
for(const seed of (process.argv[2]||'3,11,42').split(',').map(Number)){const b=bout({seed,mode:'watch'});
 for(const r of b.records)if(r.move.includes('uppercut')&&r.landed)console.log(seed,r.actor,r.move,'peak',r.peak.toFixed(2),'approach',r.approach.toFixed(2),'part',r.part,'toContact',r.toContact.toFixed(3),'duration',r.duration.toFixed(2));}
