/* Before/after table from measure.cjs outputs. Usage: node qa/gotr-0024/table.cjs > qa/gotr-0024/table.md */
const b=require('./before.json'),a=require('./after.json'),f=x=>x==null?'–':typeof x==='number'?(Math.abs(x)>=10?x.toFixed(1):x.toFixed(2)):x;
const cols=[['toContact','start→contact s'],['peakGlove','glove peak m/s'],['approach','glove 1 frame before contact m/s'],['contactSpeed','scored contact speed m/s'],['cleanHeadSpeed','clean: head peak speed m/s'],['cleanHeadRot','clean: head rotation °'],['blockedGuardJolt','blocked: guard jolt m']];
const out=['# GOTR-0024 / GOTR-0025 measurements (medians; seeds '+b.seeds.join(', ')+'; before = '+b.label+', after = '+a.label+')',''];
for(const k of Object.keys(b.cases)){
 const B=b.cases[k],A=a.cases[k];if(!A)continue;
 if(B.moves){
  out.push('## '+k,'','| punch | n (before/after) | '+cols.map(c=>c[1]).join(' | ')+' |','|---|---|'+cols.map(()=>'---').join('|')+'|');
  for(const m of Object.keys(B.moves)){const x=B.moves[m],y=A.moves[m]||{};out.push(`| ${m} | ${x.landed}/${y.landed??0} | `+cols.map(([c])=>`${f(x[c])} → ${f(y[c])}`).join(' | ')+' |');}
  out.push('',`Linked punches inside a combination (n ${B.links.n}/${A.links.n}): gap after the previous punch ends ${f(B.links.gap)} → ${f(A.links.gap)} s; start-to-start ${f(B.links.startToStart)} → ${f(A.links.startToStart)} s; contact-to-contact ${f(B.links.contactToContact)} → ${f(A.links.contactToContact)} s.`);
  for(const [id,c] of Object.entries(B.combos||{}))out.push(`- ${id}: whole combination ${f(c.total)} → ${f(A.combos?.[id]?.total)} s (n ${c.n}/${A.combos?.[id]?.n??0}); first contact ${f(c.firstContact)} → ${f(A.combos?.[id]?.firstContact)} s; landed ${c.landed}/${c.punches} → ${A.combos?.[id]?.landed??'–'}/${A.combos?.[id]?.punches??'–'}`);
  out.push('','Bouts: '+b.bouts[k].map((x,i)=>`seed ${x.seed}: ${x.winner} (${x.health.lion}/${x.health.rabbit}) → ${a.bouts[k][i]?.winner} (${a.bouts[k][i]?.health.lion}/${a.bouts[k][i]?.health.rabbit})`).join('; '),'');
 }else{
  out.push('## '+k+' (Play, one press, settled)','','| punch | start→contact s | glove peak m/s | glove before contact m/s | closing speed m/s |','|---|---|---|---|---|');
  for(const m of Object.keys(B)){const x=B[m],y=A[m]||{};out.push(`| ${m} | ${f(x.toContact)} → ${f(y.toContact)} | ${f(x.wristPeak)} → ${f(y.wristPeak)} | ${f(x.wristApproach)} → ${f(y.wristApproach)} | ${f(x.closing)} → ${f(y.closing)} |`);}
  out.push('');
 }
}
console.log(out.join('\n'));
