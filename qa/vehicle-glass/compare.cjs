// Actual Three/StorySets renderer, same phone-size camera on the base and candidate.
const assert = require('node:assert/strict');
const {execFileSync} = require('node:child_process');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const {chromium} = require('playwright');
const root = path.resolve(__dirname,'../..');
const out = path.resolve(process.env.GLASS_ARTIFACTS || 'qa-vehicle-glass');
const base = process.env.GLASS_BASE_SHA || '9961b9d54c08827715ec667121d84445c4fb461d';
const scripts = ['assets/vendor/three.min.js','assets/vendor/GLTFLoader.js','adventure/gloryland-map.js','adventure/story/story-sets.js','adventure/story/dream-core.js','adventure/story/city-assets.js','adventure/story/dream-sets.js'];
const before = new Map(scripts.filter(x=>x.startsWith('adventure/')).map(file=>[file,execFileSync('git',['show',base+':'+file],{cwd:root})]));
const content = '<!doctype html><meta charset=utf-8><style>html,body{margin:0;overflow:hidden}canvas{display:block}</style>'+scripts.map(src=>'<script src="'+src+'"></script>').join('');
const server=http.createServer((req,res)=>{
  const u=new URL(req.url,'http://127.0.0.1'), [,variant,...rest]=u.pathname.split('/'), file=rest.join('/');
  if (!file||file==='index.html') { res.setHeader('Content-Type','text/html'); res.end(content); return; }
  const disk=path.resolve(root,file);
  if (!disk.startsWith(root+path.sep)||!fs.existsSync(disk)||!fs.statSync(disk).isFile()) {res.writeHead(404);res.end();return;}
  res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.glb')?'model/gltf-binary':'application/octet-stream');
  res.end((variant==='before'&&before.has(file))?before.get(file):fs.readFileSync(disk));
});
const shots=[
  ['arrival-closed',6.7],['arrival-open',7.8],['arrival-step',8.7],['arrival-doors-close',10.63],
  ['bus-mid'], ['compact-car'], ['fallback-coach'], ['fallback-car'], ['standalone-bus']
];
(async()=>{
  fs.mkdirSync(out,{recursive:true});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const result={viewport:'402×690',renderer:'Chromium SwiftShader; not physical iOS Safari',base,before:{},after:{}};
  try {
    for(const version of ['before','after']){
      const page=await browser.newPage({viewport:{width:402,height:690},hasTouch:true,deviceScaleFactor:1});
      const errors=[];page.on('pageerror',x=>errors.push(String(x)));
      await page.goto('http://127.0.0.1:'+server.address().port+'/'+version+'/index.html');
      await page.evaluate(async()=>{
        const rc=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
        rc.setSize(402,690); rc.outputEncoding=THREE.sRGBEncoding;
        document.body.append(rc.domElement);
        const assets=await CityAssets.ready(20000,['bus','car']);
        if(!assets.bus||!assets.car) throw Error('Missing authored assets');
        const scene=new THREE.Scene(), fallbackScene=new THREE.Scene(), standaloneScene=new THREE.Scene();
        const live=StorySets.build('dream_street',scene,{city:assets,renderer:rc}), backup=StorySets.build('dream_street',fallbackScene,{renderer:rc}), standalone=StorySets.build('busstop',standaloneScene,{renderer:rc});
        const cam=new THREE.PerspectiveCamera(36,402/690,.1,220);
        const film=DreamCore.withCity(DreamCore.scenes.dream_opening);
        const model=live.objects.city.bus;
        window.probe=(shot,t)=>{
          let current=scene, set=live;
          if(Number.isFinite(t)){
            const s=DreamCore.sample(film,t);
            cam.fov=Math.min(66,Math.max(36,2*Math.atan(.345/(402/690))*180/Math.PI))*(s.camera.fov>0?s.camera.fov/36:1);
            cam.position.fromArray(s.camera.pos); cam.lookAt(...s.camera.look);
            model.wrap.position.x=s.props.bus[0]; live.objects.city.frame(s,cam);
          } else if(shot==='bus-mid'){
            model.wrap.position.x=-1; cam.position.set(3.3,2.35,14.4); cam.lookAt(-1,1.55,1.9);cam.fov=42;live.objects.city.frame({},cam);
          } else if(shot==='compact-car'){
            cam.position.set(12.0,2.1,1.25);cam.lookAt(8.4,1.0,-2.45);cam.fov=46;
          } else if(shot==='standalone-bus'){
            current=standaloneScene;set=standalone;cam.position.set(-2.5,3.15,-12);cam.lookAt(.4,1.45,-1.9);cam.fov=48;
          } else {
            current=fallbackScene;set=backup; backup.objects.bus.position.x=-1;
            if(shot==='fallback-car'){cam.position.set(12.0,2.1,1.25);cam.lookAt(8.4,1.0,-2.45);cam.fov=46;}
            else {cam.position.set(3.75,2.25,11.6);cam.lookAt(-.8,1.52,1.9);cam.fov=48;}
          }
          cam.updateProjectionMatrix(); rc.render(current,cam);
          const car=live.group.getObjectByName('Old Town compact');
          const authored=[];car?.traverse(o=>{if(o.isMesh && o.material.transparent) authored.push(o.material.name)});
          const paneNames=[]; set.group.traverse(o=>{if(o.material?.transparent&&o.name?.includes('cabin glass')) paneNames.push(o.name)});
          const coach=backup.objects.bus; const glass=coach.getObjectByName('bus cabin glass');
          const ray=new THREE.Raycaster(new THREE.Vector3(-.7,1.85,4.2),new THREE.Vector3(0,0,-1),.01,5);
          coach.updateWorldMatrix(true,true);
          const paneDist=glass?ray.intersectObject(glass,false)[0]?.distance??null:null;
          const cabinDist=ray.intersectObject(coach,false)[0]?.distance??null;
          return {metrics:{...rc.info.render}, inside:model.inside.filter(x=>x.visible).length, proxy:!!model.cabinLOD?.visible,proxyTriangles:(model.cabinLOD?.geometry.attributes.position.count||0)/3, paneNames, authored, paneDist,cabinDist};
        };
      });
      for (const [shot,t] of shots){
        result[version][shot]=await page.evaluate(([s,t])=>probe(s,t),[shot,t??null]);
        await page.locator('canvas').screenshot({path:path.join(out,version+'-'+shot+'.png'),timeout:20000,animations:'disabled'});
      }
      assert.deepEqual(errors,[],'page errors');
      await page.close();
    }
    fs.writeFileSync(path.join(out,'metrics.json'),JSON.stringify(result,null,2)+'\n');
    assert.ok(result.after['bus-mid'].proxy&&!result.before['bus-mid'].proxy,'street-distance bus has the lightweight cabin');
    assert.ok(result.after['bus-mid'].metrics.calls-result.before['bus-mid'].metrics.calls<=3,'bounded total calls: at most two passenger glazing/silhouette batches plus culling margin');
    assert.equal(result.after['bus-mid'].proxyTriangles,288,'proxy is only 288 triangles');
    assert.ok(result.after['bus-mid'].metrics.triangles-result.before['bus-mid'].metrics.triangles<=1500,'bounded total triangle cost including generated cars');
    assert.ok(result.after['fallback-coach'].paneNames.includes('bus cabin glass'));
    assert.ok(result.before['fallback-coach'].cabinDist!==null && result.after['fallback-coach'].paneDist!==null && (result.after['fallback-coach'].cabinDist===null || result.after['fallback-coach'].cabinDist-result.after['fallback-coach'].paneDist>.25),'a side ray hits shallow glass, not an opaque outer body panel');
    assert.ok(result.after['fallback-car'].paneNames.includes('parked car cabin glass'));
    assert.ok(result.after['standalone-bus'].paneNames.includes('bus cabin glass'));
    assert.ok(result.after['compact-car'].authored.some(x=>x.includes('headlamp lens')),'headlight lens not reassigned as cabin glass');
    assert.ok(result.after['compact-car'].authored.some(x=>x.includes('window glass')),'authored compact car already has separate transparent glazing');
    console.log('PASS vehicle glass: real GLB, door frames, middle-distance silhouette and three generated vehicle routes at 402×690');
  }finally{await browser.close();server.close();}
})().catch(x=>{console.error(x);server.close();process.exitCode=1;});
