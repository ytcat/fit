/* Original procedural boxing materials, stitched equipment and canvas details. */
(() => {
 const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
 function surface(kind){
  const c=document.createElement('canvas');c.width=c.height=512;const x=c.getContext('2d');x.fillStyle='#888';x.fillRect(0,0,512,512);
  let state=7197;const rnd=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
  if(kind==='wood'){
   x.fillStyle='#ad8455';x.fillRect(0,0,512,512);
   for(let i=0;i<450;i++){x.strokeStyle=`rgba(57,32,16,${.06+rnd()*.12})`;x.lineWidth=.5+rnd()*1.8;const y=rnd()*512;x.beginPath();x.moveTo(0,y);x.bezierCurveTo(150,y-9-rnd()*12,350,y+12,512,y+3);x.stroke();}
  }else{
   for(let i=0;i<512;i+=4){x.strokeStyle=i%8?'#a2a2a2':'#656565';x.lineWidth=1;x.beginPath();x.moveTo(i,0);x.lineTo(i,512);x.moveTo(0,i);x.lineTo(512,i);x.stroke();}
   for(let i=0;i<5000;i++){const n=95+rnd()*90;x.fillStyle=`rgb(${n},${n},${n})`;x.fillRect(rnd()*512,rnd()*512,1,1);}
  }
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=4;if(kind==='wood')t.encoding=THREE.sRGBEncoding;return t;
 }
 const material=(color,extra={})=>{const m=new THREE.MeshStandardMaterial({color,roughness:.82,...extra});m.color.convertSRGBToLinear();return m;};
 function mesh(parent,g,m,at=V()){const n=new THREE.Mesh(g,m);n.position.copy(at);n.castShadow=n.receiveShadow=true;parent.add(n);return n;}
 function stitches(parent,points,color=0xb5b1a4){
  const positions=[],normals=[];
  for(const point of points){const g=new THREE.BoxGeometry(.006,.008,.002).toNonIndexed();g.translate(point.x,point.y,point.z);positions.push(...g.attributes.position.array);normals.push(...g.attributes.normal.array);g.dispose();}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
  const seam=mesh(parent,g,material(color));seam.name='Fine stitched seams';return seam;
 }
 const api={
  ring(root){
   const fabric=surface('canvas');fabric.repeat.set(18,18);
   const ropes=new Map();
   for(const part of root.children){
    if(part.geometry?.type==='BoxGeometry'&&part.geometry.parameters.width===3.48){part.material.bumpMap=fabric;part.material.bumpScale=.0022;part.material.roughness=.97;part.name='Woven boxing canvas';}
    if(part.geometry?.type==='CylinderGeometry'&&Math.abs(part.geometry.parameters.radiusTop-.012)<1e-6){
     const y=part.position.y,key=y>1.1?0xa5313b:y>.8?0xd1d7de:y>.5?0x315a79:0xd1d7de;
     if(!ropes.has(key))ropes.set(key,material(key,{bumpMap:fabric,bumpScale:.0012}));part.material=ropes.get(key);part.name='Wrapped tensioned ring rope';
    }
   }
   const tape=material(0x9ba8b6,{roughness:.98}),points=[];
   for(const side of [-1,1]){
    mesh(root,new THREE.BoxGeometry(.016,.001,2.96),tape,V(side*1.48,.002,0));mesh(root,new THREE.BoxGeometry(2.96,.001,.016),tape,V(0,.002,side*1.48));
    for(let i=0;i<62;i++){const a=-1.42+i*.046;points.push(V(side*1.46,.003,a),V(a,.003,side*1.46));}
   }stitches(root,points,0x6c7e8a);
   const c=document.createElement('canvas');c.width=1024;c.height=512;const x=c.getContext('2d');x.clearRect(0,0,1024,512);x.textAlign='center';x.fillStyle='rgba(205,220,231,.18)';x.font='900 112px sans-serif';x.fillText('RINGFIGHTER',512,245);x.font='600 30px sans-serif';x.fillText('TRAIN  •  MOVE  •  BOX',512,305);
   const print=new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c),transparent:true,depthWrite:false,opacity:.8});const label=mesh(root,new THREE.PlaneGeometry(1.9,.95),print,V(0,.004,0));label.rotation.x=-Math.PI/2;label.castShadow=false;label.name='Printed canvas mark';
  },
  heavy(root){
   const swing=root.userData.swing,points=[];
   for(let i=0;i<70;i++)points.push(V(.035+(i%2)*.006,-.41-i*.015,.237));
   const seam=stitches(swing,points);seam.rotation.y=Math.PI/2;
  },
  speed(root){
   for(const child of root.children)if(child.geometry?.type==='CylinderGeometry'&&child.geometry.parameters.radiusTop===.38){child.material.map=surface('wood');child.material.color.setHex(0xffffff);child.material.roughness=.68;child.name='Laminated rebound board';}
   const metal=material(0x6b7580,{metalness:.7,roughness:.35});
   for(const x of [-.19,.19])for(const z of [-.19,.19]){const bolt=mesh(root,new THREE.CylinderGeometry(.012,.012,.004,12),metal,V(x,2.300,z));bolt.name='Platform mounting bolt';}
   const thread=material(0xa49886,{roughness:1});
   for(let panel=0;panel<4;panel++){
    const a=panel*Math.PI/2,points=[];for(let i=0;i<=22;i++){const t=.22+(Math.PI-.44)*i/22;points.push(V(Math.cos(a)*.116*Math.sin(t),-.17+.141*Math.cos(t),Math.sin(a)*.116*Math.sin(t)));}
    const seam=mesh(root.userData.swing,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),22,.0011,3,false),thread);seam.name='Speed-bag stitched panel';
   }
  }
 };
 window.GymDetails=api;
})();
