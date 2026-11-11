/* Original 3D set dressing. Shared geometry, no external textures or network calls. */
(() => {
 const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
 const mat=(color,extra={})=>{const m=new THREE.MeshStandardMaterial({color,roughness:.84,...extra});m.color.convertSRGBToLinear();return m;};
 class ClubWorld {
  constructor(engine){
   this.engine=engine;this.mode='';this.gym=new THREE.Group();this.arena=new THREE.Group();
   this.gym.name='Foundry boxing gym';this.arena.name='Championship arena';
   this.materials={wall:mat(0x434748),dark:mat(0x1c2328),steel:mat(0x68757b,{metalness:.65,roughness:.4}),gold:mat(0xcea46a,{metalness:.3}),wood:mat(0x876c50),leather:mat(0x855044),blue:mat(0x315875),floor:mat(0x303c41),white:mat(0xd9d5c9)};
   this.boxGeometry=new THREE.BoxGeometry(1,1,1);this.cylinderGeometry=new THREE.CylinderGeometry(1,1,1,12);this.sphereGeometry=new THREE.SphereGeometry(1,18,12);
   engine.scene.add(this.gym,this.arena);engine.scene.background=new THREE.Color(0x171c22);
   engine.scene.fog=new THREE.Fog(0x171c22,10,27);
   this.buildGym();this.enclose(this.gym,false);this.furnishGym();this.buildArena();this.enclose(this.arena,true);this.batch(this.gym);this.batch(this.arena);this.wallNodes=[];for(const root of [this.gym,this.arena])root.traverse(n=>{if(n.userData.wallZone)this.wallNodes.push(n);});this.update(0,'none');
  }
  box(root,name,size,at,material){const n=new THREE.Mesh(this.boxGeometry,material||this.materials.dark);n.name=name;n.scale.set(...size);n.position.set(...at);n.receiveShadow=true;root.add(n);return n;}
  rod(root,a,b,r,material){const d=b.clone().sub(a),n=new THREE.Mesh(this.cylinderGeometry,material||this.materials.steel);n.position.copy(a).add(b).multiplyScalar(.5);n.scale.set(r,d.length(),r);n.quaternion.setFromUnitVectors(V(0,1,0),d.normalize());root.add(n);return n;}
  label(root,{name='Club signage',title,subtitle='',width=2,height=1,x=0,y=2,z=-3,color='#dfc291',background='#202b31',accent='#ba6b43',poster=false,resolution=1024}){
   const canvas=document.createElement('canvas');canvas.width=resolution;canvas.height=Math.round(resolution*height/width);const c=canvas.getContext('2d'),h=Math.round(1024*height/width);c.scale(resolution/1024,resolution/1024);
   c.fillStyle=background;c.fillRect(0,0,1024,h);c.strokeStyle=color;c.lineWidth=3;c.strokeRect(20,20,984,h-40);
   // Layout from the label's real height so the brand line, title and subtitle never overlap (wide, short wall signs
   // used to draw the 72 px title on top of the brand line). Short signs drop the brand line; a title that is the brand drops it too.
   const pad=20,brandRow=!poster&&h>=240&&!/GLORY OF THE RING/.test(title),brandSize=Math.round(Math.max(14,Math.min(22,h*.08)));
   c.textBaseline='middle';
   if(poster||brandRow){c.fillStyle=accent;c.fillRect(44,pad+22,75,7);c.font=`600 ${brandSize}px sans-serif`;c.textAlign='left';c.fillStyle=color;c.fillText('GLORY OF THE RING  /  BOXING CLUB',44,pad+22+7+brandSize*.9,936);}
   if(poster){
    c.save();c.translate(512,h*.44);c.rotate(-.24);c.fillStyle=accent;
    c.beginPath();(c.roundRect||c.rect).call(c,-198,-124,175,208,55);c.fill();c.beginPath();(c.roundRect||c.rect).call(c,23,-124,175,208,55);c.fill();
    c.fillStyle=color;c.fillRect(-186,65,152,42);c.fillRect(34,65,152,42);c.restore();
   }
   c.textAlign='center';c.fillStyle=color;const lines=title.split('|');
   if(poster){c.textBaseline='alphabetic';c.font='900 110px sans-serif';lines.forEach((line,i)=>c.fillText(line,512,h*.72+i*112,900));c.font='500 26px sans-serif';c.fillText(subtitle,512,h-57,900);}
   else{
    const subSize=subtitle?Math.round(Math.max(14,Math.min(26,h*.15))):0,subY=h-pad-12-subSize/2,top=brandRow?pad+22+7+brandSize*1.9:pad+12,bottom=subtitle?subY-subSize*.85:h-pad-12;
    const size=Math.max(18,Math.min(72,(bottom-top)/lines.length*.9));c.font=`900 ${Math.round(size)}px sans-serif`;
    const step=(bottom-top)/lines.length;lines.forEach((line,i)=>c.fillText(line,512,top+step*(i+.5),900));
    if(subtitle){c.font=`500 ${subSize}px sans-serif`;c.fillText(subtitle,512,subY,900);}
   }
   c.textBaseline='alphabetic';
   const t=new THREE.CanvasTexture(canvas);t.encoding=THREE.sRGBEncoding;t.anisotropy=4;
   const plane=new THREE.Mesh(new THREE.PlaneGeometry(width,height),new THREE.MeshBasicMaterial({map:t,toneMapped:false}));plane.position.set(x,y,z);plane.name=name;root.add(plane);return plane;
  }
  batch(root){
   // Static set dressing uses instancing so hundreds of seats and brick joints
   // cost a few material batches, rather than hundreds of draw calls per frame.
   root.updateMatrixWorld(true);const batches=new Map();
   root.traverse(n=>{if(!n.isMesh||![this.boxGeometry,this.cylinderGeometry,this.sphereGeometry].includes(n.geometry))return;if(/^(Back wall|Wall kick|Mortar|Brick|Structural column|Column base|Foundry gym identity|Technique poster|Training poster|Frosted|Window|Arena back wall|Arena scoreboard|Championship banner)/.test(n.name))n.userData.wallZone='back';const key=(n.userData.wallZone||'')+':'+n.geometry.uuid+':'+n.material.uuid;if(!batches.has(key))batches.set(key,[]);batches.get(key).push(n);});
   for(const nodes of batches.values()){
    if(nodes.length<2)continue;const merged=new THREE.InstancedMesh(nodes[0].geometry,nodes[0].material,nodes.length);merged.name='Instanced club fixtures';merged.userData.wallZone=nodes[0].userData.wallZone;merged.receiveShadow=true;
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
   this.label(r,{name:'Floor training mark',title:'GLORY OF THE RING',subtitle:'THE TRAINING ROOM',width:2.2,height:.7,y:-.018,z:1.7,background:'#303c41',color:'#536268'}).rotation.x=-Math.PI/2;
  }
  furnishGym(){
   const r=this.gym,m=this.materials;
   this.gymWallGroups={};
   const zone=(name,x,z,yaw)=>{const g=new THREE.Group();g.name='Studio '+name+' wall furnishings';g.position.set(x,0,z);g.rotation.y=yaw;r.add(g);this.gymWallGroups[name]=g;return g;};
   const front=zone('front',0,4.98,Math.PI),left=zone('left',-8.88,0,Math.PI/2),right=zone('right',8.88,0,-Math.PI/2);
   const sign=(g,title,subtitle,x,y,width=2.4)=>this.label(g,{name:'Studio wall sign',title,subtitle,x,y,z:.10,width,height:.65,resolution:512,background:'#1c2d32',color:'#dfc291'});
   const bench=(g,x)=>{this.box(g,'Studio oak bench',[2.25,.10,.46],[x,.48,.72],m.wood);for(const dx of [-.9,.9])this.box(g,'Studio bench leg',[.08,.48,.38],[x+dx,.2,.72],m.steel);};
   const rack=(g,x)=>{for(const dx of [-.7,.7])this.box(g,'Storage upright',[.07,1.35,.43],[x+dx,.64,.35],m.steel);for(const y of [.22,.76,1.25])this.box(g,'Storage shelf',[1.55,.055,.46],[x,y,.35],m.dark);};
   // A complete entrance/reception wall faces the original decorated back wall.
   for(const x of [-.60,.60]){
    this.box(front,'Entrance door',[1.12,2.4,.09],[x,1.2,.04],m.blue);
    this.box(front,'Door glass',[.88,1.3,.025],[x,1.6,.10],m.wall);
    this.box(front,'Door lower panel',[.88,.62,.025],[x,.46,.10],m.dark);
    this.box(front,'Door handle',[.035,.30,.05],[x+(x<0?.40:-.40),1.1,.15],m.gold);
   }
   for(const x of [-1.23,0,1.23])this.box(front,'Door frame',[.065,2.5,.14],[x,1.25,.08],m.steel);
   this.box(front,'Door header',[2.55,.08,.14],[0,2.48,.08],m.steel);sign(front,'GLORY OF THE RING','WELCOME TO THE FOUNDRY',0,3.05,3.2);
   bench(front,-3.0);rack(front,3.2);
   for(let i=0;i<4;i++){
    const x=-4.7+i*.47;this.box(front,'Front locker',[.44,1.95,.48],[x,.975,.27],m.blue);this.box(front,'Front locker handle',[.025,.15,.035],[x+.13,1.0,.53],m.gold);
    for(let y=1.65;y<1.87;y+=.065)this.box(front,'Front locker vent',[.28,.012,.012],[x,y,.52],m.dark);
   }
   sign(front,'READY FOR ANOTHER ROUND?','TRAIN / RESET / RETURN',-3.3,2.7,3.3);
   for(let i=0;i<3;i++){const n=new THREE.Mesh(this.cylinderGeometry,m.leather);n.scale.set(.11,.65,.11);n.rotation.z=Math.PI/2;n.position.set(3.2+(i-1)*.36,1.39,.36);n.name='Rolled training mat';front.add(n);}
   // Side wall stations stay outside the swept fighter/equipment envelope.
   sign(left,'POWER & PRECISION','BAG STATIONS',0,3.3,3.4);
   for(const x of [-2.6,2.6]){
    this.box(left,'Bag station bracket',[1,.08,.70],[x,3.8,.32],m.steel);this.rod(left,V(x,3.8,.7),V(x,2.75,.7),.012,m.steel);
    const bag=new THREE.Mesh(this.cylinderGeometry,x<0?m.leather:m.blue);bag.name='Side wall hanging bag';bag.position.set(x,2.0,.7);bag.scale.set(.27,1.40,.27);bag.castShadow=true;left.add(bag);
    for(const y of [1.38,2.62])this.box(left,'Side bag band',[.56,.07,.56],[x,y,.7],m.dark);
   }
   rack(left,0);bench(left,0);this.label(left,{name:'Studio rules poster',title:'HANDS UP.|MOVE YOUR FEET.',subtitle:'CONTROL BEFORE POWER',width:1.65,height:1.5,x:0,y:2.05,z:.08,resolution:512,poster:true});
   sign(right,'MOVE & RECOVER','FOOTWORK / MOBILITY / CONDITIONING',0,3.35,4.2);
   for(const x of [-2.7,-1.4])this.box(right,'Wall bar upright',[.09,2.5,.12],[x,1.3,.18],m.wood);
   for(let y=.35;y<2.55;y+=.28)this.rod(right,V(-2.7,y,.20),V(-1.4,y,.20),.026,m.wood);
   bench(right,1.5);rack(right,3.2);
   const sphere=this.sphereGeometry;
   for(const [i,x] of [-.65,0,.65,1.3].entries()){
    const ball=new THREE.Mesh(sphere,i%2?m.blue:m.leather);ball.name='Medicine ball';ball.scale.setScalar(.18);ball.position.set(x,.19,.55);right.add(ball);
   }
   for(let i=0;i<4;i++){const roller=new THREE.Mesh(this.cylinderGeometry,m.white);roller.name='Recovery foam roller';roller.scale.set(.095,.5,.095);roller.position.set(3+(i%2)*.25,.50+Math.floor(i/2)*.53,.36);right.add(roller);}
   this.label(right,{name:'Studio mobility poster',title:'STAY LIGHT.|STAY READY.',subtitle:'BREATHE / MOVE / RECOVER',width:1.65,height:1.55,x:.35,y:2.1,z:.08,resolution:512,poster:true});
   for(const [side,g] of Object.entries(this.gymWallGroups))g.traverse(n=>{n.userData.wallZone=side;});
   // Roof panels and the existing suspended fixtures give the wide view depth.
   this.box(r,'Studio ceiling',[18,.05,10.2],[0,5.35,0],m.dark);
   for(const x of [-8.5,-4.25,0,4.25,8.5])this.box(r,'Roof cross member',[.12,.12,10.2],[x,5.25,0],m.steel);
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
   this.label(r,{name:'Arena scoreboard',title:'FIGHT NIGHT',subtitle:'LION   /   RABBIT     •     GLORY OF THE RING CHAMPIONSHIP',width:6,height:1.7,y:4.1,z:-7.2,background:'#111d2b',color:'#e7d1a4',accent:'#a73e46'});
   for(const x of [-6.4,6.4])this.label(r,{name:'Championship banner',title:'EARN|YOUR|CORNER',subtitle:'GLORY OF THE RING',width:1.5,height:3.5,x,y:3.2,z:-7.1,background:x<0?'#512c31':'#24455d',color:'#e7d9bb'});
   const lights=[new THREE.MeshBasicMaterial({color:0xe5776f}),new THREE.MeshBasicMaterial({color:0x82bde3}),new THREE.MeshBasicMaterial({color:0xffe8c1})];
   for(const z of [-3.6,3.6]){
    for(const y of [4.35,4.62])this.rod(r,V(-5.5,y,z),V(5.5,y,z),.035,m.steel);
    for(let x=-5.5;x<5.5;x+=.55)this.rod(r,V(x,4.35,z),V(x+.55,4.62,z),.018,m.steel);
    for(let x=-4.8;x<=4.8;x+=1.2){this.box(r,'Arena lighting fixture',[.26,.15,.25],[x,4.26,z],m.dark);this.box(r,'Arena light emitter',[.21,.03,.2],[x,4.17,z],lights[x<0?0:1]);}
   }
   const red=new THREE.PointLight(0xd55d55,1.3,12);red.position.set(-4,3.5,-3);r.add(red);
   const blue=new THREE.PointLight(0x668edb,1.5,12);blue.position.set(4,3.5,-3);r.add(blue);
   this.label(r,{name:'Ringside sponsor board',title:'GLORY OF THE RING  /  FIGHT NIGHT',subtitle:'',width:5.5,height:.65,y:.3,z:-3.5,background:'#151f2a',color:'#9eafbf'});
  }
  enclose(root,fight){
   const m=this.materials,span=fight?20:18,depth=fight?20:10.2,height=fight?8:6;
   // Inward-facing walls: outside faces are culled for a usable dollhouse view.
   const wallMaterial=(fight?m.dark:m.wall).clone();wallMaterial.side=THREE.FrontSide;
   for(const [x,z,yaw,width] of [[0,depth/2,Math.PI,span],[-span/2,0,Math.PI/2,depth],[span/2,0,-Math.PI/2,depth]]){
    const wall=new THREE.Mesh(new THREE.PlaneGeometry(width,height),wallMaterial);wall.name='Room interior wall';wall.position.set(x,height/2-.05,z);wall.rotation.y=yaw;wall.userData.wallZone=x<0?'left':x>0?'right':'front';root.add(wall);
    for(const y of [.35,2.9,4.8]){
     const beam=this.box(root,'Perimeter wall rail',x?[.05,.045,depth]:[span,.045,.05],[x,y,z],m.steel);beam.castShadow=false;beam.userData.wallZone=wall.userData.wallZone;
    }
   }
   if(fight)for(const side of [-1,1])for(let row=0;row<3;row++){
    const x=side*(4.1+row*.72),y=row*.38;
    this.box(root,'Side grandstand tier',[.70,.45,13],[x,y-.1,0],m.dark);
    for(let j=-8;j<=8;j++)this.box(root,'Side grandstand seat',[.14,.34,.48],[x,y+.39,j*.68],m.blue);
   }
  }
  update(time,mode){
   const yaw=mode==='none'?(this.engine.activeModel?.rotation.y||0):(this.engine.arena?.group.rotation.y||0);
   this.gym.rotation.y=yaw;this.arena.rotation.y=yaw;
   const camera=this.engine.camera?.position||V(0,0,6);
   if(this.viewYaw!==yaw||this.viewX!==camera.x||this.viewZ!==camera.z){
    this.viewYaw=yaw;this.viewX=camera.x;this.viewZ=camera.z;
    const view=camera.clone().applyAxisAngle(V(0,1,0),-yaw),mask=(view.z>=0?1:0)|(view.x>=0?2:0);
    if(this.wallMask!==mask){this.wallMask=mask;for(const n of this.wallNodes){const zone=n.userData.wallZone;n.visible=zone==='back'?view.z>=0:zone==='front'?view.z<=0:zone==='left'?view.x>=0:view.x<=0;}}
   }
   if(this.mode===mode)return;this.mode=mode;const fight=mode==='fight';this.gym.visible=!fight;this.arena.visible=fight;
   this.engine.scene.background.setHex(fight?0x111925:0x252b2d);
   this.engine.scene.fog.color.copy(this.engine.scene.background);this.engine.lastRenderStamp=null;
  }
 }
 window.ClubWorld=ClubWorld;
})();
