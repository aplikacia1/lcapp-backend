// backend/public/sw.js
self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch {}
  const title = data.title || 'Nová správa';
  const options = {
    body: data.body || '',
    icon: '/img/pwa-192.png',           // ak nemáš, daj hocijakú malú ikonku
    badge: '/img/pwa-badge.png',        // voliteľné
    data: { url: data.url || '/' }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((list) => {
        for (const c of list) {
          // ak už je otvorené – len fokus + navigácia
          if ('focus' in c) { c.navigate(url); return c.focus(); }
        }
        return clients.openWindow(url);
      })
  );
});
