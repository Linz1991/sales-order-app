// 销售订单管理系统 Service Worker：网络优先，离线时回退到缓存，保证断网也能打开页面查看历史数据
const CACHE = 'soms-v29';
const ASSETS = [
  './',
  './index.html',
  './libs/supabase.min.js',
  './libs/chart.umd.min.js',
  './manifest.json',
  './icon-192.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(async c => {
      // 逐条缓存：任一资源失败不影响其余，避免整个 SW 安装失败导致无法更新
      for (const url of ASSETS) {
        try { const res = await fetch(url); if (res && res.ok) await c.put(url, res); }
        catch (_) { /* 忽略单个资源失败，继续缓存其余 */ }
      }
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request).then(m => m || caches.match('./index.html')))
  );
});
