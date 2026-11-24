/* A paused fight says so (owner, 2026-11-22: the bout looked frozen). While a fight is paused (the play/pause button, or a phone
 * that switched apps) a plain "Paused — tap to continue" sign sits in the middle of the stage; a tap anywhere on it resumes. It is not
 * shown while a game menu is open (the menu pauses the game on purpose), after the result, or in Watch mode with nothing to resume. */
(() => {
  'use strict';
  const W = { en: ['Paused', 'Tap to continue'], he: ['מושהה', 'הקישו כדי להמשיך'], ru: ['Пауза', 'Нажмите, чтобы продолжить'] };
  function boot() {
    const app = window.app, e = app?.engine; if (!e) { setTimeout(boot, 300); return; }
    let sign = null, lang = '';
    const make = () => { const b = document.createElement('button'); b.type = 'button'; b.className = 'fight-paused'; b.hidden = true;
      b.innerHTML = '<span class="fight-paused-icon" aria-hidden="true">❚❚</span><strong></strong><span class="fight-paused-hint"></span>';
      b.addEventListener('click', ev => { ev.stopPropagation(); e.isPlaying = true; e.lastRenderStamp = null; e.onInputState?.(); app.updatePlayBtnText?.(); b.hidden = true; });
      return b; };
    const tick = () => {
      requestAnimationFrame(tick);
      const m = e.arena?.fightView?.match, want = e.targetMode === 'fight' && !!m && !m.result && !e.isPlaying && !window.ringfighterGame?.isModalOpen && !e.fightIQDemo && !document.querySelector('dialog.story-scene[open]');
      if (!want) { if (sign && !sign.hidden) sign.hidden = true; return; }
      if (!sign) sign = make(); const host = e.stage || document.getElementById('stageContainer'); if (host && sign.parentElement !== host) host.append(sign);
      const l = W[app.lang] ? app.lang : 'en'; if (l !== lang) { lang = l; sign.querySelector('strong').textContent = W[l][0]; sign.querySelector('.fight-paused-hint').textContent = W[l][1]; sign.dir = 'ltr'; sign.setAttribute('aria-label', W[l].join('. ')); }
      if (sign.hidden) sign.hidden = false;
    };
    requestAnimationFrame(tick);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true }); else boot();
})();
