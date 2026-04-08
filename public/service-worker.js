// ─── Service Worker for Web Push Notifications ────────────────────────────────
// This service worker enables push notifications on web and handles notification interactions

self.addEventListener("install", (event) => {
  console.log("[ServiceWorker] installed");
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  console.log("[ServiceWorker] activated");
  event.waitUntil(clients.claim());
});

self.addEventListener("push", (event) => {
  console.log("[ServiceWorker] push notification received:", event);

  const options = {
    body: "You have a new class notification",
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    vibrate: [100, 50, 100],
    tag: "class-notification",
    requireInteraction: true,
    actions: [
      {
        action: "open",
        title: "Open",
      },
      {
        action: "close",
        title: "Close",
      },
    ],
  };

  if (event.data) {
    try {
      const data = event.data.json();
      if (data.title) options.title = data.title;
      if (data.body) options.body = data.body;
      if (data.icon) options.icon = data.icon;
      if (data.tag) options.tag = data.tag;
      if (data.badge) options.badge = data.badge;
      if (data.requireInteraction !== undefined)
        options.requireInteraction = data.requireInteraction;
      if (data.actions) options.actions = data.actions;
      if (data.data) options.data = data.data;
    } catch (e) {
      console.error("[ServiceWorker] Error parsing push data:", e);
      options.title = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(
      options.title || "Class Notification",
      options,
    ),
  );
});

self.addEventListener("notificationclick", (event) => {
  console.log("[ServiceWorker] notification clicked:", event);

  if (event.action === "close") {
    event.notification.close();
    return;
  }

  // Default action: open the app or bring it to focus
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Check if the app is already open
        for (let client of clientList) {
          if (client.url.includes("/") && "focus" in client) {
            console.log(
              "[ServiceWorker] Focusing existing client:",
              client.url,
            );
            return client.focus();
          }
        }
        // If not open, open it
        console.log("[ServiceWorker] Opening new window");
        if (clients.openWindow) {
          return clients.openWindow("/");
        }
      }),
  );

  event.notification.close();
});

self.addEventListener("notificationclose", (event) => {
  console.log("[ServiceWorker] notification closed:", event.notification.tag);
});

// Handle messages from the app
self.addEventListener("message", (event) => {
  console.log("[ServiceWorker] message received:", event.data);

  if (event.data.type === "CLOSE_ALL_NOTIFICATIONS") {
    // Get all active notifications and close them
    self.registration.getNotifications().then((notifications) => {
      console.log(
        `[ServiceWorker] closing ${notifications.length} notifications`,
      );
      notifications.forEach((notification) => {
        notification.close();
      });
    });
  }
});
