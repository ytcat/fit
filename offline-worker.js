/* Optional complete offline pack. Installed only after the player requests it. */
const CACHE='ringfighter-offline-v161-20261113m',STREET='ringfighter-street-1';
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const response=await fetch('./offline-manifest.json',{cache:'no-store'});if(!response.ok)throw Error('Offline manifest unavailable');const manifest=await response.json();
 if(manifest.version!=='v161-20261113m'||!Array.isArray(manifest.urls)||manifest.urls.some(url=>!url.startsWith('./')||url.includes('..')))throw Error('Invalid offline manifest');
 const cache=await caches.open(CACHE);try{await cache.addAll(manifest.urls);}catch(error){await caches.delete(CACHE);throw error;}await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{const keys=(await caches.keys()).filter(k=>k.startsWith('ringfighter-offline-'));for(const key of keys.slice(0,-2))if(key!==CACHE)await caches.delete(key);await self.clients.claim();})()));
self.addEventListener('fetch',event=>{if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;
 // GOTR-0089: the street models (~19 MB) are not in the pack; each is kept in its own cache the first time a film uses it
 if(/\/assets\/street\/[^?]+\.glb$/.test(new URL(event.request.url).pathname)){event.respondWith((async()=>{const street=await caches.open(STREET);const hit=await street.match(event.request,{ignoreSearch:true});if(hit)return hit;const response=await fetch(event.request);if(response.ok)street.put(event.request,response.clone()).catch(()=>{});return response;})());return;}
 event.respondWith((async()=>{const cache=await caches.open(CACHE);if(event.request.mode==='navigate'){try{const response=await fetch(event.request);if(response.ok)return response;}catch{}return await cache.match('./index.html')||Response.error();}return await cache.match(event.request)||fetch(event.request);})());
});
