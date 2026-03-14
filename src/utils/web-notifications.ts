// ─── Web Service Worker Registration ──────────────────────────────────────────
// Register service worker for web push notifications

export async function registerServiceWorker(): Promise<boolean> {
    try {
        if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
            console.log('Service Workers not supported in this environment');
            return false;
        }

        const registration = await navigator.serviceWorker.register('/service-worker.js');
        console.log('Service Worker registered:', registration);
        return true;
    } catch (error) {
        console.error('Service Worker registration failed:', error);
        return false;
    }
}

// Test notification function
export function sendTestNotification(): void {
    try {
        if (typeof window === 'undefined' || !('Notification' in window)) {
            console.log('Notifications not supported');
            return;
        }

        if (Notification.permission === 'granted') {
            new Notification('Test Notification', {
                body: 'This is a test notification from the app',
                icon: '/favicon.ico',
            });
        } else {
            console.log('Notification permission not granted');
        }
    } catch (error) {
        console.error('Error sending notification:', error);
    }
}
