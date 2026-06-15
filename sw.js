// ══════════════════════════════════════════════════════
// 루크미술학원 관리시스템 — Service Worker (안정성 패치 버전)
// ══════════════════════════════════════════════════════
const CACHE_VERSION = 'v1.0-build1.8';
const CACHE_FILES = [
  './',
  './index.html',
  './manifest.json'
];

const FONT_CACHE = 'luke-fonts-v1';

// ── 설치: 새 버전 캐시 저장
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(CACHE_FILES))
      .then(() => self.skipWaiting())
  );
});

// ── 활성화: 이전 버전 캐시 완전 삭제
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

// ── 메시지 수신: 즉시 활성화 요청 처리
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ── 네트워크 요청 가로채기 및 캐싱 전략
self.addEventListener('fetch', event => {
  // Google Fonts 캐싱
  if (event.request.url.includes('fonts.googleapis.com') ||
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

  // index.html은 항상 네트워크에서 최신 버전을 먼저 가져옴
  if(event.request.url.includes('index.html') || event.request.url.endsWith('/')) {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          const resClone = res.clone();
          caches.open(CACHE_VERSION).then(cache => cache.put(event.request, resClone));
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

  // 나머지 리소스는 캐시 우선 전략
  event.respondWith(
    caches.match(event.request)
      .then(cached => cached || fetch(event.request)
        .catch(() => caches.match('./index.html')))
  );
});
