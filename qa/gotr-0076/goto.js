// usage: prepend "const TARGET=<phaseTime>;"
const e=app.engine,v=e.arena.fightView,m=v.match;m.restSeconds=20;
let guard=0;while(m.phase==='rest'&&m.phaseTime<TARGET&&guard++<2000){e.arena.update(e.animTime+=.05,e.technique,e.currentAnim);e.cameraDirector?.update?.(.05);}
e.lastRenderStamp=null;await new Promise(r=>setTimeout(r,1500));
const c=v.corner,men=Object.fromEntries(Object.entries(c.men).map(([k,x])=>[k,x.rig.root.position.toArray().map(n=>+n.toFixed(2))]));
const hip=a=>v.cast.worldToLocal(v.coaches[a].joints.hips.getWorldPosition(new THREE.Vector3())).toArray().map(n=>+n.toFixed(2));
return {phase:m.phase,t:+m.phaseTime.toFixed(2),n:+c.n.toFixed(2),state:c.state,men,hips:{lion:hip('lion'),rabbit:hip('rabbit')},stool:c.props.lion.stool.position.toArray().map(n=>+n.toFixed(2)),errs:Object.fromEntries(Object.entries(c.men).map(([k,x])=>[k,(x.rig.metrics?.handErrors||[]).map(n=>+n.toFixed(3))]))};
