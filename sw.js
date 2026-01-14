// public/sw.js
const CACHE_NAME = 'xuanshu-pwa-v1';
const OFFLINE_URL = '/';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.add(OFFLINE_URL); // 缓存首页
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // 只处理 GET 请求
  if (request.method !== 'GET') return;

  // 忽略非同源请求（如 API、外部 CDN）
  if (!request.url.startsWith(self.location.origin)) return;

  // 动态缓存策略：网络优先 + 自动缓存静态资源
  event.respondWith(
    fetch(request).then((response) => {
      // 克隆响应以便缓存
      const clonedResponse = response.clone();

      // 判断是否为可缓存的静态资源
      if (
        response.type === 'basic' &&
        response.status === 200 &&
        (request.destination === 'script' ||
         request.destination === 'style' ||
         request.destination === 'image' ||
         request.url.endsWith('.js') ||
         request.url.endsWith('.css') ||
         request.url.endsWith('.png') ||
         request.url.endsWith('.jpg') ||
         request.url.endsWith('.svg'))
      ) {
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, clonedResponse);
        });
      }

      return response;
    }).catch(() => {
      // 网络失败时，尝试从缓存返回
      return caches.match(request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        // 如果是页面导航请求，返回离线页（首页）
        if (request.mode === 'navigate') {
          return caches.match(OFFLINE_URL);
        }
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});