// Original review model, metres, +Y up and +Z forward. All surfaces and maps are authored here.
(() => {
  const T = THREE, V = (x=0,y=0,z=0) => new T.Vector3(x,y,z), TAU = Math.PI*2;
  function mesh(parent, name, geometry, material) {
    const o = new T.Mesh(geometry,material); o.name=name; parent.add(o); o.castShadow=true; o.receiveShadow=true; return o;
  }
  function solid(color, roughness=.8, metalness=0) { return new T.MeshStandardMaterial({color:new T.Color(color).convertSRGBToLinear(),roughness,metalness,side:T.DoubleSide}); }
  function fabric(base, plaid=false) {
    const c=document.createElement('canvas'); c.width=c.height=256;
    const ctx=c.getContext('2d'); ctx.fillStyle=base; ctx.fillRect(0,0,256,256);
    if(plaid) for(const [at,width,ink] of [[0,29,'#302d2d38'],[38,4,'#d4a38385'],[118,15,'#312c2e65'],[139,4,'#e0ae835c']]) {
      ctx.fillStyle=ink; ctx.fillRect(at,0,width,256); ctx.fillRect(0,at,256,width);
    }
    for(let i=0;i<256;i+=2) {
      ctx.fillStyle=i%6?'#ffffff0b':'#00000014'; ctx.fillRect(i,0,1,256);
      ctx.fillStyle=i%8?'#0000000c':'#ffffff15'; ctx.fillRect(0,i,256,1);
    }
    const map=new T.CanvasTexture(c); map.encoding=T.sRGBEncoding; map.wrapS=map.wrapT=T.RepeatWrapping; map.anisotropy=4;
    return new T.MeshStandardMaterial({map,roughness:.93,side:T.DoubleSide});
  }
  function ell(parent,name,xyz,radii,mat) {
    const o=mesh(parent,name,new T.SphereGeometry(1,32,20),mat); o.position.copy(xyz); o.scale.set(...radii); return o;
  }
  function line(parent,name,pts,r,mat) {
    const c=new T.CatmullRomCurve3(pts); return mesh(parent,name,new T.TubeGeometry(c,Math.max(8,pts.length*3),r,7,false),mat);
  }
  // Rectangular grids have an explicit seam in UV space. Double-sided materials support folded hems.
  function grid(parent,name,rows,cols,fn,mat,{skip,uv,flip=false}={}) {
    const verts=[],uvs=[],ids=[];
    for(let r=0;r<rows;r++) for(let j=0;j<cols;j++) {
      const p=fn(r,j); verts.push(p.x,p.y,p.z); uvs.push(...(uv?uv(r,j):[j/(cols-1),r/(rows-1)]));
      if(r&&j&&!skip?.(r-1,j-1)) {const d=r*cols+j,c=d-1,b=d-cols,a=b-1;ids.push(...(flip?[a,c,b,b,c,d]:[a,b,c,b,d,c]));}
    }
    const g=new T.BufferGeometry(); g.setIndex(ids);g.setAttribute('position',new T.Float32BufferAttribute(verts,3));g.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));g.computeVertexNormals();
    return mesh(parent,name,g,mat);
  }
  function rings(parent,name,profile,mat,{n=48,point,repeat=[1,1]}={}) {
    return grid(parent,name,profile.length,n+1,(i,j)=>{
      const [y,x,z,cx=0,cz=0]=profile[i],a=j/n*TAU;
      return point?point(i,a):V(cx+x*Math.sin(a),y,cz+z*Math.cos(a));
    },mat,{uv:(i,j)=>[j/n*repeat[0],profile[i][0]*repeat[1]]});
  }
  function boneRig() {
    // Reuse the game's root-space IK, wrist orientation, daily gestures, collision profile and gait.
    const c=Object.create(LionCoach.prototype); c.root=new T.Group(); c.bones=[]; c.joints={}; c.character='otto'; c.cast={stoop:.012};
    const joint=(name,parent,p)=>{const b=new T.Bone();b.name=name;b.position.copy(p);parent.add(b);c.bones.push(b);c.joints[name]=b;return b;};
    const hip=joint('hips',c.root,V(0,.99,0)), spine=joint('spine',hip,V(0,.14,0)), chest=joint('chest',spine,V(0,.23,0));
    const neck=joint('neck',chest,V(0,.322,0)); joint('head',neck,V(0,.095,.008)); c.neckRest=neck.position.clone();
    for (const s of [-1,1]) {
      const side=s<0?'L':'R'; joint('scapula'+side,chest,V(s*.17,.17,-.06));
      const arm=joint('arm'+side,chest,V(s*.222,.222,0)), elbow=joint('elbow'+side,arm,V(s*.322,0,0));
      joint('hand'+side,elbow,V(s*.277,0,0));
      const thigh=joint('thigh'+side,hip,V(s*.107,0,0)), knee=joint('knee'+side,thigh,V(s*.002,-.427,0)); joint('foot'+side,knee,V(0,-.431,0));
    }
    c.root.updateMatrixWorld(true); c.rest={}; for(const b of c.bones)c.rest[b.name]=b.getWorldPosition(V());
    // Civil passes the overlay into the full fighter update in game. This review has its own body and no fighter effects.
    c.update=(_t,_guard,_combo,{poseOverlay})=>poseOverlay(c);
    return c;
  }
  const shirtRows=[[.975,.188,.123],[1.02,.198,.132],[1.065,.193,.139],[1.125,.186,.144],[1.19,.186,.146],[1.26,.19,.145],[1.34,.196,.147],[1.413,.204,.146],[1.443,.209,.143],[1.48,.217,.14],[1.525,.222,.134],[1.57,.224,.122],[1.605,.218,.107],[1.634,.19,.094],[1.66,.136,.085],[1.676,.082,.076]];
  const armhole={low:8,high:13,start:8,end:24,n:64};
  function shirtPoint(i,j) {
    const [y,rx,rz]=shirtRows[i], a=j/64*TAU, x=Math.sin(a),z=Math.cos(a);
    // Elliptical ribcage with a softer, flatter front panel, cloth ease in the lower back.
    return V(rx*Math.sign(x)*Math.abs(x)**.94,y-.009*z*Math.max(0,(y-1.60)/.076),-.006+rz*Math.sign(z)*Math.abs(z)**.9);
  }
  function chestOffset(c){const g=new T.Group(); c.joints.chest.add(g);g.position.copy(c.rest.chest).negate();return g;}
  function shirt(c,p,m) {
    const h=armhole, inside=(r,j)=>r>=h.low&&r<h.high&&((j>=h.start&&j<h.end)||(j>=64-h.end&&j<64-h.start));
    c.skin=grid(p,'Workshirt • vented armholes',shirtRows.length,65,shirtPoint,m.shirt,{skip:inside,uv:(r,j)=>[j/64*9,shirtRows[r][0]*8]});
    const geo=c.skin.geometry,ids=[],ws=[];for(let i=0;i<geo.attributes.position.count;i++){ids.push(2,0,0,0);ws.push(1,0,0,0);}
    geo.setAttribute('skinIndex',new T.Uint16BufferAttribute(ids,4));geo.setAttribute('skinWeight',new T.Float32BufferAttribute(ws,4));
    const sleeves=[];
    for(const s of [-1,1]){
      const side=s<0?'L':'R',rim=[];
      const add=(i,j)=>rim.push(shirtPoint(i,s<0?64-j:j));
      for(let j=h.start;j<h.end;j++)add(h.high,j);
      for(let i=h.high;i>h.low;i--)add(i,h.end);
      for(let j=h.end;j>h.start;j--)add(h.low,j);
      for(let i=h.low;i<h.high;i++)add(i,h.start);
      rim.push(rim[0].clone());
      // Unwrap the cut armhole by arc length. The outer cap always maps to the top of the sleeve,
      // while the armpit remains sewn to the same point of the rib cage.
      const angles=rim.map(v=>Math.atan2(v.z+.006,v.y-1.542));
      const sections=[[0,0,0],[.044,.081,.082],[.079,.079,.077],[.12,.075,.073],[.17,.072,.069],[.207,.068,.062],[.232,.065,.061],[.238,.07,.064],[.255,.071,.065],[.27,.068,.063],[.274,.061,.058]];
      const sleeve=grid(p,'Set-in sleeve '+side,sections.length,rim.length,(_,j)=>rim[j],m.shirt,{uv:(i,j)=>[j/(rim.length-1)*3,1.5-sections[i][0]*8],flip:s>0});
      sleeve.frustumCulled=false;
      const cuff=grid(p,'Rolled cuff '+side,4,rim.length,(_,j)=>rim[j],m.cuff,{uv:(i,j)=>[j/(rim.length-1)*3,i*.1],flip:s>0});cuff.frustumCulled=false;
      function update(){
        p.updateWorldMatrix(true,false);
        const sh=p.worldToLocal(c.joints['arm'+side].getWorldPosition(V())),el=p.worldToLocal(c.joints['elbow'+side].getWorldPosition(V()));
        const d=el.sub(sh).normalize(), q=new T.Quaternion().setFromUnitVectors(V(s,0,0),d);
        const outer=V(0,1,0).applyQuaternion(q),front=V(0,0,1).applyQuaternion(q);
        const pos=sleeve.geometry.attributes.position, cp=cuff.geometry.attributes.position;
        for(let i=0;i<sections.length;i++)for(let j=0;j<rim.length;j++){
          const [t,ry,rz]=sections[i], a=angles[j], v=sh.clone().addScaledVector(d,t);
          const wave=.0016*Math.sin(3*a+i*.8)*Math.min(1,i/3);
          v.addScaledVector(outer,(ry+wave)*Math.cos(a)).addScaledVector(front,(rz+wave)*Math.sin(a));
          if(i===0)v.copy(rim[j]);
          if(i===1)v.lerp(rim[j],.23);
          pos.setXYZ(i*rim.length+j,v.x,v.y,v.z);
          if(i>=7){const b=v.clone().addScaledVector(outer,.001*Math.cos(a)).addScaledVector(front,.001*Math.sin(a));cp.setXYZ((i-7)*rim.length+j,b.x,b.y,b.z);}
        }
        for(const o of [sleeve,cuff]){o.geometry.attributes.position.needsUpdate=true;o.geometry.computeVertexNormals();}
      }
      sleeves.push({update,rim,sleeve,side});
    }
    return sleeves;
  }
  window.OttoWorkroom={T,V,TAU,mesh,solid,fabric,ell,line,grid,rings,boneRig,shirtPoint,shirtRows,chestOffset,shirt};
})();
// Tailored clothes and working hands. Accessory coordinates below are the garment maker's rest pattern.
(() => {
  const {T,V,TAU,solid,fabric,mesh,grid,rings,ell,line,shirtRows,chestOffset,shirt}=OttoWorkroom;
  function materials(){
    return {shirt:fabric('#a05b49',true),cuff:fabric('#b67b68',true),apron:fabric('#365253'),pocket:fabric('#3c5c5a'),trim:solid('#8e9a82'),seam:solid('#596d66'),strap:solid('#734d33'),brass:solid('#be9756',.34,.55),trouser:fabric('#55564d'),trouserSeam:solid('#626356'),boot:solid('#694532',.48),welt:solid('#997250'),sole:solid('#383329'),lace:solid('#c0a387'),fur:solid('#72523b'),pad:solid('#95715a'),nail:solid('#584837',.51),ink:solid('#383c36')};
  }
  function frame(parent,name){const f=new T.Group(); f.name=name;parent.add(f);return f;}
  function stitch(parent,name,points,mat,r=.0012){return line(parent,name,points,r,mat);}
  function interp(rows,y){
    let i=1;while(i<rows.length-1&&rows[i][0]<y)i++;
    const a=rows[i-1],b=rows[i],u=T.MathUtils.clamp((y-a[0])/(b[0]-a[0]),0,1);
    return a.map((v,j)=>T.MathUtils.lerp(v,b[j],u));
  }
  function subpatch(p,name,nu,nv,sample,mat){return grid(p,name,nv+1,nu+1,(i,j)=>sample(j/nu,i/nv),mat);}
  function label(p,name,w,h,draw){
    const c=document.createElement('canvas');c.width=512;c.height=192;const g=c.getContext('2d');draw(g);
    const tex=new T.CanvasTexture(c);tex.encoding=T.sRGBEncoding;tex.anisotropy=4;
    return mesh(p,name,new T.PlaneGeometry(w,h),new T.MeshStandardMaterial({map:tex,roughness:.94,side:T.DoubleSide}));
  }
  function apron(c,p,m){
    const first=p.children.length;
    // Continuous front from the bib to the hem. Greatest projection is at the sternum, and the
    // panel below the waist hangs off the belt with shallow vertical folds and a little asymmetry.
    const pattern=[[.667,.222,.142,.082],[.682,.222,.142,.082],[.79,.218,.145,.08],[.89,.215,.145,.072],[1.00,.2,.142,.080],[1.072,.193,.150,.068],[1.13,.185,.151,.062],[1.17,.16,.15,.048],[1.24,.132,.151,.030],[1.36,.122,.155,.026],[1.47,.126,.148,.030],[1.535,.127,.136,.031]];
    function panel(u,y,offset=0){
      const [,w,front,drop]=interp(pattern,y),a=2*u-1,free=T.MathUtils.clamp((1.08-y)/.35,0,1);
      const fold=.006*free*(Math.cos(a*9+.3)+.55*Math.sin(a*13+.2));
      return V(w*a,y-.004*free*Math.cos(4*a),front-drop*a*a+fold+offset);
    }
    grid(p,'Canvas apron • bib to hem',52,49,(i,j)=>panel(j/48,.667+i/51*.868),m.apron,{uv:(i,j)=>[j/48*3,i/51*7]});
    for(const u of [.012,.988])stitch(p,'Felled apron edge',Array.from({length:26},(_,i)=>panel(u,.674+.852*i/25,.001)),m.seam,.0017);
    for(const y of [.679,1.526])stitch(p,'Turned hem',Array.from({length:18},(_,i)=>panel(i/17,y,.001)),m.seam,.00135);
    subpatch(p,'Apron pouch',20,14,(u,v)=>{const x=.115+.77*u,y=.832+v*(.153-.012*Math.sin(u*Math.PI));return panel(x,y,.004+.009*Math.sin(Math.PI*u)*(.32+.68*v));},m.pocket);
    for(const u of [.115,.51,.885])stitch(p,'Pouch division',Array.from({length:10},(_,i)=>panel(u,.835+i/9*.137,.006)),m.seam);
    stitch(p,'Pocket binding',Array.from({length:24},(_,i)=>{const u=i/23;return panel(.115+.77*u,.985-.012*Math.sin(u*Math.PI),.005+.009*Math.sin(Math.PI*u));}),m.trim,.002);
    // Neck loop, folded shirt collar and brass hardware.
    for(const s of [-1,1]){
      const path=[V(s*.106,1.52,.119),V(s*.102,1.56,.12),V(s*.092,1.616,.09),V(s*.081,1.665,.047),V(s*.067,1.68,-.006),V(s*.065,1.667,-.065)];
      subpatch(p,'Leather bib strap',3,24,(u,v)=>new T.CatmullRomCurve3(path).getPoint(v).add(V((u-.5)*.024,0,0)),m.strap);
      ell(p,'Brass rivet',V(s*.105,1.514,.122),[.007,.007,.0035],m.brass);
      subpatch(p,'Turned collar point',12,12,(u,v)=>{
        const top=V(s*(.014+.062*u),1.672+.005*u,.079-.04*u), bot=V(s*(.072+.069*u),1.576+.057*u,.115-.03*u);
        const q=top.lerp(bot,v);q.z+=.009*Math.sin(Math.PI*u);return q;
      },m.cuff);
    }
    for(const y of [1.564,1.603]){const [,rx,rz]=interp(shirtRows,y);ell(p,'Shirt button',V(0,y,rz-.001),[.006,.006,.003],m.brass);}
    rings(p,'Apron waist tie',[[1.071,.198,.151],[1.098,.194,.151]],m.apron,{repeat:[3,4]});
    for(const s of [-1,1])line(p,'Tied canvas ends',[V(0,1.084,-.158),V(s*.047,1.094,-.161),V(s*.071,1.056,-.154),V(s*.031,1.01,-.153)],.007,m.pocket);
    const badge=label(p,'Woven shop mark',.11,.04,g=>{
      g.fillStyle='#dac9a6';g.fillRect(0,0,512,192);g.strokeStyle='#766046';g.lineWidth=7;g.setLineDash([8,7]);g.strokeRect(11,11,490,170);g.fillStyle='#373f36';g.textAlign='center';g.font='bold 84px Georgia';const l=(['he','ru'].includes(window.app?.lang)?window.app.lang:'en'),mark={en:["OTTO’S",'C O R N E R'],he:['אוטו','ה פ י נ ה'],ru:['ОТТО','У Г О Л О К']}[l];g.direction=l==='he'?'rtl':'ltr';g.fillText(mark[0],256,100);g.font='bold 37px sans-serif';g.fillText(mark[1],256,151); // the shop mark in the player's language
    });badge.position.copy(panel(.5,1.448,.003));badge.rotation.x=-.04;badge.scale.x=-1;
    const pencilTop=V(-.105,1.041,.129);line(p,'Carpenter pencil',[V(-.096,.968,.129),pencilTop],.005,m.brass);
    const tip=mesh(p,'Sharpened pencil',new T.ConeGeometry(.005,.014,6),m.welt);tip.position.copy(pencilTop).y+=.006;
    const pieces=p.children.slice(first).filter(o=>/Canvas apron •|Felled apron|Turned hem|Apron pouch|Pouch division|Pocket binding|Carpenter pencil|Sharpened pencil/.test(o.name));
    const originals=pieces.map(o=>{o.updateMatrix();return {o,src:o.geometry.attributes.position.clone(),inverse:o.matrix.clone().invert()};});
    // The bib hangs from the chest. Below the waist the free front must pass over the actual posed
    // thigh envelope (including the other thigh on a step). Sample in the plane of the garment.
    const bottom=.64,dy=.017,x0=-.23,dx=.019,cols=25,rows=31;let targets=null;
    const q=V(),toPattern=new T.Matrix4(),garmentInv=new T.Matrix4();
    const anchor=y=>1-T.MathUtils.smoothstep(y,1.030,1.098);
    const depthFor=(x,y)=>{
      const [,width,front,drop]=interp(pattern,y),a=x/width,free=T.MathUtils.clamp((1.08-y)/.35,0,1);
      return front-drop*a*a+ .006*free*(Math.cos(a*9+.3)+.55*Math.sin(a*13+.2));
    };
    function drape(){
      if(!targets){targets=[];c.root.traverse(o=>{if(/^Trouser (leg|seat)/.test(o.name))targets.push(o);});}
      const need=new Float32Array(rows*cols),curved=new Float32Array(need.length);
      garmentInv.copy(p.matrixWorld).invert();
      // Sample the actual folded fabric under the posed thigh instead of applying
      // one collider's depth to the entire width of a horizontal apron row.
      for(const collider of targets){
        toPattern.copy(garmentInv).multiply(collider.matrixWorld);const a=collider.geometry.attributes.position;
        for(let i=0;i<a.count;i++){
          q.fromBufferAttribute(a,i).applyMatrix4(toPattern);
          if(q.y<bottom||q.y>1.075||q.z<=0)continue;
          const [,edge]=interp(pattern,q.y);if(Math.abs(q.x)>edge+.003)continue;
          const g=anchor(q.y);if(g<.001)continue;
          const amount=(q.z+.018-depthFor(q.x,q.y))/g;if(amount<=0)continue;
          const u=Math.floor((q.x-x0)/dx),v=Math.floor((q.y-bottom)/dy);
          for(let y=v;y<=v+1;y++)for(let x=u;x<=u+1;x++){
            if(x<0||x>=cols||y<0||y>=rows)continue;const k=y*cols+x;
            need[k]=Math.max(need[k],amount);
          }
        }
      }
      // Tension carries lift only to nearby cloth; the waist seam pins the bib.
      for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
        const k=y*cols+x;let m=need[k];
        for(let j=Math.max(0,y-5);j<=Math.min(rows-1,y+5);j++)
          for(let i=Math.max(0,x-6);i<=Math.min(cols-1,x+6);i++){
            const dist=Math.hypot((i-x)*dx*1.0,(j-y)*dy*.84);
            m=Math.max(m,need[j*cols+i]-.89*(Math.sqrt(dist*dist+.015*.015)-.015));
          }
        curved[k]=m;
      }
      function lift(x,y){
        const ax=T.MathUtils.clamp((x-x0)/dx,0,cols-1), ay=T.MathUtils.clamp((y-bottom)/dy,0,rows-1);
        const p=Math.floor(ax),r=Math.floor(ay),u=Math.min(cols-1,p+1),v=Math.min(rows-1,r+1);
        const lo=T.MathUtils.lerp(curved[r*cols+p],curved[r*cols+u],ax-p);
        const hi=T.MathUtils.lerp(curved[v*cols+p],curved[v*cols+u],ax-p);
        return T.MathUtils.lerp(lo,hi,ay-r)*anchor(y);
      }
      for(const {o,src,inverse} of originals){
        const buf=o.geometry.attributes.position;
        for(let i=0;i<src.count;i++){
          q.fromBufferAttribute(src,i).applyMatrix4(o.matrix);
          if(q.y<1.098)q.z+=lift(q.x,q.y);
          q.applyMatrix4(inverse);buf.setXYZ(i,q.x,q.y,q.z);
        }
        buf.needsUpdate=true;o.geometry.computeVertexNormals();o.frustumCulled=false;
      }
    }
    return {panel,drape};
  }
  function skinLoft(c,parent,name,profile,mat,upper,lower,kneeY,span,opts={}){
    const o=rings(parent,name,profile,mat,opts),geo=o.geometry,original=geo.attributes.position.clone(),v=V(),a=V(),b=V(),p1=new T.Matrix4(),p2=new T.Matrix4(),inv=new T.Matrix4();
    function update(){
      inv.copy(parent.matrixWorld).invert();
      for(const [bone,xf] of [[upper,p1],[lower,p2]]){const r=c.rest[bone];xf.copy(inv).multiply(c.joints[bone].matrixWorld).multiply(new T.Matrix4().makeTranslation(-r.x,-r.y,-r.z));}
      const buf=geo.attributes.position;
      for(let i=0;i<buf.count;i++){v.fromBufferAttribute(original,i);const f=T.MathUtils.smoothstep(v.y,kneeY-span,kneeY+span);a.copy(v).applyMatrix4(p1);b.copy(v).applyMatrix4(p2).lerp(a,f);buf.setXYZ(i,b.x,b.y,b.z);}
      buf.needsUpdate=true;geo.computeVertexNormals();
    }o.frustumCulled=false;return update;
  }
  function legs(c,m,updates){
    const hip=c.joints.hips;
    rings(hip,'Trouser seat',[[-.147,.136,.09],[-.102,.184,.127],[-.035,.194,.142],[.058,.186,.135],[.099,.177,.121]],m.trouser,{repeat:[4,5]});
    for(const s of [-1,1]){
      const side=s<0?'L':'R',x=s*.107;
      const rows=[[.121,.065,.069],[.139,.074,.079],[.161,.077,.074],[.176,.066,.073],[.195,.071,.077],[.219,.067,.069],[.254,.068,.073],[.316,.073,.083],[.402,.078,.083],[.469,.077,.078],[.511,.082,.084],[.531,.080,.084],[.555,.082,.087],[.578,.078,.09],[.636,.087,.1],[.716,.093,.109],[.8,.099,.118],[.872,.105,.122],[.945,.104,.122],[.996,.098,.112]];
      const profile=rows.map(([y,w,d])=>[y,w,d,x,0]);
      updates.push(skinLoft(c,c.root,'Trouser leg '+side,profile,m.trouser,'thigh'+side,'knee'+side,c.rest['knee'+side].y,.10,{repeat:[3,6],point:(i,a)=>{
        const [y,w,d]=rows[i],sand=Math.exp(-Math.pow((y-.55)/.068,2))+.65*Math.exp(-Math.pow((y-.165)/.06,2)),fold=.0032*sand*Math.sin(y*85+2.9*Math.cos(a));
        return V(x+(w+fold)*Math.sin(a),y,(d+fold)*Math.cos(a)-.011+.006*Math.cos(2*a));
      }}));
      const f=c.joints['foot'+side];
      const bootProfile=[[-.121,.078,.143,.041],[-.111,.08,.145,.041],[-.101,.079,.143,.041],[-.096,.078,.14,.041],[-.083,.078,.14,.04],[-.059,.076,.135,.04],[-.045,.072,.124,.039],[-.03,.066,.105,.023],[-.008,.06,.083,.004],[.028,.057,.072,-.008],[.053,.055,.066,-.012]];
      const make=(name,rows,mat)=>rings(f,name,rows.map(([y,w,d,cz])=>[y,w,d,0,cz]),mat,{point:(i,a)=>{const [y,w,d,cz]=rows[i],z=Math.cos(a);return V(w*Math.sin(a)*(1+.12*z),y,cz+d*Math.sign(z)*Math.abs(z)**.83);}});
      make('Leather sole '+side,bootProfile.slice(0,3),m.sole);make('Stitched welt '+side,bootProfile.slice(2,5),m.welt);make('Laced work shoe '+side,bootProfile.slice(4),m.boot);
      for(let k=0;k<4;k++){const y=.015-.012*k,z=.063+k*.016;for(const sign of [-1,1])line(f,'Waxed lace',[V(sign*.025,y,z),V(0,y+.003,z+.006),V(-sign*.023,y-.007,z+.014)],.0023,m.lace);}
      line(f,'Toe cap topstitch',Array.from({length:16},(_,i)=>{const a=(i/15-.5)*2;return V(.06*a,-.055-.019*a*a,.148-.023*a*a);}),.0016,m.welt);
    }
  }
  function hand(c,s,m,updates){
    const side=s<0?'L':'R',el=c.joints['elbow'+side],ha=c.joints['hand'+side];
    // Forearm and wrist are one tapered surface along the elbow-to-wrist axis.
    const upper=c.joints['arm'+side];
    rings(upper,'Sleeve opening to elbow',[[.254,.053],[.276,.055],[.301,.054],[.322,.052]].map(([t,r])=>[t,r,r]),m.fur,{point:(i,a)=>{
      const t=[.254,.276,.301,.322][i],r=[.053,.055,.054,.052][i];return V(s*t,r*Math.cos(a),r*Math.sin(a));
    }});
    ell(el,'Elbow',V(0,0,0),[.052,.052,.052],m.fur);
    const arm=[[0,.052,.052],[.026,.057,.055],[.065,.059,.056],[.108,.055,.052],[.16,.047,.044],[.225,.035,.038],[.263,.032,.034],[.285,.029,.032]];
    rings(el,'Forearm '+side,arm,m.fur,{point:(i,a)=>{const [l,w,d]=arm[i];return V(s*l,Math.cos(a)*w,Math.sin(a)*d);}});
    rings(ha,'Palm '+side,[[-.105,.030,.016],[-.093,.044,.021],[-.070,.047,.026],[-.042,.044,.027],[-.018,.035,.026],[.011,.032,.029]],m.fur);
    const fingers=[];
    for(let k=0;k<4;k++){
      const base=s*(k-1.5)*.022,z=.003*(k-1),len=[.075,.084,.078,.059][k],r=[.0108,.0114,.0108,.0094][k];
      const grp=frame(ha,'Finger '+(k+1));grp.position.set(base,-.089+Math.abs(k-1.35)*.002,z);fingers.push(grp);
      const profile=[[0,.9],[.12,1],[.36,.95],[.55,.91],[.70,.8],[.83,.76],[.93,.67],[.98,.4],[1,.08]].reverse();
      rings(grp,'Digit '+(k+1)+' '+side,profile.map(([u,rr])=>[-u*len,r*rr,r*rr]),m.fur,{n:18,point:(i,a)=>{
        const [u,rr]=profile[i];return V(r*rr*Math.sin(a)+s*(k-1.3)*.004*u,-u*len,r*rr*Math.cos(a)+.016*u*u);
      }});
      ell(grp,'Nail',V(s*(k-1.3)*.003,-.84*len,.012-.73*r),[r*.58,.009,.0025],m.nail);
    }
    const thumb=frame(ha,'Opposable thumb');thumb.position.set(-s*.033,-.042,.006);thumb.rotation.z=-s*.62;
    rings(thumb,'Working thumb',[[-.073,.003,.003,0,.013],[-.069,.01,.009,0,.013],[-.054,.014,.013,0,.009],[-.03,.015,.015,0,.005],[-.004,.016,.017]],m.fur,{n:20});
    updates.push((gesture)=>{const opened=['point','wave','open'].includes(gesture?.[side]);for(let k=0;k<4;k++){const curl=gesture?.[side]==='point'&&k>0?.83:opened?.045:.33;fingers[k].rotation.x=-curl;}});
  }
  function body(c){
    const m=materials(),p=chestOffset(c),sleeves=shirt(c,p,m),updates=sleeves.map(s=>s.update);
    const apronData=apron(c,p,m);legs(c,m,updates);for(const s of [-1,1])hand(c,s,m,updates);
    const neckCoat=solid('#fff');neckCoat.vertexColors=true;
    const neckProfile=[[-.063,.089,.08,-.01],[-.038,.085,.077,-.009],[-.012,.076,.068,-.009],[.013,.069,.063,-.008],[.034,.066,.061,-.007],[.053,.067,.062,-.005],[.071,.072,.064,-.001],[.085,.084,.068,.004],[.103,.091,.073,.009],[.12,.086,.07,.011]];
    const neck=rings(c.joints.neck,'Furred neck',neckProfile.map(([y,w,d,z])=>[y,w,d,0,z]),neckCoat);
    const np=neck.geometry.attributes.position,nc=[],brown=new T.Color('#5d4635').convertSRGBToLinear(),light=new T.Color('#9b8973').convertSRGBToLinear();
    for(let k=0;k<np.count;k++){const front=T.MathUtils.clamp((np.getZ(k)+.012)/.073,0,1),v=brown.clone().lerp(light,.54*front);nc.push(v.r,v.g,v.b);}
    neck.geometry.setAttribute('color',new T.Float32BufferAttribute(nc,3));
    rings(p,'Shirt collar stand',[[1.645,.091,.082,0,-.004],[1.66,.088,.078,0,-.005],[1.678,.081,.073,0,-.006],[1.687,.080,.071,0,-.006]],m.cuff,{repeat:[3,9],point:(i,a)=>{
      const t=i/3,w=.091-.011*t,d=.082-.011*t,front=Math.max(0,Math.cos(a));
      return V(w*Math.sin(a),1.646+.04*t-.013*front*t+.004*t*(1-front),-.005+d*Math.cos(a));
    }});
    // An otter tail starts thick at the pelvis, lies behind the trousers and tapers to a rounded point.
    const tail=frame(c.joints.hips,'Tapered otter tail');tail.position.set(0,-.041,-.095);
    const sections=[[0,.072,.077,0,0],[-.06,.075,.072,.003,-.06],[-.125,.067,.063,.008,-.093],[-.22,.056,.052,.023,-.142],[-.32,.045,.045,.041,-.177],[-.43,.033,.037,.067,-.19],[-.52,.023,.024,.095,-.193],[-.58,.012,.014,.12,-.19],[-.599,.002,.002,.129,-.185]].reverse();
    rings(tail,'Guard fur • tail',sections,m.fur);
    return {m,p,sleeves,apronData,update(gestures){c.root.updateMatrixWorld(true);for(const run of updates)run(gestures);apronData.drape();}};
  }
  Object.assign(OttoWorkroom,{body,interp,subpatch,frame});
})();
// A broad river-otter skull, blunt paired whisker pads and small lateral ears. +Z is the snout.
(() => {
  const {T,V,TAU,solid,ell,line,grid,frame,interp}=OttoWorkroom, clamp=T.MathUtils.clamp;
  const skull=[[-.058,.012,.033,.038],[-.050,.041,.058,.062],[-.032,.083,.106,.091],[-.01,.105,.137,.111],[.015,.127,.166,.127],[.032,.141,.177,.136],[.048,.15,.19,.142],[.066,.155,.194,.15],[.085,.16,.185,.155],[.103,.162,.163,.158],[.126,.159,.152,.159],[.152,.154,.141,.156],[.175,.145,.132,.149],[.197,.128,.114,.132],[.216,.104,.095,.103],[.229,.069,.062,.07],[.235,.032,.032,.032],[.237,.001,.001,.001]];
  const bell=(x,c,w)=>Math.exp(-Math.pow((x-c)/w,2));
  function headSection(y){
    const p=skull;let i=1;while(i<p.length-1&&p[i][0]<y)i++;
    const a=p[i-1],b=p[i],prev=p[Math.max(0,i-2)],next=p[Math.min(p.length-1,i+1)],dy=b[0]-a[0],u=clamp((y-a[0])/dy,0,1),u2=u*u,u3=u*u2;
    return a.map((v,k)=>(2*u3-3*u2+1)*v+(u3-2*u2+u)*dy*(b[k]-prev[k])/(b[0]-prev[0])+(-2*u3+3*u2)*b[k]+(u3-u2)*dy*(next[k]-v)/(next[0]-a[0]));
  }
  function surface(a,y){
    const [,w,front,back]=headSection(y), sn=Math.sin(a),cs=Math.cos(a),x=w*sn;
    const pad=bell(Math.abs(x),.055,.043)*bell(y,.075,.034);
    const dz=.042*pad-.021*bell(x,0,.015)*bell(y,.06,.022)-.018*bell(Math.abs(x),.084,.029)*bell(y,.135,.022)+.010*bell(Math.abs(x),.083,.037)*bell(y,.158,.014);
    return V(x,y,cs>0?front*cs**.76+dz*cs:-back*(-cs)**.94);
  }
  const depth=(x,y)=>surface(Math.asin(clamp(x/headSection(y)[1],-.999,.999)),y).z;
  function face(c){
    const head=c.joints.head;
    const leather=solid('#342820',.39),deep=solid('#201915',.32),eye=solid('#241c17',.22),iris=solid('#66503a',.38),spark=solid('#f3e4c4',.17),whisk=solid('#bdab8e'),gold=solid('#a98751',.34,.55),rim=solid('#55422e',.32,.48),inner=solid('#755444'),guard=solid('#654631'),lip=solid('#694f3e');
    // Original directionally brushed coat. Individual guard hairs are drawn into UV space on
    // the local canvas. Their flow fans from the muzzle and takes the contour around each cheek.
    let seed=1979;const random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
    const can=document.createElement('canvas');can.width=1024;can.height=512;const ctx=can.getContext('2d');
    ctx.fillStyle='#d5cfc2';ctx.fillRect(0,0,1024,512);ctx.lineCap='round';
    for(let k=0;k<92000;k++){
      const x=random()*1024,y=random()*512,a=x/1024*TAU,spread=Math.sin(a),u=1-y/512;
      const len=2+random()*5,dx=(spread*1.75+.28*(random()-.5))*len,dy=(.07+.8*Math.cos(a)*Math.cos((u+.15)*Math.PI)+.28*(random()-.5))*len;
      ctx.strokeStyle=random()>.55?'rgba(249,231,197,.23)':'rgba(63,48,36,.16)';ctx.lineWidth=.45+random()*.8;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+dx,y+dy);ctx.stroke();
    }
    const furMap=new T.CanvasTexture(can);furMap.encoding=T.sRGBEncoding;furMap.anisotropy=8;
    const material=solid('#ffffff');material.map=furMap;material.vertexColors=true;
    const base=grid(head,'Otter skull and muzzle',77,113,(i,j)=>surface(j/112*TAU,-.058+.295*i/76),material);
    const P=base.geometry.attributes.position, colors=[],brown=new T.Color('#684932').convertSRGBToLinear(),salt=new T.Color('#e1ccab').convertSRGBToLinear(),dark=new T.Color('#4b352a').convertSRGBToLinear(),coal=new T.Color('#352b25').convertSRGBToLinear();
    for(let i=0;i<P.count;i++){
      const x=P.getX(i),y=P.getY(i),z=P.getZ(i);
      const chin=clamp((.126-y)/.076,0,1)*clamp((z+.02)/.135,0,1);
      const side=clamp((z-.035)/.13,0,1)*bell(y,.068,.037)*(.6+.4*bell(Math.abs(x),.057,.042));
      const shade=.32*clamp((-z+.03)/.16,0,1)+.2*clamp((y-.17)/.065,0,1);
      const c=brown.clone().lerp(dark,shade).lerp(salt,clamp(chin*.75+side*.23,0,1));
      const socket=bell(Math.abs(x),.088,.032)*bell(y,.135,.032)*clamp((z-.04)/.06,0,1);
      c.lerp(coal,.64*socket);colors.push(c.r,c.g,c.b);
    }
    base.geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));
    const tufts=[], tuftColors=[];
    for(let k=0;k<3000;k++){
      const a=random()*TAU,y=-.02+.245*random(),sn=Math.sin(a),cs=Math.cos(a);
      if(cs>.44&&Math.abs(sn)<.88)continue;
      const at=surface(a,y),n=V(sn,.13,cs).normalize(),side=V(cs,0,-sn),l=.002+.0035*random(),w=.00045+.0006*random();
      const dir=V(sn*.4,-.64,-.62).normalize(),root=at.clone().addScaledVector(n,-.0004),tip=root.clone().addScaledVector(dir,l).addScaledVector(n,.0018);
      for(const pt of [root.clone().addScaledVector(side,w),root.clone().addScaledVector(side,-w),tip])tufts.push(pt.x,pt.y,pt.z);
      const tint=brown.clone().multiplyScalar(.42+.42*random());for(let j=0;j<3;j++)tuftColors.push(tint.r,tint.g,tint.b);
    }
    const tg=new T.BufferGeometry();tg.setAttribute('position',new T.Float32BufferAttribute(tufts,3));tg.setAttribute('color',new T.Float32BufferAttribute(tuftColors,3));tg.computeVertexNormals();const tm=solid('#ffffff');tm.vertexColors=true;OttoWorkroom.mesh(head,'Short cheek guard hairs',tg,tm);
    for(const s of [-1,1]){
      const ear=frame(head,'Rounded pinna');ear.position.set(s*.147,.157,-.054);ear.rotation.y=s*.77;ear.rotation.z=-s*.23;
      ell(ear,'Furred ear rim',V(0,0,0),[.032,.035,.018],guard);
      ell(ear,'Recessed ear',V(0,0,.014),[.019,.022,.008],inner);
      const at=V(s*.084,.138,depth(s*.084,.138)-.0035);
      const eyeGroup=frame(head,'Warm dark eye');eyeGroup.position.copy(at);eyeGroup.rotation.y=s*.28;
      ell(eyeGroup,'Eye lid rim',V(0,0,0),[.023,.019,.010],guard);
      ell(eyeGroup,'Iris',V(0,0,.007),[.017,.014,.009],iris);
      ell(eyeGroup,'Pupil',V(-s*.002,.001,.012),[.0105,.0105,.006],eye);
      ell(eyeGroup,'Eye catchlight',V(-.004-s*.002,.005,.017),[.0038,.0038,.002],spark);
      line(eyeGroup,'Upper lid',[V(-.018,.004,.014),V(-.009,.014,.014),V(.004,.016,.014),V(.018,.005,.013)],.0026,guard);

      // Oval half-rims slope back around the face; temples actually reach the ears.
      const frameZ=(x,y)=>.16-.53*(Math.abs(x)-.065)-.59*(y-.134);
      let standOff=0;const loop=[];
      for(let k=0;k<=48;k++){
        const a=TAU*k/48,x=s*(.065+.045*Math.cos(a)),y=.134+.030*Math.sin(a);
        standOff=Math.max(standOff,depth(x,y)+.004-frameZ(x,y));loop.push(V(x,y,frameZ(x,y)));
      }
      loop.forEach(q=>q.z+=standOff);line(head,'Bronze reading rim',loop,.00265,rim);
      const hinge=loop[0];ell(head,'Brass hinge',hinge,[.0045,.004,.005],gold);
      line(head,'Folding temple',[hinge,V(s*.142,.144,.103),V(s*.159,.15,.002),V(s*.153,.145,-.057)],.0027,rim);
      const b=loop[23];line(head,'Saddle bridge',[b,V(s*.014,.143,.176),V(0,.145,.1775)],.0028,gold);
      const pad=V(s*.024,.125,depth(s*.024,.125)+.001);line(head,'Nose rest',[b,pad],.0017,gold);
    }
    // Wide leathery nose, with a flattened top and tapered underside.
    const nose=grid(head,'Otter nose',19,35,(i,j)=>{
      const t=i/18, h=-Math.cos(Math.PI*t),w=.043*Math.sin(Math.PI*t)**.7*(.83+.23*t),a=j/34*TAU;
      return V(w*Math.sin(a),.086+.023*h,.206+.018*Math.sin(Math.PI*t)*Math.cos(a));
    },leather);
    for(const s of [-1,1]){
      const no=ell(head,'Nostril',V(s*.022,.088,.222),[.008,.0034,.0023],deep);no.rotation.z=s*.26;
      for(let k=0;k<12;k++){const x=s*(.038+(k%4)*.014+(Math.floor(k/4)%2)*.004),y=.079-Math.floor(k/4)*.009;
        const z=depth(x,y);ell(head,'Follicle',V(x,y,z+.0002),[.0019,.0016,.0017],lip);}
      for(let k=0;k<7;k++){
        const x=s*(.060+.006*(k%3)),y=.077-k*.0047,z=depth(x,y);
        const d=.071+.008*(k%4),lift=.02-k*.0064;
        line(head,'Tapered whisker',[V(x,y,z),V(x+s*d*.48,y+lift*.6,z+.014),V(x+s*d,y+lift,z+.014),V(x+s*d*1.46,y+lift-.004,z-.0002)],.00078,whisk);
      }
    }
    line(head,'Philtrum',[V(0,.075,.206),V(0,.062,depth(0,.062)+.002),V(0,.05,depth(0,.05)+.002)],.0018,lip);
    // A small lower-lip morph moves only the muzzle below the mouth hinge. A closed rest seam
    // and recessed inner lip give the opening depth without dropping the entire skull.
    const anchor=.038, L=23, W=51;
    const seamY=x=>anchor+.006*(Math.abs(x)/.075)**1.8-.002*bell(x,0,.014);
    const mouth=grid(head,'Mouth recess',L,W,(i,j)=>{
      const x=(j/(W-1)*2-1)*.075,f=Math.max(0,1-(x/.075)**2),y=seamY(x)-(1-i/(L-1))*.0022*f;
      return V(x,y,depth(x,y)+.0009);
    },deep);
    const rest=P.clone(), restM=mouth.geometry.attributes.position.clone();
    let lastKey='';
    // For future animation input, use normalized open, round and spread channels.
    // No audio inference: the review drives the very same controls with silent cues.
    function speak(channels){
      const unit=n=>Number.isFinite(n)?clamp(n,0,1):0, input=typeof channels==='number'?{open:channels}:channels||{};
      const o=unit(input.open), r=unit(input.round), s=unit(input.spread), key=[o,r,s].join('/');
      if(key===lastKey)return;lastKey=key;
      const width=.075*(1-.23*r+.17*s), lower=.019*o+.002*r, upper=.0025*o;
      for(let i=0;i<P.count;i++){
        const x=rest.getX(i),y=rest.getY(i),z=rest.getZ(i), dy=y-seamY(x);
        const zone=clamp((z-.08)/.102,0,1)*clamp(1-(x/.092)**2,0,1);
        const lip=clamp(1-Math.abs(dy)/.040,0,1)*zone;
        const falling=clamp(-dy/.012,0,1)*zone*clamp(1-(-dy)/.095,0,1);
        const rising=clamp(dy/.009,0,1)*clamp(1-dy/.030,0,1)*zone;
        P.setXYZ(i,x+x*(-.23*r+.17*s)*lip,y-lower*falling+upper*rising,z+.0045*r*lip-.004*o*falling);
      }
      const mp=mouth.geometry.attributes.position;
      for(let i=0;i<mp.count;i++){
        const x=restM.getX(i),w=Math.max(0,1-(x/.075)**2),u=Math.floor(i/W)/(L-1), xx=x*width/.075;
        const y=seamY(xx)+w*(upper*u-(.0022+lower)*(1-u));
        mp.setXYZ(i,xx,y,depth(xx,y)+.0009+.004*r*w-.002*o*w*(1-u));
      }
      P.needsUpdate=mp.needsUpdate=true;
      base.geometry.computeVertexNormals();mouth.geometry.computeVertexNormals();
    }
    return {speak};
  }
  Object.assign(OttoWorkroom,{face});
})();
(() => {
  // Silent acting shapes; approximate caption accent envelopes, not phonemes or lip sync.
  const modes={
    open:[.88,.06,.16], round:[.43,.78,0], spread:[.44,0,.69], small:[.28,.15,.29],
  };
  const cues={
    7.8:[[.10,.40,'open'],[.63,.25,'round'],[1.00,.31,'spread'],[1.47,.33,'open'],[1.96,.26,'small']],
    9:[[.10,.31,'spread'],[.53,.25,'round'],[.94,.34,'open'],[1.46,.28,'small']],
    20.4:[[.10,.34,'open'],[.56,.29,'spread'],[1.04,.36,'round'],[1.59,.34,'open']],
    14.4:[[.08,.39,'spread'],[.57,.26,'round'],[.97,.29,'open'],[1.53,.25,'small'],[1.91,.32,'open']],
    18:[[.10,.31,'open'],[.54,.24,'spread'],[.91,.39,'round'],[1.46,.43,'open']],
    21:[[.09,.29,'small'],[.55,.33,'round'],[1.01,.29,'spread']],
    26:[[.12,.34,'spread'],[.57,.28,'open'],[.96,.42,'round'],[1.58,.34,'open']],
  };
  function mouthAt(line,t){
    const shape={open:0,round:0,spread:0};
    if(line?.who!=='otto'||!Number.isFinite(t))return shape;
    for(const [start,width,name] of cues[line.t]||[]){
      const u=(t-line.t-start)/width,v=u>0&&u<1?Math.sin(Math.PI*u)**2:0;
      const p=modes[name];shape.open+=p[0]*v;shape.round+=p[1]*v;shape.spread+=p[2]*v;
    }
    return shape;
  }
  Object.assign(OttoWorkroom,{mouthAt,jawAt:(line,t)=>mouthAt(line,t).open});
})();

/* Scene-scoped civilian visual. Native rig still owns story, actor translation and props. */
(() => {
  const scenes=new Set(['dream_otto_shop','dream_market_reward']);
  const attached=new WeakSet();
  const {boneRig,body,face,mouthAt}=window.OttoWorkroom;
  const drawables=o=>o.isMesh||o.isLine||o.isPoints||o.isSprite;
  function dispose(root) {
    const geometries=new Set(),materials=new Set(),textures=new Set();
    root.traverse(o=>{
      if(o.geometry)geometries.add(o.geometry);
      for(const m of Array.isArray(o.material)?o.material:[o.material]){
        if(!m)continue;
        materials.add(m);
        for(const v of Object.values(m))if(v?.isTexture)textures.add(v);
      }
    });
    for(const a of [geometries,materials,textures])for(const v of a)v.dispose();
  }
  function attach(sceneId,actor,source) {
    if(!scenes.has(sceneId)||actor!=='otto'||source?.character!=='otto'||!source.root||attached.has(source))return null;
    const candidate=boneRig(), root=candidate.root, originals=[];
    let outfit, head;
    try {
      outfit=body(candidate);head=face(candidate);
      // Construction must succeed before changing any shared live actor state.
      source.root.traverse(o=>{ if(drawables(o))originals.push([o,o.layers.mask,o.castShadow,o.receiveShadow]); });
      for(const [o] of originals){o.layers.disableAll();o.castShadow=false;o.receiveShadow=false;}
      source.root.add(root);root.name='Otto civilian visual';attached.add(source);
    } catch(error) {
      for(const [o,mask,cast,receive] of originals){o.layers.mask=mask;o.castShadow=cast;o.receiveShadow=receive;}
      root.parent?.remove(root);dispose(root);throw error;
    }
    let closed=false;
    function reset() {
      if(closed)return;
      window.DreamPose.reset(candidate);head.speak(0);
    }
    function detach() {
      if(closed)return;reset();closed=true;attached.delete(source);
      root.parent?.remove(root);
      for(const [o,mask,cast,receive] of originals){o.layers.mask=mask;o.castShadow=cast;o.receiveShadow=receive;}
      dispose(root);
    }
    function update(state,line,elapsed) {
      if(closed)return;
      window.DreamPose.civil(candidate,{...state,talk:0});
      outfit.update(state.arms);
      // Caption event time advances while the viewer holds the subtitle; the cue reaches rest.
      const shape=mouthAt(state.talk&&line?.who==='otto'?line:null,line?.t+Math.max(0,elapsed));
      head.speak(shape);
    }
    return {update,reset,detach};
  }
  const enabled=search=>new URLSearchParams(search).get('ottoCandidate')==='1';
  window.OttoCivilian={attach,enabled};
})();
