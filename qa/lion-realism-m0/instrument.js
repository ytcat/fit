/* QA injection only: never loaded by index.html. */
(() => {
 const nativeRAF=window.requestAnimationFrame.bind(window);
 const qa=window.M0={nativeRAF,paused:false,frames:[],jsonReads:[],constructs:[],firstModelDraw:null,uploads:{bufferCalls:0,bufferBytes:0,textureCalls:0,textureBytesEstimate:0}};
 qa.observers=[];if(window.ResizeObserver){const Observer=window.ResizeObserver;window.ResizeObserver=class extends Observer{constructor(cb){super(cb);qa.observers.push(this);}};}
 window.requestAnimationFrame=cb=>nativeRAF(t=>{if(!qa.paused||cb!==window.app?.engine?.animate)cb(t);});
 const nativeFetch=window.fetch.bind(window);
 window.fetch=async(...args)=>{const r=await nativeFetch(...args),read=r.json.bind(r);r.json=async()=>{const start=performance.now();const data=await read();qa.jsonReads.push({url:String(args[0]),elapsedMs:performance.now()-start,note:'response body read plus JSON parse, not isolated parse'});return data;};return r;};
 let Coach;
 Object.defineProperty(window,'LionCoach',{configurable:true,get:()=>Coach,set:C=>{Coach=new Proxy(C,{construct(target,args,newTarget){const start=performance.now(),result=Reflect.construct(target,args,newTarget);qa.constructs.push({species:args[1]?.species||'lion',elapsedMs:performance.now()-start});return result;}});}});
 for(const P of [window.WebGLRenderingContext?.prototype,window.WebGL2RenderingContext?.prototype].filter(Boolean)){
  for(const name of ['bufferData','bufferSubData','texImage2D','texSubImage2D','drawArrays','drawElements','drawArraysInstanced','drawElementsInstanced']){
   if(!Object.prototype.hasOwnProperty.call(P,name))continue;const original=P[name];if(typeof original!=='function')continue;
   P[name]=function(...a){
    if(name.startsWith('buffer')){const value=a[name==='bufferData'?1:2];qa.uploads.bufferCalls++;qa.uploads.bufferBytes+=typeof value==='number'?0:(value?.byteLength||0);}
    else if(name.startsWith('tex')){
     const source=a[a.length-1],dom=source&&typeof source==='object'&&('width' in source||'videoWidth' in source);let bytes=0;
     if(dom)bytes=(source.videoWidth||source.width||0)*(source.videoHeight||source.height||0)*4;
     else if(source?.byteLength)bytes=source.byteLength;
     if(bytes){qa.uploads.textureCalls++;qa.uploads.textureBytesEstimate+=bytes;}
    }else if(qa.firstModelDraw==null&&window.app?.engine?.coach)qa.firstModelDraw=performance.now();
    return original.apply(this,a);
   };
  }
 }
 const sumStats=values=>{const sorted=values.slice().sort((a,b)=>a-b);return {samples:values.length,median:sorted.length?(sorted[Math.floor((sorted.length-1)/2)]+sorted[Math.floor(sorted.length/2)])/2:null,p95:sorted[Math.min(sorted.length-1,Math.ceil(sorted.length*.95)-1)]??null,min:sorted[0]??null,max:sorted.at(-1)??null};};
 qa.stats=sumStats;
 qa.boot=async()=>{
  qa.paused=true;app.engine.isPlaying=false;await new Promise(resolve=>nativeRAF(()=>nativeRAF(resolve)));
  const e=app.engine,gl=e.renderer.getContext(),debug=gl.getExtension('WEBGL_debug_renderer_info');
  qa.engine=e;qa.gl=gl;qa.originalMaterials=new Map();qa.componentTotals={};
  const timed=(prototype,key,label)=>{if(!prototype?.[key])return;const original=prototype[key];prototype[key]=function(...args){const t=performance.now();try{return original.apply(this,args);}finally{const row=qa.componentTotals[label]||(qa.componentTotals[label]={ms:0,calls:0});row.ms+=performance.now()-t;row.calls++;}};};
  for(const [p,k,n] of [[LionCoach.prototype,'update','coach.update inclusive'],[LionCoach.prototype,'updateMane','coach.updateMane'],[LionCoach.prototype,'syncSkin','coach.syncSkin inclusive'],[TrainingArena.prototype,'update','arena.update inclusive'],[TrainingArena.prototype,'step','arena.step inclusive'],[FightArena.prototype,'step','fight.step inclusive'],[FightArena.prototype,'pose','fight.pose inclusive'],[RhinoReferee.prototype,'update','referee.update'],[FightAudience.prototype,'update','audience.update']])timed(p,k,n);
  qa.environment={threeRevision:THREE.REVISION,userAgent:navigator.userAgent,devicePixelRatio,viewport:{width:innerWidth,height:innerHeight},webglVersion:gl.getParameter(gl.VERSION),renderer:debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),vendor:debug?gl.getParameter(debug.UNMASKED_VENDOR_WEBGL):gl.getParameter(gl.VENDOR),maxVertexAttributes:gl.getParameter(gl.MAX_VERTEX_ATTRIBS),maxVertexUniformVectors:gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS),gpuTimerExtension:Boolean(gl.getExtension('EXT_disjoint_timer_query_webgl2')||gl.getExtension('EXT_disjoint_timer_query')),toneMapping:e.renderer.toneMapping,exposure:e.renderer.toneMappingExposure,outputEncoding:e.renderer.outputEncoding,physicallyCorrectLights:e.renderer.physicallyCorrectLights};
  qa.startup={coachReadyObservedMs:qa.readyObservedMs??performance.now(),firstModelDrawMs:qa.firstModelDraw,jsonReads:qa.jsonReads,constructs:qa.constructs.slice(),heap:performance.memory?{used:performance.memory.usedJSHeapSize,total:performance.memory.totalJSHeapSize,limit:performance.memory.jsHeapSizeLimit}:null,resources:performance.getEntriesByType('resource').map(r=>({name:r.name.split('/').at(-1),duration:r.duration,encodedBodySize:r.encodedBodySize,decodedBodySize:r.decodedBodySize,transferSize:r.transferSize}))};
  return {environment:qa.environment,startup:qa.startup};
 };
 qa.inventory=root=>{
  const geometries=new Map(),materials=new Map(),textures=new Map(),buffers=new Set(),meshes=[];
  const category=node=>{const c=qa.engine.coach;if(node===c.skin)return 'lion body';if(node===c.shorts)return 'lion shorts';if(node===c.bodyFur)return 'lion short coat';if(node===c.mane)return 'lion mane ribbons';if(node===c.gloveMeshes.L||node===c.gloveMeshes.R)return 'lion glove';if(node.parent===c.joints.head)return 'lion head attachment';return 'other';};
  let bufferBytes=0;
  const walk=(node,path,visible)=>{visible=visible&&node.visible;const id=path+'/'+(node.name||node.type);
   if(node.isMesh){const g=node.geometry,attrs={};for(const [key,a] of Object.entries(g.attributes)){const array=a.array||a.data?.array;attrs[key]={count:a.count,itemSize:a.itemSize,bytes:array?.byteLength||0,type:array?.constructor.name};if(array&&!buffers.has(array.buffer)){buffers.add(array.buffer);bufferBytes+=array.buffer.byteLength;}}
    if(g.index&&!buffers.has(g.index.array.buffer)){buffers.add(g.index.array.buffer);bufferBytes+=g.index.array.buffer.byteLength;}
    const indices=g.index?.count||g.attributes.position.count;
    if(!geometries.has(g.uuid))geometries.set(g.uuid,{uuid:g.uuid,type:g.type,vertices:g.attributes.position.count,triangles:indices/3,attributes:attrs,indexBytes:g.index?.array.byteLength||0});
    const list=Array.isArray(node.material)?node.material:[node.material];
    for(const m of [...list,node.customDepthMaterial,node.customDistanceMaterial].filter(Boolean)){
     if(!materials.has(m.uuid))materials.set(m.uuid,{uuid:m.uuid,type:m.type,name:m.name,color:m.color?.toArray(),roughness:m.roughness,metalness:m.metalness,clearcoat:m.clearcoat,side:m.side,transparent:m.transparent,opacity:m.opacity,alphaTest:m.alphaTest,skinning:m.skinning,customShaderKey:m.customProgramCacheKey?.(),maps:[]});
     for(const key of ['map','bumpMap','normalMap','roughnessMap','metalnessMap','alphaMap','aoMap','emissiveMap','envMap'])if(m[key]){const t=m[key],image=t.image||{},w=image.width||0,h=image.height||0;if(!textures.has(t.uuid))textures.set(t.uuid,{uuid:t.uuid,width:w,height:h,encoding:t.encoding,generateMipmaps:t.generateMipmaps,rgba8BytesEstimate:w*h*4*(t.generateMipmaps?4/3:1),sourceType:image.constructor?.name});materials.get(m.uuid).maps.push({slot:key,texture:t.uuid});}
    }
    meshes.push({path:id,category:category(node),visible,geometry:g.uuid,material:list.map(m=>m.uuid),vertices:g.attributes.position.count,triangles:indices/3,castShadow:node.castShadow,receiveShadow:node.receiveShadow});
   }
   node.children.forEach((child,i)=>walk(child,id+'['+i+']',visible));
  };walk(root,'',true);
  const shadowMaps=[];qa.engine.scene.traverse(n=>{if(n.isLight&&n.shadow?.map)shadowMaps.push({type:n.type,width:n.shadow.map.width,height:n.shadow.map.height,colorBytesEstimate:n.shadow.map.width*n.shadow.map.height*4,depthBuffer:n.shadow.map.depthBuffer});});
  return {summary:{meshCount:meshes.length,visibleMeshCount:meshes.filter(m=>m.visible).length,uniqueGeometries:geometries.size,uniqueMaterials:materials.size,uniqueTextures:textures.size,geometryBackingBytes:bufferBytes,textureRGBA8WithMipsEstimate:[...textures.values()].reduce((s,t)=>s+t.rgba8BytesEstimate,0),visibleSubmittedTriangles:meshes.filter(m=>m.visible).reduce((s,m)=>s+m.triangles,0),transparentMeshes:meshes.filter(m=>m.visible&&m.material.some(id=>materials.get(id).transparent)).length,shadowCasterMeshes:meshes.filter(m=>m.visible&&m.castShadow).length},meshes,geometries:[...geometries.values()],materials:[...materials.values()],textures:[...textures.values()],shadowMaps,rendererMemoryCounts:{...qa.engine.renderer.info.memory},note:'Backing arrays/RGBA8 mip estimates are not total driver GPU memory; visible triangles exclude renderer frustum/occlusion decisions and shadow repeats.'};
 };
 qa.configure=(mode,tier='default',mane=true,coatShadow=true)=>{
  const e=qa.engine;e.animTime=0;e.currentAnim='one_two_hook';e.technique=mode==='idle'?'guard':mode==='fight'?'fight':'combo';e.targetMode=mode==='training'?'heavy':mode==='fight'?'fight':'none';e.fightOptions={seed:78,rounds:1,roundSeconds:180,restSeconds:1};e.arena.setTarget(e.targetMode);e.isPlaying=false;e.renderer.info.autoReset=false;
  if(mode==='fight'){e.arena.fightView.match.phase='round';e.arena.fightView.match.phaseTime=0;}
  e.renderer.setPixelRatio(tier==='low'?1:Math.min(devicePixelRatio,1.5));e.renderer.shadowMap.enabled=tier!=='low';
  const c=e.coach;if(!mane){c.mane.visible=false;const undercoat=c.joints.head.children.find(n=>n.isMesh&&n.geometry.type==='SphereGeometry'&&Math.abs(n.scale.x-.2655)<.005&&Math.abs(n.scale.y-.3195)<.01);if(undercoat)undercoat.visible=false;c.updateMane=()=>{};}
  if(!coatShadow)for(const coach of [e.coach,e.arena.rabbit].filter(Boolean))coach.bodyFur.castShadow=false;
  qa.simTime=0;qa.lastWall=null;return {mode,tier,mane,coatShadow,pixelRatio:e.renderer.getPixelRatio(),drawingBuffer:e.renderer.getDrawingBufferSize(new THREE.Vector2()).toArray(),canvasCss:e.renderer.getSize(new THREE.Vector2()).toArray(),shadowEnabled:e.renderer.shadowMap.enabled};
 };
 qa.sample=async(count=120,warmup=30)=>{
  const e=qa.engine,gl=qa.gl,rows=[],pending=[],gpu=[];const ext=gl.getExtension('EXT_disjoint_timer_query_webgl2');
  const consume=()=>{for(let i=pending.length-1;i>=0;i--){const q=pending[i];if(gl.getQueryParameter(q.query,gl.QUERY_RESULT_AVAILABLE)){const disjoint=gl.getParameter(ext.GPU_DISJOINT_EXT);if(!disjoint)gpu.push({frame:q.frame,ms:gl.getQueryParameter(q.query,gl.QUERY_RESULT)/1e6});gl.deleteQuery(q.query);pending.splice(i,1);}}};
  for(let i=-warmup;i<count;i++){
   const wall=await new Promise(resolve=>nativeRAF(resolve)),interval=qa.lastWall==null?0:wall-qa.lastWall;qa.lastWall=wall;
   qa.simTime+=Math.min(interval/1000||1/60,.05);e.animTime=qa.simTime;qa.componentTotals={};qa.uploads={bufferCalls:0,bufferBytes:0,textureCalls:0,textureBytesEstimate:0};e.renderer.info.reset();
   const start=performance.now();const frame=e.arena.update(e.animTime,e.technique,e.currentAnim);const update=performance.now()-start;const audioStart=performance.now();for(const swing of frame.swings||[])e.onSwing?.(swing);for(const hit of [...frame.contacts,...(frame.platformContacts||[])])e.onImpact?.(hit);const audio=performance.now()-audioStart;
   const query=ext&&i>=0?gl.createQuery():null;if(query)gl.beginQuery(ext.TIME_ELAPSED_EXT,query);
   const renderStart=performance.now();e.renderer.render(e.scene,e.camera);const render=performance.now()-renderStart;
   if(query){gl.endQuery(ext.TIME_ELAPSED_EXT);pending.push({query,frame:i});}if(ext)consume();
   if(i>=0)rows.push({frame:i,rafIntervalMs:interval,updateInclusiveMs:update,audioCallbacksCpuMs:audio,renderCpuSubmissionMs:render,updatePlusRenderCpuMs:performance.now()-start,calls:e.renderer.info.render.calls,triangles:e.renderer.info.render.triangles,lines:e.renderer.info.render.lines,uploads:{...qa.uploads},components:JSON.parse(JSON.stringify(qa.componentTotals)),heapUsed:performance.memory?.usedJSHeapSize||null});
  }
  if(ext)for(let i=0;i<10&&pending.length;i++){await new Promise(resolve=>nativeRAF(resolve));consume();}
  const fields=['rafIntervalMs','updateInclusiveMs','audioCallbacksCpuMs','renderCpuSubmissionMs','updatePlusRenderCpuMs','calls','triangles'];const stats=Object.fromEntries(fields.map(k=>[k,sumStats(rows.map(r=>r[k]))]));
  stats.bufferUploadBytes=sumStats(rows.map(r=>r.uploads.bufferBytes));stats.textureUploadCalls=sumStats(rows.map(r=>r.uploads.textureCalls));stats.gpuElapsedMs=gpu.length?sumStats(gpu.map(r=>r.ms)):null;
  return {samples:rows,summary:stats,gpuQueries:gpu,pendingGpuQueries:pending.length,gpuTimerNote:ext?'Asynchronous disjoint-checked WebGL2 query; software renderer times are not phone GPU measurements.':'WebGL2 GPU timer extension unavailable; render CPU submission is not GPU completion time.',frameMethod:'Native RAF spacing, production arena.update and renderer.render; animation delta capped at 50ms as in app. Warmup discarded. Inclusive nested method timings must not be summed.',heapAfter:performance.memory?{used:performance.memory.usedJSHeapSize,total:performance.memory.totalJSHeapSize}:null};
 };
 qa.shaders=()=>qa.engine.renderer.info.programs.map((p,i)=>({id:i,name:p.name,usedTimes:p.usedTimes,vertex:qa.gl.getShaderSource(p.vertexShader),fragment:qa.gl.getShaderSource(p.fragmentShader)}));
})();
