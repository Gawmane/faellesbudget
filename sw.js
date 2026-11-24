// Service worker: gør at appen kan installeres og åbner hurtigt, også uden net.
// Data synkroniseres af Firebase selv; her caches kun selve app-filerne.
// Hæv VERSION når filerne ændres, så telefonerne henter den nye udgave.
const VERSION = 'v1';
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

  // Egne filer: hent nyeste fra nettet, brug cachen hvis offline
  if (sameOrigin) {
    e.respondWith(fetch(req).then(res => {
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
