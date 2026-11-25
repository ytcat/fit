/* Underarm normal frame, local impact dents and bone-attached short fur. Local Three.js r128.
 * GOTR-0127 #5: the skinned armpit used to be projected onto an implicit chest+arm surface (3 Newton steps, up to 3.5 cm).
 * A projection collapses every point along a normal onto one surface, so the chest and arm skin on both sides of the pit
 * landed on the same sheet and crossed: folds and visible back faces (mop, uppercut, walk), and 9 cm "webs" across the
 * pit in the punches. Removed: the pit keeps the skinned, fold-free surface (max pit edge 3.4 cm over the punch set). */
(() => {
 const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z),clamp=x=>Math.max(0,Math.min(1,x)),smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
 const glsl=`
 attribute float avatarAxilla;
 uniform vec4 avatarDent;uniform vec3 avatarDentNormal;
 `;
 const normalFrame='(bindMatrixInverse*vec4(qrotate(coachQ,(bindMatrix*vec4(normal,0.0)).xyz),0.0)).xyz';
 const api={normalFrameShader:normalFrame,
  install(mesh,coach,body){
   const p=mesh.geometry.attributes.position,mask=[];
   for(let i=0;i<p.count;i++){
    const x=Math.abs(p.getX(i)),y=p.getY(i);
    mask.push(body?smooth((x-.18)/.07)*(1-smooth((x-.44)/.10))*smooth((y-1.34)/.09)*(1-smooth((y-1.67)/.10)):0);
   }
   mesh.geometry.setAttribute('avatarAxilla',new THREE.Float32BufferAttribute(mask,1));
   if(!coach.surfaceUniforms)coach.surfaceUniforms={dent:{value:new THREE.Vector4()},dentNormal:{value:V(0,0,1)},fur:{value:coach.bones.map(()=>V())}};
   for(const material of [mesh.material,mesh.customDepthMaterial,mesh.customDistanceMaterial]){
    const previous=material.onBeforeCompile;
    material.onBeforeCompile=shader=>{
     previous(shader);shader.uniforms.avatarFurDrift=coach.surfaceUniforms.fur;shader.uniforms.avatarDent=coach.surfaceUniforms.dent;shader.uniforms.avatarDentNormal=coach.surfaceUniforms.dentNormal;
     shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\n'+glsl+(mesh.geometry.attributes.avatarFurFlex?`\nuniform vec3 avatarFurDrift[${coach.bones.length}];attribute float avatarFurFlex;`:''));
     shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvec3 dentDelta=transformed-avatarDent.xyz;transformed-=avatarDentNormal*avatarDent.w*exp(-dot(dentDelta,dentDelta)/.012);');
     shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`vec3 avatarN=normalize(${normalFrame});\n${mesh.geometry.attributes.avatarFurFlex?'vec3 furDrift=vec3(0.0);for(int k=0;k<4;k++)furDrift+=skinWeight[k]*avatarFurDrift[int(skinIndex[k])];transformed+=furDrift*avatarFurFlex*avatarFurFlex;':''}\n${material===mesh.material?'#ifndef FLAT_SHADED\nif(avatarAxilla>.001)vNormal=normalize(normalMatrix*normalize(mix(objectNormal,avatarN,avatarAxilla)));\n#endif':''}\n#include <project_vertex>`);
    };
    material.customProgramCacheKey=()=>`animal-connected-r79-frame-${coach.bones.length}-${body}-${Boolean(mesh.geometry.attributes.avatarFurFlex)}`;
   }
   window.AvatarAnatomy?.install(mesh,coach,body);window.ShoulderCorrective?.install(mesh,coach,body);
  },
  update(coach){
   const u=coach.surfaceUniforms;if(!u)return;window.AvatarAnatomy?.update(coach);
   const dent=coach.surfaceDent;u.dent.value.set(dent?.point?.[0]||0,dent?.point?.[1]||0,dent?.point?.[2]||0,dent?.depth||0);if(dent?.normal)u.dentNormal.value.fromArray(dent.normal).normalize();
   const t=coach.renderTime,dt=t-coach.furTime,frame=coach.root.parent;
   if(dt!==0){
    const reset=!coach.furPrevious||!(dt>0&&dt<.2)||coach.furFrame!==frame?.uuid;coach.furFrame=frame?.uuid;coach.furPrevious=coach.furPrevious||coach.bones.map(()=>V());
    for(let i=0;i<coach.bones.length;i++){
     let pos=coach.bones[i].getWorldPosition(V());if(frame)pos=frame.worldToLocal(pos);
     if(reset)u.fur.value[i].set(0,0,0);else{
      const lag=pos.clone().sub(coach.furPrevious[i]).multiplyScalar(-.008/dt).applyQuaternion(coach.root.quaternion.clone().invert()).clampLength(0,coach.species==='rabbit'?.010:.006);
      u.fur.value[i].lerp(lag,1-Math.exp(-30*dt));
     }coach.furPrevious[i].copy(pos);
    }coach.furTime=t;
   }
   window.ShoulderCorrective?.update(coach);
  },
  addFur(coach){
   const source=coach.skin.geometry,p=source.attributes.position,n=source.attributes.normal,a=source.attributes.coachArmBlend;
   const positions=[],normals=[],attachments=[],flex=[],shoulderRoots=[];let seed=17831;
   const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
   // Mobile GPUs pay per transparent/overlapping fur triangle. Keep the
   // silhouette and body shader, while limiting short-coat microgeometry.
   const nav=typeof navigator==='undefined'?{}:navigator;
   const display=typeof screen==='undefined'?{width:Infinity,height:Infinity}:screen;
   const compact = /Android|iPhone|iPad|iPod/i.test(nav.userAgent||'') ||
     (nav.maxTouchPoints > 1 && Math.min(display.width,display.height) < 900);
   const count=coach.species==='rabbit'
     ? (compact ? 9000 : 32000)
     : (compact ? 7000 : 24000);
   for(let hair=0;hair<count;hair++){
    const i=Math.floor(rand()*p.count),root=V().fromBufferAttribute(p,i),normal=V().fromBufferAttribute(n,i);
    if((root.y>.70&&root.y<1.09)||Math.abs(root.x)>.86)continue;
    // GOTR-0050: no strands on downward-facing torso skin (under the pecs, armpit, lats): in shadow they read as dark smudges.
    if(normal.y<-.28&&root.y>1.2&&root.y<1.8&&Math.abs(root.x)<.5)continue;
    const face=root.y>1.79&&root.z>.12;const length=((coach.species==='rabbit'?.006:.003)+rand()*.005)*(face?.35:1),width=.0004+rand()*.0004;
    const across=normal.clone().cross(Math.abs(normal.y)>.9?V(1,0,0):V(0,1,0)).normalize().multiplyScalar(width);
    // Fur follows the resting anatomy, then existing bone/DQ deformation.
    const growth=Math.abs(root.x)>.32&&root.y>1.44?V(Math.sign(root.x),-.16,0):V(root.x*.12,-1,-.10);
    growth.addScaledVector(normal,-growth.dot(normal)).normalize();
    const tip=root.clone().addScaledVector(normal,length*.82).addScaledVector(growth,length*.56);
    const points=[root.clone().add(across),root.clone().sub(across),tip];
    for(let k=0;k<3;k++){positions.push(...points[k].toArray());normals.push(...normal.toArray());attachments.push(a.getX(i));flex.push(k===2?1:0);shoulderRoots.push(i);}
   }
   const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
   g.setAttribute('coachArmBlend',new THREE.Float32BufferAttribute(attachments,1));g.setAttribute('avatarFurFlex',new THREE.Float32BufferAttribute(flex,1));g.setAttribute('uv',new THREE.Float32BufferAttribute(positions.flatMap((v,i)=>i%3===2?[]:[v*3]),2));
   // Vertex colors already contain each species' coat; a warm multiplier
   // stains grey rabbit fur brown wherever fibers catch rim/bounce light.
   // Each hair keeps its root vertex: shoulder correctives and muscle relief follow the skin under it.
   g.userData.furRoots=new Uint32Array(shoulderRoots);if(coach.shoulderData)g.userData.shoulderRoots=g.userData.furRoots;
   const material=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:1,side:THREE.DoubleSide,skinning:true});
   coach.bodyFur=coach.skinned(g,material,true);coach.bodyFur.name='Bone-attached short animal coat';coach.bodyFur.castShadow=false;
  },
  dent(p,coach){const d=coach.surfaceUniforms?.dent.value;if(d?.w){const distance=(p.x-d.x)**2+(p.y-d.y)**2+(p.z-d.z)**2;p.addScaledVector(coach.surfaceUniforms.dentNormal.value,-d.w*Math.exp(-distance/.012));}return p;},
  correct(p,coach,index,g){
   const flex=g.attributes.avatarFurFlex?.getX(index)||0;
   if(flex){const ids=g.attributes.skinIndex,weights=g.attributes.skinWeight;for(let k=0;k<4;k++)p.addScaledVector(coach.surfaceUniforms.fur.value[ids.array[index*4+k]],weights.array[index*4+k]*flex*flex);}
   return window.ShoulderCorrective?.correct(p,coach,index,g)||p;
  }
 };
 window.AvatarSurface=api;
})();
