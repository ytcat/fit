// Visible triangles and draw calls (meshes) added by each accessory and boot construction, per fighter.
// Usage (repo root): node qa/gotr-0002/budget.cjs
const fs=require('fs'),vm=require('vm');global.THREE=require('../../assets/vendor/three.min.js');global.window=global;global.document={createElement:()=>({getContext:()=>new Proxy({},{get:(_,k)=>k==='createImageData'?((w,h)=>({data:new Uint8ClampedArray(w*h*4)})):()=>{}})})};
for(const f of ['boxing-routines.js','boxing-pose.js','boxing-footwear.js','avatar-anatomy.js','avatar-detail.js','avatar-shoulder.js','boxing-coach-v2.js'])vm.runInThisContext(fs.readFileSync(f,'utf8'),{filename:f});
const data=JSON.parse(fs.readFileSync('assets/models/coach-surface-v2.json'));data.rabbitBody=JSON.parse(fs.readFileSync('assets/models/rabbit-surface-r78.json')).body;data.shoulderCorrectives=JSON.parse(fs.readFileSync('assets/models/shoulder-correctives-v2.json'));
const A=require('../../game-accessories.js'),P=require('../../game-presentation.js'),D=require('../../game-domain.js');
const count=root=>{let tris=0,calls=0;root.traverseVisible(n=>{if(n.isMesh){calls++;tris+=(n.geometry.index?n.geometry.index.count:n.geometry.attributes.position.count)/3;}});return {tris:Math.round(tris),calls};};
const c=new LionCoach(data,{species:'lion'}),base=count(c.root),out={base};
for(const item of A.catalog){A.look(c,[item.id]);const now=count(c.root);out[item.id]={tris:now.tris-base.tris,calls:now.calls-base.calls};A.look(c,[]);}
for(const v of ['default','midnight','jade']){P.apply(c,{gloves:'gloves_default',shorts:'shorts_default',boots:'boots_'+v,belt:'belt_default'},D.catalog);const feet=[c.joints.footL,c.joints.footR].map(count);out['boots_'+v+' (both feet)']={tris:feet[0].tris+feet[1].tris,calls:feet[0].calls+feet[1].calls};}
console.log(JSON.stringify(out));
