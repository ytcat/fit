/* Independent, opt-in preview. Stock film sets retain local coordinates; portals join districts explicitly. */
(function (root) {
 'use strict';
 const box=(x0,x1,z0,z1)=>[x0,x1,z0,z1];
 const z=(set,name,home,ground,area,objects,gates)=>({set,name,home,ground,area,objects,gates});
 const gate=(id,to,x,z,inX,inZ,yaw)=>({id,to,x,z,inX,inZ,yaw});
 const ZONES={
  oldtown:z('dream_street','Old Town',[3.5,5,1.9642469647238323],0,[
   box(-7.5,31,3.45,7.82),box(-7.5,31,-3.65,3.45),box(-7.5,30.9,-7.05,-3.65),box(26.18,27.82,-7.42,-6.75)
  ],[
   box(-4.95,-4.3,5.98,6.73),box(-4.8,.82,4.79,6.88),box(-6.45,-5.56,6.0,7.12),
   box(.04,.65,4.14,4.37),box(4.9,5.5,4.14,4.45),box(8.24,8.78,4.14,4.49),box(11.10,12.10,4.9,5.9),
   box(13.15,13.68,4.14,4.45),box(19.4,19.99,4.14,4.39),box(24.42,24.99,4.14,4.39),
   box(27.46,28.53,5.06,6.14),box(16.91,17.92,-5.91,-4.88),
   // Native parked compact and procedural red car; live traffic is separate.
   box(5.85,10.95,-3.62,-1.28),box(27.38,31.0,1.31,3.58),
   box(6.10,7.10,-5.81,-4.81),box(15.72,16.28,-4.41,-3.89),box(1.72,2.28,-4.41,-3.89),
   box(19.42,19.98,-4.27,-3.72),box(24.42,24.98,-4.27,-3.72)
  ],[gate('to-market','market',30.2,5.75,28.95,5.75,-1.57)]),
  market:z('dream_market','Market Row',[-23.3,1.0,1.57],0,[box(-26,26,-1.64,5.04)],[
   box(-15.04,-13.55,-1.63,-.89),box(12.21,13.01,-1.63,-.91),box(17.99,18.79,1.50,2.29),
   box(-19.89,-19.11,1.80,2.60),box(20.2,21,-1.63,-1.10)
  ],[gate('to-oldtown','oldtown',-24.9,1.05,-23.3,1.05,1.57),gate('to-otto','otto',24.9,1.05,23.3,1.05,-1.57)]),
  otto:z('dream_shop','Otto’s Corner',[-9.6,-2.03,1.57],0,[box(-12.4,12.4,-3.52,10.5)],[],[
   gate('to-market','market',-11.28,-2.02,-9.75,-2.02,1.57),gate('to-docks','docks',11.28,-2.02,9.75,-2.02,-1.57)
  ]),
  docks:z('dream_docks','Dockside Quay',[1.5,-13,3.14],-.015,[box(-5.5,8.5,-16.25,-11.65)],[
    ...[-4,0,4,8].map(x=>box(x-.44,x+.44,-14.84,-13.96))
  ],[gate('to-otto','otto',1.5,-12.25,1.5,-13.53,Math.PI)])
 };
 const YAW=-1,RIGHT=[Math.cos(YAW),-Math.sin(YAW)],UP=[-Math.sin(YAW),-Math.cos(YAW)];
 const SPEED=2.22, NEAR=1.1,SAVE='fit.private.chapter1-roam.v1';
 const inside=(x,q,b)=>x>=b[0]&&x<=b[1]&&q>=b[2]&&q<=b[3];
 const finite=x=>typeof x==='number'&&Number.isFinite(x);
 function allowed(id,x,q){const a=Object.hasOwn(ZONES,id)?ZONES[id]:null;return !!a&&finite(x)&&finite(q)&&a.area.some(b=>inside(x,q,b))&&!a.objects.some(b=>inside(x,q,b));}
 function height(id,x,z){if(id==='oldtown')return z>=-3.58&&z<=3.46?-.15:0;
  if(id==='otto')return z>=-.18&&z<=7.58?-.15:0;
  return ZONES[id]?.ground??0;}
 function spawn(id='oldtown',p){if(!Object.hasOwn(ZONES,id))id='oldtown';const a=ZONES[id], ok=allowed(id,p?.x,p?.z),[x,q,ry]=a.home;
  return {id,x:ok?p.x:x,z:ok?p.z:q,ry:ok&&finite(p.ry)?Math.atan2(Math.sin(p.ry),Math.cos(p.ry)):ry,dist:0,walking:false};}
 function restore(raw){try{const p=JSON.parse(raw);return p&&Object.hasOwn(ZONES,p.id)?spawn(p.id,p):spawn();}catch{return spawn();}}
 function serialize(s){return JSON.stringify({id:s.id,x:s.x,z:s.z,ry:s.ry});}
 function nearby(s){return (Object.hasOwn(ZONES,s.id)?ZONES[s.id]:null)?.gates.find(p=>Math.hypot(p.x-s.x,p.z-s.z)<=NEAR)||null;}
 function transfer(s,id){const p=nearby(s);if(!p||p.id!==id)return null;const at=ZONES[p.to].gates.find(t=>t.to===s.id);
  return at?spawn(p.to,{x:at.inX,z:at.inZ,ry:at.yaw}):null;}
 function move(s,h,v,dt,blocked=()=>false){s.walking=false;if(!finite(dt)||dt<=0||!finite(h)||!finite(v))return s;
  const a=Math.hypot(h,v);if(a<1e-6)return s;
  const speed=SPEED*Math.min(a,1)/a, dx=(h*RIGHT[0]+v*UP[0])*speed,dz=(h*RIGHT[1]+v*UP[1])*speed;
  // Keep collision robust under a dropped frame and disallow crossing any thin object between discrete samples.
  const n=Math.max(1,Math.ceil(Math.min(dt,.1)/.018)),step=Math.min(dt,.1)/n,ox=s.x,oz=s.z;
  for(let i=0;i<n;i++){const x=s.x+dx*step,q=s.z+dz*step;if(allowed(s.id,x,q)&&!blocked(s.id,x,q)){s.x=x;s.z=q;}
   else if(allowed(s.id,x,s.z)&&!blocked(s.id,x,s.z))s.x=x;else if(allowed(s.id,s.x,q)&&!blocked(s.id,s.x,q))s.z=q;}
  const dist=Math.hypot(s.x-ox,s.z-oz);if(dist>1e-6){s.walking=true;s.dist+=dist;s.ry=Math.atan2(s.x-ox,s.z-oz);}return s;
 }
 function exposed(id){
  // Union edge extraction: only outer limits, never crossings between overlapping surface rectangles.
  if(!Object.hasOwn(ZONES,id))return [];const rect=ZONES[id].area, xs=[...new Set(rect.flatMap(a=>a.slice(0,2)))].sort((a,b)=>a-b), zs=[...new Set(rect.flatMap(a=>a.slice(2,4)))].sort((a,b)=>a-b);
  const result=[],m=.005, hit=(x,z)=>rect.some(b=>inside(x,z,b));
  for(const x of xs)for(let i=0;i<zs.length-1;i++){const q=(zs[i]+zs[i+1])/2,a=hit(x-m,q),b=hit(x+m,q);if(a!==b)result.push({x0:x,z0:zs[i],x1:x,z1:zs[i+1],dx:a?1:-1,dz:0});}
  for(const q of zs)for(let i=0;i<xs.length-1;i++){const x=(xs[i]+xs[i+1])/2,a=hit(x,q-m),b=hit(x,q+m);if(a!==b)result.push({x0:xs[i],z0:q,x1:xs[i+1],z1:q,dx:0,dz:a?1:-1});}
  return result;
 }
 const api={ZONES,RIGHT,UP,YAW,SPEED,SAVE,allowed,height,spawn,move,nearby,transfer,serialize,restore,exposed};
 if(typeof module==='object'&&module.exports)module.exports=api;else root.Chapter1World=api;
})(globalThis);
