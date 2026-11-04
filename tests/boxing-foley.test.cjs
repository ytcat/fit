const fs=require('fs'),assert=require('node:assert/strict');
for(const name of ['breath-1','breath-2','leather-hit','air-swing']){
 const f=fs.readFileSync('assets/audio/'+name+'.wav');assert.equal(f.toString('ascii',0,4),'RIFF');assert.equal(f.readUInt32LE(24),24000);assert.equal(f.readUInt16LE(34),16);
 const p=f.indexOf(Buffer.from('data'))+8,n=(f.length-p)/2,samples=Array.from({length:n},(_,i)=>f.readInt16LE(p+i*2)/32768);let energy=0,peak=0;
 for(const x of samples){assert.ok(Number.isFinite(x));energy+=x*x;peak=Math.max(peak,Math.abs(x));}assert.ok(peak>.5&&peak<.8&&energy/n>.001);
 if(name.startsWith('breath')){let periodicity=0;for(let lag=50;lag<240;lag++){let correlation=0;for(let i=0;i<n-lag;i++)correlation+=samples[i]*samples[i+lag];periodicity=Math.max(periodicity,Math.abs(correlation)/energy);}assert.ok(periodicity<.55,'exhale must remain turbulent air, not a periodic bird-like voice');console.log(name,{periodicity});}
}
console.log('PASS finite bounded local impact/air clips and non-tonal exhalations');
