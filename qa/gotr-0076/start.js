for(let i=0;i<10;i++){const b=document.querySelector('.dream-skip');if(b&&b.offsetParent)b.click();try{StoryScenes.stop()}catch{};await new Promise(r=>setTimeout(r,1200));if(app.engine.arena?.fightView&&window.AdventureOldTown?.run)break;}
AdventureOldTown.leave?.(); await new Promise(r=>setTimeout(r,1500));
document.querySelector('.gm-fab').click(); await new Promise(r=>setTimeout(r,500));
[...document.querySelectorAll('.gm-item')].find(b=>b.textContent.trim()==='Fight').click(); await new Promise(r=>setTimeout(r,800));
document.querySelector('[data-fight-preset=club]').click(); await new Promise(r=>setTimeout(r,3000));
const e=app.engine,m=e.arena.fightView.match; e.cameraDirector?.skipIntro?.(); while(m.phase==='intro')m.advance(.5); m.roundTime=m.roundSeconds-.3; for(let i=0;i<10;i++){e.arena.update(e.animTime+=.05,e.technique,e.currentAnim);} e.isPlaying=false;
return [m.phase,m.restSeconds,!!e.arena.fightView.corner, Object.keys(e.arena.fightView.corner.men)];
