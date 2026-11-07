const fileSystem=require('fs'),vm2=require('vm');global.require=require('module').createRequire(process.cwd()+'/tests/training-motion.test.cjs');
const prefix=fileSystem.readFileSync('tests/training-motion.test.cjs','utf8').split("for(const species of ['lion','rabbit']){\n")[0];
vm2.runInThisContext(prefix+fileSystem.readFileSync('boxing-pose.js','utf8')+`
const {PoseFrame,FixedStepClock,PoseAudit}=BoxingPose;
assert.equal(BoxingPose.enabled,false,'legacy rendering is the default');
for(const species of ['lion','rabbit']){
 e.targetMode='none';e.roster.select(species);e.arena.setTarget('none');const c=e.coach,a=new PoseFrame(c),b=new PoseFrame(c),out=new PoseFrame(c),audit=new PoseAudit();
 c.root.position.set(1,.1,-2);c.root.rotation.y=.72;
 c.update(.18,'uppercut','one_two',{simulationTime:.18});a.capture(c,.18);const reference=a.joints.armL;
 const real=c.root.localToWorld(V(...c.metrics.gloves[0].strikePoint));assert.ok(V(...a.leftHandTarget).distanceTo(real)<1e-12,'observed hand target must include root and parent transforms');
 assert.deepEqual(Array.from(a.rootTransform.position),c.root.getWorldPosition(V()).toArray());
 c.update(.55,'uppercut','one_two',{simulationTime:.55});b.capture(c,.55);const original=c.joints.armL.quaternion.clone();
 out.interpolate(a,b,.5);assert.ok(c.joints.armL.quaternion.equals(original),'sampling/interpolation cannot mutate the authoritative rig');
 for(const q of Object.values(out.joints))assert.ok(Math.abs(Math.hypot(...q)-1)<1e-10,'slerp must produce unit quaternions');
 const reversed=new PoseFrame(c).capture(c,.55);for(const q of Object.values(reversed.joints))for(let i=0;i<4;i++)q[i]*=-1;
 out.interpolate(b,reversed,.5);for(const name of b.jointNames)assert.ok(Math.abs(new THREE.Quaternion().fromArray(out.joints[name]).dot(new THREE.Quaternion().fromArray(b.joints[name])))>1-1e-10,'antipodal quaternions must not unwind');
 a.capture(c,.55);assert.equal(a.joints.armL,reference,'joint buffers are reused');assert.ok(a.targetsValid);assert.equal(a.serialize().jointSpace,'parent');
 e.animTime=.55;const first=audit.capture(e).hero;audit.capture(e);assert.equal(audit.actors.hero,first,'audit frames are reused');
 assert.throws(()=>out.interpolate(a,b,NaN),/finite/);assert.throws(()=>a.interpolate(a,b,.5),/separate/);
}
const totals=[];for(const hz of [30,60,120,144]){const clock=new FixedStepClock(),times=[];for(let i=0;i<hz*2;i++)clock.advance(1/hz,t=>times.push(t));assert.equal(clock.tick,240);assert.equal(clock.time,2);totals.push(times);const tick=clock.tick;clock.advance(0,()=>assert.fail('paused clocks cannot step'));assert.equal(clock.tick,tick);}
for(const times of totals)assert.deepEqual(times,totals[0],'fixed-step callback times cannot depend on render rate');
const clock=new FixedStepClock();assert.equal(clock.advance(10,()=>{}),8,'hidden-tab catch-up is capped');assert.ok(clock.droppedSeconds>9);clock.reset(30);assert.equal(clock.tick,0);clock.advance(1/120,()=>{});assert.equal(clock.time,30+1/120);assert.throws(()=>clock.advance(-1,()=>{}),/nonnegative/);
console.log('PASS reusable final-pose contract, world targets, antipodal slerp, read-only sampling, deterministic capped fixed-step clock and pause/seek reset');
`);
