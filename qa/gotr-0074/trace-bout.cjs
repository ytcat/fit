/* GOTR-0074 probe: per-frame trace of a seeded Watch bout in cast coordinates (roots, lead/rear wrists in root space,
   moves). Two traces (mirrored and unmirrored build) must be identical if the mirrored cast is a pure reflection.
   Usage: node qa/gotr-0074/trace-bout.cjs <seed> <out.txt> */
const fs=require('fs'),path=require('path');const {engine}=require(path.join(__dirname,'..','gotr-0024','measure.cjs'));
const e=engine('lion');e.player.setEnabled(false);e.targetMode='fight';e.fightOptions={preset:'quick',seed:+(process.argv[2]||3)};e.arena.setTarget('fight');const view=e.arena.fightView,m=view.match,out=[];let frames=0;
const f=v=>v.toArray().map(x=>x.toFixed(4)).join(',');
while(!m.result&&frames++<1200){view.step();out.push(frames+' '+m.phase+' '+['lion','rabbit'].map(a=>{const c=view.coaches[a];return a+' '+view.specs[a].move+' root '+f(c.root.position)+' L '+f(c.point(c.joints.handL))+' R '+f(c.point(c.joints.handR))+' footL '+f(c.point(c.joints.footL));}).join(' | '));}
fs.writeFileSync(process.argv[3],out.join('\n'));console.log('frames',frames);
