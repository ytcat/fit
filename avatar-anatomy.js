/* Authored muscle correctives and coordinated facial acting. Original local assets.
 * Anatomical regions deform the continuous skin/coat, never scale a whole bone.
 */
(() => {
 const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z),clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
 const bell=(x,c,r)=>Math.exp(-(((x-c)/r)**2)),smooth01=x=>{x=clamp(x);return x*x*(3-2*x);};
 // Region corrective fades to zero at its region border: neighbouring regions never meet in a step (seam line).
 const edge=(v,a,b,w)=>smooth01((v-a)/w)*smooth01((b-v)/w);
 /* GOTR-0037 muscle definition. A reusable, data-driven atlas of muscle bellies in the
  * shared rig's T-pose space (metres, +Z front, arms along X, the +X side is mirrored).
  * Each part spans origin a -> insertion b over the skin; anchors snap to the avatar's own
  * surface, so any body built on this rig gets anatomically placed relief. Built once per
  * body at load (cached): displacement + normal relief and a crease/crest term; per frame
  * only one scale per channel changes (contraction, stretch). */
 const DEF_CHANNELS=['static','bicepsL','bicepsR','tricepsL','tricepsR','deltL','deltR','pecL','pecR','latL','latR','forearmL','forearmR','abs','back','quadL','quadR','calfL','calfR','flankL','flankR','traps'];
 const DEF_RANGE=.03,F=[0,0,1],B=[0,0,-1];
 // group, channel, origin a, insertion b, facing hint, half width [at a, at b], relative height, options
 const M=(group,ch,a,b,n,w,h,o={})=>({group,ch,a,b,n,wa:Array.isArray(w)?w[0]:w,wb:Array.isArray(w)?w[1]:w,h,bias:o.bias??.5,shape:o.shape??2,p:o.p??1,crisp:Boolean(o.crisp)});
 const MUSCLE_ATLAS=[
  // Chest: sternal and clavicular heads of pectoralis major converge on the humerus; firm lower edge.
  M('pectoralis','pec',[.028,1.535,.19],[.315,1.585,.13],F,[.085,.045],1.25,{bias:.34,p:.75,crisp:true}),
  M('pectoralis','pec',[.035,1.67,.155],[.31,1.64,.12],[0,.3,1],[.048,.038],1.0,{bias:.4,crisp:true}),
  // Rectus abdominis: four boxy segments per side, linea alba and tendinous intersections between.
  M('rectus','abs',[.058,1.458,.17],[.058,1.370,.16],F,.048,.80,{shape:2.3,p:1.9,crisp:true}),
  M('rectus','abs',[.058,1.356,.155],[.058,1.276,.15],F,.049,.80,{shape:2.3,p:1.9,crisp:true}),
  M('rectus','abs',[.058,1.262,.148],[.058,1.182,.148],F,.049,.78,{shape:2.3,p:1.9,crisp:true}),
  M('rectus','abs',[.056,1.168,.15],[.052,1.095,.15],F,.046,.45,{shape:2.2,p:1.9,crisp:true}),
  // Flank: external oblique above the iliac crest, serratus digits interlocking under the arm.
  M('obliques','flank',[.215,1.39,.095],[.18,1.125,.11],[.75,0,.65],[.062,.055],.80,{bias:.55}),
  M('serratus','flank',[.275,1.478,.045],[.222,1.452,.118],[1,0,.45],.016,.55,{bias:.6,crisp:true}),
  M('serratus','flank',[.270,1.426,.040],[.218,1.400,.112],[1,0,.45],.0165,.58,{bias:.6,crisp:true}),
  M('serratus','flank',[.260,1.373,.035],[.213,1.350,.106],[1,0,.45],.016,.52,{bias:.6,crisp:true}),
  // Back: trapezius (upper, middle, lower fibres), infraspinatus and teres over the blade,
  // latissimus fanning from the axilla to the lower back (V taper), spinal erectors.
  M('trapezius','traps',[.05,1.795,-.06],[.30,1.735,-.03],[0,1,-.6],[.062,.045],1.15,{bias:.42}),
  M('trapezius','traps',[.022,1.665,-.165],[.225,1.645,-.17],B,[.072,.045],.95,{bias:.35}),
  M('trapezius','traps',[.022,1.43,-.17],[.135,1.605,-.19],B,[.045,.058],.85,{bias:.55}),
  M('infraspinatus','back',[.11,1.552,-.20],[.265,1.525,-.165],B,.056,.75,{bias:.45}),
  M('teres','lat',[.215,1.462,-.18],[.315,1.515,-.105],[.5,0,-1],.028,.60,{bias:.5}),
  M('latissimus','lat',[.305,1.495,-.095],[.165,1.28,-.17],[.6,0,-.8],[.072,.08],1.0,{bias:.38}),
  M('latissimus','lat',[.24,1.36,-.15],[.095,1.13,-.14],B,[.07,.055],.80,{bias:.4}),
  M('erector','back',[.046,1.41,-.17],[.050,1.10,-.15],B,[.032,.038],.85,{bias:.6}),
  // Shoulder: three deltoid heads with separations, converging on the deltoid tuberosity.
  M('deltoid front','delt',[.315,1.695,.105],[.505,1.655,.08],[0,.45,1],[.060,.024],1.25,{bias:.35}),
  M('deltoid side','delt',[.335,1.765,.0],[.53,1.705,.0],[0,1,0],[.064,.026],1.35,{bias:.33}),
  M('deltoid rear','delt',[.315,1.695,-.105],[.505,1.655,-.08],[0,.45,-1],[.060,.024],1.15,{bias:.35}),
  // Upper arm: biceps in front, brachialis on the outer edge, triceps horseshoe behind.
  M('biceps','biceps',[.43,1.625,.098],[.64,1.615,.072],F,[.052,.032],1.35,{bias:.56}),
  M('brachialis','biceps',[.535,1.69,.045],[.65,1.675,.04],[0,1,.6],.024,.60,{bias:.5}),
  M('triceps lateral','triceps',[.37,1.675,-.085],[.59,1.66,-.065],[0,.55,-1],[.045,.028],1.2,{bias:.45}),
  M('triceps long','triceps',[.37,1.565,-.08],[.595,1.585,-.068],[0,-.55,-1],[.050,.032],1.2,{bias:.45}),
  // Forearm: brachioradialis/extensor mass over the top, flexor mass underneath, tapering to the wrist.
  M('forearm extensors','forearm',[.645,1.675,.03],[.87,1.65,.0],[0,1,.35],[.045,.022],1.0,{bias:.24}),
  M('forearm flexors','forearm',[.66,1.57,.03],[.87,1.595,.0],[0,-1,.45],[.044,.022],.9,{bias:.28}),
  M('forearm back','forearm',[.68,1.625,-.058],[.87,1.62,-.04],B,[.032,.018],.65,{bias:.3}),
  // Legs below the shorts: vastus medialis teardrop, calf heads, soleus, tibialis.
  M('vastus medialis','quad',[.095,.745,.10],[.12,.595,.10],[-.6,0,.8],[.04,.055],.85,{bias:.68}),
  M('vastus lateralis','quad',[.28,.80,.05],[.255,.615,.06],[1,0,.35],.05,.70,{bias:.45}),
  M('gastrocnemius','calf',[.15,.525,-.09],[.165,.30,-.11],[-.35,0,-1],[.045,.036],1.05,{bias:.36}),
  M('gastrocnemius','calf',[.225,.525,-.085],[.215,.355,-.10],[.4,0,-1],[.04,.03],.90,{bias:.36}),
  M('soleus','calf',[.10,.40,-.035],[.12,.235,-.045],[-1,0,-.4],.028,.45,{bias:.45}),
  M('soleus','calf',[.268,.40,-.03],[.245,.245,-.04],[1,0,-.4],.028,.45,{bias:.45}),
  M('tibialis','calf',[.225,.52,.06],[.21,.26,.06],[.45,0,1],[.028,.018],.50,{bias:.3}),
  // Neck: sternocleidomastoid (mostly under the lion's mane).
  M('sternocleidomastoid','static',[.075,1.87,.05],[.025,1.755,.12],[.4,0,1],.02,.40,{bias:.5})
 ];
 // Species character: unit (m per relative height), dome sharpness, bulk kept after the
 // band-pass, crease darkening and crest sheen; per-group emphasis.
 const MUSCLE_PROFILES={
  lion:{unit:.0115,p:.85,keep:.42,cavity:.28,sheen:.16,mass:1,groups:{rectus:.42,serratus:.70,obliques:.85,trapezius:1.35,pectoralis:1.15,'deltoid side':1.0,latissimus:1.25,infraspinatus:1.25,erector:1.15,teres:1.15,biceps:.95}},
  rabbit:{unit:.0095,p:.62,keep:.22,cavity:.34,sheen:.20,mass:.72,groups:{rectus:.62,serratus:1.05,obliques:1.15,trapezius:.95,latissimus:1.1,infraspinatus:1.15,'forearm extensors':1.15,'forearm flexors':1.15}},
  other:{unit:.0095,p:.75,keep:.3,cavity:.3,sheen:.18,mass:.8,groups:{}}
 };
 const definitionCache=new Map(),MASS_RANGE=.05;
 // GOTR-0050 volume: smooth, static mass along the rest normal (cm-scale), so the boxer is built, not
 // only carved: pectorals and rib cage, lats and upper back, traps, deltoid caps, upper arms, forearms.
 // Waist (belts), hands (gloves) and legs are left as authored.
 function muscleMass(x,y,z,profile){
  const u=Math.abs(x),k=profile.mass??1,front=smooth01((z-.02)/.08),back=smooth01((-z-.02)/.08),torso=1-smooth01((u-.33)/.05),waist=smooth01((y-1.28)/.09);
  let m=torso*waist*(.034*bell(u,.14,.105)*bell(y,1.56,.09)*front+.020*bell(y,1.48,.13)*bell(u,0,.27)*smooth01((z+.03)/.10)
   +.020*bell(u,.27,.07)*bell(y,1.43,.11)+.013*bell(y,1.56,.12)*bell(u,.15,.14)*back)+.008*bell(y,1.77,.05)*bell(u,.17,.09)*(1-front);
  if(u>.30&&y>1.40){const along=smooth01((u-.30)/.06),cuff=1-smooth01((u-.83)/.05),top=smooth01((y-1.60)/.10);
   m=Math.max(m,along*cuff*(.016*bell(u,.50,.13)+.011*bell(u,.38,.07)*(.5+.5*top)+.010*bell(u,.735,.075)));}
  return m*k;
 }
 function buildDefinition(g,profile){
  const P=g.attributes.position.array,N=g.attributes.normal.array,count=P.length/3,index=g.index?.array;
  if(!index)return null;
  const unit=profile.unit;
  // 4 cm buckets: each muscle part only visits the skin near it.
  const cell=.04,lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];
  for(let i=0;i<count*3;i++){const k=i%3,v=P[i];if(v<lo[k])lo[k]=v;if(v>hi[k])hi[k]=v;}
  const bn=hi.map((v,k)=>Math.floor((v-lo[k])/cell)+1),bucketOf=(v,k)=>Math.min(bn[k]-1,Math.max(0,Math.floor((v-lo[k])/cell)));
  const start=new Uint32Array(bn[0]*bn[1]*bn[2]+1),items=new Uint32Array(count),slot=new Uint32Array(count),[bx,by,bz]=bn,[lx,ly,lz]=lo;
  for(let i=0;i<count;i++){
   const x=Math.min(bx-1,Math.max(0,Math.floor((P[i*3]-lx)/cell))),y=Math.min(by-1,Math.max(0,Math.floor((P[i*3+1]-ly)/cell))),z=Math.min(bz-1,Math.max(0,Math.floor((P[i*3+2]-lz)/cell)));
   slot[i]=(x*by+y)*bz+z;start[slot[i]+1]++;
  }
  for(let c=0;c<start.length-1;c++)start[c+1]+=start[c];
  {const next=start.slice(0,-1);for(let i=0;i<count;i++)items[next[slot[i]]++]=i;}
  const visitNear=(a,b,visit)=>{
   const x0=bucketOf(a[0],0),x1=bucketOf(b[0],0),y0=bucketOf(a[1],1),y1=bucketOf(b[1],1),z0=bucketOf(a[2],2),z1=bucketOf(b[2],2);
   for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++)for(let z=z0;z<=z1;z++){const c=(x*bn[1]+y)*bn[2]+z;for(let k=start[c];k<start[c+1];k++)visit(items[k]);}
  };
  const snap=(pt,hint)=>{
   const h=V(...hint).normalize();let best=-1;
   for(const reach of [.10,.30,4]){
    let bd=Infinity;
    visitNear(pt.map(v=>v-reach),pt.map(v=>v+reach),i=>{
     if(N[i*3]*h.x+N[i*3+1]*h.y+N[i*3+2]*h.z<.3)return;
     const dx=P[i*3]-pt[0],dy=P[i*3+1]-pt[1],dz=P[i*3+2]-pt[2],d=dx*dx+dy*dy+dz*dz;if(d<bd){bd=d;best=i;}
    });
    if(best>=0)return best;
   }
   return best;
  };
  const groups=[];
  for(const m of MUSCLE_ATLAS)for(const s of [-1,1]){
   const a=[m.a[0]*s,m.a[1],m.a[2]],b=[m.b[0]*s,m.b[1],m.b[2]],n=[m.n[0]*s,m.n[1],m.n[2]];
   const ia=snap(a,n),ib=snap(b,n);if(ia<0||ib<0)continue;
   const A=V(P[ia*3],P[ia*3+1],P[ia*3+2]),Bp=V(P[ib*3],P[ib*3+1],P[ib*3+2]);
   const f=V(N[ia*3]+N[ib*3],N[ia*3+1]+N[ib*3+1],N[ia*3+2]+N[ib*3+2]).normalize();
   const side=s<0?'L':'R',chName=m.ch==='static'||m.ch==='abs'||m.ch==='back'||m.ch==='traps'?m.ch:m.ch+side;
   const key=m.group+side;let gi=groups.findIndex(x=>x.key===key);if(gi<0){gi=groups.length;groups.push({key,name:m.group,side,parts:[]});}groups[gi].anchors=(groups[gi].anchors||[]).concat([[ia,ib]]);
   const r=Math.max(m.wa,m.wb)*1.05+.012;
   const part={A,AB:Bp.clone().sub(A),f,wa:m.wa,wb:m.wb,bias:m.bias,shape:m.shape,crisp:m.crisp,p:profile.p*m.p,
    height:m.h*unit*(profile.groups[m.group]??1),channel:Math.max(0,DEF_CHANNELS.indexOf(chName)),
    lo:V(Math.min(A.x,Bp.x)-r,Math.min(A.y,Bp.y)-r,Math.min(A.z,Bp.z)-r),hi:V(Math.max(A.x,Bp.x)+r,Math.max(A.y,Bp.y)+r,Math.max(A.z,Bp.z)+r)};
   part.len2=part.AB.lengthSq();groups[gi].parts.push(part);
  }
  const H=new Float32Array(count),dominant=new Float32Array(count),channel=new Uint8Array(count),group=new Int16Array(count).fill(-1),gv=new Float32Array(count);
  for(const [gi,grp] of groups.entries()){
   const touched=[];
   for(const q of grp.parts){
    const {A,AB,f,lo,hi}=q;
    visitNear([lo.x,lo.y,lo.z],[hi.x,hi.y,hi.z],i=>{
     const x=P[i*3],y=P[i*3+1],z=P[i*3+2];
     if(x<lo.x||x>hi.x||y<lo.y||y>hi.y||z<lo.z||z>hi.z)return;
     const nx=N[i*3],ny=N[i*3+1],nz=N[i*3+2],facing=nx*f.x+ny*f.y+nz*f.z;if(facing<-.15)return;
     const px=x-A.x,py=y-A.y,pz=z-A.z,t=(px*AB.x+py*AB.y+pz*AB.z)/q.len2;
     const l=(t-q.bias)/(t<q.bias?q.bias:1-q.bias);if(l<=-1||l>=1)return;
     const tc=clamp(t),qx=px-AB.x*tc,qy=py-AB.y*tc,qz=pz-AB.z*tc,depth=qx*f.x+qy*f.y+qz*f.z;
     const across=Math.hypot(qx-f.x*depth,qy-f.y*depth,qz-f.z*depth),w=q.wa+(q.wb-q.wa)*tc,c=across/w;if(c>=1)return;
     // Crisp parts (abs, serratus digits, pectoral edge) are rounded pads; the rest have crisp
     // side borders but fade smoothly along their length into tendon, like real fusiform bellies.
     const dd=depth/(4*w);let d2,along=1;
     if(q.crisp){const d=q.shape===2?Math.sqrt(l*l+c*c):Math.pow(Math.pow(Math.abs(l),q.shape)+Math.pow(c,q.shape),1/q.shape);d2=d*d+dd*dd;}
     else{d2=c*c+dd*dd;along=1.2*Math.pow(1-l*l,.8);}
     if(d2>=1)return;
     const gate=clamp((facing+.15)/.5),v=q.height*Math.pow(1-d2,q.p)*along*gate*gate*(3-2*gate);
     if(v>gv[i]){if(gv[i]===0)touched.push(i);gv[i]=v;if(v>dominant[i]){dominant[i]=v;channel[i]=q.channel;group[i]=gi;}}
    });
   }
   for(const i of touched){H[i]+=gv[i];gv[i]=0;}
  }
  // Neighbouring groups that overlap do not stack into a double bulge: the strongest belly leads.
  for(let i=0;i<count;i++)H[i]=dominant[i]+.25*(H[i]-dominant[i]);
  // Mesh neighbourhood (CSR) for band-pass and crease measures on the actual surface.
  const degree=new Uint32Array(count+1);for(let k=0;k<index.length;k++)degree[index[k]+1]+=2;
  for(let i=0;i<count;i++)degree[i+1]+=degree[i];
  const fill=degree.slice(0,count),adjacent=new Uint32Array(degree[count]);
  for(let k=0;k<index.length;k+=3)for(let e=0;e<3;e++){const a=index[k+e],b=index[k+(e+1)%3];adjacent[fill[a]++]=b;adjacent[fill[b]++]=a;}
  const smooth=(source,iterations)=>{
   let x=Float32Array.from(source),y=new Float32Array(count);
   for(let it=0;it<iterations;it++){for(let i=0;i<count;i++){let s=0;const o=degree[i],e=degree[i+1];for(let k=o;k<e;k++)s+=x[adjacent[k]];y[i]=e>o?.5*x[i]+.5*s/(e-o):x[i];}[x,y]=[y,x];}
   return x;
  };
  // Low-pass over ~3 cm (normalised convolution on a 2 cm grid): the relief keeps only part
  // of its bulk, so silhouettes, gear fit and contacts stay those of the authored body.
  const lowpass=values=>{
   const step=.02,n0=Math.floor((hi[0]-lo[0])/step)+2,n1=Math.floor((hi[1]-lo[1])/step)+2,n2=Math.floor((hi[2]-lo[2])/step)+2,size=n0*n1*n2;
   const sum=new Float32Array(size),weight=new Float32Array(size),fx=new Float32Array(count),fy=new Float32Array(count),fz=new Float32Array(count);
   for(let i=0;i<count;i++){
    fx[i]=Math.min(n0-1.001,Math.max(0,(P[i*3]-lo[0])/step-.5));fy[i]=Math.min(n1-1.001,Math.max(0,(P[i*3+1]-lo[1])/step-.5));fz[i]=Math.min(n2-1.001,Math.max(0,(P[i*3+2]-lo[2])/step-.5));
    const c=(Math.round(fx[i])*n1+Math.round(fy[i]))*n2+Math.round(fz[i]);sum[c]+=values[i];weight[c]++;
   }
   // Three separable [1 1 1] box passes (normalised convolution, zero outside the grid).
   const blur=(grid,len,stride,outer)=>{for(let r=0;r<outer.length;r++){const base=outer[r];let previous=0;for(let k=0;k<len;k++){const c=base+k*stride,current=grid[c];grid[c]=previous+current+(k<len-1?grid[c+stride]:0);previous=current;}}};
   const rows=(a,b,sa,sb)=>{const out=new Uint32Array(a*b);for(let i=0;i<a;i++)for(let j=0;j<b;j++)out[i*b+j]=i*sa+j*sb;return out;};
   const alongZ=rows(n0,n1,n1*n2,n2),alongY=rows(n0,n2,n1*n2,1),alongX=rows(n1,n2,n2,1);
   for(let pass=0;pass<3;pass++)for(const grid of [sum,weight]){blur(grid,n2,1,alongZ);blur(grid,n1,n2,alongY);blur(grid,n0,n1*n2,alongX);}
   const out=new Float32Array(count);
   for(let i=0;i<count;i++){
    const bx0=Math.floor(fx[i]),by0=Math.floor(fy[i]),bz0=Math.floor(fz[i]),tx=fx[i]-bx0,ty=fy[i]-by0,tz=fz[i]-bz0;let a=0,w=0;
    for(let corner=0;corner<8;corner++){const dx=corner&1,dy=corner>>1&1,dz=corner>>2&1,k=(dx?tx:1-tx)*(dy?ty:1-ty)*(dz?tz:1-tz),c=((bx0+dx)*n1+by0+dy)*n2+bz0+dz;a+=sum[c]*k;w+=weight[c]*k;}
    out[i]=w>1e-6?a/w:0;
   }
   return out;
  };
  // Limbs keep more of their bellies (biceps peak, deltoid cap, calf) than the torso.
  const low=lowpass(H),D=new Float32Array(count),limbs=new Float32Array(count);
  for(let i=0;i<count;i++){const x=Math.abs(P[i*3]),y=P[i*3+1],limb=Math.max(y>1.38?smooth01((x-.34)/.10):0,1-smooth01((y-.66)/.12)),keep=profile.keep+(1-profile.keep)*.55*limb;limbs[i]=limb;D[i]=H[i]-(1-keep)*low[i];
   // Belts and the waistband sit below the navel: there the relief only carves, never bulges (gear fit).
   if(y<1.28&&y>.95)D[i]=Math.min(D[i],.0005+.02*smooth01((y-1.225)/.055));
   // Boots cover the shin and ankle: the leg relief tapers out above the boot collar.
   if(y<.38)D[i]*=smooth01((y-.31)/.07);
   D[i]=Math.max(-.012,Math.min(.016,D[i]));}
  const near=smooth(D,9),delta=new Int16Array(count*4),normal=new Int8Array(count*4);
  const mass=new Int16Array(count),positions=Float32Array.from(P),M2=new Float32Array(count*3);
  for(let i=0;i<count;i++){const m=muscleMass(P[i*3],P[i*3+1],P[i*3+2],profile),off=D[i]+m;mass[i]=Math.round(clamp(m/MASS_RANGE)*32767);positions[i*3]+=N[i*3]*off;positions[i*3+1]+=N[i*3+1]*off;positions[i*3+2]+=N[i*3+2]*off;}
  for(let k=0;k<index.length;k+=3){
   const a=index[k]*3,b=index[k+1]*3,c=index[k+2]*3,ux=positions[b]-positions[a],uy=positions[b+1]-positions[a+1],uz=positions[b+2]-positions[a+2],vx=positions[c]-positions[a],vy=positions[c+1]-positions[a+1],vz=positions[c+2]-positions[a+2];
   const nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;M2[a]+=nx;M2[a+1]+=ny;M2[a+2]+=nz;M2[b]+=nx;M2[b+1]+=ny;M2[b+2]+=nz;M2[c]+=nx;M2[c+1]+=ny;M2[c+2]+=nz;
  }
  for(let i=0;i<count;i++){const l=Math.hypot(M2[i*3],M2[i*3+1],M2[i*3+2])||1;M2[i*3]/=l;M2[i*3+1]/=l;M2[i*3+2]/=l;}
  const q=v=>Math.max(-32767,Math.min(32767,Math.round(v/DEF_RANGE*32767))),b=v=>Math.max(-127,Math.min(127,Math.round(v*127)));
  for(let i=0;i<count;i++){
   for(let k=0;k<3;k++){delta[i*4+k]=q(N[i*3+k]*D[i]);normal[i*4+k]=b(M2[i*3+k]-N[i*3+k]);}
   delta[i*4+3]=Math.round(channel[i]/32*32767);normal[i*4+3]=b(clamp((near[i]-D[i])/(unit*.40),-1,1)*(1-.4*limbs[i]));
  }
  return {delta,normal,mass,group,groups:groups.map(x=>x.name+' '+x.side),anchors:groups.map(x=>x.anchors),count};
 }
 const definition={
  channels:DEF_CHANNELS,atlas:MUSCLE_ATLAS,profiles:MUSCLE_PROFILES,range:DEF_RANGE,massRange:MASS_RANGE,mass:muscleMass,
  build(g,species){
   const P=g.attributes.position;let hash=2166136261;for(let i=0;i<P.array.length;i+=97)hash=Math.imul(hash^Math.round(P.array[i]*1e5),16777619)>>>0;
   const key=species+':'+P.count+':'+hash;if(!definitionCache.has(key))definitionCache.set(key,buildDefinition(g,MUSCLE_PROFILES[species]||MUSCLE_PROFILES.other));return definitionCache.get(key);
  },
  enabled:true, // a kill switch for future graphics settings and the A/B cost probe (qa/gotr-0037/perf.cjs)
  attach(mesh,coach){
   if(!definition.enabled)return false;
   const g=mesh.geometry,fur=Boolean(g.attributes.avatarFurFlex),count=g.attributes.position.count;let data;
   if(fur){
    const source=coach.definitionData,roots=g.userData.furRoots;if(!source||!roots||roots.length!==count)return false;
    data={delta:new Int16Array(count*4),normal:new Int8Array(count*4),mass:new Int16Array(count)};
    for(let i=0;i<count;i++){const j=roots[i]*4;data.delta.set(source.delta.subarray(j,j+4),i*4);data.normal.set(source.normal.subarray(j,j+4),i*4);data.mass[i]=source.mass[roots[i]];}delete g.userData.furRoots;
   }else{data=definition.build(g,coach.species);if(!data)return false;coach.definitionData=data;}
   g.setAttribute('avatarDefinition',new THREE.BufferAttribute(data.delta,4,true));g.setAttribute('avatarDefinitionNormal',new THREE.BufferAttribute(data.normal,4,true));g.setAttribute('avatarMass',new THREE.BufferAttribute(data.mass,1,true));
   if(!coach.definition){const profile=MUSCLE_PROFILES[coach.species]||MUSCLE_PROFILES.other;coach.definition={values:new Float32Array(24).fill(1),scale:{value:[0,1,2,3,4,5].map(()=>new THREE.Vector4(1,1,1,1))},look:{value:new THREE.Vector2(profile.cavity,profile.sheen)},detail:definition.quality};}
   return true;
  },
  scale(coach,index,g){const d=g.attributes.avatarDefinition;if(!d||!coach.definition)return 0;const k=Math.round(d.array[index*4+3]/32767*32),v=coach.definition.scale.value[k>>2];return v?v.getComponent(k&3):0;},
  update(coach){
   const def=coach.definition;if(!def)return;const s=def.values,a=coach.anatomy?.value||new Float32Array(14),j=coach.joints,m=coach.motionState||{},mix=(x,y,t)=>x+(y-x)*clamp(t);
   const up=V(0,1,0).applyQuaternion(j.chest.getWorldQuaternion(new THREE.Quaternion()));
   for(const [i,side] of ['L','R'].entries()){
    const shoulder=j['arm'+side].getWorldPosition(V()),elbow=j['elbow'+side].getWorldPosition(V()),hand=j['hand'+side].getWorldPosition(V());
    // Elevation: 0 with the upper arm hanging, 1 level with the shoulder (deltoid shortened, lat stretched).
    const raise=clamp(Math.acos(clamp(-elbow.clone().sub(shoulder).normalize().dot(up),-1,1))/(Math.PI/2)),active=(side==='L'?m.left:m.right)||0;
    const reach=clamp(hand.distanceTo(shoulder)/(shoulder.distanceTo(elbow)+elbow.distanceTo(hand)));
    s[1+i]=mix(.78,1.32,a[i]);s[3+i]=mix(.82,1.28,a[4+i]);s[5+i]=mix(.86,1.28,raise-.15+.25*active);
    s[7+i]=mix(.92,1.25,a[2+i])*(1-.18*clamp((reach*raise-.55)/.45));s[9+i]=mix(1.18,.80,raise*(.6+.4*reach));
    s[11+i]=mix(.92,1.25,.35+.65*active);s[15+i]=mix(.85,1.22,a[6+i]);s[17+i]=mix(.85,1.25,a[8+i]);
    s[19+i]=mix(.9,1.22,Math.abs(j.chest.rotation.y)*2.2+.3*active);
   }
   s[0]=1;s[13]=mix(.86,1.25,a[10]);s[14]=mix(.86,1.2,a[11]);s[21]=mix(.95,1.2,.5+.5*(m.guard??.6));
   const g=def.strength??1;for(let k=0;k<6;k++)def.scale.value[k].set(s[k*4]*g,s[k*4+1]*g,s[k*4+2]*g,s[k*4+3]*g);
  },
  // Adaptive quality (GOTR-0017 ladder): at the floor level the per-pixel crease/sheen and the
  // normal relief are skipped (the silhouette relief stays); one uniform shared by every rig.
  quality:{value:1},
  setQuality(level){definition.quality.value=level>0?1:0;},
  // Debug/QA: colour the skin by muscle group (labelled sheet). Returns group names.
  paint(coach,on){
   const g=coach.skin.geometry,c=g.attributes.color,data=coach.definitionData;if(!c||!data)return [];
   if(on){if(!g.userData.restColor)g.userData.restColor=Float32Array.from(c.array);const hue=k=>new THREE.Color().setHSL(((k*0.618034)%1),.62,.52);
    for(let i=0;i<data.count;i++){const k=data.group[i];const col=k<0?new THREE.Color(.18,.18,.18):hue(Math.floor(k/2));c.setXYZ(i,col.r,col.g,col.b);}}
   else if(g.userData.restColor)c.array.set(g.userData.restColor);
   c.needsUpdate=true;return data.groups;
  }
 };
 // Relief rides the rest surface before skinning (shadows included); its normal detail is
 // added after every other normal correction (axilla field, guard-shoulder bake) so the
 // muscle forms survive them. Creases darken the albedo, crests get a soft sheen.
 function definitionShader(shader,coach,main,fur){
  shader.uniforms.avatarDefScale=coach.definition.scale;
  shader.vertexShader=shader.vertexShader.replace('#include <common>',`#include <common>
attribute vec4 avatarDefinition;attribute vec4 avatarDefinitionNormal;attribute float avatarMass;uniform vec4 avatarDefScale[6];${main?'varying float avatarDefCavity;uniform float avatarDefDetail;':''}
float avatarDefK(){float c=floor(avatarDefinition.w*32.0+.5);return dot(avatarDefScale[int(c/4.0)],vec4(equal(vec4(mod(c,4.0)),vec4(0.0,1.0,2.0,3.0))));}`);
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>\ntransformed+=avatarDefinition.xyz*(${DEF_RANGE.toFixed(3)}*avatarDefK())+normal*(avatarMass*${MASS_RANGE.toFixed(3)});`);
  if(!main)return;
  shader.uniforms.avatarDefLook=coach.definition.look;shader.uniforms.avatarDefDetail=coach.definition.detail;
  shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`#include <project_vertex>
{float avatarK=avatarDefK();avatarDefCavity=avatarDefinitionNormal.w*avatarK;
#ifndef FLAT_SHADED
if(avatarDefDetail>0.0)vNormal=normalize(vNormal+normalMatrix*(bindMatrixInverse*vec4(qrotate(coachQ,(bindMatrix*vec4(avatarDefinitionNormal.xyz*avatarK,0.0)).xyz),0.0)).xyz);
#endif
}`);
  if(typeof shader.fragmentShader!=='string')return;
  if(fur)shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_begin>','#include <normal_fragment_begin>\n#ifdef DOUBLE_SIDED\nnormal*=faceDirection;geometryNormal=normal;\n#endif');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying float avatarDefCavity;uniform vec2 avatarDefLook;uniform float avatarDefDetail;')
   .replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.rgb*=1.0-avatarDefDetail*avatarDefLook.x*clamp(avatarDefCavity,0.0,1.0);')
   .replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor*=1.0-avatarDefDetail*avatarDefLook.y*clamp(-avatarDefCavity,0.0,1.0);');
 }
 const api={
  install(mesh,coach,body){
   const g=mesh.geometry,p=g.attributes.position,n=g.attributes.normal,morph=[],normalDelta=[];
   const fur=Boolean(g.attributes.avatarFurFlex),deformed=body&&!fur?g.clone():null;
   for(let i=0;i<p.count;i++){
    const x=p.getX(i),y=p.getY(i),z=p.getZ(i),u=Math.abs(x),side=x<0?0:1;let delta=V(),channel=13;
    if(body){
     if(u>.32&&u<.68&&y>1.44&&y<1.79){
      channel=z>=0?side:4+side;
      const belly=bell(u,.48,.12)*bell(y,1.62,.10)*edge(u,.32,.68,.04)*edge(y,1.44,1.79,.04),front=z>=0?1:-1;
      delta.set(Math.sign(x)*.0035*belly,(y-1.62)*.065*belly,front*.021*belly*Math.min(1,Math.abs(z)/.045));
     }else if(u<.29&&y>1.44&&y<1.70&&z>.04){
      channel=2+side;delta.z=.019*bell(u,.13,.10)*bell(y,1.555,.075)*clamp((z-.04)/.07)*edge(u,-1,.29,.04)*edge(y,1.44,1.70,.04);
     }else if(u>.08&&u<.32&&y>.57&&y<.96){
      channel=6+side;const fade=edge(u,.08,.32,.03)*edge(y,.57,.96,.04);delta.z=.016*bell(y,.77,.13)*clamp((z+.03)/.09)*fade;delta.x=Math.sign(x)*.005*bell(y,.76,.13)*fade;
     }else if(u>.10&&u<.30&&y>.22&&y<.53){
      channel=8+side;delta.z=-.014*bell(y,.38,.09)*clamp((.02-z)/.07)*edge(u,.10,.30,.03)*edge(y,.22,.53,.04);
     }else if(u<.28&&y>1.1&&y<1.47&&z>.04){
      channel=10;delta.z=.0115*bell(x,0,.20)*bell(y,1.30,.18)*clamp((z-.04)/.06)*edge(u,-1,.28,.04)*edge(y,1.1,1.44,.04);
     }else if(u<.30&&y>1.28&&y<1.72&&z<-.035){
      channel=11;delta.z=-.016*bell(u,.17,.10)*bell(y,1.50,.15)*clamp((-z-.035)/.06)*edge(u,-1,.30,.04)*edge(y,1.28,1.72,.04);
     }else if(y>1.80&&y<2.00&&z>.13&&u<.145){
      channel=12;delta.y=-.020*bell(x,0,.11)*bell(y,1.88,.055)*clamp((z-.13)/.08)*clamp((y-1.80)/.04)*clamp((2-y)/.06);
     }
    }
    morph.push(delta.x,delta.y,delta.z,channel);
    if(deformed)deformed.attributes.position.setXYZ(i,x+delta.x,y+delta.y,z+delta.z);
   }
   if(deformed){deformed.computeVertexNormals();for(let i=0;i<p.count;i++)normalDelta.push(deformed.attributes.normal.getX(i)-n.getX(i),deformed.attributes.normal.getY(i)-n.getY(i),deformed.attributes.normal.getZ(i)-n.getZ(i));deformed.dispose();}
   else for(let i=0;i<p.count;i++)normalDelta.push(0,0,0);
   g.setAttribute('avatarMuscle',new THREE.Float32BufferAttribute(morph,4));g.setAttribute('avatarMuscleNormal',new THREE.Float32BufferAttribute(normalDelta,3));
   if(!coach.anatomy)coach.anatomy={value:new Float32Array(14)};
   const defined=Boolean(body&&definition.attach(mesh,coach));
   for(const material of [mesh.material,mesh.customDepthMaterial,mesh.customDistanceMaterial]){
    const previous=material.onBeforeCompile,key=material.customProgramCacheKey;
    material.onBeforeCompile=shader=>{
     previous(shader);shader.uniforms.avatarActivation=coach.anatomy;
     shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nuniform float avatarActivation[14];attribute vec4 avatarMuscle;attribute vec3 avatarMuscleNormal;');
     shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed+=avatarMuscle.xyz*avatarActivation[int(avatarMuscle.w)];');
     shader.vertexShader=shader.vertexShader.replace('#include <beginnormal_vertex>','#include <beginnormal_vertex>\nobjectNormal=normalize(objectNormal+avatarMuscleNormal*avatarActivation[int(avatarMuscle.w)]);');
     if(defined)definitionShader(shader,coach,material===mesh.material,fur);
    };
    material.customProgramCacheKey=()=>key()+`-anatomy78-${fur}-def${defined?2:0}`;
   }
  },
  update(coach){
   if(!coach.anatomy)return;const a=coach.anatomy.value,j=coach.joints,m=coach.motionState||{},expression=coach.expression||{};
   for(const [i,side] of ['L','R'].entries()){
    const shoulder=coach.point(j['arm'+side]),elbow=coach.point(j['elbow'+side]),hand=coach.point(j['hand'+side]);
    const extension=clamp(elbow.clone().sub(shoulder).normalize().dot(hand.clone().sub(elbow).normalize())*.5+.5);
    const active=(side==='L'?m.left:m.right)||0;
    a[i]=clamp(.16+.80*(1-extension)+.18*active);a[4+i]=clamp(.1+.85*extension+.15*active);
    a[2+i]=clamp(.12+.78*active+.20*Math.abs(j.chest.rotation.y)+.10*(m.load||0));
    const hip=coach.point(j['thigh'+side]),knee=coach.point(j['knee'+side]),foot=coach.point(j['foot'+side]);
    const kneeLoad=1-clamp(knee.clone().sub(hip).normalize().dot(foot.clone().sub(knee).normalize())*.5+.5);
    a[6+i]=clamp(.14+kneeLoad*1.2+(m.strike||0)*.30+(m.load||0)*.18+(m.drive||0)*.12);a[8+i]=clamp(.12+Math.abs(j['foot'+side].rotation.x)*1.8+(m.strike||0)*.20+(m.drive||0)*.15);
   }
   const breath=.5+.5*Math.sin((coach.renderTime||0)*2.2);
   a[10]=clamp(.17+Math.abs(j.chest.rotation.y)*.55+(m.hurt||0)*.5+breath*.13);
   a[11]=clamp(.16+Math.abs(j.chest.rotation.y)*.55+Math.abs(j.spine.rotation.x)*.8+(m.strike||0)*.32+(m.rope||0)*(.28*(m.load||0)+.12*(m.drive||0)));
   a[12]=expression.jaw||0;a[13]=0;
   definition.update(coach);
  },
  deform(p,coach,index,g){const m=g.attributes.avatarMuscle;if(m&&coach.anatomy){const strength=coach.anatomy.value[m.getW(index)];p.x+=m.getX(index)*strength;p.y+=m.getY(index)*strength;p.z+=m.getZ(index)*strength;}
   const d=g.attributes.avatarDefinition;if(d){const k=definition.scale(coach,index,g)*DEF_RANGE/32767;p.x+=d.array[index*4]*k;p.y+=d.array[index*4+1]*k;p.z+=d.array[index*4+2]*k;}
   const mass=g.attributes.avatarMass;if(mass){const n=g.attributes.normal,m=mass.array[index]/32767*MASS_RANGE;p.x+=n.getX(index)*m;p.y+=n.getY(index)*m;p.z+=n.getZ(index)*m;}return p;},
  definition,
  express(coach,state){
   const {move,strike,hurt,hit,presentation,time}=state,head=coach.joints.head;
   if(!coach.faceActing){
    const inner=new THREE.Mesh(new THREE.SphereGeometry(1,32,16),new THREE.MeshStandardMaterial({color:0x201a1b,roughness:.92}));
    inner.material.color.convertSRGBToLinear();inner.position.set(0,.025,coach.species==='rabbit'?.247:.282);inner.scale.set(.039,.001,.007);inner.name='Reactive mouth interior';head.add(inner);
    const lip=coach.curve(head,[V(-.039,.017,inner.position.z+.001),V(0,.009,inner.position.z+.008),V(.039,.017,inner.position.z+.001)],coach.cream,.0026);lip.name='Animated lower lip';
    const marks=new Set(coach.damageMarks.map(x=>x.mark));
    const eyes=coach.facialRest.filter(x=>x.eye&&!marks.has(x.part));
    const brows=[];for(const part of head.children){if(!part.geometry||part.userData.eye||marks.has(part)||part===inner||part===lip)continue;part.geometry.computeBoundingBox();const c=part.geometry.boundingBox.getCenter(V()).multiply(part.scale).add(part.position);if(c.y>.18&&c.y<.235&&Math.abs(c.x)>.035&&Math.abs(c.x)<.15&&c.z>.12)brows.push({part,x:part.position.x,y:part.position.y,cx:c.x,cy:c.y,z:part.rotation.z,side:c.x<0?-1:1});}
    coach.faceActing={inner,lip,eyes,brows};
   }
   const focus=clamp(strike*.26+(['slip','roll','guard'].includes(move)?.10:0)),headHit=hit.part==='head',bodyHit=hit.part==='body';
   const jaw=clamp(hurt*(headHit?.70:bodyHit?.95:.10)+(strike||0)*.10+(1-(state.stamina??1))*.22);
   const blinkPhase=((time||0)%4.6),blink=blinkPhase>4.40?Math.sin((blinkPhase-4.40)/.20*Math.PI)**2:0;
   coach.expression={jaw,focus,headFlinch:headHit?hurt:0,bodyFlinch:bodyHit?hurt:0,side:hit.side||0};
   const face=coach.faceActing;face.inner.visible=jaw>.08;face.inner.scale.y=.001+.018*jaw;face.lip.position.y=-.018*jaw;
   for(const eye of face.eyes){const side=eye.part.position.x<0?-1:1,flinch=hurt*(headHit?(side===(hit.side||1)?.82:.42):bodyHit?.50:.15);eye.part.scale.y=eye.sy*Math.max(.12,1-Math.max(blink,focus+flinch));eye.part.position.z=eye.z;}
   for(const brow of face.brows){const angle=brow.side*(focus*.09-hurt*.07);brow.part.position.x=brow.x+brow.cx*(1-Math.cos(angle))+brow.cy*Math.sin(angle);brow.part.position.y=brow.y+brow.cy*(1-Math.cos(angle))-brow.cx*Math.sin(angle)+.003*(hurt-focus);brow.part.rotation.z=brow.z+angle;}
   for(const part of head.children)if(part.userData.tooth)part.visible=jaw>.5;
   coach.painMouth.visible=false;
   if(presentation?.mode==='winner'){face.inner.visible=false;face.lip.position.y=0;}
   return true;
  }
 };
 window.AvatarAnatomy=api;
})();
