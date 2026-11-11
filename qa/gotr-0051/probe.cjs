/* GOTR-0051 probe: guard hand positions (root space) and IK errors in mitt Play guard vs. shadow guard. */
const path=require('path');const {engine}=require(path.join(__dirname,'..','gotr-0024','measure.cjs'));
const e=engine('lion');const c=e.coach,P=n=>c.point(c.joints[n]).toArray().map(x=>+x.toFixed(3));
c.update(0,'guard','one_two',{});console.log('shadow L',P('handL'),'R',P('handR'),'errors',c.metrics.handErrors.map(x=>+x.toFixed(3)));
for(const opts of [{guardTightness:1},{guardCover:1},{guardCover:1,guardElbowBack:.5,keepFaceClear:true},{guardCover:1,guardElbowBack:.5,keepFaceClear:true,guardHeight:1.72}]){c.update(0,'guard','one_two',opts);console.log(JSON.stringify(opts),'L',P('handL'),'R',P('handR'),'head',P('head'),'errors',c.metrics.handErrors.map(x=>+x.toFixed(3)));}
