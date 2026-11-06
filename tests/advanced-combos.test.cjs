// Long phrases must be replayable, plant exits and preserve authored directions.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
global.window=global;vm.runInThisContext(fs.readFileSync('boxing-routines.js','utf8'));
const R=BOXING_ROUTINES,advanced=R.list.filter(r=>r.advanced);assert.equal(advanced.length,12);
for(const r of advanced){
 assert.equal(r.names.length,3);assert.ok(r.moves.length>=8&&r.moves.includes('step'));
 const ds=R.timings[r.id];assert.equal(ds.length,r.moves.length);assert.ok(Math.max(...ds)>Math.min(...ds)*1.5,'mixed rhythm needs a perceptible tempo change');
 let at=0;
 for(let i=0;i<ds.length;i++){
  const f=R.frame(at+ds[i]*.5,'combo',r.id);assert.equal(f.slot,i);assert.equal(f.move,r.moves[i]);
  if(f.move==='step'){const end=R.frame(at+ds[i]*(1-1e-6),'combo',r.id);assert.ok(end.phase>.999,'exit cannot be cut off before the trailing foot plants');assert.ok([-1,1].includes(f.stepDirection));}
  at+=ds[i];
 }
 assert.equal(R.frame(at+.00001,'combo',r.id).slot,0);
 const a=new R.PracticeTimeline(86),b=new R.PracticeTimeline(86);
 for(let t=0;t<30;t+=.31)assert.deepEqual(a.frame(t,'combo',r.id),b.frame(t,'combo',r.id));
 const sync=R.frame(ds[0]*.5,'combo',r.id),variable=a.frame(a.events[0].duration*.5,'combo',r.id);assert.equal(variable.stepDirection,sync.stepDirection);assert.equal(variable.defenceSide,sync.defenceSide);
}
assert.equal(R.speedDrills.length,14);
for(const r of R.speedDrills.filter(r=>r.id.startsWith('super_'))){const actions=new Set();for(let t=0;t<8;t+=.013){const f=R.speedFrame(t,r.id);actions.add(f.defenceMove||f.side);assert.ok(f.phase>=0&&f.phase<1);}assert.ok(actions.has('L')&&actions.has('R'));assert.ok([...actions].some(x=>['guard','roll','slip'].includes(x)));}
global.THREE=require('../assets/vendor/three.min.js');global.document={createElement:()=>({getContext:()=>new Proxy({},{get:(_,k)=>k==='createImageData'?((w,h)=>({data:new Uint8ClampedArray(w*h*4)})):()=>{}})})};
vm.runInThisContext(fs.readFileSync('boxing-coach-v2.js','utf8'));
const coach=new LionCoach(JSON.parse(fs.readFileSync('assets/models/coach-surface-v2.json')));
for(const r of advanced){let at=0;for(let i=0;i<r.moves.length;i++){const d=R.timings[r.id][i];if(r.moves[i]==='step'){const f=R.frame(at+d*(1-1e-6),'combo',r.id),m=coach.update(at+d*(1-1e-6),'combo',r.id,{stepDirection:f.stepDirection});assert.equal(m.move,'step');assert.ok(m.footTargets.every(x=>x.lift<1e-7&&x.error<.002),'actual feet must land within reach before the next beat');}at+=d;}}
console.log('PASS twelve replayable advanced phrases, full planted exits, directional cues, four speed-bag super drills and actual supported feet');
