/* Original continuous-surface lion coach. Three.js r128, metres, +Z forward.
 * Authored kinematics, not a rigid-body simulation or motion-capture dataset.
 */
(function () {
  'use strict';
  const V = (x=0,y=0,z=0) => new THREE.Vector3(x,y,z);
  const clamp = (x,a=0,b=1) => Math.max(a,Math.min(b,x));
  const smooth = x => { x=clamp(x); return clamp(x*x*x*(x*(x*6-15)+10)); };
  const lerp = (a,b,t) => a+(b-a)*t;
  // A padded boxing arm cannot fold until wrist and shoulder coincide.
  // Keep at least a 30-degree internal elbow angle (150-degree flexion).
  const foldedArmReach=(upper,lower)=>Math.sqrt(upper*upper+lower*lower-2*upper*lower*Math.cos(Math.PI/6));
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

  // Fine-scale, repeatable fiber/pores in material normals. Unlike enlarged
  // geometric decorations this remains attached to the actual character skin
  // through animation and responds to the arena lights.
  function detailMap(kind) {
    detailMap.cache=detailMap.cache||new Map();if(detailMap.cache.has(kind))return detailMap.cache.get(kind);
    const canvas=document.createElement('canvas');canvas.width=canvas.height=512;
    const ctx=canvas.getContext('2d'),pixels=ctx.createImageData(512,512);
    let state=kind==='fur'?17323:89923;
    const rnd=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
    const field=new Float32Array(512*512);
    for(let y=0;y<512;y++)for(let x=0;x<512;x++){
      const i=y*512+x,coarse=Math.sin(x*.072+y*.041)*2.8+Math.sin(x*.14-y*.095)*1.4;
      field[i]=kind==='cloth'?128+7*Math.sin(x*Math.PI/2)+5*Math.sin(y*Math.PI/2)+coarse*.25+(rnd()-.5)*5:128+coarse+(rnd()-.5)*(kind==='fur'?26:18);
    }
    if(kind==='fur')for(let i=0;i<30000;i++){
      const x=Math.floor(rnd()*512),y=Math.floor(rnd()*512),length=3+Math.floor(rnd()*11);
      for(let j=0;j<length;j++){
       const xx=(x+Math.floor(j*.20))%512,yy=(y+j)%512,idx=yy*512+xx;
       field[idx]=Math.min(246,field[idx]+23*(1-j/length));
      }
    }
    for(let i=0;i<field.length;i++){
      const value=Math.max(0,Math.min(255,field[i]));pixels.data[i*4]=pixels.data[i*4+1]=pixels.data[i*4+2]=value;pixels.data[i*4+3]=255;
    }
    ctx.putImageData(pixels,0,0);
    const t=new THREE.CanvasTexture(canvas);t.wrapS=t.wrapT=THREE.RepeatWrapping;
    t.repeat.set(kind==='fur'?6:kind==='cloth'?8:4,kind==='fur'?6:kind==='cloth'?8:4);
    t.anisotropy=4;detailMap.cache.set(kind,t);return t;
  }
  // Data textures stay linear. Reuse maps across cached boxers and their gear.
  function roughnessMap(kind) {
    roughnessMap.cache=roughnessMap.cache||new Map();if(roughnessMap.cache.has(kind))return roughnessMap.cache.get(kind);
    const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const ctx=canvas.getContext('2d'),pixels=ctx.createImageData(128,128);
    for(let y=0;y<128;y++)for(let x=0;x<128;x++){
      const v=Math.round(224+12*Math.sin(x*.147+y*.049)*Math.sin(y*.196-x*.049)+(kind==='cloth'?5*Math.sin(x*Math.PI/2)*Math.sin(y*Math.PI/2):3*Math.sin(x*1.717+y*2.271))),i=(y*128+x)*4;
      pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=v;pixels.data[i+3]=255;
    }
    ctx.putImageData(pixels,0,0);const map=new THREE.CanvasTexture(canvas);map.wrapS=map.wrapT=THREE.RepeatWrapping;map.repeat.set(4,4);map.anisotropy=4;roughnessMap.cache.set(kind,map);return map;
  }
  function meshFrom(data,refine=false) {
    let armBlend=data.armBlend?.slice();
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
        const id=p.length/3;p.push(m.x,m.y,m.z);if(armBlend)armBlend.push((armBlend[a]+armBlend[b])*.5);const normal=na.add(nb).normalize();n.push(normal.x,normal.y,normal.z);edges.set(key,id);return id;
      };
      for(let i=0;i<data.index.length;i+=3){const [a,b,c]=data.index.slice(i,i+3),ab=midpoint(a,b),bc=midpoint(b,c),ca=midpoint(c,a);indices.push(a,ab,ca,ab,b,bc,ca,bc,c,ab,bc,ca);}
      data={position:p,normal:n,index:indices};
    }
    const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.Float32BufferAttribute(data.position,3));g.setIndex(data.index);
    if(armBlend)g.setAttribute('coachArmBlend',new THREE.Float32BufferAttribute(armBlend,1));
    if(data.normal)g.setAttribute('normal',new THREE.Float32BufferAttribute(data.normal,3));
    else g.computeVertexNormals();
    const uv=[];
    for(let i=0;i<data.position.length;i+=3) uv.push(data.position[i]*2,data.position[i+1]*2);
    g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));return g;
  }

  // Joined, smooth leather volumes. Build once per coach; no external assets or
  // engines. The small thumb is joined to the palm instead of a separate finger.
  function leatherSurface(volumes,lo,hi,step=.012) {
    const field=typeof volumes==='function'?volumes:p=>{
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
      this.species=options.species||'lion';this.cast=options.cast||null;this.character=this.cast?.id||null; // GOTR-0078: story characters (adventure/story/story-cast.js) reshape and dress the same rig
      this.armHingeFrame='posterior-z';this.shoulderData=data.shoulderCorrectives?.armHingeFrame==='posterior-z'?(data.shoulderCorrectives.species?.[this.species]||null):null;this.nativeRabbit=this.species==='rabbit'&&Boolean(data.rabbitBody);
      this.root=new THREE.Group();this.root.name='Lion boxing coach';
      if(data.rigVersion!==2||!data.body.armBlend)throw new Error('Lion rig/model version mismatch');
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
        const elbow=joint('elbow'+side,arm,V(s*.3538361203,0,0));
        joint('hand'+side,elbow,V(s*.3101612484,0,0));
        joint('scapula'+side,chest,V(s*.17,.17,-.06));
        const thigh=joint('thigh'+side,hips,V(s*.15,0,0));
        const knee=joint('knee'+side,thigh,V(s*.03,-.43,0));
        joint('foot'+side,knee,V(s*.01,-.44,0));
      }
      this.root.updateMatrixWorld(true);
      this.neckRest=this.joints.neck.position.clone();
      this.rest=this.bones.map(b=>b.getWorldPosition(V()));
      const endpoint={hips:V(0,1.13,0),spine:V(0,1.36,0),chest:V(0,1.69,0),
        neck:V(0,1.84,0),head:V(0,2.21,.04)};
      this.segments=this.bones.map((b,i)=>({a:this.rest[i],
        b:endpoint[b.name] || (b.children.find(c=>c.isBone)?.getWorldPosition(V())) || this.rest[i],i}));
      this.skeleton=new THREE.Skeleton(this.bones);
      this.dqReal=this.bones.map(()=>new THREE.Vector4(0,0,0,1));
      this.dqDual=this.bones.map(()=>new THREE.Vector4(0,0,0,0));
      const fur=detailMap('fur'), grain=detailMap('leather');
      const skin=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.94,
        bumpMap:fur,bumpScale:this.species==='rabbit'?.0043:.0035,skinning:true});
      const cloth=new THREE.MeshStandardMaterial({color:this.species==='rabbit'?0x134c55:0x152635,roughness:.72,roughnessMap:roughnessMap('cloth'),
        bumpMap:detailMap('cloth'),bumpScale:.00065,skinning:true,side:THREE.DoubleSide});
      this.skin=this.skinned(this.sculptBody(meshFrom(this.species==='rabbit'&&data.rabbitBody?data.rabbitBody:data.body,true)),skin,true);
      this.sculptHead();this.cast?.sculpt?.(this);
      // A continuous saddle at the crotch with two separate, open leg hems.
      // The previous solid ellipsoid bridge stretched into a flap between legs.
      if(!LionCoach.shortsGeometry){
        const field=p=>{
          const hip=(Math.hypot(p.x/.260,(p.y-1.025)/.185,p.z/.194)-1)*.185;
          let d=hip;
          for(const side of [-1,1]){
            const t=clamp((1.02-p.y)/.29),x=side*(.150+(1.0-p.y)*.07),rx=lerp(.173,.155,t),rz=lerp(.185,.172,t);
            // Round the upper leg into the hip shell. A flat cap here exposed
            // a horizontal shelf beyond the waist; the rounded tip ends inside
            // the hip while the fabric below .90 retains its original profile.
            const leg=(Math.hypot((p.x-x)/rx,p.z/rz,Math.max(0,(p.y-.90)/.17))-1)*Math.min(rx,rz);
            const h=Math.max(.025-Math.abs(d-leg),0)/.025;d=Math.min(d,leg)-h*h*.025*.25;
          }
          return Math.max(d,.735-p.y,p.y-1.085);
        };
        const source=leatherSurface(field,[-.34,.715,-.21],[.34,1.105,.21],.009),p=source.attributes.position,n=source.attributes.normal,uv=source.attributes.uv,positions=[],normals=[],uvs=[];
        for(let i=0;i<p.count;i+=3){
          const flat=y=>[0,1,2].every(k=>Math.abs(p.getY(i+k)-y)<.00001);
          if(flat(.735)||flat(1.085))continue;
          for(let k=0;k<3;k++){positions.push(p.getX(i+k),p.getY(i+k),p.getZ(i+k));normals.push(n.getX(i+k),n.getY(i+k),n.getZ(i+k));uvs.push(uv.getX(i+k),uv.getY(i+k));}
        }
        LionCoach.shortsGeometry=new THREE.BufferGeometry();
        LionCoach.shortsGeometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
        LionCoach.shortsGeometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
        LionCoach.shortsGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
      }
      this.shorts=this.skinned(LionCoach.shortsGeometry.clone(),cloth,false);
      this.gold=new THREE.MeshStandardMaterial({color:0xd8b56c,metalness:.38,roughness:.43});
      this.leather=new THREE.MeshStandardMaterial({color:this.species==='rabbit'?0x2758c1:0xad2529,roughness:.54,roughnessMap:roughnessMap('leather'),
        bumpMap:grain,bumpScale:.0011,metalness:0});
      this.black=new THREE.MeshStandardMaterial({color:0x131518,roughness:.64,bumpMap:grain,bumpScale:.0007,roughnessMap:roughnessMap('leather')});
      this.cream=new THREE.MeshStandardMaterial({color:0xc9b491,roughness:.9});
      const waistband=new THREE.Mesh(new THREE.CylinderGeometry(.244,.249,.061,64,1,true),this.gold);
      waistband.scale.z=.73;waistband.position.y=.098;hips.add(waistband);
      this.addLabel(hips,'SHADOW',V(0,.098,.184),.19,.043);
      // A closed mitt: rounded knuckle crown, tapered dorsum, curled finger
      // pocket and one continuous hooked thumb across the palm. No finger bars.
      const blend=(a,b,k=.010)=>{const h=Math.max(k-Math.abs(a-b),0)/k;return Math.min(a,b)-h*h*k*.25;};
      const ell=(p,c,r)=> (Math.hypot((p.x-c[0])/r[0],(p.y-c[1])/r[1],(p.z-c[2])/r[2])-1)*Math.min(...r);
      // Keep the padded striking crown on the forearm axis. Offsetting the
      // crown toward the dorsum made the visible mitt look cocked even though
      // the hand bone itself was mathematically straight.
      const profile=[[-.137,.091,.068,0],[-.103,.086,.073,0],[-.065,.070,.064,0],[-.025,.056,.052,0],[.040,.052,.047,.002]];
      const thumbPath=new THREE.CubicBezierCurve3(V(-.054,-.038,.024),V(-.102,-.073,.050),V(-.087,-.130,.074),V(-.036,-.147,.058)).getPoints(12);
      const gloveField=p=>{
        let rx,rz,cz;
        if(p.y<-.137){const q=(p.y+.137)/.067,arc=Math.sqrt(Math.max(.00001,1-q*q));rx=.091*arc;rz=.068*arc;cz=0;}
        else {
          let i=1;while(i<profile.length-1&&p.y>profile[i][0])i++;
          const a=profile[i-1],b=profile[i],t=clamp((p.y-a[0])/(b[0]-a[0]));
          const value=c=>{
            const slope=k=>{if(k===0||k===profile.length-1)return 0;const l=(profile[k][c]-profile[k-1][c])/(profile[k][0]-profile[k-1][0]),r=(profile[k+1][c]-profile[k][c])/(profile[k+1][0]-profile[k][0]);return l*r>0?2*l*r/(l+r):0;};
            const t2=t*t,t3=t2*t,h=b[0]-a[0];return (2*t3-3*t2+1)*a[c]+(t3-2*t2+t)*h*slope(i-1)+(-2*t3+3*t2)*b[c]+(t3-t2)*h*slope(i);
          };
          rx=value(1);rz=value(2);cz=value(3);
        }
        let d=(Math.hypot(p.x/rx,(p.z-cz)/rz)-1)*Math.min(rx,rz);
        d=Math.max(d,-.204-p.y,p.y-.040);
        d=blend(d,ell(p,[.007,-.139,.025],[.072,.037,.036]));
        // Recess the centre of the palm; the curled pocket remains distal.
        d=Math.max(d,-ell(p,[.019,-.070,.087],[.045,.033,.046]));
        for(let i=1;i<thumbPath.length;i++){
          const a=thumbPath[i-1],b=thumbPath[i],dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z;
          const t=clamp(((p.x-a.x)*dx+(p.y-a.y)*dy+(p.z-a.z)*dz)/(dx*dx+dy*dy+dz*dz));
          const r=lerp(.023,.018,(i-1+t)/12);
          d=blend(d,Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy,p.z-a.z-t*dz)-r,.009);
        }
        return d;
      };
      const gloveGeometry=LionCoach.gloveGeometry||(LionCoach.gloveGeometry=leatherSurface(gloveField,[-.125,-.218,-.115],[.105,.05,.125],.006));
      const colour=[];const gp=gloveGeometry.attributes.position;
      for(let i=0;i<gp.count;i++){
        const x=gp.getX(i),y=gp.getY(i),z=gp.getZ(i);
        const palm=smooth((z-.016)/.045),fold=Math.exp(-(((y+.129)/.008)**2))*smooth((z-.045)/.025)*smooth((x+.012)/.025);
        const shade=1-.48*palm-.08*fold;colour.push(shade,shade*(1-.08*palm),shade*(1-.12*palm));
      }
      gloveGeometry.setAttribute('color',new THREE.Float32BufferAttribute(colour,3));
      const gloveMaterial=this.leather.clone();gloveMaterial.vertexColors=true;gloveMaterial.roughness=.54;
      const seamMaterial=new THREE.MeshStandardMaterial({color:0x6d171d,roughness:.65});
      const palmMaterial=new THREE.MeshStandardMaterial({color:0x381e20,roughness:.88});
      // Project every stitch onto the sculpt instead of floating seam tubes.
      const surface=(x,y,front=true)=>{
        let outside=front?.15:-.14,inside=outside;
        for(let z=outside;front?z>-.14:z<.15;z+=front?-.002:.002)if(gloveField(V(x,y,z))<=0){inside=z;break;}else outside=z;
        for(let k=0;k<12;k++){const mid=(outside+inside)/2;if(gloveField(V(x,y,mid))>0)outside=mid;else inside=mid;}
        return V(x,y,(inside+outside)/2+(front?.0007:-.0007));
      };
      for(const s of [-1,1]) {
        const side=s===-1?'L':'R',hand=this.joints['hand'+side];
        const glove=new THREE.Mesh(gloveGeometry.clone(),gloveMaterial);glove.name='Boxing glove';
        hand.add(glove);glove.castShadow=true;
        this.gloveMeshes[side]=glove;glove.userData.pressure=0;
        // A flattened oval cuff wraps the wrist; it is not a cylinder handle.
        const cuffGeometry=new THREE.CylinderGeometry(.058,.061,.068,48,12,true);
        cuffGeometry.scale(1,1,.86);
        const cuff=new THREE.Mesh(cuffGeometry,this.black);cuff.name='Oval wrist strap';
        cuff.position.y=.013;hand.add(cuff);
        for(const y of [-.020,.046]){
          const points=[];for(let i=0;i<=64;i++){const a=i/64*Math.PI*2;points.push(V(Math.cos(a)*.060,y,Math.sin(a)*.052));}
          this.curve(hand,points,this.leather,.0015).name='Cuff rolled binding';
        }
        const details=[];
        const seam=(name,xy,material=seamMaterial,r=.0010)=>{
          const part=this.curve(glove,xy.map(([x,y])=>surface(x,y)),material,r);part.name=name;details.push(part);return part;
        };
        seam('Curled finger pocket seam',[[-.014,-.155],[.010,-.152],[.043,-.142],[.064,-.122],[.070,-.098]]);
        seam('Attached curved thumb seam',[[-.058,-.037],[-.083,-.064],[-.090,-.094],[-.075,-.125],[-.050,-.146]],seamMaterial,.0012);
        // Paired stitches follow the finger-pocket seam, never individual fingers.
        for(let i=0;i<14;i++){
          const t=i/13,x=lerp(-.008,.063,t),y=-.155+.030*t*t;
          seam('Pocket stitch',[[x-.001,y-.0018],[x+.001,y+.0018]],this.cream,.00045);
        }
        // One draw call for all stitches on a glove, including shadow passes.
        const stitches=details.filter(part=>part.name==='Pocket stitch'),stitchPosition=[],stitchNormal=[];
        for(const part of stitches){
          const g=part.geometry.toNonIndexed();stitchPosition.push(...g.attributes.position.array);stitchNormal.push(...g.attributes.normal.array);
          glove.remove(part);part.geometry.dispose();g.dispose();
        }
        for(let i=details.length-1;i>=0;i--)if(stitches.includes(details[i]))details.splice(i,1);
        const stitching=new THREE.BufferGeometry();stitching.setAttribute('position',new THREE.Float32BufferAttribute(stitchPosition,3));stitching.setAttribute('normal',new THREE.Float32BufferAttribute(stitchNormal,3));
        const stitchMesh=new THREE.Mesh(stitching,this.cream);stitchMesh.name='Pocket stitching';glove.add(stitchMesh);details.push(stitchMesh);
        for(const [x,y] of [[.016,-.071],[.031,-.074],[.045,-.080]]){
          const dot=new THREE.Mesh(new THREE.SphereGeometry(1,10,6),palmMaterial);dot.position.copy(surface(x,y));dot.scale.set(.0017,.0021,.0008);glove.add(dot);dot.name='Palm ventilation eyelet';
        }
        this.addLabel(hand,'SB',V(0,.013,-.054),.041,.023).rotation.y=Math.PI;
        this.addLabel(hand,'SB',surface(0,-.096,false),.044,.026).rotation.y=Math.PI;
        // All surface details share the foam deformation and mirrored thumb frame.
        // Bake handedness into vertices and winding, so the wrist's local basis
        // remains a proper rotation on both sides (also in shadow passes).
        if(s===1)glove.traverse(part=>{
          part.position.x*=-1;if(!part.geometry)return;
          const g=part.geometry;g.scale(-1,1,1);
          if(g.index){const a=g.index.array;for(let i=0;i<a.length;i+=3){const v=a[i+1];a[i+1]=a[i+2];a[i+2]=v;}}
          else for(const attr of Object.values(g.attributes))for(let i=0;i<attr.count;i+=3)for(let k=0;k<attr.itemSize;k++){
            const a=(i+1)*attr.itemSize+k,b=(i+2)*attr.itemSize+k,v=attr.array[a];attr.array[a]=attr.array[b];attr.array[b]=v;
          }
          g.computeBoundingSphere();
        });
        glove.userData.deformParts=[glove,...details];
        for(const part of glove.userData.deformParts){part.userData.restPosition=new Float32Array(part.geometry.attributes.position.array);part.userData.restNormal=new Float32Array(part.geometry.attributes.normal.array);}
        this.addBoot(this.joints['foot'+side]);
        // Satin side piping follows each thigh, rather than floating beside it.
        this.curve(this.joints['thigh'+side],[V(s*.125,.055,.075),V(s*.15,-.10,.08),V(s*.15,-.25,.08)],this.gold,.006);
      }
      if(this.cast?.face)this.cast.face(this);else if(this.species==='rabbit')this.addRabbitFace();else {this.addFace();this.addMane();}
      this.fitFaceToSkull();
      // Adult athletic proportions: reduce skull/face size consistently with the
      // sculpted skin while retaining a broad lion mane around the neck.
      this.joints.head.children.forEach(part=>{part.position.multiplyScalar(.90);part.scale.multiplyScalar(.90);});
      const smileZ=this.cast?.mouthZ??(this.species==='rabbit'?.249:.284);
      this.celebrationSmile=this.curve(this.joints.head,[V(-.053,.039,smileZ-.013),V(-.027,.013,smileZ),V(0,.008,smileZ+.003),V(.027,.013,smileZ),V(.053,.039,smileZ-.013)],this.black,.0027);
      this.celebrationSmile.visible=false;
      const mouthZ=this.cast?.mouthZ!=null?this.cast.mouthZ+.011:this.species==='rabbit'?.255:.295;
      this.painMouth=this.curve(this.joints.head,[V(-.047,.018,mouthZ),V(-.020,.034,mouthZ+.005),V(.018,.030,mouthZ+.005),V(.043,.008,mouthZ)],this.black,.0033);
      this.painMouth.visible=false;
      this.damageMarks=[];
      for(const side of [-1,1]){
        const material=new THREE.MeshStandardMaterial({color:0x57334a,roughness:.96,transparent:true,opacity:0,depthWrite:false});
        // Place the bruise on the actual rest head surface, not a guessed
        // depth that can bury it underneath the muzzle.
        const positions=this.skin.geometry.attributes.position,inv=this.skeleton.boneInverses[this.bones.indexOf(this.joints.head)];let faceZ=-Infinity;
        for(let i=0;i<positions.count;i++){const p=V().fromBufferAttribute(positions,i).applyMatrix4(inv);if(Math.abs(p.x-side*.103)<.018&&Math.abs(p.y-.128)<.018)faceZ=Math.max(faceZ,p.z);}
        if(!Number.isFinite(faceZ))faceZ=this.species==='rabbit'?.156:.187;
        const mark=this.ellipsoid(this.joints.head,material,V(side*.103,.128,faceZ-.003),V(.039,.024,.008));mark.name='Contact-side bruising';mark.visible=false;this.damageMarks.push({side,mark});
      }
      this.facialRest=this.joints.head.children.filter(part=>part!==this.mane&&part!==this.celebrationSmile&&part!==this.painMouth&&part.position.z>.10).map(part=>({part,z:part.position.z,sy:part.scale.y,eye:part.userData.eye===true}));
      this.tail=new THREE.Group();hips.add(this.tail);
      if(this.species!=='rabbit')this.curve(this.tail,[V(0,-.02,-.16),V(.1,-.2,-.32),V(.16,-.45,-.40),V(.23,-.54,-.29)],
        new THREE.MeshStandardMaterial({color:0x9d713f,roughness:1}),.022);
      const tip=this.ellipsoid(this.tail,new THREE.MeshStandardMaterial({color:0x44301d,roughness:1}),V(.23,-.54,-.29),V(.04,.075,.04));
      tip.rotation.z=-.6;
      if(this.species==='rabbit'){this.tail.clear();this.ellipsoid(this.tail,this.cream,V(0,-.11,-.18),V(.085,.085,.08));}
      this.cast?.finish?.(this);if(!this.cast)window.StoryCast?.groom?.(this); // GOTR-0078: fur locks for the rabbit
      window.AvatarSurface?.addFur(this);
      const convertedMaterials=new Set();
      this.root.traverse(n=>{if(n.isMesh){
        if(n.material.color&&!convertedMaterials.has(n.material)) {
          n.material.color.convertSRGBToLinear();convertedMaterials.add(n.material);
        }
        n.castShadow=n!==this.bodyFur&&n!==this.mane;n.receiveShadow=n!==this.skin&&n!==this.bodyFur;
      }});
      this.update(0,'combo','one_two');
    }

    // CPU equivalent of the actual hybrid vertex/shadow shader, for pose QA.
    skinPoint(mesh,index,target=V()) {
      const g=mesh.geometry,ids=g.attributes.skinIndex,w=g.attributes.skinWeight;
      const p=V().fromBufferAttribute(g.attributes.position,index);window.AvatarAnatomy?.deform(p,this,index,g);window.AvatarSurface?.dent(p,this);p.applyMatrix4(mesh.bindMatrix);
      const q0=this.dqReal[ids.getX(index)],q=new THREE.Vector4(),d=new THREE.Vector4(),linear=V();
      q.set(0,0,0,0);d.set(0,0,0,0);
      for(let k=0;k<4;k++){
        const id=ids.array[index*4+k],weight=w.array[index*4+k],r=this.dqReal[id],dual=this.dqDual[id],sign=q0.dot(r)<0?-1:1;
        q.addScaledVector(r,weight*sign);d.addScaledVector(dual,weight*sign);
        const rotation=new THREE.Quaternion(r.x,r.y,r.z,r.w),translation=new THREE.Quaternion(dual.x,dual.y,dual.z,dual.w).multiply(rotation.clone().conjugate());
        linear.addScaledVector(p.clone().applyQuaternion(rotation).add(V(translation.x*2,translation.y*2,translation.z*2)),weight);
      }
      const length=q.length();q.divideScalar(length);d.divideScalar(length);d.addScaledVector(q,-q.dot(d));
      const rotation=new THREE.Quaternion(q.x,q.y,q.z,q.w),translation=new THREE.Quaternion(d.x,d.y,d.z,d.w).multiply(rotation.clone().conjugate());
      const influence=g.attributes.coachLinear.getX(index);
      target.copy(p).applyQuaternion(rotation).add(V(translation.x*2,translation.y*2,translation.z*2)).lerp(linear,influence);
      target.applyMatrix4(mesh.bindMatrixInverse);return window.AvatarSurface?.correct(target,this,index,g)||target;
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
          z-=back*(.028*blades+.012*bell(Math.abs(x),.22,.055)*bell(y,1.42,.13)-.010*bell(x,0,.025)*bell(y,1.45,.24))*edge;
          x+=Math.sign(x)*.008*bell(Math.abs(x),.19,.06)*bell(y,1.28,.15);
          x*=1+.070*bell(y,1.56,.14)-.035*bell(y,1.22,.12);
        }
        // Rounded quadriceps and calf bellies, tapered at the knee and ankle.
        if(y<.95&&y>.20&&Math.abs(x)>.08&&Math.abs(x)<.32) {
          const quad=.012*bell(y,.78,.13)+.006*bell(y,.68,.055)*bell(Math.abs(x),.15,.04);
          z+=quad*smooth((z+.015)/.08);
          z-=.010*bell(y,.40,.10)*smooth((-z+.005)/.06);
        }
        if(Math.abs(x)>.33&&y>1.20&&y<1.80) {
          // A hard x>.33 branch used to introduce a 10–16 mm step in
          // adjoining vertices. Raised arms turned that step into a folded
          // strip at the rear deltoid. Ease the connected contour in/out.
          const armContour=smooth((Math.abs(x)-.33)/.10)*
            smooth((y-1.20)/.10)*(1-smooth((y-1.70)/.10));
          z+=armContour*(.024*bell(y,1.60,.10)*bell(Math.abs(x),.48,.15)+.016*bell(y,1.46,.09))*smooth((z+.025)/.08);
          z-=armContour*.012*bell(y,1.43,.10)*smooth((-z+.025)/.08);
        }
        if(y>1.76){const amount=.10*smooth((y-1.76)/.10);x*=1-amount;z*=1-amount;y=1.84+(y-1.84)*(1-amount);}
        if(this.species==='rabbit'&&y>1.78){const a=smooth((y-1.78)/.10);x*=1-.13*a;z*=1-.24*a; if(!this.nativeRabbit)y-=.065*smooth((y-2.015)/.11)*smooth((Math.abs(x)-.10)/.065);}
        p.setXYZ(i,x,y,z);
      }
      p.needsUpdate=true;g.computeVertexNormals();return g;
    }

    // GOTR-0064: rounded skull, brow, cheeks and jaw (see headForm); the same field moves the face parts.
    // Runs after the skin is installed: the baked shoulder correctives and the muscle relief are validated against
    // the authored rest surface, so the head is reshaped afterwards and only vertices above the neck base move.
    sculptHead() {
      const g=this.skin.geometry,p=g.attributes.position;
      for(let i=0;i<p.count;i++){
        const x=p.getX(i),y=p.getY(i),z=p.getZ(i);if(y<=1.75)continue;
        const d=this.headForm(x/.9,(y-1.84)/.9,z/.9);p.setXYZ(i,x+.9*d.x,y+.9*d.y,z+.9*d.z);
      }
      p.needsUpdate=true;g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();
    }

    // GOTR-0064: one smooth displacement field for the head, in head-joint coordinates before the 0.9 head scale.
    // The skin and every face part (eyes, brows, nose, whiskers, ears) are moved by the same field, so nothing
    // floats or sinks. It fades out at the neck and stays ~0 around the mouth (animated mouth parts are fixed there).
    headForm(x,y,z,out=this.headShift||(this.headShift=V())) {
      const bell=(v,c,r)=>Math.exp(-(((v-c)/r)**2)),s=x<0?-1:1,ax=Math.abs(x),front=smooth((z+.02)/.10),back=smooth((-z-.02)/.10);
      let dx=0,dy=0,dz=0;
      if(this.cast?.headForm)return this.cast.headForm(x,y,z,out);
      if(this.species==='rabbit'){
        // The skull used to taper to a narrow top between the ears: fill the crown, forehead and occiput.
        const up=smooth((y-.10)/.21);
        dx+=x*.34*up;dz+=z*.24*up;dy+=.016*up*bell(x,0,.13);
        const cheek=.028*bell(y,.070,.055)*bell(ax,.150,.055)*smooth(z/.08);dx+=s*.85*cheek;dz+=.5*cheek;
        dx+=s*.013*bell(y,0,.045)*smooth((ax-.08)/.05)*smooth((z+.05)/.08);
        dz+=.010*bell(y,-.015,.030)*bell(x,0,.06)*smooth((z-.10)/.06);
        dz+=.008*bell(y,.215,.020)*bell(ax,.080,.045)*front;
      }else{
        // Dome between the ears above the brow line (was a flat top), fuller forehead and occiput.
        // Kept low and fairly flat in front: the mane's hairline comes down over it, so the forehead stays short.
        dy+=.020*smooth((y-.235)/.11)*bell(x,0,.20);
        dz+=.014*bell(y,.30,.08)*bell(x,0,.15)*front-.030*back*bell(y,.20,.16);
        // Heavy brow over the eyes, nose bridge, cheekbones, wider whisker pads, chin and jaw.
        dz+=.014*bell(y,.222,.020)*bell(ax,.085,.050)*front+.008*bell(x,0,.030)*bell(y,.19,.05)*front;
        const cheek=.014*bell(y,.120,.045)*bell(ax,.170,.050)*front;dx+=s*.8*cheek;dz+=.4*cheek;
        dx+=s*.010*bell(y,.055,.040)*bell(ax,.10,.05)*smooth((z-.20)/.05);
        const chin=bell(y,-.020,.030)*bell(x,0,.07)*smooth((z-.12)/.06);dz+=.014*chin;dy-=.008*chin;
        dx+=s*.012*bell(y,0,.05)*smooth((ax-.09)/.05)*smooth((z+.05)/.08);
      }
      const fade=smooth((y+.09)/.05);return out.set(dx*fade,dy*fade,dz*fade);
    }
    // Move the face parts with the sculpted skull: placed parts move as a whole, drawn curves vertex by vertex.
    fitFaceToSkull() {
      for(const part of this.joints.head.children){
        if(part===this.mane||part.userData.mane)continue;
        if(part.position.lengthSq()>0||!part.geometry){part.position.add(this.headForm(part.position.x,part.position.y,part.position.z));continue;}
        const p=part.geometry.attributes.position;
        for(let i=0;i<p.count;i++){const d=this.headForm(p.getX(i),p.getY(i),p.getZ(i));p.setXYZ(i,p.getX(i)+d.x,p.getY(i)+d.y,p.getZ(i)+d.z);}
        p.needsUpdate=true;part.geometry.computeBoundingSphere();
      }
    }

    skinned(g,material,colour) {
      const positions=g.attributes.position, ids=[],weights=[],colors=[],linear=[];
      const tawny=new THREE.Color(this.cast?.fur||(this.species==='rabbit'?'#939ba7':'#b98143')).convertSRGBToLinear(), light=new THREE.Color(this.cast?.light||(this.species==='rabbit'?'#f0e9df':'#e1cda1')).convertSRGBToLinear();
      for(let i=0;i<positions.count;i++) {
        const p=V().fromBufferAttribute(positions,i);
        const u=Math.abs(p.x);
        // Blend linear skinning into the axillary fold to reduce DQ bulging;
        // the shoulder cap and arm bellies retain their volume.
        linear.push(colour?.30*smooth((u-.23)/.08)*(1-smooth((u-.38)/.12))*smooth((p.y-1.30)/.12)*(1-smooth((p.y-1.53)/.10)):0);
        const influences=new Map();
        const put=(name,w)=>influences.set(this.bones.indexOf(this.joints[name]),w);
        const mix=(a,b,t,w=1)=>{put(a,(1-t)*w);put(b,t*w);};
        if(p.y>1.76) {
          mix('neck','head',smooth((p.y-1.76)/.12));
        } else if(!colour||(p.y<1.06&&Math.abs(p.x)<.32)) {
          const side=p.x<0?'L':'R';
          if(p.y>.64){
            // Keep the groin under the pelvis and blend both legs continuously
            // across the centre seam. An x<0 switch tears the crotch in a stride.
            const medial=1-smooth(Math.abs(p.x)/.13);
            const thigh=smooth((1.06-p.y)/.17)*(1-.90*medial*smooth((p.y-.68)/.14));
            const right=smooth((p.x+.055)/.11);
            put('hips',1-thigh);put('thighL',thigh*(1-right));put('thighR',thigh*right);
          }
          else if(p.y>.24)mix('thigh'+side,'knee'+side,smooth((.65-p.y)/.16));
          else mix('knee'+side,'foot'+side,smooth((.24-p.y)/.13));
        } else {
          // Harmonic attachment follows mesh connectivity around the T-pose
          // shoulder. Opposing chest/arm surfaces across an empty armpit never
          // share weights merely because their coordinates are close.
          const arm=g.attributes.coachArmBlend.getX(i);
          if(p.y<1.28)mix('hips','spine',smooth((p.y-1.06)/.18),1-arm);
          else if(p.y<1.67)mix('spine','chest',smooth((p.y-1.28)/.22),1-arm);
          else mix('chest','neck',smooth((p.y-1.67)/.12),1-arm);
          if(arm>0) {
            const side=p.x<0?'L':'R';
            const along=Math.abs(p.x)-.6538361203;
            mix('arm'+side,'elbow'+side,smooth((along+.055)/.11),arm);
          }
        }
        // Shoulder blades glide around the rib cage as the shoulder reaches.
        // Keep the medial spine fixed while the outer back follows the scapula.
        if(colour&&p.y>1.36&&p.y<1.73&&p.z<-.04){
          const amount=.52*Math.exp(-(((Math.abs(p.x)-.18)/.095)**2))*smooth((p.y-1.36)/.13)*(1-smooth((p.y-1.64)/.09))*smooth((-p.z-.04)/.07);
          for(const [id,weight] of influences)influences.set(id,weight*(1-amount));
          put('scapula'+(p.x<0?'L':'R'),amount);
        }
        const entries=[...influences].filter(([,w])=>w>0).sort((a,b)=>b[1]-a[1]).slice(0,4);
        const total=entries.reduce((sum,entry)=>sum+entry[1],0)||1;for(const entry of entries)entry[1]/=total;
        while(entries.length<4)entries.push([0,0]);
        ids.push(...entries.map(([i])=>i));weights.push(...entries.map(([,w])=>w));
        if(colour) {
          const face=p.y>1.82 && p.z>.175;
          const muzzle=face && p.y<1.954 ? smooth((p.z-.18)*14) : 0;
          const bib=p.z>.08&&p.y>1.13&&p.y<1.70 ? .48*Math.exp(-((p.x/.16)**2))*smooth((p.y-1.13)/.12)*smooth((1.70-p.y)/.10) : 0;
          const c=tawny.clone().lerp(light,Math.max(muzzle,bib));this.cast?.colour?.(p,c,tawny,light);
          c.multiplyScalar(1+.04*Math.sin(p.y*110+p.x*56)*Math.sin(p.z*143));
          c.multiplyScalar(1-.13*smooth((-p.z-.03)/.15));
          // Tonal separation at muscle borders now comes from the muscle-definition
          // crease term (avatar-anatomy.js), which follows every muscle, not one band.
          colors.push(c.r,c.g,c.b);
        }
      }
      g.setAttribute('coachLinear',new THREE.Float32BufferAttribute(linear,1));
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
          attribute float coachLinear;
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
          vec3 coachN=(bindMatrix*vec4(objectNormal,0.0)).xyz,coachLN=vec3(0.0);
          for(int k=0;k<4;k++)coachLN+=skinWeight[k]*qrotate(coachReal[int(skinIndex[k])],coachN);
          objectNormal=(bindMatrixInverse*vec4(mix(qrotate(coachQ,coachN),coachLN,coachLinear),0.0)).xyz;
          #ifdef USE_TANGENT
            objectTangent=(bindMatrixInverse*vec4(qrotate(coachQ,(bindMatrix*vec4(objectTangent,0.0)).xyz),0.0)).xyz;
          #endif`);
        shader.vertexShader=shader.vertexShader.replace('#include <skinning_vertex>',`
          vec3 coachP=(bindMatrix*vec4(transformed,1.0)).xyz;
          vec3 coachT=2.0*qmul(coachD,vec4(-coachQ.xyz,coachQ.w)).xyz;
          vec3 coachLP=vec3(0.0);
          for(int k=0;k<4;k++){
            int i=int(skinIndex[k]);vec4 q=coachReal[i],d=coachDual[i];
            coachLP+=skinWeight[k]*(qrotate(q,coachP)+2.0*qmul(d,vec4(-q.xyz,q.w)).xyz);
          }
          transformed=(bindMatrixInverse*vec4(mix(qrotate(coachQ,coachP)+coachT,coachLP,coachLinear),1.0)).xyz;`);
      };
      material.onBeforeCompile=skinShader;
      material.customProgramCacheKey=()=>`lion-hybrid-${this.bones.length}`;
      m.customDepthMaterial=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking,skinning:true});
      m.customDistanceMaterial=new THREE.MeshDistanceMaterial({skinning:true});
      for(const shadowMaterial of [m.customDepthMaterial,m.customDistanceMaterial]) {
        shadowMaterial.onBeforeCompile=skinShader;
        shadowMaterial.customProgramCacheKey=material.customProgramCacheKey;
      }
      window.AvatarSurface?.install(m,this,colour);
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
      if(window.BoxingFootwear)return window.BoxingFootwear.attach(foot,{species:this.species});
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
      const head=this.joints.head,white=new THREE.MeshStandardMaterial({color:0xe6e2dc,roughness:.9,bumpMap:this.skin.material.bumpMap,bumpScale:.004});
      const grey=new THREE.MeshStandardMaterial({color:0x939ba7,roughness:.94,bumpMap:this.skin.material.bumpMap,bumpScale:.004});
      const pink=new THREE.MeshStandardMaterial({color:0xbb8186,roughness:.85});
      const eye=new THREE.MeshPhysicalMaterial({color:0x201715,roughness:.28,clearcoat:.35});
      this.rabbitEars=[];
      for(const s of [-1,1]){
        const ear=new THREE.Group();ear.position.set(s*.085,.235,-.012);head.add(ear);this.rabbitEars.push(ear);
        this.ellipsoid(ear,grey,V(0,.20,0),V(.064,.255,.042));
        // GOTR-0064: a thick ear root that grows out of the skull instead of a thin tip stuck into it.
        this.ellipsoid(ear,grey,V(0,.045,-.004),V(.060,.085,.047));
        this.ellipsoid(ear,pink,V(0,.205,.034),V(.036,.207,.013));
        this.ellipsoid(head,eye,V(s*.079,.17,.147),V(.030,.025,.021)).userData.eye=true;
        this.ellipsoid(head,white,V(s*.064,.087,.207),V(.068,.052,.059));
        const tooth=this.ellipsoid(head,white,V(s*.014,.035,.244),V(.011,.019,.008));tooth.userData.tooth=true;tooth.visible=false;
        this.ellipsoid(head,new THREE.MeshBasicMaterial({color:0xffffff}),V(s*.079-.008,.180,.1655),V(.0055,.0055,.0025)).userData.eye=true;
        this.curve(head,[V(s*.048,.208,.143),V(s*.085,.216,.139),V(s*.114,.195,.124)],grey,.008);
        for(let i=0;i<3;i++)this.curve(head,[V(s*.057,.095-i*.017,.271),V(s*.16,.10-i*.017,.29),V(s*.23,.12-i*.025,.27)],white,.0009);
      }
      const noseShape=new THREE.Shape();noseShape.moveTo(-.025,.012);noseShape.quadraticCurveTo(0,.020,.025,.012);noseShape.quadraticCurveTo(.018,-.002,0,-.015);noseShape.quadraticCurveTo(-.018,-.002,-.025,.012);
      const nose=new THREE.Mesh(new THREE.ExtrudeGeometry(noseShape,{depth:.009,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:.003,bevelThickness:.003}),pink);nose.position.set(0,.112,.261);head.add(nose);
      this.curve(head,[V(0,.103,.273),V(0,.065,.264),V(-.032,.047,.247)],this.black,.0016);
      this.curve(head,[V(0,.065,.264),V(.032,.047,.247)],this.black,.0016);
      const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute([],3));
      this.mane=new THREE.Mesh(g,grey);this.maneRest=[];this.maneFlex=[];
    }
    addFace() {
      const head=this.joints.head;
      const wet=new THREE.MeshPhysicalMaterial({color:0x231c18,roughness:.34,clearcoat:.3,bumpMap:detailMap('leather'),bumpScale:.00045});
      const amber=new THREE.MeshPhysicalMaterial({color:0xb58b39,roughness:.28,clearcoat:.45});
      for(const s of [-1,1]) {
        // GOTR-0064: larger eyes that read at phone size (dark rim, amber iris, pupil, one clear highlight).
        this.ellipsoid(head,wet,V(s*.091,.171,.176),V(.038,.027,.0235)).userData.eye=true;
        this.ellipsoid(head,amber,V(s*.091,.171,.1965),V(.0265,.0200,.011)).userData.eye=true;
        this.ellipsoid(head,this.black,V(s*.091,.172,.2065),V(.0115,.0140,.004)).userData.eye=true;
        this.ellipsoid(head,new THREE.MeshBasicMaterial({color:0xfff5df}),V(s*.091-.009,.181,.2095),V(.005,.005,.002)).userData.eye=true;
        this.curve(head,[V(s*.046,.181,.192),V(s*.09,.203,.193),V(s*.134,.180,.172)],wet,.0050);
        this.ellipsoid(head,new THREE.MeshStandardMaterial({color:0x705037,roughness:1}),V(s*.164,.265,.025),V(.044,.050,.014));
        this.ellipsoid(head,new THREE.MeshStandardMaterial({color:0x604325,roughness:1}),V(s*.164,.265,-.044),V(.048,.053,.011));
        this.curve(head,[V(s*.054,.148,.196),V(s*.092,.143,.203),V(s*.125,.153,.183)],wet,.0025);
        // Strong brow: low at the nose, lifted outside, for a focused look.
        this.curve(head,[V(s*.038,.205,.187),V(s*.086,.220,.177),V(s*.137,.215,.149)],new THREE.MeshStandardMaterial({color:0x5d3d20,roughness:.95}),.0072);
        this.curve(head,[V(0,.051,.300),V(s*.035,.015,.287),V(s*.094,.024,.269)],wet,.003);
        for(let i=0;i<7;i++) {
          const y=.044+(i%3)*.016,x=s*(.052+Math.floor(i/3)*.017);
          this.ellipsoid(head,wet,V(x,y,.292-Math.abs(x)*.12),V(.002,.002,.002));
          if(i<4) this.curve(head,[V(x,y,.294),V(s*.16,y+.005,.31),V(s*(.23+i*.012),y+.02-i*.013,.31)],this.cream,.0007);
        }
      }
      // A broad, tapered feline nose leather, not a round human nose ball.
      const shape=new THREE.Shape();shape.moveTo(-.052,.018);shape.quadraticCurveTo(-.054,.032,-.035,.033);shape.quadraticCurveTo(0,.027,.035,.033);shape.quadraticCurveTo(.054,.032,.052,.018);shape.quadraticCurveTo(.039,-.004,.013,-.021);shape.quadraticCurveTo(0,-.029,-.013,-.021);shape.quadraticCurveTo(-.039,-.004,-.052,.018);
      const nose=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:.015,bevelEnabled:true,bevelSize:.005,bevelThickness:.005,bevelSegments:4,steps:1}),wet);
      nose.position.set(0,.101,.291);head.add(nose);
      for(const side of [-1,1])this.ellipsoid(head,this.black,V(side*.036,.104,.311),V(.011,.006,.002));
      this.curve(head,[V(0,.08,.312),V(0,.051,.301)],wet,.003);
    }
    addMane() {
      // GOTR-0064: a full rounded mane. The old one was a thin upright disc with bristles (a pointed crest in side
      // view). The coat is now a deep rounded hood around the skull and neck that reaches the shoulders, covered by
      // broad overlapping locks that lie along it: they frame the face at the rim and flow back and down behind.
      const positions=[],normals=[],colors=[],flex=[],guideIds=[],head=this.joints.head;
      const centre=V(0,.09,-.085),power=2.3;
      const hood=n=>{const rx=.345,ry=n.y>0?.355:.43,rz=n.z>0?lerp(.15,.24,smooth(-n.y*1.4))+.16*smooth((n.y-.42)/.25)*Math.exp(-((n.x/.38)**2)):.31;
        return Math.pow(Math.pow(Math.abs(n.x/rx),power)+Math.pow(Math.abs(n.y/ry),power)+Math.pow(Math.abs(n.z/rz),power),-1/power);};
      const undercoat=this.ellipsoid(head,new THREE.MeshStandardMaterial({color:0x4a2f1a,roughness:1,
        bumpMap:detailMap('fur'),bumpScale:.004}),centre,V(1,1,1));undercoat.userData.mane=true;
      const surface=undercoat.geometry.attributes.position,direction=V();
      for(let i=0;i<surface.count;i++) {
        direction.fromBufferAttribute(surface,i).normalize();direction.multiplyScalar(.93*hood(direction));
        surface.setXYZ(i,direction.x,direction.y,direction.z);
      }
      surface.needsUpdate=true;undercoat.geometry.computeVertexNormals();undercoat.geometry.computeBoundingSphere();
      const count=1500,across=V(),lift=V(),tangent=V(),flow=V(),point=V(),shade=new THREE.Color();
      for(let i=0;i<count;i++) {
        const a=i*2.399963229728653,nz=-1+2*(i+.5)/count,r=Math.sqrt(1-nz*nz);
        const normal=V(Math.cos(a)*r,Math.sin(a)*r,nz),root=normal.clone().multiplyScalar(hood(normal)).add(centre);
        const r0=random(),r1=random(),r2=random(),r3=random();
        // The face stays open up to a low hairline over the forehead, and so do the ears at its upper corners.
        if(root.z>-.01&&((root.x/.215)**2+((root.y-.105)/.215)**2<1||Math.hypot(Math.abs(root.x)-.168,root.y-.275)<.062))continue;
        const rim=smooth((root.z+.10)/.16),top=smooth((normal.y+.1)/.8),low=smooth(-normal.y*1.2);
        // Behind the face the locks flow back over the crown and down the neck; at the rim they fan out around the face.
        flow.set(normal.x*.25,-.55-.45*(1-top),-.8*top-.25);
        tangent.set(root.x,root.y-.13,0).normalize().add(V(0,-.25,-.35));flow.lerp(tangent,rim*.75);
        // A short fringe along the hairline falls forward onto the top of the forehead.
        const fringe=smooth((root.z-.02)/.06)*smooth((root.y-.27)/.05)*(1-smooth((Math.abs(root.x)-.10)/.08));
        flow.lerp(tangent.set(root.x*2.2,-.55,.75),fringe);
        tangent.copy(flow).addScaledVector(normal,-flow.dot(normal));
        if(tangent.lengthSq()<1e-6)tangent.set(0,-normal.z,normal.y);tangent.normalize();
        // A little spread in direction keeps the locks from lining up in rows.
        tangent.applyAxisAngle(normal,(r2-.5)*.7);
        const angle=.30+.25*rim+.15*r0,forward=tangent.clone().multiplyScalar(Math.cos(angle)).addScaledVector(normal,Math.sin(angle));
        const length=(.125+.085*r1)*(1+.5*low)*(1-.25*rim*top)*(1-.50*fringe),width=.013+.012*r2,curl=(r3-.5)*.06;
        across.crossVectors(forward,normal).normalize();lift.copy(normal).addScaledVector(forward,-normal.dot(forward)).normalize();
        const tone=clamp(rim*.8+top*.25-low*.3+(r3-.5)*.3);
        const colour=new THREE.Color().setHSL(lerp(.068,.085,tone)+r0*.01,lerp(.46,.58,tone),lerp(.15,.35,tone));
        const sector=Math.min(5,Math.floor(((Math.atan2(normal.z,normal.x)+Math.PI)/(2*Math.PI))*6)),band=Math.min(3,Math.floor((normal.y+1)*2)),guide=band*6+sector;
        const stations=[];
        for(let j=0;j<=4;j++) {
          const t=j/4,half=width*(1-t)*(.6+1.6*t);
          point.copy(root).addScaledVector(normal,-.012).addScaledVector(forward,length*t).addScaledVector(normal,-.30*length*t*t).addScaledVector(across,curl*t*t);
          point.y-=.035*t*t*(1-.6*top);
          stations.push({t,p:[point.clone().addScaledVector(across,-half),point.clone().addScaledVector(lift,.35*half),point.clone().addScaledVector(across,half)]});
        }
        // Soft shading: each lock is a shallow ridge whose normals lean toward the coat normal.
        const ridge=[lift.clone().multiplyScalar(.6).addScaledVector(across,-.8).addScaledVector(normal,.3).normalize(),lift.clone().addScaledVector(normal,.3).normalize(),lift.clone().multiplyScalar(.6).addScaledVector(across,.8).addScaledVector(normal,.3).normalize()];
        for(let j=0;j<4;j++) {
          const p=stations[j],q=stations[j+1];
          for(const [station,k] of [[p,0],[p,1],[q,0],[p,1],[q,1],[q,0],[p,1],[p,2],[q,1],[p,2],[q,2],[q,1]]) {
            const v=station.p[k],m=ridge[k];positions.push(v.x,v.y,v.z);normals.push(m.x,m.y,m.z);flex.push(station.t);guideIds.push(guide);
            shade.copy(colour).multiplyScalar((.70+.44*station.t)*(k===1?1.06:1)).convertSRGBToLinear();colors.push(shade.r,shade.g,shade.b);
          }
        }
      }
      const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
      g.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
      g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
      const mane=new THREE.Mesh(g,new THREE.MeshStandardMaterial({vertexColors:true,side:THREE.DoubleSide,roughness:1}));
      head.add(mane);this.mane=mane;
      this.maneRest=new Float32Array(positions);this.maneFlex=new Float32Array(flex);this.maneGuideIds=new Uint8Array(guideIds);
      this.maneGuides=Array.from({length:24},(_,i)=>{
        const y=-.75+Math.floor(i/6)*.5,a=-Math.PI+(i%6+.5)*Math.PI/3,r=Math.sqrt(1-y*y),normal=V(Math.cos(a)*r,y,Math.sin(a)*r);
        return {rest:normal.clone().multiplyScalar(hood(normal)+.06).add(centre),position:V(),velocity:V(),offset:V(),normal};
      });
    }

    updateMane(time) {
      if(!this.maneGuides)return;
      this.root.updateMatrixWorld(true);
      const dt=this.maneTime==null?0:time-this.maneTime;
      this.maneTime=time;
      const frame=this.root.parent||this.root;
      const reset=dt<0||dt>.25||!this.maneInitialized||this.maneFrame!==frame.uuid;this.maneFrame=frame.uuid;
      const step=Math.min(.05,Math.max(0,dt)),count=Math.max(1,Math.ceil(step*120)),h=step/count;
      const toFrame=this.maneToFrame||(this.maneToFrame=new THREE.Matrix4()),toMane=this.frameToMane||(this.frameToMane=new THREE.Matrix4());
      toFrame.copy(frame.matrixWorld).invert().multiply(this.mane.matrixWorld);toMane.copy(this.mane.matrixWorld).invert().multiply(frame.matrixWorld);
      const target=this.maneTarget||(this.maneTarget=V()),force=this.maneForce||(this.maneForce=V()),displacement=this.maneDisplacement||(this.maneDisplacement=V());
      for(const [i,guide] of this.maneGuides.entries()){
        target.copy(guide.rest).applyMatrix4(toFrame);
        if(reset){guide.position.copy(target);guide.velocity.set(0,0,0);}
        else for(let k=0;k<count;k++){
          const stiffness=110+(i%6)*8,damping=19+(Math.floor(i/6))*1.2;
          guide.velocity.addScaledVector(force.copy(target).sub(guide.position),stiffness*h).multiplyScalar(Math.exp(-damping*h));
          guide.position.addScaledVector(guide.velocity,h);
          displacement.copy(guide.position).sub(target);
          if(displacement.lengthSq()>.055*.055){displacement.clampLength(0,.055);guide.position.copy(target).add(displacement);guide.velocity.multiplyScalar(.6);}
        }
        guide.offset.copy(guide.position).applyMatrix4(toMane).sub(guide.rest);
        // Broad groom collision: prevent tips folding into their rooted coat.
        const inward=guide.offset.dot(guide.normal);
        if(inward<-.018)guide.offset.addScaledVector(guide.normal,-.018-inward);
      }
      this.maneInitialized=true;
      const hair=this.mane.geometry.attributes.position;
      const vertices=hair.array;
      for(let i=0;i<hair.count;i++){
        const f=this.maneFlex[i]**2,offset=this.maneGuides[this.maneGuideIds[i]].offset,k=i*3;
        vertices[k]=this.maneRest[k]+offset.x*f;vertices[k+1]=this.maneRest[k+1]+offset.y*f;vertices[k+2]=this.maneRest[k+2]+offset.z*f;
      }
      hair.needsUpdate=true;
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
    guideAim(side,move,target,pole,time,kind) {
      const key=side+move+kind,old=this.aimWristGuide;
      let bend=pole.clone().normalize();
      if(Number.isFinite(time)){
        if(old?.key===key&&time===old.time){
          target.copy(old.position);bend.copy(old.pole);
        }else if(old?.key===key&&time>old.time&&time-old.time<.1){
          const response=.035;
          const blend=1-Math.exp(-(time-old.time)/response);
          target.copy(old.position.clone().lerp(target,blend));
        }
      }
      // The shoulder moves during weight transfer. Recheck both IK limits
      // after smoothing so a retained wrist can neither stretch nor fold past it.
      const shoulder=this.point(this.joints['arm'+side]);
      const upper=this.joints['elbow'+side].position.length(),lower=this.joints['hand'+side].position.length();
      target.copy(shoulder.clone().add(target.clone().sub(shoulder).clampLength(foldedArmReach(upper,lower),upper+lower-.003)));
      // Filter the actual elbow plane, perpendicular to the CURRENT reach
      // axis. Interpolating unprojected world poles can cross the reach axis
      // and spin the arm even though the wrist trajectory is smooth.
      const axis=target.clone().sub(shoulder).normalize();
      bend.addScaledVector(axis,-bend.dot(axis));
      if(bend.lengthSq()<1e-8){bend.set(side==='L'?-.6:.6,-1,.1);bend.addScaledVector(axis,-bend.dot(axis));}
      bend.normalize();
      if(old?.key===key&&old.axis&&time>old.time&&time-old.time<.1){
        const previous=old.pole.clone().applyQuaternion(new THREE.Quaternion().setFromUnitVectors(old.axis,axis));
        const angle=Math.atan2(axis.dot(previous.clone().cross(bend)),previous.dot(bend));
        const dt=time-old.time,blend=1-Math.exp(-dt/.035);
        bend=previous.applyAxisAngle(axis,clamp(angle*blend,-dt*12,dt*12)).normalize();
      }
      if(Number.isFinite(time))this.aimWristGuide={key,time,position:target.clone(),pole:bend.clone(),axis};
      return bend;
    }
    solve(a,b,end,target,pole) {
      // Analytic two-bone IK. Clamp reach before computing a stable bend plane.
      this.root.updateMatrixWorld(true);
      const start=this.point(a), l1=b.position.length(),l2=end.position.length();
      const delta=target.clone().sub(start),d=clamp(delta.length(),a.name.startsWith('arm')?foldedArmReach(l1,l2):Math.abs(l1-l2)+.004,l1+l2-.001);
      const dir=delta.normalize(),along=(l1*l1-l2*l2+d*d)/(2*d);
      let bend=pole.clone().addScaledVector(dir,-pole.dot(dir));
      if(bend.lengthSq()<1e-8){const fallback=Math.abs(dir.y)<.90?V(0,-1,0):V(1,0,0);bend=fallback.addScaledVector(dir,-fallback.dot(dir));}
      bend.normalize();
      const mid=start.clone().addScaledVector(dir,along).addScaledVector(bend,Math.sqrt(Math.max(0,l1*l1-along*along)));
      const reachable=start.clone().addScaledVector(dir,d);
      if(a.name.startsWith('arm')){
        // Preserve a shared anatomical elbow plane. Direction-only rotations
        // left humeral roll undefined and twisted the shoulder during punches.
        const plane=dir.clone().cross(bend).normalize();
        const align=(bone,restAxis,axis)=>{
          restAxis.normalize();axis.normalize();
          // The authored arm faces +Z. Its outer elbow fold is -Z;
          // using -Y here adds a spurious quarter-turn to the entire limb.
          const restBend=V(0,0,-1).addScaledVector(restAxis,restAxis.z).normalize();
          const restNormal=restAxis.clone().cross(restBend).normalize();
          const targetBend=plane.clone().cross(axis).normalize();
          const restBasis=new THREE.Matrix4().makeBasis(restAxis,restBend,restNormal);
          const targetBasis=new THREE.Matrix4().makeBasis(axis,targetBend,plane);
          this.orient(bone,new THREE.Quaternion().setFromRotationMatrix(targetBasis.multiply(restBasis.invert())));
        };
        align(a,b.position.clone(),mid.clone().sub(start));
        align(b,end.position.clone(),reachable.clone().sub(mid));
      }else{
        this.orient(a,new THREE.Quaternion().setFromUnitVectors(b.position.clone().normalize(),mid.clone().sub(start).normalize()));
        this.orient(b,new THREE.Quaternion().setFromUnitVectors(end.position.clone().normalize(),reachable.clone().sub(mid).normalize()));
      }
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
      // Rebuild the palm reference from the CURRENT forearm on every frame.
      // Transporting a frame captured on the first animation frame produced
      // incorrect glove roll after large torso/arm rotations. The wrist axis
      // always remains exactly collinear with the elbow-to-hand direction.
      const neutral=project(inward);
      const downward=project(palmTarget);
      const fallback=project(V(0,0,1));
      const safeNeutral=neutral.lengthSq()>1e-8?neutral:fallback;
      const safeDown=downward.lengthSq()>1e-8?downward:safeNeutral;
      const angle=Math.atan2(distal.dot(safeNeutral.clone().cross(safeDown)),safeNeutral.dot(safeDown));
      // Uppercuts finish with the knuckles over the forearm, never with a
      // sideways-flared glove. Preserve the anatomical wrist axis and roll
      // the thumb toward the torso during the upward drive.
      const palm=safeNeutral.clone().applyAxisAngle(distal,angle*clamp(turn));
      const y=distal.clone().negate(),x=y.clone().cross(palm).normalize();
      const z=x.clone().cross(y).normalize();
      this.orient(hand,new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x,y,z)));
      const centre=V(0,-.140,0),face=V(0,-.204,0);
      const knuckles=this.root.worldToLocal(hand.localToWorld(centre)),strikePoint=this.root.worldToLocal(hand.localToWorld(face));
      return {distal:distal.toArray(),palm:z.toArray(),palmTarget:palmTarget.toArray(),turn,knuckles:knuckles.toArray(),strikePoint:strikePoint.toArray(),radius:.064};
    }

    // A conservative padded-glove envelope against the skull and muzzle.
    // Move the speed-bag recovery in front of the head, never through it.
    clearOwnFace(side,glove,palmTarget,pole,reference=null) {
      const j=this.joints,hand=j['hand'+side],head=j.head;
      // GOTR-0027: the clearance a guard glove needs can switch between ~0 and ~23 cm from one tick to the next
      // (a 1 mm touch of the muzzle starts a walk to the front of the face). Without a reference the correction
      // is therefore remembered per hand and may change by at most 3.5 cm per pose (guard hands only), so the guard eases out of
      // and back into the face line instead of jumping. A time jump (seek, new drill) forgets it.
      const free=!!this.faceFree?.includes(side);
      const memory=reference&&!reference.cheek?null:(this.faceMemory||(this.faceMemory={L:V(),R:V(),time:null})),start=memory?this.point(hand):null;
      let fresh=false;if(memory){const time=this.renderTime;fresh=!(Number.isFinite(time)&&Number.isFinite(memory.time)&&time-memory.time>=0&&time-memory.time<.1);if(fresh){memory.L.set(0,0,0);memory.R.set(0,0,0);memory.fresh={L:true,R:true};}memory.time=time;fresh=!!memory.fresh?.[side];if(memory.fresh)memory.fresh[side]=false;}
      // A change from cheek to forward clearance for an explicit block is taken at once; other changes ease in.
      if(memory){const mode=reference?.cheek?'cheek':'forward';memory.mode=memory.mode||{};if(memory.mode[side]&&memory.mode[side]!==mode&&this.faceBlock)fresh=true;memory.mode[side]=mode;}
      const place=offset=>{const shoulder=this.point(j['arm'+side]),upper=j['elbow'+side].position.length(),lower=hand.position.length(),target=start.clone().add(offset);
        target.copy(shoulder.clone().add(target.clone().sub(shoulder).clampLength(foldedArmReach(upper,lower),upper+lower-.002)));
        const e=this.solve(j['arm'+side],j['elbow'+side],hand,target,pole);glove=this.orientGlove(side,glove.turn,palmTarget);return e;};
      const sign=side==='L'?-1:1;
      const samples=[[0,.015,0,.077],[0,-.07,0,.089],[0,-.145,0,.099],[0,-.195,0,.068],[sign*.075,-.10,.05,.067]];
      const shapes=[[0,.13,.03,.17,.20,.17],[0,.065,.195,.135,.105,.125]];
      let error=0;
      for(let iteration=0;iteration<8;iteration++){
        const toHead=new THREE.Matrix4().multiplyMatrices(head.matrixWorld.clone().invert(),hand.matrixWorld);
        let forward=0,lateral=0,shape=0;
        for(const [x,y,z,r] of samples){
          const p=V(x,y,z).applyMatrix4(toHead);
          shape=0;for(const [cx,cy,cz,rx,ry,rz] of shapes){const muzzle=shape++===1;
            // A tight outer ellipsoid contains skull + padding (support-function
            // Cauchy bound); using the smallest radius over-inflated the muzzle.
            const pad=r+.006,beta=pad/Math.cbrt(rx*ry*rz);
            const extent=a=>Math.sqrt((1+beta)*a*a+(1+1/beta)*pad*pad);
            const radial=((p.x-cx)/extent(rx))**2+((p.y-cy)/extent(ry))**2;
            // Cheek mode (compact guard): stay in front of the skull but pass BESIDE the muzzle instead of in front of it.
            if(radial<1&&!(reference?.cheek&&muzzle))forward=Math.max(forward,cz+extent(rz)*Math.sqrt(1-radial)-p.z);
            if(reference?.lateral||reference?.cheek&&muzzle){const sideRadial=((p.y-cy)/extent(ry))**2+((p.z-cz)/extent(rz))**2;if(sideRadial<1)lateral=Math.max(lateral,sign*(cx+sign*extent(rx)*Math.sqrt(1-sideRadial)-p.x));}
          }
        }
        const sideways=reference?.lateral||reference?.cheek&&forward<.0002,clearance=sideways?lateral:forward;
        if(clearance<.0002)break;
        const direction=V(sideways?sign:0,0,sideways?0:1).applyQuaternion(head.getWorldQuaternion(new THREE.Quaternion()))
          .applyQuaternion(this.root.getWorldQuaternion(new THREE.Quaternion()).invert());
        const shoulder=this.point(j['arm'+side]),target=this.point(hand).addScaledVector(direction,Math.min(.15,clearance+.001));
        const upper=j['elbow'+side].position.length(),lower=hand.position.length();
        target.copy(shoulder.clone().add(target.clone().sub(shoulder).clampLength(foldedArmReach(upper,lower),upper+lower-.002)));
        error=this.solve(j['arm'+side],j['elbow'+side],hand,target,reference&&!reference.cheek?this.contactBendPole(side,target,reference):pole);
        glove=this.orientGlove(side,glove.turn,palmTarget);
      }
      if(memory){
        const wanted=this.point(hand).sub(start),previous=memory[side],change=wanted.clone().sub(previous),limited=fresh||free?wanted.clone():previous.clone().add(change.clampLength(0,.035));
        if(limited.distanceToSquared(wanted)>1e-8)error=place(limited);memory[side].copy(limited);
      }
      return {glove,error};
    }

    // Resolve padding against a moving receiving surface after BOTH characters
    // have posed. This constrains the rendered fist, not just the score event.
    armBendReference(side){
      const j=this.joints,shoulder=this.point(j['arm'+side]);
      const axis=this.point(j['hand'+side]).sub(shoulder).normalize();
      const bend=this.point(j['elbow'+side]).sub(shoulder);
      bend.addScaledVector(axis,-bend.dot(axis));
      if(bend.lengthSq()<1e-8){bend.set(side==='L'?-.5:.5,-1,.1);bend.addScaledVector(axis,-bend.dot(axis));}
      return {axis,bend:bend.normalize()};
    }
    contactBendPole(side,target,reference){
      const direction=target.clone().sub(this.point(this.joints['arm'+side])).normalize();
      // Parallel transport the authored elbow plane. Projecting a fixed pole
      // onto a strongly deflected reach axis can reverse its sign by 180°.
      return reference.bend.clone().applyQuaternion(new THREE.Quaternion().setFromUnitVectors(reference.axis,direction));
    }
    constrainGlove(side,collide,allowance=.018,referencePole=null) {
      const index=side==='R'?1:0,j=this.joints;
      let glove=this.metrics.gloves[index],maximum=0;
      const reference=referencePole||this.armBendReference(side);
      for(let k=0;k<7;k++){
        const world=this.root.localToWorld(V(...glove.knuckles)),hit=collide(world);
        if(!(hit.penetration>allowance+.0002))break;
        maximum=Math.max(maximum,hit.penetration);
        const correction=hit.normal.clone().multiplyScalar(hit.penetration-allowance+.0005);
        const wrist=this.point(j['hand'+side]);
        const target=this.root.worldToLocal(this.root.localToWorld(wrist.clone()).add(correction));
        this.solve(j['arm'+side],j['elbow'+side],j['hand'+side],target,this.contactBendPole(side,target,reference));
        glove=this.orientGlove(side,glove.turn,V(...(glove.palmTarget||[0,-1,0])));
      }
      this.metrics.gloves[index]=glove;
      this.metrics.hands[index]=this.point(j['hand'+side]).toArray();
      if(maximum>0)this.syncSkin();
      return maximum;
    }

    constrainArm(side,collide,allowance=.012,referencePole=null){
      const j=this.joints,index=side==='R'?1:0;
      let glove=this.metrics.gloves[index],changed=false;
      const reference=referencePole||this.armBendReference(side);
      for(let iteration=0;iteration<10;iteration++){
        const elbow=j['elbow'+side].getWorldPosition(V()),wrist=j['hand'+side].getWorldPosition(V());
        const centre=this.root.localToWorld(V(...glove.knuckles));
        const samples=[{p:centre,r:.078,t:1},{p:wrist,r:.050,t:1},...[.35,.65].map(t=>({p:elbow.clone().lerp(wrist,t),r:.052,t}))];
        let worst=null;
        for(const sample of samples){const hit=collide(sample.p,sample.r);if(hit.penetration>allowance+.0003&&(!worst||hit.penetration>worst.hit.penetration))worst={sample,hit};}
        if(!worst)break;
        const {sample,hit}=worst,normal=hit.normal.clone(),correction=normal.multiplyScalar(Math.min(.16,(hit.penetration-allowance+.001)/Math.max(.55,sample.t)));
        const target=this.root.worldToLocal(wrist.add(correction));
        const localNormal=hit.normal.clone().applyQuaternion(this.root.getWorldQuaternion(new THREE.Quaternion()).invert());
        // Bound the adjustment relative to the authored bend plane. Repeated
        // contact passes must not accumulate humeral roll into a half-turn.
        const pole=this.contactBendPole(side,target,reference).addScaledVector(localNormal,.08).normalize();
        this.solve(j['arm'+side],j['elbow'+side],j['hand'+side],target,pole);
        glove=this.orientGlove(side,glove.turn,V(...(glove.palmTarget||[0,-1,0])));changed=true;
      }
      this.metrics.gloves[index]=glove;this.metrics.hands[index]=this.point(j['hand'+side]).toArray();
      if(changed)this.syncSkin();
    }

    syncSkin(){
      this.root.updateMatrixWorld(true);this.skeleton.update();window.AvatarSurface?.update(this);
      const mat=new THREE.Matrix4(),q=new THREE.Quaternion(),tr=new THREE.Quaternion();
      for(let i=0;i<this.bones.length;i++) {
        mat.fromArray(this.skeleton.boneMatrices,i*16);q.setFromRotationMatrix(mat);
        const e=mat.elements;tr.set(e[12],e[13],e[14],0).multiply(q);
        this.dqReal[i].set(q.x,q.y,q.z,q.w);
        this.dqDual[i].set(tr.x*.5,tr.y*.5,tr.z*.5,tr.w*.5);
      }
    }

    deformGlove(side,pressure=0) {
      const mesh=this.gloveMeshes[side],amount=clamp(pressure);
      if(window.BoxingPadding?.glove(this,side,amount))return;
      if(Math.abs((mesh.userData.pressure||0)-amount)<.0001)return;
      for(const part of mesh.userData.deformParts||[mesh]){
        const rest=part.userData.restPosition,norm=part.userData.restNormal;
        const p=part.geometry.attributes.position,n=part.geometry.attributes.normal;
        for(let i=0;i<p.count;i++){
          const x=rest[i*3],y=rest[i*3+1],z=rest[i*3+2];
          const pad=smooth((-y-.065)/.075),thumb=(side==='L'?x:-x)<-.060&&z>.025?.35:1;
          const squash=amount*pad*thumb,sx=1+.10*squash,sy=1-.28*squash,sz=1+.085*squash;
          p.setXYZ(i,x*sx,y+(-.075-y)*(1-sy),z*sz);
          const nx=norm[i*3]/sx,ny=norm[i*3+1]/sy,nz=norm[i*3+2]/sz,length=Math.hypot(nx,ny,nz)||1;
          n.setXYZ(i,nx/length,ny/length,nz/length);
        }
        p.needsUpdate=n.needsUpdate=true;
      }
      mesh.userData.pressure=amount;
    }

    update(t,technique,combo,options={}) {
      this.renderTime=options.simulationTime??t;
      const seq=technique==='combo'?(sequences[combo]||sequences.one_two):[technique];
      const beat=t/(technique==='combo'?1.0:1.22),authored=technique==='combo'?window.BOXING_ROUTINES?.frame(t,technique,combo):null,move=authored?.move||seq[Math.floor(beat)%seq.length];
      // Trim the dead guard tail between combination punches. Individual drills
      // keep their deliberate full reset; combinations retain continuous cadence.
      const phase=authored?.phase??(beat%1)*(technique==='combo'?.86:1);
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
      // GOTR-0024: the hand leaves the guard smoothly, reaches its cruise
      // speed early and carries it into the last centimetres of the reach,
      // stopping there (on the target, or at lockout) within ~2 frames. The
      // old eased curve had slowed to ~20% of its peak where straights land.
      const cruise=(x,e=.94)=>{x=clamp(x);const a=.45,area=a/2+(e-a)+(1-e)/2;if(x<a){const u=x/a;return a*(u*u*u-u*u*u*u/2)/area;}if(x<e)return (a/2+x-a)/area;const u=(x-e)/(1-e);return (a/2+e-a+(1-e)*(u-u*u*u+u*u*u*u/2))/area;};
      // Fight straights are stopped by the target short of lockout (reach
      // controller) and stop within 6% of the time; elsewhere (shadow, bag,
      // mitts) the arm eases to lockout over 13%, which keeps the elbow path
      // continuous (tests/shoulder-motion).
      const strike=straight?(handPhase<.16?0:handPhase<.36?cruise((handPhase-.16)/.20,options.extendStraight?.94:.87):
        handPhase<.42?1:1-smooth((handPhase-.42)/(options.straightRecovery??.27))):envelope(phase,.055);
      const soloUpper=move.includes('uppercut')&&!options.uppercutBagTarget&&!options.upperWristHeight&&!options.advance;
      const prepare=smooth((phase-(soloUpper?.02:.06))/(options.loadDuration??(soloUpper?.20:.16)));
      const riseStart=soloUpper?.12:.22,riseDuration=options.riseDuration??(soloUpper?.36:.24);
      const rise=smooth((phase-riseStart)/riseDuration),bodyRise=smooth((phase-(riseStart-.025))/(riseDuration+.025));
      // Shared compact kinetic loading: coil before extension, never pull
      // the fist far behind the shoulder. A jab loads less than a cross.
      const kineticLoad=smooth((phase-.045)/.14)*(1-smooth((phase-.23)/.14));
      const kineticPower=move==='jab'?.35:move==='cross'?.75:1;

      const recover=smooth((phase-.50)/.32);
      const j=this.joints,hips=j.hips,chest=j.chest;
      let hipYaw=0,chestYaw=0,crouch=0,shift=0,forward=0,leadPivot=0,rearPivot=0;
      let trunkPitch=0,trunkRoll=0,pelvisRoll=0,shoulderLoad=0,shoulderSide=0;
      let hookState=null;
      const guardTightness=clamp(options.guardTightness||0),guardCover=clamp(options.guardCover||0);
      // GOTR-0051: how much of the bladed orthodox guard shows. Full in the guard; an action blends out of it as it
      // starts and back into it on the way home, so each technique keeps its own geometry at the strike.
      // options.stance turns it on (1) where a station uses it; off by default (demos, sparring station, mitt coach).
      const stanceWeight=(options.stance??0)*(move==='speedbag'?0:move==='guard'||move==='step'?1:1-smooth((phase-.02)/.16)*(1-smooth((phase-.56)/.28)));
      // The rear glove keeps its place at the chin unless it punches; the forward lead glove comes back to the
      // cheek for any punch (it covers while the rear hand throws) and for an active block or brace.
      const punch=['jab','hook','uppercut','cross','rear_hook','rear_uppercut'].includes(move),block=clamp(options.guardStyle?options.brace??1:options.blockCover||0);
      // Both gloves hold the compact guard only between actions; any action uses the proven technique geometry.
      const leadStance=stanceWeight*(1-block),rearStance=leadStance;
      // Stagger the neutral guard; close cover still protects the cheek.
      // GOTR-0051: lead glove forward at eye/cheek height, rear glove back at the chin (orthodox guard).
      // GOTR-0051 compact guard: in the stance both gloves sit close to the face, beside the muzzle in front of the
      // cheeks (lead a little ahead at eye/cheek height, rear at the jaw), forearms upright, elbows in front of the ribs.
      const leadGuard=V(lerp(-(options.guardWidth??.185),-.15,guardTightness),lerp(options.guardHeight??1.68,1.70,guardTightness),lerp(.395,.265,guardTightness)).add(V(.055,.12,.020).multiplyScalar(guardCover)).lerp(V(-.215,1.735,.37),leadStance);
      const rearGuard=V(lerp(options.guardWidth??.18,.15,guardTightness),lerp(options.guardHeight??1.68,1.70,guardTightness),lerp(.255,.235,guardTightness)).add(V(-.055,.12,.020).multiplyScalar(guardCover)).lerp(V(.215,1.70,.23),rearStance);
      const lead=leadGuard.clone(),rear=rearGuard.clone();
      const guardElbowZ=options.guardElbowBack!=null?-options.guardElbowBack:.1;
      let leadPole=V(-.6+.35*leadStance,-1,guardElbowZ),rearPole=V(.6-.35*rearStance,-1,guardElbowZ);
      let leadTurn=0,rearTurn=0;
      const palmTarget=V(0,-1,0);
      const lateTurn=smooth((strike-.35)/.60);
      const stepState=s=>{
        const first=s===(options.stepDirection||(options.stepAdvance<0?1:-1));
        const out=clamp((phase-(first?.08:.28))/.16);
        const back=clamp((phase-(first?.78:.58))/.16);
        // A smooth zero-velocity lift at take-off/landing avoids the old sharp
        // ankle velocity change caused by a half-sine clamped at each end.
        const travel=(options.stepAdvance?options.stepAdvance*.24:.16)*(smooth(out)-smooth(back));
        return {x:options.stepDirection?options.stepDirection*travel:0,z:options.stepDirection?0:travel,lift:.028*(Math.sin(Math.PI*out)**2+Math.sin(Math.PI*back)**2)};
      };
      const drillStep=s=>{
        if(move==='guard')return {x:0,z:0,lift:0};
        if(move==='step')return stepState(s);
        // A lead jab steps with the lead foot while the rear foot remains
        // planted as the driving support. Moving both feet forward together
        // removed the visible weight transfer and made the stance skate.
        if(move==='jab'&&s===1)return {z:0,x:0,lift:0};
        // Rear cross rotates over a planted lead leg. The rear foot pivots
        // with the hip; neither foot should translate forward during the hit.
        if(move==='cross')return {z:0,x:0,lift:0};
        const lateralMove=['hook','rear_hook','slip','roll'].includes(move);
        const firstSide=move==='slip'?(options.defenceSide||1):move==='rear_hook'?1:-1;
        const first=s===firstSide;
        const closingUpper=move.includes('uppercut')&&options.advance;
        const out=clamp((phase-(first?.04:closingUpper?.24:.20))/(closingUpper?.20:.16));
        const back=clamp((phase-(first?.72:.56))/.14);
        const transfer=smooth(out)-smooth(back);
        const direction=move==='slip'?(options.defenceSide||1):move==='hook'?-1:move==='rear_hook'?1:-1;
        const length=(move==='jab'?.085:move==='cross'?.045:move.includes('uppercut')?.17:.025)+(options.advance||0);
        return {z:length*transfer,x:lateralMove?direction*.045*transfer:0,
          lift:(options.stepLift??.018)*(Math.sin(Math.PI*out)**2+Math.sin(Math.PI*back)**2)};
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
          // Keep the lead glove at the cheek as the rear shoulder drives
          // forward; chin stays protected behind the lead glove.

          pelvisRoll=-.020*drive;trunkRoll=-.040*twist;
          break;
        case 'hook': case 'rear_hook': {
          const s=move==='hook'?-1:1;
          // Coil the hips and ribs BEFORE driving the strike. The glove
          // follows the body through a forward arc; it is never first parked
          // at 90 degrees and then spun around a stationary shoulder.
          const load=smooth((phase-.06)/.16)*(1-smooth((phase-.24)/.14));
          // GOTR-0024: drive and arc carry their speed into the target (cruise).
          const driveHook=cruise((phase-.23)/.24)*(1-smooth((phase-.57)/.22));
          const equipment=options.target||options.knuckleTarget;
          const swing=(equipment?cruise:smooth)((phase-(equipment?.19:.17))/(equipment?options.hookSwing??.32:.40));
          const active=smooth((phase-.12)/(equipment?.32:.24))*(1-smooth((phase-.57)/.24));
          const rotation=driveHook-.28*load;
          crouch=.035*load+.016*driveHook;
          hipYaw=-s*(.48*driveHook-.18*load);
          chestYaw=-s*(.38*driveHook-.22*load);
          shift=-s*(.047*driveHook-.018*load);
          forward=-.025*load+.075*driveHook;
          pelvisRoll=-s*.028*rotation;trunkRoll=-s*.050*rotation;
          trunkPitch=.035*load+.020*driveHook;
          hookState={s,swing,active,rotation:driveHook,load};
          if(s===-1){leadTurn=active;leadPole.lerp(V(-1,-.35,equipment?.30:.65),active);leadPivot=(equipment?.62:.72)*driveHook-.10*load;rearPivot=.08*driveHook;}
          else {rearTurn=active;rearPole.lerp(V(1,-.35,equipment?.30:.65),active);rearPivot=-(equipment?.62:.72)*driveHook+.10*load;leadPivot=-.08*driveHook;}

          break;
        }
        case 'uppercut': case 'rear_uppercut': {
          const s=move==='uppercut'?-1:1;
          const active=prepare*(1-recover),up=bodyRise*(1-recover);
          const loaded=prepare*(1-bodyRise)*(1-recover);
          hipYaw=s*(soloUpper?.13:.14)*loaded-s*(soloUpper?.22:.22)*up;chestYaw=s*(soloUpper?.18:.20)*loaded-s*(soloUpper?.24:.25)*up;
          crouch=.19*loaded+.035*up;forward=-.095*loaded+.11*up;
          shift=s*.035*loaded-s*.025*up;
          pelvisRoll=-s*.035*loaded+s*.020*up;
          trunkPitch=.16*loaded-.085*up;
          trunkRoll=-s*.10*loaded+s*.065*up;
          shoulderLoad=loaded;shoulderSide=s;
          palmTarget.set(0,0,-1);
          // Three distinct phases: settle under the target, drive upward with
          // extending legs, then recover to cheek without a second scoop.
          // Wrist trajectory is resolved once, below, after the live shoulder
          // and moving cheek positions are available.
          if(s===-1){leadTurn=up;leadPole.lerp(V(soloUpper?-.65:-.8,soloUpper?-.30:-1,soloUpper?.65:.10),active);leadPivot=.36*up;}
          else {rearTurn=up;rearPole.lerp(V(soloUpper?.65:.8,soloUpper?-.30:-1,soloUpper?.65:.10),active);rearPivot=-.36*up;}
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
          shift=(l.x+r.x)/2+.012*transfer;pelvisRoll=-.018*transfer;trunkRoll=.012*transfer;
          hipYaw=.035*transfer;chestYaw=-.025*transfer;break;
        }
      }
      if(options.contactReturn){
        const remaining=1-options.contactReturn.blend;
        hipYaw*=remaining;chestYaw*=remaining;forward*=remaining;crouch*=remaining;
        trunkPitch*=remaining;trunkRoll*=remaining;pelvisRoll*=remaining;
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
        const length=(move==='jab'?.085:move==='cross'?.045:move.includes('uppercut')?.17:.025)+options.advance;
        approach=(l.z+r.z)*.5*options.advance/length;
        forward+=approach;
        // Uppercuts already author a knee dip; do not add a second lunge dip.
        if(!move.includes('uppercut'))crouch+=Math.abs(l.z-r.z)*.21;
      }
      // Equipment punches commit the pelvis and back before shoulder extension.
      // Modes author body drive alongside their calibrated contact targets.
      // GOTR-0024: a blocked blow drives the struck glove back and down
      // towards the chin and rocks the shoulders, then the guard recovers.
      const guardJolt=options.hitReaction?.part==='guard'?clamp(options.hitReaction.amount||0):0;
      if(guardJolt>0){const struck=(options.hitReaction.side||1)<0?lead:rear,other=struck===lead?rear:lead;struck.add(V(0,-.018,-.065).multiplyScalar(guardJolt));other.add(V(0,-.006,-.022).multiplyScalar(guardJolt));trunkPitch-=.045*guardJolt;forward-=.022*guardJolt;chestYaw+=(options.hitReaction.side||1)*.05*guardJolt;}
      const power=options.power||1;
      hipYaw*=power;chestYaw*=power;forward*=power;
      crouch+=options.stanceDrop||0;
      trunkPitch+=(power-1)*.14*drive;
      crouch+=(options.levelChange||0)*drive;
      const through=(options.contactDrive||0)*strike;
      forward+=through;crouch+=through*.32;
      const brace=(options.brace||0)*(move==='guard'?1:drive)+(options.hitReaction?.part==='guard'?(options.hitReaction.amount||0)*.30:0),recoil=options.recoil||0;
      const braceMotion=move==='guard'&&guardCover?Math.max(0,options.hitReaction?.amount||0)*.30:brace;
      crouch+=braceMotion*.022+recoil*.38;forward-=braceMotion*.014+recoil;trunkPitch+=braceMotion*.020-recoil*.8;
      const hit=options.hitReaction||{},hurt=Math.max(0,Math.min(1,hit.amount||0));
      this.surfaceDent=hit.surfacePoint?{point:hit.surfacePoint,normal:hit.surfaceNormal,depth:(hit.part==='body'?.025:.014)*hurt}:null;
      const risingHit=hit.part==='head'?Math.max(0,hit.direction?.[1]??(hit.move?.includes('uppercut')?.8:0)):0;
      if(hit.part==='body'){crouch+=.065*hurt;trunkPitch+=.25*hurt;forward-=.055*hurt;if(hit.move?.includes('uppercut')){crouch+=.035*hurt;trunkPitch-=.16*hurt;forward-=.075*hurt;}}
      else if(hit.part==='head'){trunkPitch-=.085*hurt;forward-=.075*hurt;trunkRoll+=(hit.side||1)*.045*hurt;if(hit.move?.includes('uppercut')){trunkPitch-=.09*hurt;forward-=.03*hurt;}}
      else if((hit.part==='shoulder'||hit.part==='arm')){chestYaw+=(hit.side||1)*.13*hurt;forward-=.025*hurt;}
      const presentation=options.presentation;
      this.celebrationSmile.visible=presentation?.mode==='winner';
      if(presentation?.mode==='loser'){crouch+=.025;trunkPitch+=.08;}
      if(options.down){crouch+=.40*options.down;trunkPitch+=.20*options.down;forward-=.04*options.down;}
      if(['jab','cross','hook','rear_hook'].includes(move)) {
        forward-=(straight?.003:.020)*kineticLoad*kineticPower;
        crouch+=.015*kineticLoad*kineticPower;
      }
      // GOTR-0051: bladed orthodox stance in the guard (pelvis ~10 deg, chest ~33 deg lead side forward; the turn sits in the thorax so the cross keeps its drive).
      hipYaw+=.12+.05*stanceWeight*(1-block);chestYaw+=.08;const blade=.33*stanceWeight*(1-block);
      hips.position.set(shift,.935-crouch,forward);
      hips.rotation.set(0,hipYaw,pelvisRoll);
      // Spread the thoracic turn over the back instead of rotating a rigid chest.
      j.spine.rotation.set(.045+trunkPitch*.55,chestYaw*.30,trunkRoll*.60);
      // The blade turns the ribcage, not the belly (belt and shorts stay on the pelvis line).
      chest.rotation.set(.025+trunkPitch*.45,chestYaw*.70+blade,trunkRoll*.40);
      j.neck.position.copy(this.neckRest).add(V(0,Math.min(.045,.055*risingHit*hurt),0));
      j.neck.rotation.set(0,0,0);
      // Eyes remain on the opponent, chin tucked, rather than spinning with the chest.
      j.head.rotation.set(.07-trunkPitch*.65,-(hipYaw+chestYaw+blade)*.90,-(trunkRoll+pelvisRoll)*.65);
      if(move==='uppercut'||move==='rear_uppercut'){
        // Head travels with the loading shoulder and rising spine; do not
        // counter-rotate away the entire upper-body wind-up.
        const coil=prepare*(1-bodyRise)*(1-recover);
        const launch=bodyRise*(1-recover)*(1-(options.contactReturn?.blend||0));
        const side=move==='uppercut'?-1:1;
        j.neck.rotation.set(.06*coil-.04*launch,side*.09*coil-side*.07*launch,side*.08*coil);
        j.head.rotation.x+=.08*coil-.06*launch;
        j.head.rotation.y=-(hipYaw+chestYaw+blade)-j.neck.rotation.y;
        j.head.rotation.z+=side*.085*coil-side*.07*launch;
      }
      // Keep the chin behind the lead shoulder through jab extension.
      j.head.rotation.x+=((options.chinTuck||0)*drive+(straight?.045*strike:0));
      // GOTR-0024: the head snaps along the line of the blow: straights and
      // uppercuts lift the chin, hooks turn and tilt it away.
      if(hit.part==='head'){const hook=hit.move?.includes('hook'),upper=hit.move?.includes('uppercut');j.head.rotation.x-=(upper?.34:hook?.14:.28)*hurt;j.head.rotation.y-=(hit.side||1)*(upper?.07:hook?.34:.16)*hurt;j.neck.rotation.z+=(hit.side||1)*(hook?.13:.07)*hurt;}
      if(hit.part==='body')j.head.rotation.x+=.10*hurt;
      j.head.rotation.x+=(options.down||0)*.25;
      if(presentation){
        if(presentation.mode==='loser')j.head.rotation.x+=.40;
        else if(presentation.mode==='winner'){j.head.rotation.y+=Math.sin(t*3.8)*.18;j.head.rotation.x-=.05+.035*Math.sin(t*5);}
      }
      // Track the opponent in arena space through the uppercut's hip/neck
      // coil. Euler cancellation in the rotated torso drifted the gaze sideways.
      if(move.includes('uppercut')&&!hurt&&!presentation&&!options.down){
        const coil=prepare*(1-bodyRise)*(1-recover),side=move==='uppercut'?-1:1;
        this.orient(j.head,new THREE.Quaternion().setFromEuler(new THREE.Euler(.09+.03*coil,0,side*.03*coil)));
      }
      // Scapular elevation/protraction of the striking shoulder protects the chin.
      const leftStrike=(move==='hook'?hookState.rotation:move==='jab'?twist:move==='uppercut'?strike:0)*(options.contactReturn?.side==='L'?1-options.contactReturn.blend:1);
      const rightStrike=(move==='rear_hook'?hookState.rotation:move==='cross'?twist:move==='rear_uppercut'?strike:0)*(options.contactReturn?.side==='R'?1-options.contactReturn.blend:1);
      const reachShoulder=straight?.095:hookState?.085:move.includes('uppercut')?.055:.045;
      const shoulderCover=(move.includes('uppercut')?.005:.055)+(options.shoulderCover||0);
      j.armL.position.set(-.30+.012*leftStrike,.26+shoulderCover*leftStrike,reachShoulder*leftStrike-.012*rightStrike);
      j.armR.position.set(.30-.012*rightStrike,.26+shoulderCover*rightStrike,reachShoulder*rightStrike-.012*leftStrike);
      if((hit.part==='shoulder'||hit.part==='arm'))j[hit.side<0?'armL':'armR'].position.y-=.055*hurt;
      if(shoulderSide){
        const striking=j[shoulderSide===-1?'armL':'armR'];
        const coil=prepare*(1-bodyRise)*(1-recover);
        const launch=bodyRise*(1-recover)*(1-(options.contactReturn?.blend||0));
        striking.position.y-=.065*coil;
        striking.position.z-=.065*coil;
        striking.position.z+=.015*launch;
      }
      this.tail.rotation.y= -.16*hipYaw+Math.sin((options.simulationTime??t)*2.2)*.025;
      const footTargets=[],footPlans=[];
      for(const s of [-1,1]) {
        const side=s===-1?'L':'R',pivot=s===-1?leadPivot:rearPivot;
        // GOTR-0051: in the guard the rear heel is slightly up (weight on the ball of the rear foot).
        const lift=Math.abs(pivot)*.35+(side==='R'?(options.down||0)*.30+.09*stanceWeight:0);
        const footQ=new THREE.Quaternion().setFromEuler(new THREE.Euler(lift,pivot,0,'YXZ'));
        // A rigid boot pivots at the forward sole contact. Using the mid-foot
        // here drove the long toe through the floor whenever the heel rose.
        const step=drillStep(s);let footTurn=0,ringCorrection=V();
        if(options.ringStep){
          const {phase:p,ease,delta,weight=1}=options.ringStep;
          // One foot transfers at a time. Root displacement is cancelled for
          // the supporting foot, so the canvas contact remains planted.
          const first=options.ringStep.first??(Math.abs(delta[2])>=Math.abs(delta[0])?(delta[2]>=0?-1:1):(delta[0]>=0?1:-1));
          const q=clamp((p-(s===first?0:.5))/.5),swing=smooth(q);
          footTurn=(options.ringStep.turn||0)*(swing-ease)*weight;ringCorrection.set(delta[0]*(swing-ease)*weight,0,delta[2]*(swing-ease)*weight);
          step.x+=delta[0]*(swing-ease)*weight;step.z+=delta[2]*(swing-ease)*weight;
          step.lift=Math.max(step.lift,.045*Math.sin(Math.PI*q)**2*weight);
        }
        const width=options.stanceWidth??.47,depth=options.stanceDepth??.44;
        const contact=V(s*width/2+step.x,.015,(s===-1?.24:-.20)+(s===-1?1:-1)*(depth-.44)/2+.215+step.z-(side==='R'?(options.down||0)*.40:0));
        if(footTurn){contact.sub(ringCorrection).applyAxisAngle(V(0,1,0),footTurn).add(ringCorrection);footQ.premultiply(new THREE.Quaternion().setFromAxisAngle(V(0,1,0),footTurn));}
        // Fight support anchors participate in the existing pelvis reach
        // calculation below; correcting a planted ankle only after posing
        // can demand a leg longer than its fixed bones.
        if(options.plantedContacts?.[side]&&step.lift<1e-7)contact.fromArray(options.plantedContacts[side]);
        const ankle=contact.clone().add(V(0,.102,-.215).applyQuaternion(footQ));
        ankle.y+=step.lift;
        const kneePole=V(s*.07,0,1).applyAxisAngle(V(0,1,0),pivot*.65);
        footPlans.push({side,pivot,footQ,step,contact,ankle,kneePole});
      }
      if(options.stanceWidth||options.ringStep||move.includes('uppercut')||hurt>0){
        // A wider planted stance needs a little more knee flexion when a foot
        // steps ahead of the hips. Find support for both feet before solving
        // either leg; moving the pelvis after the first solve causes skating.
        this.root.updateMatrixWorld(true);let supportedY=hips.position.y;
        for(const {side,ankle} of footPlans){
          const start=this.point(j['thigh'+side]),reach=j['knee'+side].position.length()+j['foot'+side].position.length()-(options.legReachMargin??.002);
          const dx=start.x-ankle.x,dz=start.z-ankle.z,vertical=Math.sqrt(Math.max(.001,reach*reach-dx*dx-dz*dz));
          supportedY=Math.min(supportedY,hips.position.y+ankle.y+vertical-start.y);
        }
        hips.position.y=supportedY;this.root.updateMatrixWorld(true);
      }
      for(const {side,pivot,footQ,step,contact,ankle,kneePole} of footPlans){
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
      if(!['jab','hook','uppercut','speedbag'].includes(move))lead.copy(leadGuard.clone().add(headShift));
      if(!['cross','rear_hook','rear_uppercut','speedbag'].includes(move))rear.copy(rearGuard.clone().add(headShift));
      // The free glove stays at cheek level during the lead jab, not at chest height.

      if(brace&&!guardCover){const held=move==='guard';lead.add(V(held?.055:.035,held?.12:.105,held?.020:-.015).multiplyScalar(brace));rear.add(V(held?-.055:-.035,held?.12:.105,held?.020:-.015).multiplyScalar(brace));}
      if(move==='guard'&&options.guardStyle){
        const style=options.guardStyle,cover=smooth(phase/.12)*(1-smooth((phase-.80)/.20));
        if(style==='body'){lead.add(V(.09,-.40,.055).multiplyScalar(cover));rear.add(V(-.09,-.40,.055).multiplyScalar(cover));}
        else if(style==='left'){lead.add(V(-.14,.020,-.18).multiplyScalar(cover));leadPole.lerp(V(-.10,-1,.60),cover).normalize();}
        else if(style==='right'){rear.add(V(.14,.020,-.15).multiplyScalar(cover));rearPole.lerp(V(.10,-1,.60),cover).normalize();}
        else if(style==='parry')rear.add(V(-.055,.025,.075).multiplyScalar(cover));
      }
      // Uppercut endpoint is measured from the LIVE striking shoulder,
      // not a fixed world-space coordinate near the lion's own chin.
      // Keep the glove in front of the face through the rising impact phase.
      if(move==='uppercut'||move==='rear_uppercut'){
        const side=move==='uppercut'?'L':'R';
        const hand=side==='L'?lead:rear;
        const shoulder=this.point(j['arm'+side]);
        const reach=j['elbow'+side].position.length()+j['hand'+side].position.length();
        const noseHeight=this.point(j.head).y+.103;
        const target=options.uppercutBagTarget?V(...options.uppercutBagTarget):V(side==='L'?-.035:.035,noseHeight-(side==='L'?.148:.143),shoulder.z+Math.min(.40,reach*(side==='L'?.55:.58)));
        if(soloUpper){
          // Solve the endpoint for a nearly upright forearm. A long forward
          // endpoint plus a tucked elbow made the finish look bent sideways
          // from oblique cameras even though the wrist bone was straight.
          const axis=V(side==='L'?.055:-.055,.988,.14).normalize();
          const lower=j['hand'+side].position.length(),upper=j['elbow'+side].position.length();
          const dx=target.x-axis.x*lower-shoulder.x,dy=target.y-axis.y*lower-shoulder.y;
          target.z=shoulder.z+axis.z*lower+Math.sqrt(Math.max(.0036,upper*upper-dx*dx-dy*dy));
        }
        const guard=(side==='L'?leadGuard:rearGuard).clone().add(headShift);
        const load=V(side==='L'?-.23:.23,options.upperLoadHeight??1.18,options.uppercutBagTarget?.08:.36).add(guardShift);
        const release=options.uppercutBagTarget?smooth((phase-.49)/.25):recover;
        // One continuous load/rise/recovery path. A second endpoint blend
        // pulled the wrist in opposite directions during guard recovery.
        hand.copy(guard).lerp(load,prepare).lerp(target,rise).lerp(guard,release);
      }
      // Straight punches use almost the full arm reach after torso rotation.
      // A fixed short wrist endpoint left the elbow folded and knuckles pointing
      // upward even at impact. Keep a small bend rather than locking the joint.
      if(move==='jab'||move==='cross') {
        const side=move==='jab'?'L':'R',hand=side==='L'?lead:rear;
        const shoulder=this.point(j['arm'+side]);
        const direction=V(side==='L'?-.08:.02,options.strikeHeight??1.74,shoulder.z+.66).sub(shoulder).normalize();
        const reach=j['elbow'+side].position.length()+j['hand'+side].position.length()-.0015;
        const target=shoulder.addScaledVector(direction,reach);
        hand.copy((side==='L'?leadGuard:rearGuard).clone().add(guardShift)).lerp(target,strike);
      }
      if(hookState) {
        const {s,swing,active,load}=hookState,side=s===-1?'L':'R',hand=s===-1?lead:rear;
        const shoulder=this.point(j['arm'+side]);
        const fitted=Boolean(options.target||options.knuckleTarget);
        // Compact pre-load in front of the chest, then a continuous forward
        // and across-body arc driven by the rotating hips and rib cage.
        // Elbow flexion evolves with the swing instead of snapping to 90°.
        const radius=lerp(.34,.47,swing);
        const direction=V(s*(.58-(fitted ? .95 : 1.1)*swing),-.10+.14*swing,.65+.40*swing).normalize();
        const height=fitted?lerp(1.61,options.strikeHeight??1.75,swing):1.675;
        const dy=clamp(height-shoulder.y,-radius*.75,radius*.75);
        const target=shoulder.clone().addScaledVector(direction,Math.sqrt(Math.max(.01,radius*radius-dy*dy)));
        target.y=shoulder.y+dy;
        // Keep the compact chamber in front of the chest while the rear
        // shoulder coils back. A smooth floor avoids a clipped wrist path.
        const front=target.z-.235;
        if(!fitted)target.z=.235+.5*(front+Math.sqrt(front*front+.0004));
        const chamber=hand.clone().add(V(s*.035,fitted?-.025:-.005,fitted?-.015:.15));
        hand.lerp(chamber,load).lerp(target,active);
      }
      // Target practice adapts reach to the physical target. Keep the existing
      // loading, footwork and body drive; constrain the wrist to arm length.
      if(options.target&&['jab','cross','hook','rear_hook'].includes(move)){
        const side=['cross','rear_hook','rear_uppercut'].includes(move)?'R':'L';
        const hand=side==='L'?lead:rear,shoulder=this.point(j['arm'+side]);
        const aim=V(...options.target).add(V(0,0,approach+through)),delta=aim.sub(shoulder);
        const reach=j['elbow'+side].position.length()+j['hand'+side].position.length()-(options.armReachMargin??.002);
        const endpoint=shoulder.add(delta.clampLength(0,reach));
        const amount=straight?strike:hookState?hookState.rotation:rise*(1-recover);
        hand.lerp(endpoint,amount);
      }
      if(options.knucklePlanner&&['jab','cross','hook','rear_hook'].includes(move)){
        const side=['cross','rear_hook','rear_uppercut'].includes(move)?'R':'L',plan=options.knucklePlanner(this.point(j['arm'+side]));
        options.knuckleTarget=plan.point.toArray();options.strikeDirection=plan.direction.toArray();
      }
      if(presentation){
        lead.copy(V(-.22,1.10,.18).add(guardShift));rear.copy(V(.22,1.10,.18).add(guardShift));
        const lift=presentation.raise||0,side=presentation.side||'R',hand=side==='L'?lead:rear;
        hand.lerp(V(side==='L'?-.27:.27,2.08,.03).add(guardShift),lift);
        leadTurn=rearTurn=.35;
      }
      if(move==='speedbag'&&options.speedBagTargets){
        if(options.speedBagTargets.L)lead.copy(leadGuard.clone().add(headShift)).lerp(V(...options.speedBagTargets.L),options.speedBagWeight??1);
        if(options.speedBagTargets.R)rear.copy(rearGuard.clone().add(headShift)).lerp(V(...options.speedBagTargets.R),options.speedBagWeight??1);
      }
      // Targets beyond the moving shoulder's reach must stay on the arm's
      // reachable sphere; never stretch the elbow to follow a swinging bag.
      if(move.includes('uppercut')||(move==='speedbag'&&options.limitSpeedReach)||hurt>0)for(const [side,hand] of [['L',lead],['R',rear]]){
        const shoulder=this.point(j['arm'+side]);
        const reach=j['elbow'+side].position.length()+j['hand'+side].position.length()-.002;
        hand.copy(shoulder.clone().add(hand.clone().sub(shoulder).clampLength(foldedArmReach(j['elbow'+side].position.length(),j['hand'+side].position.length()),reach)));
      }
      if(move.includes('uppercut')){
        const side=move==='uppercut'?'L':'R',hand=side==='L'?lead:rear;
        const shoulder=this.point(j['arm'+side]);
        // Aim the bend plane below the fist and slightly ahead of it. A
        // fixed world pole flipped the forearm as the wrist crossed its axis.
        const axis=V(side==='L'?.055:-.055,.988,.14).normalize();
        const pole=hand.clone().addScaledVector(axis,-j['hand'+side].position.length()).sub(shoulder);
        pole.normalize();
        if(side==='L')leadPole.normalize().lerp(pole,rise*(1-recover)).normalize();else rearPole.normalize().lerp(pole,rise*(1-recover)).normalize();
      }
      if(move.includes('uppercut')&&Number.isFinite(options.simulationTime)){
        const side=move==='uppercut'?'L':'R',hand=side==='L'?lead:rear,pole=side==='L'?leadPole:rearPole;
        const guided=this.guideAim(side,move,hand,pole,options.simulationTime,options.uppercutBagTarget?'heavy':'target');
        pole.copy(guided);
      }
      // The compact guard is close to the shoulders: never ask for a wrist inside the folded-arm limit.
      if(leadStance>0)for(const [side,hand] of [['L',lead],['R',rear]]){this.root.updateMatrixWorld(true);const shoulder=this.point(j['arm'+side]),near=foldedArmReach(j['elbow'+side].position.length(),j['hand'+side].position.length())+.006,d=hand.distanceTo(shoulder);if(d<near&&d>1e-6)hand.copy(shoulder).addScaledVector(hand.clone().sub(shoulder),near/d);}
      let le=this.solve(j.armL,j.elbowL,j.handL,lead,leadPole);
      let re=this.solve(j.armR,j.elbowR,j.handR,rear,rearPole);
      const gloves=[this.orientGlove('L',leadTurn,palmTarget),this.orientGlove('R',rearTurn,palmTarget)];
      if(options.knuckleTarget&&['jab','cross','hook','rear_hook'].includes(move)){
        const index=['cross','rear_hook','rear_uppercut'].includes(move)?1:0,side=index?'R':'L',hand=index?rear:lead,pole=index?rearPole:leadPole;
        const amount=clamp(straight?strike:hookState?hookState.rotation:rise*(1-recover));
        const planStraight=straight&&options.planStraight;
        // Solve the complete striking pose first, then interpolate the wrist
        // from guard. Blending three feedback corrections during extension
        // made a straight punch wind its elbow around the shoulder.
        const targetHand=planStraight?V(...options.knuckleTarget).addScaledVector(V(...options.knuckleTarget).sub(this.point(j['arm'+side])).normalize(),-.204):hand;
        // The strike envelope already has zero endpoint velocity. A cube-root
        // easing here had an infinite slope at full extension and snapped IK.
        const weight=planStraight?1:amount;
        let targetPole=pole;
        for(let iteration=0;iteration<3;iteration++){
          if(!planStraight||iteration)targetHand.addScaledVector(V(...options.knuckleTarget).sub(V(...gloves[index].strikePoint)),weight);
          const shoulder=this.point(j['arm'+side]),reach=j['elbow'+side].position.length()+j['hand'+side].position.length()-(hookState?Math.max(.04,options.armReachMargin??.002):(options.armReachMargin??.002));
          targetHand.copy(shoulder.clone().add(targetHand.clone().sub(shoulder).clampLength(0,reach)));
          // Fight intent reaches along the aim ray; actual contact still stops
          // the glove in the arena solver. Keep a small unlocked elbow margin.
          if(planStraight&&options.extendStraight)targetHand.copy(shoulder.clone().add(targetHand.clone().sub(shoulder).normalize().multiplyScalar(reach)));
          let preferred=pole;
          if(options.strikeDirection&&hookState){
            const axis=targetHand.clone().sub(shoulder).normalize();
            const authored=pole.clone().addScaledVector(axis,-pole.dot(axis)).normalize();
            const desired=targetHand.clone().addScaledVector(V(...options.strikeDirection),-j['hand'+side].position.length()).sub(shoulder).normalize();
            desired.addScaledVector(axis,-desired.dot(axis));
            const confidence=smooth((desired.length()-.06)/.30);
            if(desired.lengthSq()>1e-8){desired.normalize();
              // Keep a useful authored elbow plane when the normal target is
              // collinear or would put the elbow on the opposite side.
              const anatomical=smooth((authored.dot(desired)+.15)/.50);
              preferred=authored.lerp(desired,amount*.85*confidence*anatomical).normalize();
            }
          }
          targetPole=preferred;
          const error=this.solve(j['arm'+side],j['elbow'+side],j['hand'+side],targetHand,preferred);if(index)re=error;else le=error;
          gloves[index]=this.orientGlove(side,index?rearTurn:leadTurn,palmTarget);
        }
        if(hookState&&Number.isFinite(options.simulationTime)){
          targetPole=this.guideAim(side,move,targetHand,targetPole,options.simulationTime,options.knucklePlanner?'heavy':'target');
          const error=this.solve(j['arm'+side],j['elbow'+side],j['hand'+side],targetHand,targetPole);if(index)re=error;else le=error;
          gloves[index]=this.orientGlove(side,index?rearTurn:leadTurn,palmTarget);
        }
        if(planStraight){
          const ready=(index?rearGuard:leadGuard).clone().add(guardShift),shoulder=this.point(j['arm'+side]);
          // Keep the loaded fist in front of the protracting shoulder. Passing
          // behind it makes the elbow orbit a near-vertical IK axis at launch.
          ready.z=Math.max(ready.z,shoulder.z+.12);
          hand.copy(ready).lerp(targetHand,amount);
          {const near=foldedArmReach(j['elbow'+side].position.length(),j['hand'+side].position.length())+.006,d=hand.distanceTo(shoulder);if(leadStance>0&&d<near){const dx=hand.x-shoulder.x,dy=hand.y-shoulder.y;hand.z=Math.max(hand.z,shoulder.z+Math.sqrt(Math.max(0,near*near-dx*dx-dy*dy)));}}
          const error=this.solve(j['arm'+side],j['elbow'+side],j['hand'+side],hand,pole);if(index)re=error;else le=error;
          gloves[index]=this.orientGlove(side,index?rearTurn:leadTurn,palmTarget);
        }
      }
      if(options.planUppercut&&options.knuckleTarget&&move.includes('uppercut')){
        // Fit only the compact rising finish; never bend or roll the wrist.
        const index=move==='rear_uppercut'?1:0,side=index?'R':'L',pole=index?rearPole:leadPole;
        const release=smooth((phase-.49)/.25),weight=smooth((rise-.75)/.25)*Math.pow(1-release,4);
        if(weight>0){
          const s=this.mittAimScratch||(this.mittAimScratch={wrist:V(),target:V(),delta:V(),glove:V(),shoulder:V(),direction:V()}),{wrist,target,delta,glove,shoulder,direction}=s;
          this.root.worldToLocal(j['hand'+side].getWorldPosition(wrist));target.fromArray(options.knuckleTarget);
          const upper=j['elbow'+side].position.length(),lower=j['hand'+side].position.length(),reach=upper+lower-.002;
          for(let iteration=0;iteration<3;iteration++){
            delta.copy(target).sub(glove.fromArray(gloves[index].strikePoint)).clampLength(0,.035);wrist.addScaledVector(delta,weight);
            this.root.worldToLocal(j['arm'+side].getWorldPosition(shoulder));direction.copy(wrist).sub(shoulder).clampLength(foldedArmReach(upper,lower),reach);wrist.copy(shoulder).add(direction);
            const error=this.solve(j['arm'+side],j['elbow'+side],j['hand'+side],wrist,pole);if(index)re=error;else le=error;
            gloves[index]=this.orientGlove(side,index?rearTurn:leadTurn,palmTarget);
          }
        }
      }
      if(options.contactReturn){
        const returned=options.contactReturn,{side,blend}=returned,index=side==='R'?1:0;
        const ready=(side==='L'?leadGuard:rearGuard).clone().add(headShift),target=V(...returned.point).lerp(ready,blend);
        const shoulder=this.point(j['arm'+side]),upper=j['elbow'+side].position.length(),lower=j['hand'+side].position.length();
        target.copy(shoulder.clone().add(target.clone().sub(shoulder).clampLength(foldedArmReach(upper,lower),upper+lower-.002)));
        const reference={axis:V(...returned.axis),bend:V(...returned.bend)};
        const direction=target.clone().sub(this.point(j['arm'+side])).normalize(),pole=this.contactBendPole(side,target,reference);
        const guardPole=V(side==='L'?-.6:.6,-1,guardElbowZ);guardPole.addScaledVector(direction,-guardPole.dot(direction)).normalize();
        let angle=Math.atan2(direction.dot(pole.clone().cross(guardPole)),pole.dot(guardPole));
        const guide=returned.guide;
        if(guide?.angle!=null){while(angle-guide.angle>Math.PI)angle-=Math.PI*2;while(angle-guide.angle< -Math.PI)angle+=Math.PI*2;}
        if(guide)guide.angle=angle;
        pole.applyAxisAngle(direction,angle*blend);
        const error=this.solve(j['arm'+side],j['elbow'+side],j['hand'+side],target,pole);if(index)re=error;else le=error;
        const palm=V(...returned.palm).lerp(V(0,-1,0),blend).normalize();
        gloves[index]=this.orientGlove(side,returned.turn*(1-blend),palm);
      }
      // The striking hand and speed-bag circles keep the immediate clearance; only a guard hand is rate-limited.
      this.faceBlock=!!options.guardStyle&&block>=.99; // an explicit block is taken at once
      this.faceFree=move==='speedbag'?'LR':['jab','hook','uppercut'].includes(move)?'L':['cross','rear_hook','rear_uppercut'].includes(move)?'R':'';
      if(move==='speedbag'||options.keepFaceClear)for(const [index,side,pole] of [[0,'L',leadPole],[1,'R',rearPole]]){
        const safe=this.clearOwnFace(side,gloves[index],palmTarget,pole,(index?rearStance:leadStance)>.5?{cheek:true}:null);gloves[index]=safe.glove;
        if(index)re=safe.error;else le=safe.error;
      }
      // Arena-space spring guides retain inertia under head/root acceleration; orbit adds no force.
      // Seek/teleport resets avoid integrating stale state or a whole hidden tab.
      const overlay=options.poseOverlay?.(this);
      if(overlay?.gloves)gloves.splice(0,2,...overlay.gloves);
      if(overlay?.footTargets)footTargets.splice(0,footTargets.length,...overlay.footTargets);
      if(overlay?.handErrors){le=overlay.handErrors[0];re=overlay.handErrors[1];}
      this.motionState={left:leftStrike,right:rightStrike,strike,hurt,load:move.includes('uppercut')?prepare*(1-bodyRise)*(1-recover):(['jab','cross','hook','rear_hook'].includes(move)?kineticLoad*kineticPower:0),drive:move.includes('uppercut')?bodyRise*(1-recover):drive,...overlay?.motionState};
      // Fixed station substeps keep bones authoritative; upload cosmetic detail once.
      if(!options.deferVisuals){
      this.updateMane(options.simulationTime??t);
      const acted=window.AvatarAnatomy?.express(this,{move,strike:Math.max(strike,move.includes('uppercut')?this.motionState.load*.35:0),hurt,hit,presentation,time:options.simulationTime??t,stamina:options.stamina});
      this.painMouth.visible=!acted&&hurt>.12&&(hit.part==='head'||hit.part==='body');
      for(const {side,mark} of this.damageMarks){const amount=clamp((options.damage?.[side<0?'left':'right']||0)/6);mark.visible=amount>.025;mark.material.opacity=.60*amount;mark.scale.y=.024*(1+amount*.35);}
      if(!acted)for(const part of this.joints.head.children)if(part.userData.tooth)part.visible=hurt>.3;
      if(!acted)for(const face of this.facialRest){
        face.part.position.z=face.z;
        const blinkPhase=(options.simulationTime??t)%4.6,blink=blinkPhase>4.40?Math.sin((blinkPhase-4.40)/.20*Math.PI)**2:0;
        face.part.scale.y=face.sy*(face.eye?(1-.60*Math.min(1,hurt))*(1-.92*blink):1);
      }
      if(this.rabbitEars)this.rabbitEars.forEach((ear,i)=>{ear.rotation.x=(presentation?.mode==='loser'?.25:0)+(hit.part==='head'?.14*hurt:0)-clamp(options.earFold||0,0,.65);ear.rotation.z=(i?-.10:.10)+Math.sin(phase*Math.PI*2+i*.8)*.025*(Math.abs(hipYaw)+crouch);});
      }
      for(const side of ['L','R']){
        const amount=side==='L'?leftStrike:rightStrike,s=side==='L'?-1:1;
        j['scapula'+side].position.set(s*(.17+.020*amount),.17+.015*amount,-.06+.040*amount);
        j['scapula'+side].rotation.y=-s*.14*amount;
      }
      if(options.deferVisuals)this.root.updateMatrixWorld(true);else this.syncSkin();
      this.metrics={move,phase,strike,gloves,footTargets,handErrors:[le,re],
        hands:[this.point(j.handL).toArray(),this.point(j.handR).toArray()],
        head:this.point(j.head).toArray(),hips:this.point(hips).toArray()};
      return this.metrics;
    }
  }
  leatherSurface.fromPacked=data=>{
    const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.Float32BufferAttribute(data.position,3));
    g.setAttribute('normal',new THREE.Float32BufferAttribute(data.normal,3));
    g.setAttribute('uv',new THREE.Float32BufferAttribute(data.uv,2));
    g.setIndex(data.index);g.computeBoundingBox();return g;
  };
  window.LionCoach=LionCoach;window.CoachSurface=leatherSurface;
  window.COACH_TECHNIQUES={
    jab:['1','Jab','Keep the rear glove at the cheek. Extend forward, lift the lead shoulder, then return to guard.',
      'ג׳אב','היד האחורית מגינה על הלחי. שלחו את היד הקדמית קדימה, הרימו כתף וחזרו להגנה.',
      'Джеб','Задняя перчатка у щеки. Удар вперёд с прикрытием подбородка плечом, затем возврат в защиту.'],
    cross:['2','Cross','Turn from the rear foot through the hip and chest. Keep the lead glove up and recover your stance.',
      'קרוס','סובבו את כף הרגל האחורית, האגן והחזה. שמרו את היד הקדמית בהגנה וחזרו לעמידת המוצא.',
      'Кросс','Разворот задней стопы, таза и груди. Передняя рука в защите; вернитесь в стойку.'],
    hook:['3','Lead hook','Drive from the lead foot, turn the hip and shoulder, and sweep a compact arc with a bent arm. Keep the rear glove at the cheek.',
      'הוק קדמי','סובבו את כף הרגל הקדמית, האגן והחזה. הזרוע נעה בקשת עם מרפק כפוף והיד האחורית מגינה.',
      'Передний хук','Разворот передней стопы, таза и груди. Компактная дуга согнутой рукой; задняя перчатка в защите.'],
    rear_hook:['4','Rear hook','Drive from the rear foot through the hip and shoulder. Sweep a compact bent-arm arc while the lead glove protects the cheek.',
      'הוק אחורי','סובבו את הרגל האחורית על כרית כף הרגל. הזרוע הכפופה נעה בקשת קומפקטית עם הגוף והיד הקדמית מגינה.',
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
