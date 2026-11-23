const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const src=f=>fs.readFileSync(path.resolve(__dirname,'..',f),'utf8');
const L=require('../adventure/story/chapter1-roam-locale');
const html=src('chapter1-roam.html'), main=src('index.html'), manifest=JSON.parse(src('offline-manifest.json')).urls;
const roam=src('adventure/story/chapter1-roam.js'), css=src('adventure/story/chapter1-roam.css');
const handoff=src('adventure/adventure-ui.js').match(/const params = new URLSearchParams\(\{lang:.*?window.location.assign\('\.\/chapter1-roam\.html\?' \+ params\);/s)[0];
const carried=src('club-interface.js').match(/const carried=window.location.hash===.*?catch\(_\)\{\}/s)[0];
function launch(lang,eligible){let href;vm.runInNewContext(handoff,{URLSearchParams,app:{lang},eligible,target:{buy_heavy_bag:'otto'},current:'buy_heavy_bag',window:{location:{assign(x){href=x;}}}});return new URL(href,'https://example.invalid/game/index.html');}
function native(url,stored){const calls=[];vm.runInNewContext(carried,{URLSearchParams,window:{location:new URL(url,'https://example.invalid/game/'),},app:{setLanguage(x){calls.push(x)}},copy:{en:1,he:1,ru:1},localStorage:{getItem(){if(stored instanceof Error)throw stored;return stored;}}});return calls;}
for(const lang of ['en','he','ru']){
 const u=launch(lang,true),l=L.locale(L.resolve(u.search,()=>lang==='he'?'en':'he',['ru']));
 assert.equal(u.pathname,'/game/chapter1-roam.html');
 assert.equal(u.searchParams.get('destination'),'otto');
 assert.equal(launch(lang,false).search,'?lang='+lang);
 assert.equal(l.lang,lang);
 assert.equal(l.dir,lang==='he'?'rtl':'ltr');
 const doc={documentElement:{},querySelectorAll(s){return nodes[s.includes('label')?'label':'text'];}, getElementById(id){assert.equal(id,'story-return');return back;}};
 const back={}, nodes=Object.fromEntries(['label','text'].map(k=>[k,[...html.matchAll(new RegExp('data-roam-'+k+'="([^"]+)"','g'))].map(([,key])=>({dataset:{[k==='label'?'roamLabel':'roamText']:key},setAttribute(n,v){this[n]=v;}}))]));
 L.apply(doc,l);
 assert.deepEqual(doc.documentElement,{lang,dir:l.dir});
 assert.equal(doc.title,l.words.title);
 for(const e of nodes.text)assert.equal(e.textContent,l.words[e.dataset.roamText]||'missing');
 for(const e of nodes.label)assert.equal(e['aria-label'],l.words[e.dataset.roamLabel]||'missing');
 assert.equal(l.distance(12.6),{en:'About 13 m',he:'כ־13 מ׳',ru:'Около 13 м'}[lang]);
 assert.equal(l.distance(.22).match(/\d+/)[0],'1');
 for(const name of ['oldtown','market','otto','docks']) assert(l.gate(name).includes(l.words.districts[name]));
 assert.deepEqual(native(back.href,'en'),[lang]);
 assert.deepEqual(native(back.href,new Error('blocked storage')),[lang]);
}
assert.equal(launch('constructor',false).search,'?lang=en');
assert.equal(L.resolve('?lang=ru-RU',()=> 'he',['en']),'ru');
assert.equal(L.resolve('?lang=%3Cscript%3E',k=>{assert.equal(k,'shadowbox-language');return 'he-IL';},['en']),'he');
assert.equal(L.resolve('',()=>{throw Error('blocked');},['fr-CA','iw-IL','en']),'he');
assert.equal(L.resolve('',()=> 'constructor',['ja']),'en');
assert.deepEqual(native('./index.html?lang=ru','he'),['he']);
assert.deepEqual(native('./index.html?lang=constructor#chapter1-story','he'),['he']);
assert.deepEqual(native('./index.html#chapter1-story','constructor'),[]);
assert.equal(Object.keys(L.locale('en').words).sort().join(','),Object.keys(L.locale('he').words).sort().join(','));
assert.equal(Object.keys(L.locale('en').words).sort().join(','),Object.keys(L.locale('ru').words).sort().join(','));
for(const word of ['noRoute','arrived','loadError','contextLost','unavailable'])assert(roam.includes('words.'+word));
assert(roam.includes('g.direction=locale.dir'));
assert(!/[\u0590-\u05ff\u0400-\u04ff]/.test(roam));
assert(css.includes('#waypoint{position:fixed;z-index:2;inset-inline-end:'));
assert(css.includes('header{position:fixed;z-index:2;inset-inline-start:'));
assert(css.includes('#stick{position:fixed;left:')&&css.includes('#zoom{position:fixed;display:grid;gap:8px;z-index:2;right:'));
for(const script of ['club-interface.js','adventure/adventure-ui.js'])assert(manifest.includes(main.match(new RegExp('src="(\\./'+script+'\\?v=\\d+)"'))[1]));
assert(html.indexOf('chapter1-roam-locale.js')<html.indexOf('chapter1-roam.js'));
assert(main.indexOf('club-interface.js')<main.indexOf('game-shell.js'));
console.log('PASS Chapter 1 EN/HE/RU launch and return, DOM/ARIA coverage, fallback/no-storage, status/distance and RTL/LTR invariants');
