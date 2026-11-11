// GOTR-0035 Fighter pad: automatic hands, slip alternation, screen-relative steps, D-pad sectors, hold repeat,
// portrait safe frame, and the pad's orders going through the real BoxingInput into a real BoxingFight.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const P=require('../fighter-pad.js');
global.window=global;
for(const f of ['boxing-input.js','boxing-fight.js'])vm.runInThisContext(fs.readFileSync(f,'utf8'));

// 1) Hands: first punch lead, then alternate; after ~0.8 s without a punch the lead starts again.
{
 const h=P.createHands();let t=1000;
 const throwPunch=(kind,gap=250,speed=false)=>{t+=gap;const n=h.next(kind,t,speed);h.commit(n.hand,t);return n.id;};
 assert.equal(P.RESET_MS,800);
 assert.deepEqual(['straight','straight'].map(k=>throwPunch(k)),['jab','cross'],'Straight, Straight = jab, cross');
 h.reset();assert.deepEqual(['straight','straight','hook'].map(k=>throwPunch(k)),['jab','cross','hook'],'Straight, Straight, Hook = jab, cross, lead hook');
 assert.equal(throwPunch('uppercut'),'rear_uppercut','after a lead hook the rear hand throws');
 assert.equal(throwPunch('hook'),'hook','and back to the lead');
 assert.equal(throwPunch('straight',801),'jab','0.8 s without a punch: lead again');
 assert.equal(throwPunch('straight',799),'cross','under 0.8 s: still alternating');
 assert.equal(throwPunch('hook',800),'hook','exactly 0.8 s keeps the run, a hair more resets');assert.equal(h.last,'lead');
 // A punch still in the air holds the run: the pause is counted from when the fighter is free again.
 h.reset();throwPunch('straight');for(let i=1;i<=10;i++)h.hold(t+i*100);t+=1000;// 1.0 s after the press, but only 0 s after the hold ended
 assert.equal(h.next('straight',t).id,'cross');assert.equal(h.next('straight',t+801).id,'jab');
 // next() never changes the state; only an accepted (committed) press flips the hand.
 h.reset();const a=h.next('hook',5000),b=h.next('hook',5000);assert.deepEqual(a,b);assert.deepEqual(a,{id:'hook',hand:'lead'});
 assert.equal(h.next('jab',5000),null,'only the three pad punches');h.commit('left',5000);assert.equal(h.last,null,'unknown hands are ignored');
 // Speed bag: the same buttons give lead/rear taps, doubles and triples.
 h.reset();t=0;assert.deepEqual(['straight','straight','hook','uppercut','straight'].map(k=>throwPunch(k,200,true)),['tap_lead','tap_rear','double_lead','triple_rear','tap_lead']);
 // Every id the pad can produce is a real BoxingInput move.
 for(const table of [P.PUNCHES,P.SPEED])for(const ids of Object.values(table))for(const id of ids)assert.ok(BoxingInput.definitions[id],id);
}

// 2) Slips alternate right, left, right…; after a pause the next slip is a right slip again.
{
 const s=P.createSlips();let t=0;const slip=(gap=300)=>{t+=gap;const id=s.next(t);s.commit(id,t);return id;};
 assert.deepEqual([slip(),slip(),slip(),slip()],['slip_right','slip_left','slip_right','slip_left']);
 assert.equal(slip(P.SLIP_RESET_MS+1),'slip_right','pause resets to the first slip');
 for(const id of ['slip_left','slip_right','roll','step_forward','step_back','guard'])assert.ok(BoxingInput.definitions[id],id);
}

// 3) D-pad directions follow the screen: → always moves right on screen, whichever way the fighter faces.
{
 assert.equal(P.stepFor('right',1),'step_forward');assert.equal(P.stepFor('left',1),'step_back');
 assert.equal(P.stepFor('right',-1),'step_back');assert.equal(P.stepFor('left',-1),'step_forward');
 assert.equal(P.stepFor('right',0),'step_forward','unknown facing defaults to facing right');assert.equal(P.stepFor('up',1),null);
 assert.equal(P.direction('up',1,'slip_left'),'slip_left');assert.equal(P.direction('down',-1),'roll');assert.equal(P.direction('left',-1),'step_forward');
 // Screen facing from projected x: fighter left of its opponent faces right; the dead zone keeps the last facing.
 assert.equal(P.facingFrom(-.3,.2),1);assert.equal(P.facingFrom(.4,-.1),-1);
 assert.equal(P.facingFrom(.1,.105,-1),-1,'camera behind the fighter: keep the previous facing');assert.equal(P.facingFrom(.1,.105,1),1);assert.equal(P.facingFrom(0,NaN,-1),-1);
 // Moving the picture's screen-x of the step: stepping in when facing right moves right, so → is right in both cases.
 for(const facing of [1,-1])for(const arrow of ['left','right']){const id=P.stepFor(arrow,facing),advance=BoxingInput.definitions[id].stepAdvance;assert.equal(Math.sign(advance*facing),arrow==='right'?1:-1,arrow+' facing '+facing);}
}

// 4) Pointer sectors on the round pad (y grows downward), with a dead hub in the middle.
{
 const R=58;assert.equal(P.sector(0,-40,R),'up');assert.equal(P.sector(0,40,R),'down');assert.equal(P.sector(40,5,R),'right');assert.equal(P.sector(-40,-5,R),'left');
 assert.equal(P.sector(3,4,R),null,'hub');assert.equal(P.sector(30,-31,R),'up','diagonals go to the larger axis');assert.equal(P.sector(80,0,R),'right','a dragged thumb outside the ring still steers');assert.equal(P.sector(10,0,0),null);
}

// 5) Hold repeat: a held step or Guard re-orders only when the fighter is nearly free and nothing is queued.
{
 assert.equal(P.repeatDue({left:0,queued:0,sinceMs:300}),true);assert.equal(P.repeatDue({left:.5,queued:0,sinceMs:300}),false);
 assert.equal(P.repeatDue({left:.1,queued:0,sinceMs:300}),true);assert.equal(P.repeatDue({left:0,queued:1,sinceMs:300}),false);assert.equal(P.repeatDue({left:0,queued:0,sinceMs:50}),false);
}

// 6) Portrait safe frame: the boxers end above the pad and below the HUD; nothing changes when they already fit.
{
 const H=533,check=(o,g)=>{const c=o.height/2,y=f=>c+(f*o.height-c)/g.k-g.d;return {head:y(o.head),feet:y(o.feet)};};
 for(const o of [{height:H,bandTop:380,topReserve:75,head:.26,feet:.83},{height:H,bandTop:360,topReserve:75,head:.2,feet:.86},{height:480,bandTop:330,topReserve:0,head:.24,feet:.8}]){
  const g=P.safeFrame(o),r=check(o,g);assert.ok(g.k>=1&&g.k<=1.3&&g.d>=0,JSON.stringify(g));
  const room=(o.bandTop-6)-(o.topReserve+6),span=(o.feet-o.head)*o.height;
  if(span/room<=1.3){assert.ok(r.feet<=o.bandTop-6+1e-6,'feet above the pad '+JSON.stringify([o,g,r]));assert.ok(r.head>=o.topReserve+6-1e-6,'heads below the HUD '+JSON.stringify([o,g,r]));}
 }
 assert.deepEqual(P.safeFrame({height:H,bandTop:470,topReserve:75,head:.26,feet:.8}),{k:1,d:0},'already clear of the pad');
 assert.deepEqual(P.safeFrame({height:0,bandTop:10}),{k:1,d:0});
 const tight=P.safeFrame({height:H,bandTop:250,topReserve:75,head:.1,feet:.95});assert.equal(tight.k,1.3,'the lens never widens past 1.3');
}

// 7) Through the real input layer into a real fight: the pad's orders are accepted and thrown in order.
{
 const m=new BoxingFight({seed:7,preset:'quick'});for(let i=0;i<400&&m.phase!=='round';i++)m.advance(1/60);assert.equal(m.phase,'round');
 const engine={coach:{species:'lion'},targetMode:'fight',arena:{mode:'fight',fightView:{match:m}},onInputState(){}};
 const input=new BoxingInput(engine);input.setEnabled(true);
 const hands=P.createHands();let t=0;const started=[];let seen=null;
 const watch=()=>{const a=m.fighters.lion.action;if(a&&a.id!==seen&&a.input){seen=a.id;started.push(a.input);}};
 const step=s=>{for(let i=0;i<Math.round(s*120);i++){m.advance(1/120);watch();}};
 const press=kind=>{t+=1000/6;const n=hands.next(kind,t);const ok=input.press(n.id);if(ok)hands.commit(n.hand,t);watch();return ok;};
 // The fight takes the move in progress plus two queued: three quick presses all land in order.
 const thrown0=m.roundStats.lion.thrown;
 assert.deepEqual(['straight','straight','hook'].map(press),[true,true,true]);step(3);
 assert.deepEqual(started.slice(0,3),['jab','cross','hook'],JSON.stringify(started));
 assert.equal(m.roundStats.lion.thrown-thrown0,3,'three punches counted by the fight');
 // D-pad: step out (← while facing right), duck, slip, step in, guard — all accepted by the fight.
 const moves=[P.direction('left',1),P.direction('down',1),P.direction('up',1,'slip_right'),P.direction('right',1),'guard'];
 for(const id of moves){assert.equal(input.press(id),true,id);step(1.2);}
 assert.deepEqual(started.slice(3),moves);
 const steps=started.length;assert.ok(steps===8);
}

// 8) Training stations queue the same orders; the speed bag takes taps and refuses straight punches.
{
 let clock=0;const engine={coach:{species:'rabbit'},targetMode:'heavy',arena:{mode:'heavy',get previousTime(){return clock;}},onInputState(){}};
 const input=new BoxingInput(engine);input.setEnabled(true);const hands=P.createHands();let t=0;
 const press=(kind,speed)=>{t+=150;const n=hands.next(kind,t,speed);const ok=input.press(n.id);if(ok)hands.commit(n.hand,t);return [n.id,ok];};
 assert.deepEqual(['straight','straight','hook'].map(k=>press(k)),[['jab',true],['cross',true],['hook',true]]);
 assert.deepEqual([input.current.input,...input.queue.map(c=>c.input)],['jab','cross','hook']);
 engine.targetMode=engine.arena.mode='speed';input.reset();hands.reset();
 assert.equal(input.press('jab'),false,'no straight punches on the speed bag');
 assert.deepEqual(press('straight',true),['tap_lead',true]);assert.deepEqual(press('straight',true),['tap_rear',true]);
}
console.log('fighter-pad tests passed');
