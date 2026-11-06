/* Device-local careers; deterministic rewards and an explicit portable backup. */
(() => {
 const attrs=['power','speed','accuracy','footwork','defence','stamina'];
 const weights={none:[.12,.24,.24,.18,.12,.10],heavy:[.48,.08,.28,.04,.02,.10],dummy:[.30,.10,.40,.04,.08,.08],speed:[.05,.48,.28,.04,.03,.12],rope:[0,.30,0,.45,0,.25],pads:[.10,.18,.26,.16,.24,.06],rabbit:[.14,.16,.18,.18,.20,.14],fight:[.20,.16,.18,.14,.18,.14]};
 const ranks=[[0,'Rookie'],[250,'Amateur'],[750,'Prospect'],[1800,'Contender'],[3500,'Professional'],[7000,'Champion'],[14000,'World champion']];
 const blank=()=>({xp:0,points:Object.fromEntries(attrs.map(k=>[k,0])),sessions:0,wins:0,losses:0,draws:0,awards:[]});
 const number=(n,max=1e8)=>Number.isFinite(n)&&n>=0&&n<=max;
 const id=()=>Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10);
 function validate(data){
  if(!data||data.version!==1||!Array.isArray(data.profiles)||data.profiles.length>30)throw Error('This is not a RingFighter backup.');
  const seen=new Set();
  for(const p of data.profiles){
   if(typeof p.id!=='string'||p.id.length>90||seen.has(p.id)||typeof p.name!=='string'||!p.name.trim()||p.name.length>32||!p.boxers)throw Error('Invalid player in backup.');seen.add(p.id);
   for(const species of ['lion','rabbit']){const b=p.boxers[species];if(!b||!['xp','sessions','wins','losses','draws'].every(k=>number(b[k]))||!attrs.every(k=>number(b.points?.[k]))||!Array.isArray(b.awards)||b.awards.length>200||b.awards.some(a=>typeof a!=='string'||a.length>120))throw Error('Invalid boxer progress.');}
  }
  return data;
 }
 class CareerStore {
  constructor(storage){this.storage=storage;this.key='ringfighter-career-v1';this.error='';this.data={version:1,active:null,profiles:[]};try{const raw=storage?.getItem(this.key);if(raw)this.data=validate(JSON.parse(raw));}catch{this.error='Saved progress could not be read. Import a backup or create a player.';}}
  save(){try{if(!this.storage)throw Error();this.storage.setItem(this.key,JSON.stringify(this.data));this.error='';return true;}catch{this.error='Browser storage is unavailable. Export a backup before leaving.';return false;}}
  current(){return this.data.profiles.find(p=>p.id===this.data.active)||null;}
  create(name,guest=false){name=String(name||'').trim().slice(0,32);if(!name)throw Error('Enter a player name.');if(this.data.profiles.length>=30)throw Error('This device already has 30 players.');if(this.data.profiles.some(p=>p.name.toLowerCase()===name.toLowerCase()))throw Error('That name already exists. Choose it from saved players.');const p={id:id(),name,guest,boxers:{lion:blank(),rabbit:blank()}};this.data.profiles.push(p);this.data.active=p.id;this.save();return p;}
  select(key){if(!this.data.profiles.some(p=>p.id===key))return false;this.data.active=key;this.save();return true;}
  guest(){const p=this.data.profiles.find(p=>p.guest);if(p){this.select(p.id);return p;}let name='Guest',n=1;while(this.data.profiles.some(p=>p.name===name))name='Guest '+(++n);return this.create(name,true);}
  ratings(species,profile=this.current()){const b=profile?.boxers[species]||blank();return Object.fromEntries(attrs.map(k=>[k,Math.min(99,20+Math.floor(79*Math.sqrt(b.points[k]/(b.points[k]+900))))]));}
  rank(species,profile=this.current()){const xp=profile?.boxers[species]?.xp||0,index=ranks.reduce((best,r,i)=>xp>=r[0]?i:best,0);return {name:ranks[index][1],xp,floor:ranks[index][0],next:ranks[index+1]?.[0]||null};}
  award({id:awardId,profileId,species,mode,seconds=0,hits=0,attempts=0,defences=0,jumps=0,result}){
   const p=this.data.profiles.find(p=>p.id===profileId),b=p?.boxers[species];if(!b||!weights[mode]||typeof awardId!=='string'||b.awards.includes(awardId))return null;
   seconds=Math.min(mode==='fight'?2160:60,Math.max(0,Number(seconds)||0));if(seconds<(mode==='fight'?1:10))return null;
   const activity=mode==='rope'?jumps:['pads','rabbit'].includes(mode)?hits+defences:mode==='fight'?attempts+defences:mode==='none'?attempts:hits;
   if(!Number.isFinite(activity)||activity<=0)return null;
   const accuracy=Math.min(1,Math.max(0,hits)/Math.max(1,attempts)),quality=Math.min(1,activity/Math.max(1,seconds*.45));
   const xp=Math.round(seconds*(.6+quality*.8+accuracy*.3)+(mode==='fight'?(result==='win'?40:20):0));
   const before=this.ratings(species,p),gains={};attrs.forEach((k,i)=>{gains[k]=Math.round(xp*weights[mode][i]*10)/10;b.points[k]+=gains[k];});b.xp+=xp;b.sessions++;b.awards.push(awardId);b.awards=b.awards.slice(-200);
   if(mode==='fight'&&['win','loss','draw'].includes(result))b[{win:'wins',loss:'losses',draw:'draws'}[result]]++;
   this.save();return {xp,gains,before,after:this.ratings(species,p),quality:Math.round(quality*100),accuracy:Math.round(accuracy*100),rank:this.rank(species,p).name};
  }
  export(){return JSON.stringify(this.data,null,2);}
  import(raw){if(typeof raw!=='string'||raw.length>2e6)throw Error('Backup is too large.');const incoming=validate(JSON.parse(raw)),added=[];if(this.data.profiles.length+incoming.profiles.length>30)throw Error('Import would exceed 30 players.');for(const source of incoming.profiles){const p=JSON.parse(JSON.stringify(source));p.id=id();p.name=(p.name+' · imported').slice(0,32);p.guest=false;this.data.profiles.push(p);added.push(p);}if(added.length)this.data.active=added[0].id;this.save();return added.length;}
 }
 const api={CareerStore,attrs,weights,ranks,id};if(typeof module!=='undefined')module.exports=api;else window.CareerProgress=api;
})();
