self.addEventListener("push", (event) => {
  if (!event.data) return;
  let notification;
  try { notification = event.data.json(); } catch { notification = { title: "Shelter notification", body: event.data.text() }; }
  event.waitUntil(self.registration.showNotification(notification.title || "Shelter notification", {
    body: notification.body || "You have a new notification.",
    icon: "/favicon.ico",
    data: { url: notification.url || "/" },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
    const existing = windows.find((client) => "focus" in client);
    return existing ? existing.navigate(url).then((client) => client?.focus()) : clients.openWindow(url);
  }));
});
