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
  if(!referee){
   const cuff=mesh(ankle,new THREE.CylinderGeometry(.091,.078,.177,28,1,true),leather,'Boxing boot ankle');cuff.position.set(0,.071,-.022);cuff.scale.z=1.15;const collar=mesh(ankle,new THREE.RingGeometry(.069,.091,28),leather,'Closed leather collar binding');collar.rotation.x=-Math.PI/2;collar.position.set(0,.1595,-.022);collar.scale.y=1.15;
   const rim=mesh(ankle,new THREE.TorusGeometry(.090,.006,6,32),rubber,'Padded collar rim');rim.rotation.x=Math.PI/2;rim.position.set(0,.160,-.022);rim.scale.y=1.15;
   const tongue=mesh(ankle,new THREE.BoxGeometry(.055,.16,.013),leather,'Boot tongue');tongue.position.set(0,.075,.087);
   for(const s of [-1,1])line(ankle,[V(s*.089,.146,-.018),V(s*.082,.066,-.004),V(s*.062,-.005,.032)],trim,.003);
  }
  for(let i=0;i<(referee?3:8);i++){
   const high=i>=3,parent=high?ankle:foot,y=high?.02+(i-3)*.026:-.002+i*.013,z=high?.097:.131-i*.033;
   line(parent,[V(-.025,y,z),V(0,y+.005,z+.004),V(.025,y+.011,z-.007)],lace);
   line(parent,[V(.025,y,z),V(0,y+.005,z+.005),V(-.025,y+.011,z-.007)],lace);
  }
  for(const s of [-1,1])line(foot,[V(s*.05,-.045,-.075),V(s*.064,-.034,.016),V(s*.068,-.044,.108)],trim,.0015);
  return ankle;
 }
 window.BoxingFootwear={attach};
})();
