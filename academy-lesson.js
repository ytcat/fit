/* Fight Academy lesson rules: exact order, tempo window and three run-throughs. Pure; loads in the browser and under Node. */
(() => {
 // repetitions: clean run-throughs needed; windowMs: longest pause between two moves of one run-through;
 // strikes: mistakes in a row before the player is sent back to Watch (earned run-throughs are kept);
 // graceMs: presses right after a mistake are ignored so one slip is one mistake.
 const RULES=Object.freeze({repetitions:3,windowMs:2000,strikes:3,graceMs:500});
 const fail=message=>{throw Error(message);};
 function create(sequence,options={}){
  if(!Array.isArray(sequence)||sequence.length<2||sequence.length>8||sequence.some(m=>typeof m!=='string'||!m))fail('Invalid lesson sequence.');
  const rules={...RULES,...options},seq=[...sequence];
  if(!Number.isSafeInteger(rules.repetitions)||rules.repetitions<1||!(rules.windowMs>0)||!Number.isSafeInteger(rules.strikes)||rules.strikes<1||!(rules.graceMs>=0))fail('Invalid lesson rules.');
  let step=0,reps=[],current=[],strikes=0,lastAt=null,graceUntil=-Infinity,locked=false,passed=false;
  // next: the move expected now; first: the move every run-through starts with;
  // deadline: latest time for the next move (null before a run-through starts); graceUntil: presses before it are ignored.
  const state=()=>({step,total:seq.length,reps:reps.length,required:rules.repetitions,strikes,locked,passed,next:passed||locked?null:seq[step],first:seq[0],deadline:step&&!passed&&!locked?lastAt+rules.windowMs:null,graceUntil:Number.isFinite(graceUntil)?graceUntil:null});
  const evidence=()=>({version:1,reps:reps.map(r=>({moves:[...r.moves],ms:[...r.ms]}))});
  // A mistake clears only the current run-through. Earlier successes stay.
  function miss(type,detail,at){
   step=0;current=[];lastAt=null;strikes++;graceUntil=at+rules.graceMs;
   const rewatch=strikes>=rules.strikes;if(rewatch){strikes=0;locked=true;}
   return {type,...detail,rewatch,...state()};
  }
  // Call for every input the game really accepted, with a monotonic time in milliseconds
  // (the game passes its simulation clock, so a slow device is judged by what the fighter did).
  function input(move,at){
   if(typeof move!=='string'||!Number.isFinite(at))fail('Invalid lesson input.');
   if(passed)return {type:'done',...state()};
   if(locked)return {type:'locked',...state()};
   if(step>0&&at-lastAt>rules.windowMs)return miss('slow',{wanted:seq[step]},at);
   if(at<graceUntil)return {type:'ignored',...state()};
   const wanted=seq[step];
   if(move!==wanted)return miss('wrong',{pressed:move,wanted,atStart:step===0},at);
   const gap=step?Math.min(rules.windowMs,Math.max(0,Math.round(at-lastAt))):0;
   current.push({move,ms:step?current[step-1].ms+gap:0});lastAt=at;step++;
   if(step<seq.length)return {type:'step',...state()};
   reps.push({moves:current.map(c=>c.move),ms:current.map(c=>c.ms)});step=0;current=[];lastAt=null;strikes=0;
   if(reps.length>=rules.repetitions){passed=true;return {type:'pass',...state(),evidence:evidence()};}
   return {type:'rep',...state()};
  }
  // Call regularly so a stalled run-through is reported without waiting for the next press.
  function tick(at){if(passed||locked||step===0||!(at-lastAt>rules.windowMs))return null;return miss('slow',{wanted:seq[step]},at);}
  // After several mistakes in a row the player watches again, then resumes with the earned run-throughs.
  function resume(){locked=false;step=0;current=[];lastAt=null;strikes=0;graceUntil=-Infinity;return state();}
  return {input,tick,resume,state,evidence,sequence:[...seq],rules};
 }
 const api={RULES,create};
 if(typeof module!=='undefined')module.exports=api;else window.AcademyLesson=api;
})();
