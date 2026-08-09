// 销售订单管理系统 Service Worker：仅缓存应用壳资源，不缓存 Supabase API 与 version.json，
// 确保订单等实时业务数据走 network-only，避免多设备看到旧缓存。
// 缓存名含版本号：每次部署换名 → SW 重新安装 → 强制重新拉取 index.html / 静态资源，杜绝旧 js 残留。
const CACHE = 'soms-2026-0809-12';
const ASSETS = [
  './',
  './index.html',
  './libs/supabase.min.js',
  './libs/chart.umd.min.js',
  './manifest.json',
  './icon-192.png'
];

// 判断请求是否为需要绕过 SW 缓存的实时接口（Supabase REST/Realtime、版本标记）
function shouldBypassCache(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes('supabase.co')) return true;
    if (u.pathname.includes('/rest/v1/')) return true;
    if (u.pathname.includes('/realtime/')) return true;
    if (u.pathname.endsWith('/version.json')) return true;
  } catch (_) {}
  return false;
}

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

  // 对 Supabase 接口与 version.json 完全不拦截，让浏览器直接走网络，避免缓存实时数据
  if (shouldBypassCache(e.request.url)) {
    return;
  }

  // 应用壳资源：网络优先，离线回退缓存
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
