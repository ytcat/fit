/* Corner break between rounds (GOTR-0076, film F2 in docs/adventure/FILMS.md).
 * At the bell that ends a round each fighter drops his guard and walks to his own corner (red = lion, blue = rabbit).
 * A cornerman (Coach Bruno in the red corner, Brick in the blue one, both the story cast's rigs in street clothes)
 * walks up outside the ropes with a stool in the corner colour, lifts it over the top rope and sets it down; the
 * fighter turns and sits (hips on the stool, knees bent, feet on the canvas, gloves on the thighs). The cornerman
 * drapes a towel over his shoulders, takes a water bottle from the corner bucket and gives him a drink (head back),
 * wipes his face and talks to him. Seven seconds before the bell the fighter stands, the towel and the stool go back
 * over the ropes, the cornerman steps down, and the fighter walks back to where the round left him and raises the guard.
 *
 * Everything happens in the bout's mirrored cast frame (fight-arena.js: view.cast, scale.x = -1). The fighters stay
 * where they are in that frame; the cornermen are added to it with root scale 1 like the fighters (and get their own
 * parent, transform, outfit and visibility back afterwards). Props (stool, towel, bottle, bucket) follow the timeline,
 * so the sequence is the same with or without the story rigs (node tests, a gym fight where Bruno referees); the
 * cornermen's hands reach for the props, not the other way round.
 *
 * Ringless venues (no ring shown): the same sequence without ropes: the stool is set down by the fighter's side of the
 * floor and the bucket stands next to it.
 *
 * API (view = FightArena):  FightCorner.create(view) -> corner ; corner.place(live) before the fighters are posed
 * (live = {actor: {position, yaw}} of the round's own placement) ; corner.pose(actor, options, time) -> metrics ;
 * corner.after() once both are posed ; corner.dispose().  FightCorner.TIMELINE, FightCorner.nominal(rest, t),
 * FightCorner.stateAt(n), corner.state, corner.cameraGoal(camera, freePose). */
(() => {
 const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z),clamp=(v,a=0,b=1)=>v<a?a:v>b?b:v,lerp=(a,b,t)=>a+(b-a)*t;
 const smooth=t=>{t=clamp(t);return t*t*(3-2*t);},span=(n,[a,b])=>smooth((n-a)/(b-a)),wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
 const NOMINAL=20,HOLD=12.9,TAIL=NOMINAL-HOLD; // the break is choreographed for 20 s; longer breaks stretch the talk, shorter ones scale
 const T={ // nominal seconds
  guardDrop:[0,.55],walk:[.35,2.9],turn:[2.9,3.5],sit:[3.5,4.6],towel:[4.6,6.0],bottleDown:[6.0,6.45],bottleUp:[6.45,6.95],drink:[6.95,9.6],bottleBack:[9.6,10.4],
  wipe:[10.4,11.4],talk:[11.4,12.9],stand:[13.0,14.0],towelOff:[13.0,13.8],stoolOut:[14.0,15.3],walkBack:[14.2,17.0],face:[17.0,17.7],guard:[17.9,19.2],
  cmIn:[.15,2.4],stoolIn:[2.4,3.35],stoolDrop:[3.35,3.55],cmOut:[15.3,18.6]
 };
 const STATES=[['walk',0],['sit',3.5],['towel',4.6],['drink',6.0],['talk',10.4],['stand',13.0],['walkback',14.2],['guard',17.9]];
 const SEAT=.47,SEAT_R=.17,ROPE_TOP=1.23,POST=1.65,STOOL_D=.62,ANKLE=.12,HIP=.972,BALL=.13;
 const nominal=(rest,t)=>{rest=Math.max(.01,rest);if(rest<NOMINAL)return clamp(t*NOMINAL/rest,0,NOMINAL);if(t<=HOLD)return t;const back=rest-t;return back<TAIL?NOMINAL-back:HOLD;};
 const stateAt=n=>{let s='walk';for(const [name,at] of STATES)if(n>=at)s=name;return s;};
 const CORNERS={lion:{corner:[-POST,-POST],colour:0xb4302c,name:'red'},rabbit:{corner:[POST,POST],colour:0x2f5fa8,name:'blue'}};

 /* ------------------------------------------------------------------ props */
 function mat(color,o={}){const m=new THREE.MeshStandardMaterial({color,roughness:.6,...o});m.color.convertSRGBToLinear?.();return m;}
 function stool(colour){
  const g=new THREE.Group();g.name='Corner stool';const seat=mat(colour,{roughness:.45}),leg=mat(0x2a2d33,{metalness:.5,roughness:.4}),pad=mat(0x15171b,{roughness:.9});
  const top=new THREE.Mesh(new THREE.CylinderGeometry(SEAT_R,SEAT_R*.97,.06,28),seat);top.position.y=SEAT-.03;g.add(top);
  const rim=new THREE.Mesh(new THREE.TorusGeometry(SEAT_R-.005,.012,8,32),seat);rim.rotation.x=Math.PI/2;rim.position.y=SEAT-.01;g.add(rim);
  for(let i=0;i<4;i++){const a=Math.PI/4+i*Math.PI/2,x=Math.sin(a),z=Math.cos(a),from=V(x*.10,SEAT-.06,z*.10),to=V(x*.185,.0,z*.185),mid=from.clone().add(to).multiplyScalar(.5),len=from.distanceTo(to);
   const l=new THREE.Mesh(new THREE.CylinderGeometry(.013,.016,len,10),leg);l.position.copy(mid);l.quaternion.setFromUnitVectors(V(0,1,0),to.clone().sub(from).normalize());g.add(l);
   const foot=new THREE.Mesh(new THREE.CylinderGeometry(.02,.02,.012,10),pad);foot.position.set(to.x,.006,to.z);g.add(foot);}
  const ring=new THREE.Mesh(new THREE.TorusGeometry(.148,.008,6,28),leg);ring.rotation.x=Math.PI/2;ring.position.y=.17;g.add(ring);
  g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});return g;
 }
 function bucket(colour){
  const g=new THREE.Group();g.name='Corner bucket';const body=mat(colour,{roughness:.5,side:THREE.DoubleSide}),inner=mat(0x9fc6dc,{roughness:.15,metalness:.1}),metal=mat(0x9aa1a8,{metalness:.7,roughness:.35});
  const b=new THREE.Mesh(new THREE.CylinderGeometry(.15,.12,.30,24,1,true),body);b.position.y=.15;g.add(b);
  const bottom=new THREE.Mesh(new THREE.CircleGeometry(.12,24),body);bottom.rotation.x=-Math.PI/2;bottom.position.y=.005;g.add(bottom);
  const water=new THREE.Mesh(new THREE.CircleGeometry(.14,24),inner);water.rotation.x=-Math.PI/2;water.position.y=.22;g.add(water);
  const handle=new THREE.Mesh(new THREE.TorusGeometry(.15,.006,6,24,Math.PI),metal);handle.position.y=.30;handle.rotation.y=Math.PI/2;g.add(handle);
  const neck=new THREE.Mesh(new THREE.CylinderGeometry(.03,.034,.14,12),mat(0xe8f1f5,{transparent:true,opacity:.75}));neck.position.set(.06,.32,.02);neck.rotation.z=-.2;g.add(neck);neck.name='Spare bottle';
  g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});return g;
 }
 function bottle(colour){
  const g=new THREE.Group();g.name='Water bottle';const plastic=mat(0xe4f0f6,{transparent:true,opacity:.8,roughness:.12}),water=mat(0x5d9ccc,{transparent:true,opacity:.7,roughness:.1}),cap=mat(colour,{roughness:.4});
  // origin at the spout, body along -y
  const body=new THREE.Mesh(new THREE.CylinderGeometry(.042,.042,.20,16),plastic);body.position.y=-.14;g.add(body);const label=new THREE.Mesh(new THREE.CylinderGeometry(.0435,.0435,.07,16,1,true),cap);label.position.y=-.15;g.add(label);
  const fill=new THREE.Mesh(new THREE.CylinderGeometry(.038,.038,.13,14),water);fill.position.y=-.17;g.add(fill);
  const shoulder=new THREE.Mesh(new THREE.CylinderGeometry(.016,.042,.04,16),plastic);shoulder.position.y=-.02;g.add(shoulder);
  const top=new THREE.Mesh(new THREE.CylinderGeometry(.017,.017,.03,12),cap);top.position.y=.005;g.add(top);
  g.traverse(o=>{if(o.isMesh)o.castShadow=true;});return g;
 }
 const towelMat=()=>{const c=typeof document!=='undefined'&&document.createElement?.('canvas');let map=null;
  if(c?.getContext){c.width=64;c.height=256;const x=c.getContext('2d');if(x&&x.fillRect){x.fillStyle='#f3f1ea';x.fillRect(0,0,64,256);x.fillStyle='rgba(0,0,0,.05)';for(let i=0;i<256;i+=3)x.fillRect(0,i,64,1);x.fillStyle='#c9cfd6';x.fillRect(0,22,64,6);x.fillRect(0,228,64,6);map=new THREE.CanvasTexture(c);}}
  return new THREE.MeshStandardMaterial({color:0xffffff,map,roughness:.95,side:THREE.DoubleSide});};
 /** A cloth strip along points (rig space) with a per-point width direction; v runs along the strip. */
 function ribbon(points,widths,width,material){
  const curve=new THREE.CatmullRomCurve3(points),n=40,pos=[],uv=[],idx=[];
  const across=t=>{const i=t*(widths.length-1),a=Math.floor(i),b=Math.min(widths.length-1,a+1);return widths[a].clone().lerp(widths[b],i-a).normalize();};
  for(let i=0;i<=n;i++){const t=i/n,p=curve.getPoint(t),w=across(t);for(const s of [-1,1]){const q=p.clone().addScaledVector(w,s*width/2);pos.push(q.x,q.y,q.z);uv.push(s<0?0:1,t);}}
  for(let i=0;i<n;i++){const a=i*2;idx.push(a,a+1,a+2,a+1,a+3,a+2);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();
  const m=new THREE.Mesh(g,material);m.castShadow=true;return m;
 }

 /* ------------------------------------------------------------------ fighter posture (guard <-> everyday, sitting) */
 const legStep=(p,s,stride)=>window.DreamPose?.step?window.DreamPose.step(p,s,stride):{x:s*.092,y:ANKLE+.05*Math.max(0,Math.sin(p*Math.PI*2)),z:.25*Math.cos(p*Math.PI*2),pitch:0,planted:p<.62};
 const STRIDE=()=>window.DreamPose?.STRIDE||1.16;
 function snapshot(c){const s=[];for(const [k,b] of Object.entries(c.joints))s.push([b,b.position.clone(),b.quaternion.clone()]);for(const side of ['L','R']){const a=c.joints['foot'+side].userData.bootAnkle;if(a)s.push([a,a.position.clone(),a.quaternion.clone()]);}return s;}
 function fighterOverlay(c,st){
  const j=c.joints,g=st.guard,guard=g>0?snapshot(c):null,w=st.walk,sit=st.sit,stride=STRIDE(),phase=((st.dist||0)/stride)%1,tau=Math.PI*2,sw=Math.sin(phase*tau),cw=Math.cos(phase*tau),t=st.t||0,breath=Math.sin(t*(1.7+1.2*st.tired));
  const plans=[];
  for(const s of [-1,1]){const side=s<0?'L':'R',gs=legStep((phase+(s<0?0:.5))%1,s,stride),sx=s*lerp(.118,.165,sit),sz=lerp(s*-.012,.40,sit);
   plans.push({side,s,x:lerp(sx,gs.x,w),y:lerp(ANKLE,gs.y,w),z:lerp(sz,gs.z,w),pitch:gs.pitch*w,yaw:s*lerp(lerp(.16,.07,w),.22,sit),planted:gs.planted});}
  const hips=j.hips,yaw=.11*cw*w;hips.rotation.set(-.06*sit,yaw,.035*sw*w);hips.position.set(-.022*sw*w,HIP,lerp(.01*w,-.035,sit));
  c.root.updateMatrixWorld(true);
  let y=HIP+.006*breath*(1-w);
  for(const p of plans){const start=c.point(j['thigh'+p.side]),reach=(j['knee'+p.side].position.length()+j['foot'+p.side].position.length())*(p.planted?.992:.975),dx=start.x-p.x,dz=start.z-p.z;y=Math.min(y,p.y+Math.sqrt(Math.max(.01,reach*reach-dx*dx-dz*dz)));}
  hips.position.y=lerp(y-.012*w,SEAT+.095,smooth(sit));
  const lean=st.lean+.04*w,spineYaw=-yaw*.75;
  j.spine.rotation.set(.02+lean*.5+.01*breath*st.tired,spineYaw,-.03*sw*w);j.chest.rotation.set(.015+lean*.5-.014*breath*st.tired,-yaw*.9,-.02*sw*w);
  j.neck.position.copy(c.neckRest);j.neck.rotation.set(-st.pitch*.45-lean*.5,st.yaw*.4+yaw*.3,0);
  j.head.rotation.set(.03-st.pitch*.6-lean*.35+(st.nod||0)*.07*Math.sin(t*5.5),st.yaw*.6+yaw*.35,0);
  for(const side of ['L','R']){const s=side==='L'?-1:1;j['scapula'+side].position.set(s*.17,.17,-.06);j['scapula'+side].rotation.set(0,0,0);}
  c.root.updateMatrixWorld(true);
  const footTargets=[];
  for(const p of plans){const ankle=V(p.x,p.y,p.z),q=new THREE.Quaternion().setFromEuler(new THREE.Euler(p.pitch,p.yaw,0,'YXZ')),foot=j['foot'+p.side];
   const err=c.solve(j['thigh'+p.side],j['knee'+p.side],foot,ankle,V(p.s*lerp(.06,.25,sit),lerp(0,.4,sit),1));c.orient(foot,q);
   if(foot.userData.bootAnkle)foot.userData.bootAnkle.quaternion.setFromUnitVectors(V(0,1,0),c.point(j['knee'+p.side]).sub(ankle).normalize().applyQuaternion(q.clone().invert()));
   footTargets.push({side:p.side,error:err,ankle:ankle.toArray(),pivot:0,lift:p.y-ANKLE,contact:[p.x,0,p.z+BALL]});}
  const gloves=[],handErrors=[];
  for(const side of ['L','R']){const s=side==='L'?-1:1,swing=w*s*-1*Math.cos((phase-.04)*tau);
   const hang=V(s*.335,.985+hips.position.y-HIP+.003*breath,.055);hang.z+=.17*swing;hang.y+=.03*Math.abs(swing);
   const rest=V(s*.19,SEAT+.30,.36),hand=hang.lerp(rest,smooth(sit)); // seated, the gloves rest on the thighs
   const pole=V(s*.25,-.1,-1).lerp(V(s*.8,-.25,-.55),smooth(sit)).normalize(),palm=V(-s,0,0).lerp(V(-s*.4,-1,0),smooth(sit)).normalize();
   handErrors.push(c.solve(j['arm'+side],j['elbow'+side],j['hand'+side],hand,pole));gloves.push(c.orientGlove(side,.4,palm));}
  if(guard){for(const [b,p,q] of guard){b.position.lerp(p,g);b.quaternion.slerp(q,g);}c.root.updateMatrixWorld(true);}
  return g>.5?{footTargets}:{gloves,handErrors,footTargets};
 }

 /* ------------------------------------------------------------------ the break */
 class CornerBreak {
  constructor(view){
   this.view=view;this.props={};this.men={};this.active=false;this.state=null;this.n=0;this.towels={};this.log=[];
   this.root=new THREE.Group();this.root.name='Corner break props';view.cast.add(this.root);
   for(const actor of ['lion','rabbit']){const c=CORNERS[actor],p={};p.stool=stool(c.colour);p.bucket=bucket(c.colour);p.bottle=bottle(c.colour);p.held=null;p.draped=null;
    p.stool.visible=p.bottle.visible=false;this.root.add(p.stool,p.bucket,p.bottle);this.props[actor]=p;}
   this.towelMaterial=towelMat();this.layout();
   // Build the story rigs ahead of the first break (not at the bell).
   if(view.match.rounds>1&&typeof setTimeout==='function')setTimeout(()=>{try{this.cornermen();}catch(x){console.warn('corner break',x);}},0);
  }
  get ringless(){const v=this.view;return !!v.gymFight||!!v.ringless||v.ring?.visible===false;}
  /** Corner geometry in the cast frame for both fighters; the cornerman works from the rope side away from the camera. */
  layout(){
   this.geo={};const ringless=this.ringless;
   for(const actor of ['lion','rabbit']){
    const [cx,cz]=CORNERS[actor].corner,C=V(cx,0,cz),d=V(-Math.sign(cx),0,-Math.sign(cz)).normalize(),stoolD=ringless?STOOL_D+.25:STOOL_D,S=C.clone().addScaledVector(d,stoolD);
    // the two rope sides at this corner: along each rope (away from the corner) and its outward normal
    const sides=[{along:V(-Math.sign(cx),0,0),out:V(0,0,Math.sign(cz))},{along:V(0,0,-Math.sign(cz)),out:V(Math.sign(cx),0,0)}];
    const side=sides[this.ropeSide?.[actor]??0],P=ringless?S.clone().addScaledVector(d,-.62).addScaledVector(side.along,.30):C.clone().addScaledVector(side.along,.62).addScaledVector(side.out,.27);
    const Q=P.clone().addScaledVector(side.out,1.6).addScaledVector(side.along,.5),cross=ringless?null:C.clone().addScaledVector(side.along,.42);
    const bucketAt=ringless?P.clone().addScaledVector(side.along,.42).addScaledVector(d,.15):C.clone().addScaledVector(side.along,1.02).addScaledVector(side.out,.30);
    this.geo[actor]={C,d,S,P,Q,cross,side,bucket:bucketAt,inYaw:Math.atan2(d.x,d.z),approach:S.clone().addScaledVector(d,.30),seat:S.clone().addScaledVector(d,.035)};
    const p=this.props[actor];p.bucket.position.copy(bucketAt);p.bucket.rotation.y=Math.atan2(-side.out.x,-side.out.z);p.bucket.visible=true;
   }
  }
  /** The story rigs as cornermen (red: Bruno, blue: Brick). Absent rigs leave the props on their timeline. */
  cornermen(){
   if(this.menTried)return this.men;this.menTried=true;const Cast=window.StoryCast,Pose=window.DreamPose,v=this.view;if(!Cast||!Pose)return this.men;
   const used=new Set([...Object.values(v.coaches),v.referee?.root&&v.referee]);
   for(const [actor,id] of [['lion','bruno'],['rabbit','brick']]){
    const rig=Cast.rig(id,v.engine);if(!rig||used.has(rig)||Object.values(v.coaches).includes(rig)||v.referee?.root===rig.root)continue;
    this.men[actor]={rig,id,saved:null};
   }
   return this.men;
  }
  borrow(man){
   if(man.saved)return;const r=man.rig.root,Cast=window.StoryCast;
   man.saved={parent:r.parent,position:r.position.clone(),quaternion:r.quaternion.clone(),scale:r.scale.clone(),visible:r.visible,outfit:Cast?.outfitOf?.(man.rig)};
   r.parent?.remove(r);r.scale.set(1,1,1);r.visible=true;this.view.cast.add(r);window.DreamPose?.reset(man.rig);
   if(man.id==='brick'&&Cast?.outfits?.includes('street'))Cast.outfit(man.rig,'street');
  }
  giveBack(man){
   const s=man.saved;if(!s)return;const r=man.rig.root,Cast=window.StoryCast;r.parent?.remove(r);r.position.copy(s.position);r.quaternion.copy(s.quaternion);r.scale.copy(s.scale);r.visible=s.visible;s.parent?.add(r);
   if(s.outfit&&Cast?.outfitOf?.(man.rig)!==s.outfit)Cast.outfit(man.rig,s.outfit);window.DreamPose?.reset(man.rig);man.saved=null;
  }
  /** Called each pose() before the fighters are posed. live[actor] = {position, yaw} the round would use. */
  place(live){
   const v=this.view,m=v.match;
   if(m.phase!=='rest'||!(m.restSeconds>0)||m.result){if(this.active)this.end();return false;}
   if(!this.active)this.begin(live);
   const n=this.n=nominal(m.restSeconds,m.phaseTime);this.state=stateAt(n);if(this.log[this.log.length-1]?.state!==this.state)this.log.push({state:this.state,time:m.phaseTime});
   for(const actor of ['lion','rabbit'])this.placeFighter(actor,n,live[actor]);
   return true;
  }
  begin(live){
   this.active=true;this.log=[];this.shots={};this.layout();const e=this.view.engine;
   this.wide=e?.camera?this.wideShot(e.camera,e.cameraDirector?.freePose?.()):null;this.ropeSide=this.pickSides();this.layout();this.home={};
   for(const actor of ['lion','rabbit'])this.home[actor]={position:live[actor].position.clone(),yaw:live[actor].yaw};
   this.cornermen();for(const man of Object.values(this.men))this.borrow(man);this.last=null;
  }
  end(){
   this.active=false;this.state=null;
   for(const actor of ['lion','rabbit']){const p=this.props[actor];p.stool.visible=p.bottle.visible=false;if(p.held)p.held.visible=false;if(p.draped){p.draped.parent?.remove(p.draped);p.draped.geometry.dispose();p.draped=null;}}
   for(const man of Object.values(this.men))this.giveBack(man);
  }
  /** Cornerman on the rope side away from the break's wide shot (he stands behind his fighter's shoulder, not in front). */
  pickSides(){
   const v=this.view,cam=v.engine?.camera,w=this.wide;if(!cam&&!w)return {lion:0,rabbit:0};
   const at=w?V(w.lx+Math.sin(w.angle)*w.dist,w.cy,w.lz+Math.cos(w.angle)*w.dist):cam.getWorldPosition(V()),local=v.cast.worldToLocal(at),out={};
   for(const actor of ['lion','rabbit']){const [cx,cz]=CORNERS[actor].corner,a=V(-Math.sign(cx)*.6+cx,0,cz+Math.sign(cz)*.3),b=V(cx+Math.sign(cx)*.3,0,cz-Math.sign(cz)*.6);out[actor]=a.distanceTo(local)>b.distanceTo(local)?0:1;}
   return out;
  }
  placeFighter(actor,n,live){
   const c=this.view.coaches[actor],G=this.geo[actor],H=this.home[actor].position,yawH=this.home[actor].yaw,A=G.approach,R=G.seat;
   const out=A.clone().sub(H);out.y=0;const len=out.length(),walkYaw=len>.05?Math.atan2(out.x,out.z):G.inYaw;
   const back=H.clone().sub(A);back.y=0;const backYaw=back.length()>.05?Math.atan2(back.x,back.z):yawH;
   const u=span(n,T.walk),ub=span(n,T.walkBack),sit=span(n,T.sit)*(1-span(n,T.stand));
   let pos=H.clone().lerp(A,u),yaw=lerp(yawH,yawH+wrap(walkYaw-yawH),span(n,[0,.9]));
   if(n>=T.turn[0])yaw=walkYaw+wrap(G.inYaw-walkYaw)*span(n,T.turn);
   if(n>=T.sit[0]){pos=A.clone().lerp(R,smooth(sit*1.25));yaw=G.inYaw;}
   if(n>=T.walkBack[0]){pos=A.clone().lerp(H,ub);yaw=G.inYaw+wrap(backYaw-G.inYaw)*span(n,[T.walkBack[0],T.walkBack[0]+.6]);}
   if(n>=T.face[0])yaw=backYaw+wrap(yawH-backYaw)*span(n,T.face);
   const guard=1-span(n,T.guardDrop)+span(n,T.guard),g=clamp(guard);
   // into the round's own placement as the guard comes up, so the bell changes nothing
   if(live&&n>=T.guard[0]){pos.lerp(live.position,g);yaw=yaw+wrap(live.yaw-yaw)*g;}
   const walk=Math.max(span(n,[T.walk[0],T.walk[0]+.3])*(1-span(n,[T.walk[1]-.3,T.walk[1]])),span(n,[T.walkBack[0],T.walkBack[0]+.3])*(1-span(n,[T.walkBack[1]-.3,T.walkBack[1]])),.45*Math.sin(Math.PI*span(n,T.turn)),.45*Math.sin(Math.PI*span(n,T.face)));
   const dist=len*u+.35*span(n,T.turn)+back.length()*ub+.3*span(n,T.face);
   c.root.position.set(pos.x,0,pos.z);c.ringYaw=yaw;
   this.fighter=this.fighter||{};this.fighter[actor]={walk,dist,sit,guard:g};
  }
  /** Pose one fighter for the break (called instead of the guard pose). */
  pose(actor,options,time){
   const c=this.view.coaches[actor],f=this.fighter[actor],n=this.n,m=this.view.match;
   const drink=span(n,[T.drink[0]-.15,T.drink[0]+.35])*(1-span(n,[T.drink[1]-.2,T.drink[1]+.2])),gulp=drink*.08*Math.max(0,Math.sin((n-T.drink[0])*2.4));
   const man=this.men[actor],talk=span(n,T.talk)*(1-span(n,T.stand));
   let look={yaw:0,pitch:-.12*f.sit};
   if(man?.saved&&f.sit>.5){const p=c.root.worldToLocal(man.rig.joints.head.getWorldPosition(V()));look={yaw:clamp(Math.atan2(p.x,p.z),-.9,.9)*.6*talk,pitch:-.12+.05*talk};}
   look.pitch+=(.55+gulp)*drink;
   const st={t:m.time,walk:f.walk,dist:f.dist,sit:f.sit,guard:f.guard,lean:.18*f.sit*(1-drink)-.10*drink+.06*f.walk,yaw:look.yaw,pitch:look.pitch,nod:talk*.6,tired:1};
   return c.update(time,'guard','one_two',{...options,poseOverlay:rig=>fighterOverlay(rig,st)});
  }
  /** Props and cornermen, once both fighters are posed. */
  after(){
   if(!this.active)return;const v=this.view,n=this.n,m=v.match,dt=this.last!=null&&m.time>this.last?Math.min(.05,m.time-this.last):0;this.last=m.time;v.cast.updateMatrixWorld(true);
   for(const actor of ['lion','rabbit'])this.corner(actor,n,dt);
   // the referee waits in his neutral corner
   const ref=v.referee?.root;if(ref&&!v.gymFight){const w=span(n,[.3,1.9])*(1-span(n,[16.4,18.4])),to=V(1.24,0,-1.24);ref.position.lerp(to,w);ref.rotation.y=lerp(ref.rotation.y,Math.atan2(-to.x,-to.z),w);}
  }
  mouth(actor){const h=this.view.coaches[actor].joints.head;return this.view.cast.worldToLocal(h.localToWorld(V(0,-.035,.17)));}
  shoulders(actor){const c=this.view.coaches[actor],j=c.joints,w=b=>this.view.cast.worldToLocal(b.getWorldPosition(V()));return {L:w(j.armL),R:w(j.armR),neck:w(j.neck),chest:w(j.chest)};}
  corner(actor,n,dt){
   const G=this.geo[actor],p=this.props[actor],man=this.men[actor]?.saved?this.men[actor]:null,rig=man?.rig,cast=this.view.cast,ringless=this.ringless;
   // cornerman's feet: in from ringside, work at the ropes, back down
   const inU=span(n,T.cmIn),outU=span(n,T.cmOut),pos=G.Q.clone().lerp(G.P,inU).lerp(G.Q.clone().addScaledVector(G.side.out,.8),outU);
   const faceIn=Math.atan2(-G.side.out.x,-G.side.out.z),faceOut=wrap(faceIn+Math.PI);
   const towardYaw=(()=>{const d=G.P.clone().sub(G.Q);return Math.atan2(d.x,d.z);})();
   let yaw=n<T.cmIn[1]?towardYaw+wrap(faceIn-towardYaw)*span(n,[T.cmIn[1]-.5,T.cmIn[1]]):faceIn;if(n>=T.cmOut[0])yaw=faceIn+wrap(faceOut-faceIn)*span(n,[T.cmOut[0],T.cmOut[0]+.5]);
   const walk=Math.max(span(n,[T.cmIn[0],T.cmIn[0]+.3])*(1-span(n,[T.cmIn[1]-.3,T.cmIn[1]])),span(n,[T.cmOut[0]+.4,T.cmOut[0]+.7])*(1-span(n,[T.cmOut[1]-.3,T.cmOut[1]])));
   const dist=G.Q.distanceTo(G.P)*inU+G.P.distanceTo(G.Q.clone().addScaledVector(G.side.out,.8))*span(n,[T.cmOut[0]+.4,T.cmOut[1]]);
   const hands={},cm=rig?rig.root:null;
   if(cm){cm.position.set(pos.x,0,pos.z);cm.rotation.set(0,yaw,0);cm.visible=n<T.cmOut[1]+.6;cm.updateMatrixWorld(true);}
   const toRig=w=>cm?cm.worldToLocal(cast.localToWorld(w.clone())):null,fromRig=l=>cast.worldToLocal(cm.localToWorld(l.clone()));
   const lateral=V(Math.cos(yaw),0,-Math.sin(yaw));
   // ---- stool
   const lift=span(n,T.stoolIn),drop=clamp((n-T.stoolDrop[0])/(T.stoolDrop[1]-T.stoolDrop[0])),out=span(n,T.stoolOut),apex=ringless?.95:ROPE_TOP+SEAT+.07,release=ringless?SEAT+.05:SEAT+.24;
   const carry=()=>cm?fromRig(V(.31,.93,.06)).addScaledVector(lateral,.15).setY(.93):G.P.clone().setY(.93);
   const overRope=(from,to,u)=>{const top=G.cross?G.cross.clone().setY(apex):from.clone().lerp(to,.5).setY(apex);const a=smooth(u/.5),b=smooth((u-.5)/.5);return u<.5?from.clone().lerp(top,a).setY(lerp(from.y,apex,Math.sin(a*Math.PI/2))):top.clone().lerp(to,b).setY(lerp(apex,to.y,1-Math.cos(b*Math.PI/2)));};
   let stoolAt=null,stoolHeld=false;
   if(n<T.stoolIn[0]){stoolAt=carry();stoolHeld='carry';}
   else if(n<T.stoolDrop[0]){if(!p.liftFrom)p.liftFrom=carry();stoolAt=overRope(p.liftFrom,G.S.clone().setY(release),lift);stoolHeld='both';}
   else if(n<T.stoolOut[0]){stoolAt=G.S.clone().setY(release-(release-SEAT)*drop*drop);stoolHeld=false;}
   else{const up=span(n,[T.stoolOut[0],T.stoolOut[0]+.3]),u=span(n,[T.stoolOut[0]+.3,T.stoolOut[1]]),from=G.S.clone().setY(lerp(SEAT,release,up));stoolAt=u<=0?from:overRope(from,carry(),u);stoolHeld=up>0||u>0?(u>=1?'carry':'both'):false;}
   if(n<T.stoolIn[0]||n>=T.stoolOut[1])p.liftFrom=null;
   p.stool.visible=!!stoolAt&&(!!cm||n>=T.stoolDrop[0]&&n<T.stoolOut[0]+.3);
   if(stoolAt){p.stool.position.set(stoolAt.x,stoolAt.y-SEAT,stoolAt.z);p.stool.rotation.set(0,stoolHeld?yaw:G.inYaw,0);}
   if(cm&&stoolHeld==='both'){for(const s of [-1,1])hands[s<0?'L':'R']=toRig(stoolAt.clone().addScaledVector(lateral,s*(SEAT_R-.01)).add(V(0,.03,0)));}
   else if(cm&&stoolHeld==='carry')hands.R=null; // the carry gesture
   // ---- towel: held across the hands, draped over the fighter's shoulders, taken back
   const tOn=span(n,T.towel),tOff=span(n,T.towelOff);
   if(!p.held){p.held=this.heldTowel();this.root.add(p.held);}
   const sh=this.shoulders(actor),drapeAt=T.towel[0]+(T.towel[1]-T.towel[0])*.72,offAt=T.towelOff[0]+(T.towelOff[1]-T.towelOff[0])*.3;
   const draped=n>=drapeAt&&n<offAt;
   if(draped&&!p.draped)this.drape(actor);
   if(p.draped){p.draped.visible=draped;const settle=span(n,[drapeAt,drapeAt+.35]);p.draped.position.y=p.draped.userData.y+.05*(1-settle);}
   const heldShown=n>=T.towel[0]&&n<drapeAt||n>=offAt&&n<T.towelOff[1];
   p.held.visible=heldShown&&!!cm;
   if(heldShown&&cm){
    const over=sh.neck.clone().add(V(0,.16,0)),home=fromRig(V(0,1.42,.42)),u=n<drapeAt?span(n,[T.towel[0],drapeAt]):1-span(n,[offAt,T.towelOff[1]]),at=home.clone().lerp(over,u);if(G.cross&&u>.2&&u<.8)at.y=Math.max(at.y,ROPE_TOP+.25);
    p.held.position.copy(at);p.held.rotation.set(0,yaw,0);for(const s of [-1,1])hands[s<0?'L':'R']=toRig(at.clone().addScaledVector(lateral,s*.24));
   }
   // ---- bottle: from the bucket to the mouth and back
   const mouth=this.mouth(actor),bucketTop=G.bucket.clone().setY(.34);
   const bShown=n>=T.bottleDown[0]+.3&&n<T.bottleBack[1]-.25;p.bottle.visible=bShown&&(!!cm||n>=T.bottleUp[0]&&n<T.bottleBack[0]);
   let bottleAt=null,tilt=0;
   if(n>=T.bottleDown[0]&&n<T.bottleUp[0]){bottleAt=bucketTop;}
   else if(n>=T.bottleUp[0]&&n<T.drink[1]){const u=span(n,T.bottleUp);bottleAt=bucketTop.clone().lerp(mouth,u);if(G.cross)bottleAt.y=Math.max(bottleAt.y,lerp(bucketTop.y,ROPE_TOP+.2,Math.sin(u*Math.PI))*(u<.8?1:0)+bottleAt.y*(u<.8?0:1));tilt=1.9*span(n,[T.bottleUp[1]-.2,T.drink[0]+.3]);}
   else if(n>=T.drink[1]&&n<T.bottleBack[1]){const u=span(n,T.bottleBack);bottleAt=mouth.clone().lerp(bucketTop,u);tilt=1.9*(1-span(n,[T.bottleBack[0],T.bottleBack[0]+.3]));}
   if(bottleAt){
    const toward=mouth.clone().sub(cm?fromRig(V(0,1.5,0)):G.P.clone().setY(1.5));toward.y=0;toward.normalize();
    const axis=V(-toward.z,0,toward.x),q=new THREE.Quaternion().setFromAxisAngle(axis,-tilt);
    p.bottle.position.copy(bottleAt);p.bottle.quaternion.copy(q);
    if(cm)hands.R=toRig(V(0,-.12,0).applyQuaternion(q).add(bottleAt));
   }
   // ---- wipe and talk
   let talk=0,arms={L:'hang',R:'hang'},look=null;
   if(cm){
    const fh=cm.worldToLocal(this.view.coaches[actor].joints.head.getWorldPosition(V()));look={yaw:Math.atan2(fh.x,fh.z),pitch:Math.atan2(fh.y-1.75,Math.hypot(fh.x,fh.z))};
    if(n>=T.wipe[0]&&n<T.wipe[1]){const u=(n-T.wipe[0])/(T.wipe[1]-T.wipe[0]),brow=this.view.coaches[actor].joints.head.localToWorld(V(.05*Math.sin(u*Math.PI*5),.06,.16));hands.L=cm.worldToLocal(brow);}
    if(n>=T.talk[0]&&n<T.stand[0]){talk=1;arms={L:n<T.talk[0]+.9?'point':'open',R:'open'};hands.L=hands.L||null;}
    if(n<T.stoolIn[0]||stoolHeld==='carry')arms.R='carry';
   }
   if(rig){
    const reach={};for(const s of ['L','R'])if(hands[s])reach[s]=hands[s].toArray();
    // lean over the rope as far as the hands need to go, never through it
    let far=0;for(const s of ['L','R'])if(hands[s])far=Math.max(far,hands[s].z-.32);
    const low=Math.min(...['L','R'].map(s=>hands[s]?hands[s].y:2));
    const lean=clamp(far*1.2,0,.75)+clamp((1.05-low)*.9,0,.45);
    window.DreamPose.civil(rig,{t:this.view.match.time,dt,dist,walk,arms:{L:hands.L?'open':arms.L,R:hands.R?'open':arms.R},reach,look,lean,talk});
   }
  }
  heldTowel(){
   const pts=[V(-.24,0,0),V(-.12,.012,.01),V(0,.016,.012),V(.12,.012,.01),V(.24,0,0)],m=ribbon(pts,pts.map(()=>V(0,-1,.12)),.34,this.towelMaterial);
   m.geometry.translate(0,-.17,0);const g=new THREE.Group();g.add(m);g.name='Corner towel (held)';g.visible=false;return g;
  }
  /** The towel round the fighter's neck, built in his rig frame from his seated shoulders and carried by his chest. */
  drape(actor){
   const c=this.view.coaches[actor],j=c.joints,p=this.props[actor];c.root.updateMatrixWorld(true);
   const L=c.point(j.armL),R=c.point(j.armR),N=c.point(j.neck),Ch=c.point(j.chest);
   const pts=[L.clone().add(V(.09,-.42,.215)),L.clone().add(V(.07,-.17,.20)),L.clone().add(V(.06,.10,.05)),N.clone().add(V(-.06,-.02,-.14)),N.clone().add(V(.06,-.02,-.14)),R.clone().add(V(-.06,.10,.05)),R.clone().add(V(-.07,-.17,.20)),R.clone().add(V(-.09,-.42,.215))];
   const widths=[V(1,0,0),V(1,0,.1),V(1,.1,-.2),V(0,1,.3),V(0,1,.3),V(1,-.1,.2),V(1,0,-.1),V(1,0,0)];
   const mesh=ribbon(pts,widths,.21,this.towelMaterial);mesh.name='Corner towel (draped)';
   // rig frame -> chest frame
   const toChest=new THREE.Matrix4().copy(j.chest.matrixWorld).invert().multiply(c.root.matrixWorld);mesh.applyMatrix4(toChest);
   j.chest.add(mesh);mesh.userData.y=mesh.position.y;p.draped=mesh;mesh.userData.chest=Ch;
  }
  /** A camera pose for the break (camera-director): wide on both corners, then each corner in turn. */
  cameraGoal(camera,free){
   if(!this.active)return null;const v=this.view,n=this.n,toWorld=p=>v.cast.localToWorld(p.clone()),player=v.match.playerActor||'lion',other=player==='lion'?'rabbit':'lion';
   const shot=n<T.towel[0]||n>=T.stand[0]?'wide':n<T.wipe[0]?player:n<T.talk[1]-.6?other:player;
   if(shot==='wide'){if(!this.wide)this.wide=this.wideShot(camera,free);return {key:'break-wide',goal:this.wide};}
   if(!this.shots[shot])this.shots[shot]=this.cornerShot(shot,camera);return {key:'break-'+shot,goal:this.shots[shot]};
  }
  /** A corner seen from in front of the stool, high enough to look over the near ropes: the seated fighter and his
   *  cornerman both in the frame, apart from each other. */
  cornerShot(actor,camera){
   const v=this.view,W=p=>v.cast.localToWorld(p.clone()),G=this.geo[actor],seat=W(G.seat),front=W(G.seat.clone().addScaledVector(G.d,1)).sub(seat),dir=Math.atan2(front.x,front.z);
   const fighter=W(G.seat.clone().setY(1.35)),feet=W(G.seat.clone().addScaledVector(G.d,.42).setY(.05)),man=W(G.P.clone().setY(1.85)),look=seat.clone().lerp(W(G.P),.4),cam=camera.clone(),dist=4.7,cy=2.65;
   let best=null;
   const otherSeat=W(this.geo[actor==='lion'?'rabbit':'lion'].seat.clone().setY(1.2));
   for(let k=-14;k<=14;k++){const a=dir+k*.1;cam.position.set(look.x+Math.sin(a)*dist,cy,look.z+Math.cos(a)*dist);cam.lookAt(look.x,1.0,look.z);cam.updateMatrixWorld(true);cam.matrixWorldInverse.copy(cam.matrixWorld).invert();
    const f=fighter.clone().project(cam),m=man.clone().project(cam),b=feet.clone().project(cam);let score=Math.abs(k)*.05;
    if(Math.max(Math.abs(f.x),Math.abs(m.x))>.7||m.y>.55||b.y<-.75)score+=10;const sep=Math.abs(f.x-m.x);if(sep<.25)score+=4;if(sep>.9)score+=2;
    // never from inside or through the other corner (its fighter sits on the diagonal behind the camera)
    const flat=V(cam.position.x-otherSeat.x,0,cam.position.z-otherSeat.z).length(),o=otherSeat.clone().project(cam);if(flat<1.6||(o.z<1&&Math.abs(o.x)<1.1&&Math.abs(o.y)<1.1))score+=12;
    if(!best||score<best.score)best={score,a};}
   return {lx:look.x,ly:1.0,lz:look.z,angle:best.a,dist,cy};
  }
  /** The wide shot: the view of both corners closest to the player's own camera that keeps both stools in the frame,
   *  the referee out from between them and no seats or fittings in the way. */
  wideShot(camera,free){
   const v=this.view,W=p=>v.cast.localToWorld(p.clone()),red=W(this.geo.lion.seat.clone().setY(.9)),blue=W(this.geo.rabbit.seat.clone().setY(.9)),mid=red.clone().add(blue).multiplyScalar(.5);
   const ref=v.referee?.root?.getWorldPosition(V()).setY(1.2),cam=camera.clone(),ray=new THREE.Raycaster(),dist=8.5,cy=3.4,base=free?.angle??0;
   const own=new Set();for(const root of [v.cast,v.ring])root?.traverse(o=>own.add(o));
   let best=null;
   for(let k=-9;k<=9;k++){const a=base+k*.33;cam.position.set(mid.x+Math.sin(a)*dist,cy,mid.z+Math.cos(a)*dist);cam.lookAt(mid.x,.8,mid.z);cam.updateMatrixWorld(true);cam.matrixWorldInverse.copy(cam.matrixWorld).invert();
    const x=p=>p.clone().project(cam).x,rx=x(red),bx=x(blue);let score=Math.abs(wrap(a-base))*.4;
    if(Math.max(Math.abs(rx),Math.abs(bx))>.78)score+=10;if(Math.abs(rx-bx)<.45)score+=3;
    if(ref){const fx=x(ref);if(fx>Math.min(rx,bx)-.1&&fx<Math.max(rx,bx)+.1&&ref.distanceTo(cam.position)<mid.distanceTo(cam.position))score+=4;}
    if(v.engine?.scene)for(const p of [red,blue]){const d=p.clone().sub(cam.position),len=d.length();ray.set(cam.position,d.normalize());ray.far=len-.4;if(ray.intersectObjects(v.engine.scene.children,true).some(h=>h.object.visible!==false&&!own.has(h.object)))score+=8;}
    if(!best||score<best.score)best={score,a};}
   return {lx:mid.x,ly:.8,lz:mid.z,angle:best.a,dist,cy};
  }
  dispose(){this.end();this.root.traverse(o=>{if(o.isMesh){o.geometry.dispose();for(const m of [].concat(o.material)){m.map?.dispose();m.dispose();}}});this.root.parent?.remove(this.root);}
 }
 window.FightCorner={create:view=>new CornerBreak(view),CornerBreak,TIMELINE:T,STATES,NOMINAL,nominal,stateAt,SEAT,CORNERS};
})();
