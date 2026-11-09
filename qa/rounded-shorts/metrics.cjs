// Run from the repository root. Baseline is the source before the shorts repair.
const fs=require('fs'),vm=require('vm'),crypto=require('crypto'),{execFileSync}=require('child_process');
const stage=process.argv[2];
if(!['before','after'].includes(stage))throw new Error('Usage: node qa/rounded-shorts/metrics.cjs before|after');
global.THREE=require('../../assets/vendor/three.min.js');global.window=global;
global.document={createElement:()=>({getContext:()=>new Proxy({},{get:(_,key)=>key==='createImageData'?((w,h)=>({data:new Uint8ClampedArray(w*h*4)})):()=>{}})})};
for(const file of ['boxing-routines.js','boxing-coach-v2.js']){
 const source=stage==='before'&&file==='boxing-coach-v2.js'?execFileSync('git',['show','37255d5:'+file],{encoding:'utf8'}):fs.readFileSync(file,'utf8');
 vm.runInThisContext(source);
}
const coach=new LionCoach(JSON.parse(fs.readFileSync('assets/models/coach-surface-v2.json'))),g=coach.shorts.geometry,attrs=g.attributes,p=attrs.position,regions={hem:[],lower:[]};
let upperWidth=0,meshes=0;
for(let i=0;i<p.count;i++){
 const y=p.getY(i);
 if(y>1.035&&y<1.045)upperWidth=Math.max(upperWidth,Math.abs(p.getX(i)));
 if(y>=.89)continue;
 const value=JSON.stringify(Object.entries(attrs).map(([k,a])=>[k,...Array.from(a.array.slice(i*a.itemSize,(i+1)*a.itemSize))]));
 if(Math.abs(y-.735)<1e-5)regions.hem.push(value);
 regions.lower.push(value);
}
coach.root.traverse(n=>{if(n.isMesh)meshes++;});
console.log(JSON.stringify({stage,upperWidth,vertices:p.count,triangles:p.count/3,attributesBytes:Object.values(attrs).reduce((n,a)=>n+a.array.byteLength,0),meshes,regions:Object.fromEntries(Object.entries(regions).map(([k,v])=>[k,{count:v.length,sha256:crypto.createHash('sha256').update(v.sort().join('\n')).digest('hex')}]))},null,2));
