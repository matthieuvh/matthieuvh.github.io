// Service Worker — cache data.js + images, HTML toujours depuis le réseau
const DATA_CACHE = 'data-v1';
const IMG_CACHE  = 'img-v1';
const DATA_URL   = './data.js';

self.addEventListener('install', e => {
  self.skipWaiting();
  // Précache data.js dès l'install
  e.waitUntil(
    caches.open(DATA_CACHE).then(c => c.add(DATA_URL))
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== DATA_CACHE && k !== IMG_CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = e.request.url;

  // data.js : stale-while-revalidate
  if (url.endsWith('data.js')) {
    e.respondWith(
      caches.open(DATA_CACHE).then(cache =>
        cache.match(e.request).then(cached => {
          const fetchPromise = fetch(e.request).then(resp => {
            if (resp.ok) cache.put(e.request, resp.clone());
            return resp;
          });
          return cached || fetchPromise;
        })
      )
    );
    return;
  }

  // Images externes : cache-first (opaque ok)
  if (/\.(jpe?g|png|webp|gif)(\?|$)/i.test(url) ||
      url.includes('static.jow.fr') ||
      url.includes('yuka.io') ||
      url.includes('spoonacular.com')) {
    e.respondWith(
      caches.open(IMG_CACHE).then(cache =>
        cache.match(e.request).then(cached => {
          if (cached) return cached;
          return fetch(e.request, { mode: 'no-cors' }).then(resp => {
            if (resp) cache.put(e.request, resp.clone());
            return resp;
          }).catch(() => new Response('', { status: 408 }));
        })
      )
    );
    return;
  }

  // HTML et tout le reste : réseau direct, jamais de cache cassé
});
