// Service worker : le jeu fonctionne hors ligne une fois ouvert une première fois (moteur et page en cache).
const BUILD = '974aca882ba5';
const CACHE = 'samarcande-' + BUILD;
const CORE = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png',
  './vendor/stockfish-19-lite-single.js', './vendor/stockfish-19-lite-single.wasm'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('samarcande-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET') return;
  // polices Google : on les garde au passage pour l'hors ligne (stale-while-revalidate)
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open(CACHE).then(async c => {
      const hit = await c.match(req);
      const net = fetch(req).then(r => { if (r.ok || r.type === 'opaque') c.put(req, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    }));
    return;
  }
  if (url.origin !== location.origin) return; // Gemini, repli unpkg… : réseau direct
  // la page : le réseau d'abord (nouvelle version dès qu'elle existe), le cache sinon
  if (req.mode === 'navigate' || url.pathname.endsWith('/index.html')) {
    e.respondWith(fetch(req).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put('./index.html', copy)); return r; })
      .catch(() => caches.match('./index.html').then(r => r || caches.match('./'))));
    return;
  }
  // fichiers fixes (moteur, icônes) : le cache d'abord
  e.respondWith(caches.match(req).then(r => r || fetch(req).then(n => { if (n.ok) { const copy = n.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return n; })));
});
