// sw.js (簡版)
self.addEventListener('install', (e)=>{ e.waitUntil(caches.open('v1').then(c=>c.addAll(['./','./index.html','./app.js','./kana_map.json','./manifest.webmanifest']))); });
self.addEventListener('fetch', (e)=>{ e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request))); });
