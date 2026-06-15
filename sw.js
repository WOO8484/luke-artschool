// ══════════════════════════════════════════════════════
// 루크미술학원 관리시스템 — Service Worker (build1.8 업그레이드 완료)
// ══════════════════════════════════════════════════════
const CACHE_VERSION = 'v1.0-build1.8';
const CACHE_FILES = [
  './',
  './index.html',
  './manifest.json'
];

const FONT_CACHE = 'luke-fonts-v1';

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(CACHE_FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_VERSION && key !== FONT_CACHE)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || 
      event.request.url.includes('firebaseio.com') || 
      event.request.url.startsWith('chrome-extension://')) {
    return;
  }

  if(event.request.url.includes('fonts.googleapis.com') ||
     event.request.url.includes('fonts.gstatic.com')) {
    event.respondWith(
      caches.open(FONT_CACHE).then(cache =>
        cache.match(event.request).then(cached => {
          if(cached) return cached;
          return fetch(event.request).then(res => {
            cache.put(event.request, res.clone());
            return res;
          });
        })
      ).catch(() => caches.match(event.request))
    );
    return;
  }

  if(event.request.url.includes('index.html') || event.request.url.endsWith('/') || event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          if (res && res.status === 200) {
            const resClone = res.clone();
            caches.open(CACHE_VERSION).then(cache => cache.put(event.request, resClone));
          }
          return res;
        })
        .catch(() => {
          return caches.match('./index.html')
            || caches.match('/index.html')
            || caches.match('./')
            || caches.match('/');
        })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(cached => cached || fetch(event.request))
  );
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
