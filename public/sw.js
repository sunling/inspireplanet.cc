const CACHE_NAME = 'inspire-planet-v2';
const STATIC_ASSETS_CACHE = 'inspire-planet-assets-v2';

self.addEventListener('install', (event) => {
  // 立即激活，不等旧 SW 关闭
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(['/manifest.json', '/images/logo.png']);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      // 清理旧版本缓存
      caches
        .keys()
        .then((cacheNames) =>
          Promise.all(
            cacheNames
              .filter(
                (name) => name !== CACHE_NAME && name !== STATIC_ASSETS_CACHE
              )
              .map((name) => caches.delete(name))
          )
        ),
      // 立即接管所有客户端
      self.clients.claim(),
    ])
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // 开发环境跳过
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
    return;
  }

  // 只处理 GET 和 http/https
  if (request.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  // API 请求不缓存
  if (
    url.pathname.startsWith('/.netlify/functions') ||
    url.pathname.startsWith('/api')
  ) {
    return;
  }

  // index.html 和页面路由：网络优先，网络失败才用缓存兜底
  const isNavigation =
    request.mode === 'navigate' ||
    url.pathname === '/' ||
    (!url.pathname.includes('.') && !url.pathname.startsWith('/assets'));

  if (isNavigation) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // 带 hash 的静态资源（assets/index-abc123.js）：缓存优先，永久有效
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.open(STATIC_ASSETS_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;

        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      })
    );
    return;
  }

  // 其他静态文件：网络优先
  event.respondWith(
    fetch(request)
      .then((response) => {
        const responseClone = response.clone();
        if (response.ok) {
          caches
            .open(CACHE_NAME)
            .then((cache) => cache.put(request, responseClone));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
