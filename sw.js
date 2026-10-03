// 値札帳 Service Worker
// index.html などを更新して公開したら、VERSION の数字を上げてください。
const VERSION = 'v1';
const SHELL = `nefuda-shell-${VERSION}`;
const RUNTIME = 'nefuda-runtime';
const FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(FILES)));
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) {
      if (k.startsWith('nefuda-shell-') && k !== SHELL) await caches.delete(k);
    }
    await self.clients.claim();
  })());
});

// ページの「再読み込み」ボタンから新しい版に切り替える
self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;            // API呼び出し(POST)には触れない
  const url = new URL(req.url);

  // 画面遷移：キャッシュの index.html を即表示（オフライン対応）
  if (req.mode === 'navigate') {
    e.respondWith(caches.match('./index.html').then(r => r || fetch(req)));
    return;
  }

  // 同じサイトのファイル：キャッシュ優先
  if (url.origin === self.location.origin) {
    e.respondWith(caches.match(req).then(r => r || fetch(req)));
    return;
  }

  // Google Fonts：キャッシュを返しつつ裏で更新
  if (url.hostname.endsWith('fonts.googleapis.com') || url.hostname.endsWith('fonts.gstatic.com')) {
    e.respondWith((async () => {
      const cache = await caches.open(RUNTIME);
      const hit = await cache.match(req);
      const net = fetch(req).then(res => { if (res.ok || res.type === 'opaque') cache.put(req, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    })());
  }
});
