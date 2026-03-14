// ─── Service Worker for Web Push Notifications ────────────────────────────────
// This service worker enables push notifications on web

self.addEventListener('install', (event) => {
    console.log('Service Worker installed');
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    console.log('Service Worker activated');
    event.waitUntil(clients.claim());
});

self.addEventListener('push', (event) => {
    console.log('Push notification received:', event);

    const options = {
        body: 'You have a new class notification',
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        vibrate: [100, 50, 100],
        tag: 'class-notification',
        requireInteraction: true,
        actions: [
            {
                action: 'open',
                title: 'Open',
            },
            {
                action: 'close',
                title: 'Close',
            },
        ],
    };

    if (event.data) {
        try {
            const data = event.data.json();
            if (data.title) options.title = data.title;
            if (data.body) options.body = data.body;
            if (data.icon) options.icon = data.icon;
        } catch (e) {
            options.title = event.data.text();
        }
    }

    event.waitUntil(self.registration.showNotification('Class Notification', options));
});

self.addEventListener('notificationclick', (event) => {
    console.log('Notification clicked:', event);

    if (event.action === 'close') {
        event.notification.close();
        return;
    }

    // Open the app or bring it to focus
    event.waitUntil(
        clients.matchAll({ type: 'window' }).then((clientList) => {
            // Check if the app is already open
            for (let client of clientList) {
                if (client.url === '/' && 'focus' in client) {
                    return client.focus();
                }
            }
            // If not open, open it
            if (clients.openWindow) {
                return clients.openWindow('/');
            }
        })
    );

    event.notification.close();
});

self.addEventListener('notificationclose', (event) => {
    console.log('Notification closed:', event);
});
