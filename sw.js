// sw.js
const CACHE = 'kana-converter-v1';
const ASSETS = [
  './',
  './index.html',
  './app.js',
  './kana_map.json',
  './manifest.webmanifest'
];
self.addEventListener('install', (e)=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));
});
self.addEventListener('activate', (e)=>{
  e.waitUntil(self.clients.claim());
});
self.addEventListener('fetch', (e)=>{
  const url = new URL(e.request.url);
  if (ASSETS.includes(url.pathname.replace(/^[^/]*\//,'')) || url.origin === location.origin){
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
  }
});
