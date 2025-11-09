const cacheName = 'kanban-v1';
const assetsToCache = [
  './',
  './index.html',
  './manifest.json',
  // Include external or separate CSS/JS files if any, or inline styles/scripts are already in index.html
  // './styles.css',
  // './script.js',
  // Add your icons as well
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(cacheName)
    .then(cache => cache.addAll(assetsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
    .then(response => response || fetch(event.request))
  );
});
