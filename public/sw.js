// Service Worker for Push Notifications
// Served from /public at root scope

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data;
  if (!event.data) {
    // Payload decryption failed (likely key mismatch) — show fallback
    data = { title: 'The Forge', body: 'New update available', data: { type: 'fallback' } };
  } else {
    try {
      data = event.data.json();
    } catch {
      data = { title: 'The Forge', body: event.data.text() };
    }
  }

  const options = {
    body: data.body || '',
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/icon-192.png',
    data: data.data || {},
    vibrate: [200, 100, 200],
    tag: data.data?.type || 'default',
    renotify: true,
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'The Forge', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          if (client.url.includes(self.location.origin)) {
            client.focus();
            client.navigate(url);
            return;
          }
        }
        return self.clients.openWindow(url);
      })
  );
});

self.addEventListener('pushsubscriptionchange', (event) => {
  // Browser rotated push credentials — auto-re-subscribe
  event.waitUntil(
    self.registration.pushManager
      .subscribe(event.oldSubscription?.options || { userVisibleOnly: true })
      .then((newSub) =>
        fetch('/api/notifications/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subscription: newSub.toJSON(),
            userAgent: 'sw-auto-resubscribe',
          }),
        })
      )
      .catch((err) => console.error('pushsubscriptionchange re-subscribe failed:', err))
  );
});
