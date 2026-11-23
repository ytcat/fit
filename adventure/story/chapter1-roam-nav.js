/* Chapter 1 exploration waypoints. No story state, GPS or movement side effects. */
(function(root){
 'use strict';
 const TARGETS=Object.freeze({
  bruno:{zone:'oldtown',x:27,z:-6.85,name:'חדר הכושר של ברונו'},
  market:{zone:'market',x:0,z:-.92,name:'דוכן הפירות בשוק'},
  otto:{zone:'otto',x:.90,z:-3.14,name:'החנות של אוטו'},
  docks:{zone:'docks',x:5.65,z:-13.05,name:'רציף הנמל'}
 });
 const RADIUS=.76, SPACING=.33, DIST=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
 function create(world){
  const grids={}, fields=new Map();
  const visible=(id,a,b)=>{
   const n=Math.ceil(DIST(a,b)/.105);
   for(let i=1;i<n;i++){const u=i/n;if(!world.allowed(id,a.x+(b.x-a.x)*u,a.z+(b.z-a.z)*u))return false;}return true;
  };
  function grid(id){
   if(grids[id])return grids[id];
   const a=world.ZONES[id].area;
   const x0=Math.min(...a.map(p=>p[0])), z0=Math.min(...a.map(p=>p[2]));
   const nx=Math.ceil((Math.max(...a.map(p=>p[1]))-x0)/SPACING), nz=Math.ceil((Math.max(...a.map(p=>p[3]))-z0)/SPACING);
   const nodes=[], offsets=new Map(), coords=(i,j)=>i*nz+j;
   for(let i=0;i<nx;i++)for(let j=0;j<nz;j++){
    const x=x0+(i+.5)*SPACING,z=z0+(j+.5)*SPACING;
    if(world.allowed(id,x,z)){offsets.set(coords(i,j),nodes.length);nodes.push({x,z,i,j,edges:[]});}
   }
   for(const p of nodes)for(let di=-1;di<=1;di++)for(let dj=-1;dj<=1;dj++){
    if((di||dj)&&p.i+di>=0&&p.i+di<nx&&p.j+dj>=0&&p.j+dj<nz){
      const k=offsets.get(coords(p.i+di,p.j+dj));
      if(k!==undefined&&visible(id,p,nodes[k]))p.edges.push([k,Math.hypot(di,dj)*SPACING]);
    }
   }
   return grids[id]=nodes;
  }
  function field(id,target){
   const key=id+':'+target.x+','+target.z;
   if(fields.has(key))return fields.get(key);
   const nodes=grid(id), d=new Float64Array(nodes.length).fill(Infinity), prev=new Int32Array(nodes.length).fill(-1), heap=[];
   function push(item){let i=heap.length;heap.push(item);while(i>0){const p=(i-1)>>1;if(heap[p][0]<=item[0])break;heap[i]=heap[p];i=p;}heap[i]=item;}
   function pop(){const h=heap[0],c=heap.pop();if(heap.length){let i=0;while(i*2+1<heap.length){let j=i*2+1;if(j+1<heap.length&&heap[j+1][0]<heap[j][0])j++;if(c[0]<=heap[j][0])break;heap[i]=heap[j];i=j;}heap[i]=c;}return h;}
   for(let i=0;i<nodes.length;i++){const k=DIST(nodes[i],target);if(k<.88&&visible(id,nodes[i],target)){d[i]=k;push([k,i]);}}
   while(heap.length){const [a,i]=pop();if(a!==d[i])continue;for(const [j,b] of nodes[i].edges)if(a+b<d[j]){d[j]=a+b;prev[j]=i;push([d[j],j]);}}
   const result={nodes,d,prev};fields.set(key,result);return result;
  }
  function local(id,from,to){
   if(visible(id,from,to))return {next:to,metres:DIST(from,to)};
   const {nodes,d,prev}=field(id,to);
   let best=-1, score=Infinity;
   for(let i=0;i<nodes.length;i++){
    const k=DIST(from,nodes[i]);
    if(k<1.12&&k+d[i]<score&&visible(id,from,nodes[i])){score=k+d[i];best=i;}
   }
   if(best<0)return null;
   // "String pulling" reduces stair steps and points immediately toward the turn, not a cell corner.
   const chain=[];let i=best;while(i>=0&&chain.length<nodes.length){chain.push(nodes[i]);i=prev[i];}chain.push(to);
   let j=0,total=0,start=from,next=null;
   while(j<chain.length){
    let last=j;
    for(let k=j+1;k<chain.length;k++)if(visible(id,start,chain[k]))last=k;
    next??=chain[last];total+=DIST(start,chain[last]);start=chain[last];j=last+1;
   }
   return {next,metres:total};
  }
  function plan(s,key){
   const t=TARGETS[key];if(!Object.hasOwn(TARGETS,key)||!world.ZONES[s.id])return null;
   if(s.id===t.zone){
    if(DIST(s,t)<=RADIUS)return {next:t,metres:0,arrived:true};
    const p=local(s.id,s,t);return p?{...p,arrived:false}:null;
   }
   const visited=new Set(),q=[{id:s.id,path:[]}];let path=null;
   while(q.length){const n=q.shift();if(n.id===t.zone){path=n.path;break;}if(visited.has(n.id))continue;visited.add(n.id);
    for(const g of world.ZONES[n.id].gates)if(!visited.has(g.to))q.push({id:g.to,path:[...n.path,[n.id,g]]});}
   if(!path)return null;
   let from=s, next=null,metres=0,firstGate=null,zone=s.id;
   for(const [id,g] of path){
    const r=local(id,from,g);if(!r)return null;
    next??=r.next;firstGate??=g;metres+=r.metres;
    const other=world.ZONES[g.to].gates.find(a=>a.to===id);if(!other)return null;
    from={x:other.inX,z:other.inZ};zone=g.to;
   }
   const end=local(zone,from,t);if(!end)return null;
   return {next,metres:metres+end.metres,gate:firstGate,arrived:false};
  }
  return {plan,local};
 }
 const api={TARGETS,RADIUS,create};
 if(typeof module==='object'&&module.exports)module.exports=api;else root.Chapter1RoamNav=api;
})(globalThis);
