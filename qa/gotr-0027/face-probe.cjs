/* GOTR-0027 guard flicker probe: per 120 Hz tick in the mitt rear hook, the fighter's lead-hand face clearance
   iterations (needs the temporary __faceLog hook in clearOwnFace). Usage: node qa/gotr-0027/face-probe.cjs [from] [to] */
const path=require('path');const M=require(path.join(__dirname,'measure.cjs'));
const [from='4.89',to='4.935']=process.argv.slice(2);const e=M.setup('pads','lion');globalThis.__faceCoach=e.coach;
let t=0;while(t<+to){t+=1/120;e.animTime=t;globalThis.__faceLog=t>=+from?[]:null;e.arena.update(t);if(globalThis.__faceLog){const h=e.coach.joints.handL.getWorldPosition(new THREE.Vector3());console.log(t.toFixed(4),'final',h.toArray().map(x=>x.toFixed(3)).join(','));for(const l of globalThis.__faceLog)console.log('   ',JSON.stringify(l));}}
