/* Optional complete offline pack. Installed only after the player requests it. */
const CACHE='ringfighter-offline-v160-20261113l';
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const response=await fetch('./offline-manifest.json',{cache:'no-store'});if(!response.ok)throw Error('Offline manifest unavailable');const manifest=await response.json();
 if(manifest.version!=='v160-20261113l'||!Array.isArray(manifest.urls)||manifest.urls.some(url=>!url.startsWith('./')||url.includes('..')))throw Error('Invalid offline manifest');
 const cache=await caches.open(CACHE);try{await cache.addAll(manifest.urls);}catch(error){await caches.delete(CACHE);throw error;}await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{const keys=(await caches.keys()).filter(k=>k.startsWith('ringfighter-offline-'));for(const key of keys.slice(0,-2))if(key!==CACHE)await caches.delete(key);await self.clients.claim();})()));
self.addEventListener('fetch',event=>{if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;
 event.respondWith((async()=>{const cache=await caches.open(CACHE);if(event.request.mode==='navigate'){try{const response=await fetch(event.request);if(response.ok)return response;}catch{}return await cache.match('./index.html')||Response.error();}return await cache.match(event.request)||fetch(event.request);})());
});
