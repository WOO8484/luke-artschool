// ══════════════════════════════════════════════════════
// 루크미술학원 관리시스템 — Service Worker
// 버전을 올릴 때마다 CACHE_VERSION 숫자만 바꾸면 됩니다
// ══════════════════════════════════════════════════════
const CACHE_VERSION = 'luke-v2.6';
const CACHE_FILES = [
  './',
  './index.html'
];

// ── 설치: 새 버전 캐시 저장
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(CACHE_FILES))
      .then(() => self.skipWaiting()) // 즉시 활성화
  );
});

// ── 활성화: 이전 버전 캐시 삭제
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_VERSION)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim()) // 즉시 모든 탭에 적용
  );
});

// ── fetch: 네트워크 우선 → 실패 시 캐시 (항상 최신 버전 우선)
self.addEventListener('fetch', event => {
  // index.html은 항상 네트워크에서 먼저 가져옴 (최신 버전 보장)
  if(event.request.url.includes('index.html') || event.request.url.endsWith('/')) {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          // 새 버전을 캐시에도 저장
          const resClone = res.clone();
          caches.open(CACHE_VERSION).then(cache => cache.put(event.request, resClone));
          return res;
        })
        .catch(() => {
          // 오프라인 시 캐시에서 명시적으로 index.html 반환
          return caches.match('./index.html')
            || caches.match('/')
            || caches.match(event.request);
        })
    );
    return;
  }

  // 나머지 리소스는 캐시 우선 → 없으면 네트워크
  event.respondWith(
    caches.match(event.request)
      .then(cached => cached || fetch(event.request).catch(() => caches.match('./index.html')))
  );
});

// ── 메시지: SKIP_WAITING 수신 시 즉시 활성화
self.addEventListener('message', event => {
  if(event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
