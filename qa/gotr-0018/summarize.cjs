/* Turns one or more measure.cjs outputs into the compact before/after table.
   Usage: [SEEDS=3,11] node qa/gotr-0018/summarize.cjs label=raw.json [label=raw.json ...] > stats.md */
const fs=require('fs');
const q=(xs,p)=>{if(!xs.length)return NaN;const s=[...xs].sort((a,b)=>a-b),i=(s.length-1)*p,l=Math.floor(i),h=Math.ceil(i);return s[l]+(s[h]-s[l])*(i-l);},f=(x,d=0)=>Number.isFinite(x)?x.toFixed(d):'-';
const rows=[['run','case','group','N','elbow p10','elbow median','elbow p90','elbow >= 150','elbow < 120','extension median %','extension >= 85%','root sep median m','chest sep median m']];
for(const arg of process.argv.slice(2)){
 const [label,file]=arg.split('='),data=JSON.parse(fs.readFileSync(file,'utf8'));
 for(const [name,records] of Object.entries(data.records)){
  const seeds=process.env.SEEDS?process.env.SEEDS.split(',').map(Number):null,straights=records.filter(r=>(r.move==='jab'||r.move==='cross')&&r.landed&&(!seeds||seeds.includes(r.seed)));if(!straights.length)continue;
  const groups={'clean (all)':r=>r.clean,'clean head':r=>r.clean&&r.part==='head','clean body':r=>r.clean&&r.part==='body','clean, thrown by player':r=>r.clean&&r.player,'clean, lion':r=>r.clean&&r.actor==='lion','clean, rabbit':r=>r.clean&&r.actor==='rabbit','blocked (guard/arm)':r=>r.blocked,'all landed':()=>true};
  for(const [group,test] of Object.entries(groups)){const rs=straights.filter(test);if(!rs.length)continue;const e=rs.map(r=>r.elbow),x=rs.map(r=>r.extension*100);
   rows.push([label,name,group,rs.length,f(q(e,.1)),f(q(e,.5)),f(q(e,.9)),rs.filter(r=>r.elbow>=150).length+'/'+rs.length,rs.filter(r=>r.elbow<120).length+'/'+rs.length,f(q(x,.5),1),rs.filter(r=>r.extension>=.85).length+'/'+rs.length,f(q(rs.map(r=>r.root),.5),2),f(q(rs.map(r=>r.chest),.5),2)]);}
 }
}
console.log(rows.map((r,i)=>'| '+r.join(' | ')+' |'+(i?'':'\n|'+r.map(()=>'---').join('|')+'|')).join('\n'));
