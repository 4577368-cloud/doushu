// sw.js
const CACHE_NAME = 'doushu-pwa-v3'; // 缓存版本号
const OFFLINE_URL = '/';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // 缓存首页和关键资源
      return cache.addAll([
        OFFLINE_URL,
        '/index.html',
        '/manifest.json'
      ]); 
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // 只处理 GET 请求
  if (request.method !== 'GET') return;
  // 忽略非同源请求
  if (!request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    fetch(request).then((response) => {
      // 如果网络请求成功，克隆一份存入缓存（动态缓存策略）
      const clonedResponse = response.clone();
      
      // 缓存 JS, CSS, 图片, 字体文件
      if (response.status === 200 && (
          request.destination === 'script' ||
          request.destination === 'style' ||
          request.destination === 'image' ||
          request.destination === 'font' ||
          request.url.includes('.js') ||
          request.url.includes('.css')
      )) {
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, clonedResponse);
        });
      }
      return response;
    }).catch(() => {
      // 网络断开时，尝试从缓存读取
      return caches.match(request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        // 如果是页面导航，返回首页
        if (request.mode === 'navigate') {
          return caches.match(OFFLINE_URL);
        }
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  // 清理旧版本的缓存
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});