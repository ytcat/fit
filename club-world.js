/* Original 3D set dressing. Shared geometry, no external textures or network calls. */
(() => {
 const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
 const mat=(color,extra={})=>{const m=new THREE.MeshStandardMaterial({color,roughness:.84,...extra});m.color.convertSRGBToLinear();return m;};
 class ClubWorld {
  constructor(engine){
   this.engine=engine;this.mode='';this.gym=new THREE.Group();this.arena=new THREE.Group();
   this.gym.name='Foundry boxing gym';this.arena.name='Championship arena';
   this.materials={wall:mat(0x434748),dark:mat(0x1c2328),steel:mat(0x68757b,{metalness:.65,roughness:.4}),gold:mat(0xcea46a,{metalness:.3}),wood:mat(0x876c50),leather:mat(0x855044),blue:mat(0x315875),floor:mat(0x303c41),white:mat(0xd9d5c9)};
   this.boxGeometry=new THREE.BoxGeometry(1,1,1);this.cylinderGeometry=new THREE.CylinderGeometry(1,1,1,12);
   engine.scene.add(this.gym,this.arena);engine.scene.background=new THREE.Color(0x171c22);
   engine.scene.fog=new THREE.Fog(0x171c22,10,27);
   this.buildGym();this.buildArena();this.batch(this.gym);this.batch(this.arena);this.update(0,'none');
  }
  box(root,name,size,at,material){const n=new THREE.Mesh(this.boxGeometry,material||this.materials.dark);n.name=name;n.scale.set(...size);n.position.set(...at);n.receiveShadow=true;root.add(n);return n;}
  rod(root,a,b,r,material){const d=b.clone().sub(a),n=new THREE.Mesh(this.cylinderGeometry,material||this.materials.steel);n.position.copy(a).add(b).multiplyScalar(.5);n.scale.set(r,d.length(),r);n.quaternion.setFromUnitVectors(V(0,1,0),d.normalize());root.add(n);return n;}
  label(root,{name='Club signage',title,subtitle='',width=2,height=1,x=0,y=2,z=-3,color='#dfc291',background='#202b31',accent='#ba6b43',poster=false}){
   const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=Math.round(1024*height/width);const c=canvas.getContext('2d'),h=canvas.height;
   c.fillStyle=background;c.fillRect(0,0,1024,h);c.strokeStyle=color;c.lineWidth=3;c.strokeRect(20,20,984,h-40);
   c.fillStyle=accent;c.fillRect(44,42,75,7);c.font='600 22px sans-serif';c.textAlign='left';c.fillStyle=color;c.fillText('SHADOWBOX  /  BOXING CLUB',44,80);
   if(poster){
    c.save();c.translate(512,h*.44);c.rotate(-.24);c.fillStyle=accent;
    c.beginPath();(c.roundRect||c.rect).call(c,-198,-124,175,208,55);c.fill();c.beginPath();(c.roundRect||c.rect).call(c,23,-124,175,208,55);c.fill();
    c.fillStyle=color;c.fillRect(-186,65,152,42);c.fillRect(34,65,152,42);c.restore();
   }
   c.textAlign='center';const lines=title.split('|');const top=poster?h*.72:h*.5;
   c.font=`900 ${poster?110:72}px sans-serif`;lines.forEach((line,i)=>c.fillText(line,512,top+i*(poster?112:80),900));
   c.font='500 26px sans-serif';c.fillText(subtitle,512,h-57,900);
   const t=new THREE.CanvasTexture(canvas);t.encoding=THREE.sRGBEncoding;t.anisotropy=4;
   const plane=new THREE.Mesh(new THREE.PlaneGeometry(width,height),new THREE.MeshBasicMaterial({map:t,toneMapped:false}));plane.position.set(x,y,z);plane.name=name;root.add(plane);return plane;
  }
  batch(root){
   // Static set dressing uses instancing so hundreds of seats and brick joints
   // cost a few material batches, rather than hundreds of draw calls per frame.
   root.updateMatrixWorld(true);const batches=new Map();
   root.traverse(n=>{if(!n.isMesh||![this.boxGeometry,this.cylinderGeometry].includes(n.geometry))return;const key=n.geometry.uuid+':'+n.material.uuid;if(!batches.has(key))batches.set(key,[]);batches.get(key).push(n);});
   for(const nodes of batches.values()){
    if(nodes.length<2)continue;const merged=new THREE.InstancedMesh(nodes[0].geometry,nodes[0].material,nodes.length);merged.name='Instanced club fixtures';merged.receiveShadow=true;
    nodes.forEach((node,index)=>{merged.setMatrixAt(index,node.matrixWorld);node.parent.remove(node);});merged.instanceMatrix.needsUpdate=true;root.add(merged);
   }
  }
  buildGym(){
   const r=this.gym,m=this.materials;
   this.box(r,'Continuous rubber training floor',[26,.05,26],[0,-.05,0],m.floor);
   // Quiet seams give scale without competing with the instructor's feet.
   for(let i=-8;i<=8;i++){this.box(r,'Rubber tile seam',[.012,.002,20],[i,-.022,0],m.dark);this.box(r,'Rubber tile seam',[20,.002,.012],[0,-.022,i],m.dark);}
   this.box(r,'Back wall',[22,6,.18],[0,2.95,-5.1],m.wall);
   this.box(r,'Wall kick plate',[22,.8,.03],[0,.36,-4.99],m.dark);
   // Brick courses, exposed columns and timber acoustic strips.
   for(let y=.8;y<5.6;y+=.34)this.box(r,'Mortar course',[22,.014,.014],[0,y,-4.995],m.dark);
   for(let y=1;y<5.5;y+=.68)for(let x=-10;x<11;x+=1.2)this.box(r,'Brick joint',[.012,.34,.016],[x+(Math.round(y*10)%2)*.6,y,-4.99],m.dark);
   for(const x of [-7,-3.7,3.7,7]){this.box(r,'Structural column',[.18,6,.26],[x,2.95,-4.8],m.steel);this.box(r,'Column base',[.32,.18,.38],[x,.07,-4.8],m.dark);}
   this.label(r,{name:'Foundry gym identity',title:'THE FOUNDRY',subtitle:'GOOD WORK. EVERY ROUND.',width:4.7,height:1.05,y:3.7,z:-4.97});
   this.label(r,{name:'Technique poster',title:'HANDS UP.|CHIN DOWN.',subtitle:'FORM FIRST  /  POWER FOLLOWS',width:1.35,height:2.02,x:-2.8,y:2.04,z:-4.965,background:'#d0b27b',color:'#242e32',accent:'#8c4733',poster:true});
   this.label(r,{name:'Training poster',title:'ONE MORE|ROUND.',subtitle:'SHOW UP. PUT IN THE WORK.',width:1.35,height:2.02,x:2.8,y:2.04,z:-4.965,background:'#29424c',color:'#e0c89c',accent:'#ae6d48',poster:true});
   // High windows and ceiling fixtures read in wide and portrait views.
   for(const x of [-6,6]){
    const glass=mat(0x80a7b8,{emissive:0x527b8c,emissiveIntensity:.22,roughness:.25});
    this.box(r,'Frosted industrial window',[2.3,2.5,.04],[x,3.15,-4.98],glass);
    for(const dx of [-1.15,0,1.15])this.box(r,'Window mullion',[.06,2.6,.08],[x+dx,3.15,-4.92],m.dark);
    for(const y of [1.9,3.15,4.4])this.box(r,'Window crossbar',[2.35,.06,.08],[x,y,-4.92],m.dark);
   }
   const lamp=new THREE.MeshBasicMaterial({color:0xffe5b6});
   for(const z of [-4,-1,3]){
    this.box(r,'Ceiling beam',[18,.16,.12],[0,4.9,z],m.steel);
    for(const x of [-2.8,2.8]){this.rod(r,V(x,4.9,z),V(x,4.5,z),.013);this.box(r,'Pendant housing',[1.8,.1,.20],[x,4.48,z],m.dark);this.box(r,'Warm ceiling diffuser',[1.7,.02,.16],[x,4.42,z],lamp);}
   }
   // Equipment is placed behind the full swept practice envelope.
   for(const x of [-4.45,4.45]){
    const g=new THREE.Group();g.position.set(x,0,-3.8);r.add(g);
    this.rod(g,V(0,4.75,0),V(0,2.75,0),.012,m.steel);
    const bag=new THREE.Mesh(new THREE.CylinderGeometry(.27,.27,1.45,24),x<0?m.leather:m.blue);bag.position.y=1.9;bag.castShadow=true;bag.name='Background hanging leather bag';g.add(bag);
    for(const y of [1.32,2.48])this.box(g,'Bag reinforcement band',[.55,.07,.55],[0,y,0],m.dark);
    this.label(g,{title:'SB',subtitle:'',width:.32,height:.24,y:2.05,z:.274,background:x<0?'#855044':'#315875',color:'#e7dcc8'});
   }
   this.box(r,'Oak training bench',[2.0,.10,.42],[-.05,.48,-3.7],m.wood);
   for(const x of [-.8,.7]){this.box(r,'Bench steel leg',[.08,.5,.34],[x,.2,-3.7],m.steel);}
   this.box(r,'Folded towel',[.42,.05,.31],[.45,.56,-3.7],m.white);
   const bottle=new THREE.Mesh(new THREE.CylinderGeometry(.055,.055,.24,12),m.blue);bottle.position.set(-.55,.65,-3.7);bottle.name='Water bottle';r.add(bottle);
   // Low free-weight rack with actual dumbbell silhouettes.
   for(const x of [-1.5,1.5])this.box(r,'Weight rack support',[.06,.72,.45],[x,.34,-4.55],m.steel);
   this.box(r,'Dumbbell shelf',[3.25,.06,.46],[0,.62,-4.55],m.dark);
   for(let x=-1.25;x<=1.3;x+=.5){this.rod(r,V(x-.16,.77,-4.55),V(x+.16,.77,-4.55),.026,m.steel);for(const dx of [-.14,.14]){const n=new THREE.Mesh(new THREE.CylinderGeometry(.11,.11,.10,8),m.dark);n.rotation.z=Math.PI/2;n.position.set(x+dx,.77,-4.55);n.name='Rubber hex dumbbell';r.add(n);}}
   for(let i=0;i<4;i++){const x=7.3+i*.46;this.box(r,'Vented steel locker',[.43,1.85,.50],[x,.925,-4.6],m.blue);this.box(r,'Locker handle',[.025,.16,.04],[x+.12,1.06,-4.32],m.gold);for(let y=1.55;y<1.8;y+=.065)this.box(r,'Locker vent',[.25,.012,.01],[x,y,-4.34],m.dark);}
   this.label(r,{name:'Floor training mark',title:'SHADOWBOX',subtitle:'THE TRAINING ROOM',width:2.2,height:.7,y:-.018,z:1.7,background:'#303c41',color:'#536268'}).rotation.x=-Math.PI/2;
  }
  buildArena(){
   const r=this.arena,m=this.materials;
   this.box(r,'Arena floor',[40,.1,40],[0,-.36,0],m.dark);
   this.box(r,'Arena back wall',[28,10,.2],[0,4,-10],mat(0x131e2a));
   // Tiered grandstands and colored rows, outside the live ring and referee.
   const seats=[mat(0x26394d),mat(0x394955),mat(0x494343)],stands=mat(0x202a36);
   for(const side of [-1,1])for(let row=0;row<4;row++){
    const z=side*(4+row*.72),y=row*.38;
    this.box(r,'Grandstand tier',[17,.45,.70],[0,y-.1,z],stands);
    for(let j=-11;j<=11;j++){this.box(r,'Grandstand seat',[.48,.34,.14],[j*.68,y+.39,z],seats[(j+row+24)%3]);this.box(r,'Seat cushion',[.48,.08,.43],[j*.68,y+.2,z-side*.18],seats[(j+row+24)%3]);}
   }
   this.label(r,{name:'Arena scoreboard',title:'FIGHT NIGHT',subtitle:'LION   /   RABBIT     •     SHADOWBOX CHAMPIONSHIP',width:6,height:1.7,y:4.1,z:-7.2,background:'#111d2b',color:'#e7d1a4',accent:'#a73e46'});
   for(const x of [-6.4,6.4])this.label(r,{name:'Championship banner',title:'EARN|YOUR|CORNER',subtitle:'SHADOWBOX',width:1.5,height:3.5,x,y:3.2,z:-7.1,background:x<0?'#512c31':'#24455d',color:'#e7d9bb'});
   const lights=[new THREE.MeshBasicMaterial({color:0xe5776f}),new THREE.MeshBasicMaterial({color:0x82bde3}),new THREE.MeshBasicMaterial({color:0xffe8c1})];
   for(const z of [-3.6,3.6]){
    for(const y of [4.35,4.62])this.rod(r,V(-5.5,y,z),V(5.5,y,z),.035,m.steel);
    for(let x=-5.5;x<5.5;x+=.55)this.rod(r,V(x,4.35,z),V(x+.55,4.62,z),.018,m.steel);
    for(let x=-4.8;x<=4.8;x+=1.2){this.box(r,'Arena lighting fixture',[.26,.15,.25],[x,4.26,z],m.dark);this.box(r,'Arena light emitter',[.21,.03,.2],[x,4.17,z],lights[x<0?0:1]);}
   }
   const red=new THREE.PointLight(0xd55d55,1.3,12);red.position.set(-4,3.5,-3);r.add(red);
   const blue=new THREE.PointLight(0x668edb,1.5,12);blue.position.set(4,3.5,-3);r.add(blue);
   this.label(r,{name:'Ringside sponsor board',title:'SHADOWBOX  /  FIGHT NIGHT',subtitle:'',width:5.5,height:.65,y:.3,z:-3.5,background:'#151f2a',color:'#9eafbf'});
  }
  update(time,mode){
   if(this.mode===mode)return;this.mode=mode;const fight=mode==='fight';this.gym.visible=!fight;this.arena.visible=fight;
   this.engine.scene.background.setHex(fight?0x111925:0x252b2d);
   this.engine.scene.fog.color.copy(this.engine.scene.background);this.engine.lastRenderStamp=null;
  }
 }
 window.ClubWorld=ClubWorld;
})();
