/* A one-time, tab-local bridge from an explicit story walk to the native quest action. */
(function(root){
 'use strict';
 const KEY='gotr.chapter1.storyWalk.v1', MAX_AGE=30*60*1000;
 const targets=Object.freeze({
  dream_gym_talk:'bruno',first_brick:'bruno',clean_gym:'bruno',night_shadow:'bruno',night_bag:'bruno',dream_apology:'bruno',
  market_robber:'market',buy_heavy_bag:'otto',bag_drill:'bruno',fight_prep:'bruno',docks_fight:'docks',advanced_training:'bruno',brick:'bruno'
 });
 const validNonce=x=>typeof x==='string'&&/^[0-9a-f]{32}$/.test(x);
 function make(storage,now,nonce){
  function read(){
   try {
    const t=JSON.parse(storage().getItem(KEY)),n=now();
    return validNonce(t?.nonce)&&typeof t.profile==='string'&&t.profile.length>0&&Number.isSafeInteger(t.created)&&
     n>=t.created&&n-t.created<=MAX_AGE&&Object.hasOwn(targets,t.step)&&targets[t.step]===t.target&&
     (t.phase==='walking'||t.phase==='arrived')?t:null;
   } catch { return null; }
  }
  function clear(){try{storage().removeItem(KEY);return true;}catch{return false;}}
  function write(t){try{storage().setItem(KEY,JSON.stringify(t));return true;}catch{return false;}}
  function eligible(store,flow,progress){
   try{
    const profile=store.current()?.id,g=store.game(),s=g&&flow.state(g,1)?.current;
    if(typeof profile!=='string'||!profile||!s||!Object.hasOwn(targets,s.id)||!flow.playable(g,s.id)||
      progress.blockedByGymShift(g,s.id)||(s.boss&&flow.gate(g,1)))return null;
    return {profile,step:s.id,target:targets[s.id]};
   }catch{return null;}
  }
  function arm(expect,store,flow,progress){
   clear();
   const current=eligible(store,flow,progress);
   if(!current||current.step!==expect)return null;
   let token;try{token=nonce();}catch{return null;}
   if(!validNonce(token))return null;
   const t={...current,nonce:token,created:now(),phase:'walking'};
   return write(t)?t:null;
  }
  function walking(token,target){
   const t=read();return t?.phase==='walking'&&t.nonce===token&&t.target===target?t:null;
  }
  function cancel(token){if(read()?.nonce===token)clear();}
  function arrival(token,target){
   const t=walking(token,target);
   return !!t&&write({...t,phase:'arrived'});
  }
  function consume(token,store,flow,progress){
   const t=read();
   if(t?.phase!=='arrived'||t.nonce!==token||!clear())return null;
   return matches(t,store,flow,progress)?t:null;
  }
  function matches(t,store,flow,progress){
   const current=t&&eligible(store,flow,progress);
   return !!current&&current.profile===t.profile&&current.step===t.step&&current.target===t.target;
  }
  // A saved position already inside the ring isn't an entry. Arm only after
  // being physically outside it somewhere in this live movement session.
  function entered(from,to,target,radius){
   if(!from||!target||from.id!==target.zone||to.id!==target.zone)return false;
   const distance=p=>Math.hypot(p.x-target.x,p.z-target.z);
   return distance(from)>radius&&distance(to)<=radius;
  }
  return {eligible,arm,walking,cancel,arrival,consume,matches,entered,clear};
 }
 if(typeof module==='object'&&module.exports)module.exports={make};
 else root.Chapter1StoryWalk=make(()=>root.sessionStorage,()=>Date.now(),()=>Array.from(root.crypto.getRandomValues(new Uint8Array(16)),n=>n.toString(16).padStart(2,'0')).join(''));
})(globalThis);
