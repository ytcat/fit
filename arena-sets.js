/* Built arena sets (GOTR-0022). Each set is original low-poly dressing around the
   unchanged ring: merged geometry, light baked into vertex colours, one small
   procedural atlas, no extra lights, no shadow casters. game-venues.js owns
   attaching, mood and disposal. */
(() => {
 const PI=Math.PI,SECTORS=8;
 const lin=hex=>{const c=new THREE.Color(hex).convertSRGBToLinear();return [c.r,c.g,c.b];};
 const random=seed=>()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 const sector=(x,z)=>(Math.round(Math.atan2(x,z)/(PI/4))+SECTORS)%SECTORS;
 const kindOf=key=>key==='glow'||key[0]==='g'?'glow':key==='add'||key[0]==='d'?'add':'lit';
 let T=null;
 const templates=()=>T||(T={box:new THREE.BoxGeometry(1,1,1),tube:new THREE.CylinderGeometry(1,1,1,8),torso:new THREE.CylinderGeometry(.235,.17,.64,6),ball:new THREE.SphereGeometry(1,7,5),ear:new THREE.CylinderGeometry(0,1,1,4),quad:new THREE.PlaneGeometry(1,1),disc:new THREE.CircleGeometry(1,14),grids:new Map(),tapers:new Map()});
 const grid=(sx,sy)=>{const key=sx+'x'+sy,t=templates();if(!t.grids.has(key))t.grids.set(key,new THREE.PlaneGeometry(1,1,sx,sy));return t.grids.get(key);};
 const taper=(top,bottom,seg,open)=>{const key=[top,bottom,seg,open].join(),t=templates();if(!t.tapers.has(key))t.tapers.set(key,new THREE.CylinderGeometry(top,bottom,1,seg,1,!!open));return t.tapers.get(key);};

 class Atlas{
  constructor(w=1024,h=512){this.w=w;this.h=h;this.x=22;this.y=0;this.row=22;this.jobs=[];this.canvas=document.createElement('canvas');this.canvas.width=w;this.canvas.height=h;this.texture=new THREE.CanvasTexture(this.canvas);this.texture.encoding=THREE.sRGBEncoding;this.texture.anisotropy=2;this.white=[9/w,1-9/h];}
  cell(w,h,draw){if(this.x+w>this.w){this.x=0;this.y+=this.row+2;this.row=0;}const x=this.x,y=this.y;this.x+=w+2;this.row=Math.max(this.row,h);if(y+h>this.h)console.warn('Arena atlas overflow');this.jobs.push({x,y,w,h,draw});return [(x+1)/this.w,1-(y+h-1)/this.h,(x+w-1)/this.w,1-(y+1)/this.h];}
  paint(L){const c=this.canvas.getContext('2d');c.clearRect(0,0,this.w,this.h);c.fillStyle='#fff';c.fillRect(0,0,20,20);for(const j of this.jobs){c.save();c.translate(j.x,j.y);c.beginPath();c.rect(0,0,j.w,j.h);c.clip();c.direction='ltr';c.textAlign='center';c.textBaseline='middle';j.draw(c,j.w,j.h,L);c.restore();}this.texture.needsUpdate=true;}
 }
 // Fit one line of text inside a cell.
 function label(c,text,x,y,size,color,maxWidth,weight=800,family='sans-serif'){c.fillStyle=color;c.font=`${weight} ${size}px ${family}`;while(maxWidth&&size>8&&c.measureText(text).width>maxWidth)c.font=`${weight} ${--size}px ${family}`;c.fillText(text,x,y);return size;}

 class Kit{
  constructor(){this.lights=[];this.ambient={sky:[.02,.02,.02],ground:[.02,.02,.02]};this.atlas=new Atlas();this.buffers=new Map();this.v=new THREE.Vector3();this.n=new THREE.Vector3();this.nm=new THREE.Matrix3();this.mat=new THREE.Matrix4();this.base=new THREE.Matrix4();this.local=new THREE.Matrix4();this.q=new THREE.Quaternion();this.e=new THREE.Euler(0,0,0,'YXZ');this.p=new THREE.Vector3();this.s=new THREE.Vector3();this.L=[0,0,0];templates();}
  buffer(key){let b=this.buffers.get(key);if(!b){b={key,kind:kindOf(key),pos:[],col:[],uv:[],idx:[]};this.buffers.set(key,b);}return b;}
  // Per-vertex Lambert from the set's own virtual lamps plus a sky/ground ambient.
  shade(p,n){
   const a=this.ambient,up=.5+.5*n.y,L=this.L;L[0]=a.ground[0]+(a.sky[0]-a.ground[0])*up;L[1]=a.ground[1]+(a.sky[1]-a.ground[1])*up;L[2]=a.ground[2]+(a.sky[2]-a.ground[2])*up;
   for(const l of this.lights){
    const dx=l.x-p.x,dy=l.y-p.y,dz=l.z-p.z,d2=dx*dx+dy*dy+dz*dz,d=Math.sqrt(d2)||1e-6,wrap=l.wrap===undefined?.3:l.wrap;
    let k=((n.x*dx+n.y*dy+n.z*dz)/d+wrap)/(1+wrap);if(k<=0)continue;
    k*=l.power/(1+d2/(l.r*l.r));
    if(l.aim){const c=-(dx*l.aim[0]+dy*l.aim[1]+dz*l.aim[2])/d,t=Math.max(0,Math.min(1,(c-l.cone[0])/(l.cone[1]-l.cone[0])));k*=t*t*(3-2*t);}
    L[0]+=l.c[0]*k;L[1]+=l.c[1]*k;L[2]+=l.c[2]*k;
   }
   return L;
  }
  m(x,y,z,rx=0,ry=0,rz=0,sx=1,sy=1,sz=1,out=this.mat){this.e.set(rx,ry,rz,'YXZ');return out.compose(this.p.set(x,y,z),this.q.setFromEuler(this.e),this.s.set(sx,sy,sz));}
  add(key,g,m,color,o){
   const b=this.buffer(key),P=g.attributes.position,N=g.attributes.normal,U=g.attributes.uv,first=b.pos.length/3,lit=b.kind==='lit'&&!(o&&o.unlit),uv=o&&o.uv,tint=o&&o.tint,gain=o&&o.gain||1,w=this.atlas.white,v=this.v,n=this.n;
   this.nm.getNormalMatrix(m);
   for(let i=0;i<P.count;i++){
    v.fromBufferAttribute(P,i);const ly=v.y;v.applyMatrix4(m);n.fromBufferAttribute(N,i).applyMatrix3(this.nm).normalize();
    let r=color[0]*gain,g2=color[1]*gain,b2=color[2]*gain;
    if(tint){const t=tint(ly,U.getX(i),U.getY(i),v);r*=t[0];g2*=t[1];b2*=t[2];}
    if(lit){const L=this.shade(v,n);r*=L[0];g2*=L[1];b2*=L[2];}
    else if(b.kind==='add'){r=Math.pow(r,2.2);g2=Math.pow(g2,2.2);b2=Math.pow(b2,2.2);}// blended after sRGB encoding, so authored in display space
    b.pos.push(v.x,v.y,v.z);b.col.push(r,g2,b2);
    if(uv)b.uv.push(uv[0]+(uv[2]-uv[0])*U.getX(i),uv[1]+(uv[3]-uv[1])*U.getY(i));else b.uv.push(w[0],w[1]);
   }
   if(g.index){const I=g.index;for(let i=0;i<I.count;i++)b.idx.push(first+I.getX(i));}else for(let i=0;i<P.count;i++)b.idx.push(first+i);
  }
  box(key,w,h,d,x,y,z,color,ry=0,o){this.add(key,T.box,this.m(x,y,z,o&&o.rx||0,ry,o&&o.rz||0,w,h,d),color,o);}
  tube(key,r,h,x,y,z,color,o){this.add(key,T.tube,this.m(x,y,z,o&&o.rx||0,o&&o.ry||0,o&&o.rz||0,r,h,r),color,o);}
  cone(key,top,bottom,h,x,y,z,color,o){this.add(key,taper(top,bottom,o&&o.seg||8,o&&o.open),this.m(x,y,z,o&&o.rx||0,o&&o.ry||0,o&&o.rz||0,1,h,1),color,o);}
  ball(key,rx,ry,rz,x,y,z,color,o){this.add(key,T.ball,this.m(x,y,z,0,0,0,rx,ry,rz),color,o);}
  // Upright panel facing +Z before yaw; rx=-PI/2 lays it face-up, +PI/2 face-down.
  quad(key,w,h,x,y,z,color,o){this.add(key,o&&(o.sx||o.sy)?grid(o.sx||1,o.sy||1):T.quad,this.m(x,y,z,o&&o.rx||0,o&&o.ry||0,0,w,h,1),color,o);}
  // Panel tiled with one atlas cell; each tile is its own quad because the atlas cannot repeat.
  tiled(key,w,h,x,y,z,color,cell,tile,o={}){const nx=Math.max(1,Math.round(w/tile[0])),ny=Math.max(1,Math.round(h/tile[1])),ry=o.ry||0,cx=Math.cos(ry),sx=Math.sin(ry);for(let i=0;i<nx;i++)for(let j=0;j<ny;j++){const u=(i+.5)/nx-.5,v=(j+.5)/ny-.5;this.quad(o.by?o.by(x+u*w*cx,z-u*w*sx):key,w/nx,h/ny,x+u*w*cx,y+v*h,z-u*w*sx,color,{ry,uv:cell});}}
  disc(key,r,x,y,z,color,o){this.add(key,T.disc,this.m(x,y,z,-PI/2,0,0,r,r,1),color,o);}
  // Soft additive light shaft: bright at the lamp, black at the far end.
  beam(key,x,y,z,top,bottom,length,color,o={}){this.local.makeTranslation(0,-length/2,0).scale(this.s.set(1,length,1));this.m(x,y,z,o.rx||0,0,o.rz||0,1,1,1,this.base);this.add(key,taper(top,bottom,o.seg||12,true),this.mat.multiplyMatrices(this.base,this.local),color,{tint:ly=>{const t=Math.pow(ly+.5,o.curve||1.5);return [t,t,t];}});}
  person(key,x,z,g,yaw,rnd,st){
   const pick=list=>list[Math.floor(rnd()*list.length)%list.length],sc=(1.50+rnd()*.34)/1.7,B=new THREE.Matrix4().makeRotationY(yaw).setPosition(x,g,z),cloth=pick(st.cloth),fur=pick(st.fur),drop=st.seated?-.40:0;
   const part=(geo,px,py,pz,sx,sy,sz,color,rz=0)=>{this.m(px*sc,(py+drop)*sc,pz*sc,0,0,rz,sx*sc,sy*sc,sz*sc,this.local);this.add(key,geo,this.mat.multiplyMatrices(B,this.local),color);};
   if(!st.seated)part(T.box,0,.42,0,.30,.84,.19,pick(st.legs));else{const leg=pick(st.legs);part(T.box,0,.86,.2,.32,.17,.5,leg);part(T.box,0,.62,.42,.30,.46,.15,leg);}
   part(T.torso,0,1.13,0,1,1,.62,cloth);part(T.ball,0,1.585,0,.135,.15,.135,fur);
   const ears=rnd();if(ears<.3)for(const s of [-1,1])part(T.ear,s*.085,1.76,0,.045,.11,.03,fur);else if(ears<.5)for(const s of [-1,1])part(T.box,s*.05,1.86,0,.045,.27,.03,fur,-s*.12);else if(ears<.8)for(const s of [-1,1])part(T.box,s*.105,1.71,0,.075,.075,.03,fur);
   if(st.hat&&rnd()<st.hat.p)part(T.ball,0,1.70,0,.15,.075,.15,pick(st.hat.colors));
   const cheer=rnd();if(cheer<st.cheer)for(const s of cheer<st.cheer*.35?[-1,1]:[cheer<st.cheer*.7?-1:1]){part(T.box,s*.27,1.60,.02,.085,.50,.085,cloth,-s*.22);part(T.ball,s*.325,1.89,.02,.062,.062,.062,fur);}
  }
  // Rings of spectators on a square around the ropes; two interleaved groups per sector can sway out of phase.
  crowd(o){
   const rnd=random(o.seed||7);
   if(o.round){ // ringless fights (GOTR-0065): a loose circle of people standing close around the fighters
    for(let r=0;r<o.rows;r++){
     const rad=o.inner+r*o.step,n=Math.max(1,Math.round(2*PI*rad/o.spacing));
     for(let i=0;i<n;i++){
      const a=(i+(r%2)*.5+(rnd()-.5)*.5)/n*2*PI,d=rad+(rnd()-.5)*o.step*.55,x=Math.sin(a)*d,z=Math.cos(a)*d,thin=rnd(),turn=(rnd()-.5)*.5;
      if(o.skip&&o.skip(x,z)||thin<(o.thin||0))continue;
      this.person(((i+r)&1?'a':'b')+sector(x,z),x,z,o.g+r*(o.rise||0),Math.atan2(-x,-z)+turn,rnd,o.style);
      if(o.lights&&rnd()<o.lights.p){const c=o.lights.colors[Math.floor(rnd()*o.lights.colors.length)%o.lights.colors.length],k=.9-.1*r;this.box('g'+sector(x,z),.07,.12,.02,x*k+(rnd()-.5)*.1,o.g+1.42+rnd()*.3,z*k+(rnd()-.5)*.1,c,Math.atan2(-x,-z));} // a raised phone screen
     }
    }
    return;
   }
   for(let r=0;r<o.rows;r++){
    const half=o.inner+r*o.step,n=Math.max(1,Math.round(2*half/o.spacing));
    for(let side=0;side<4;side++)for(let i=0;i<n;i++){
     const t=-half+(i+.5)*2*half/n+(rnd()-.5)*o.spacing*.35,d=half+(rnd()-.5)*o.step*.4,x=side===0?t:side===1?d:side===2?-t:-d,z=side===0?-d:side===1?t:side===2?d:-t,thin=rnd(),turn=(rnd()-.5)*.5;
     if(o.skip&&o.skip(x,z)||thin<(o.thin||0))continue;
     this.person(((i+r)&1?'a':'b')+sector(x,z),x,z,o.g+r*(o.rise||0),Math.atan2(-x,-z)+turn,rnd,o.style);
    }
   }
  }
  // Painted or chalked circle on the floor: the edge of the fight where there is no ring (dashed when gap>0).
  mark(r,y,color,o={}){const n=o.n||56,gap=o.gap||0,w=o.w||.05;for(let i=0;i<n;i++){if(gap&&i%gap===gap-1)continue;const a=(i+.5)/n*2*PI,x=Math.sin(a)*r,z=Math.cos(a)*r;this.box('s'+sector(x,z),2*PI*r/n*1.03,.004,w,x,y,z,color,a,{unlit:!!o.unlit,gain:o.gain||1});}}
  finish(id){
   const lit=new THREE.MeshBasicMaterial({map:this.atlas.texture,vertexColors:true,alphaTest:.4}),glow=new THREE.MeshBasicMaterial({map:this.atlas.texture,vertexColors:true,alphaTest:.4,toneMapped:false,fog:false}),add=new THREE.MeshBasicMaterial({vertexColors:true,blending:THREE.AdditiveBlending,transparent:true,depthWrite:false,side:THREE.DoubleSide,toneMapped:false,fog:false});
   const materials={lit,glow,add},group=new THREE.Group(),sectors=[],geometries=[];let triangles=0,meshes=0;group.name='Arena set '+id;group.userData.arenaSet=true;
   for(let i=0;i<SECTORS;i++){const g=new THREE.Group();g.name='Arena set sector '+i;g.userData.arenaSet=true;group.add(g);sectors.push({group:g,x:Math.sin(i*PI/4),z:Math.cos(i*PI/4),crowd:[]});}
   for(const b of this.buffers.values()){
    if(!b.idx.length)continue;const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(b.pos,3));g.setAttribute('color',new THREE.Float32BufferAttribute(b.col,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(b.uv,2));g.setIndex(new THREE.BufferAttribute(b.pos.length/3>65535?new Uint32Array(b.idx):new Uint16Array(b.idx),1));
    const mesh=new THREE.Mesh(g,materials[b.kind]);mesh.name='Arena set '+b.key;mesh.userData.arenaSet=true;mesh.castShadow=false;mesh.receiveShadow=false;if(b.kind==='add')mesh.renderOrder=3;geometries.push(g);triangles+=b.idx.length/3;meshes++;
    const index=/^[sabgd]\d$/.test(b.key)?Number(b.key[1]):-1;if(index<0)group.add(mesh);else{sectors[index].group.add(mesh);if(b.key[0]==='a'||b.key[0]==='b')sectors[index].crowd.push(mesh);}
   }
   return {group,sectors,materials,geometries,triangles,meshes};
  }
 }

 const FUR=['#b08a5a','#8f8f93','#cdbb9d','#6b5646','#ded7c8','#a8643c','#55555c','#c79a62'].map(lin);
 const DARK_LEGS=['#23262b','#2c2f3a','#35302c','#1c2430'].map(lin);

 // Two rows of distant spectators for one grandstand step.
 const peopleCell=(A,seed)=>A.cell(256,96,(c,w,h)=>{const rnd=random(seed),cols=['#7a8597','#9a6a5a','#5a718f','#8f8a6a','#6a5a7f','#a79a88','#58697a','#8a5560'],furs=['#c9a878','#a9a9ae','#e0d6c2','#8a6e58','#d08a58'];for(let layer=0;layer<2;layer++)for(let i=0;i<8;i++){const x=16+i*32+(layer?16:0)+(rnd()-.5)*7,y=layer?46:27,body=()=>{c.beginPath();c.ellipse(x,y+40,15,24,0,0,PI*2);c.fill();c.fillRect(x-15,y+40,30,h);},head=()=>{c.beginPath();c.arc(x,y+8,8.5,0,PI*2);c.fill();};c.fillStyle=cols[Math.floor(rnd()*cols.length)];body();const arm=rnd()<.22;if(arm)c.fillRect(x+11,y-12,6,34);c.fillStyle=furs[Math.floor(rnd()*furs.length)];head();const e=rnd();if(e<.4){c.fillRect(x-8,y-5,5,7);c.fillRect(x+3,y-5,5,7);}else if(e<.6){c.fillRect(x-6,y-15,4,15);c.fillRect(x+2,y-15,4,15);}if(arm)c.fillRect(x+10,y-17,8,8);if(!layer){c.fillStyle='rgba(0,0,0,.4)';body();head();}}});
 // ---------------------------------------------------------------- underground
 function underground(k){
  const G=-.015,H=8.5,C=3.25,concrete=lin('#6f6d69'),wall=lin('#5d5b57'),soot=lin('#33322f'),rust=lin('#7a4a36'),steel=lin('#6d7378'),yellow=lin('#c9a02c'),black=lin('#17181a');
  k.ceiling=C;k.cameraRadius=6; // cameras stay under the low slab and inside the room's partitions (read by camera-director.js)
  k.ambient={sky:[.006,.006,.008],ground:[.018,.016,.014]};
  k.lights.push({x:0,y:2.9,z:0,c:[1,.94,.80],power:4.0,r:2.4,wrap:.35,aim:[0,-1,0],cone:[-.25,.45]});
  const bulbs=[[4.35,4.35],[-4.35,4.35],[4.35,-4.35],[-4.35,-4.35],[0,6.7],[0,-6.7],[6.7,0],[-6.7,0]];
  for(const [x,z] of bulbs)k.lights.push({x,y:2.42,z,c:[1,.60,.26],power:1.1,r:1.5});
  k.lights.push({x:H-.5,y:2.3,z:-3.2,c:[.2,1,.45],power:.9,r:1.2},{x:-H+.5,y:2.3,z:3.2,c:[.2,1,.45],power:.9,r:1.2});
  const A=k.atlas,title=A.cell(480,112,(c,w,h,L)=>{c.direction=L.lang==='he'?'rtl':'ltr';c.lineJoin='round';c.strokeStyle='rgba(20,18,16,.9)';c.lineWidth=10;c.font='900 78px sans-serif';let size=78;while(size>20&&c.measureText(L.title).width>w-36)c.font=`900 ${--size}px sans-serif`;c.strokeText(L.title,w/2,h*.46);c.fillStyle='#e9e2d2';c.fillText(L.title,w/2,h*.46);c.fillStyle='#e9e2d2';for(let i=0;i<7;i++)c.fillRect(40+i*61,h*.46+size*.36,5,8+((i*37)%19));});
  const stencil=A.cell(336,56,(c,w,h)=>{label(c,'GLORY OF THE RING',w/2,h/2,40,'#c9a02c',w-16,900);});
  const exit=A.cell(112,48,(c,w,h)=>{c.fillStyle='#0c3a1f';c.fillRect(0,0,w,h);c.strokeStyle='#7dffae';c.lineWidth=3;c.strokeRect(4,4,w-8,h-8);label(c,'EXIT',w/2,h/2+1,28,'#9bffc0',w-18,900);});
  const chain=A.cell(128,128,(c,w,h)=>{c.strokeStyle='#b9c0c6';c.lineWidth=4.2;c.beginPath();for(let i=-8;i<=16;i++){c.moveTo(i*16,0);c.lineTo(i*16+h,h);c.moveTo(i*16,0);c.lineTo(i*16-h,h);}c.stroke();});
  const poster=A.cell(128,176,(c,w,h)=>{c.fillStyle='#d9cfb4';c.fillRect(0,0,w,h);c.fillStyle='#7a1f1b';c.fillRect(8,8,w-16,44);label(c,'TONIGHT',w/2,31,26,'#f0e6cc',w-26,900);c.fillStyle='#1c1a18';c.beginPath();c.arc(w/2-22,96,19,0,PI*2);c.arc(w/2+22,96,19,0,PI*2);c.fill();c.fillRect(w/2-39,108,34,20);c.fillRect(w/2+5,108,34,20);label(c,'WINNER',w/2,142,20,'#1c1a18',w-20,900);label(c,'STAYS ON',w/2,162,17,'#7a1f1b',w-20,900);});
  const level=A.cell(176,96,(c,w,h)=>{label(c,'B2',54,h/2,74,'#d8d2c2',90,900);c.fillStyle='#d8d2c2';c.beginPath();c.moveTo(104,h/2-12);c.lineTo(140,h/2-12);c.lineTo(140,h/2-26);c.lineTo(170,h/2);c.lineTo(140,h/2+26);c.lineTo(140,h/2+12);c.lineTo(104,h/2+12);c.fill();});
  // Shell: floor, low ceiling, inward-facing walls.
  k.quad('shell',26,26,0,G,0,concrete,{rx:-PI/2,sx:26,sy:26});
  k.quad('shell',2*H,2*H,0,C,0,soot,{rx:PI/2,sx:10,sy:10});
  for(const [x,z,ry] of [[0,-H,0],[0,H,PI],[H,0,-PI/2],[-H,0,PI/2]]){
   k.quad('shell',2*H,C-G,x,(C+G)/2,z,wall,{ry,sx:17,sy:4});
   const ix=-Math.sin(ry),iz=-Math.cos(ry),ax=Math.cos(ry),az=-Math.sin(ry);// inward and along-wall directions
   k.quad('shell',2*H,1.05,x-ix*.012,G+.525,z-iz*.012,lin('#6a3a30'),{ry,sx:17,sy:1});
   k.quad('shell',5.4,1.26,x-ix*.03+ax*2.6,2.12,z-iz*.03+az*2.6,[1.5,1.5,1.5],{ry,uv:title,sx:4,sy:1});
   k.quad('shell',3.2,.53,x-ix*.03-ax*4.6,1.5,z-iz*.03-az*4.6,[1.3,1.3,1.3],{ry,uv:stencil,sx:3,sy:1});
   k.quad('shell',.86,1.18,x-ix*.03-ax*1.4,1.75,z-iz*.03-az*1.4,[1.2,1.2,1.2],{ry,uv:poster});
   k.quad('shell',.86,1.18,x-ix*.03-ax*.4,1.69,z-iz*.03-az*.4,[1.2,1.2,1.2],{ry,uv:poster});
   k.quad('shell',1.6,.87,x-ix*.03+ax*6.6,2.25,z-iz*.03+az*6.6,[1.2,1.2,1.2],{ry,uv:level});
  }
  for(const s of [-1,1]){// steel doors with a glowing exit sign
   k.box('shell',.1,2.15,1.15,s*(H-.05),G+1.07,-s*3.2,rust);k.box('shell',.14,2.3,.1,s*(H-.06),G+1.15,-s*3.2-.64,steel);k.box('shell',.14,2.3,.1,s*(H-.06),G+1.15,-s*3.2+.64,steel);
   k.quad('glow',.62,.27,s*(H-.13),2.42,-s*3.2,[1,1,1],{ry:-s*PI/2,uv:exit});
  }
  // Beams, pipes and a duct under the slab.
  for(const a of [-7,-2.6,2.6,7]){k.box('shell',.32,.36,2*H,a,C-.18,0,concrete);k.box('shell',2*H,.3,.3,0,C-.15,a,concrete);}
  for(const z of [-3.6,3.6])k.tube('shell',.055,2*H,0,2.82,z,rust,{rz:PI/2});
  for(const x of [-3.95,4.15]){k.tube('shell',.04,2*H,x,2.9,0,steel,{rx:PI/2});k.tube('shell',.04,2*H,x+.12,2.9,0,steel,{rx:PI/2});}
  k.box('shell',.62,.36,2*H,6.1,C-.55,0,steel);
  // GOTR-0065: no ring. A worn, dashed paint circle marks the fight; stains and a drain on the floor.
  k.disc('shell',2.45,0,G+.002,0,lin('#5f5d59'));k.mark(2.3,G+.006,yellow,{w:.07,gap:7});k.mark(.5,G+.006,lin('#8f8d88'),{n:20,w:.04});
  for(const [x,z,r] of [[3.3,-2.9,.8],[-3.6,3.2,1.1],[-2.9,-3.9,.6],[5.9,1.4,.9],[1.2,5.4,.7],[-6.2,-1.1,1.2]])k.disc('shell',r,x,G+.003,z,lin('#3b3a38'));
  // The single harsh ring lamp and its haze.
  k.box('shell',.025,C-3.0,.025,0,(C+3.0)/2,0,black);k.cone('shell',.07,.36,.22,0,2.9,0,lin('#2e3a33'),{seg:10});k.ball('glow',.2,.035,.2,0,2.79,0,[1,.96,.84]);
  k.beam('add',0,2.8,0,.2,2.45,2.83,[.085,.078,.06],{seg:16,curve:1.2});
  // Bare bulbs on flex.
  for(const [x,z] of bulbs){k.box('shell',.012,C-2.5,.012,x,(C+2.5)/2,z,black);k.ball('glow',.05,.065,.05,x,2.44,z,[1,.82,.52]);k.ball('add',.13,.13,.13,x,2.44,z,[.16,.09,.03]);}
  // Pillars, chain-link between them, and the junk of a place nobody rents.
  const fence=4.95;
  for(const [x,z] of [[fence,fence],[-fence,fence],[fence,-fence],[-fence,-fence],[fence,0],[-fence,0],[0,fence],[0,-fence]]){const key='s'+sector(x,z);k.box(key,.5,C-G,.5,x,(C+G)/2,z,concrete);k.box(key,.52,.3,.52,x,1.15,z,yellow);k.box(key,.52,.1,.52,x,1.15,z,black);k.box(key,.6,.16,.6,x,G+.08,z,soot);}
  for(const [x,z,ry] of [[0,-fence,0],[0,fence,PI],[fence,0,-PI/2],[-fence,0,PI/2]])for(const side of [-1,1]){
   const ax=Math.cos(ry),az=-Math.sin(ry),cx=x+ax*side*fence/2,cz=z+az*side*fence/2,key='s'+sector(cx,cz);
   k.tiled(key,fence-.5,2.2,cx,G+1.12,cz,[.6,.6,.6],chain,[.74,.74],{ry});
   k.box(key,ry%PI?.05:fence-.5,.05,ry%PI?fence-.5:.05,cx,G+2.24,cz,steel);k.box(key,ry%PI?.05:fence-.5,.05,ry%PI?fence-.5:.05,cx,G+.04,cz,steel);k.box(key,.06,2.24,.06,cx,G+1.12,cz,steel);
  }
  const drum=(x,z,c)=>{const key='s'+sector(x,z);k.tube(key,.29,.88,x,G+.44,z,c);k.tube(key,.3,.03,x,G+.6,z,black);};
  for(const [x,z,c] of [[6.4,-6.7,rust],[7.05,-6.5,lin('#34506a')],[6.7,-7.3,rust],[-6.6,6.8,rust],[-7.2,6.3,lin('#3d5a3a')],[-6.8,-6.9,lin('#34506a')],[6.6,6.6,rust]])drum(x,z,c);
  const crate=(x,z,s,n)=>{const key='s'+sector(x,z);for(let i=0;i<n;i++)k.box(key,s,s*.8,s,x+(i%2)*.07,G+s*.4+i*s*.8,z,lin(i%2?'#7b6248':'#8a7052'),.2*i);};
  crate(7.3,-2.2,.9,2);crate(7.2,-1.1,.8,1);crate(-7.3,2.4,.9,3);crate(-7.3,1.2,.8,1);crate(2.6,7.4,.9,2);crate(-3.2,-7.4,.9,2);crate(-4.3,-7.5,.8,1);
  for(const [x,z] of [[7.4,4.2],[-7.4,-4.4],[4.6,-7.5]]){const key='s'+sector(x,z);for(let i=0;i<4;i++)k.tube(key,.34,.2,x+(i%2)*.04,G+.1+i*.2,z,lin('#1f1f21'));}
  // Tight standing crowd inside the fence, and a darker row pressed against it outside.
  const style={cloth:['#2b2f36','#3a3f45','#4a3b35','#1f2a33','#55504a','#6a2f2c','#2f3d2f','#3d3550','#5f5a52','#243443'].map(lin),fur:FUR,legs:DARK_LEGS,cheer:.3};
  // Oil drums, a crate and old tyres in the circle of people (GOTR-0065), the crowd standing between them.
  const edge=[[.5,'drum'],[2.2,'crate'],[3.7,'drum'],[5.3,'tyres']];
  for(const [a,what] of edge){const x=Math.sin(a)*2.72,z=Math.cos(a)*2.72,key='s'+sector(x,z);if(what==='drum'){k.tube(key,.29,.88,x,G+.44,z,rust);k.tube(key,.3,.03,x,G+.6,z,black);}else if(what==='crate')k.box(key,.7,.56,.7,x,G+.28,z,lin('#7b6248'),a);else for(let i=0;i<2;i++)k.tube(key,.3,.18,x+i*.05,G+.09+i*.18,z,lin('#1c1c1e'));}
  k.crowd({seed:11,round:true,rows:3,inner:3.0,step:.5,spacing:.5,rise:.05,g:G,style,lights:{p:.1,colors:[lin('#ffd9a0'),lin('#dfe9ff')]},skip:(x,z)=>edge.some(([a])=>Math.hypot(x-Math.sin(a)*2.72,z-Math.cos(a)*2.72)<.5)});
  k.crowd({seed:23,rows:1,inner:5.5,step:.5,spacing:.74,g:G,style,thin:.25,skip:(x,z)=>Math.abs(Math.abs(x)-fence)<.6&&Math.abs(Math.abs(z)-fence)<.6});
  return {ring:false,referee:false,background:0x060607,fog:[9,25],lights:{hemi:[0xfff1d6,.30,0x2a2622],key:[0xfff3d9,3.0],fill:[0xb9c4d6,.32],rimA:[0xffd9a6,1.5],rimB:[0xffd9a6,1.5],a:[0xffb060,1.5],b:[0xff9a4a,1.2]}};
 }

 // ---------------------------------------------------------------- street
 function street(k){
  const G=-.015,KERB=6.3,FACE=9.2,asphalt=lin('#4c4f58'),paving=lin('#8f8c86'),white=lin('#d9d9d2'),black=lin('#16171a'),steel=lin('#50565c'),SKY=0x121a36,sky=lin('#121a36');
  k.ambient={sky:[.022,.03,.062],ground:[.012,.011,.014]};
  const lamps=[[5.4,-KERB-.25],[-5.4,-KERB-.25],[5.4,KERB+.25],[-5.4,KERB+.25]];
  for(const [x,z] of lamps)k.lights.push({x,y:5.0,z:z*.86,c:[1,.56,.2],power:4.4,r:3.4,wrap:.3,aim:[0,-1,0],cone:[.1,.8]});
  k.lights.push({x:6.9,y:.8,z:0,c:[1,.93,.78],power:3.0,r:2.5,wrap:.5,aim:[-1,0,0],cone:[.3,.85]},{x:-6.9,y:.8,z:0,c:[1,.93,.78],power:3.0,r:2.5,wrap:.5,aim:[1,0,0],cone:[.3,.85]});
  k.lights.push({x:5.1,y:1.2,z:-5.0,c:[1,.5,.14],power:1.9,r:1.6,wrap:.6},{x:-5.1,y:1.2,z:5.0,c:[1,.5,.14],power:1.9,r:1.6,wrap:.6});
  const shops=[{x:-10.4,w:6.2,h:8.6,wall:'#6f4a3c',sign:'BAKERY',ink:'#ffe9b8',back:'#7a2d22',glow:[1,.78,.46]},{x:-3.6,w:7.2,h:10.4,wall:'#5c6470',sign:'CORNER DINER',ink:'#fff',back:'#b3262c',glow:[1,.62,.52]},{x:3.5,w:6.8,h:7.6,wall:'#7d6a52',sign:'LAUNDRY 24',ink:'#eaffff',back:'#156a78',glow:[.55,.9,1]},{x:10.3,w:6.6,h:9.6,wall:'#4f5a4a',sign:'BARBER',ink:'#fff',back:'#2c3f7a',glow:[.9,.85,1]}];
  for(const s of shops)for(const side of [-1,1])k.lights.push({x:side*s.x,y:1.5,z:-side*(FACE-1.3),c:s.glow,power:1.1,r:2.0,wrap:.5});
  const A=k.atlas;
  for(const s of shops)s.cell=A.cell(240,44,(c,w,h)=>{c.fillStyle=s.back;c.fillRect(0,0,w,h);c.strokeStyle=s.ink;c.lineWidth=2;c.strokeRect(4,4,w-8,h-8);label(c,s.sign,w/2,h/2+1,27,s.ink,w-28,900);});
  const front=A.cell(128,96,(c,w,h)=>{c.fillStyle='#f4e3b6';c.fillRect(0,0,w,h);c.fillStyle='rgba(120,70,30,.55)';for(let i=0;i<4;i++)c.fillRect(8+i*30,h-34-(i%2)*10,22,34+(i%2)*10);c.fillStyle='rgba(255,255,255,.5)';c.fillRect(0,0,w,14);c.fillStyle='#2a2320';c.fillRect(0,0,w,4);c.fillRect(0,h-5,w,5);c.fillRect(0,0,4,h);c.fillRect(w-4,0,4,h);c.fillRect(w/2-2,0,4,h);});
  const windows=A.cell(96,96,(c,w,h)=>{const lit=['#f6d58a','#0e1626','#111a2b','#9fc4e8','#0e1626','#f2b866','#111a2b','#0e1626','#f6d58a'];for(let i=0;i<9;i++){c.fillStyle='#3d3a36';c.fillRect((i%3)*32+3,Math.floor(i/3)*32+3,26,26);c.fillStyle=lit[i];c.fillRect((i%3)*32+6,Math.floor(i/3)*32+6,20,20);c.fillStyle='rgba(0,0,0,.35)';c.fillRect((i%3)*32+15,Math.floor(i/3)*32+6,2,20);}});
  const banner=A.cell(416,84,(c,w,h,L)=>{c.fillStyle='#e9dfc6';c.fillRect(0,0,w,h);c.fillStyle='#b3262c';c.fillRect(0,0,w,9);c.fillRect(0,h-9,w,9);c.direction=L.lang==='he'?'rtl':'ltr';label(c,L.title,w/2,h*.40,40,'#1b1d22',w-30,900);label(c,'GLORY OF THE RING',w/2,h*.74,17,'#b3262c',w-40,800);});
  const plate=A.cell(128,36,(c,w,h)=>{c.fillStyle='#1d4c8f';c.fillRect(0,0,w,h);c.strokeStyle='#fff';c.lineWidth=2;c.strokeRect(3,3,w-6,h-6);label(c,'RING ST',w/2,h/2+1,21,'#fff',w-16,900);});
  // Road, kerbs, pavements and paint.
  k.quad('shell',44,2*KERB,0,G,0,asphalt,{rx:-PI/2,sx:44,sy:12});
  for(const s of [-1,1]){k.box('shell',44,.16,FACE-KERB+.4,0,G+.08,s*(KERB+(FACE-KERB+.4)/2),paving);k.quad('shell',44,FACE-KERB,0,G+.162,s*(KERB+(FACE-KERB)/2),paving,{rx:-PI/2,sx:44,sy:2});k.box('shell',44,.17,.14,0,G+.085,s*KERB,lin('#b9b5ab'));}
  for(let x=-20;x<=20;x+=2.6)if(Math.abs(x)>5.4)k.quad('shell',1.4,.13,x,G+.004,0,white,{rx:-PI/2,sx:2});
  for(const s of [-1,1])for(let i=0;i<7;i++)k.quad('shell',.5,3.6,s*(11.2+i*.0),G+.004,-5+i*1.66,white,{rx:-PI/2,ry:PI/2});
  for(const [x,z] of [[-3.4,4.6],[4.1,-4.3]]){k.disc('shell',.42,x,G+.004,z,lin('#3a3b3e'));k.disc('shell',.33,x,G+.006,z,lin('#4a4b4f'));}
  // Shopfronts and upper storeys on both sides of the street.
  for(const side of [-1,1])for(const s of shops){
   const x=side*s.x,z=-side*FACE,ry=side>0?0:PI,inz=side,wallc=lin(s.wall);
   k.quad('shell',s.w,s.h,x,G+s.h/2,z,wallc,{ry,sx:3,sy:5,gain:.6});
   k.box('shell',s.w+.2,.3,.5,x,G+s.h+.05,z+inz*.05,lin('#2b2d33'));k.box('shell',.16,s.h,.2,x-s.w/2,G+s.h/2,z+inz*.1,lin('#33363d'));
   k.quad('glow',s.w-1.7,2.0,x-side*.55,G+1.45,z+inz*.03,[.92,.88,.8].map((v,i)=>v*(.55+.45*s.glow[i])),{ry,uv:front});
   k.box('shell',.95,2.1,.08,x+side*(s.w/2-.75),G+1.2,z+inz*.05,lin('#3b2a22'));
   k.quad('glow',s.w-.9,.62,x,G+3.02,z+inz*.34,[1,1,1],{ry,uv:s.cell});
   k.box('shell',s.w-.5,.1,1.1,x,G+2.62,z+inz*.6,lin(s.back),0,{rx:-side*.22});
   k.tiled('glow',s.w-1.2,s.h-4.4,x,G+3.7+(s.h-4.4)/2,z+inz*.03,[.8,.78,.74],windows,[2.4,2.4],{ry});
  }
  // Far ends: cross-street silhouettes against the last light of dusk.
  for(const side of [-1,1]){
   const x=side*21,ry=-side*PI/2;
   k.quad('glow',44,16,side*27,7.2,0,[1,1,1],{ry,sx:1,sy:6,tint:(ly,u,v)=>{const t=Math.min(1,v*1.9),w=Math.pow(1-t,1.6);return [sky[0]+(1.25-sky[0])*w*.62,sky[1]+(.46-sky[1])*w*.62,sky[2]+(.2-sky[2])*w*.5];}});
   const rnd=random(side>0?5:9);let z=-21;while(z<21){const w=3.2+rnd()*3.4,h=5.5+rnd()*7.5;k.quad('shell',w,h,x,G+h/2,z+w/2,lin('#262a36'),{ry,sy:3});if(rnd()<.8)k.tiled('glow',w*.7,Math.max(2.4,h*.5),x-side*.03,G+h*.55,z+w/2,[.75,.7,.62],windows,[2.4,2.4],{ry});z+=w+.25;}
  }
  // Street lamps with sodium cones.
  for(const [x,z] of lamps){
   const key='s'+sector(x,z),s=Math.sign(z);
   k.tube(key,.07,5.3,x,G+2.65,z,steel);k.tube(key,.11,.5,x,G+.25,z,steel);k.box(key,.07,.07,1.25,x,G+5.3,z-s*.58,steel);k.box(key,.34,.1,.62,x,G+5.27,z-s*1.1,black);
   k.box('glow',.26,.03,.5,x,G+5.2,z-s*1.1,[1,.8,.48]);k.beam('d'+sector(x,z),x,G+5.18,z-s*1.1,.16,2.5,5.15,[.11,.066,.022],{seg:12,curve:1.4});
   k.quad(key,.86,.24,x,G+3.2,z-s*.09,[1.4,1.4,1.4],{ry:s>0?PI:0,uv:plate});
  }
  // Banner and festoon bulbs strung across the street.
  for(const s of [-1,1]){k.quad('shell',4.9,.99,0,G+3.72,s*(KERB-.35),[1.05,1.02,.98],{ry:s>0?PI:0,uv:banner});k.box('shell',10.8,.02,.02,0,G+4.24,s*(KERB-.35),black);}
  const bulbColors=[[1,.86,.56],[1,.52,.36],[.6,.9,1],[1,.86,.56]];
  for(const [ax,az,bx,bz] of [[-5.4,-KERB-.2,5.4,-KERB-.2],[-5.4,KERB+.2,5.4,KERB+.2],[-5.4,-KERB-.2,-5.4,KERB+.2],[5.4,-KERB-.2,5.4,KERB+.2]])for(let i=1;i<16;i++){const t=i/16,y=G+4.6-1.1*4*t*(1-t)*.5;k.box('glow',.05,.07,.05,ax+(bx-ax)*t,y,az+(bz-az)*t,bulbColors[i%4]);}
  // Cars: two with headlights on the ring, others parked dark along the kerbs.
  const car=(x,z,ry,paint,lightsOn,van)=>{
   const c=Math.cos(ry),s=Math.sin(ry),at=(dx,dz)=>[x+dx*c+dz*s,z-dx*s+dz*c],L=van?4.6:4.2,h=van?1.15:.62;
   k.box('shell',L,h,1.76,x,G+.28+h/2,z,paint,ry);if(!van){const p=at(-.25,0);k.box('shell',2.25,.5,1.56,p[0],G+1.14,p[1],lin('#1c222c'),ry);k.box('shell',2.0,.05,1.5,p[0],G+1.41,p[1],paint,ry);}else{const p=at(1.5,0);k.box('shell',.9,.5,1.6,p[0],G+1.1,p[1],lin('#1c222c'),ry);}
   for(const dx of [-L*.31,L*.31])for(const dz of [-.82,.82]){const p=at(dx,dz);k.tube('shell',.33,.2,p[0],G+.33,p[1],black,{rx:PI/2,ry});}
   for(const dz of [-.6,.6]){const f=at(L/2+.01,dz),b=at(-L/2-.01,dz);k.box('glow',.04,.13,.3,f[0],G+.66,f[1],lightsOn?[1,.97,.86]:[.3,.3,.28],ry);k.box('glow',.04,.11,.26,b[0],G+.7,b[1],lightsOn?[1,.12,.08]:[.35,.04,.03],ry);
    if(lightsOn){const key='d'+sector(x,z);k.beam(key,f[0],G+.66,f[1],.1,1.05,3.4,[.085,.082,.066],{rz:ry?-PI/2+.06:PI/2-.06,seg:10,curve:1.5});}}
  };
  car(8.3,0,PI,lin('#5a2420'),true);car(-8.3,0,0,lin('#27405c'),true);
  car(-1.6,5.25,0,lin('#3c4046'),false);car(3.6,5.3,PI,lin('#8a8778'),false,true);car(-2.6,-5.3,PI,lin('#24364a'),false);car(2.7,-5.25,0,lin('#59302b'),false);car(13.2,5.3,0,lin('#3a4a3c'),false);car(-13.4,-5.3,PI,lin('#6a6a70'),false,true);
  // Fire barrels at two corners.
  for(const [x,z] of [[5.1,-5.0],[-5.1,5.0]]){const key='s'+sector(x,z);k.tube(key,.3,.9,x,G+.45,z,lin('#5a3a2c'));k.cone('glow',.05,.26,.42,x,G+1.08,z,[1,.55,.12],{seg:6});k.cone('glow',.02,.14,.5,x+.04,G+1.16,z,[1,.86,.4],{seg:5});}
  // GOTR-0065: no ring. A scuffed patch of asphalt and a chalk circle drawn round it; bins and a crate where the people stand.
  k.disc('shell',2.6,0,G+.002,0,lin('#3f424a'));k.disc('shell',1.5,.3,G+.003,-.2,lin('#45474e'));
  k.mark(2.3,G+.006,lin('#e9e7df'),{w:.06,gap:9,gain:1.3});k.box('s0',.9,.004,.05,0,G+.006,0,lin('#e9e7df'),.6);k.box('s0',.9,.004,.05,0,G+.006,0,lin('#e9e7df'),-.95);
  const edge=[[1.1,'bin'],[2.9,'crate'],[4.4,'bin'],[5.8,'cone']];
  for(const [a,what] of edge){const x=Math.sin(a)*2.75,z=Math.cos(a)*2.75,key='s'+sector(x,z);if(what==='bin'){k.tube(key,.26,.82,x,G+.41,z,lin('#3c4a3e'));k.tube(key,.28,.05,x,G+.84,z,lin('#2a332c'));}else if(what==='crate'){k.box(key,.55,.4,.55,x,G+.2,z,lin('#8a6a48'),a);k.box(key,.5,.36,.5,x+.05,G+.58,z,lin('#7b5c3e'),a+.4);}else{k.cone(key,.03,.17,.5,x,G+.26,z,lin('#d8642a'),{seg:8});k.box(key,.36,.04,.36,x,G+.02,z,lin('#d8642a'));}}
  // Onlookers: a loose circle close round the fighters, with a few on the parked cars and pavements.
  const style={cloth:['#3d5a7a','#7a3b34','#4f6b4a','#8a7a4c','#3a3f4c','#6b4a6e','#9a5a2c','#2f3f4a','#b0a48c','#5a2f3a','#44556b'].map(lin),fur:FUR,legs:DARK_LEGS.concat([lin('#3c4a66')]),cheer:.36};
  k.crowd({seed:31,round:true,rows:3,inner:3.0,step:.52,spacing:.52,rise:.045,g:G,style,lights:{p:.16,colors:[lin('#e8f1ff'),lin('#cfe4ff'),lin('#fff1d0')]},skip:(x,z)=>edge.some(([a])=>Math.hypot(x-Math.sin(a)*2.75,z-Math.cos(a)*2.75)<.45)});
  const rnd=random(77);
  for(const [x,z,y] of [[-1.9,5.2,1.42],[-1.1,5.3,1.42],[2.4,-5.2,1.42],[3.1,-5.3,1.42],[-2.2,-5.3,1.42],[3.3,5.3,1.45],[4.2,5.2,1.45]])k.person('s'+sector(x,z),x,z,G+y,Math.atan2(-x,-z),rnd,style);
  for(let i=0;i<34;i++){const side=i%2?1:-1,x=-13+rnd()*26,z=side*(KERB+.7+rnd()*1.9);if(Math.abs(x)<4.4&&rnd()<.2)continue;k.person((i&2?'a':'b')+sector(x,z),x,z,G+.16,Math.atan2(-x,-z)+(rnd()-.5),rnd,style);}
  return {ring:false,referee:false,background:SKY,fog:[17,52],lights:{hemi:[0x9fb4ff,.40,0x3a2c22],key:[0xffd6a8,2.5],fill:[0x7f9cff,.72],rimA:[0xffb070,1.9],rimB:[0xffb070,1.7],a:[0xff9a3c,1.8],b:[0x6f8cff,1.3]}};
 }

 // ---------------------------------------------------------------- championship
 function championship(k){
  const G=-.31,dark=lin('#1c2028'),black=lin('#101319'),steel=lin('#8a9099'),carpet=lin('#16224a');
  k.ambient={sky:[.012,.014,.024],ground:[.008,.008,.012]};
  k.lights.push({x:0,y:7,z:0,c:[1,.97,.92],power:6.2,r:4.2,wrap:.3,aim:[0,-1,0],cone:[.05,.75]});
  k.lights.push({x:-11,y:7,z:0,c:[1,.16,.14],power:3.2,r:6,wrap:.5},{x:11,y:7,z:0,c:[.16,.34,1],power:3.4,r:6,wrap:.5},{x:0,y:7,z:11,c:[.72,.5,1],power:2.8,r:6,wrap:.5},{x:0,y:5.5,z:-9.5,c:[1,.72,.34],power:2.6,r:5,wrap:.5});
  const A=k.atlas;
  const laurel=(c,x,y,r,color)=>{c.strokeStyle=color;c.lineWidth=Math.max(2,r*.12);for(const s of [-1,1]){c.beginPath();c.arc(x,y,r,PI/2+s*.25,PI/2+s*2.3,s<0);c.stroke();for(let i=0;i<5;i++){const a=PI/2+s*(.5+i*.42);c.beginPath();c.ellipse(x+Math.cos(a)*r*1.12,y+Math.sin(a)*r*1.12,r*.2,r*.09,a+s*.9,0,PI*2);c.fillStyle=color;c.fill();}}};
  const screen=A.cell(512,224,(c,w,h,L)=>{c.fillStyle='#070b18';c.fillRect(0,0,w,h);c.fillStyle='#a3141b';c.beginPath();c.moveTo(0,0);c.lineTo(w*.34,0);c.lineTo(w*.2,h);c.lineTo(0,h);c.fill();c.fillStyle='#123a9c';c.beginPath();c.moveTo(w,0);c.lineTo(w*.66,0);c.lineTo(w*.8,h);c.lineTo(w,h);c.fill();laurel(c,w/2,h*.36,46,'#f1c75a');label(c,'★',w/2,h*.37,44,'#f1c75a',60,900);label(c,'GLORY OF THE RING',w/2,h*.70,40,'#ffffff',w*.6,900);c.direction=L.lang==='he'?'rtl':'ltr';label(c,L.title,w/2,h*.88,25,'#f1c75a',w*.56,800);});
  const side=(back,word)=>A.cell(96,288,(c,w,h)=>{c.fillStyle=back;c.fillRect(0,0,w,h);c.fillStyle='rgba(255,255,255,.14)';for(let i=0;i<6;i++)c.fillRect(0,i*52+((i*17)%9),w,14);c.save();c.translate(w/2,h/2);c.rotate(-PI/2);label(c,word,0,2,54,'#fff',h-30,900);c.restore();});
  const red=side('#a3141b','RED CORNER'),blue=side('#123a9c','BLUE CORNER');
  const board=A.cell(256,144,(c,w,h)=>{c.fillStyle='#05070d';c.fillRect(0,0,w,h);c.strokeStyle='#f1c75a';c.lineWidth=4;c.strokeRect(5,5,w-10,h-10);label(c,'CHAMPIONSHIP',w/2,h*.33,30,'#f1c75a',w-30,900);label(c,'NIGHT',w/2,h*.62,42,'#fff',w-30,900);label(c,'GLORY OF THE RING',w/2,h*.86,15,'#9fb6ff',w-30,800);});
  const ribbon=A.cell(512,30,(c,w,h)=>{c.fillStyle='#0a1024';c.fillRect(0,0,w,h);for(let i=0;i<2;i++){label(c,'GLORY OF THE RING',w*(.25+i*.5)-22,h/2+1,19,'#fff',w*.36,900);label(c,'★',w*(.25+i*.5)+104,h/2+1,18,'#f1c75a',30,900);}});
  const crowdA=peopleCell(A,3),crowdB=peopleCell(A,8);
  const press=A.cell(128,40,(c,w,h)=>{c.fillStyle='#e9e9ee';c.fillRect(0,0,w,h);label(c,'GLORY OF THE RING',w/2,h/2+1,13,'#123a9c',w-12,900);});
  // Floor, ringside carpet, LED boards at the apron.
  k.quad('shell',44,44,0,G,0,dark,{rx:-PI/2,sx:22,sy:22});k.quad('shell',12.4,12.4,0,G+.004,0,carpet,{rx:-PI/2,sx:12,sy:12});
  for(const [x,z,ry] of [[0,-2.72,0],[0,2.72,PI],[2.72,0,-PI/2],[-2.72,0,PI/2]]){k.box('s'+sector(x,z),ry%PI?.1:5.3,.62,ry%PI?5.3:.1,x*1.012,G+.31,z*1.012,black);k.tiled('g'+sector(x,z),5.2,.52,x,G+.33,z,[1,1,1],ribbon,[5.2,.52],{ry});}
  // Judges' tables.
  for(const [x,z,ry] of [[3.25,1.2,PI/2],[-3.25,-1.2,PI/2],[1.2,3.25,0]]){const key='s'+sector(x,z);k.box(key,1.9,.74,.62,x,G+.37,z,lin('#d9d9de'),ry);k.quad(key,1.5,.46,x-Math.sign(x)*(ry?.315:0),G+.4,z-(ry?0:.315),[1.5,1.5,1.5],{ry:ry?-Math.sign(x)*PI/2:PI,uv:press});}
  // Ringside chairs with seated guests.
  const style={cloth:['#2c3550','#6a2a30','#e3ded2','#3f5f4c','#8a6a2c','#4a4a56','#1d2330','#7c4f73','#b5483c','#3c6c8c'].map(lin),fur:FUR,legs:DARK_LEGS,cheer:.3,seated:true};
  const aisle=(x,z)=>z<0&&Math.abs(x)<1.55;
  k.crowd({seed:41,rows:4,inner:3.55,step:.62,spacing:.56,rise:.07,g:G+.08,style,skip:aisle});
  // Entrance: stage, ramp with light strips, truss gate and the big screen.
  k.box('shell',11,1.0,3.2,0,G+.5,-13.2,black);k.quad('shell',11,3.2,0,G+1.003,-13.2,lin('#3a3f4c'),{rx:-PI/2,sx:8,sy:2});
  for(let i=0;i<4;i++){const z=-11.6+i*2.35+1.175,h=1.0-i*.235;k.box('shell',1.9,h,2.35,0,G+h/2,z,lin('#30343f'));k.quad('shell',1.9,2.35,0,G+h+.003,z,lin('#4a5060'),{rx:-PI/2,sy:2});for(const s of [-1,1])k.box('glow',.06,.05,2.3,s*.96,G+h+.03,z,[1,.83,.42]);}
  k.quad('glow',9.6,4.2,0,G+5.0,-14.75,[1,1,1],{uv:screen});k.box('shell',10,4.6,.2,0,G+5.0,-14.9,black);
  for(const [s,cell] of [[-1,red],[1,blue]]){k.quad('glow',1.5,4.5,s*6.3,G+4.85,-14.6,[1,1,1],{uv:cell});k.box('shell',1.7,4.7,.2,s*6.3,G+4.85,-14.75,black);}
  for(const s of [-1,1]){const key='s'+sector(s*2.2,-10.6);k.box(key,.34,5.2,.34,s*2.2,G+2.6,-10.6,steel);for(let i=0;i<7;i++)k.box(key,.4,.04,.4,s*2.2,G+.5+i*.72,-10.6,black);}
  {const key='s'+sector(0,-10.6);k.box(key,4.9,.34,.34,0,G+5.2,-10.6,steel);k.quad(key,3.0,1.69,0,G+4.1,-10.42,[1.6,1.6,1.6],{uv:board});for(let i=-2;i<=2;i++){k.tube(key,.11,.24,i*.95,G+5.47,-10.6,black);k.ball('g'+sector(0,-10.6),.1,.1,.1,i*.95,G+5.47,-10.45,i%2?[.6,.75,1]:[1,.9,.7]);}}
  for(const [x,rz,c] of [[-4.6,-.38,[.05,.065,.15]],[-3.2,-.16,[.12,.1,.05]],[3.2,.16,[.12,.1,.05]],[4.6,.38,[.15,.04,.04]]]){k.tube('shell',.13,.3,x,G+1.16,-12.4,black);k.ball('glow',.11,.05,.11,x,G+1.32,-12.4,[1,.95,.85]);k.local.makeTranslation(0,5.5,0).scale(k.s.set(1,11,1));k.m(x,G+1.3,-12.4,-.14,0,rz,1,1,1,k.base);k.add('d'+sector(x,-12.4),taper(1.0,.09,10,true),k.mat.multiplyMatrices(k.base,k.local),c,{tint:ly=>{const t=Math.pow(.5-ly,1.3);return [t,t,t];}});}
  // Lower bowl, fascia ribbon and upper tier on every side.
  const tier=(half,y,depth,rise,cells,gain)=>{
   for(const [nx,nz,ry] of [[0,-1,0],[0,1,PI],[1,0,-PI/2],[-1,0,PI/2]]){
    const n=Math.max(2,Math.round(2*half/3.3)),w=2*half/n;
    for(let i=0;i<n;i++){
     const t=-half+(i+.5)*w,x=nx?nx*half:t,z=nz?nz*half:t;if(nz<0&&Math.abs(t)<(half<13?5.6:7.6))continue;
     const key='s'+sector(x,z);
     k.box(key,nx?depth:w,rise,nx?w:depth,x+nx*depth/2,y-rise/2,z+nz*depth/2,black);
     k.quad(key,w,1.06,x+nx*.3,y+.5,z+nz*.3,[gain,gain,gain],{ry,uv:cells[(i+Math.round(half*3))%2]});
    }
   }
  };
  for(let r=0;r<10;r++)tier(6.5+r*.68,G+.45+r*.42,.68,.42,[crowdA,crowdB],1.0);
  for(const [nx,nz,ry] of [[0,-1,0],[0,1,PI],[1,0,-PI/2],[-1,0,PI/2]])for(let i=0;i<6;i++){const half=13.32,w=2*half/6,t=-half+(i+.5)*w,x=nx?nx*half:t,z=nz?nz*half:t;if(nz<0&&Math.abs(t)<7.6)continue;k.box('s'+sector(x,z),nx?.2:w,1.3,nx?w:.2,x+nx*.12,G+5.1,z+nz*.12,black);k.tiled('g'+sector(x,z),w,.5,x,G+5.2,z,[.9,.9,.9],ribbon,[w,.5],{ry});}
  for(let r=0;r<7;r++)tier(13.9+r*.7,G+6.1+r*.56,.7,.56,[crowdB,crowdA],.8);
  // Flash-bulb sparkle in the stands.
  const rnd=random(19);for(let i=0;i<70;i++){const half=7+rnd()*11,t=(rnd()*2-1)*half,side=Math.floor(rnd()*4),x=side===0?t:side===1?half:side===2?-t:-half,z=side===0?-half:side===1?t:side===2?half:-t,y=half<13.3?G+.45+(half-6.5)/.68*.42+.95:G+6.1+(half-13.9)/.7*.56+.95;if(z<-6&&Math.abs(x)<7.6)continue;k.box('g'+sector(x,z),.05,.05,.05,x*.985,y,z*.985,[1,1,1]);}
  // Lighting truss over the ring with spot cans and shafts.
  const TY=G+6.4,TH=3.3;
  for(const s of [-1,1]){k.box('shell',2*TH+.3,.3,.3,0,TY,s*TH,steel);k.box('shell',.3,.3,2*TH+.3,s*TH,TY,0,steel);k.box('shell',2*TH,.06,.06,0,TY+.45,s*TH,steel);k.box('shell',.06,.06,2*TH,s*TH,TY+.45,0,steel);for(let i=-5;i<=5;i++){k.box('shell',.05,.45,.05,i*.62,TY+.22,s*TH,steel);k.box('shell',.05,.45,.05,s*TH,TY+.22,i*.62,steel);}}
  for(const s of [-1,1])for(let i=-2;i<=2;i++)for(const along of [0,1]){const x=along?i*1.3:s*TH,z=along?s*TH:i*1.3;k.tube('shell',.14,.3,x,TY-.3,z,black);k.ball('glow',.12,.03,.12,x,TY-.46,z,i%2?[.8,.88,1]:[1,.96,.88]);}
  for(const [x,z] of [[TH,TH],[-TH,TH],[TH,-TH],[-TH,-TH]]){k.local.makeTranslation(0,-3.6,0).scale(k.s.set(1,7.2,1));k.m(x,TY-.4,z,Math.atan2(z,6.6)*.92,0,-Math.atan2(x,6.6)*.92,1,1,1,k.base);k.add('add',taper(.14,1.5,10,true),k.mat.multiplyMatrices(k.base,k.local),[.05,.053,.062],{tint:ly=>{const t=Math.pow(ly+.5,1.6);return [t,t,t];}});}
  // Four-sided scoreboard above the ring.
  for(const [x,z,ry] of [[0,1.52,0],[0,-1.52,PI],[1.52,0,PI/2],[-1.52,0,-PI/2]])k.quad('glow',3.0,1.69,x,TY+2.2,z,[1,1,1],{ry,uv:board});
  k.box('shell',3.0,1.8,3.0,0,TY+2.2,0,black);
  return {background:0x04060c,fog:[30,78],lights:{hemi:[0xcfe0ff,.42,0x30343c],key:[0xffffff,3.1],fill:[0xa6c9ff,.7],rimA:[0xffffff,2.4],rimB:[0xffffff,2.4],a:[0xff4a4a,2.2],b:[0x4a7dff,2.4]}};
 }

 // Shared procedural cells.
 const brickCell=A=>A.cell(128,128,(c,w,h)=>{c.fillStyle='#8f8678';c.fillRect(0,0,w,h);const rnd=random(5),tones=['#8a4a38','#7d4032','#96523c','#84483a','#733a2e'];for(let r=0;r<8;r++)for(let i=-1;i<4;i++){c.fillStyle=tones[Math.floor(rnd()*tones.length)];c.fillRect(i*32+(r%2)*16+1,r*16+1,30,14);}});
 const ribCell=A=>A.cell(64,64,(c,w,h)=>{for(let i=0;i<8;i++){c.fillStyle='#e4e4e4';c.fillRect(i*8,0,4,h);c.fillStyle='#b6b6b6';c.fillRect(i*8+4,0,2,h);c.fillStyle='#8c8c8c';c.fillRect(i*8+6,0,2,h);}});
 const gloves=(c,x,y,s,color)=>{c.fillStyle=color;for(const d of [-1,1]){c.beginPath();c.arc(x+d*s*1.15,y,s,0,PI*2);c.fill();c.fillRect(x+d*s*1.15-s*.8,y+s*.6,s*1.6,s*1.1);}};
 // Dusk sky panel that fades into the scene background colour at the top.
 const duskTint=sky=>(ly,u,v)=>{const w=Math.pow(1-Math.min(1,v*1.9),1.6);return [sky[0]+(1.25-sky[0])*w*.62,sky[1]+(.46-sky[1])*w*.62,sky[2]+(.2-sky[2])*w*.5];};

 // ---------------------------------------------------------------- boxing club
 function boxingClub(k){
  k.cameraRadius=6.4; // the intro orbit stays inside the corner fittings
  const G=-.31,HX=7.6,HZ=6.6,C=4.5,wood=lin('#8a6a48'),steel=lin('#5a6068'),black=lin('#1b1b1e'),cream=lin('#cfc3a6'),green=lin('#2f4a3c'),leather=['#7a2a24','#1d1d20','#8a6a3a','#27405c'].map(lin);
  k.ambient={sky:[.07,.066,.06],ground:[.05,.044,.038]};
  const fixtures=[];for(const z of [-3.2,3.2])for(const x of [-5.4,-1.8,1.8,5.4])fixtures.push([x,z]);
  for(const [x,z] of fixtures)k.lights.push({x,y:C-.6,z,c:[1,.95,.85],power:1.25,r:3.4,aim:[0,-1,0],cone:[-.15,.6]});
  const A=k.atlas,brick=brickCell(A);
  const sign=A.cell(448,92,(c,w,h,L)=>{c.fillStyle='#22382e';c.fillRect(0,0,w,h);c.strokeStyle='#d8caa4';c.lineWidth=3;c.strokeRect(6,6,w-12,h-12);c.direction=L.lang==='he'?'rtl':'ltr';label(c,L.title,w/2,h*.42,44,'#eadfbe',w-40,900);label(c,'GLORY OF THE RING  •  EST. ROUND ONE',w/2,h*.78,15,'#c9a23a',w-40,800);});
  const fightPoster=A.cell(128,176,(c,w,h)=>{c.fillStyle='#e2d6b8';c.fillRect(0,0,w,h);c.fillStyle='#8f231f';c.fillRect(8,8,w-16,40);label(c,'FIGHT NIGHT',w/2,29,20,'#f4ead0',w-24,900);gloves(c,w/2,92,17,'#8f231f');label(c,'GLORY',w/2,138,24,'#1c1a18',w-20,900);label(c,'OF THE RING',w/2,160,15,'#1c1a18',w-20,900);});
  const trainPoster=A.cell(128,176,(c,w,h)=>{c.fillStyle='#1f3550';c.fillRect(0,0,w,h);c.strokeStyle='#e0c89c';c.lineWidth=3;c.strokeRect(7,7,w-14,h-14);label(c,'TRAIN',w/2,46,32,'#e0c89c',w-24,900);label(c,'HARD',w/2,82,32,'#e0c89c',w-24,900);c.fillStyle='#c9a23a';c.fillRect(30,104,w-60,4);label(c,'STAY',w/2,128,22,'#fff',w-24,900);label(c,'HUMBLE',w/2,153,22,'#fff',w-24,900);});
  const rules=A.cell(104,136,(c,w,h)=>{c.fillStyle='#efe9da';c.fillRect(0,0,w,h);label(c,'CLUB RULES',w/2,18,13,'#8f231f',w-12,900);c.fillStyle='#55504a';for(let i=0;i<7;i++){c.fillRect(12,36+i*13,6,6);c.fillRect(24,37+i*13,58-((i*23)%30),4);}});
  // Timber floor with seams and rubber mats under the bags.
  k.quad('shell',2*HX,2*HZ,0,G,0,wood,{rx:-PI/2,sx:15,sy:13});
  for(let x=-HX+.6;x<HX;x+=.6)k.quad('shell',.016,2*HZ,x,G+.003,0,lin('#5a422c'),{rx:-PI/2,sy:6});
  k.quad('shell',2*HX-1,1.9,0,G+.006,-HZ+1.25,lin('#2a2c30'),{rx:-PI/2,sx:14});k.quad('shell',1.9,7.5,HX-1.2,G+.006,.6,lin('#2a2c30'),{rx:-PI/2,sy:7});
  // Brick walls with a painted dado, posters and the club board.
  for(const [x,z,ry,len] of [[0,-HZ,0,2*HX],[0,HZ,PI,2*HX],[HX,0,-PI/2,2*HZ],[-HX,0,PI/2,2*HZ]]){
   const ox=Math.sin(ry)*.012,oz=Math.cos(ry)*.012,ax=Math.cos(ry),az=-Math.sin(ry);
   k.tiled('shell',len,C-G,x,(C+G)/2,z,[1.15,1.15,1.15],brick,[1.2,1.2],{ry});
   k.quad('shell',len,1.25,x+ox,G+.625,z+oz,green,{ry,sx:12});k.quad('shell',len,.09,x+ox*2,G+1.3,z+oz*2,cream,{ry,sx:12});
   const put=(cell,w,h,along,y)=>k.quad('shell',w,h,x+ox*3+ax*along,y,z+oz*3+az*along,[1.25,1.25,1.25],{ry,uv:cell});
   if(z<0){put(fightPoster,.8,1.1,-6.4,1.75);put(trainPoster,.8,1.1,6.4,1.75);put(sign,4.4,.9,0,2.25);}
   else if(z>0){put(sign,4.4,.9,0,3.5);put(rules,.62,.81,6.5,1.7);put(fightPoster,.8,1.1,-6.5,1.75);}
   else{put(sign,4.4,.9,0,3.3);put(trainPoster,.8,1.1,x>0?0:5.2,1.85);put(fightPoster,.8,1.1,x>0?5.3:-5.4,1.85);put(rules,.62,.81,x>0?-5.3:-.9,1.75);}
  }
  // High windows at dusk on the bag wall.
  for(const x of [-4.8,0,4.8]){k.quad('glow',2.3,.95,x,3.72,-HZ+.03,[.13,.19,.31]);k.box('shell',2.42,.07,.08,x,3.22,-HZ+.05,cream);k.box('shell',2.42,.07,.08,x,4.22,-HZ+.05,cream);for(const dx of [-1.18,-.39,.39,1.18])k.box('shell',.06,1.0,.08,x+dx,3.72,-HZ+.05,cream);}
  // Ceiling, trusses and strip lights.
  k.quad('shell',2*HX,2*HZ,0,C,0,lin('#3a3632'),{rx:PI/2,sx:8,sy:7});
  for(const z of [-5.2,-2.6,0,2.6,5.2]){k.box('shell',2*HX,.16,.12,0,C-.3,z,steel);k.box('shell',2*HX,.1,.1,0,C-.08,z,steel);for(let x=-HX+.6;x<HX;x+=1.2)k.box('shell',.05,.24,.05,x,C-.19,z,steel);}
  for(const [x,z] of fixtures){k.box('shell',1.35,.07,.22,x,C-.52,z,lin('#d9d9d4'));k.box('glow',1.25,.03,.14,x,C-.565,z,[1,.98,.9]);for(const dx of [-.5,.5])k.box('shell',.015,.5,.015,x+dx,C-.26,z,black);}
  // Heavy bags on a wall rail.
  k.box('shell',2*HX-1.6,.1,.1,0,3.05,-HZ+1.2,steel);for(let x=-6;x<=6;x+=3)k.box('shell',.08,.08,1.2,x,3.05,-HZ+.6,steel);
  [-5.5,-3.3,-1.1,1.1,3.3,5.5].forEach((x,i)=>{const key='s'+sector(x,-HZ+1.2);k.box(key,.03,1.08,.03,x,2.5,-HZ+1.2,steel);k.tube(key,.2,1.16,x,1.38,-HZ+1.2,leather[i%4]);k.tube(key,.205,.07,x,1.72,-HZ+1.2,cream);k.tube(key,.205,.07,x,1.0,-HZ+1.2,cream);});
  // Speed-bag platforms, a double-end bag and the round timer.
  for(const z of [-2.6,2.2]){const key='s'+sector(HX-.5,z);k.box(key,.08,.9,1.0,HX-.05,2.35,z,wood);k.box(key,.5,.06,.08,HX-.3,2.28,z-.3,steel);k.box(key,.5,.06,.08,HX-.3,2.28,z+.3,steel);k.tube(key,.4,.06,HX-.55,2.25,z,wood);k.tube(key,.03,.1,HX-.55,2.17,z,steel);k.ball(key,.11,.16,.11,HX-.55,2.0,z,leather[0]);}
  {const x=5.3,z=4.6,key='s'+sector(x,z);k.box(key,.014,C-1.5,.014,x,(C+1.5)/2,z,black);k.box(key,.014,1.2-G,.014,x,(1.2+G)/2,z,black);k.ball(key,.13,.15,.13,x,1.35,z,leather[0]);}
  k.box('shell',.62,.3,.1,2.2,2.95,-HZ+.06,black);[[.2,1,.35],[1,.8,.2],[1,.2,.15]].forEach((c,i)=>k.ball('glow',.07,.07,.03,2.02+i*.18,2.95,-HZ+.12,c));
  // Lockers and bench, mirrors, rack and medicine balls.
  for(let i=0;i<9;i++){const z=-4.2+i*.56;k.box('shell',.45,1.9,.52,-HX+.24,G+.95,z,lin(i%2?'#4f6272':'#586d7e'));k.box('shell',.02,.12,.05,-HX+.48,G+1.15,z+.17,black);}
  k.box('shell',.36,.07,2.6,-HX+1.25,G+.46,-2,wood);for(const z of [-3.1,-.9])k.box('shell',.3,.44,.07,-HX+1.25,G+.22,z,steel);
  for(const x of [-3.4,0,3.4]){k.quad('shell',2.9,1.9,x,G+2.1,HZ-.04,lin('#a9c0cc'),{ry:PI,sx:3,gain:1.15});k.box('shell',3.0,.06,.05,x,G+1.12,HZ-.05,steel);k.box('shell',3.0,.06,.05,x,G+3.08,HZ-.05,steel);}
  {const x=-5.6,z=HZ-.8;k.box('shell',1.9,.06,.4,x,G+.5,z,steel);k.box('shell',1.9,.06,.4,x,G+.95,z,steel);for(const dx of [-.9,.9])k.box('shell',.06,1.0,.4,x+dx,G+.5,z,steel);for(let i=0;i<5;i++)for(const y of [.6,1.05])k.tube('shell',.07,.3,x-.7+i*.35,G+y,z,black,{rz:PI/2});}
  [[4.2,HZ-.9,'#8f231f'],[4.6,HZ-.75,'#27405c'],[3.85,HZ-.7,'#c9a23a']].forEach(([x,z,c])=>k.ball('shell',.17,.17,.17,x,G+.17,z,lin(c)));
  // Corner stool, bucket and ring steps.
  k.tube('shell',.17,.04,2.35,G+.5,2.35,lin('#8f231f'));k.tube('shell',.03,.5,2.35,G+.25,2.35,steel);k.tube('shell',.13,.28,2.75,G+.14,2.05,lin('#8a9099'));
  k.box('s'+sector(-2.35,-2.2),.7,.16,.5,-2.35,G+.08,-2.25,wood);k.box('s'+sector(-2.35,-2.2),.7,.16,.26,-2.35,G+.24,-2.13,wood);
  // A few members watching from the apron and the mats.
  const style={cloth:['#8f9499','#27405c','#7a2a24','#d9d5cb','#2f4a3c','#1d1d20','#c9a23a','#5a6068'].map(lin),fur:FUR,legs:DARK_LEGS.concat(['#6a6f76','#27405c'].map(lin)),cheer:.2};
  k.crowd({seed:53,rows:2,inner:2.8,step:.7,spacing:.82,g:G,style,thin:.52});
  const rnd=random(61);for(const [x,z] of [[-5.5,-4.4],[-3.0,-4.5],[1.3,-4.5],[5.9,-2.3],[5.9,2.0],[-5.9,-1.7],[-5.7,3.6],[4.7,5.0],[-1.5,5.3]])k.person('s'+sector(x,z),x,z,G,Math.atan2(-x,-z)+(rnd()-.5)*1.6,rnd,style);
  return {background:0x14110e,fog:[20,48],lights:{hemi:[0xfff0dc,.5,0x4a3c30],key:[0xfff4e0,2.8],fill:[0xcfd8e6,.6],rimA:[0xf4f4f4,2],rimB:[0xf4f4f4,2],a:[0xffc890,1.2],b:[0xffe2b8,1.0]}};
 }

 // ---------------------------------------------------------------- docks hangar
 function docks(k){
  const G=-.015,HX=15,HZ=11,E=7,R=9.6,SKY=0x0d1326,sky=lin('#0d1326'),concrete=lin('#585b5f'),steel=lin('#59636c'),black=lin('#15171a'),yellow=lin('#d0aa1e'),paints=['#8a3a2a','#2f5a80','#3f6a48','#b8642a','#6a6f76','#7a2f3a','#2f6a70'].map(lin);
  k.ambient={sky:[.018,.022,.036],ground:[.022,.019,.016]};
  const bays=[];for(const x of [-8,0,8])for(const z of [-4.6,4.6])bays.push([x,z]);
  for(const [x,z] of bays)k.lights.push({x,y:6.3,z,c:[1,.68,.36],power:4.4,r:4.4,aim:[0,-1,0],cone:[.05,.7]});
  k.lights.push({x:1.5,y:3,z:-HZ-4,c:[.5,.62,1],power:2.2,r:7,wrap:.6},{x:HX+4,y:3,z:0,c:[.5,.62,1],power:2.0,r:7,wrap:.6});
  const A=k.atlas,rib=ribCell(A);
  const number=A.cell(160,176,(c,w,h)=>{label(c,'3',w/2,h*.47,168,'#e9e6dc',w-10,900);});
  const board=A.cell(448,92,(c,w,h,L)=>{c.fillStyle='#e9dfc6';c.fillRect(0,0,w,h);c.fillStyle='#1c2a3c';c.fillRect(0,0,w,10);c.fillRect(0,h-10,w,10);c.direction=L.lang==='he'?'rtl':'ltr';label(c,L.title,w/2,h*.42,42,'#1c2a3c',w-36,900);label(c,'GLORY OF THE RING  •  FIGHT NIGHT',w/2,h*.75,16,'#b8442a',w-40,800);});
  const code=A.cell(160,40,(c,w,h)=>{label(c,'GOTR 204815',w/2,h*.36,19,'#f1efe8',w-10,900);label(c,'22G1  •  MAX 30T',w/2,h*.76,11,'#f1efe8',w-10,700);});
  const hazard=A.cell(128,24,(c,w,h)=>{c.fillStyle='#e0b81e';c.fillRect(0,0,w,h);c.fillStyle='#17181a';for(let i=-1;i<9;i++){c.beginPath();c.moveTo(i*24,h);c.lineTo(i*24+12,h);c.lineTo(i*24+24,0);c.lineTo(i*24+12,0);c.fill();}});
  // Floor inside and the quay outside, lane paint, hazard square and puddles.
  k.quad('shell',64,56,6,G,-6,concrete,{rx:-PI/2,sx:32,sy:28});
  for(const s of [-1,1]){k.quad('shell',2*HX-3,.12,0,G+.004,s*6.6,yellow,{rx:-PI/2,sx:12});k.quad('shell',.12,13.2,s*(HX-1.5),G+.004,0,yellow,{rx:-PI/2,sy:8});}
  // GOTR-0065: no ring. Bare concrete under a hanging work lamp, a dashed yellow circle, a hazard strip by the quay door.
  k.disc('shell',2.5,0,G+.003,0,lin('#4a5058'));k.mark(2.34,G+.008,yellow,{w:.09,gap:4});
  for(let i=0;i<4;i++)k.quad('shell',1.4,.24,-2.1+i*1.4,G+.005,-6.2,[1,1,1],{rx:-PI/2,uv:hazard});
  k.lights.push({x:0,y:3.4,z:0,c:[1,.86,.6],power:3.2,r:2.6,wrap:.35,aim:[0,-1,0],cone:[-.2,.5]});
  k.box('shell',.02,E-3.55,.02,0,(E+3.55)/2,0,black);k.cone('shell',.06,.32,.24,0,3.48,0,lin('#c9a020'),{seg:10});k.ball('glow',.18,.035,.18,0,3.36,0,[1,.9,.66]);
  k.beam('add',0,3.35,0,.18,2.4,3.36,[.075,.06,.036],{seg:16,curve:1.25});
  for(const [x,z,r] of [[5.2,3.8,1.1],[-6.1,-2.2,.8],[2.2,-7.6,1.3],[-3.8,6.9,.9],[9.6,-1.5,1.0]])k.disc('shell',r,x,G+.003,z,lin('#34373b'));
  // Corrugated walls with two open doors (quay side -Z, yard side +X).
  const wall=(x,z,ry,w,y0,y1)=>k.tiled('shell',w,y1-y0,x,(y0+y1)/2,z,[.5,.58,.64],rib,[3,3],{ry});
  wall(-10.5,-HZ,0,9,G,E);wall(12,-HZ,0,6,G,E);wall(1.5,-HZ,0,15,6.2,E);
  wall(HX,-8.5,-PI/2,5,G,E);wall(HX,8,-PI/2,6,G,E);wall(HX,-.5,-PI/2,11,6.0,E);
  wall(0,HZ,PI,2*HX,G,E);wall(-HX,0,PI/2,2*HZ,G,E);
  for(const [x,z,ry,w] of [[0,-HZ,0,2*HX],[0,HZ,PI,2*HX]])for(let i=0;i<10;i++){const u=(i+.5)/10-.5,h=(R-E)*(1-Math.abs(u)*2);if(h>.1)k.quad('shell',w/10,h,x+u*w*Math.cos(ry),E+h/2,z,[.2,.23,.26],{ry});}
  k.quad('shell',5.2,5.7,-10.5,3.4,-HZ+.03,[1.1,1.1,1.1],{uv:number});k.quad('shell',5.2,5.7,-HX+.03,3.4,5.5,[1.1,1.1,1.1],{ry:PI/2,uv:number});k.quad('shell',5.2,5.7,-9,3.4,HZ-.03,[1.1,1.1,1.1],{ry:PI,uv:number});
  for(const [x,z,ry,y] of [[1.5,-HZ+.04,0,6.6],[HX-.04,-.5,-PI/2,6.5],[4,HZ-.04,PI,5.4],[-HX+.04,-4.5,PI/2,5.4]])k.quad('shell',5.6,1.15,x,y,z,[1.3,1.3,1.3],{ry,uv:board});
  // Door frames, roof underside, trusses and the travelling crane.
  for(const x of [-6,9])k.box('shell',.3,6.6,.3,x,G+3.3,-HZ,yellow);k.box('shell',15.3,.3,.3,1.5,6.3,-HZ,yellow);
  for(const z of [-6,5])k.box('shell',.3,6.4,.3,HX,G+3.2,z,yellow);k.box('shell',.3,.3,11.3,HX,6.1,-.5,yellow);
  for(const s of [-1,1])k.quad('shell',2*HX,Math.hypot(HZ,R-E),0,(E+R)/2,s*HZ/2,lin('#3d444b'),{rx:PI/2-s*Math.atan2(R-E,HZ),sx:10,sy:3});
  for(const x of [-12,-6,0,6,12]){k.box('shell',.14,.14,2*HZ,x,E,0,steel);for(const s of [-1,1]){k.box('shell',.12,.12,Math.hypot(HZ,R-E),x,(E+R)/2-.1,s*HZ/2,steel,0,{rx:s*Math.atan2(R-E,HZ)});k.box('shell',.08,1.25,.08,x,E+.62,s*5.5,steel);}k.box('shell',.08,R-E-.1,.08,x,(E+R)/2,0,steel);}
  k.box('shell',.5,.6,2*HZ,-4.2,6.1,0,yellow);k.box('shell',.8,.4,.8,-4.2,5.7,3.4,black);k.box('shell',.03,1.5,.03,-4.2,4.8,3.4,black);k.box('shell',.22,.3,.1,-4.2,3.95,3.4,yellow);
  // High-bay sodium lamps.
  for(const [x,z] of bays){k.box('shell',.02,E-6.55,.02,x,(E+6.55)/2,z,black);k.cone('shell',.1,.34,.3,x,6.45,z,black,{seg:10});k.ball('glow',.26,.04,.26,x,6.3,z,[1,.72,.36]);k.beam('d'+sector(x,z),x,6.3,z,.22,3.0,6.5,[.1,.06,.02],{seg:12,curve:1.4});}
  // Outside the quay door: water, dusk, cranes and container stacks.
  k.quad('glow',120,34,0,13.5,-64,[1,1,1],{sy:6,tint:duskTint(sky)});k.quad('glow',90,34,58,13.5,-10,[1,1,1],{ry:-PI/2,sy:6,tint:duskTint(sky)});
  k.quad('glow',120,34,0,G+.02,-45,[.035,.05,.085],{rx:-PI/2});for(let i=0;i<14;i++)k.quad('glow',2.5+i%3,.12,-26+i*4.1,G+.04,-30-(i%4)*3.2,[.5,.3,.14],{rx:-PI/2});
  const crane=(x,z,h)=>{const c=lin('#39404a');for(const dx of [-3,3])for(const dz of [-2.4,2.4])k.box('shell',.6,h,.6,x+dx,G+h/2,z+dz,c);k.box('shell',7,.7,.7,x,G+h*.45,z-2.4,c);k.box('shell',7,.7,.7,x,G+h*.45,z+2.4,c);k.box('shell',1.2,1.1,24,x,G+h,z-6,c);k.box('shell',2.2,1.6,2.2,x,G+h-1.4,z-4,lin('#59636c'));k.box('shell',.25,7,.25,x,G+h+3.5,z+1,c);k.box('shell',.18,.18,15.5,x,G+h+3.4,z-6.2,c,0,{rx:-.43});k.box('glow',.3,.3,.3,x,G+h+7.1,z+1,[1,.15,.1]);k.box('glow',.25,.25,.25,x,G+h+.8,z-17.8,[1,.15,.1]);k.box('glow',1.2,.12,.2,x,G+h-2.25,z-4,[1,.85,.55]);};
  crane(-7,-27,15);crane(8,-31,17);
  const container=(key,x,y,z,ry,paint,tag)=>{const L=6.06,H=2.59,W=2.44,c=Math.cos(ry),s=Math.sin(ry);k.box(key,L,H,W,x,y+H/2,z,paint,ry,{gain:.55});for(const side of [-1,1]){const nx=s*side*(W/2+.012),nz=c*side*(W/2+.012);k.tiled(key,L-.2,H-.2,x+nx,y+H/2,z+nz,paint,rib,[1.2,H-.2],{ry:ry+(side>0?0:PI)});if(tag)k.quad(key,1.5,.38,x+nx*1.01+c*side*1.9,y+H-.5,z+nz*1.01-s*side*1.9,[1.2,1.2,1.2],{ry:ry+(side>0?0:PI),uv:code});}};
  const far=random(4);for(let i=0;i<9;i++){const x=-25+i*6.3,n=1+Math.floor(far()*3);for(let j=0;j<n;j++)container('shell',x,G+j*2.59,-17.5-(i%2)*2.7,0,paints[Math.floor(far()*paints.length)],false);}
  for(let i=0;i<5;i++){const z=-9+i*6.3,n=1+Math.floor(far()*3);for(let j=0;j<n;j++)container('shell',23+(i%2)*2.7,G+j*2.59,z,PI/2,paints[Math.floor(far()*paints.length)],false);}
  k.tube('shell',.14,15,21,G+7.5,-15,steel);for(const d of [-.5,.5])k.box('glow',.5,.3,.12,21+d,G+15,-15,[1,.9,.7]);
  // Containers inside as grandstands, with crew on top.
  const rnd=random(71),style={cloth:['#e0701c','#d9c21c','#1f2f44','#5a5f66','#e0701c','#2f4a3c','#d9c21c','#3a3f48'].map(lin),fur:FUR,legs:DARK_LEGS,cheer:.32,hat:{p:.72,colors:['#e0c020','#f1efe8','#e0701c'].map(lin)}};
  const stand=(x,z,ry,levels,tints)=>{
   for(let j=0;j<levels;j++)container('s'+sector(x,z),x,G+j*2.59,z,ry,paints[tints[j]],true);
   // Crew along the edge that faces the ring.
   const top=G+levels*2.59,c=Math.cos(ry),s=Math.sin(ry),nx=s,nz=c,toward=nx*-x+nz*-z>0?1:-1;
   for(let i=0;i<8;i++){const u=-2.6+i*.74+(rnd()-.5)*.2,px=x+c*u+nx*toward*.8,pz=z-s*u+nz*toward*.8;if(rnd()<.2)continue;k.person('s'+sector(x,z),px,pz,top,Math.atan2(-px,-pz),rnd,style);}
  };
  stand(-11.2,-3.4,PI/2,2,[0,1]);stand(-11.2,3.2,PI/2,1,[3]);stand(-8.3,7.9,0,1,[2]);stand(-1.8,8.6,0,2,[4,0]);stand(4.9,8.6,0,1,[1]);stand(11.3,7.6,PI/2,2,[5,3]);stand(11.4,-8.6,0,2,[6,2]);stand(-9.6,-9.0,0,1,[3]);
  // Forklift, pallets, drums and bollards.
  {const x=-7.3,z=-6.0,key='s'+sector(x,z);k.box(key,1.15,.75,1.9,x,G+.62,z,yellow);k.box(key,1.05,.06,1.1,x,G+2.05,z-.2,black);for(const dx of [-.5,.5])for(const dz of [-.7,.3])k.box(key,.05,1.1,.05,x+dx,G+1.5,z+dz,black);for(const dx of [-.3,.3]){k.box(key,.08,2.4,.08,x+dx,G+1.3,z+1.0,black);k.box(key,.1,.05,1.0,x+dx,G+.12,z+1.5,steel);}for(const dx of [-.58,.58])for(const dz of [-.6,.6])k.tube(key,.26,.2,x+dx,G+.26,z+dz,black,{rz:PI/2});}
  const pallet=(x,z,n,c)=>{const key='s'+sector(x,z);k.box(key,1.2,.14,1.0,x,G+.07,z,lin('#8a7052'));for(let i=0;i<n;i++)k.box(key,1.05,.62,.9,x,G+.45+i*.63,z,lin(c),.08*i);};
  pallet(7.2,5.6,2,'#7b6248');pallet(8.6,5.9,1,'#8a7a5c');pallet(-6.2,5.4,2,'#6a5a48');pallet(6.6,-8.4,1,'#7b6248');
  for(const [x,z,c] of [[5.6,6.9,'#2f5a80'],[6.2,7.2,'#8a3a2a'],[-5.3,-8.6,'#2f5a80'],[9.9,3.6,'#8a3a2a']])k.tube('s'+sector(x,z),.29,.88,x,G+.44,z,lin(c));
  for(const x of [-4,0,4,8])k.tube('shell',.16,.5,x,G+.25,-HZ-3.4,yellow);
  // Dock crew in a loose circle round the fighters, between stacked crates and drums (GOTR-0065).
  const edge=[[.8,2],[2.4,1],[3.9,2],[5.5,1]];
  for(const [a,h] of edge){const x=Math.sin(a)*2.78,z=Math.cos(a)*2.78,key='s'+sector(x,z);for(let i=0;i<h;i++)k.box(key,.62,.46,.62,x,G+.23+i*.46,z,lin(['#8a7052','#7b6248','#6a5a48'][(i+Math.round(a))%3]),a+i*.3);}
  for(const a of [1.6,4.7]){const x=Math.sin(a)*2.9,z=Math.cos(a)*2.9;k.tube('s'+sector(x,z),.29,.88,x,G+.44,z,paints[Math.round(a)%paints.length]);}
  k.crowd({seed:83,round:true,rows:2,inner:3.1,step:.58,spacing:.56,rise:.05,g:G,style,thin:.1,lights:{p:.1,colors:[lin('#ffd08a'),lin('#e8f1ff')]},skip:(x,z)=>edge.some(([a])=>Math.hypot(x-Math.sin(a)*2.78,z-Math.cos(a)*2.78)<.6)||[1.6,4.7].some(a=>Math.hypot(x-Math.sin(a)*2.9,z-Math.cos(a)*2.9)<.45)});
  return {ring:false,referee:false,background:SKY,fog:[30,90],lights:{hemi:[0xffd9a8,.36,0x2a2a30],key:[0xffe0b0,2.7],fill:[0x8fb0ff,.5],rimA:[0xffb060,1.8],rimB:[0xffb060,1.7],a:[0xff9a30,1.9],b:[0x7aa0ff,1.1]}};
 }

 // ---------------------------------------------------------------- regional arena
 function regional(k){
  const G=-.31,HX=13,HZ=10,C=7.4,court=lin('#b88a52'),line=lin('#e9e6dc'),steel=lin('#8a9099'),black=lin('#15171a'),blue=lin('#2b4f86'),red=lin('#a3262a');
  k.ambient={sky:[.07,.074,.082],ground:[.05,.045,.038]};
  const panels=[];for(const x of [-8.5,0,8.5])for(const z of [-5,0,5])panels.push([x,z]);
  for(const [x,z] of panels)k.lights.push({x,y:C-.5,z,c:[1,.99,.96],power:1.2,r:5,aim:[0,-1,0],cone:[-.1,.6]});
  const A=k.atlas,crowdA=peopleCell(A,5),crowdB=peopleCell(A,12);
  const score=A.cell(256,112,(c,w,h)=>{c.fillStyle='#0c0d0f';c.fillRect(0,0,w,h);label(c,'FIGHT NIGHT',w/2,20,19,'#ffb02e',w-20,900);label(c,'RED',44,50,15,'#ff5a4a',60,900);label(c,'BLUE',w-46,50,15,'#5a9aff',60,900);label(c,'0',44,82,40,'#ffb02e',50,900,'monospace');label(c,'0',w-46,82,40,'#ffb02e',50,900,'monospace');label(c,'ROUND',w/2,52,13,'#ffb02e',70,900);label(c,'1',w/2,82,40,'#ffb02e',50,900,'monospace');});
  const board=A.cell(448,84,(c,w,h,L)=>{c.fillStyle='#f1efe8';c.fillRect(0,0,w,h);c.fillStyle='#2b4f86';c.fillRect(0,0,w,12);c.fillStyle='#a3262a';c.fillRect(0,h-12,w,12);c.direction=L.lang==='he'?'rtl':'ltr';label(c,L.title,w/2,h*.44,38,'#1c2a3c',w-36,900);label(c,'GLORY OF THE RING  •  REGIONAL SERIES',w/2,h*.74,14,'#a3262a',w-40,800);});
  const pennant=back=>A.cell(72,176,(c,w,h)=>{c.fillStyle=back;c.beginPath();c.moveTo(0,0);c.lineTo(w,0);c.lineTo(w,h-30);c.lineTo(w/2,h);c.lineTo(0,h-30);c.fill();label(c,'★',w/2,26,26,'#f1c75a',w-8,900);c.save();c.translate(w/2,h*.52);c.rotate(-PI/2);label(c,'CHAMPIONS',0,1,24,'#fff',h-80,900);c.restore();});
  const penRed=pennant('#a3262a'),penBlue=pennant('#2b4f86');
  // Sports floor with court lines; the ring stands on the centre circle.
  k.quad('shell',2*HX,2*HZ,0,G,0,court,{rx:-PI/2,sx:13,sy:10});
  const stripe=(w,d,x,z,c=line)=>k.quad('shell',w,d,x,G+.004,z,c,{rx:-PI/2,sx:Math.max(1,Math.round(w/2)),sy:Math.max(1,Math.round(d/2))});
  for(const s of [-1,1]){stripe(23,.07,0,s*6.6);stripe(.07,13.2,s*11.5,0);stripe(4.9,3.6,s*9.05,0,blue);stripe(.07,3.6,s*6.6,0);for(let i=0;i<14;i++){const a=-1.25+i*2.5/13,b=-1.25+(i+1)*2.5/13,x0=s*(10.3-6.2*Math.cos(a)),z0=6.2*Math.sin(a),x1=s*(10.3-6.2*Math.cos(b)),z1=6.2*Math.sin(b);k.quad('shell',Math.hypot(x1-x0,z1-z0)+.03,.07,(x0+x1)/2,G+.005,(z0+z1)/2,line,{rx:-PI/2,ry:Math.atan2(-(z1-z0),x1-x0)});}}
  stripe(.07,13.2,0,0);for(let i=0;i<20;i++){const a=(i+.5)*PI/10;k.quad('shell',2*3.1*Math.sin(PI/20)+.03,.07,3.1*Math.cos(a),G+.005,3.1*Math.sin(a),line,{rx:-PI/2,ry:PI/2-a});}
  // Painted walls with timber dado, banners and the wall scoreboard.
  for(const [x,z,ry,len] of [[0,-HZ,0,2*HX],[0,HZ,PI,2*HX],[HX,0,-PI/2,2*HZ],[-HX,0,PI/2,2*HZ]]){
   const ox=Math.sin(ry)*.012,oz=Math.cos(ry)*.012,ax=Math.cos(ry),az=-Math.sin(ry);
   k.quad('shell',len,C-G,x,(C+G)/2,z,lin('#a9b0b7'),{ry,sx:13,sy:4});k.quad('shell',len,2.3,x+ox,G+1.15,z+oz,lin('#9a7448'),{ry,sx:13});k.quad('shell',len,.5,x+ox,C-2.0,z+oz,x?red:blue,{ry,sx:13});
   const put=(cell,w,h,along,y,key='shell',g=1.2,out=3)=>k.quad(key,w,h,x+ox*out+ax*along,y,z+oz*out+az*along,[g,g,g],{ry,uv:cell});
   if(!x){put(board,6.0,1.12,-5.5,4.25);for(const [a,cell] of [[-10.9,penRed],[-9.9,penBlue],[10.9,penBlue],[9.9,penRed]])put(cell,.8,1.95,a,4.3);k.box('shell',3.5,1.6,.16,x+ax*5,4.4,z+oz*8,black);put(score,3.3,1.44,5,4.4,'glow',1,15.5);}
   else{// End walls: wall bars and a folded-up hoop.
    for(const a of [-6.5,-4.9,4.9,6.5]){k.box('shell',.06,2.6,1.3,x+ox*6,G+1.45,z+a,lin('#b08a58'));for(let i=0;i<9;i++)k.box('shell',.05,.04,1.24,x+ox*10,G+.3+i*.28,z+a,lin('#d9b98a'));}
    const s=Math.sign(x);k.box('shell',.1,1.1,1.8,s*(HX-1.5),3.6,0,lin('#eef0f2'));k.box('shell',.04,.5,.62,s*(HX-1.57),3.42,0,lin('#d0d4da'));k.box('shell',.32,.04,.36,s*(HX-1.75),3.2,0,lin('#e0641c'));k.box('shell',1.5,.1,.1,s*(HX-.75),3.9,0,steel);k.box('shell',.1,C-4.4,.1,s*(HX-1.2),(C+4.4)/2,0,steel);
    put(board,6.0,1.12,0,5.75);
   }
  }
  // Ceiling with beams and flat light panels.
  k.quad('shell',2*HX,2*HZ,0,C,0,lin('#aeb4ba'),{rx:PI/2,sx:13,sy:10});
  for(const x of [-10.4,-5.2,0,5.2,10.4])k.box('shell',.3,.5,2*HZ,x,C-.25,0,lin('#d9dde2'));
  for(const [x,z] of panels){k.box('shell',2.5,.08,1.3,x,C-.45,z,lin('#c9cdd2'));k.box('glow',2.3,.03,1.1,x,C-.5,z,[1,1,.97]);}
  // Pull-out bleachers on both long sides, about two-thirds full.
  const rnd=random(29);
  for(const s of [-1,1])for(let r=0;r<5;r++){
   const z=s*(6.9+r*.62),y=G+.42+r*.42;
   for(let i=0;i<8;i++){const x=-10.5+i*3,key='s'+sector(x,z);k.box(key,2.96,.42,.62,x,y-.21,z+s*.31,lin(r%2?'#7a5a3a':'#86643f'));k.box(key,2.9,.3,.06,x,y+.2,z+s*.56,blue);if(rnd()<.68)k.quad(key,2.96,.98,x,y+.46,z+s*.26,[1.05,1.05,1.05],{ry:s>0?PI:0,uv:(i+r)%2?crowdA:crowdB});}
  }
  // Folding chairs at ringside, the walk-in carpet and barriers.
  const style={cloth:['#3d5a7a','#7a3b34','#d9d5cb','#4f6b4a','#8a7a4c','#3a3f4c','#b0a48c','#2b4f86','#a3262a'].map(lin),fur:FUR,legs:DARK_LEGS,cheer:.24,seated:true};
  k.crowd({seed:91,rows:2,inner:3.5,step:.72,spacing:.62,rise:.03,g:G+.06,style,thin:.2,skip:(x,z)=>x>0&&Math.abs(z)<1.3});
  k.quad('shell',10.2,1.5,7.6,G+.006,0,red,{rx:-PI/2,sx:8});
  for(const s of [-1,1])for(let i=0;i<4;i++){const x=5.4+i*2.1,key='s'+sector(x,s*1.1);k.box(key,1.9,.05,.05,x,G+1.0,s*1.1,steel);k.box(key,1.9,.05,.05,x,G+.3,s*1.1,steel);for(const dx of [-.9,-.45,0,.45,.9])k.box(key,.04,.9,.04,x+dx,G+.55,s*1.1,steel);}
  k.box('shell',.12,2.5,2.2,HX-.06,G+1.25,0,lin('#3a2a2a'));
  // Tripod floodlights at the corners: a modest production.
  for(const [x,z] of [[4.4,4.4],[-4.4,4.4],[4.4,-4.4],[-4.4,-4.4]]){const key='s'+sector(x,z);k.tube(key,.035,3.5,x,G+1.75,z,black);for(const a of [0,2.1,4.2])k.box(key,.03,.9,.03,x+Math.cos(a)*.3,G+.42,z+Math.sin(a)*.3,black,0,{rz:Math.cos(a)*.6,rx:-Math.sin(a)*.6});k.box(key,.7,.34,.14,x*.99,G+3.55,z*.99,black,Math.atan2(-x,-z));k.box('g'+sector(x,z),.6,.26,.02,x*.972,G+3.55,z*.972,[1,.98,.92],Math.atan2(-x,-z));}
  // Judges' table.
  k.box('s'+sector(-3.3,0),.62,.74,2.2,-3.3,G+.37,0,lin('#e1e1e4'));
  return {background:0x15181d,fog:[30,80],lights:{hemi:[0xeef4ff,.5,0x5a4a38],key:[0xffffff,2.8],fill:[0xa6c9ff,.65],rimA:[0xf4f4f4,2],rimB:[0xf4f4f4,2],a:[0xfff0d8,1.3],b:[0xdde8ff,1.3]}};
 }

 const builders={underground,street,championship,boxing_club:boxingClub,docks,regional};
 function build(id,lang,title){
  const k=new Kit(),mood=builders[id](k),made=k.finish(id),paint=l=>k.atlas.paint({lang:l,title:title&&(title[l]||title.en)||''});paint(lang);
  if(k.ceiling)made.group.userData.cameraCeiling=k.ceiling-.9; // clear of beams, pipes and lamps hung from the slab
  if(k.cameraRadius)made.group.userData.cameraRadius=k.cameraRadius;
  let disposed=false;
  // mood.ring===false (GOTR-0065): the fight is staged on the floor; ringless-venues.js hides the ring hardware and the referee.
  return {id,lang,group:made.group,mood,ring:mood.ring!==false,sectors:made.sectors,stats:{triangles:made.triangles,meshes:made.meshes,texture:[k.atlas.w,k.atlas.h]},
   setLang(next){if(next===this.lang)return;this.lang=next;paint(next);},
   // cx,cz: unit direction from the ring to the camera in arena space.
   tick(cx,cz,time){for(const [i,s] of made.sectors.entries()){s.group.visible=s.x*cx+s.z*cz<.12;if(!s.group.visible)continue;for(const [j,mesh] of s.crowd.entries())mesh.position.y=.014*Math.sin(time*2.3+i*1.7+j*2.4);}},
   dispose(){if(disposed)return;disposed=true;made.group.parent?.remove(made.group);for(const g of made.geometries)g.dispose();for(const m of Object.values(made.materials))m.dispose();k.atlas.texture.dispose();}};
 }
 const api=Object.freeze({ids:Object.freeze(Object.keys(builders)),has:id=>Object.prototype.hasOwnProperty.call(builders,id),build});
 if(typeof module!=='undefined')module.exports=api;else window.ArenaSets=api;
})();
