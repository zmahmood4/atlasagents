// ATLAS AI — Service Worker
// Handles: app-shell caching, push notifications, background sync

const CACHE = 'atlas-v1';
const SHELL = ['/', '/agents', '/approvals', '/work', '/experiments', '/financials', '/knowledge', '/settings'];

// Install — cache the app shell
self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then((c) =>
      c.addAll(SHELL).catch(() => {/* offline install — ignore missing pages */})
    )
  );
});

// Activate — clean old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch — network-first for API, cache-first for assets
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // API calls: always network
  if (url.pathname.startsWith('/api/') || url.hostname.includes('onrender.com') || url.hostname.includes('supabase.co')) {
    e.respondWith(fetch(e.request).catch(() => new Response('{"error":"offline"}', { headers: { 'Content-Type': 'application/json' } })));
    return;
  }

  // Static assets: cache-first
  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;
      return fetch(e.request).then((res) => {
        if (res.ok && e.request.method === 'GET') {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, clone));
        }
        return res;
      }).catch(() => caches.match('/') || new Response('Offline'));
    })
  );
});

// Push notifications
self.addEventListener('push', (e) => {
  let data = { title: 'ATLAS', body: 'Agent update', tag: 'atlas-update', icon: '/icons/icon-192.svg' };
  try { data = { ...data, ...e.data.json() }; } catch {}

  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/icon-192.svg',
      badge: '/icons/icon-192.svg',
      tag: data.tag,
      data: data.url || '/',
      requireInteraction: data.urgent || false,
      silent: false,
      vibrate: [100, 50, 100],
      actions: data.actions || [],
    })
  );
});

// Notification click — open relevant page
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = e.notification.data || '/';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});

// Background message from app → post updates to notification
self.addEventListener('message', (e) => {
  if (e.data?.type === 'NOTIFY') {
    self.registration.showNotification(e.data.title, {
      body: e.data.body,
      icon: '/icons/icon-192.svg',
      badge: '/icons/icon-192.svg',
      tag: e.data.tag || 'atlas',
      data: e.data.url || '/approvals',
      vibrate: [100, 50, 100],
    });
  }
  if (e.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
