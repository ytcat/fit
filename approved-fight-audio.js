/* Staged approved recordings for Glory of the Ring. No gameplay changes. */
(() => {
  'use strict';
  // Names are intentionally stable; unapproved sounds are never substituted.
  const paths = Object.freeze({
    'referee-fight-en': './assets/audio/approved/referee_en.wav',
    'referee-fight-he': './assets/audio/approved/referee_he.wav',
    'referee-fight-ru': './assets/audio/approved/referee-fight-ru.opus',
    'boxing-bell': './assets/audio/approved/bell.wav',
    'glove-impact': './assets/audio/approved/punch.wav',
    'knockout-crowd': './assets/audio/approved/applause.wav'
  });
  let audioContext=null,loading=null;
  function preload(audio) {
    if (!audio || audio.muted) return Promise.resolve(false);
    audio.init();
    const ctx=audio.ctx;
    if(!ctx)return Promise.resolve(false);
    if(audioContext===ctx&&!loading)return Promise.resolve(true);
    if(loading&&audioContext===ctx)return loading;
    audioContext=ctx;
    loading=Promise.all(Object.entries(paths).map(async ([key,url]) => {
      try {
        const response=await fetch(url,{cache:'force-cache'});
        if(!response.ok)return;
        const file=await response.arrayBuffer();
        const decoded=await ctx.decodeAudioData(file);
        if(audio.ctx===ctx)audio.samples.set('approved:'+key,decoded);
      }catch(_) { /* Never replace with unapproved audio. */ }
    })).then(()=>true).finally(()=>{loading=null;});
    return loading;
  }
  function play(audio,key,volume) {
    if(!audio || audio.muted || !audio.samples?.has('approved:'+key))return false;
    return !!audio.playSample('approved:'+key,volume,1);
  }
  // Returns true only when an approved sample actually played.
  function handle(event,app) {
    if(!event||!app||app.audio?.muted)return false;
    const audio=app.audio,lang=app.lang;
    if(event.type==='bell'&&event.kind==='start'){
      const command=lang==='ru'?'referee-fight-ru':lang==='en'?'referee-fight-en':lang==='he'?'referee-fight-he':null;
      return command?play(audio,command,.72):false;
    }
    if(event.type==='bell'||event.type==='final-bell')return play(audio,'boxing-bell',.48);
    if(event.type==='announcement'&&event.result?.stoppage==='KO')return play(audio,'knockout-crowd',.68);
    return false;
  }
  function impact(audio){return play(audio,'glove-impact',.36);}
  window.ApprovedFightAudio=Object.freeze({preload,handle,impact,paths});
})();