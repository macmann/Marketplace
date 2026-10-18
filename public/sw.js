const CACHE = 'neighbour-shell-v1';
const SHELL = ['/offline.html', '/icon.svg', '/icon-192.png', '/icon-512.png'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('neighbour-shell-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  // Network-only HTML, RSC, media, messages and account data. Never persist authenticated responses.
  if (request.mode === 'navigate') event.respondWith(fetch(request).catch(() => caches.match('/offline.html')));
  else if (SHELL.includes(new URL(request.url).pathname)) event.respondWith(caches.match(request).then(cached => cached || fetch(request)));
});
self.addEventListener('push', event => {
  event.waitUntil(self.registration.showNotification('Neighbour', {
    body: 'You have a new marketplace notification. Open Neighbour to read it.',
    icon: '/icon-192.png', tag: 'neighbour-inbox', data: { url: '/account/notifications' }
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(async clients => {
    for (const client of clients) if (new URL(client.url).origin===self.location.origin) { await client.navigate('/account/notifications'); return client.focus(); }
    return self.clients.openWindow('/account/notifications');
  }));
});
