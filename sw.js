// Service Worker - 销售订单管理系统 PWA
const CACHE_NAME = 'sales-mgmt-v2';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// 安装：缓存核心资源
self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return cache.addAll(CORE_ASSETS).catch(function(){
        // 部分资源缓存失败不影响安装
        return Promise.resolve();
      });
    })
  );
  self.skipWaiting();
});

// 激活：清理旧缓存
self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(names){
      return Promise.all(
        names.filter(function(n){ return n !== CACHE_NAME; })
             .map(function(n){ return caches.delete(n); })
      );
    })
  );
  self.clients.claim();
});

// 请求拦截：缓存优先，网络回退
self.addEventListener('fetch', function(e){
  // 跳过非 GET 请求
  if(e.request.method !== 'GET') return;

  e.respondWith(
    caches.match(e.request).then(function(cached){
      if(cached) return cached;

      return fetch(e.request).then(function(response){
        // 成功的响应缓存一份（排除跨域和不支持的协议）
        if(response && response.status === 200 && response.type === 'basic'){
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache){
            cache.put(e.request, clone);
          });
        }
        return response;
      }).catch(function(){
        // 离线时返回缓存的 HTML 作为兜底
        if(e.request.mode === 'navigate'){
          return caches.match('./index.html');
        }
        return new Response('离线状态，数据已保存在本地', {
          status: 503,
          statusText: 'Offline',
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      });
    })
  );
});
