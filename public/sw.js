/* LCAPP SW v2 – cache statiky + offline fallback + PUSH notifikácie */
const CACHE = 'lcapp-static-v2';
const ASSETS = [
  '/', '/index.html',
  '/style.css',
  '/js/config.js',
  '/manifest.json'
  // prípadne doplň ďalšie statické assety (logo, fonty, CSS JS…)
];

/* ----- Install & Activate ----- */
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

/* ----- Fetch ----- */
/* HTML: network-first (ak si offline, spadne na /index.html),
   Assety: cache-first */
self.addEventListener('fetch', (e) => {
  const req = e.request;
  const isHTML = req.headers.get('accept')?.includes('text/html');

  if (isHTML) {
    e.respondWith(fetch(req).catch(() => caches.match('/index.html')));
    return;
  }

  e.respondWith(caches.match(req).then(cached => cached || fetch(req)));
});

/* ----- PUSH notifikácie ----- */
/* Pozn.: cesty ikon zlaď s manifestom – nižšie defaultujem na /icons/.
   Ak používaš /img/pwa-192.png, prehoď si ich späť. */
self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch {}

  const title = data.title || 'LCAPP';
  const options = {
    body: data.body || 'Máte novú správu.',
    icon: data.icon || '/icons/icon-192.png',
    badge: data.badge || '/icons/icon-192.png',
    data: { url: data.url || '/' }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

/* Klik na notifikáciu → zaostri otvorené okno alebo otvor nové */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((list) => {
        for (const c of list) {
          if ('focus' in c) {
            // ak je už otvorené, naviguj a fokusni
            c.navigate(url);
            return c.focus();
          }
        }
        return clients.openWindow(url);
      })
  );
});
