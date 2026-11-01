/* Original continuous-surface lion coach. Three.js r128, metres, +Z forward.
 * Authored kinematics, not a rigid-body simulation or motion-capture dataset.
 */
(function () {
  'use strict';
  const V = (x=0,y=0,z=0) => new THREE.Vector3(x,y,z);
  const clamp = (x,a=0,b=1) => Math.max(a,Math.min(b,x));
  const smooth = x => { x=clamp(x); return x*x*x*(x*(x*6-15)+10); };
  const lerp = (a,b,t) => a+(b-a)*t;
  const sequences = window.BOXING_ROUTINES?.sequences || {one_two:['jab','cross'],one_two_hook:['jab','cross','hook'],
    slip_cross:['slip','cross'],uppercut_flow:['uppercut','hook','cross']};
  let seed=48271;
  const random=()=>{seed=(seed*16807)%2147483647;return (seed-1)/2147483646;};

  function texture(kind) {
    const canvas=document.createElement('canvas'); canvas.width=canvas.height=256;
    const ctx=canvas.getContext('2d'); ctx.fillStyle='#999';ctx.fillRect(0,0,256,256);
    for(let i=0;i<12000;i++) {
      const n=Math.floor(100+random()*110);ctx.strokeStyle=`rgb(${n},${n},${n})`;
      const x=random()*256,y=random()*256;
      ctx.beginPath();ctx.moveTo(x,y);
      ctx.lineTo(x+(kind==='fur'?random()*2:1),y+(kind==='fur'?4+random()*10:1));ctx.stroke();
    }
    const t=new THREE.CanvasTexture(canvas); t.wrapS=t.wrapT=THREE.RepeatWrapping;
    t.repeat.set(kind==='fur'?4:6,kind==='fur'?4:6);return t;
  }

  function meshFrom(data,refine=false) {
    if(refine&&data.normal) {
      // Phong subdivision projects edge midpoints onto the two endpoint tangent
      // planes. Smooth silhouettes without subdividing a faceted linear surface.
      const p=data.position.slice(),n=data.normal.slice(),indices=[],edges=new Map();
      const midpoint=(a,b)=>{
        const key=Math.min(a,b)+':'+Math.max(a,b);if(edges.has(key))return edges.get(key);
        const va=V(...p.slice(a*3,a*3+3)),vb=V(...p.slice(b*3,b*3+3));
        const na=V(...n.slice(a*3,a*3+3)),nb=V(...n.slice(b*3,b*3+3));
        const m=va.clone().add(vb).multiplyScalar(.5);
        const pa=m.clone().addScaledVector(na,-m.clone().sub(va).dot(na));
        const pb=m.clone().addScaledVector(nb,-m.clone().sub(vb).dot(nb));
        m.lerp(pa.add(pb).multiplyScalar(.5),.75);
        const id=p.length/3;p.push(m.x,m.y,m.z);const normal=na.add(nb).normalize();n.push(normal.x,normal.y,normal.z);edges.set(key,id);return id;
      };
      for(let i=0;i<data.index.length;i+=3){const [a,b,c]=data.index.slice(i,i+3),ab=midpoint(a,b),bc=midpoint(b,c),ca=midpoint(c,a);indices.push(a,ab,ca,ab,b,bc,ca,bc,c,ab,bc,ca);}
      data={position:p,normal:n,index:indices};
    }
    const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.Float32BufferAttribute(data.position,3));g.setIndex(data.index);
    if(data.normal)g.setAttribute('normal',new THREE.Float32BufferAttribute(data.normal,3));
    else g.computeVertexNormals();
    const uv=[];
    for(let i=0;i<data.position.length;i+=3) uv.push(data.position[i]*2,data.position[i+1]*2);
    g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));return g;
  }

  // Joined, smooth leather volumes. Build once per coach; no external assets or
  // engines. The small thumb is joined to the palm instead of a separate finger.
  function leatherSurface(volumes,lo,hi,step=.012) {
    const field=p=>{
      let d=10;
      for(const [c,r,power=2] of volumes){
        const length=power===2?Math.hypot((p.x-c[0])/r[0],(p.y-c[1])/r[1],(p.z-c[2])/r[2]):Math.pow(Math.pow(Math.abs((p.x-c[0])/r[0]),power)+Math.pow(Math.abs((p.y-c[1])/r[1]),power)+Math.pow(Math.abs((p.z-c[2])/r[2]),power),1/power);
        const b=(length-1)*Math.min(...r);
        const h=Math.max(.018-Math.abs(d-b),0)/.018;
        d=Math.min(d,b)-h*h*.018*.25;
      }return d;
    };
    const corners=[[0,0,0],[1,0,0],[1,1,0],[0,1,0],[0,0,1],[1,0,1],[1,1,1],[0,1,1]];
    const tetra=[[0,5,1,6],[0,1,2,6],[0,2,3,6],[0,3,7,6],[0,7,4,6],[0,4,5,6]];
    const counts=hi.map((n,i)=>Math.ceil((n-lo[i])/step));
    const points=[],values=[],id=(x,y,z)=>(x*(counts[1]+1)+y)*(counts[2]+1)+z;
    for(let x=0;x<=counts[0];x++)for(let y=0;y<=counts[1];y++)for(let z=0;z<=counts[2];z++){
      const p=V(lo[0]+x*step,lo[1]+y*step,lo[2]+z*step);points.push(p);values.push(field(p));
    }
    const positions=[],normals=[];
    const normal=p=>{const e=.0001;return V(field(p.clone().add(V(e,0,0)))-field(p.clone().sub(V(e,0,0))),field(p.clone().add(V(0,e,0)))-field(p.clone().sub(V(0,e,0))),field(p.clone().add(V(0,0,e)))-field(p.clone().sub(V(0,0,e)))).normalize();};
    const triangle=(a,b,c)=>{
      if(b.clone().sub(a).cross(c.clone().sub(a)).dot(normal(a.clone().add(b).add(c).divideScalar(3)))<0)[b,c]=[c,b];
      for(const p of [a,b,c]){positions.push(...p.toArray());normals.push(...normal(p).toArray());}
    };
    for(let x=0;x<counts[0];x++)for(let y=0;y<counts[1];y++)for(let z=0;z<counts[2];z++){
      const ids=corners.map(c=>id(x+c[0],y+c[1],z+c[2]));
      if(ids.every(i=>values[i]>=0)||ids.every(i=>values[i]<0))continue;
      for(const t of tetra){
        const inside=t.filter(i=>values[ids[i]]<0),outside=t.filter(i=>values[ids[i]]>=0);
        const edge=(a,b)=>{a=ids[a];b=ids[b];return points[a].clone().lerp(points[b],values[a]/(values[a]-values[b]));};
        if(inside.length===1)triangle(...outside.map(b=>edge(inside[0],b)));
        else if(inside.length===3)triangle(...inside.map(b=>edge(outside[0],b)));
        else if(inside.length===2){const [a,b]=inside,[c,d]=outside,ac=edge(a,c),ad=edge(a,d),bc=edge(b,c),bd=edge(b,d);triangle(ac,ad,bc);triangle(ad,bd,bc);}
      }
    }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
    g.setAttribute('uv',new THREE.Float32BufferAttribute(positions.flatMap((v,i)=>i%3===2?[]:[v*3]),2));
    g.computeBoundingBox();return g;
  }

  class LionCoach {
    constructor(data,options={}) {
      this.species=options.species||'lion';
      this.root=new THREE.Group();this.root.name='Lion boxing coach';
      this.bones=[];this.joints={};this.metrics={};this.gloveMeshes={};
      const joint=(name,parent,p)=>{
        const b=new THREE.Bone();b.name=name;b.position.copy(p);parent.add(b);
        this.bones.push(b);this.joints[name]=b;return b;
      };
      const hips=joint('hips',this.root,V(0,.99,0));
      const spine=joint('spine',hips,V(0,.14,0));
      const chest=joint('chest',spine,V(0,.23,0));
      const neck=joint('neck',chest,V(0,.36,0));
      joint('head',neck,V(0,.12,0));
      for(const s of [-1,1]) {
        const side=s===-1?'L':'R';
        const arm=joint('arm'+side,chest,V(s*.30,.26,0));
        const elbow=joint('elbow'+side,arm,V(s*.24,-.26,0));
        joint('hand'+side,elbow,V(s*.11,-.29,0));
        const thigh=joint('thigh'+side,hips,V(s*.15,0,0));
        const knee=joint('knee'+side,thigh,V(s*.03,-.43,0));
        joint('foot'+side,knee,V(s*.01,-.44,0));
      }
      this.root.updateMatrixWorld(true);
      this.rest=this.bones.map(b=>b.getWorldPosition(V()));
      const endpoint={hips:V(0,1.13,0),spine:V(0,1.36,0),chest:V(0,1.69,0),
        neck:V(0,1.84,0),head:V(0,2.21,.04)};
      this.segments=this.bones.map((b,i)=>({a:this.rest[i],
        b:endpoint[b.name] || (b.children.find(c=>c.isBone)?.getWorldPosition(V())) || this.rest[i],i}));
      this.skeleton=new THREE.Skeleton(this.bones);
      this.dqReal=this.bones.map(()=>new THREE.Vector4(0,0,0,1));
      this.dqDual=this.bones.map(()=>new THREE.Vector4(0,0,0,0));
      const fur=texture('fur'), grain=texture('leather');
      const skin=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.94,
        bumpMap:fur,bumpScale:.0025,skinning:true});
      const cloth=new THREE.MeshStandardMaterial({color:this.species==='rabbit'?0x134c55:0x152635,roughness:.61,
        bumpMap:grain,bumpScale:.0015,skinning:true});
      this.skin=this.skinned(this.sculptBody(meshFrom(data.body,true)),skin,true);
      this.shorts=this.skinned(meshFrom(data.shorts,true),cloth,false);
      this.gold=new THREE.MeshStandardMaterial({color:0xd8b56c,metalness:.38,roughness:.43});
      this.leather=new THREE.MeshStandardMaterial({color:this.species==='rabbit'?0x2758c1:0xad2529,roughness:.42,
        bumpMap:grain,bumpScale:.001,metalness:.05});
      this.black=new THREE.MeshStandardMaterial({color:0x131518,roughness:.44});
      this.cream=new THREE.MeshStandardMaterial({color:0xc9b491,roughness:.9});
      const waistband=new THREE.Mesh(new THREE.CylinderGeometry(.244,.249,.061,64,1,true),this.gold);
      waistband.scale.z=.73;waistband.position.y=.098;hips.add(waistband);
      this.addLabel(hips,'SHADOW',V(0,.098,.184),.19,.043);
      const gloveGeometry=leatherSurface([
        [[-.008,-.135,-.026],[.094,.069,.074],3.2], // broad MCP knuckle face
        [[0,-.126,.041],[.079,.051,.040]], // fingers curl behind the striking pad
        [[0,-.065,.008],[.076,.069,.056]],
        [[-.072,-.085,.045],[.029,.047,.032]], // attached, tucked thumb
        [[0,-.010,0],[.063,.043,.058]]
      ],[-.115,-.24,-.10],[.105,.07,.105],.010);
      for(const s of [-1,1]) {
        const side=s===-1?'L':'R',hand=this.joints['hand'+side];
        const glove=new THREE.Mesh(gloveGeometry.clone(),this.leather);glove.name='Boxing glove';
        if(s===1) glove.scale.x=-1;
        hand.add(glove);glove.castShadow=true;
        this.gloveMeshes[side]=glove;glove.userData.restPosition=new Float32Array(glove.geometry.attributes.position.array);
        glove.userData.restNormal=new Float32Array(glove.geometry.attributes.normal.array);glove.userData.pressure=0;
        const cuff=new THREE.Mesh(new THREE.CylinderGeometry(.070,.071,.062,32),this.black);
        cuff.position.y=.014;hand.add(cuff);
        // Branding belongs on the back of the glove, opposite its palm/thumb pad.
        this.addLabel(hand,'SB',V(0,-.090,-.095),.055,.032).rotation.y=Math.PI;
        this.curve(hand,[V(-.059,-.035,-.048),V(0,-.027,-.069),V(.059,-.035,-.048)],this.cream,.0012);
        this.curve(glove,[V(-.079,-.039,.047),V(-.093,-.073,.063),V(-.073,-.125,.073)],this.leather,.0018);
        this.curve(hand,[V(-.065,.035,0),V(0,.038,-.069),V(.065,.035,0)],this.gold,.0018);
        this.addBoot(this.joints['foot'+side]);
        // Satin side piping follows each thigh, rather than floating beside it.
        this.curve(this.joints['thigh'+side],[V(s*.125,.055,.075),V(s*.15,-.10,.08),V(s*.15,-.25,.08)],this.gold,.006);
      }
      if(this.species==='rabbit')this.addRabbitFace();else {this.addFace();this.addMane();}
      // Adult athletic proportions: reduce skull/face size consistently with the
      // sculpted skin while retaining a broad lion mane around the neck.
      this.joints.head.children.forEach(part=>{part.position.multiplyScalar(.90);part.scale.multiplyScalar(.90);});
      this.tail=new THREE.Group();hips.add(this.tail);
      if(this.species!=='rabbit')this.curve(this.tail,[V(0,-.02,-.16),V(.1,-.2,-.32),V(.16,-.45,-.40),V(.23,-.54,-.29)],
        new THREE.MeshStandardMaterial({color:0x9d713f,roughness:1}),.022);
      const tip=this.ellipsoid(this.tail,new THREE.MeshStandardMaterial({color:0x44301d,roughness:1}),V(.23,-.54,-.29),V(.04,.075,.04));
      tip.rotation.z=-.6;
      if(this.species==='rabbit'){this.tail.clear();this.ellipsoid(this.tail,this.cream,V(0,-.11,-.18),V(.085,.085,.08));}
      const convertedMaterials=new Set();
      this.root.traverse(n=>{if(n.isMesh){
        if(n.material.color&&!convertedMaterials.has(n.material)) {
          n.material.color.convertSRGBToLinear();convertedMaterials.add(n.material);
        }
        n.castShadow=true;n.receiveShadow=true;
      }});
      this.update(0,'combo','one_two');
    }

    sculptBody(g) {
      // Small continuous anatomical contours in the existing rest surface, so
      // pectorals, abdomen, obliques and shoulder blades deform with the skin.
      const p=g.attributes.position;
      const bell=(v,c,r)=>Math.exp(-(((v-c)/r)**2));
      for(let i=0;i<p.count;i++) {
        let x=p.getX(i),y=p.getY(i),z=p.getZ(i);
        if(Math.abs(x)<.30&&y>1.12&&y<1.70) {
          const edge=bell(x,0,.27),front=smooth((z-.04)/.09),back=smooth((-z-.04)/.08);
          const abs=(bell(x,.070,.045)+bell(x,-.070,.045))*(bell(y,1.22,.045)+bell(y,1.32,.045)+bell(y,1.41,.042));
          const pec=(bell(x,.14,.095)+bell(x,-.14,.095))*bell(y,1.54,.075);
          const blades=(bell(x,.15,.07)+bell(x,-.15,.07))*bell(y,1.53,.12);
          const serratus=bell(Math.abs(x),.225,.038)*(bell(y,1.37,.022)+bell(y,1.435,.022)+bell(y,1.495,.020));
          z+=front*(.020*abs+.032*pec+.009*serratus-.008*bell(x,0,.018)*bell(y,1.40,.25))*edge;
          z-=back*(.024*blades-.010*bell(x,0,.025)*bell(y,1.45,.24))*edge;
          x+=Math.sign(x)*.008*bell(Math.abs(x),.19,.06)*bell(y,1.28,.15);
          x*=1+.070*bell(y,1.56,.14)-.035*bell(y,1.22,.12);
        }
        // Rounded quadriceps and calf bellies, tapered at the knee and ankle.
        if(y<.95&&y>.20&&Math.abs(x)>.08&&Math.abs(x)<.32) {
          const quad=.012*bell(y,.78,.13)+.006*bell(y,.68,.055)*bell(Math.abs(x),.15,.04);
          z+=quad*smooth((z+.015)/.08);
          z-=.010*bell(y,.40,.10)*smooth((-z+.005)/.06);
        }
        if(Math.abs(x)>.33&&y>1.20&&y<1.60) {
          z+=.016*bell(y,1.46,.09)*smooth((z+.025)/.08);
          z-=.012*bell(y,1.43,.10)*smooth((-z+.025)/.08);
        }
        if(y>1.76){const amount=.10*smooth((y-1.76)/.10);x*=1-amount;z*=1-amount;y=1.84+(y-1.84)*(1-amount);}
        if(this.species==='rabbit'&&y>1.78){const a=smooth((y-1.78)/.10);x*=1-.13*a;z*=1-.24*a; if(y>2.075&&Math.abs(x)>.12)y-=.06*smooth((Math.abs(x)-.12)/.03);}
        p.setXYZ(i,x,y,z);
      }
      p.needsUpdate=true;g.computeVertexNormals();return g;
    }

    skinned(g,material,colour) {
      const positions=g.attributes.position, ids=[],weights=[],colors=[];
      const tawny=new THREE.Color(this.species==='rabbit'?'#939ba7':'#b98143').convertSRGBToLinear(), light=new THREE.Color(this.species==='rabbit'?'#f0e9df':'#e1cda1').convertSRGBToLinear();
      for(let i=0;i<positions.count;i++) {
        const p=V().fromBufferAttribute(positions,i);
        const influences=new Map();
        const put=(name,w)=>influences.set(this.bones.indexOf(this.joints[name]),w);
        const mix=(a,b,t,w=1)=>{put(a,(1-t)*w);put(b,t*w);};
        if(p.y>1.76) {
          mix('neck','head',smooth((p.y-1.76)/.12));
        } else if(p.y<1.06 && Math.abs(p.x)<.32) {
          const side=p.x<0?'L':'R',thigh=smooth((1.06-p.y)/.14);
          if(p.y>.64)mix('hips','thigh'+side,thigh);
          else if(p.y>.24)mix('thigh'+side,'knee'+side,smooth((.65-p.y)/.16));
          else mix('knee'+side,'foot'+side,smooth((.24-p.y)/.13));
        } else {
          const arm=smooth((Math.abs(p.x)-.235)/.115)*smooth((1.79-p.y)/.14);
          if(p.y<1.28)mix('hips','spine',smooth((p.y-1.06)/.18),1-arm);
          else if(p.y<1.67)mix('spine','chest',smooth((p.y-1.28)/.22),1-arm);
          else mix('chest','neck',smooth((p.y-1.67)/.12),1-arm);
          if(arm>0) {
            const side=p.x<0?'L':'R';
            const s=p.x<0?-1:1;
            const along=(p.x-s*.54)*s*.355-(p.y-1.36)*.935;
            mix('arm'+side,'elbow'+side,smooth((along+.055)/.11),arm);
          }
        }
        const entries=[...influences].filter(([,w])=>w>0);
        while(entries.length<4)entries.push([0,0]);
        ids.push(...entries.map(([i])=>i));weights.push(...entries.map(([,w])=>w));
        if(colour) {
          const face=p.y>1.82 && p.z>.175;
          const muzzle=face && p.y<1.954 ? smooth((p.z-.18)*14) : 0;
          const bib=p.z>.08&&p.y>1.13&&p.y<1.70 ? .48*Math.exp(-((p.x/.16)**2))*smooth((p.y-1.13)/.12)*smooth((1.70-p.y)/.10) : 0;
          const c=tawny.clone().lerp(light,Math.max(muzzle,bib));
          c.multiplyScalar(1+.04*Math.sin(p.y*110+p.x*56)*Math.sin(p.z*143));
          c.multiplyScalar(1-.13*smooth((-p.z-.03)/.15));
          // Tonal separation at real sculpted muscle boundaries, following the
          // skinned surface rather than floating linework on top of the body.
          if(p.z>.09&&p.y>1.15&&p.y<1.66&&Math.abs(p.x)<.28){
            const groove=Math.exp(-(((p.y-1.465)/.018)**2))*Math.exp(-(((Math.abs(p.x)-.13)/.14)**2));
            c.multiplyScalar(1-.12*groove);
          }
          colors.push(c.r,c.g,c.b);
        }
      }
      g.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(ids,4));
      g.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weights,4));
      if(colour)g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
      const m=new THREE.SkinnedMesh(g,material);this.root.add(m);m.bind(this.skeleton);
      // Dual-quaternion skinning preserves elbow/shoulder volume when a straight
      // rest arm folds into a tight guard. Linear matrix blends collapse the joint.
      const skinShader=shader=>{
        shader.uniforms.coachReal={value:this.dqReal};
        shader.uniforms.coachDual={value:this.dqDual};
        shader.vertexShader=shader.vertexShader.replace('#include <common>',`#include <common>
          uniform vec4 coachReal[${this.bones.length}];
          uniform vec4 coachDual[${this.bones.length}];
          vec4 coachQ, coachD;
          vec4 qmul(vec4 a, vec4 b) {
            return vec4(a.w*b.xyz+b.w*a.xyz+cross(a.xyz,b.xyz),a.w*b.w-dot(a.xyz,b.xyz));
          }
          vec3 qrotate(vec4 q,vec3 p) {return p+2.0*cross(q.xyz,cross(q.xyz,p)+q.w*p);}
          void coachBlend() {
            vec4 q0=coachReal[int(skinIndex.x)];
            coachQ=vec4(0.0);coachD=vec4(0.0);
            for(int k=0;k<4;k++) {
              int i=int(skinIndex[k]);
              float signQ=dot(q0,coachReal[i])<0.0?-1.0:1.0;
              coachQ+=coachReal[i]*(skinWeight[k]*signQ);
              coachD+=coachDual[i]*(skinWeight[k]*signQ);
            }
            float n=length(coachQ);coachQ/=n;coachD/=n;
            coachD-=coachQ*dot(coachQ,coachD);
          }`);
        // Run before both normal and position transforms, including shadow passes.
        shader.vertexShader=shader.vertexShader.replace('#include <skinbase_vertex>','coachBlend();');
        shader.vertexShader=shader.vertexShader.replace('#include <skinnormal_vertex>',`
          objectNormal=(bindMatrixInverse*vec4(qrotate(coachQ,(bindMatrix*vec4(objectNormal,0.0)).xyz),0.0)).xyz;
          #ifdef USE_TANGENT
            objectTangent=(bindMatrixInverse*vec4(qrotate(coachQ,(bindMatrix*vec4(objectTangent,0.0)).xyz),0.0)).xyz;
          #endif`);
        shader.vertexShader=shader.vertexShader.replace('#include <skinning_vertex>',`
          vec3 coachP=(bindMatrix*vec4(transformed,1.0)).xyz;
          vec3 coachT=2.0*qmul(coachD,vec4(-coachQ.xyz,coachQ.w)).xyz;
          transformed=(bindMatrixInverse*vec4(qrotate(coachQ,coachP)+coachT,1.0)).xyz;`);
      };
      material.onBeforeCompile=skinShader;
      material.customProgramCacheKey=()=>`lion-dq-${this.bones.length}`;
      m.customDepthMaterial=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking,skinning:true});
      m.customDistanceMaterial=new THREE.MeshDistanceMaterial({skinning:true});
      for(const shadowMaterial of [m.customDepthMaterial,m.customDistanceMaterial]) {
        shadowMaterial.onBeforeCompile=skinShader;
        shadowMaterial.customProgramCacheKey=material.customProgramCacheKey;
      }
      // Pose changes extend beyond the rest-pose bounding sphere.
      m.frustumCulled=false;return m;
    }

    ellipsoid(parent,material,p,scale) {
      const m=new THREE.Mesh(new THREE.SphereGeometry(1,32,24),material);
      m.position.copy(p);m.scale.copy(scale);parent.add(m);return m;
    }
    curve(parent,points,material,r=.003) {
      const path=new THREE.CatmullRomCurve3(points);
      const m=new THREE.Mesh(new THREE.TubeGeometry(path,24,r,5,false),material);parent.add(m);return m;
    }
    addLabel(parent,text,p,w,h) {
      const c=document.createElement('canvas');c.width=256;c.height=64;
      const ctx=c.getContext('2d');ctx.fillStyle='#dbc186';ctx.font='bold 39px sans-serif';
      ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,128,32);
      const map=new THREE.CanvasTexture(c);map.encoding=THREE.sRGBEncoding;
      const label=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshStandardMaterial({map,transparent:true,roughness:.7}));
      label.position.copy(p);parent.add(label);return label;
    }
    addBoot(foot) {
      const shape=new THREE.Shape();
      shape.moveTo(-.062,-.108);shape.lineTo(-.078,.055);
      shape.quadraticCurveTo(-.097,.177,-.061,.205);
      shape.quadraticCurveTo(0,.229,.061,.205);
      shape.quadraticCurveTo(.097,.177,.078,.055);shape.lineTo(.062,-.108);
      shape.quadraticCurveTo(0,-.126,-.062,-.108);
      const sole=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:.018,bevelEnabled:true,bevelSize:.004,bevelThickness:.004,bevelSegments:3,steps:1}),this.cream);
      sole.name='Boxing boot sole';sole.rotation.x=Math.PI/2;sole.position.y=-.080;foot.add(sole);
      if(!this.bootGeometry)this.bootGeometry=leatherSurface([
        [[0,-.033,.091],[.084,.053,.123]],
        [[0,-.027,-.042],[.067,.060,.070]],
        [[0,.016,.023],[.068,.086,.078]],
        [[0,.025,-.025],[.067,.070,.065]]
      ],[-.10,-.10,-.13],[.10,.22,.23]);
      const upper=new THREE.Mesh(this.bootGeometry,this.black);upper.name='Boxing boot upper';foot.add(upper);
      const ankle=new THREE.Group();foot.add(ankle);foot.userData.bootAnkle=ankle;
      const shaft=new THREE.Mesh(new THREE.CylinderGeometry(.094,.074,.19,40,1,true),this.black);
      shaft.name='Boxing boot ankle';shaft.position.set(0,.095,-.014);shaft.scale.z=1.05;ankle.add(shaft);
      this.curve(ankle,[V(-.094,.19,-.014),V(0,.19,.085),V(.094,.19,-.014)],this.black,.004);
      // Tongue and crossed laces follow the sloping instep and ankle shaft.
      for(let i=0;i<8;i++) {
        const y=-.007+i*.023,z=i<3?.137-i*.029:.070+(i-3)*.002;
        const parent=i<3?foot:ankle;
        this.curve(parent,[V(-.032,y,z),V(.032,y+.016,z-.006)],this.cream,.0020);
        this.curve(parent,[V(.032,y,z),V(-.032,y+.016,z-.006)],this.cream,.0020);
        for(const s of [-1,1])this.ellipsoid(parent,this.gold,V(s*.033,y,z),V(.004,.004,.002));
      }
      for(const s of [-1,1])this.curve(ankle,[V(s*.088,.17,-.014),V(s*.079,.08,.005),V(s*.074,.01,.035)],this.black,.003);
    }
    addRabbitFace() {
      const head=this.joints.head,white=new THREE.MeshStandardMaterial({color:0xe6e2dc,roughness:.9,bumpMap:this.skin.material.bumpMap,bumpScale:.0015});
      const grey=new THREE.MeshStandardMaterial({color:0x939ba7,roughness:.94,bumpMap:this.skin.material.bumpMap,bumpScale:.0015});
      const pink=new THREE.MeshStandardMaterial({color:0xbb8186,roughness:.85});
      const eye=new THREE.MeshPhysicalMaterial({color:0x201715,roughness:.20,clearcoat:.65});
      this.rabbitEars=[];
      for(const s of [-1,1]){
        const ear=new THREE.Group();ear.position.set(s*.085,.235,-.012);head.add(ear);this.rabbitEars.push(ear);
        this.ellipsoid(ear,grey,V(0,.20,0),V(.064,.255,.042));
        this.ellipsoid(ear,pink,V(0,.205,.034),V(.036,.207,.013));
        this.ellipsoid(head,eye,V(s*.079,.17,.147),V(.030,.025,.021));
        this.ellipsoid(head,white,V(s*.073,.093,.213),V(.081,.065,.068));
        this.ellipsoid(head,white,V(s*.019,.035,.249),V(.016,.025,.010));
        this.ellipsoid(head,new THREE.MeshBasicMaterial({color:0xffffff}),V(s*.075,.18,.165),V(.006,.006,.003));
        this.curve(head,[V(s*.048,.208,.143),V(s*.085,.216,.139),V(s*.114,.195,.124)],grey,.008);
        for(let i=0;i<3;i++)this.curve(head,[V(s*.057,.095-i*.017,.271),V(s*.16,.10-i*.017,.29),V(s*.23,.12-i*.025,.27)],white,.0009);
      }
      this.ellipsoid(head,pink,V(0,.112,.273),V(.029,.020,.019));
      const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute([],3));
      this.mane=new THREE.Mesh(g,grey);this.maneRest=[];this.maneFlex=[];
    }
    addFace() {
      const head=this.joints.head;
      const wet=new THREE.MeshPhysicalMaterial({color:0x231c18,roughness:.24,clearcoat:.7});
      const amber=new THREE.MeshPhysicalMaterial({color:0xb58b39,roughness:.19,clearcoat:1});
      for(const s of [-1,1]) {
        this.ellipsoid(head,wet,V(s*.091,.171,.176),V(.035,.022,.025));
        this.ellipsoid(head,amber,V(s*.091,.171,.195),V(.022,.015,.010));
        this.ellipsoid(head,this.black,V(s*.091,.171,.204),V(.009,.013,.004));
        this.ellipsoid(head,new THREE.MeshBasicMaterial({color:0xfff5df}),V(s*.085,.177,.208),V(.003,.003,.002));
        this.curve(head,[V(s*.053,.18,.191),V(s*.09,.195,.190),V(s*.127,.177,.174)],wet,.004);
        this.ellipsoid(head,new THREE.MeshStandardMaterial({color:0x705037,roughness:1}),V(s*.164,.265,.025),V(.044,.050,.014));
        this.ellipsoid(head,this.black,V(s*.164,.265,-.044),V(.048,.053,.011));
        this.curve(head,[V(s*.058,.154,.196),V(s*.092,.151,.203),V(s*.119,.159,.184)],wet,.0025);
        this.curve(head,[V(s*.055,.218,.175),V(s*.090,.225,.167),V(s*.127,.205,.149)],wet,.004);
        this.curve(head,[V(0,.051,.300),V(s*.035,.015,.287),V(s*.094,.024,.269)],wet,.003);
        for(let i=0;i<7;i++) {
          const y=.044+(i%3)*.016,x=s*(.052+Math.floor(i/3)*.017);
          this.ellipsoid(head,wet,V(x,y,.292-Math.abs(x)*.12),V(.002,.002,.002));
          if(i<4) this.curve(head,[V(x,y,.294),V(s*.16,y+.005,.31),V(s*(.23+i*.012),y+.02-i*.013,.31)],this.cream,.0007);
        }
      }
      const nose=this.ellipsoid(head,wet,V(0,.103,.291),V(.057,.033,.026));
      const a=nose.geometry.attributes.position;
      for(let i=0;i<a.count;i++)a.setX(i,a.getX(i)*(.6+.4*(a.getY(i)+1)/2));
      a.needsUpdate=true;nose.geometry.computeVertexNormals();
      this.curve(head,[V(0,.08,.312),V(0,.051,.301)],wet,.003);
    }
    addMane() {
      const positions=[],colors=[],flex=[],head=this.joints.head;
      const undercoat=this.ellipsoid(head,new THREE.MeshStandardMaterial({color:0x51351e,roughness:1,
        bumpMap:texture('fur'),bumpScale:.003}),V(0,.065,-.065),V(.295,.355,.210));
      const surface=undercoat.geometry.attributes.position;
      for(let i=0;i<surface.count;i++) {
        const x=surface.getX(i),y=surface.getY(i),z=surface.getZ(i);
        const r=1+.025*Math.sin(x*17+y*11)*Math.sin(z*13-y*9);
        surface.setXYZ(i,x*r,y*r,z*r);
      }
      surface.needsUpdate=true;undercoat.geometry.computeVertexNormals();
      // Distribute roots over the whole ellipsoid, including the occiput.
      // The previous cylindrical ring left a bare oval on the rear of the skull.
      for(let i=0;i<3200;i++) {
        const a=i*2.399963229728653,nz=-1+1.70*(i+.5)/3200,r=Math.sqrt(1-nz*nz);
        const normal=V(Math.cos(a)*r,Math.sin(a)*r,nz);
        const center=V(normal.x*.295,.065+normal.y*.355,-.065+normal.z*.210);
        if(center.z>.025&&Math.abs(center.x)<.165&&center.y>-.03&&center.y<.29)continue;
        const length=.055+random()*.055+Math.max(0,-normal.y)*.065;
        const width=.004+random()*.004;
        const outward=normal.clone().multiplyScalar(.85).add(V(normal.x*.18,-.40,-.12)).normalize();
        const across=outward.clone().cross(Math.abs(outward.y)>.9?V(1,0,0):V(0,1,0)).normalize().multiplyScalar(width);
        const colour=new THREE.Color().setHSL(.070+random()*.035,.42+random()*.18,.10+random()*.19);
        for(let j=0;j<3;j++) {
          const point=t=>center.clone().addScaledVector(outward,length*t).add(V(.005*Math.sin(a*11+t*4),-.027*t*t,-.018*t*t));
          const t0=j/3,t1=(j+1)/3,p=point(t0),q=point(t1);
          const p0=p.clone().addScaledVector(across,1-t0),p1=p.clone().addScaledVector(across,-(1-t0));
          const q0=q.clone().addScaledVector(across,1-t1),q1=q.clone().addScaledVector(across,-(1-t1));
          flex.push(t0,t0,t1,t0,t1,t1);
          for(const v of [p0,p1,q0,p1,q1,q0]) {
            positions.push(v.x,v.y,v.z);const linear=colour.clone().convertSRGBToLinear();colors.push(linear.r,linear.g,linear.b);
          }
        }
      }
      const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
      g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.computeVertexNormals();
      const mane=new THREE.Mesh(g,new THREE.MeshStandardMaterial({vertexColors:true,side:THREE.DoubleSide,roughness:1}));
      head.add(mane);this.mane=mane;
      this.maneRest=new Float32Array(positions);this.maneFlex=new Float32Array(flex);
    }

    point(bone) { return this.root.worldToLocal(bone.getWorldPosition(V())); }
    parentRotation(bone) {
      return this.root.getWorldQuaternion(new THREE.Quaternion()).invert()
        .multiply(bone.parent.getWorldQuaternion(new THREE.Quaternion()));
    }
    orient(bone,q) {
      bone.quaternion.copy(this.parentRotation(bone).invert().multiply(q));
      bone.updateWorldMatrix(false,true);
    }
    solve(a,b,end,target,pole) {
      // Analytic two-bone IK. Clamp reach before computing a stable bend plane.
      this.root.updateMatrixWorld(true);
      const start=this.point(a), l1=b.position.length(),l2=end.position.length();
      const delta=target.clone().sub(start),d=clamp(delta.length(),Math.abs(l1-l2)+.004,l1+l2-.001);
      const dir=delta.normalize(),along=(l1*l1-l2*l2+d*d)/(2*d);
      const bend=pole.clone().addScaledVector(dir,-pole.dot(dir)).normalize();
      const mid=start.clone().addScaledVector(dir,along).addScaledVector(bend,Math.sqrt(Math.max(0,l1*l1-along*along)));
      const reachable=start.clone().addScaledVector(dir,d);
      this.orient(a,new THREE.Quaternion().setFromUnitVectors(b.position.clone().normalize(),mid.clone().sub(start).normalize()));
      this.orient(b,new THREE.Quaternion().setFromUnitVectors(end.position.clone().normalize(),reachable.clone().sub(mid).normalize()));
      return reachable.distanceTo(target);
    }

    orientGlove(side,turn,palmTarget) {
      // Mesh anatomy: -Y is wrist-to-knuckles; +Z is palm, with a mirrored thumb.
      // A direction-only quaternion leaves roll undefined (especially near 180°).
      // Build the entire anatomical frame: wrist stays collinear with forearm,
      // and pronation rotates about that forearm, never through the wrist joint.
      const hand=this.joints['hand'+side],elbow=this.joints['elbow'+side];
      const distal=this.point(hand).sub(this.point(elbow)).normalize();
      const project=p=>p.clone().addScaledVector(distal,-p.dot(distal)).normalize();
      const inward=V(side==='L'?1:-1,0,-.35-.50*turn);
      // Transport the complete guard frame with the forearm before pronation.
      // A fixed world-space inward vector becomes singular as a hook passes it.
      this.handFrames=this.handFrames||{};
      if(!this.handFrames[side])this.handFrames[side]={distal:distal.clone(),palm:project(inward)};
      const frame=this.handFrames[side];
      const transport=new THREE.Quaternion().setFromUnitVectors(frame.distal,distal);
      const neutral=frame.palm.clone().applyQuaternion(transport),target=project(palmTarget);
      const angle=Math.atan2(distal.dot(neutral.clone().cross(target)),neutral.dot(target));
      const palm=neutral.applyAxisAngle(distal,angle*turn);
      const y=distal.clone().negate(),x=y.clone().cross(palm).normalize();
      const z=x.clone().cross(y).normalize();
      this.orient(hand,new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x,y,z)));
      const centre=V(side==='L'?-.018:.018,-.140,-.026),face=V(side==='L'?-.018:.018,-.204,-.026);
      const knuckles=this.root.worldToLocal(hand.localToWorld(centre)),strikePoint=this.root.worldToLocal(hand.localToWorld(face));
      return {distal:distal.toArray(),palm:z.toArray(),turn,knuckles:knuckles.toArray(),strikePoint:strikePoint.toArray(),radius:.064};
    }

    deformGlove(side,pressure=0) {
      const mesh=this.gloveMeshes[side],amount=clamp(pressure);
      if(Math.abs((mesh.userData.pressure||0)-amount)<.0001)return;
      const rest=mesh.userData.restPosition,norm=mesh.userData.restNormal;
      const p=mesh.geometry.attributes.position,n=mesh.geometry.attributes.normal;
      for(let i=0;i<p.count;i++){
        const x=rest[i*3],y=rest[i*3+1],z=rest[i*3+2];
        const pad=smooth((-y-.025)/.10),thumb=x<-.06&&z>.025?.55:1;
        const squash=amount*pad*thumb,sx=1+.055*squash,sy=1-.14*squash,sz=1+.045*squash;
        p.setXYZ(i,x*sx,y*sy,z*sz);
        const nx=norm[i*3]/sx,ny=norm[i*3+1]/sy,nz=norm[i*3+2]/sz,length=Math.hypot(nx,ny,nz)||1;
        n.setXYZ(i,nx/length,ny/length,nz/length);
      }
      p.needsUpdate=n.needsUpdate=true;mesh.userData.pressure=amount;
    }
    update(t,technique,combo,options={}) {
      const seq=technique==='combo'?(sequences[combo]||sequences.one_two):[technique];
      const beat=t/(technique==='combo'?1.0:1.22),move=seq[Math.floor(beat)%seq.length];
      // Trim the dead guard tail between combination punches. Individual drills
      // keep their deliberate full reset; combinations retain continuous cadence.
      const phase=(beat%1)*(technique==='combo'?.86:1);
      // Pelvis leads thorax; arm follows. No hand can travel through the back.
      const envelope=(p,delay=0)=>{
        p-=delay;
        return p<.17?0:p<.40?smooth((p-.17)/.23):p<.46?1:1-smooth((p-.46)/.36);
      };
      const straight=move==='jab'||move==='cross';
      const drive=envelope(phase,.0),twist=envelope(phase,.025);
      // Exercise cadence: hips start first, relaxed hand accelerates into reach,
      // then a quicker recoil leaves a readable reset before the next repetition.
      const handPhase=phase-.055;
      const strike=straight?(handPhase<.17?0:handPhase<.40?smooth(clamp((handPhase-.17)/.23)**1.35):
        handPhase<.46?1:1-smooth((handPhase-.46)/.27)):envelope(phase,.055);
      const prepare=smooth((phase-.06)/.16),rise=smooth((phase-.22)/.24);
      const recover=smooth((phase-.50)/.32);
      const j=this.joints,hips=j.hips,chest=j.chest;
      let hipYaw=0,chestYaw=0,crouch=0,shift=0,forward=0,leadPivot=0,rearPivot=0;
      let trunkPitch=0,trunkRoll=0,pelvisRoll=0,shoulderLoad=0,shoulderSide=0;
      let hookState=null;
      const lead=V(-.185,1.68,.31),rear=V(.18,1.68,.28);
      let leadPole=V(-.6,-1,.1),rearPole=V(.6,-1,.1);
      let leadTurn=0,rearTurn=0;
      const palmTarget=V(0,-1,0);
      const lateTurn=smooth((strike-.50)/.50);
      const stepState=s=>{
        const out=clamp((phase-(s===-1?.08:.28))/.16);
        const back=clamp((phase-(s===-1?.78:.58))/.16);
        // A smooth zero-velocity lift at take-off/landing avoids the old sharp
        // ankle velocity change caused by a half-sine clamped at each end.
        return {z:.16*(smooth(out)-smooth(back)),lift:.028*(Math.sin(Math.PI*out)**2+Math.sin(Math.PI*back)**2)};
      };
      const drillStep=s=>{
        if(move==='step')return {...stepState(s),x:0};
        const lateralMove=['hook','rear_hook','slip','roll'].includes(move);
        const firstSide=move==='slip'?(options.defenceSide||1):move==='rear_hook'?1:-1;
        const first=s===firstSide;
        const out=clamp((phase-(first?.04:.20))/.14);
        const back=clamp((phase-(first?.72:.56))/.14);
        const transfer=smooth(out)-smooth(back);
        const direction=move==='slip'?(options.defenceSide||1):move==='hook'?-1:move==='rear_hook'?1:-1;
        const length=(move==='jab'?.085:move==='cross'?.045:move.includes('uppercut')?.055:.025)+(options.advance||0);
        return {z:length*transfer,x:lateralMove?direction*.045*transfer:0,
          lift:.018*(Math.sin(Math.PI*out)**2+Math.sin(Math.PI*back)**2)};
      };
      switch(move) {
        case 'jab':
          hipYaw=.28*drive;chestYaw=.27*twist;forward=.100*drive;crouch=.025*drive;
          shift=-.018*drive;trunkPitch=.025*drive;pelvisRoll=.010*drive;
          rearPivot=-.12*drive;
          trunkRoll=.030*twist;
          lead.lerp(V(-.10,1.72,.65),strike);leadTurn=lateTurn;
          break;
        case 'cross':
          hipYaw=-.60*drive;chestYaw=-.44*twist;shift=-.045*drive;forward=.105*drive;crouch=.030*drive;trunkPitch=.035*drive;
          rear.lerp(V(.005,1.72,.67),strike);rearTurn=lateTurn;rearPivot=-.68*drive;
          pelvisRoll=-.020*drive;trunkRoll=-.040*twist;
          break;
        case 'hook': case 'rear_hook': {
          const s=move==='hook'?-1:1;
          const swing=smooth((phase-.20)/.28),active=prepare*(1-recover);
          const rotation=smooth((phase-.16)/.30)*(1-recover);
          crouch=.030*prepare*(1-swing)*(1-recover)+.012*active;
          hipYaw=-s*.46*rotation;chestYaw=-s*.34*rotation;
          shift=-s*.040*rotation;forward=s*.025*rotation;
          pelvisRoll=-s*.025*rotation;trunkRoll=-s*.045*rotation;
          trunkPitch=.018*active;
          // Raise the bent elbow while moving forward, then sweep across the
          // target horizontally. Recover directly rather than reverse the arc.
          hookState={s,swing,active,rotation};
          if(s===-1){leadTurn=active;leadPole.lerp(V(-1,.10,.05),active);leadPivot=.70*rotation;rearPivot=.10*rotation;}
          else {rearTurn=active;rearPole.lerp(V(1,.10,.05),active);rearPivot=-.70*rotation;leadPivot=-.10*rotation;}
          break;
        }
        case 'uppercut': case 'rear_uppercut': {
          const s=move==='uppercut'?-1:1;
          const active=prepare*(1-recover),up=rise*(1-recover);
          const loaded=prepare*(1-rise)*(1-recover);
          hipYaw=s*.09*loaded-s*.36*up;chestYaw=s*.07*loaded-s*.25*up;
          crouch=.080*loaded;forward=-.012*loaded+.040*up;
          shift=s*.035*loaded-s*.025*up;
          pelvisRoll=-s*.035*loaded+s*.020*up;
          trunkPitch=.070*loaded;
          trunkRoll=-s*.105*loaded+s*.045*up;
          shoulderLoad=loaded;shoulderSide=s;
          palmTarget.set(0,0,-1);
          // Three distinct phases: settle under the target, drive upward with
          // extending legs, then recover to cheek without a second scoop.
          const hand=s===-1?lead:rear,guard=hand.clone();
          // Fist comes from below the target, not from an elbow raised beside
          // the head. Wrist finishes in front of the chin, with elbow below it.
          hand.lerp(V(s*.21,options.upperLoadHeight??1.34,.36),prepare).lerp(V(s*.12,options.upperWristHeight??1.72,.64),rise).lerp(guard,recover);
          if(s===-1){leadTurn=active;leadPole.lerp(V(0,-1,.2),active);leadPivot=.36*up;}
          else {rearTurn=active;rearPole.lerp(V(0,-1,.2),active);rearPivot=-.36*up;}
          break;
        }
        case 'speedbag': {
          const circle=Math.sin(phase*Math.PI*2),lift=Math.cos(phase*Math.PI*2);
          lead.set(-.14,1.76+.075*lift,.58+.075*circle);rear.set(.14,1.76-.075*lift,.58-.075*circle);
          leadTurn=.35;rearTurn=.35;hipYaw=.045*circle;chestYaw=.075*circle;forward=.025;
          crouch=.012*(1-lift);rearPivot=-.06*(1-circle);break;
        }
        case 'slip': {
          const side=options.defenceSide||1;shift=side*.11*drive;crouch=.048*drive;hipYaw=-side*.12*drive;chestYaw=-side*.18*twist;
          trunkRoll=-side*.15*drive;pelvisRoll=-side*.030*drive;forward=-.022*drive;break;
        }
        case 'roll': {
          const q=smooth(clamp((phase-.12)/.72));
          const travel=Math.sin(q*Math.PI*2)*(options.defenceSide||1);
          shift=.100*travel;crouch=(options.duckDepth||.22)*Math.sin(q*Math.PI);
          hipYaw=-.12*travel;chestYaw=-.16*travel;
          trunkRoll=-.085*travel;pelvisRoll=-.025*travel;trunkPitch=.020*Math.sin(q*Math.PI);break;
        }
        case 'step': {
          const l=stepState(-1),r=stepState(1),transfer=(l.lift-r.lift)/.028;
          forward=(l.z+r.z)/2;crouch=.030*smooth(phase/.08)*(1-smooth((phase-.94)/.06));
          shift=.012*transfer;pelvisRoll=-.018*transfer;trunkRoll=.012*transfer;
          hipYaw=.035*transfer;chestYaw=-.025*transfer;break;
        }
      }
      // Orthodox guard is slightly bladed. Starting square made every punch
      // look like an isolated arm demonstration instead of boxing footwork.
      const settling=Math.sin(Math.PI*phase/(technique==='combo'?.86:1))**2;
      crouch+=.004*settling*(1-drive);
      if(move!=='step')crouch+=.016*smooth(phase/.04)*(1-smooth((phase-.72)/.14));
      // Close distance for bent-arm work by stepping the feet in sequence.
      // The pelvis follows the support midpoint instead of sliding the root.
      let approach=0;
      if(options.advance){
        const l=drillStep(-1),r=drillStep(1);
        const length=(move.includes('uppercut')?.055:.025)+options.advance;
        approach=(l.z+r.z)*.5*options.advance/length;
        forward+=approach;crouch+=Math.abs(l.z-r.z)*.21;
      }
      crouch+=(options.levelChange||0)*drive;
      const through=(options.contactDrive||0)*strike;
      forward+=through;crouch+=through*.32;
      const brace=(options.brace||0)*drive,recoil=options.recoil||0;
      crouch+=brace*.022+recoil*.38;forward-=brace*.014+recoil;trunkPitch+=brace*.020-recoil*.8;
      hipYaw+=.12;chestYaw+=.08;
      hips.position.set(shift,.935-crouch,forward);
      hips.rotation.set(0,hipYaw,pelvisRoll);
      // Spread the thoracic turn over the back instead of rotating a rigid chest.
      j.spine.rotation.set(.045+trunkPitch*.55,chestYaw*.30,trunkRoll*.60);
      chest.rotation.set(.025+trunkPitch*.45,chestYaw*.70,trunkRoll*.40);
      j.neck.rotation.set(0,0,0);
      // Eyes remain on the opponent, chin tucked, rather than spinning with the chest.
      j.head.rotation.set(.07-trunkPitch*.65,-(hipYaw+chestYaw)*.90,-(trunkRoll+pelvisRoll)*.65);
      // Scapular elevation/protraction of the striking shoulder protects the chin.
      const leftStrike=move==='hook'?hookState.rotation:move==='jab'?twist:move==='uppercut'?strike:0;
      const rightStrike=move==='rear_hook'?hookState.rotation:move==='cross'?twist:move==='rear_uppercut'?strike:0;
      const reachShoulder=straight?.095:hookState?.085:.045;
      j.armL.position.set(-.30+.012*leftStrike,.26+.035*leftStrike,reachShoulder*leftStrike-.012*rightStrike);
      j.armR.position.set(.30-.012*rightStrike,.26+.035*rightStrike,reachShoulder*rightStrike-.012*leftStrike);
      if(shoulderSide)j[shoulderSide===-1?'armL':'armR'].position.y-=.024*shoulderLoad;
      this.tail.rotation.y= -.16*hipYaw+Math.sin(t*2.2)*.025;
      const footTargets=[];
      for(const s of [-1,1]) {
        const side=s===-1?'L':'R',pivot=s===-1?leadPivot:rearPivot;
        const lift=Math.abs(pivot)*.35;
        const footQ=new THREE.Quaternion().setFromEuler(new THREE.Euler(lift,pivot,0,'YXZ'));
        // A rigid boot pivots at the forward sole contact. Using the mid-foot
        // here drove the long toe through the floor whenever the heel rose.
        const step=drillStep(s);
        const contact=V(s*.235+step.x,.015,(s===-1?.24:-.20)+.215+step.z);
        const ankle=contact.clone().add(V(0,.102,-.215).applyQuaternion(footQ));
        ankle.y+=step.lift;
        const kneePole=V(s*.07,0,1).applyAxisAngle(V(0,1,0),pivot*.65);
        const err=this.solve(j['thigh'+side],j['knee'+side],j['foot'+side],ankle,kneePole);
        this.orient(j['foot'+side],footQ);
        // The sole follows the foot, while the boot collar follows the shin.
        // A rigid upright collar let the animated calf pass through the leather.
        const shin=this.point(j['knee'+side]).sub(ankle).normalize().applyQuaternion(footQ.clone().invert());
        j['foot'+side].userData.bootAnkle.quaternion.setFromUnitVectors(V(0,1,0),shin);
        footTargets.push({side,error:err,ankle:ankle.toArray(),pivot,lift:step.lift,contact:contact.toArray()});
      }
      // Guard follows the head during defensive movement; strike endpoints stay in opponent space.
      const guardShift=V(shift,(hips.position.y-.935),forward);
      lead.add(guardShift);rear.add(guardShift);
      this.root.updateMatrixWorld(true);
      const headPosition=this.point(j.head);
      if(!this.guardHead)this.guardHead=headPosition.clone();
      const headShift=headPosition.clone().sub(this.guardHead);
      // The defending hand follows the moving cheek, not just pelvis height.
      if(!['jab','hook','uppercut','speedbag'].includes(move))lead.copy(V(-.185,1.68,.31).add(headShift));
      if(!['cross','rear_hook','rear_uppercut','speedbag'].includes(move))rear.copy(V(.18,1.68,.28).add(headShift));
      if(brace){lead.add(V(.035*brace,.105*brace,-.015*brace));rear.add(V(-.035*brace,.105*brace,-.015*brace));}
      // Straight punches use almost the full arm reach after torso rotation.
      // A fixed short wrist endpoint left the elbow folded and knuckles pointing
      // upward even at impact. Keep a small bend rather than locking the joint.
      if(move==='jab'||move==='cross') {
        const side=move==='jab'?'L':'R',hand=side==='L'?lead:rear;
        const shoulder=this.point(j['arm'+side]);
        const direction=V(side==='L'?-.08:.02,options.strikeHeight??1.82,shoulder.z+.66).sub(shoulder).normalize();
        const reach=j['elbow'+side].position.length()+j['hand'+side].position.length()-.0015;
        const target=shoulder.addScaledVector(direction,reach);
        hand.copy((side==='L'?V(-.185,1.68,.31):V(.18,1.68,.28)).add(guardShift)).lerp(target,strike);
      }
      if(hookState) {
        const {s,swing,active}=hookState,side=s===-1?'L':'R',hand=s===-1?lead:rear;
        const shoulder=this.point(j['arm'+side]);
        // Longer-range hook: carry the fist around with the rotating shoulder,
        // opening the elbow progressively while preserving a bent-arm contact.
        const radius=lerp(.43,.615,swing),height=options.strikeHeight??(1.81-crouch);
        const direction=V(-s*(.10+.65*swing),0,1-.35*swing).normalize();
        const dy=height-shoulder.y;
        const target=shoulder.addScaledVector(direction,Math.sqrt(Math.max(.01,radius*radius-dy*dy)));
        target.y=height;
        hand.lerp(target,active);
      }
      // Target practice adapts reach to the physical target. Keep the existing
      // loading, footwork and body drive; constrain the wrist to arm length.
      if(options.target&&['jab','cross','hook','rear_hook','uppercut','rear_uppercut'].includes(move)){
        const side=['cross','rear_hook','rear_uppercut'].includes(move)?'R':'L';
        const hand=side==='L'?lead:rear,shoulder=this.point(j['arm'+side]);
        const aim=V(...options.target).add(V(0,0,approach+through)),delta=aim.sub(shoulder);
        const reach=j['elbow'+side].position.length()+j['hand'+side].position.length()-.002;
        const endpoint=shoulder.add(delta.clampLength(0,reach));
        const amount=straight?strike:hookState?hookState.rotation:rise*(1-recover);
        hand.lerp(endpoint,amount);
      }
      if(options.knucklePlanner&&['jab','cross','hook','rear_hook','uppercut','rear_uppercut'].includes(move)){
        const side=['cross','rear_hook','rear_uppercut'].includes(move)?'R':'L',plan=options.knucklePlanner(this.point(j['arm'+side]));
        options.knuckleTarget=plan.point.toArray();options.strikeDirection=plan.direction.toArray();
      }
      let le=this.solve(j.armL,j.elbowL,j.handL,lead,leadPole);
      let re=this.solve(j.armR,j.elbowR,j.handR,rear,rearPole);
      const gloves=[this.orientGlove('L',leadTurn,palmTarget),this.orientGlove('R',rearTurn,palmTarget)];
      if(options.knuckleTarget&&['jab','cross','hook','rear_hook','uppercut','rear_uppercut'].includes(move)){
        const index=['cross','rear_hook','rear_uppercut'].includes(move)?1:0,side=index?'R':'L',hand=index?rear:lead,pole=index?rearPole:leadPole;
        const amount=straight?strike:hookState?hookState.rotation:rise*(1-recover),weight=1-Math.pow(1-amount,1/3);
        for(let iteration=0;iteration<3;iteration++){
          hand.addScaledVector(V(...options.knuckleTarget).sub(V(...gloves[index].strikePoint)),weight);
          const shoulder=this.point(j['arm'+side]),reach=j['elbow'+side].position.length()+j['hand'+side].position.length()-.002;
          hand.copy(shoulder.clone().add(hand.clone().sub(shoulder).clampLength(0,reach)));
          let preferred=pole;
          if(options.strikeDirection&&!move.includes('uppercut')){const desired=hand.clone().addScaledVector(V(...options.strikeDirection),-j['hand'+side].position.length()).sub(shoulder).normalize();preferred=pole.clone().lerp(desired,amount);}
          const error=this.solve(j['arm'+side],j['elbow'+side],j['hand'+side],hand,preferred);if(index)re=error;else le=error;
          gloves[index]=this.orientGlove(side,index?rearTurn:leadTurn,palmTarget);
        }
      }
      // Root-anchored hair tips respond to the repetition's turn and recovery.
      // Stateless deformation keeps freeze, scrubbing and slow playback stable.
      const hairResponse=Math.sin(phase*Math.PI*2)*(Math.abs(hipYaw-.12)+Math.abs(trunkRoll)+crouch)*.018;
      const hair=this.mane.geometry.attributes.position;
      for(let i=0;i<hair.count;i++) {
        const flex=this.maneFlex[i]**2;
        hair.setXYZ(i,this.maneRest[i*3]+hairResponse*flex,
          this.maneRest[i*3+1],this.maneRest[i*3+2]+hairResponse*.45*flex);
      }
      hair.needsUpdate=true;
      if(this.rabbitEars)this.rabbitEars.forEach((ear,i)=>{ear.rotation.z=(i?-.10:.10)+Math.sin(phase*Math.PI*2+i*.8)*.025*(Math.abs(hipYaw)+crouch);});
      this.root.updateMatrixWorld(true);
      this.skeleton.update();
      const mat=new THREE.Matrix4(),q=new THREE.Quaternion(),tr=new THREE.Quaternion();
      for(let i=0;i<this.bones.length;i++) {
        mat.fromArray(this.skeleton.boneMatrices,i*16);q.setFromRotationMatrix(mat);
        const e=mat.elements;tr.set(e[12],e[13],e[14],0).multiply(q);
        this.dqReal[i].set(q.x,q.y,q.z,q.w);
        this.dqDual[i].set(tr.x*.5,tr.y*.5,tr.z*.5,tr.w*.5);
      }
      this.metrics={move,phase,strike,gloves,footTargets,handErrors:[le,re],
        hands:[this.point(j.handL).toArray(),this.point(j.handR).toArray()],
        head:this.point(j.head).toArray(),hips:this.point(hips).toArray()};
      return this.metrics;
    }
  }
  window.LionCoach=LionCoach;window.CoachSurface=leatherSurface;
  window.COACH_TECHNIQUES={
    jab:['1','Jab','Keep the rear glove at the cheek. Extend forward, lift the lead shoulder, then return to guard.',
      'ג׳אב','היד האחורית מגינה על הלחי. שלחו את היד הקדמית קדימה, הרימו כתף וחזרו להגנה.',
      'Джеб','Задняя перчатка у щеки. Удар вперёд с прикрытием подбородка плечом, затем возврат в защиту.'],
    cross:['2','Cross','Turn from the rear foot through the hip and chest. Keep the lead glove up and recover your stance.',
      'קרוס','סובבו את כף הרגל האחורית, האגן והחזה. שמרו את היד הקדמית בהגנה וחזרו לעמידת המוצא.',
      'Кросс','Разворот задней стопы, таза и груди. Передняя рука в защите; вернитесь в стойку.'],
    hook:['3','Lead hook','Drive from the lead foot, turn the hip and shoulder, and sweep a longer arc with a bent arm. Keep the rear glove at the cheek.',
      'הוק קדמי','סובבו את כף הרגל הקדמית, האגן והחזה. הזרוע נעה בקשת עם מרפק כפוף והיד האחורית מגינה.',
      'Передний хук','Разворот передней стопы, таза и груди. Дуга согнутой рукой; задняя перчатка в защите.'],
    rear_hook:['4','Rear hook','Drive from the rear foot through the hip and shoulder. Reach around in a long bent-arm arc while the lead glove protects the cheek.',
      'הוק אחורי','סובבו את הרגל האחורית על כרית כף הרגל. הזרוע הכפופה עוקבת אחר הגוף והיד הקדמית מגינה.',
      'Задний хук','Разворот на подушечке задней стопы. Согнутая рука следует за корпусом; передняя у щеки.'],
    uppercut:['5','Lead uppercut','Load with a small knee bend. Drive up through the legs and hip with a compact bent arm, then recover guard.',
      'אפרקאט קדמי','כופפו מעט את הברכיים. עלו דרך הרגליים והאגן עם זרוע כפופה וקומפקטית וחזרו להגנה.',
      'Передний апперкот','Небольшое сгибание коленей, затем подъём ногами и тазом. Рука согнута; возврат в защиту.'],
    rear_uppercut:['6','Rear uppercut','Bend the knees, rotate the rear hip and drive a compact upward punch. Keep the lead glove high.',
      'אפרקאט אחורי','כופפו ברכיים, סובבו את האגן והכו כלפי מעלה בתנועה קצרה. היד הקדמית נשארת בהגנה.',
      'Задний апперкот','Согните колени, разверните таз и выполните короткий удар вверх. Передняя перчатка поднята.'],
    slip:['SLIP','Slip right','Move the head off the centre line with the knees and trunk. Keep the eyes forward and both gloves up.',
      'התחמקות ימינה','הסיטו את הראש מקו האמצע באמצעות הברכיים והגוף. שמרו מבט קדימה ושתי ידיים בהגנה.',
      'Уклон вправо','Уберите голову с линии удара коленями и корпусом. Смотрите вперёд, обе перчатки подняты.'],
    roll:['ROLL','Roll','Lower with both knees, pass beneath the imagined hook and rise on the other side. Keep your guard compact.',
      'התחמקות מתחת להוק','רדו באמצעות שתי הברכיים, עברו מתחת להוק מדומיין ועלו בצד השני. שמרו על הגנה צמודה.',
      'Нырок','Опуститесь за счёт коленей, пройдите под воображаемым хуком и поднимитесь с другой стороны.'],
    step:['STEP','Footwork','Lead foot first going forward; rear foot first returning. Keep stance width, stay balanced and avoid crossing feet.',
      'עבודת רגליים','קדימה: רגל קדמית תחילה. אחורה: רגל אחורית תחילה. שמרו על רוחב העמידה, שיווי משקל ורגליים שאינן מצטלבות.',
      'Работа ног','Вперёд — сначала передняя стопа. Назад — сначала задняя. Сохраняйте ширину стойки и не скрещивайте ноги.']
  };
})();
