/* Old Town's one named street shop: 3D window at one confirmed map façade.
 * The paint and collider are never removed. At distance or on a failed GLB, there is no overlay.
 */
(() => {
  'use strict';
  const URL='./assets/street/city-review/oldtown-bookshop-near.glb';
  const ANCHOR={x:145.821,z:-99.516,nx:.060,nz:-.998};
  const ENTER=12, EXIT=15, WORDS={en:'THE READING NOOK',he:'פינת הקריאה',ru:'КНИЖНЫЙ УГОЛОК'};
  let model=null, pending=null, unavailable=false;
  function whenNear() {
    if(!pending&&!model&&!unavailable&&window.THREE?.GLTFLoader){
      pending=new Promise(resolve=>{
        try { new THREE.GLTFLoader().load(URL,glb=>resolve(glb?.scene||null),undefined,()=>resolve(null)); }
        catch(_) { resolve(null); }
      }).then(g=>{ model=g;unavailable=!g;pending=null; });
    }
  }
  function site(map) {
    const mesh=map?.meshes?.['facade shop'], a=mesh?.geometry.attributes.position, ix=mesh?.geometry.index;
    if(!a)return null;
    map.group.updateMatrixWorld(true);
    const at=i=>new THREE.Vector3().fromBufferAttribute(a,ix?ix.getX(i):i).applyMatrix4(mesh.matrixWorld);
    for(let i=0,n=ix?ix.count:a.count;i+5<n;i+=6){
      const m=at(i), u=at(i+1).sub(m), v=at(i+2).sub(m), p=u.clone().cross(v).normalize();
      const c=new THREE.Vector3();for(let j=i;j<i+6;j++) c.add(at(j));c.multiplyScalar(1/6);
      if(Math.hypot(c.x-ANCHOR.x,c.z-ANCHOR.z)>.10||p.x*ANCHOR.nx+p.z*ANCHOR.nz<.998||u.length()<7.9)continue;
      const y=Math.min(...Array.from({length:6},(_,j)=>at(i+j).y));
      return {x:c.x,z:c.z,y,ry:Math.atan2(p.x,p.z),width:u.length()};
    }
    return null;
  }
  function mount(map,scene,lang='en') {
    const s=site(map);
    if(!s)return {update(){},dispose(){},visible:()=>false};
    const set=new THREE.Group(), disposable=[], p=()=>set.visible;
    scene.add(set);set.name='Old Town / The Reading Nook (near detail only)';
    set.position.set(s.x,s.y,s.z);set.rotation.y=s.ry;set.visible=false;
    let created=false, disposed=false;
    const own=x=>(disposable.push(x),x);
    function create(){
      // Activated only after the supported asset has loaded. Backing hides the painted window, but
      // it is behind the shallow 3D bay, not a false glass plane in front of the books.
      const groups={};
      const add=(x,y,z,w,h,d,hex)=>{
        const k=hex.toString(16);if(!groups[k])groups[k]=[];groups[k].push([x,y,z,w,h,d]);
      };
      const W=s.width-.024, H=3.87, dark=0x294440, teal=0x406764, paper=0x968474, bar=0x54746a;
      add(0,H/2,.012,W,H,.020,dark);
      add(0,.17,.105,W,.32,.174,paper);
      add(0,3.47,.11,W,.67,.108,teal);
      add(0,3.78,.16,W,.061,.135,bar);
      add(0,3.14,.12,W,.042,.095,bar);
      add(-.53,1.73,.115,4.40,2.68,.165,paper);
      for(const x of [-W*.5+.145,-2.93,1.93,W*.5-.145]){
        add(x,1.79,.124,.25,2.95,.174,teal);add(x,1.79,.222,.05,2.91,.018,bar);
      }
      // A real closed door panel (decorative only), not a fake opening that invites collision.
      add(2.88,1.58,.128,1.54,2.47,.11,teal);
      add(2.88,1.75,.195,1.31,1.77,.026,0x344d4d);
      add(2.88,1.76,.211,.045,1.78,.022,bar);
      add(2.88,.54,.192,1.42,.42,.029,dark);
      add(2.35,1.41,.247,.039,.22,.075,0xb7a075);
      add(-3.39,1.66,.152,.65,1.20,.065,teal);
      add(-3.39,1.66,.188,.52,1.03,.012,0x5f5c52);
      const pos=[], colors=[];
      for(const [key,parts] of Object.entries(groups)){
        const c=new THREE.Color(parseInt(key,16)).convertSRGBToLinear();
        for(const [x,y,z,w,h,d] of parts){
          const g=new THREE.BoxGeometry(w,h,d), a=g.attributes.position, n=g.index;
          for(let i=0;i<n.count;i++){const j=n.getX(i);pos.push(x+a.getX(j),y+a.getY(j),z+a.getZ(j));colors.push(c.r,c.g,c.b);}
          g.dispose();
        }
      }
      const geo=own(new THREE.BufferGeometry());
      geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.computeVertexNormals();
      const mat=own(new THREE.MeshStandardMaterial({vertexColors:true,roughness:.66,emissive:0x293937,emissiveIntensity:.24}));
      const frame=new THREE.Mesh(geo,mat);frame.name='Bookshop trim, solid backing and closed door';set.add(frame);
      const cvs=document.createElement('canvas');cvs.width=768;cvs.height=96;const ctx=cvs.getContext('2d');
      ctx.fillStyle='#355451';ctx.fillRect(0,0,768,96);ctx.strokeStyle='#c0a581';ctx.lineWidth=3;ctx.strokeRect(9,8,750,80);
      ctx.fillStyle='#ecd6aa';ctx.textAlign='center';ctx.textBaseline='middle';ctx.direction=lang==='he'?'rtl':'ltr';ctx.font='bold 42px system-ui, sans-serif';
      ctx.fillText(WORDS[lang]||WORDS.en,384,50,710);
      const tex=own(new THREE.CanvasTexture(cvs));tex.encoding=THREE.sRGBEncoding;tex.minFilter=THREE.LinearFilter;tex.generateMipmaps=false;
      const sign=new THREE.Mesh(own(new THREE.PlaneGeometry(5.1,.34)),own(new THREE.MeshBasicMaterial({map:tex})));
      sign.position.set(0,3.17,.235);sign.name='Old Town bookshop sign';set.add(sign);
      const windowModel=model.clone(true);windowModel.name='The Reading Nook · oak display';
      // GLB extends to local -0.183 m; align its back just in front of the backing.
      windowModel.position.set(-.53,.150,.405);windowModel.scale.set(1.90,1.24,.83);
      windowModel.traverse(o=>{
        if(!o.isMesh)return;
        o.castShadow=false;o.receiveShadow=true;o.userData.fwSolid=false;
        const adjust=m=>{
          const next=own(m.clone());
          if(next.transparent){next.depthWrite=false;o.renderOrder=2;}
          else {next.emissive?.set(0x423021);next.emissiveIntensity=.28;}
          return next;
        };
        o.material=Array.isArray(o.material)?o.material.map(adjust):adjust(o.material);
      });
      set.add(windowModel);set.traverse(o=>{if(o.isMesh)o.userData.fwSolid=false;});
      created=true;
    }
    function update(who,camera) {
      if(disposed||!who)return;
      const d=Math.hypot(who.x-s.x,who.z-s.z), cameraD=camera?.position?Math.hypot(camera.position.x-s.x,camera.position.z-s.z):d;
      if(d>EXIT||cameraD>EXIT+4){set.visible=false;return;}
      if(d<ENTER&&!model)whenNear();
      if(!created&&model&&d<ENTER)create();
      if(created)set.visible=d<(set.visible?EXIT:ENTER);
    }
    return {update,visible:p,dispose(){disposed=true;scene.remove(set);for(const r of disposable)r.dispose();disposable.length=0;}};
  }
  window.FreeWalkBookshopDetail={mount,site};
})();
