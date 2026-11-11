/* GOTR-0032 impact accents on clean contact: a brief hit-stop (the scene's clock nearly halts for 50-70 ms),
   a slight camera kick on power shots, a small spray of sweat/dust at the contact point, and a deeper sound
   layer on power shots (index.html AudioEngine). Strength comes from the real contact impulse, scaled exactly
   like the power meter (power-meter.js). Nothing here changes poses, contacts, damage or scoring. */
(() => {
 const STRONG=.7,CLEAN=.35,COUNT=72,LIFE=.38;
 const clamp=x=>Math.max(0,Math.min(1,x));
 class ImpactFx {
  constructor(engine){
   this.engine=engine;this.stop=0;this.kick=null;this.offset=null;this.seed=1;
   const g=new THREE.BufferGeometry();this.pos=new Float32Array(COUNT*3);this.col=new Float32Array(COUNT*3);this.vel=new Float32Array(COUNT*3);this.age=new Float32Array(COUNT).fill(LIFE);this.next=0;
   g.setAttribute('position',new THREE.BufferAttribute(this.pos,3));g.setAttribute('color',new THREE.BufferAttribute(this.col,3));
   const m=new THREE.PointsMaterial({size:.022,vertexColors:true,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,sizeAttenuation:true});
   this.points=new THREE.Points(g,m);this.points.frustumCulled=false;this.points.visible=false;this.points.name='Impact spray';engine.scene?.add(this.points);
   const previous=engine.onImpact;engine.onImpact=hit=>{previous?.(hit);try{this.hit(hit);}catch(error){console.warn('impact fx',error);}};
  }
  random(){this.seed=(Math.imul(this.seed,1664525)+1013904223)>>>0;return this.seed/4294967296;}
  // Lessons and demos keep their exact tempo.
  get quiet(){const e=this.engine;return !!(e.fightIQDemo||typeof document!=='undefined'&&document.querySelector?.('.academy-lesson'));}
  hit(hit){
   const mode=this.engine.arena?.mode,value=window.PowerMeter?.power?.(hit,mode);if(value==null||value<CLEAN||this.quiet)return;
   // Hit-stop: 50 ms for a clean hit, up to 70 ms for a power shot.
   this.stop=Math.max(this.stop,.05+.02*clamp((value-CLEAN)/(1-CLEAN)));
   if(value>=STRONG)this.kick={t:0,amp:.010+.018*value,phase:this.random()*Math.PI*2};
   if(hit.point)this.spray(hit.point,hit.normal||hit.direction,value,hit.kind);
  }
  spray(point,normal,value,kind){
   const n=normal?new THREE.Vector3(...normal).normalize():new THREE.Vector3(0,1,0),count=Math.round(8+14*value),dust=kind==='bag';
   for(let k=0;k<count;k++){
    const i=this.next,j=i*3,s=.6+1.6*value*this.random();this.next=(i+1)%COUNT;
    this.pos[j]=point[0];this.pos[j+1]=point[1];this.pos[j+2]=point[2];
    // Out of the struck surface (against the blow), fanned, with a little lift.
    this.vel[j]=(n.x+(this.random()-.5)*1.4)*s;this.vel[j+1]=(n.y+.35+(this.random()-.5)*1.2)*s;this.vel[j+2]=(n.z+(this.random()-.5)*1.4)*s;this.age[i]=0;
    const c=dust?[.55,.50,.42]:[.75,.82,.90];this.col[j]=c[0];this.col[j+1]=c[1];this.col[j+2]=c[2];
   }
   this.points.visible=true;
  }
  // Scale applied to the engine's clock this frame (the hit-stop).
  timeScale(delta){if(!(this.stop>0))return 1;this.stop=Math.max(0,this.stop-Math.max(0,delta||0));return .08;}
  // Real-time effects, applied just before drawing and removed right after, so the camera director,
  // the side/front locks and the orbit controls keep their own camera state untouched.
  beforeRender(delta){
   const dt=Math.min(.05,Math.max(0,delta||0)),cam=this.engine.camera;
   if(this.points.visible){let alive=false;const p=this.pos,v=this.vel,c=this.col;
    for(let i=0;i<COUNT;i++){if(this.age[i]>=LIFE)continue;alive=true;const j=i*3,before=this.age[i];this.age[i]+=dt;const fade=Math.max(0,1-this.age[i]/LIFE)/Math.max(1e-3,1-before/LIFE);
     v[j+1]-=9.8*dt;for(let a=0;a<3;a++){p[j+a]+=v[j+a]*dt;v[j+a]*=.97;c[j+a]*=fade;}}
    if(!alive){this.points.visible=false;c.fill(0);}
    this.points.geometry.attributes.position.needsUpdate=true;this.points.geometry.attributes.color.needsUpdate=true;}
   if(this.kick&&cam){const k=this.kick;k.t+=dt;if(k.t>.16){this.kick=null;}else{
     const e=Math.exp(-k.t/.045)*Math.sin(k.t*95+k.phase)*k.amp,up=new THREE.Vector3(0,1,0).applyQuaternion(cam.quaternion),right=new THREE.Vector3(1,0,0).applyQuaternion(cam.quaternion);
     this.offset=up.multiplyScalar(e).addScaledVector(right,e*.6);cam.position.add(this.offset);cam.updateMatrixWorld();}}
   return !!(this.kick||this.points.visible);
  }
  afterRender(){const cam=this.engine.camera;if(this.offset&&cam){cam.position.sub(this.offset);cam.updateMatrixWorld();}this.offset=null;}
  get active(){return !!(this.kick||this.points.visible||this.stop>0);}
 }
 const api={ImpactFx};
 if(typeof module!=='undefined')module.exports=api;
 if(typeof window!=='undefined'){window.ImpactFx=api;
  if(typeof document!=='undefined'&&document.getElementById){const start=setInterval(()=>{const e=window.app?.engine;if(!e||!e.onImpact||!e.scene)return;clearInterval(start);e.impactFx=new ImpactFx(e);},250);}}
})();
