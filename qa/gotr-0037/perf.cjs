/* GOTR-0037 frame cost of the muscle definition: paired A/B render-time sampling at phone size.
   Page: 402x690 CSS px at DPR 3 (mobile emulation). Two rigs of the same species are built in the same
   page: A with the definition, B with it switched off (AvatarAnatomy.definition.enabled=false while it is
   built, i.e. exactly the old shaders/attributes). Each is posed identically (jab) and rendered alone in the
   app's own scene and lights (gym hidden so the character's cost is not drowned), framed as on a phone.
   Levels: default 3 (pixel ratio 1.5, 1024 shadow map, so colour + shadow passes) and floor 0 (ratio 1,
   no shadows, definition detail off). Every render is closed with a 1-pixel readPixels and A/B are
   interleaved in alternating order, so machine noise hits both equally.
   SwiftShader (software WebGL) on a shared VM is NOT a phone GPU: the ratio is the result, not the ms.
   Usage: node qa/gotr-0037/perf.cjs [url] [rounds]   (CDP=http://127.0.0.1:9337 reuses a running Chrome) */
const {chromium}=require('playwright');
const [,,url='http://127.0.0.1:8437/',roundsArg='12']=process.argv,rounds=+roundsArg;
(async()=>{
 let browser,page;const viewport={width:402,height:690};
 if(process.env.CDP){browser=await chromium.connectOverCDP(process.env.CDP);const ctx=await browser.newContext({viewport,deviceScaleFactor:3,isMobile:true,hasTouch:true});page=await ctx.newPage();}
 else{browser=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader']});page=await browser.newPage({viewport,deviceScaleFactor:3,isMobile:true,hasTouch:true});}
 await page.goto(url);await page.waitForFunction(()=>window.ringfighterGame&&app.engine.coach?.anatomy,null,{timeout:300000});
 const result=await page.evaluate(async rounds=>{
  const e=app.engine,D=AvatarAnatomy.definition;document.querySelectorAll('dialog[open]').forEach(d=>d.close());
  e.animate=()=>{};await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
  const species=e.coach.species,data=e.roster.data;
  let t=performance.now();const A=new LionCoach(data,{species:species==='lion'?'rabbit':'lion'});const firstBuild=performance.now()-t;
  const g=A.skin.geometry;t=performance.now();D.build(g,'cold-probe');const buildMs=performance.now()-t;
  const rigs={};for(const [k,on] of [['with',true],['without',false]]){D.enabled=on;rigs[k]=new LionCoach(data,{species});D.enabled=true;}
  const hidden=e.scene.children.filter(n=>!n.isLight&&n.visible);hidden.forEach(n=>n.visible=false);
  for(const c of Object.values(rigs)){e.scene.add(c.root);c.root.visible=false;c.update(.525,'jab','one_two',{simulationTime:.525});}
  const cam=new THREE.PerspectiveCamera(40,e.canvas.width/e.canvas.height,.05,60);cam.position.set(.9,1.55,3.3);cam.lookAt(0,1.15,0);
  const r=e.renderer,gl=r.getContext(),px=new Uint8Array(4),out={buildMsColdOtherSpecies:+firstBuild.toFixed(0),definitionBuildMs:+buildMs.toFixed(1),species};
  const time=()=>{const s=performance.now();r.render(e.scene,cam);gl.readPixels(0,0,1,1,gl.RGBA,gl.UNSIGNED_BYTE,px);return performance.now()-s;};
  for(const [level,ratio,shadows] of [[3,1.5,true],[0,1,false]]){
   r.setPixelRatio(ratio);r.shadowMap.enabled=shadows;D.setQuality(level);for(const c of Object.values(rigs))c.root.traverse(n=>{for(const m of [].concat(n.material||[]))m.needsUpdate=true;});
   const samples={with:[],without:[]};
   for(const k of ['with','without']){rigs[k].root.visible=true;time();time();rigs[k].root.visible=false;}
   for(let i=0;i<rounds;i++)for(const k of (i%2?['with','without']:['without','with'])){rigs[k].root.visible=true;for(let f=0;f<3;f++)samples[k].push(time());rigs[k].root.visible=false;await new Promise(r=>setTimeout(r,0));}
   const med=a=>{const s=[...a].sort((x,y)=>x-y);return s[Math.floor(s.length/2)];};
   out['level'+level]={canvas:[e.canvas.width,e.canvas.height],shadows,withMs:+med(samples.with).toFixed(2),withoutMs:+med(samples.without).toFixed(2),ratio:+(med(samples.with)/med(samples.without)).toFixed(3),samples:samples.with.length};
  }
  const tris=c=>{let n=0;c.root.traverse(m=>{if(m.isMesh&&m.visible)n+=(m.geometry.index?m.geometry.index.count:m.geometry.attributes.position.count)/3;});return n;};
  out.triangles={with:tris(rigs.with),without:tris(rigs.without)};
  out.extraVertexBytes=['skin','bodyFur'].reduce((n,k)=>n+rigs.with[k].geometry.attributes.position.count*12,0);
  hidden.forEach(n=>n.visible=true);return out;
 },rounds);
 console.log(JSON.stringify(result,null,1));
 if(process.env.CDP)await page.context().close();else await browser.close();process.exit(0);
})().catch(e=>{console.error('FAIL',e);process.exit(1);});
