/* GOTR-0051 probe: staged lion jab to the rabbit's head in its plain fight guard (tests/fight-range "blocked_head").
   Prints which part is hit and the receiver's glove positions (receiver root space) at contact. */
const path=require('path');const {engine}=require(path.join(__dirname,'..','gotr-0024','measure.cjs'));
const e=engine('lion');e.player.setEnabled(false);e.targetMode='fight';e.fightOptions={seed:74};e.arena.setTarget('fight');const view=e.arena.fightView,m=view.match;
m.phase='round';m.decide=()=>{};for(const f of Object.values(m.fighters)){f.next=Infinity;f.action=null;f.tempo=1;f.reaction=null;}
const r=view.coaches.rabbit,P=n=>r.point(r.joints[n]).toArray().map(x=>+x.toFixed(3));
m.attack('lion',process.argv[2]||'jab','head');
const se=view.straightExcess.bind(view);view.straightExcess=(a,t)=>{const v=se(a,t);if(a==='lion'&&view.specs.lion.phase>.3)console.log('   excess',t?'terminal':'plan',v==null?null:+v.toFixed(4),'phase',+view.specs.lion.phase.toFixed(3),'aim',view.reach.lion.aim.map(x=>+x.toFixed(3)),'knuckleW',view.coaches.lion.root.localToWorld(new THREE.Vector3(...view.coaches.lion.metrics.gloves[0].knuckles)).toArray().map(x=>+x.toFixed(3)));return v;};
for(let i=0;i<60;i++){view.step();const c=view.contacts.find(x=>x.actor==='lion');const a=view.coaches.lion;if(i%3===0||c)console.log(i,'att',a.point(a.joints.handL).toArray().map(x=>+x.toFixed(3)),'shift',+view.reach.lion.shift.toFixed(3),'gap',+view.coaches.lion.root.position.distanceTo(r.root.position).toFixed(3),'L',P('handL'),'R',P('handR'),'head',P('head'),c?'CONTACT '+c.part+' '+c.blocked:'');if(c)break;}
