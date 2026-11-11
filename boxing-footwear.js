/* Articulated boxing boots. Coordinates share the rig's planted toe contact. */
(() => {
 const V=(x,y,z)=>new THREE.Vector3(x,y,z);
 function attach(foot,{species='lion',referee=false}={}){
  const rubber=new THREE.MeshStandardMaterial({color:0x131923,roughness:.96});
  const leather=new THREE.MeshStandardMaterial({color:referee?0x20252b:0x26303d,roughness:.62});
  const trim=new THREE.MeshStandardMaterial({color:referee?0x67717c:species==='rabbit'?0x87bfd5:0xc6a56d,roughness:.65});
  const lace=new THREE.MeshStandardMaterial({color:0xbcb8aa,roughness:.95});
  function mesh(parent,g,m,name){const n=new THREE.Mesh(g,m);n.name=name;n.castShadow=true;n.receiveShadow=true;parent.add(n);return n;}
  function line(parent,points,m,r=.0017){return mesh(parent,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),16,r,5,false),m,'Boot stitching and laces');}
  // Closed outsole: rounded heel, tapered toe, shallow flex rocker.
  const outline=[[-.045,-.105],[-.062,-.083],[-.066,-.02],[-.076,.075],[-.077,.135],[-.062,.187],[-.032,.211],[0,.218],[.032,.211],[.062,.187],[.077,.135],[.076,.075],[.066,-.02],[.062,-.083],[.045,-.105],[0,-.112]];
  const soleY=z=>-.095+Math.max(0,z-.16)*.16;
  function sole(bottom,top,scale,mat,name){const pos=[],ids=[],n=outline.length;
   for(const y of [bottom,top])for(const [x,z] of outline)pos.push(x*scale,soleY(z)+y,z);
   for(let i=0;i<n;i++){const j=(i+1)%n;ids.push(i,j,n+i,j,n+j,n+i);}
   for(let i=1;i<n-1;i++)ids.push(0,i+1,i,n,n+i,n+i+1);
   const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(ids);g.computeVertexNormals();return mesh(foot,g,mat,name);
  }
  sole(0,.018,1,rubber,'Boxing boot sole');sole(.018,.023,.99,trim,'Thin stitched boot welt');
  // Sectioned leather last: a real instep, low toe box and close-fitting heel.
  const rows=[[-.103,.028,-.037],[-.080,.055,-.013],[-.025,.063,.028],[.025,.070,.036],[.080,.074,.011],[.135,.069,-.012],[.185,.050,-.036],[.209,.023,-.055],[.215,.002,-.067]],p=[],indices=[],segments=18;
  for(const [z,width,top] of rows)for(let i=0;i<=segments;i++){const a=Math.PI*i/segments;p.push(-Math.cos(a)*width,soleY(z)+.022+Math.sin(a)*Math.max(.008,top-soleY(z)-.022),z);}
  for(let r=0;r<rows.length-1;r++)for(let i=0;i<segments;i++){const a=r*(segments+1)+i,b=a+segments+1;indices.push(a,b,a+1,b,b+1,a+1);}
  // Close both ends and the underside of the leather last; the outsole alone
  // cannot hide these openings while a foot lifts or pivots.
  for(const row of [0,rows.length-1]){const [z]=rows[row],center=p.length/3;p.push(0,soleY(z)+.022,z);for(let i=0;i<segments;i++){const a=row*(segments+1)+i;indices.push(...(row===0?[center,a,a+1]:[center,a+1,a]));}}
  for(let r=0;r<rows.length-1;r++){const a=r*(segments+1),b=a+segments+1;indices.push(a,a+segments,b,b,a+segments,b+segments);}
  const upper=new THREE.BufferGeometry();upper.setAttribute('position',new THREE.Float32BufferAttribute(p,3));upper.setIndex(indices);upper.computeVertexNormals();mesh(foot,upper,leather,'Sculpted boxing boot upper');
  const ankle=new THREE.Group();ankle.name='Articulated padded boot collar';foot.add(ankle);foot.userData.bootAnkle=ankle;
  // Three constructions share the sole, welt and last (same contact and sole height); only
  // the shaft, collar, lacing and accent panels differ. `style()` shows one per fighter.
  const styles={classic:new THREE.Group(),mid:new THREE.Group(),panel:new THREE.Group()},feet={classic:new THREE.Group(),mid:new THREE.Group(),panel:new THREE.Group()};
  for(const [name,g] of Object.entries(styles)){g.name='Boot shaft · '+name;ankle.add(g);feet[name].name='Boot panels · '+name;foot.add(feet[name]);g.visible=feet[name].visible=name==='classic';}
  // Point on the shaft surface (elliptical, tapered) at side s, angle a from the toe, height y.
  const shaft=(s,a,y,lift=0)=>{const r=.078+.013*(y+.0175)/.177+lift;return V(s*r*Math.sin(a),y,-.022+1.15*r*Math.cos(a));};
  if(!referee){
   // Classic high-top: tall padded shaft, laced to the top.
   const hi=styles.classic,cuff=mesh(hi,new THREE.CylinderGeometry(.091,.078,.177,28,1,true),leather,'Boxing boot ankle');cuff.position.set(0,.071,-.022);cuff.scale.z=1.15;const collar=mesh(hi,new THREE.RingGeometry(.069,.091,28),leather,'Closed leather collar binding');collar.rotation.x=-Math.PI/2;collar.position.set(0,.1595,-.022);collar.scale.y=1.15;
   const rim=mesh(hi,new THREE.TorusGeometry(.090,.006,6,32),rubber,'Padded collar rim');rim.rotation.x=Math.PI/2;rim.position.set(0,.160,-.022);rim.scale.y=1.15;
   const tongue=mesh(hi,new THREE.BoxGeometry(.055,.16,.013),leather,'Boot tongue');tongue.position.set(0,.075,.087);
   for(const s of [-1,1])line(hi,[V(s*.089,.146,-.018),V(s*.082,.066,-.004),V(s*.062,-.005,.032)],trim,.003);
   // Mid-top: shaft ends above the ankle bone under a thick contrast padded collar.
   const mid=styles.mid,mc=mesh(mid,new THREE.CylinderGeometry(.0866,.078,.1125,28,1,true),leather,'Boxing boot ankle');mc.position.set(0,.0388,-.022);mc.scale.z=1.15;
   const mb=mesh(mid,new THREE.RingGeometry(.066,.0866,28),leather,'Closed leather collar binding');mb.rotation.x=-Math.PI/2;mb.position.set(0,.095,-.022);mb.scale.y=1.15;
   const pad=mesh(mid,new THREE.TorusGeometry(.086,.012,8,32),trim,'Padded mid-top collar');pad.rotation.x=Math.PI/2;pad.position.set(0,.095,-.022);pad.scale.set(1,1.15,.9);
   mesh(mid,new THREE.BoxGeometry(.055,.1,.013),leather,'Boot tongue').position.set(0,.045,.087);mesh(mid,new THREE.BoxGeometry(.042,.03,.007),trim,'Tongue tab').position.set(0,.1,.094);
   mesh(mid,new THREE.BoxGeometry(.03,.045,.007),trim,'Heel pull tab').position.set(0,.088,-.121);
   for(const s of [-1,1])line(feet.mid,[V(s*.068,-.06,-.06),V(s*.075,-.058,.03),V(s*.072,-.064,.12),V(s*.04,-.066,.195)],trim,.0035);
   // Modern panelled: high shaft with a hook-and-loop ankle strap, speed stripes and pull tab.
   const pn=styles.panel,pc=mesh(pn,new THREE.CylinderGeometry(.091,.078,.177,28,1,true),leather,'Boxing boot ankle');pc.position.set(0,.071,-.022);pc.scale.z=1.15;
   const pb=mesh(pn,new THREE.RingGeometry(.069,.091,28),leather,'Closed leather collar binding');pb.rotation.x=-Math.PI/2;pb.position.set(0,.1595,-.022);pb.scale.y=1.15;
   const pr=mesh(pn,new THREE.TorusGeometry(.090,.0075,6,32),trim,'Contrast collar rim');pr.rotation.x=Math.PI/2;pr.position.set(0,.160,-.022);pr.scale.y=1.15;
   mesh(pn,new THREE.BoxGeometry(.055,.16,.013),leather,'Boot tongue').position.set(0,.075,.087);
   const strap=mesh(pn,new THREE.CylinderGeometry(.0915,.0905,.034,28,1,true),rubber,'Ankle strap');strap.position.set(0,.112,-.022);strap.scale.z=1.16;
   for(const s of [-1,1]){mesh(pn,new THREE.BoxGeometry(.008,.04,.05),trim,'Strap tab').position.set(s*.094,.112,-.01);
    for(const k of [0,1,2])line(pn,[0,.5,1].map(t=>shaft(s,2.55-1.35*t,.008+k*.026+t*.06,.002)),trim,.0042);
    line(feet.panel,[V(s*.066,-.05,-.08),V(s*.075,-.042,.02),V(s*.07,-.045,.11)],trim,.006);}
   mesh(pn,new THREE.BoxGeometry(.032,.055,.007),trim,'Heel pull tab').position.set(0,.17,-.125);
  }
  for(let i=0;i<(referee?3:8);i++){
   const high=i>=3,y=high?.02+(i-3)*.026:-.002+i*.013,z=high?.097:.131-i*.033;
   for(const parent of high?(referee?[]:[styles.classic,styles.panel,...(i<6?[styles.mid]:[])]):[foot]){
    line(parent,[V(-.025,y,z),V(0,y+.005,z+.004),V(.025,y+.011,z-.007)],lace);
    line(parent,[V(.025,y,z),V(0,y+.005,z+.005),V(-.025,y+.011,z-.007)],lace);
   }
  }
  for(const s of [-1,1])line(foot,[V(s*.05,-.045,-.075),V(s*.064,-.034,.016),V(s*.068,-.044,.108)],trim,.0015);
  // Gum-rubber tread wrapping up the outsole edge, visible whenever the boot lifts or pivots.
  if(!referee){const ribs=[];for(let i=0;i<outline.length;i++){const [x,z]=outline[i],[x2,z2]=outline[(i+1)%outline.length];for(const t of [.25,.75]){const px=x+(x2-x)*t,pz=z+(z2-z)*t,len=Math.hypot(px,pz)||1;ribs.push([px+px/len*.0012,pz+pz/len*.0012]);}}
   const g=new THREE.BoxGeometry(.0035,.012,.0035),parts=ribs.map(([x,z])=>{const c=g.clone();c.translate(x,soleY(z)+.007,z);return c;});const pos=[],nor=[];for(const c of parts){const n=c.toNonIndexed();pos.push(...n.attributes.position.array);nor.push(...n.attributes.normal.array);}
   const tread=new THREE.BufferGeometry();tread.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));tread.setAttribute('normal',new THREE.Float32BufferAttribute(nor,3));mesh(foot,tread,rubber,'Sole tread ribs');}
  foot.userData.bootStyles={styles,feet};
  return ankle;
 }
 // Shop variants pick a construction; the save format (boots_<variant>) is unchanged.
 const designs={default:'classic',midnight:'mid',jade:'panel',sunrise:'classic'};
 function style(coach,variant){const design=designs[variant]||'classic';for(const side of ['L','R']){const s=coach?.joints?.['foot'+side]?.userData.bootStyles;if(!s)continue;for(const name of Object.keys(s.styles)){s.styles[name].visible=s.feet[name].visible=name===design;}}return design;}
 window.BoxingFootwear={attach,style,designs};
})();
