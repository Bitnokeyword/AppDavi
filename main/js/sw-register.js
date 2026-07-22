(function () {
  if (!('serviceWorker' in navigator)) return;

  // Version — increment this string any time you update the file
  const VERSION = 'pos-v1';

  const swCode = `
const VERSION = '${VERSION}';
const CACHE   = VERSION;

// On install: cache nothing upfront (file:// has no URL to cache)
// We use runtime caching for everything instead
self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  // Delete all old caches
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Cache-first with network fallback
self.addEventListener('fetch', e => {
  // Skip non-GET and chrome-extension requests
  if (e.request.method !== 'GET') return;
  if (e.request.url.startsWith('chrome-extension')) return;

  e.respondWith(
    caches.open(CACHE).then(cache =>
      cache.match(e.request).then(cached => {
        if (cached) return cached;           // ← serve from cache instantly

        return fetch(e.request)
          .then(response => {
            // Only cache valid responses
            if (response && response.status === 200 && response.type !== 'opaque') {
              cache.put(e.request, response.clone());
            }
            return response;
          })
          .catch(() => cached || new Response(
            '<h2 style="font-family:sans-serif;padding:20px">Sin conexión — abre la app mientras tengas internet la primera vez.</h2>',
            { headers: { 'Content-Type': 'text/html' } }
          ));
      })
    )
  );
});
`;

  // Register SW from a blob URL (works for file:// and http://)
  const blob = new Blob([swCode], { type: 'application/javascript' });
  const swURL = URL.createObjectURL(blob);

  navigator.serviceWorker.register(swURL, { scope: './' })
    .then(reg => {
      console.log('[SW] Registrado — scope:', reg.scope);
      // Cache the current page on first load
      if ('caches' in window) {
        caches.open(VERSION).then(cache => {
          cache.add(location.href).catch(() => {});
        });
      }
    })
    .catch(err => console.warn('[SW] No se pudo registrar:', err));

  // Notify user when app is ready to work offline
  navigator.serviceWorker.ready.then(() => {
    const pill = document.getElementById('offline-pill');
    if (!navigator.onLine && pill) pill.classList.add('show');
  });
})();
