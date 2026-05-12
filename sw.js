const CACHE_NAME = 'catat-uang-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Install event - cache semua static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
     .then((cache) => {
        console.log('Service Worker: Caching assets');
        return cache.addAll(STATIC_ASSETS);
      })
     .catch((error) => {
        console.error('Service Worker: Install error', error);
      })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName!== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - network first for API, cache first for assets
self.addEventListener('fetch', (event) => {
  if (event.request.method!== 'GET') return;

  if (event.request.url.includes('supabase') || event.request.url.includes('api')) {
    // Network first
    event.respondWith(
      fetch(event.request)
       .then((response) => {
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          }
          return response;
        })
       .catch(() => {
          return caches.match(event.request).then((response) => {
            return response || new Response('Offline - Data tidak tersedia', {
              status: 503,
              statusText: 'Service Unavailable'
            });
          });
        })
    );
  } else {
    // Cache first
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request).then((response) => {
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          }
          return response;
        }).catch(() => caches.match('/index.html'));
      })
    );
  }
});

// Background sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-transactions') {
    event.waitUntil(syncTransactions());
  }
});

async function syncTransactions() {
  try {
    const db = await openDB();
    const offlineTransactions = await getOfflineTransactions(db);

    for (const tx of offlineTransactions) {
      await fetch('/api/transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tx)
      });
      await markTransactionSynced(db, tx.id);
    }
  } catch (error) {
    console.error('Sync error:', error);
    throw error;
  }
}

// Push notification
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body || 'Ada update untuk Catat Uang',
      icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><rect fill="%2310b981" width="192" height="192"/><text x="96" y="120" font-size="120" fill="%23fff" text-anchor="middle">💸</text></svg>',
      badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect fill="%2310b981" width="96" height="96"/><text x="48" y="70" font-size="60" fill="%23fff" text-anchor="middle">💸</text></svg>',
      tag: 'catat-uang-notification',
      requireInteraction: false,
      actions: [
        { action: 'open', title: 'Buka' },
        { action: 'close', title: 'Tutup' }
      ]
    };

    event.waitUntil(self.registration.showNotification('Catat Uang', options));
  }
});

// Notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'open' ||!event.action) {
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url === '/' && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
    );
  }
});

// Message handler
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Dummy functions biar nggak error kalau belum diimplement
async function openDB() { return {}; }
async function getOfflineTransactions(db) { return []; }
async function markTransactionSynced(db, id) { return; }
