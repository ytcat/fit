'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm');
const code = fs.readFileSync('offline-worker.js', 'utf8');
const {urls} = JSON.parse(fs.readFileSync('offline-manifest.json', 'utf8'));
const prefix = './assets/street/city-review/container-liveries/';
const url = 'https://game.test/' + prefix.slice(2) + 'shared-shell.glb';
const optional = /\/assets\/street\/[^?]+\.glb(?:\?|$)/;
assert.ok(!urls.some(optional), 'city GLBs are optional; not an entry in the shell install');
assert.ok(urls.some(u => u.startsWith(prefix) && u.includes('container-liveries.js?v=')), 'optional loader code is cached');
const cache = new Map(), handler = {};
let online = false;
const normalize = r => typeof r === 'string' ? r : r.url;
const rsp = {ok:true,clone(){return this;}};
vm.runInNewContext(code,{URL, self:{location:{origin:'https://game.test'},addEventListener:(n,f)=>{handler[n]=f;}},caches:{open:async n=>{
 if(!cache.has(n))cache.set(n,new Map());const c=cache.get(n);
 const key=(r, o)=>{const u=normalize(r);return o?.ignoreSearch?u.split('?')[0]:u;};
 return {match:async(r,o)=>o?.ignoreSearch?[...c].find(([k])=>key(k,o)===key(r,o))?.[1]:c.get(key(r,o)),
 delete:async(r,o)=>{for(const k of c.keys())if(key(k,o)===key(r,o))c.delete(k);},put:async(r,v)=>c.set(key(r),v)};
}},fetch:async()=>{if(!online)throw Error('offline');return rsp;}});
function fetchAsset(asset){let reply;handler.fetch({request:{method:'GET',url:asset},respondWith(r){reply=r;}});assert.ok(reply);return reply;}
(async()=>{
 await assert.rejects(fetchAsset(url),/offline/,'cold offline download is optional');
 online=true;assert.equal(await fetchAsset(url),rsp);
 await new Promise(r=>setImmediate(r));online=false;
 assert.equal(await fetchAsset(url),rsp,'same exact compatible URL is available on offline repeat');
 await assert.rejects(fetchAsset(url.replace('shared-shell','nordquay-markings')),/offline/,'a missing stencil cannot pretend to be loaded');
 console.log('PASS optional offline city GLBs: cold miss, warm exact hit, missing stencil');
})().catch(e=>{console.error(e);process.exitCode=1;});
