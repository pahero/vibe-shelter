self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let notification;
  try { notification = event.data.json(); } catch { notification = { title: "Shelter notification", body: event.data.text() }; }
  event.waitUntil(self.registration.showNotification(notification.title || "Shelter notification", {
    body: notification.body || "You have a new notification.",
    icon: "/icon.svg",
    data: { url: notification.url || "/" },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/", self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const existing = windows.find((client) => "focus" in client);
    if (existing) {
      const navigated = await existing.navigate(url).catch(() => null);
      if (navigated) {
        await navigated.focus();
        return;
      }
    }
    await self.clients.openWindow(url);
  })());
});
