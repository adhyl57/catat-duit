const CACHE_NAME = 'catat-duit-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js',
  'https://cdn.jsdelivr.net/npm/eruda'
];

// Install: simpan file penting ke cache
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Caching app shell');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// Activate: hapus cache lama
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch: ambil dari cache dulu, kalau nggak ada baru fetch
self.addEventListener('fetch', event => {
  // Skip Supabase API calls, biar data tetap fresh
  if (event.request.url.includes('supabase.co')) {
    return fetch(event.request);
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        return response || fetch(event.request).then(fetchRes => {
          return caches.open(CACHE_NAME).then(cache => {
            // Cache file statis baru
            if (event.request.method === 'GET' && fetchRes.ok) {
              cache.put(event.request, fetchRes.clone());
            }
            return fetchRes;
          });
        });
      })
      .catch(() => caches.match('/index.html'))
  );
});
