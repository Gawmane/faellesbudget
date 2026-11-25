// Service worker: gør at appen kan installeres og åbner hurtigt, også uden net.
// Data synkroniseres af Firebase selv; her caches kun selve app-filerne.
// Hæv VERSION når filerne ændres, så telefonerne henter den nye udgave.
const VERSION = 'v18';
const CACHE = 'faellesbudget-' + VERSION;
const SHELL = ['./', './index.html', './firebase-config.js', './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png', './icons/favicon.png'];
const CDN = ['https://www.gstatic.com/firebasejs/', 'https://cdn.jsdelivr.net/npm/@tabler/'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('faellesbudget-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = req.url;
  const sameOrigin = new URL(url).origin === self.location.origin;

  // Egne filer: hent altid nyeste fra nettet (forbi browserens 10-min. cache), brug cachen hvis offline
  if (sameOrigin) {
    e.respondWith(fetch(req, { cache: 'no-cache' }).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req).then(r => r || caches.match('./index.html'))));
    return;
  }
  // Biblioteker fra CDN (versionerede): cache først
  if (CDN.some(p => url.startsWith(p))) {
    e.respondWith(caches.match(req).then(r => r || fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    })));
  }
  // Alt andet (Firebase login og database) går direkte på nettet
});

// Påmindelser sendt af det daglige job (tools/notify) via Firebase Cloud Messaging
self.addEventListener('push', e => {
  let d = {};
  try { const j = e.data ? e.data.json() : {}; d = j.data || j.notification || j; } catch { d = { body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || 'Fællesbudget', {
    body: d.body || '', icon: './icons/icon-192.png', badge: './icons/favicon.png',
    tag: d.tag || 'faellesbudget', data: { url: d.url || './#check' }
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = new URL(e.notification.data?.url || './#check', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
    for (const c of cs) if (c.url.startsWith(self.registration.scope)) { c.navigate(url); return c.focus(); }
    return self.clients.openWindow(url);
  }));
});
