const fs=require('node:fs'),assert=require('node:assert/strict'),html=fs.readFileSync('index.html','utf8');
const method=(signature,args)=>{const start=html.indexOf('      '+signature+' {');assert.ok(start>=0,signature);return new Function(...args,html.slice(start+('      '+signature+' {').length).split('\n      }')[0]);};
const pace=method('framePace(now, wall)',['now','wall']),quality=method('updateQuality(delta)',['delta']);
const rms=list=>Math.sqrt(list.reduce((s,x)=>s+x*x,0)/list.length);
// Feed display timestamps (ms); return what the engine would advance per frame (s).
function run(stamps){const e={},fed=[];for(const t of stamps)fed.push(pace.call(e,t,.016));return {fed,e};}
const steady=(hz,frames,start=1000)=>Array.from({length:frames},(_,i)=>start+i*1000/hz);

// 1. Timestamps rounded to 1 ms (Safari) at 60 Hz: raw intervals flip between 16 and 17 ms.
{const stamps=steady(60,600).map(Math.round),{fed}=run(stamps),raw=stamps.slice(1).map((t,i)=>(t-stamps[i])/1000),tail=fed.slice(60);
 assert.ok(rms(raw.slice(60).map(x=>x-1/60))>4e-4,'the raw intervals really jitter');assert.ok(rms(tail.map(x=>x-1/60))<8e-5&&rms(tail.map(x=>x-1/60))*5<rms(raw.slice(60).map(x=>x-1/60)),'paced intervals are at least five times steadier: '+rms(tail.map(x=>x-1/60)));
 const total=fed.reduce((s,x)=>s+x,0),real=(stamps[stamps.length-1]-stamps[0])/1000;assert.ok(Math.abs(total-real)<.002,'real time is conserved: '+(total-real));
 // The fixed 60 Hz fight tick should step once per shown frame. Whether jitter turns that into 0-1-2 stutter
 // depends on where the frame sits between ticks, so count over 50 evenly spread offsets.
 const stutter=list=>{let bad=0;for(let o=0;o<50;o++){let time=o/3000,tick=Math.floor((time+1e-8)*60);for(const d of list){time+=d;const target=Math.floor((time+1e-8)*60);if(target-tick!==1)bad++;tick=target;}}return bad;};
 const before=stutter(raw.slice(60)),after=stutter(tail);assert.ok(before>400,'raw deltas stutter at some offsets: '+before);assert.ok(after*4<before,'paced deltas stutter far less: '+after+' vs '+before);}
// 2. Dropped frames advance by whole display periods; nothing is lost.
{const stamps=[];let t=1000;for(let i=0;i<400;i++){stamps.push(t);t+=(i%7===6?2:1)*1000/60;}const {fed}=run(stamps);
 for(let i=60;i<400;i++)assert.ok(Math.abs(fed[i]-(((i-1)%7===6?2:1)/60))<2e-4,'frame '+i+' fed '+fed[i]);assert.ok(Math.abs(fed.reduce((s,x)=>s+x,0)-(stamps[399]-stamps[0])/1000)<.001);}
// 3. A refresh-rate switch re-locks; a long pause is passed through and forgotten.
{const stamps=[...steady(60,120),...steady(120,240,1000+120*1000/60)],{fed,e}=run(stamps);assert.ok(Math.abs(e.pace.period-1/120)<2e-4,'locked to the new rate: '+e.pace.period);assert.ok(Math.abs(fed[fed.length-1]-1/120)<1e-4);
 const late=stamps[stamps.length-1]+4000;assert.ok(Math.abs(pace.call(e,late,.016)-4)<1e-9,'a long pause is passed through');assert.equal(e.pace.debt,0);assert.equal(pace.call(e,late-5,.016),0,'time never runs backwards');}
// 4. No timestamp (direct calls): the wall-clock delta is used unchanged.
{const e={};assert.equal(pace.call(e,undefined,.02),.02);assert.equal(e.pace.raw,.02);}

// Adaptive quality: simulate devices whose frame time depends on the level, for 20 minutes of play.
global.THREE={Color:class{}};
function device(cost,dpr=3,minutes=20){
 global.window={devicePixelRatio:dpr};const calls={ratio:[],cleared:0,rebuilt:0};
 const map={dispose(){}},key={shadow:{mapSize:{x:1024,set(x){this.x=x;}},map}};
 const e={frameSamples:[],qualityElapsed:0,qualityDwell:0,qualityTier:1,qualityLevel:3,keyLight:key,scene:{traverse(f){calls.rebuilt++;}},
  renderer:{setPixelRatio:v=>calls.ratio.push(v),shadowMap:{enabled:true},getRenderTarget:()=>null,getClearColor:c=>c,getClearAlpha:()=>1,setRenderTarget(){},setClearColor(){},clear(){calls.cleared++;}}};
 const history=[[0,3]];let t=0;while(t<minutes*60){const d=cost(e.qualityLevel);quality.call(e,d);t+=d;if(history[history.length-1][1]!==e.qualityLevel){history.push([Math.round(t),e.qualityLevel]);if(!key.shadow.map)key.shadow.map=map;}}
 return {e,history,calls,changes:history.length-1};
}
// A strong phone climbs to the sharpest level and stays there.
{const d=device(()=>1/60);assert.equal(d.e.qualityLevel,6);assert.equal(d.changes,3);assert.equal(d.e.qualityTier,2);assert.equal(d.e.keyLight.shadow.mapSize.x,2048);assert.equal(d.calls.ratio[d.calls.ratio.length-1],2);}
// A phone that holds the default look but not the next level must not thrash: retries back off.
{const d=device(level=>level>3?1/30:1/60);assert.equal(d.e.qualityLevel,3,'settles on the level it can hold');assert.ok(d.changes<=12,'few attempts in 20 minutes: '+JSON.stringify(d.history));
 const tries=d.history.filter(h=>h[1]===4).map(h=>h[0]);for(let i=2;i<tries.length;i++)assert.ok(tries[i]-tries[i-1]>=tries[i-1]-tries[i-2],'each retry waits at least as long as the last: '+tries);}
// A slow phone gives up resolution first, then the shadow pass, and reaches a level it can hold.
{const d=device(level=>level>=1?1/28:1/60);assert.equal(d.e.qualityLevel,0);assert.deepEqual(d.history.slice(0,4).map(h=>h[1]),[3,2,1,0],'resolution steps before shadows');assert.ok(d.history[3][0]<=20,'floor reached within 20 s: '+d.history[3][0]);
 assert.equal(d.e.renderer.shadowMap.enabled,false);assert.ok(d.calls.cleared>=1,'the last shadow map is emptied, not left frozen');assert.ok(d.changes<=14,'no thrash at the floor: '+JSON.stringify(d.history));}
// 120 Hz display: a sharper image is not allowed to halve the frame rate.
{const d=device(level=>level>3?1/60:1/120);assert.equal(d.e.qualityLevel,3,'120 fps is kept: '+JSON.stringify(d.history));assert.ok(d.changes<=12);}
// Desktop at pixel ratio 1: resolution levels look identical, so they are skipped.
{const up=device(()=>1/60,1);assert.deepEqual(up.history.map(h=>h[1]),[3,6]);const down=device(level=>level?1/25:1/60,1);assert.deepEqual(down.history.slice(0,2).map(h=>h[1]),[3,0]);}
// A pinned level wins, and coming back from the floor rebuilds materials compiled without shadows.
{const d=device(()=>1/60,3,.2),e=d.e;e.qualityLock=0;quality.call(e,1/60);assert.equal(e.qualityLevel,0);assert.equal(e.renderer.shadowMap.enabled,false);const cleared=d.calls.cleared,rebuilt=d.calls.rebuilt;assert.ok(cleared>=1);
 for(let i=0;i<2000;i++)quality.call(e,1/60);assert.equal(e.qualityLevel,0,'a pinned level does not adapt');e.qualityLock=3;quality.call(e,0);assert.equal(e.qualityLevel,3);assert.equal(e.renderer.shadowMap.enabled,true);assert.equal(d.calls.rebuilt,rebuilt+1);assert.equal(e.qualityTier,1);}
console.log('PASS display-time frame pacing (steady steps, conserved time, drops, re-lock) and adaptive quality ladder (no thrash, floor, 120 Hz, pinned level)');
