/* Old Town storefront show windows. All geometry is local to the story set, +z faces the street.
 * Channel art is original deterministic 2D motion on one small atlas. No video decode, audio or network. */
(() => {
  'use strict';
  const TEXT = {
    tv: ['GLORYVISION', 'גלוריוויז׳ן', 'ГЛОРИВИЖН'],
    bar: ['THE COPPER TAP', 'בר ברז הנחושת', 'МЕДНЫЙ КРАН'],
    cafe: ['CORNER COFFEE', 'קפה פינתי', 'КОФЕ НА УГЛУ'],
    bakery: ['BAKERY', 'מאפייה', 'ПЕКАРНЯ'],
    records: ['AFTER HOURS RECORDS', 'תקליטי הלילה', 'НОЧНЫЕ ПЛАСТИНКИ'],
    florist: ['PETAL & STEM', 'עלה וגבעול', 'ЛЕПЕСТОК И СТЕБЕЛЬ'],
    mural: ['RING CITY','עיר הזירה','ГОРОД РИНГА'],
    channels: [
      ['RING SPORTS', 'ספורט בזירה', 'БОКС'], ['HARBOR NEWS', 'חדשות הנמל', 'НОВОСТИ'],
      ['GLORY WEATHER', 'מזג האוויר', 'ПОГОДА'], ['NATURE', 'טבע', 'ПРИРОДА'],
      ['LATE MUSIC', 'מוזיקת לילה', 'МУЗЫКА'], ['CITY TRAFFIC', 'תנועה בעיר', 'ТРАФИК'],
      ['OCEAN LIFE', 'חיים בים', 'ОКЕАН'], ['FOOD MARKET', 'טעמי השוק', 'РЫНОК'],
      ['NIGHT CINEMA', 'סרטי לילה', 'КИНО'], ['FAIRGROUND', 'היריד', 'ЯРМАРКА'],
      ['TOP SCORES', 'לוח תוצאות', 'СЧЁТ'], ['CITY STORIES', 'סיפורי העיר', 'ИСТОРИИ']
    ]
  };
  const langIndex = l => l === 'he' ? 1 : l === 'ru' ? 2 : 0;
  const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const palette = [['#1d2447','#8b2147','#ee7d68'],['#081d38','#144b76','#59bed0'],['#0f283f','#3879a0','#f1ce6e'],['#153a2c','#356b4c','#afde86'],['#23133c','#662653','#e69ccc'],['#1c3444','#255d56','#8ee9bb'],['#113147','#154f6f','#a8e8e9'],['#4a292c','#864834','#ffe7a6'],['#302b46','#804f63','#ffbc99'],['#283663','#313376','#f6ca7b'],['#1d3741','#23635e','#f9df94'],['#21343c','#54626b','#ddd0a2']];
  function channel(ctx, k, t, li) {
    const [lo, hi, accent] = palette[k], W = 128, H = 72;
    const fill = (color,x,y,w,h) => {ctx.fillStyle=color;ctx.fillRect(x,y,w,h);};
    const dot = (color,x,y,r) => {ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();};
    const line = (color,a,w=1) => {ctx.strokeStyle=color;ctx.lineWidth=w;ctx.beginPath();a.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();};
    const phase = t + k*.91;
    fill(lo,0,0,W,H); fill(hi,0,10,W,43);
    if (k === 0) {
      for(const y of [23,36,49]) line('#f5c4bd',[[17,y],[110,y]]);
      for(const x of [17,110]) fill('#f5c4bd',x,18,2,36);
      for (const a of [-1,1]) {
        const x=65+a*(11+7*Math.sin(phase*3+a)), y=32+1.5*Math.cos(phase*4+a), c=a<0?accent:'#96c8f9';
        dot(c,x,y,4);line(c,[[x,y+4],[x,y+13],[x-a*5,y+18]],4);line(c,[[x,y+7],[x-a*(7+4*Math.sin(phase*5)),y+6]],3);
      }
    } else if (k === 1) {
      fill('#89b9c2',8,15,59,33);fill('#3a667a',10+(phase*8)%39,35,19,8);fill('#173b56',72,15,49,33);
      for(let i=0;i<4;i++)fill(accent,79,20+i*6,18+5*((i+Math.floor(phase))%4),2);
    } else if (k === 2) {
      dot(accent,89,24,11);for(let i=0;i<4;i++)dot('#c4dbe2',18+i*10+Math.sin(phase+i)*6,24-i%2*4,8);
      for(let i=0;i<6;i++)fill(i%2?accent:'#91b9cf',10+19*i,35+i%3*2,11,11-i%3*2);
    } else if (k === 3) {
      for(let i=0;i<9;i++) { const x=i*17; line(lo,[[x,53],[x+3,13]],3);dot(accent,x+Math.sin(phase+i)*4,23+i%4*5,9); }
      dot('#fff1b6',69+Math.sin(phase*1.4)*28,30,3);
    } else if(k===5) {
      for(const y of [20,31,43]) line(lo,[[5,y],[122,y]],5);
      for(let j=0;j<11;j++)fill(j%3?accent:'#f59f7c',8+(j*29+phase*(10+j%3))%108,18+11*(j%3),5,3);
    } else if(k===6) {
      for(let j=0;j<5;j++) {const x=(j*43+phase*(12+j))%133; const y=18+j*7; line(accent,[[x-8,y+4],[x,y],[x+10,y+2],[x,y+4],[x-8,y]],2);}
    } else if(k===7) {
      for(let j=0;j<12;j++)dot(['#ffa95a','#db5949','#b2c979'][j%3],16+j%6*19,23+Math.floor(j/6)*15+Math.sin(phase*2+j),7);
    } else if(k===8) {
      dot('#f8cea1',94,23,12);for(let j=0;j<10;j++)fill(lo,((j*17-phase*4)%135+135)%135,31+(j%3)*4,12,20);
    } else if(k===9) {
      line(accent,[[42,54],[54,30],[66,54]],2);for(let j=0;j<12;j++){const a=j*Math.PI/6+phase*.25; line('#9f88cf',[[54,30],[54+21*Math.cos(a),30+21*Math.sin(a)]]);dot(accent,54+21*Math.cos(a),30+21*Math.sin(a),2);}
    } else if(k===11) {
      fill(accent,9,20,37,29);dot('#a3694f',29,30,7);fill('#2f536a',18,37,22,12); for(let j=0;j<5;j++)fill(accent,55,19+j*6,20+4*((j+Math.floor(phase))%9),2);
    } else {
      for(let j=0;j<12;j++) { const h=4+(k===4?Math.abs(Math.sin(phase*3+j*.71))*32:((j*7+Math.floor(phase))%25));fill(j%3?accent:'#eee5ea',7+j*10,49-h,6,h); }
    }
    fill(lo,0,54,W,18);fill(accent,0,52,W,2);
    ctx.fillStyle='#f3f2e9';ctx.font='bold 10px system-ui,sans-serif';ctx.textBaseline='middle';ctx.direction=li===1?'rtl':'ltr';ctx.textAlign='center';ctx.fillText(TEXT.channels[k][li],64,62,95);
  }
  function build({ lang='en', tier='high', section='gym' }={}) {
    const T=window.THREE, group=new T.Group(), resources=new Set(), li=langIndex(lang), actors=[];
    group.name='Old Town local businesses';
    const own = r => (resources.add(r),r);
    const color = h => new T.Color(h).convertSRGBToLinear();
    const basic = (h,extra={}) => own(new T.MeshBasicMaterial({color:color(h),...extra}));
    const renderFaces=[], features=[];
    // Bake subtle interior warmth into material output only, never add another world light.
    function indoor(mat) {
      mat.onBeforeCompile = shader => {
        shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += diffuseColor.rgb * vec3(0.46, 0.34, 0.23);');
      };
      mat.customProgramCacheKey=()=> 'city-storefront-indoors-v1';
      return mat;
    }
    const add = (o,g=group,solid=false) => { o.userData.fwSolid=solid;g.add(o);return o; };
    // Static solids are merged into one draw per shop box. They do not cast broad warm light outside.
    function builder(g, gentleFill=false, solid=true) {
      const pos=[], colors=[];
      function geo(o,x,y,z,h) { const c=color(h); o.translate(x,y,z); const p=o.attributes.position; const idx=o.index;for(let j=0;j<(idx?idx.count:p.count);j++){const i=idx?idx.getX(j):j;pos.push(p.getX(i),p.getY(i),p.getZ(i));colors.push(c.r,c.g,c.b);}o.dispose(); }
      const box=(x,y,z,w,h,d,c)=>geo(new T.BoxGeometry(w,h,d),x,y,z,c);
      const cyl=(x,y,z,r1,r2,h,c)=>geo(new T.CylinderGeometry(r1,r2,h,8),x,y,z,c);
      function finish() {const o=own(new T.BufferGeometry());o.setAttribute('position',new T.Float32BufferAttribute(pos,3));o.setAttribute('color',new T.Float32BufferAttribute(colors,3));o.computeVertexNormals();const mat=own(new T.MeshStandardMaterial({vertexColors:true,roughness:.75,emissive:color('#734025'),emissiveIntensity:.08}));if(gentleFill)indoor(mat);return add(new T.Mesh(o,mat),g,solid);}
      return {box,cyl,finish};
    }
    function shop(key,x,z,ry,w,d,paint) {
      const root=add(new T.Group());root.name='Storefront '+key;root.position.set(x,0,z);root.rotation.y=ry;
      const b=builder(root,key==='bar'), H=2.72, sep=w/2-.99, lx=-.48, span=w-1.12;
      // The existing façade is left in place; this glazed shop extension has real interior depth.
      b.box(0,.04,d/2,w,.08,d,paint);b.box(0,2.74,d/2,w,.13,d,paint);
      b.box(0,1.37,.045,w,H,.09,key==='tv'?'#192632':'#5e3c31');
      for(const i of [-1,1]) b.box(i*(w/2-.045),1.37,d/2,.09,H,d,paint);
      b.box(0,.20,d,w,.39,.11,paint);b.box(0,2.57,d,w,.24,.11,paint);
      b.box(sep,1.45,d,.075,2.25,.07,paint);b.box(lx,2.32,d,span,.025,.06,paint);
      b.box(sep+.55,1.36,d-.04,.92,2.2,.085,'#27282d');
      b.box(sep+.30,1.19,d+.018,.035,.22,.035,'#b1956a');
      // Very slight clear display glazing, rather than an opaque fake reflection.
      const glass=add(new T.Mesh(own(new T.PlaneGeometry(span,1.98)),basic('#99b4c2',{transparent:true,opacity:.055,depthWrite:false})),root);
      glass.position.set(lx,1.37,d+.019);glass.renderOrder=2;glass.name='Show window glass '+key;
      const cc=canvas(512,96), ctx=cc.getContext('2d');ctx.fillStyle=paint;ctx.fillRect(0,0,512,96);
      ctx.strokeStyle='#deb577';ctx.lineWidth=2;ctx.strokeRect(5,5,502,86);ctx.fillStyle='#fff0cb';ctx.font='bold 44px system-ui,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.direction=li===1?'rtl':'ltr';ctx.fillText(TEXT[key][li],256,48,478);
      const st=own(new T.CanvasTexture(cc));st.encoding=T.sRGBEncoding;st.minFilter=T.LinearFilter;st.generateMipmaps=false;
      const sign=add(new T.Mesh(own(new T.PlaneGeometry(w-.25,.39)),own(new T.MeshBasicMaterial({map:st}))),root);sign.position.set(0,2.93,d+.025);sign.name='Localized shop sign '+key;
      features.push(key);return {root,b,w,d,span,lx};
    }
    let signal=null;
    function tvWall(f) {
      const {b,d,root,lx,span}=f, frames=canvas(512,256), ctx=frames.getContext('2d',{alpha:false});
      const texture=own(new T.CanvasTexture(frames));texture.encoding=T.sRGBEncoding;texture.minFilter=T.LinearFilter;texture.magFilter=T.LinearFilter;texture.generateMipmaps=false;
      const P=[], U=[], screenRows=[.77,1.28,1.79];
      for(let k=0;k<12;k++) {
        const j=k%4,i=Math.floor(k/4), x=lx+(j-1.5)*span/4, y=screenRows[i]+(j%2===0?.025:0), z=d-.38-(j%2)*.025, w=span/4*.87, h=w*.44;
        b.box(x,y,z-.045,w+.07,h+.075,.075,'#20232b');b.box(x,y-h*.5-.044,z-.05,w*.3,.03,.15,'#15171a');
        b.box(x+w*.43,y-h*.5-.015,z+.004,.025,.02,.024,'#7bb69b');
        const l=x-w/2,r=x+w/2,q=y-h/2,u=y+h/2;
        P.push(l,q,z,r,q,z,r,u,z,l,q,z,r,u,z,l,u,z);
        // 128x72 cells in fixed 128x85 pitches, leaving guard padding around neighboring programmes.
        const a=(j*128+1)/512,s=(j*128+127)/512,m=1-(i*85+73)/256,n=1-(i*85+2)/256;
        U.push(a,m,s,m,s,n,a,m,s,n,a,n);
      }
      for(const y of [.49,1.00,1.51])b.box(lx,y,d-.43,span,.043,.45,'#686b70');
      const geo=own(new T.BufferGeometry());geo.setAttribute('position',new T.Float32BufferAttribute(P,3));geo.setAttribute('uv',new T.Float32BufferAttribute(U,2));
      const screens=add(new T.Mesh(geo,own(new T.MeshBasicMaterial({map:texture,color:0xbfc8d7,toneMapped:false}))),root);screens.name='12 lively televisions / 12 channels';renderFaces.push(screens);
      function draw(t){ctx.fillStyle='#131829';ctx.fillRect(0,0,512,256);for(let k=0;k<12;k++){ctx.save();ctx.translate((k%4)*128,Math.floor(k/4)*85+1);channel(ctx,k,t,li);ctx.restore();}texture.needsUpdate=true;}
      draw(0);signal={draw,texture,root};
    }
    function pub(f) {
      const {root,b,d,lx,span}=f, back=.32, bar=d-.88;
      for(let y of [.92,1.32,1.73,2.2]){
        b.box(lx,y,back,span,.065,.36,'#b47a4e');
        for(let i=0;i<20;i++){const x=lx+(i-9.5)*span/21;const h=.135+.014*((i*3)%7), r=.047+(i%3)*.009;
          b.cyl(x,y+h*.51,back+.03,r,r,h,['#a8643b','#486b53','#a49148','#833e38','#356e70'][i%5]);
          b.cyl(x,y+h+.025,back+.03,r*.37,r*.50,.058,'#bc9d57');if(i%3!==1)b.box(x,y+h*.48,back+.08,r*1.55,.07,.008,'#e0be8f');
        }
      }
      b.box(lx,.47,bar,span,.9,.35,'#75472f');b.box(lx,.98,bar,span+.09,.12,.55,'#bd875a');
      for(let i=0;i<5;i++){const x=lx+(i-2)*span/5.6;b.cyl(x,.34,d-.24,.032,.055,.65,'#503b36');b.cyl(x,.68,d-.24,.17,.17,.075,'#803a37');b.cyl(x,.08,d-.24,.14,.17,.04,'#503b36');}
      for(let i=0;i<3;i++){const x=lx+(i-1)*.18;b.cyl(x,1.16,bar,.036,.045,.25,'#bf8959');b.cyl(x,1.29,bar,.026,.026,.05,'#e7c394');}
      for(let i=0;i<5;i++){const x=lx+(i-2)*span/5.6;b.cyl(x,1.08,bar+.15,.055,.043,.09,i%2?'#c6a26c':'#925639');}
      for(let i=0;i<3;i++){const x=lx+(i-1)*span/3;b.cyl(x,2.42,d-.56,.012,.012,.24,'#a18353');b.cyl(x,2.28,d-.56,.10,.19,.08,'#bf9256');const bulb=add(new T.Mesh(own(new T.SphereGeometry(.047,6,4)),basic('#efc486',{toneMapped:false})),root);bulb.position.set(x,2.219,d-.56);}
      const W=window.StreetLife?.walker, looks=window.StreetLife?.walkers;
      if (W&&looks?.length) {
        // The same locally generated, fully skinned NPCs as the street, with separate idle poses.
        const pcs=[[-.3,bar-.31,.11,1,'bartender','#eee3c8'],[-1.65,bar+.30,1.63,.93,'patron left','#944d52'],[.93,bar+.25,-1.32,.96,'patron right','#345c65']];
        for(const [i,[x,z,ry,sc,name,top]] of pcs.entries()){
          const m=W({...looks[i%looks.length],top,coat:false,bag:null,dog:null,id:name});m.name='Copper Tap '+name;
          m.position.set(x,0,z);m.rotation.y=ry;m.scale.setScalar(sc);m.castShadow=false;m.receiveShadow=false;
          m.material.emissive?.set(0x3c291e);m.material.emissiveIntensity=.12;indoor(m.material);
          own(m.material);own(m.geometry);own(m.skeleton);add(m,root);actors.push(m);
          const head=m.userData.bones?.head;
          if(head){
            for(const side of [-1,1]){
              const eye=add(new T.Mesh(own(new T.SphereGeometry(.015,7,5)),basic('#201712')),head);eye.position.set(side*.058,.163,.119);eye.scale.y=1.20;eye.scale.z=.48;
              const catchlight=add(new T.Mesh(own(new T.SphereGeometry(.0042,5,4)),basic('#e4d7bd')),head);catchlight.position.set(side*.058-.003,.168,.127);
            }
          }
        }
      }
    }
    function retail(f,key){
      const {b,d,lx,span}=f;
      for(const y of [.68,1.12,1.59])b.box(lx,y,d-.27,span,.05,.27,'#9b7250');
      for(let j=0;j<3;j++) for(let i=0;i<8;i++){
        const x=lx+(i-3.5)*span/9,y=.74+j*.46,z=d-.25;
        if(key==='records'){b.box(x,y+.075,z,.155,.19,.033,['#9e5f57','#8ba39f','#5c7789','#c6ab72'][(i+j)%4]);b.cyl(x,y+.081,z+.019,.03,.03,.04,'#c4ad91');}
        else {b.cyl(x,y+.047,z,.05,.044,.096,'#a66e52');b.cyl(x,y+.12,z,.012,.015,.14,'#54694c'); b.cyl(x,y+.19,z,.037,.02,.05,['#cc857e','#e2ba63','#ac769e'][(i+j)%3]);}
      }
    }
    function facadeDetails(f,key){
      const {root,w,d}=f, tr=builder(root,false,false), sash='#c6b795', faces=key==='tv'?[-1.55,.62]:[-1.85,.88];
      for(let i=0;i<(key==='records'?0:faces.length);i++) {
        const x=faces[i], y=4.30+(i%2*.09), z=.21;
        tr.box(x,y,z-.08,.98,1.25,.25,key==='tv'?'#30343e':'#40333a');
        for(const side of [-1,1]) {
          tr.box(x+side*.47,y,z+.055,.055,1.25,.09,sash);
          tr.box(x,y+side*.595,z+.055,.97,.065,.09,sash);
        }
        tr.box(x,y,z+.075,.037,1.10,.07,sash);
        if(i===0) {
          const hinge=add(new T.Group(),root);hinge.position.set(x-.36,y,.29);hinge.rotation.y=.55;
          const casement=builder(hinge,false,false);
          for(const a of [-1,1])casement.box(.20,a*.48,0,.43,.04,.043,sash);
          for(const a of [0,.41])casement.box(a,0,0,.035,1.01,.043,sash);
          casement.box(.20,0,0,.38,.90,.012,'#51566b');casement.finish();
        } else {
          const bx=x+.04;tr.box(bx,y-.68,z+.15,.96,.20,.27,'#875442');
          for(let k=0;k<9;k++) {
            const u=bx+(k-4)*.099,y1=y-.52+(k%3)*.039;
            tr.cyl(u,y1,z+.24,.014,.018,.22,'#557054');
            tr.cyl(u,y1+.121,z+.24,.046,.032,.037,['#dc7e77','#e4d291','#c68daa'][k%3]);
          }
        }
      }
      if(key==='bar') {
        // A small bin with dedicated lid & handle, tight to the frontage and out of the main sidewalk.
        const bin=builder(root), bx=-w*.43, bz=d+.03;
        bin.cyl(bx,.38,bz,.15,.13,.71,'#40504f');
        bin.cyl(bx,.75,bz,.171,.161,.062,'#4c5b57');
        bin.box(bx,.80,bz,.095,.028,.027,'#252d2c');
        bin.finish();
        tr.box(bx+.23,.017,bz+.11,.11,.03,.054,'#8a7976');
        for(const s of [-1,1])tr.box(s*1.88,5.27,.27,.025,.025,.42,'#635749');
        tr.box(0,5.27,.47,3.77,.013,.014,'#8f7766');
        for(const [i,x,col] of [[0,-.93,'#527888'],[1,-.41,'#beada2'],[2,.37,'#938b91']]) {
          const y=5.08-i*.052;
          for(let k=0;k<5;k++)tr.box(x+(k-2)*.065,y,.451+(k%2)*.032,.067,.36+i*.10,.032,col);
          tr.box(x-.11,5.262,.47,.030,.076,.036,'#c7ab8b');tr.box(x+.13,5.262,.47,.030,.076,.036,'#c7ab8b');
        }
      }
      if(key!=='records')tr.finish();
      if(key==='records'){
        const cv=canvas(384,96), g=cv.getContext('2d');g.font='900 italic 64px sans-serif';g.textAlign='center';g.textBaseline='middle';g.direction=li===1?'rtl':'ltr';g.fillStyle='#852f56';g.fillText(TEXT.mural[li],192,46,368);g.fillStyle='#c5ad83';g.fillText(TEXT.mural[li],189,42,368);
        const t=own(new T.CanvasTexture(cv));t.encoding=T.sRGBEncoding;t.minFilter=T.LinearFilter;t.generateMipmaps=false;
        const decal=add(new T.Mesh(own(new T.PlaneGeometry(1.38,.35)),own(new T.MeshBasicMaterial({map:t,transparent:true,opacity:.66,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2}))),root);
        decal.position.set(-w*.24,.21,d+.060);decal.rotation.z=-.09;decal.name='quiet original street tag';
      }
    }
    if(section==='gym'){
      const tv=shop('tv',-9.5,6.04,0,5.92,1.00,'#293650');tvWall(tv);tv.b.finish();facadeDetails(tv,'tv');
      const bar=shop('bar',9.15,9.54,0,6.52,1.80,'#432c30');pub(bar);bar.b.finish();facadeDetails(bar,'bar');
    }else if(section==='market'){
      // Side windows outside the story aisle; front edge stays behind the set's lamps at z=±11.2.
      const r=shop('records',-11.4,14.15,Math.PI,4.60,1.65,'#384657');retail(r,'records');r.b.finish();facadeDetails(r,'records');
      const f=shop('florist',11.4,-14.15,0,4.60,1.65,'#375648');retail(f,'florist');f.b.finish();
    }
    const near=new T.Vector3(), stamp=()=>performance.now()*.001;
    let lastScreen=-Infinity, lastActor=-Infinity;
    function update(p,camera,t=stamp()){
      if(signal){
        signal.root.getWorldPosition(near);const d=Math.hypot(p.x-near.x,p.z-near.z);
        if(d<24 && t-lastScreen>(tier==='low'?.19:.115)){signal.draw(t);lastScreen=t;}
      }
      if(actors.length && t-lastActor>.057){
        actors[0].getWorldPosition(near);const d=Math.hypot(p.x-near.x,p.z-near.z);
        if(d<25){actors.forEach((a,i)=>{const j=a.userData.bones||{}, q=t*(1.3+i*.21)+i*3;
          if(j.head){j.head.rotation.y=.12*Math.sin(q*.56);j.head.rotation.x=.045*Math.cos(q);}
          if(j.spine)j.spine.rotation.z=.035*Math.sin(q*.70);
          if(j.armR)j.armR.rotation.x=-.22-.17*Math.sin(q*.7)**2;
          if(j.foreR)j.foreR.rotation.x=-.75-.14*Math.sin(q*.5);
          if(j.foreL)j.foreL.rotation.x=-.35-.07*Math.cos(q*.72);
          });lastActor=t;}
      }
    }
    return {group,update,dispose:()=>{for(const r of resources)r.dispose?.();resources.clear();},stats:()=>({shops:features.slice(),screens:renderFaces.length?12:0,channels:signal?12:0,patrons:actors.length})};
  }
  window.CityStorefronts={build};
})();
