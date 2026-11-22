/* Markdown before/after table from measure.cjs reports. Usage: node qa/gotr-0032-v2/table.cjs [lion|rabbit] */
const fs=require('fs'),path=require('path'),sp=process.argv[2]||'lion';
const load=n=>JSON.parse(fs.readFileSync(path.join(__dirname,`${n}-${sp}.json`),'utf8')),b=load('before'),a=load('after');
const cols=[['approach','contact m/s'],['peak','peak m/s'],['elbow','elbow° at contact'],['hipTurn','hip turn°'],['shoulderTurn','shoulder turn°'],['transfer','pelvis fwd cm'],['snapMs','snap-back ms'],['dvMax','max Δv/tick'],['dvGuard','guard Δv/tick'],['pops','1-tick pops'],['popCm','mitt/bag pop']];
const out=[];
for(const st of ['pads','heavy']){
 out.push(`\n### ${sp} — ${st==='pads'?'mitts':'heavy bag'} (Play, single punch from the guard; before → after)\n`);
 out.push('| punch | '+cols.map(c=>c[1]).join(' | ')+' |');out.push('|'+'---|'.repeat(cols.length+1));
 for(const m of Object.keys(a[st].singles)){const x=b[st].singles[m],y=a[st].singles[m];out.push(`| ${m} | `+cols.map(([k])=>`${x[k]} → **${y[k]}**`).join(' | ')+' |');}
 out.push(`\nRapid coach-called sequences (${st}):\n`);out.push('| press gap | max Δv/tick | p99 | p99.9 | 1-tick pops | refused presses |');out.push('|---|---|---|---|---|---|');
 a[st].rapid.forEach((y,i)=>{const x=b[st].rapid[i];out.push(`| ${y.gap} s | ${x.dvMax} → **${y.dvMax}** | ${x.p99} → **${y.p99}** | ${x.p999} → **${y.p999}** | ${x.pops} → **${y.pops}** | ${x.refused} → ${y.refused} |`);});
}
console.log(out.join('\n'));
