self.addEventListener('install', (event) => {
  console.log('📦 Service Worker: Installing...');

  event.waitUntil(
    caches.open('keyword-cache-v1').then((cache) => {
      return cache.addAll([
        './index.html',
        './style.css',
        './script.js',
        './manifest.json',
        './icon-192.png',
        './icon-512.png'
      ]);
    })
  );

  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('✅ Service Worker: Activated');
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
