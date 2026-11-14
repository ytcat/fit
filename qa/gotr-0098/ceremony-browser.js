// prepend: const WIN='lion'|'rabbit', OPTS={...};
const e=app.engine;try{StoryScenes.stop()}catch{};try{AdventureOldTown.leave?.()}catch{};
ringfighterGame.startFight({seed:9,rounds:1,roundSeconds:20,restSeconds:0,...OPTS});await new Promise(r=>setTimeout(r,4000));
const v=e.arena.fightView,m=v.match;e.cameraDirector?.skipIntro?.();while(m.phase==='intro')m.advance(.5);
for(let i=0;i<20;i++)e.arena.update(e.animTime+=.05,e.technique,e.currentAnim);
m.finish(WIN,'TKO',true);for(let i=0;i<400&&!(m.phase==='ceremony'&&m.phaseTime>3.2);i++){e.arena.update(e.animTime+=.05,e.technique,e.currentAnim);e.cameraDirector?.update?.(.05);}
e.isPlaying=false;e.lastRenderStamp=null;await new Promise(r=>setTimeout(r,2500));
const V=THREE.Vector3,w=o=>v.cast.worldToLocal(o.getWorldPosition(new V())).toArray().map(x=>+x.toFixed(2)),wj=v.coaches[WIN].joints,s=WIN==='lion'?'R':'L';
const ref=v.referee,refHand=ref.isBruno?w(ref.root.children.length&&window.StoryCast.rig('bruno').joints['hand'+(WIN==='lion'?'L':'R')]):null;
return {phase:m.phase,winner:m.result?.winner,gym:!!v.gymFight,ref:w(ref.root),hand:w(wj['hand'+s]),head:w(wj.head),bruno:ref.isBruno?{L:w(StoryCast.rig('bruno').joints.handL),R:w(StoryCast.rig('bruno').joints.handR)}:null};
