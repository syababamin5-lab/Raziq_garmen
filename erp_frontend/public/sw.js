// Service Worker sederhana agar aplikasi bisa diinstal (PWA)
const CACHE_NAME = 'raziq-erp-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/raziq_cutting_app_icon.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
