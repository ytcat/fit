/* Original continuous-surface lion coach. Three.js r128, metres, +Z forward.
 * Authored kinematics, not a rigid-body simulation or motion-capture dataset.
 */
(function () {
  'use strict';
  const V = (x=0,y=0,z=0) => new THREE.Vector3(x,y,z);
  const clamp = (x,a=0,b=1) => Math.max(a,Math.min(b,x));
  const smooth = x => { x=clamp(x); return x*x*x*(x*(x*6-15)+10); };
  const lerp = (a,b,t) => a+(b-a)*t;
  const sequences = {one_two:['jab','cross'],one_two_hook:['jab','cross','hook'],
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

  class LionCoach {
    constructor(data) {
      this.root=new THREE.Group();this.root.name='Lion boxing coach';
      this.bones=[];this.joints={};this.metrics={};
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
      const cloth=new THREE.MeshStandardMaterial({color:0x152635,roughness:.61,
        bumpMap:grain,bumpScale:.0015,skinning:true});
      this.skin=this.skinned(this.sculptBody(meshFrom(data.body,true)),skin,true);
      this.shorts=this.skinned(meshFrom(data.shorts,true),cloth,false);
      this.gold=new THREE.MeshStandardMaterial({color:0xd8b56c,metalness:.38,roughness:.43});
      this.leather=new THREE.MeshStandardMaterial({color:0xad2529,roughness:.42,
        bumpMap:grain,bumpScale:.001,metalness:.05});
      this.black=new THREE.MeshStandardMaterial({color:0x131518,roughness:.44});
      this.cream=new THREE.MeshStandardMaterial({color:0xc9b491,roughness:.9});
      const waistband=new THREE.Mesh(new THREE.CylinderGeometry(.244,.249,.061,64,1,true),this.gold);
      waistband.scale.z=.73;waistband.position.y=.098;hips.add(waistband);
      this.addLabel(hips,'SHADOW',V(0,.098,.184),.19,.043);
      for(const s of [-1,1]) {
        const side=s===-1?'L':'R',hand=this.joints['hand'+side];
        const glove=new THREE.Mesh(meshFrom(data.glove,true),this.leather);
        if(s===1) glove.scale.x=-1;
        hand.add(glove);glove.castShadow=true;
        const cuff=new THREE.Mesh(new THREE.CylinderGeometry(.070,.071,.062,32),this.black);
        cuff.position.y=.014;hand.add(cuff);
        // Branding belongs on the back of the glove, opposite its palm/thumb pad.
        this.addLabel(hand,'SB',V(0,-.070,-.105),.065,.039).rotation.y=Math.PI;
        this.curve(hand,[V(-.065,-.035,-.074),V(0,-.025,-.105),V(.065,-.035,-.074)],this.cream,.0015);
        this.curve(hand,[V(-.065,.035,0),V(0,.038,-.069),V(.065,.035,0)],this.gold,.0018);
        this.addBoot(this.joints['foot'+side]);
        // Satin side piping follows each thigh, rather than floating beside it.
        this.curve(this.joints['thigh'+side],[V(s*.125,.055,.075),V(s*.15,-.10,.08),V(s*.15,-.25,.08)],this.gold,.006);
      }
      this.addFace();this.addMane();
      this.tail=new THREE.Group();hips.add(this.tail);
      this.curve(this.tail,[V(0,-.02,-.16),V(.1,-.2,-.32),V(.16,-.45,-.40),V(.23,-.54,-.29)],
        new THREE.MeshStandardMaterial({color:0x9d713f,roughness:1}),.022);
      const tip=this.ellipsoid(this.tail,new THREE.MeshStandardMaterial({color:0x44301d,roughness:1}),V(.23,-.54,-.29),V(.04,.075,.04));
      tip.rotation.z=-.6;
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
        p.setXYZ(i,x,y,z);
      }
      p.needsUpdate=true;g.computeVertexNormals();return g;
    }

    skinned(g,material,colour) {
      const positions=g.attributes.position, ids=[],weights=[],colors=[];
      const tawny=new THREE.Color('#a87842').convertSRGBToLinear(), light=new THREE.Color('#d0b78a').convertSRGBToLinear();
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
      shape.moveTo(-.075,-.13);shape.quadraticCurveTo(-.09,.20,0,.235);
      shape.quadraticCurveTo(.09,.20,.075,-.13);shape.quadraticCurveTo(0,-.16,-.075,-.13);
      const sole=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:.027,bevelEnabled:true,bevelSize:.009,bevelThickness:.006,bevelSegments:3,steps:1}),this.cream);
      sole.rotation.x=Math.PI/2;sole.position.y=-.089;foot.add(sole);
      this.ellipsoid(foot,this.black,V(0,-.044,.048),V(.079,.062,.171));
      const upper=new THREE.Mesh(new THREE.CylinderGeometry(.064,.073,.18,32),this.black);
      upper.position.set(0,.035,-.014);foot.add(upper);
      for(let i=0;i<6;i++) {
        const y=-.015+i*.022;
        this.curve(foot,[V(-.044,y,.058),V(0,y+.014,.070),V(.044,y,.058)],this.cream,.0025);
      }
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
        this.curve(head,[V(s*.055,.218,.175),V(s*.090,.225,.167),V(s*.127,.205,.149)],this.cream,.004);
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
        bumpMap:texture('fur'),bumpScale:.003}),V(0,.085,-.065),V(.247,.303,.182));
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
        const center=V(normal.x*.247,.085+normal.y*.303,-.065+normal.z*.182);
        if(center.z>.025&&Math.abs(center.x)<.165&&center.y>-.03&&center.y<.29)continue;
        const length=.040+random()*.045+Math.max(0,-normal.y)*.035;
        const width=.004+random()*.004;
        const outward=normal.clone().multiplyScalar(.65).add(V(normal.x*.12,-.65,-.15)).normalize();
        const across=outward.clone().cross(Math.abs(outward.y)>.9?V(1,0,0):V(0,1,0)).normalize().multiplyScalar(width);
        const colour=new THREE.Color().setHSL(.083+random()*.025,.38+random()*.12,.13+random()*.15);
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
      return {distal:distal.toArray(),palm:z.toArray(),turn};
    }

    update(t,technique,combo) {
      const seq=technique==='combo'?(sequences[combo]||sequences.one_two):[technique];
      const beat=t/1.22, move=seq[Math.floor(beat)%seq.length],phase=beat%1;
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
      const lateTurn=smooth((strike-.35)/.65);
      const stepState=s=>{
        const out=clamp((phase-(s===-1?.08:.28))/.16);
        const back=clamp((phase-(s===-1?.78:.58))/.16);
        return {z:.12*(smooth(out)-smooth(back)),lift:.024*(Math.sin(Math.PI*out)+Math.sin(Math.PI*back))};
      };
      switch(move) {
        case 'jab':
          hipYaw=.20*drive;chestYaw=.20*twist;forward=.070*drive;crouch=.018*drive;
          rearPivot=-.12*drive;
          trunkRoll=.018*twist;
          lead.lerp(V(-.10,1.72,.65),strike);leadTurn=lateTurn;
          break;
        case 'cross':
          hipYaw=-.53*drive;chestYaw=-.38*twist;shift=-.035*drive;forward=.085*drive;crouch=.022*drive;
          rear.lerp(V(.005,1.72,.67),strike);rearTurn=lateTurn;rearPivot=-.68*drive;
          pelvisRoll=-.015*drive;trunkRoll=-.025*twist;
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
          hipYaw=s*.09*loaded-s*.30*up;chestYaw=s*.07*loaded-s*.21*up;
          crouch=.080*loaded;forward=-.012*loaded+.030*up;
          shift=s*.035*loaded-s*.025*up;
          pelvisRoll=-s*.035*loaded+s*.020*up;
          trunkPitch=.070*loaded;
          trunkRoll=-s*.105*loaded+s*.045*up;
          shoulderLoad=loaded;shoulderSide=s;
          palmTarget.set(0,0,-1);
          // Three distinct phases: settle under the target, drive upward with
          // extending legs, then recover to cheek without a second scoop.
          const hand=s===-1?lead:rear,guard=hand.clone();
          hand.lerp(V(s*.18,1.44,.32),prepare).lerp(V(s*.13,1.78,.46),rise).lerp(guard,recover);
          if(s===-1){leadTurn=active;leadPole.lerp(V(0,-1,.2),active);leadPivot=.30*up;}
          else {rearTurn=active;rearPole.lerp(V(0,-1,.2),active);rearPivot=-.30*up;}
          break;
        }
        case 'slip': shift=.060*drive;crouch=.043*drive;hipYaw=-.10*drive;chestYaw=-.16*twist;
          trunkRoll=-.12*drive;pelvisRoll=-.025*drive;forward=-.018*drive;break;
        case 'roll': {
          const q=smooth(clamp((phase-.12)/.72));
          const travel=Math.sin(q*Math.PI*2);
          shift=.075*travel;crouch=.09*Math.sin(q*Math.PI);
          hipYaw=-.12*travel;chestYaw=-.16*travel;
          trunkRoll=-.085*travel;pelvisRoll=-.025*travel;trunkPitch=.020*Math.sin(q*Math.PI);break;
        }
        case 'step': {
          const l=stepState(-1),r=stepState(1),transfer=(l.lift-r.lift)/.024;
          forward=(l.z+r.z)/2;crouch=.020*smooth(phase/.08)*(1-smooth((phase-.94)/.06));
          shift=.012*transfer;pelvisRoll=-.018*transfer;trunkRoll=.012*transfer;
          hipYaw=.035*transfer;chestYaw=-.025*transfer;break;
        }
      }
      // Orthodox guard is slightly bladed. Starting square made every punch
      // look like an isolated arm demonstration instead of boxing footwork.
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
      const leftStrike=move==='hook'?hookState.rotation:['jab','uppercut'].includes(move)?strike:0;
      const rightStrike=move==='rear_hook'?hookState.rotation:['cross','rear_uppercut'].includes(move)?strike:0;
      const reachShoulder=straight?.065:hookState?.080:.045;
      j.armL.position.set(-.30+.012*leftStrike,.26+.035*leftStrike,reachShoulder*leftStrike-.012*rightStrike);
      j.armR.position.set(.30-.012*rightStrike,.26+.035*rightStrike,reachShoulder*rightStrike-.012*leftStrike);
      if(shoulderSide)j[shoulderSide===-1?'armL':'armR'].position.y-=.024*shoulderLoad;
      this.tail.rotation.y= -.16*hipYaw+Math.sin(t*2.2)*.025;
      const footTargets=[];
      for(const s of [-1,1]) {
        const side=s===-1?'L':'R',pivot=s===-1?leadPivot:rearPivot;
        const lift=Math.abs(pivot)*.35;
        const footQ=new THREE.Quaternion().setFromEuler(new THREE.Euler(lift,pivot,0,'YXZ'));
        // Pivot about ball of foot. Heel can rise; toe contact stays on the floor.
        const step=move==='step'?stepState(s):{z:0,lift:0};
        const contact=V(s*.235,.015,(s===-1?.24:-.20)+.12+step.z);
        const ankle=contact.clone().add(V(0,.102,-.12).applyQuaternion(footQ));
        ankle.y+=step.lift;
        const kneePole=V(s*.07,0,1).applyAxisAngle(V(0,1,0),pivot*.65);
        const err=this.solve(j['thigh'+side],j['knee'+side],j['foot'+side],ankle,kneePole);
        this.orient(j['foot'+side],footQ);footTargets.push({side,error:err,ankle:ankle.toArray(),pivot});
      }
      // Guard follows the head during defensive movement; strike endpoints stay in opponent space.
      const guardShift=V(shift,(hips.position.y-.935),forward);
      lead.add(guardShift);rear.add(guardShift);
      this.root.updateMatrixWorld(true);
      const headPosition=this.point(j.head);
      if(!this.guardHead)this.guardHead=headPosition.clone();
      const headShift=headPosition.clone().sub(this.guardHead);
      // The defending hand follows the moving cheek, not just pelvis height.
      if(!['jab','hook','uppercut'].includes(move))lead.copy(V(-.185,1.68,.31).add(headShift));
      if(!['cross','rear_hook','rear_uppercut'].includes(move))rear.copy(V(.18,1.68,.28).add(headShift));
      // Straight punches use almost the full arm reach after torso rotation.
      // A fixed short wrist endpoint left the elbow folded and knuckles pointing
      // upward even at impact. Keep a small bend rather than locking the joint.
      if(move==='jab'||move==='cross') {
        const side=move==='jab'?'L':'R',hand=side==='L'?lead:rear;
        const shoulder=this.point(j['arm'+side]);
        const direction=V(side==='L'?-.08:.02,1.70,shoulder.z+.66).sub(shoulder).normalize();
        const reach=j['elbow'+side].position.length()+j['hand'+side].position.length()-.0015;
        const target=shoulder.addScaledVector(direction,reach);
        hand.copy((side==='L'?V(-.185,1.68,.31):V(.18,1.68,.28)).add(guardShift)).lerp(target,strike);
      }
      if(hookState) {
        const {s,swing,active}=hookState,side=s===-1?'L':'R',hand=s===-1?lead:rear;
        const shoulder=this.point(j['arm'+side]);
        // Longer-range hook: carry the fist around with the rotating shoulder,
        // opening the elbow progressively while preserving a bent-arm contact.
        const radius=lerp(.43,.59,swing),height=1.70-crouch;
        const direction=V(-s*(.10+.65*swing),0,1-.35*swing).normalize();
        const dy=height-shoulder.y;
        const target=shoulder.addScaledVector(direction,Math.sqrt(Math.max(.01,radius*radius-dy*dy)));
        target.y=height;
        hand.lerp(target,active);
      }
      const le=this.solve(j.armL,j.elbowL,j.handL,lead,leadPole);
      const re=this.solve(j.armR,j.elbowR,j.handR,rear,rearPole);
      const gloves=[this.orientGlove('L',leadTurn,palmTarget),this.orientGlove('R',rearTurn,palmTarget)];
      // Root-anchored hair tips respond to the repetition's turn and recovery.
      // Stateless deformation keeps freeze, scrubbing and slow playback stable.
      const hairResponse=Math.sin(phase*Math.PI*2)*(Math.abs(hipYaw)+Math.abs(trunkRoll)+crouch)*.018;
      const hair=this.mane.geometry.attributes.position;
      for(let i=0;i<hair.count;i++) {
        const flex=this.maneFlex[i]**2;
        hair.setXYZ(i,this.maneRest[i*3]+hairResponse*flex,
          this.maneRest[i*3+1],this.maneRest[i*3+2]+hairResponse*.45*flex);
      }
      hair.needsUpdate=true;
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
  window.LionCoach=LionCoach;
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
