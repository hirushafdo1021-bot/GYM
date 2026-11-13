var CACHE_NAME = 'fitforge-v4';
var ASSETS = [
  './',
  './index.html',
  './three.min.js',
  './char3d.js',
  './body.bin',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png'
];

self.addEventListener('install', function(event){
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){ return cache.addAll(ASSETS); })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(event){
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k!==CACHE_NAME; }).map(function(k){ return caches.delete(k); }));
    })
  );
  self.clients.claim();
});

// Network-first: always pick up new versions when online, fall back to the cache when offline.
self.addEventListener('fetch', function(event){
  if(event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request).then(function(resp){
      if(resp && resp.status === 200 && resp.type === 'basic'){
        var clone = resp.clone();
        caches.open(CACHE_NAME).then(function(cache){ cache.put(event.request, clone); });
      }
      return resp;
    }).catch(function(){
      return caches.match(event.request).then(function(cached){ return cached || caches.match('./index.html'); });
    })
  );
});
