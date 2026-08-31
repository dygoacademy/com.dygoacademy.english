/**
 * Web Push service worker (FR-6.1/6.3/6.4 delivery, FR-6.5 the 1-tap link).
 *
 * Deliberately minimal — this is not a PWA offline-caching worker (Module
 * 4's "local SQLite/IndexedDB cache" offline-first sync is a separate,
 * still-open gap noted in dygo_academy_master_project_schedule.md's Phase 2
 * status; this file has nothing to do with it). Its only job is turning a
 * push event into a visible notification, and a notification click into a
 * focused/opened tab at the deep link the backend sent
 * (PushDispatchService's `payload.url`, an absolute URL so this file needs
 * no knowledge of the frontend's own origin).
 */

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    return;
  }

  const { title, body, url, tag } = payload;
  event.waitUntil(
    self.registration.showNotification(title || 'Dygo Academy', {
      body,
      tag, // same tag replaces, rather than stacks, an unread reminder of the same kind
      data: { url },
      icon: '/icon-192.png',
      badge: '/icon-192.png',
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data && event.notification.data.url;
  if (!targetUrl) return;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Focus an already-open tab on the same origin rather than opening a
      // second one — a student who already has Dygo open shouldn't end up
      // with two tabs after tapping a reminder.
      const existing = clients.find((c) => c.url.startsWith(self.location.origin));
      if (existing) {
        return existing.navigate(targetUrl).then(() => existing.focus());
      }
      return self.clients.openWindow(targetUrl);
    }),
  );
});
