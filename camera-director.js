/* Camera direction on top of RingCamera: a lockable side view that tracks both subjects (GOTR-0019)
   and the orbiting fight intro (GOTR-0020). Poses, physics, scoring and the fight clock are untouched:
   the director only places the camera, and holds the engine clock before the match's own countdown. */
(() => {
 const TAU=Math.PI*2,KEY='gotr-side-camera';
 const wrap=a=>{a=(a+Math.PI)%TAU;return (a<0?a+TAU:a)-Math.PI;},ease=(dt,tau)=>1-Math.exp(-dt/tau);
 // Critically damped spring: position AND velocity stay continuous, so the camera never jerks
 // when its goal changes (lock engaged, fighters turn, the frame widens).
 function damp(pose,key,target,tau,dt,angle){
  const v=pose.v||(pose.v={}),omega=2/tau,x=omega*dt,decay=1/(1+x+.48*x*x+.235*x*x*x),change=angle?wrap(pose[key]-target):pose[key]-target,step=((v[key]||0)+omega*change)*dt;
  v[key]=((v[key]||0)-omega*step)*decay;pose[key]=target+(change+step)*decay;if(angle)pose[key]=wrap(pose[key]);
 }
 const WORDS={
  en:{lock:'Side lock',label:'Lock the camera to a side view',skip:'Tap to skip'},
  he:{lock:'נעילת צד',label:'נעילת המצלמה למבט מהצד',skip:'הקישו לדילוג'},
  ru:{lock:'Вид сбоку',label:'Закрепить камеру сбоку',skip:'Нажмите, чтобы пропустить'}
 };
 const INTRO={seconds:5.2,countdown:3,turn:TAU,pullBack:3.2,rise:2.4,lookRise:.35};
 // Distance at which a width x height box fills the view, with the arena framing's own margins.
 function fitDistance(width,height,fov,aspect){const t=Math.tan(fov*Math.PI/360);return Math.max(height/(2*t),width/(2*t*Math.max(.2,aspect)))*1.10+.45;}
 // Orbit pose at intro progress u (0..1) around the pose the intro must end on. At u=1 it IS that pose.
 function introPose(end,u){const r=1-Math.sin(Math.min(1,Math.max(0,u))*Math.PI/2);return {lx:end.lx,ly:end.ly+INTRO.lookRise*r,lz:end.lz,angle:end.angle-INTRO.turn*r,dist:end.dist+INTRO.pullBack*r,cy:end.cy+INTRO.rise*Math.pow(r,1.3)};}
 class CameraDirector {
  constructor(engine){
   this.engine=engine;this.mode='free';this.locked=false;this.pose=null;this.side=1;this.subjectKey='';this.direction=null;this.intro=null;this.seenFight=null;this.savedZoom=1;this.settleZoom=false;this.lang='';this.last='';
   try{this.locked=window.localStorage.getItem(KEY)==='1';}catch{/* Private mode: the lock simply starts off. */}
   this.mount();
  }
  // RingCamera asks these before it moves the camera or accepts an orbit drag.
  get owns(){return this.mode!=='free'&&!this.suspended;}
  // Shop previews and Fight Academy demos frame the stage themselves: the director stands aside.
  get suspended(){const e=this.engine,list=e.stage&&e.stage.classList;return !!(e.fightIQDemo||list&&list.contains('game-preview-live'));}
  get blocksOrbit(){return (this.mode==='lock'||this.mode==='intro')&&!this.suspended;}
  // The engine clock waits until only the match's own 3 s countdown is left, so the bell meets the final framing.
  get holdsClock(){return this.mode==='intro'&&this.intro.t<this.intro.seconds-INTRO.countdown;}
  reducedMotion(){try{return !!window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;}catch{return false;}}
  mount(){
   const stage=this.engine.stage;if(typeof document==='undefined'||!stage||!stage.append)return;
   const b=document.createElement('button');b.type='button';b.id='camLock';b.className='camera-lock-toggle';
   b.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7 10V7a5 5 0 0 1 10 0v3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><rect x="5" y="10" width="14" height="10" rx="2.5" fill="currentColor"/></svg>';const caption=document.createElement('span');b.append(caption);this.caption=caption;
   b.setAttribute('aria-pressed',String(this.locked));b.addEventListener('click',()=>this.setLock(!this.locked));
   const hint=document.createElement('div');hint.className='camera-intro-skip';hint.hidden=true;hint.setAttribute('aria-hidden','true');
   stage.append(b,hint);this.button=b;this.hint=hint;this.paint();
  }
  paint(){
   if(!this.button)return;const lang=(window.app&&window.app.lang)||'en';if(lang===this.lang)return;this.lang=lang;const w=WORDS[lang]||WORDS.en;
   this.caption.textContent=w.lock;this.button.setAttribute('aria-label',w.label);this.button.title=w.label;this.hint.textContent=w.skip;
  }
  setLock(on,instant){
   const e=this.engine;on=!!on;if(this.mode==='intro')this.skipIntro();this.locked=on;try{window.localStorage.setItem(KEY,on?'1':'0');}catch{/* Not persisted. */}
   if(this.button)this.button.setAttribute('aria-pressed',String(on));
   if(on){if(this.mode==='free'||this.mode==='release')this.engage();}
   else if(this.mode==='lock'){
    if(instant){this.mode='free';this.pose=null;if(e.camera){e.camera.zoom=this.savedZoom;e.camera.updateProjectionMatrix();}}
    else this.mode='release';
   }
   e.lastRenderStamp=null;
  }
  engage(){const c=this.engine.camera,resume=this.mode==='release'&&this.pose;if(this.mode==='free')this.savedZoom=c.zoom;this.mode='lock';this.pose=resume||this.freePose();this.subjectKey='';this.reachKey=null;this.reach=this.pose.dist;this.settleZoom=true;}
  userZoom(){this.settleZoom=false;}
  // The free orbit camera as RingCamera would place it, in the director's cylinder form.
  freePose(){
   const v=this.engine.viewControls,t=v.target,o=v.offset.clone().applyAxisAngle(new THREE.Vector3(0,1,0),v.yaw);
   return {lx:t.x,ly:t.y,lz:t.z,angle:Math.atan2(o.x,o.z),dist:Math.max(.1,Math.hypot(o.x,o.z)),cy:t.y+o.y};
  }
  subjects(){
   const e=this.engine,a=e.arena,fight=a&&a.mode==='fight'&&a.fightView&&a.fightView.coaches;
   if(fight)return {key:'fight',nodes:[fight.lion.root,fight.rabbit.root],yaw:a.group.rotation.y+Math.PI/2,frame:2.65};
   if(a&&a.mode!=='none'&&e.coach){
    // Equipment stations keep their target in arena.models; mitt work keeps its pad holder on the drill.
    const drill=a.careerDrill,target=drill&&drill.trainer?drill.trainer.root:a.models&&a.models[a.mode],pair=target&&target.parent&&a.mode!=='rope';
    return {key:a.mode,nodes:pair?[e.coach.root,target]:[e.coach.root],yaw:a.group.rotation.y,frame:a.mode==='rope'?(e.coach.species==='rabbit'?3.12:2.86):a.mode==='pads'?2.95:2.65};
   }
   const solo=e.activeModel||(e.coach&&e.coach.root);return solo?{key:'none',nodes:[solo],yaw:solo.rotation.y,frame:2.65}:null;
  }
  // True side view: perpendicular to the line between the subjects, both framed with reach to spare.
  goal(){
   const s=this.subjects();if(!s)return null;
   const e=this.engine,c=e.camera,a=s.nodes[0].getWorldPosition(new THREE.Vector3()),b=s.nodes[1]?s.nodes[1].getWorldPosition(new THREE.Vector3()):null;
   let dx=Math.sin(s.yaw),dz=Math.cos(s.yaw),gap=0,mx=a.x,mz=a.z;
   if(b){
    const x=b.x-a.x,z=b.z-a.z;gap=Math.hypot(x,z);mx=(a.x+b.x)/2;mz=(a.z+b.z)/2;
    // In a clinch the line between two roots is noise: keep the last clear direction.
    if(gap>=.35){dx=x/gap;dz=z/gap;}else if(this.direction&&this.subjectKey===s.key){dx=this.direction.x;dz=this.direction.z;}
   }else{mx+=dx*.25;mz+=dz*.25;}
   if(this.subjectKey!==s.key||!this.direction){
    // Take the side the camera is already on, then keep it: each fighter stays on the same half of the screen.
    const p=this.pose||this.freePose(),ox=p.lx+Math.sin(p.angle)*p.dist-mx,oz=p.lz+Math.cos(p.angle)*p.dist-mz;
    this.side=ox*dz-oz*dx>=0?1:-1;this.subjectKey=s.key;
   }
   this.direction={x:dx,z:dz};
   const width=Math.max(2.4,b?gap+1.0:2.4);
   // Look height and camera height are the station's own free framing: the tilt is the one the player knows.
   const free=this.freePose(),dist=Math.min(12.5,fitDistance(width,s.frame,c.fov,c.aspect));
   // A narrow (portrait) screen pushes the camera back behind the arena's grandstand: rise with distance to see over it.
   return {lx:mx,ly:free.ly,lz:mz,angle:Math.atan2(this.side*dz,-this.side*dx),dist,cy:free.cy+(s.key==='fight'?Math.max(0,dist-5.2)*.42:0)};
  }
  follow(dt,snap){
   const g=this.goal();if(!g)return this.pose;
   // Widen at once when the fighters separate; give the room back slowly, so the frame never breathes.
   this.reach=snap||!this.pose||this.reachKey!==this.subjectKey?g.dist:Math.max(g.dist,this.reach-.3*dt);this.reachKey=this.subjectKey;
   if(snap||!this.pose){this.pose={...g,v:{}};return this.pose;}
   const p=this.pose;
   for(const key of ['lx','ly','lz','cy'])damp(p,key,g[key],.35,dt);damp(p,'angle',g.angle,.35,dt,true);damp(p,'dist',this.reach,.35,dt);
   return p;
  }
  // An arena with a low ceiling (the Basement) declares it on its set group; the intro orbit and the
  // portrait side lock would otherwise rise above the slab and show only its top. Rechecked once a second.
  // A built arena can declare camera limits on its set group: a low ceiling (the Basement) and a radius
  // that keeps the intro orbit inside interior walls. Without them the orbit rises above the slab or passes
  // behind partitions and the screen goes black. Rechecked once a second.
  limits(){const now=typeof performance!=='undefined'?performance.now():Date.now();if(!(now-this.limitsAt<1000)){this.limitsAt=now;let top=0,radius=0;this.engine.scene?.traverse?.(n=>{const u=n.userData;if(!u||n.visible===false)return;if(u.cameraCeiling>0&&(!top||u.cameraCeiling<top))top=u.cameraCeiling;if(u.cameraRadius>0&&(!radius||u.cameraRadius<radius))radius=u.cameraRadius;});this.limitsNow={top,radius};}return this.limitsNow||{top:0,radius:0};}
  ceiling(){return this.limits().top;}
  place(p){const c=this.engine.camera,l=this.limits(),cy=l.top?Math.min(p.cy,l.top):p.cy,dist=l.radius&&this.mode==='intro'?Math.min(p.dist,l.radius):p.dist;c.position.set(p.lx+Math.sin(p.angle)*dist,cy,p.lz+Math.cos(p.angle)*dist);c.lookAt(p.lx,Math.min(p.ly,cy),p.lz);c.updateMatrixWorld(true);}
  startIntro(){this.intro={t:0,seconds:INTRO.seconds};if(this.mode==='free')this.savedZoom=this.engine.camera.zoom;this.mode='intro';this.pose=null;if(this.hint)this.hint.hidden=false;}
  // A tap ends the orbit: the camera takes the short way from where it is to the fight framing.
  skipIntro(){
   if(this.mode!=='intro')return false;
   const end=this.locked?this.follow(0,!this.pose):this.freePose();this.pose=introPose(end,this.intro.t/this.intro.seconds);this.pose.angle=wrap(this.pose.angle);
   this.intro=null;this.mode=this.locked?'lock':'release';if(this.hint)this.hint.hidden=true;this.engine.lastRenderStamp=null;return true;
  }
  // Called once per displayed frame, before drawing. Returns true when the camera moved.
  update(dt){
   const e=this.engine,c=e.camera,v=e.viewControls;if(!c||!v||!v.target||!v.offset)return false;
   this.paint();dt=Math.min(Math.max(dt||0,0),.05);if(this.suspended){if(this.mode==='intro')this.skipIntro();return false;}
   const fight=e.arena&&e.arena.mode==='fight'?e.arena.fightView:null;
   if(fight!==this.seenFight){
    this.seenFight=fight;
    if(this.mode==='intro'&&!fight)this.skipIntro();
    if(fight&&fight.match&&fight.match.phase==='intro'&&!(fight.match.time>.05)&&!this.reducedMotion())this.startIntro();
   }
   if(this.mode==='free'){if(!this.locked||!this.subjects())return false;this.engage();}
   let pose;
   if(this.mode==='intro'){
    const i=this.intro;i.t+=dt;
    const end=this.locked?this.follow(dt,!this.pose):this.freePose();pose=introPose(end,i.t/i.seconds);
    if(i.t>=i.seconds){this.intro=null;if(this.hint)this.hint.hidden=true;if(this.locked){this.mode='lock';this.pose=end;}else{this.mode='free';this.pose=null;v.apply();return this.moved('free');}}
   }else if(this.mode==='lock'){
    pose=this.follow(dt);
    if(this.settleZoom){c.zoom+=(1-c.zoom)*ease(dt,.3);if(Math.abs(c.zoom-1)<.004){c.zoom=1;this.settleZoom=false;}c.updateProjectionMatrix();}
   }else{
    // Release: ease back to the free camera exactly as the player left it.
    const g=this.freePose(),p=this.pose||g;
    for(const key of ['lx','ly','lz','cy','dist'])damp(p,key,g[key],.22,dt);damp(p,'angle',g.angle,.22,dt,true);
    c.zoom+=(this.savedZoom-c.zoom)*ease(dt,.16);c.updateProjectionMatrix();pose=p;
    if(Math.abs(wrap(g.angle-p.angle))<.004&&Math.abs(g.dist-p.dist)<.01&&Math.hypot(g.lx-p.lx,g.ly-p.ly,g.lz-p.lz,g.cy-p.cy)<.01){this.mode='free';this.pose=null;c.zoom=this.savedZoom;c.updateProjectionMatrix();v.apply();return this.moved('free');}
   }
   if(!pose)return false;this.place(pose);
   return this.moved([pose.lx,pose.ly,pose.lz,pose.angle,pose.dist,pose.cy,c.zoom].map(n=>n.toFixed(5)).join());
  }
  moved(stamp){const changed=stamp!==this.last||stamp==='free';this.last=stamp;if(changed)this.engine.lastRenderStamp=null;return changed;}
 }
 const api={CameraDirector,fitDistance,introPose,INTRO,WORDS};
 if(typeof module!=='undefined')module.exports=api;
 if(typeof window!=='undefined'){window.CameraDirector=CameraDirector;window.CameraDirection=api;}
})();
