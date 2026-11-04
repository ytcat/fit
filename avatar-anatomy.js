/* Authored muscle correctives and coordinated facial acting. Original local assets.
 * Anatomical regions deform the continuous skin/coat, never scale a whole bone.
 */
(() => {
 const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z),clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
 const bell=(x,c,r)=>Math.exp(-(((x-c)/r)**2));
 const api={
  install(mesh,coach,body){
   const g=mesh.geometry,p=g.attributes.position,n=g.attributes.normal,morph=[],normalDelta=[];
   const fur=Boolean(g.attributes.avatarFurFlex),deformed=body&&!fur?g.clone():null;
   for(let i=0;i<p.count;i++){
    const x=p.getX(i),y=p.getY(i),z=p.getZ(i),u=Math.abs(x),side=x<0?0:1;let delta=V(),channel=13;
    if(body){
     if(u>.32&&u<.68&&y>1.44&&y<1.79){
      channel=z>=0?side:4+side;
      const belly=bell(u,.48,.12)*bell(y,1.62,.10),front=z>=0?1:-1;
      delta.set(0,(y-1.62)*.055*belly,front*.017*belly*Math.min(1,Math.abs(z)/.045));
     }else if(u<.29&&y>1.44&&y<1.70&&z>.04){
      channel=2+side;delta.z=.015*bell(u,.13,.10)*bell(y,1.555,.075)*clamp((z-.04)/.07);
     }else if(u>.08&&u<.32&&y>.57&&y<.96){
      channel=6+side;delta.z=.013*bell(y,.77,.13)*clamp((z+.03)/.09);delta.x=Math.sign(x)*.005*bell(y,.76,.13);
     }else if(u>.10&&u<.30&&y>.22&&y<.53){
      channel=8+side;delta.z=-.011*bell(y,.38,.09)*clamp((.02-z)/.07);
     }else if(u<.28&&y>1.1&&y<1.47&&z>.04){
      channel=10;delta.z=.009*bell(x,0,.20)*bell(y,1.30,.18)*clamp((z-.04)/.06);
     }else if(u<.30&&y>1.28&&y<1.72&&z<-.035){
      channel=11;delta.z=-.012*bell(u,.17,.10)*bell(y,1.50,.15)*clamp((-z-.035)/.06);
     }else if(y>1.80&&y<2.00&&z>.13&&u<.145){
      channel=12;delta.y=-.020*bell(x,0,.11)*bell(y,1.88,.055)*clamp((z-.13)/.08)*clamp((y-1.80)/.04)*clamp((2-y)/.06);
     }
    }
    morph.push(delta.x,delta.y,delta.z,channel);
    if(deformed)deformed.attributes.position.setXYZ(i,x+delta.x,y+delta.y,z+delta.z);
   }
   if(deformed){deformed.computeVertexNormals();for(let i=0;i<p.count;i++)normalDelta.push(deformed.attributes.normal.getX(i)-n.getX(i),deformed.attributes.normal.getY(i)-n.getY(i),deformed.attributes.normal.getZ(i)-n.getZ(i));deformed.dispose();}
   else for(let i=0;i<p.count;i++)normalDelta.push(0,0,0);
   g.setAttribute('avatarMuscle',new THREE.Float32BufferAttribute(morph,4));g.setAttribute('avatarMuscleNormal',new THREE.Float32BufferAttribute(normalDelta,3));
   if(!coach.anatomy)coach.anatomy={value:new Float32Array(14)};
   for(const material of [mesh.material,mesh.customDepthMaterial,mesh.customDistanceMaterial]){
    const previous=material.onBeforeCompile,key=material.customProgramCacheKey;
    material.onBeforeCompile=shader=>{
     previous(shader);shader.uniforms.avatarActivation=coach.anatomy;
     shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nuniform float avatarActivation[14];attribute vec4 avatarMuscle;attribute vec3 avatarMuscleNormal;');
     shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed+=avatarMuscle.xyz*avatarActivation[int(avatarMuscle.w)];');
     shader.vertexShader=shader.vertexShader.replace('#include <beginnormal_vertex>','#include <beginnormal_vertex>\nobjectNormal=normalize(objectNormal+avatarMuscleNormal*avatarActivation[int(avatarMuscle.w)]);');
    };
    material.customProgramCacheKey=()=>key()+`-anatomy78-${fur}`;
   }
  },
  update(coach){
   if(!coach.anatomy)return;const a=coach.anatomy.value,j=coach.joints,m=coach.motionState||{},expression=coach.expression||{};
   for(const [i,side] of ['L','R'].entries()){
    const shoulder=coach.point(j['arm'+side]),elbow=coach.point(j['elbow'+side]),hand=coach.point(j['hand'+side]);
    const extension=clamp(elbow.clone().sub(shoulder).normalize().dot(hand.clone().sub(elbow).normalize())*.5+.5);
    const active=(side==='L'?m.left:m.right)||0;
    a[i]=clamp(.16+.80*(1-extension)+.18*active);a[4+i]=clamp(.1+.85*extension+.15*active);
    a[2+i]=clamp(.12+.78*active+.20*Math.abs(j.chest.rotation.y));
    const hip=coach.point(j['thigh'+side]),knee=coach.point(j['knee'+side]),foot=coach.point(j['foot'+side]);
    const kneeLoad=1-clamp(knee.clone().sub(hip).normalize().dot(foot.clone().sub(knee).normalize())*.5+.5);
    a[6+i]=clamp(.14+kneeLoad*1.2+(m.strike||0)*.45);a[8+i]=clamp(.12+Math.abs(j['foot'+side].rotation.x)*1.8+(m.strike||0)*.35);
   }
   const breath=.5+.5*Math.sin((coach.renderTime||0)*2.2);
   a[10]=clamp(.17+Math.abs(j.chest.rotation.y)*.55+(m.hurt||0)*.5+breath*.13);
   a[11]=clamp(.16+Math.abs(j.chest.rotation.y)*.55+(m.strike||0)*.32);
   a[12]=expression.jaw||0;a[13]=0;
  },
  deform(p,coach,index,g){const m=g.attributes.avatarMuscle;if(m&&coach.anatomy){const strength=coach.anatomy.value[m.getW(index)];p.x+=m.getX(index)*strength;p.y+=m.getY(index)*strength;p.z+=m.getZ(index)*strength;}return p;},
  express(coach,state){
   const {move,strike,hurt,hit,presentation,time}=state,head=coach.joints.head;
   if(!coach.faceActing){
    const inner=new THREE.Mesh(new THREE.SphereGeometry(1,32,16),new THREE.MeshStandardMaterial({color:0x201a1b,roughness:.92}));
    inner.material.color.convertSRGBToLinear();inner.position.set(0,.025,coach.species==='rabbit'?.247:.282);inner.scale.set(.039,.001,.007);inner.name='Reactive mouth interior';head.add(inner);
    const lip=coach.curve(head,[V(-.039,.017,inner.position.z+.001),V(0,.009,inner.position.z+.008),V(.039,.017,inner.position.z+.001)],coach.cream,.0026);lip.name='Animated lower lip';
    const marks=new Set(coach.damageMarks.map(x=>x.mark));
    const eyes=coach.facialRest.filter(x=>x.eye&&!marks.has(x.part));
    const brows=[];for(const part of head.children){if(!part.geometry||part.userData.eye||marks.has(part)||part===inner||part===lip)continue;part.geometry.computeBoundingBox();const c=part.geometry.boundingBox.getCenter(V()).multiply(part.scale).add(part.position);if(c.y>.18&&c.y<.235&&Math.abs(c.x)>.035&&Math.abs(c.x)<.15&&c.z>.12)brows.push({part,x:part.position.x,y:part.position.y,cx:c.x,cy:c.y,z:part.rotation.z,side:c.x<0?-1:1});}
    coach.faceActing={inner,lip,eyes,brows};
   }
   const focus=clamp(strike*.26+(['slip','roll','guard'].includes(move)?.10:0)),headHit=hit.part==='head',bodyHit=hit.part==='body';
   const jaw=clamp(hurt*(headHit?.70:bodyHit?.95:.10)+(strike||0)*.10+(1-(state.stamina??1))*.22);
   const blinkPhase=((time||0)%4.6),blink=blinkPhase>4.40?Math.sin((blinkPhase-4.40)/.20*Math.PI)**2:0;
   coach.expression={jaw,focus,headFlinch:headHit?hurt:0,bodyFlinch:bodyHit?hurt:0,side:hit.side||0};
   const face=coach.faceActing;face.inner.visible=jaw>.08;face.inner.scale.y=.001+.018*jaw;face.lip.position.y=-.018*jaw;
   for(const eye of face.eyes){const side=eye.part.position.x<0?-1:1,flinch=hurt*(headHit?(side===(hit.side||1)?.82:.42):bodyHit?.50:.15);eye.part.scale.y=eye.sy*Math.max(.12,1-Math.max(blink,focus+flinch));eye.part.position.z=eye.z;}
   for(const brow of face.brows){const angle=brow.side*(focus*.09-hurt*.07);brow.part.position.x=brow.x+brow.cx*(1-Math.cos(angle))+brow.cy*Math.sin(angle);brow.part.position.y=brow.y+brow.cy*(1-Math.cos(angle))-brow.cx*Math.sin(angle)+.003*(hurt-focus);brow.part.rotation.z=brow.z+angle;}
   for(const part of head.children)if(part.userData.tooth)part.visible=jaw>.5;
   coach.painMouth.visible=false;
   if(presentation?.mode==='winner'){face.inner.visible=false;face.lip.position.y=0;}
   return true;
  }
 };
 window.AvatarAnatomy=api;
})();
