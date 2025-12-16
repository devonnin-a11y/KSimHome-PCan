const CACHE_NAME = 'ksim-3d-hud-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/state.js',
  './js/audio.js',
  './js/ui.js',
  './js/app.js',
  './playcanvas/index.html',
  './playcanvas/world.js'
];

self.addEventListener('install', (e)=>{
  e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(ASSETS)));
});

self.addEventListener('fetch', (e)=>{
  e.respondWith(
    caches.match(e.request).then(r=> r || fetch(e.request).catch(()=>r))
  );
});
