/* Device-local careers; deterministic rewards and an explicit portable backup. */
(() => {
 const domain=typeof module!=='undefined'?require('./game-domain.js'):window.GameDomain;
 const clone=value=>JSON.parse(JSON.stringify(value));
 const checksum=value=>{const text=JSON.stringify(value);let h=2166136261;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}return (h>>>0).toString(16);};
 const pack=data=>JSON.stringify({format:'ringfighter-career',version:1,checksum:checksum(data),data});
 function unpack(raw){const value=JSON.parse(raw);if(value?.format){if(value.format!=='ringfighter-career'||value.version!==1)throw Error('Incompatible backup format.');if(value.checksum!==checksum(value.data))throw Error('Invalid backup checksum.');return validate(value.data);}return validate(value);}
 const attrs=['power','speed','accuracy','footwork','defence','stamina'];
 // The player's chosen fighter. Older profiles have none and use the one they trained with most (Lion on a tie).
 const fighters=['lion','rabbit'];
 const weights={none:[.12,.24,.24,.18,.12,.10],heavy:[.48,.08,.28,.04,.02,.10],dummy:[.30,.10,.40,.04,.08,.08],speed:[.05,.48,.28,.04,.03,.12],rope:[0,.30,0,.45,0,.25],pads:[.10,.18,.26,.16,.24,.06],rabbit:[.14,.16,.18,.18,.20,.14],fight:[.20,.16,.18,.14,.18,.14]};
 const ranks=[[0,'Rookie'],[250,'Amateur'],[750,'Prospect'],[1800,'Contender'],[3500,'Professional'],[7000,'Champion'],[14000,'World champion']];
 const blank=()=>({xp:0,points:Object.fromEntries(attrs.map(k=>[k,0])),sessions:0,wins:0,losses:0,draws:0,awards:[]});
 const number=(n,max=1e8)=>Number.isFinite(n)&&n>=0&&n<=max;
 const id=()=>Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10);
 function validate(data){
  if(data&&data.version!==1)throw Error('Incompatible career version.');
  if(!data||data.version!==1||!Array.isArray(data.profiles)||data.profiles.length>30)throw Error('This is not a Glory of the Ring backup.');
  const seen=new Set();
  for(const p of data.profiles){
   if(typeof p.name==='string')p.name=domain.cleanName(p.name);
   if(typeof p.id!=='string'||p.id.length>90||seen.has(p.id)||typeof p.name!=='string'||!p.name.trim()||p.name.length>32||!p.boxers)throw Error('Invalid player in backup.');seen.add(p.id);
   for(const species of ['lion','rabbit']){const b=p.boxers[species];if(!b||!['xp','sessions','wins','losses','draws'].every(k=>number(b[k]))||!attrs.every(k=>number(b.points?.[k]))||!Array.isArray(b.awards)||b.awards.length>200||b.awards.some(a=>typeof a!=='string'||a.length>120))throw Error('Invalid boxer progress.');}
   if(p.species!==undefined&&!fighters.includes(p.species))throw Error('Invalid player in backup.');
   if(p.game!==undefined)domain.validate(p.game,p);
  }
  if(data.active!==null&&!data.profiles.some(p=>p.id===data.active))throw Error('Invalid active player.');
  return data;
 }
 class CareerStore {
  constructor(storage){
   this.storage=storage;this.key='ringfighter-career-v1';this.backupKey=this.key+'-backup';this.legacyKey=this.key+'-legacy';this.error='';this.locked=false;this.data={version:1,active:null,profiles:[]};this.persisted=null;this.pendingLegacy=null;
   let raw=null;try{raw=storage?.getItem(this.key);if(raw){this.data=unpack(raw);this.persisted=raw;}}catch(e){try{if(/incompatible/i.test(e.message))throw Error();const backup=storage?.getItem(this.backupKey);if(!backup)throw Error();this.data=unpack(backup);this.persisted=backup;this.error='Recovered previous saved progress from backup.';}catch{this.locked=true;this.error='Saved progress could not be read. Import a valid backup to recover; the original save is preserved.';}}
   const legacy=this.data.profiles.some(p=>!p.game);if(legacy)this.pendingLegacy=raw;
   if(legacy){for(const p of this.data.profiles)if(!p.game){p.game=domain.fresh(p);for(const boxer of Object.values(p.boxers))for(const award of boxer.awards)if(!p.game.processed.includes(award)){p.game.processed.push(award);p.game.ledger.push({id:'reward:'+award,type:'earn',coins:0,xp:0,rule:'legacy-id-v1'});}}try{this.save();}catch{this.error='Migration could not be saved. Export a backup before leaving.';}}
  }
  save(){try{if(!this.storage||this.locked)throw Error();validate(this.data);const next=pack(this.data);if(this.pendingLegacy&&!this.storage.getItem(this.legacyKey))this.storage.setItem(this.legacyKey,this.pendingLegacy);if(this.persisted)this.storage.setItem(this.backupKey,this.persisted);this.storage.setItem(this.key,next);this.persisted=next;this.pendingLegacy=null;this.error='';return true;}catch{this.error='Browser storage is unavailable. Export a backup before leaving.';return false;}}
  transaction(change){const before=this.data;this.data=clone(before);try{const result=change();if(!this.save())throw Error(this.error);return result;}catch(e){this.data=before;throw e;}}
  game(profile=this.current()){return this.data.profiles.find(p=>p.id===profile?.id)?.game||null;}
  wallet(profile=this.current()){const g=this.game(profile);return g?domain.wallet(g):{coins:0,xp:0,transactions:0};}
  gameAction(action){try{return this.transaction(()=>{const p=this.current();if(!p)throw Error('Choose a player first.');return {ok:true,...domain.action(p.game,action,p)};});}catch(e){return {ok:false,error:e.message};}}
  current(){return this.data.profiles.find(p=>p.id===this.data.active)||null;}
  create(name,guest=false,species){
   name=domain.cleanName(name).slice(0,32).trim();if(!name)throw Error('Enter a player name.');if(this.data.profiles.length>=30)throw Error('This device already has 30 players.');if(this.data.profiles.some(p=>p.name.toLowerCase()===name.toLowerCase()))throw Error('That name already exists. Choose it from saved players.');
   return this.transaction(()=>{const p={id:id(),name,guest,boxers:{lion:blank(),rabbit:blank()}};if(fighters.includes(species))p.species=species;p.game=domain.fresh(p);this.data.profiles.push(p);this.data.active=p.id;return p;});
  }
  select(key){if(!this.data.profiles.some(p=>p.id===key))return false;try{return this.transaction(()=>{this.data.active=key;return true;});}catch{return false;}}
  guest(species){const p=this.data.profiles.find(p=>p.guest);if(p){if(!this.select(p.id))throw Error(this.error);if(species)this.setSpecies(species);return this.current();}let name='Guest',n=1;while(this.data.profiles.some(p=>p.name===name))name='Guest '+(++n);return this.create(name,true,species);}
  species(profile=this.current()){if(!profile)return null;if(fighters.includes(profile.species))return profile.species;const b=profile.boxers||{},lion=b.lion||{},rabbit=b.rabbit||{},ls=lion.sessions||0,rs=rabbit.sessions||0;return rs>ls||rs===ls&&(rabbit.xp||0)>(lion.xp||0)?'rabbit':'lion';}
  setSpecies(species,profile=this.current()){if(!fighters.includes(species)||!profile)return false;if(profile.species===species)return true;try{return this.transaction(()=>{this.data.profiles.find(p=>p.id===profile.id).species=species;return true;});}catch{return false;}}
  ratings(species,profile=this.current()){const b=profile?.boxers[species]||blank();return Object.fromEntries(attrs.map(k=>[k,Math.min(99,20+Math.floor(79*Math.sqrt(b.points[k]/(b.points[k]+900))))]));}
  rank(species,profile=this.current()){const xp=profile?.boxers[species]?.xp||0,index=ranks.reduce((best,r,i)=>xp>=r[0]?i:best,0);return {name:ranks[index][1],xp,floor:ranks[index][0],next:ranks[index+1]?.[0]||null};}
  award(event){
   this.lastAwardError='';
   if(!event||typeof event!=='object')return null;
   let {id:awardId,profileId,species,mode,seconds=0,hits=0,attempts=0,defences=0,jumps=0,result,control}=event;
   const p=this.data.profiles.find(p=>p.id===profileId),b=p?.boxers[species];
   if(!b||!weights[mode]||typeof awardId!=='string'||!awardId.length||awardId.length>120||b.awards.includes(awardId)||p.game.processed.includes(awardId)||p.game.processed.length>=20000||p.game.ledger.length>=20015)return null;
   if(control!==undefined&&!['play','coach','architect','watch'].includes(control))return null;
   if(![seconds,hits,attempts,defences,jumps].every(n=>Number.isFinite(n)&&n>=0&&n<=1e6)||![hits,attempts,defences,jumps].every(Number.isSafeInteger)||hits>attempts)return null;
   seconds=Math.min(mode==='fight'?2160:60,seconds);if(seconds<(mode==='fight'?1:10))return null;
   if(mode==='fight'&&!['win','loss','draw'].includes(result))return null;
   const activity=mode==='rope'?jumps:['pads','rabbit'].includes(mode)?hits+defences:mode==='fight'?attempts+defences:mode==='none'?attempts:hits;
   if(activity<=0||activity>seconds*20||defences>seconds*20)return null;
   const accuracy=Math.min(1,hits/Math.max(1,attempts)),quality=Math.min(1,activity/Math.max(1,seconds*.45));
   // Spectators retain at most ten XP per completed bout, with no active rewards or quest progress.
   const xp=Math.min(control==='watch'?10:1e8,Math.round(seconds*(.6+quality*.8+accuracy*.3)+(mode==='fight'?(result==='win'?40:20):0)));
   try{return this.transaction(()=>{
    const player=this.data.profiles.find(p=>p.id===profileId),boxer=player.boxers[species],before=this.ratings(species,player),gains={};
    attrs.forEach((k,i)=>{gains[k]=Math.round(xp*weights[mode][i]*10)/10;boxer.points[k]+=gains[k];});boxer.xp+=xp;boxer.sessions++;boxer.awards.push(awardId);boxer.awards=boxer.awards.slice(-200);
    if(mode==='fight'&&control!=='watch')boxer[{win:'wins',loss:'losses',draw:'draws'}[result]]++;
    const rewards=domain.reward(player.game,{id:awardId,species,mode,seconds,hits,attempts,defences,jumps,result,control,evidence:event.evidence},xp,quality,profileId);
    return {xp,gains,before,after:this.ratings(species,player),quality:Math.round(quality*100),accuracy:Math.round(accuracy*100),rank:this.rank(species,player).name,...rewards};
   });}catch(e){if(this.error&&e.message===this.error)this.lastAwardError=e.message;return null;}
  }
  export(){return pack(this.data);}
  import(raw){
   if(typeof raw!=='string'||raw.length>8e6)throw Error('Backup is too large.');const incoming=unpack(raw);
   if(this.data.profiles.length+incoming.profiles.length>30)throw Error('Import would exceed 30 players.');
   const wasLocked=this.locked;this.locked=false;
   try{return this.transaction(()=>{const added=[];for(const source of incoming.profiles){const p=clone(source);p.id=id();p.name=(p.name+' · imported').slice(0,32);p.guest=false;if(!p.game)p.game=domain.fresh(p);this.data.profiles.push(p);added.push(p);}if(added.length)this.data.active=added[0].id;return added.length;});}catch(e){this.locked=wasLocked;throw e;}
  }
 }
 // The automatic guest name ('Guest', 'Guest 2', ...) is shown in the player's language; typed names are shown as typed.
 const guestWords={en:'Guest',he:'אורח',ru:'Гость'};
 function displayName(profile,lang='en'){const name=typeof profile==='string'?profile:profile?.name||'';return (typeof profile==='string'||profile?.guest)&&/^Guest( \d+)?$/.test(name)?name.replace('Guest',guestWords[lang]||guestWords.en):name;}
 // Owner request (GOTR-0078 dev feedback): "Reset game" erases this device's progress so the first-run welcome and the opening
 // film play again. Keeps only display preferences (language, sound/audio, camera); removes everything else this origin stored.
 const keepOnReset=/^shadowbox-language$|sound|audio|volume|camera/i;
 function resetDevice(storage,session){const removed=[];if(!storage)return removed;const keys=[];for(let i=0;i<storage.length;i++){const k=storage.key(i);if(k!=null)keys.push(k);}
  for(const k of keys)if(!keepOnReset.test(k)){storage.removeItem(k);removed.push(k);}try{session?.clear?.();}catch{}return removed;}
 const api={CareerStore,attrs,weights,ranks,id,displayName,resetDevice,keepOnReset};if(typeof module!=='undefined')module.exports=api;else window.CareerProgress=api;
})();
