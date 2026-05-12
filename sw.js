const CACHE_NAME = 'catat-duit-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.url.includes('supabase.co')) {
    return event.respondWith(fetch(event.request));
  }

  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request).then(fetchRes => {
        if (event.request.method === 'GET' && fetchRes.ok && event.request.url.startsWith('http')) {
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, fetchRes.clone()));
        }
        return fetchRes;
      });
    }).catch(() => caches.match('/index.html'))
  );
});
