/* GOTR-0040: range of the real contact impulse per training target and in a fight, to scale the power meter.
   Usage (repo root): node qa/gotr-0040/impulses.cjs [seconds] */
const path=require('path');const M=require(path.join(__dirname,'..','gotr-0027','measure.cjs'));
const seconds=+(process.argv[2]||10);
for(const mode of ['heavy','pads','fight']){
 const e=M.setup(mode,'lion'),list=[];let t=e.arena.fightView?e.arena.fightView.tick/60:0;
 if(mode==='fight'){const v=e.arena.fightView;for(let i=0;i<720&&v.match.phase!=='round';i++)v.update((v.tick+1)/60);t=v.tick/60;}
 for(let i=0;i<seconds*60;i++){t+=1/60;e.animTime=t;const f=e.arena.update(t,e.technique,e.currentAnim);for(const c of f.contacts||[])list.push({move:c.move,receiver:c.receiver,kind:c.kind,impulse:+(c.impulse||0).toFixed(3),closing:+(c.closingSpeed||0).toFixed(2),blocked:!!c.blocked});}
 const v=list.map(c=>c.impulse).sort((a,b)=>a-b);console.log(mode,'contacts',list.length,'impulse min/median/max',v[0],v[v.length>>1],v[v.length-1]);console.log(' ',JSON.stringify(list.slice(0,12)));
}
