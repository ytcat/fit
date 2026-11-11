/* Summarise a V8 .cpuprofile: top self time and top inclusive time by function (file:line).
   Usage: node qa/gotr-0027/profile-summary.cjs <file.cpuprofile> [n] */
const fs=require('fs');const p=JSON.parse(fs.readFileSync(process.argv[2],'utf8')),n=+(process.argv[3]||25);
const byId=new Map(p.nodes.map(x=>[x.id,x]));const self=new Map();
const dt=p.timeDeltas,samples=p.samples;const hits=new Map();for(let i=0;i<samples.length;i++)hits.set(samples[i],(hits.get(samples[i])||0)+(dt[i]||0));
const key=x=>{const c=x.callFrame;return (c.functionName||'(anon)')+' '+(c.url||'').split('/').pop()+':'+(c.lineNumber+1);};
const parent=new Map();for(const x of p.nodes)for(const c of x.children||[])parent.set(c,x.id);
const incl=new Map();
for(const [id,t] of hits){const x=byId.get(id);self.set(key(x),(self.get(key(x))||0)+t);const seen=new Set();let cur=id;while(cur!=null){const k=key(byId.get(cur));if(!seen.has(k)){seen.add(k);incl.set(k,(incl.get(k)||0)+t);}cur=parent.get(cur);}}
const total=[...hits.values()].reduce((a,b)=>a+b,0);
const show=(m,label)=>{console.log('--',label);for(const [k,t] of [...m].sort((a,b)=>b[1]-a[1]).slice(0,n))console.log((t/1000).toFixed(0).padStart(7)+' ms '+(100*t/total).toFixed(1).padStart(5)+'% '+k);};
show(self,'self');show(incl,'inclusive');
