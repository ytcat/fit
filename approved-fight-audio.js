/* Approved recordings for Glory of the Ring (referee "Fight!" EN/HE/RU). No gameplay changes. */
(() => {
  'use strict';
  // Names are intentionally stable; unapproved sounds are never substituted.
  const paths = Object.freeze({
    // Ogg Opus first; the AAC copy of the same recording for browsers that cannot decode Opus (older iOS Safari)
    'referee-fight-en': ['./assets/audio/approved/referee_en.opus', './assets/audio/approved/referee_en.m4a'],
    'referee-fight-he': ['./assets/audio/approved/referee_he.opus', './assets/audio/approved/referee_he.m4a'],
    'referee-fight-ru': ['./assets/audio/approved/referee-fight-ru.opus', './assets/audio/approved/referee-fight-ru.m4a']
    // Approved bell, glove impact and KO applause are not imported yet (docs/audio/approved-sounds-integration.md);
    // until their exact files exist the existing sounds play.
  });
  let audioContext=null,loading=null;
  function preload(audio) {
    if (!audio || audio.muted) return Promise.resolve(false);
    const ctx=audio.ctx; // created by the app's own gesture unlock; never created here
    if(!ctx)return Promise.resolve(false);
    if(audioContext===ctx&&!loading)return Promise.resolve(true);
    if(loading&&audioContext===ctx)return loading;
    audioContext=ctx;
    loading=Promise.all(Object.entries(paths).map(async ([key,urls]) => {
      for(const url of [].concat(urls)){
        try {
          const response=await fetch(url,{cache:'force-cache'});
          if(!response.ok)continue;
          const file=await response.arrayBuffer();
          const decoded=await new Promise((ok,bad)=>{const p=ctx.decodeAudioData(file,ok,bad);if(p?.then)p.then(ok,bad);});
          if(audio.ctx===ctx)audio.samples.set('approved:'+key,decoded);
          return;
        }catch(_) { /* try the next copy; never replace with unapproved audio */ }
      }
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