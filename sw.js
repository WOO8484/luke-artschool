// ══════════════════════════════════════════════════════
// 루크미술학원 관리시스템 — Service Worker (수정본)
//
// 버전 규칙:
//   CACHE_VERSION 앞부분(v1.0) → 메이저 업데이트 시 변경
//   CACHE_VERSION 뒷부분(build1.X) → 마이너 패치 시 변경
//   index.html의 CURRENT_SW_VERSION과 항상 동일하게 유지
// ══════════════════════════════════════════════════════
const CACHE_VERSION = 'v1.0-build1.8'; // 버전 번호를 부드럽게 한 단계 갱신(1.7 -> 1.8)
const CACHE_FILES = [
  './',
  './index.html',
  './manifest.json'
];

// Google Fonts 캐시 전용 이름 (별도 관리 — 버전 업해도 유지)
const FONT_CACHE = 'luke-fonts-v1';

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
          .filter(key => key !== CACHE_VERSION && key !== FONT_CACHE)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim()) // 즉시 모든 탭에 적용
  );
});

// ── 데이터 처리 및 네트워크 요청 가로채기 (Fetch)
self.addEventListener('fetch', event => {
  // POST 요청이나 크롬 확장프로그램, Firebase 실시간 DB 요청(EventSource/WebSocket/HTTP통신)은 캐시 제외
  if (event.request.method !== 'GET' || 
      event.request.url.includes('firebaseio.com') || 
      event.request.url.startsWith('chrome-extension://')) {
    return;
  }

  // Google Fonts — 캐시 우선 (오프라인에서도 폰트 유지)
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

  // index.html 및 루트 경로는 네트워크 최신 버전 보장 전략 (Network-First)
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
          // 네트워크 단절 혹은 깃허브 배포 꼬임 등 일시 오류 시 안전하게 캐시에서 반환
          return caches.match('./index.html')
            || caches.match('/index.html')
            || caches.match('./')
            || caches.match('/');
        })
    );
    return;
  }

  // 나머지 리소스(이미지, CSS 등)는 캐시 우선 → 없으면 네트워크
  event.respondWith(
    caches.match(event.request)
      .then(cached => cached || fetch(event.request)
        .catch(() => caches.match('./index.html') || caches.match('/index.html'))
      )
  );
});

// 외부로부터 오는 제어 메시지 처리
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
