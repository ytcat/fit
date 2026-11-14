// Drives the persistent page (driver.cjs): restarts the bout's rest from 0 and shoots frames at given rest times.
const http = require('http'), S = __dirname, fs = require('fs');
const post = (path, body = '') => new Promise((res, rej) => { const r = http.request({ host: '127.0.0.1', port: 8899, path, method: 'POST' }, x => { let d = ''; x.on('data', c => d += c); x.on('end', () => res(d)); }); r.on('error', rej); r.end(body); });
const TIMES = (process.argv[2] || '0.1,1.8,3.3,4.4,5.7,8.0,13.6,17.6').split(',').map(Number), PREFIX = process.argv[3] || 'f';
(async () => {
  if (process.env.FRESH) { await post('/reload'); console.log(await post('/eval', fs.readFileSync(S + '/start.js', 'utf8'))); }
  // a fresh break: back to the end of round 1
  console.log(await post('/eval', `const e=app.engine,v=e.arena.fightView,m=v.match;m.restSeconds=20;if(m.phase!=='rest'||m.phaseTime>${TIMES[0]}){m.phase='round';m.round=1;m.roundTime=m.roundSeconds-.2;m.phaseTime=m.roundTime;for(let i=0;i<8;i++)e.arena.update(e.animTime+=.05,e.technique,e.currentAnim);}e.isPlaying=false;return [m.phase,m.phaseTime]`));
  for (const [i, t] of TIMES.entries()) {
    const out = await post('/eval', `const TARGET=${t};` + fs.readFileSync(S + '/goto.js', 'utf8'));
    console.log(t, out.replace(/\s+/g, ' ').slice(0, 400));
    await post('/shot?path=' + encodeURIComponent(`${S}/shots/${PREFIX}${i}.png`));
  }
})();
