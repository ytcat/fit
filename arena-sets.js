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
   for(let r=0;r<o.rows;r++){
    const half=o.inner+r*o.step,n=Math.max(1,Math.round(2*half/o.spacing));
    for(let side=0;side<4;side++)for(let i=0;i<n;i++){
     const t=-half+(i+.5)*2*half/n+(rnd()-.5)*o.spacing*.35,d=half+(rnd()-.5)*o.step*.4,x=side===0?t:side===1?d:side===2?-t:-d,z=side===0?-d:side===1?t:side===2?d:-t,thin=rnd(),turn=(rnd()-.5)*.5;
     if(o.skip&&o.skip(x,z)||thin<(o.thin||0))continue;
     this.person(((i+r)&1?'a':'b')+sector(x,z),x,z,o.g+r*(o.rise||0),Math.atan2(-x,-z)+turn,rnd,o.style);
    }
   }
  }
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

 // ---------------------------------------------------------------- underground
 function underground(k){
  const G=-.015,H=8.5,C=3.25,concrete=lin('#6f6d69'),wall=lin('#5d5b57'),soot=lin('#33322f'),rust=lin('#7a4a36'),steel=lin('#6d7378'),yellow=lin('#c9a02c'),black=lin('#17181a');
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
  // Painted square, stains and a drain on the floor.
  for(const s of [-1,1]){k.quad('shell',4.9,.09,0,G+.004,s*2.4,yellow,{rx:-PI/2,sx:5});k.quad('shell',.09,4.9,s*2.4,G+.004,0,yellow,{rx:-PI/2,sy:5});}
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
  k.crowd({seed:11,rows:3,inner:2.62,step:.56,spacing:.5,rise:.05,g:G,style});
  k.crowd({seed:23,rows:1,inner:5.5,step:.5,spacing:.74,g:G,style,thin:.25,skip:(x,z)=>Math.abs(Math.abs(x)-fence)<.6&&Math.abs(Math.abs(z)-fence)<.6});
  return {background:0x060607,fog:[9,25],lights:{hemi:[0xfff1d6,.30,0x2a2622],key:[0xfff3d9,3.0],fill:[0xb9c4d6,.32],rimA:[0xffd9a6,1.5],rimB:[0xffd9a6,1.5],a:[0xffb060,1.5],b:[0xff9a4a,1.2]}};
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
  // Onlookers: close around the ropes, with a few on the parked cars and pavements.
  const style={cloth:['#3d5a7a','#7a3b34','#4f6b4a','#8a7a4c','#3a3f4c','#6b4a6e','#9a5a2c','#2f3f4a','#b0a48c','#5a2f3a','#44556b'].map(lin),fur:FUR,legs:DARK_LEGS.concat([lin('#3c4a66')]),cheer:.36};
  k.crowd({seed:31,rows:3,inner:2.62,step:.58,spacing:.52,rise:.045,g:G,style});
  const rnd=random(77);
  for(const [x,z,y] of [[-1.9,5.2,1.42],[-1.1,5.3,1.42],[2.4,-5.2,1.42],[3.1,-5.3,1.42],[-2.2,-5.3,1.42],[3.3,5.3,1.45],[4.2,5.2,1.45]])k.person('s'+sector(x,z),x,z,G+y,Math.atan2(-x,-z),rnd,style);
  for(let i=0;i<34;i++){const side=i%2?1:-1,x=-13+rnd()*26,z=side*(KERB+.7+rnd()*1.9);if(Math.abs(x)<4.4&&rnd()<.2)continue;k.person((i&2?'a':'b')+sector(x,z),x,z,G+.16,Math.atan2(-x,-z)+(rnd()-.5),rnd,style);}
  return {background:SKY,fog:[17,52],lights:{hemi:[0x9fb4ff,.40,0x3a2c22],key:[0xffd6a8,2.5],fill:[0x7f9cff,.72],rimA:[0xffb070,1.9],rimB:[0xffb070,1.7],a:[0xff9a3c,1.8],b:[0x6f8cff,1.3]}};
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
  const people=seed=>A.cell(256,96,(c,w,h)=>{const rnd=random(seed),cols=['#7a8597','#9a6a5a','#5a718f','#8f8a6a','#6a5a7f','#a79a88','#58697a','#8a5560'],furs=['#c9a878','#a9a9ae','#e0d6c2','#8a6e58','#d08a58'];for(let layer=0;layer<2;layer++)for(let i=0;i<8;i++){const x=16+i*32+(layer?16:0)+(rnd()-.5)*7,y=layer?46:27,body=()=>{c.beginPath();c.ellipse(x,y+40,15,24,0,0,PI*2);c.fill();c.fillRect(x-15,y+40,30,h);},head=()=>{c.beginPath();c.arc(x,y+8,8.5,0,PI*2);c.fill();};c.fillStyle=cols[Math.floor(rnd()*cols.length)];body();const arm=rnd()<.22;if(arm)c.fillRect(x+11,y-12,6,34);c.fillStyle=furs[Math.floor(rnd()*furs.length)];head();const e=rnd();if(e<.4){c.fillRect(x-8,y-5,5,7);c.fillRect(x+3,y-5,5,7);}else if(e<.6){c.fillRect(x-6,y-15,4,15);c.fillRect(x+2,y-15,4,15);}if(arm)c.fillRect(x+10,y-17,8,8);if(!layer){c.fillStyle='rgba(0,0,0,.4)';body();head();}}});
  const crowdA=people(3),crowdB=people(8);
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

 const builders={underground,street,championship};
 function build(id,lang,title){
  const k=new Kit(),mood=builders[id](k),made=k.finish(id),paint=l=>k.atlas.paint({lang:l,title:title&&(title[l]||title.en)||''});paint(lang);
  let disposed=false;
  return {id,lang,group:made.group,mood,sectors:made.sectors,stats:{triangles:made.triangles,meshes:made.meshes,texture:[k.atlas.w,k.atlas.h]},
   setLang(next){if(next===this.lang)return;this.lang=next;paint(next);},
   // cx,cz: unit direction from the ring to the camera in arena space.
   tick(cx,cz,time){for(const [i,s] of made.sectors.entries()){s.group.visible=s.x*cx+s.z*cz<.12;if(!s.group.visible)continue;for(const [j,mesh] of s.crowd.entries())mesh.position.y=.014*Math.sin(time*2.3+i*1.7+j*2.4);}},
   dispose(){if(disposed)return;disposed=true;made.group.parent?.remove(made.group);for(const g of made.geometries)g.dispose();for(const m of Object.values(made.materials))m.dispose();k.atlas.texture.dispose();}};
 }
 const api=Object.freeze({ids:Object.freeze(Object.keys(builders)),has:id=>Object.prototype.hasOwnProperty.call(builders,id),build});
 if(typeof module!=='undefined')module.exports=api;else window.ArenaSets=api;
})();
