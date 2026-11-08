/* Optional station navigation only. No workout timer, match snapshot, reward or wallet authority. */
(() => {
 const KEY='ringfighter-resume-v1',VERSION=1;
 const modes=['none','heavy','dummy','speed','rope','pads','rabbit'];
 const techniques=['guard','jab','cross','hook','rear_hook','uppercut','rear_uppercut','slip','roll','step','combo','random','freestyle','speedbag'];
 const species=['lion','rabbit'],controls=['play','coach','watch'];
 const clone=value=>JSON.parse(JSON.stringify(value));
 const text=(value,max)=>typeof value==='string'&&value.length>0&&value.length<=max&&!/[<>\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/.test(value);
 const object=(value,fields)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).every(key=>fields.includes(key));
 const fail=message=>{throw Error(message);};
 function validateDescriptor(value,catalog){
  if(!object(value,['kind','mode','technique','clip','species','control','savedAt','completedRecordId'])||!['training','world'].includes(value.kind)||value.savedAt!==undefined&&(!Number.isSafeInteger(value.savedAt)||value.savedAt<0||value.savedAt>8640000000000000)||value.completedRecordId!==undefined&&!text(value.completedRecordId,120))fail('Invalid station checkpoint.');
  if(value.kind==='world'){if(['mode','technique','clip','species','control'].some(key=>value[key]!==undefined))fail('World checkpoints cannot contain a live activity.');return clone(value);}
  if(!modes.includes(value.mode)||!techniques.includes(value.technique)||!species.includes(value.species)||!controls.includes(value.control)||!text(value.clip,80)||value.mode==='speed'&&value.technique!=='speedbag'||value.mode!=='speed'&&value.technique==='speedbag'||value.mode==='rope'&&value.control==='play'||value.technique==='random'&&value.mode!=='rabbit')fail('Unsupported station setup.');
  if(catalog!==undefined){if(!catalog||!Array.isArray(catalog.clips)||catalog.clips.length>200||!catalog.clips.includes(value.clip)||catalog.techniques!==undefined&&(!Array.isArray(catalog.techniques)||!catalog.techniques.includes(value.technique))||catalog.species!==undefined&&(!Array.isArray(catalog.species)||!catalog.species.includes(value.species))||catalog.modes!==undefined&&(!Array.isArray(catalog.modes)||!catalog.modes.includes(value.mode)))fail('Station assets are unavailable.');}
  return clone(value);
 }
 function validate(data){
  if(!data||data.version!==VERSION)fail('Incompatible resume version.');
  if(!object(data,['version','checkpoints'])||!Array.isArray(data.checkpoints)||data.checkpoints.length>30)fail('Invalid resume data.');
  const seen=new Set();for(const row of data.checkpoints){if(!object(row,['profileId','descriptor'])||!text(row.profileId,90)||seen.has(row.profileId))fail('Invalid checkpoint owner.');seen.add(row.profileId);validateDescriptor(row.descriptor);if(row.descriptor.savedAt===undefined)fail('Missing checkpoint time.');}
  return data;
 }
 const runtimeCatalog=()=>{const routines=typeof window!=='undefined'?window.BOXING_ROUTINES:null;return routines&&Array.isArray(routines.list)?{clips:routines.list.map(r=>r.id),techniques:[...techniques]}:undefined;};
 class Store {
  constructor(storage,{profileIds,catalog,now=()=>Date.now()}={}){
   this.storage=storage;this.key=KEY;this.profileIds=profileIds;this.catalog=catalog;this.now=now;this.data={version:VERSION,checkpoints:[]};this.error='';this.locked=false;this.reason='missing';
   try{if(!storage||typeof storage.getItem!=='function')throw Error('storage');const raw=storage.getItem(this.key);if(raw!==null&&raw!==undefined){if(typeof raw!=='string'||raw.length>32000)throw Error('corrupt');const parsed=JSON.parse(raw);if(parsed?.version!==VERSION){this.reason='incompatible';throw Error('future');}validate(parsed);this.data=parsed;this.reason='missing';}}
   catch(error){this.locked=true;if(this.reason!=='incompatible')this.reason=error.message==='storage'?'storage':'corrupt';this.error='Resume setup is unavailable; your career progress is separate and unchanged.';}
  }
  profiles(options){const source=options.profileIds===undefined?this.profileIds:options.profileIds;const ids=typeof source==='function'?source():source;return Array.isArray(ids)&&ids.length<=30&&ids.every(id=>text(id,90))?ids:null;}
  assets(options){const source=options.catalog===undefined?this.catalog:options.catalog;return (typeof source==='function'?source():source)||runtimeCatalog();}
  commit(next){try{if(this.locked||!this.storage||typeof this.storage.setItem!=='function')throw Error();validate(next);this.storage.setItem(this.key,JSON.stringify(next));this.data=next;this.error='';return {ok:true};}catch{this.error='Station setup could not be saved. Your career progress is separate and unchanged.';return {ok:false,error:this.error};}}
  capture(profileId,descriptor,options={}){
   try{const ids=this.profiles(options);if(!text(profileId,90)||!ids||!ids.includes(profileId))fail('Choose an existing player before saving a station.');if(this.locked)return {ok:false,error:this.error};
    // A fight is never a resumable snapshot. Retain the prior safe station instead.
    if(descriptor?.kind==='fight'||descriptor?.mode==='fight')return {ok:true,ignored:true,reason:'fight-not-resumable'};
    const assets=this.assets(options);if(descriptor?.kind==='training'&&!assets)fail('Station assets are unavailable.');const safe=validateDescriptor({...descriptor,savedAt:this.now()},assets),next=clone(this.data);
    // Removed profiles may leave only nonauthoritative navigation metadata. Prune them on a successful write.
    next.checkpoints=next.checkpoints.filter(row=>ids.includes(row.profileId));const current=next.checkpoints.findIndex(row=>row.profileId===profileId);if(current>=0)next.checkpoints[current].descriptor=safe;else next.checkpoints.push({profileId,descriptor:safe});return this.commit(next);
   }catch(error){this.error=error.message;return {ok:false,error:this.error};}
  }
  lookup(profileId,options={}){
   try{const ids=this.profiles(options);if(!text(profileId,90)||!ids||!ids.includes(profileId))return {kind:'world',reason:'missing-profile'};if(this.locked)return {kind:'world',reason:this.reason};const row=this.data.checkpoints.find(r=>r.profileId===profileId);if(!row)return {kind:'world',reason:'missing'};const assets=this.assets(options);if(row.descriptor.kind==='training'&&!assets)return {kind:'world',reason:'stale-asset'};const safe=validateDescriptor(row.descriptor,assets);return safe.kind==='world'?{...safe,reason:'checkpoint'}:safe;
   }catch{return {kind:'world',reason:'stale-asset'};}
  }
  clear(profileId,options={}){
   try{if(!text(profileId,90))fail('Invalid checkpoint owner.');if(this.locked)return {ok:false,error:this.error};return this.commit({...clone(this.data),checkpoints:this.data.checkpoints.filter(row=>row.profileId!==profileId).map(clone)});}catch(error){return {ok:false,error:error.message};}
  }
 }
 const api={Store,validate,validateDescriptor,key:KEY,version:VERSION,modes:Object.freeze(modes),techniques:Object.freeze(techniques),species:Object.freeze(species),controls:Object.freeze(controls)};if(typeof module!=='undefined')module.exports=api;else window.GameResume=api;
})();
