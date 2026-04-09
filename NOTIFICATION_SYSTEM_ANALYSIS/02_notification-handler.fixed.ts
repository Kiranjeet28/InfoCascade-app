import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * Navigation Reference Type
 * This will be set by your root navigator component
 */
export let notificationNavigationRef: any = null;

/**
 * Set the navigation reference for notification deep linking
 * Call this from your root navigator after it's initialized
 *
 * @example
 * setNotificationNavigationRef(navigationRef)
 */
export function setNotificationNavigationRef(ref: any) {
  notificationNavigationRef = ref;
  console.log('[NotificationHandler] Navigation ref initialized');
}

/**
 * Configure how notifications are displayed when app is in foreground
 */
export function configureNotificationHandler() {
  if (Platform.OS === 'web') {
    console.log('[NotificationHandler] Skipping notification handler configuration on web platform');
    return;
  }

  try {
    // Configure notification display behavior
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,        // Show banner/alert
        shouldPlaySound: true,        // Play notification sound
        shouldSetBadge: true,         // Show app badge count
        shouldShowBanner: true,       // Show notification banner (iOS 14+)
        shouldShowList: true,         // Show in notification list
      }),
    });

    console.log('[NotificationHandler] Notification handler configured successfully');
  } catch (error) {
    console.error('[NotificationHandler] Error configuring notification handler:', error);
  }
}

/**
 * Handle deep linking from notification data
 * Routes user to appropriate screen based on notification content
 */
function handleNotificationDeepLink(data: Record<string, any>) {
  if (!notificationNavigationRef?.isReady?.()) {
    console.warn('[NotificationHandler] Navigation reference not ready for deep linking');
    return;
  }

  try {
    // Route based on notification type
    if (data.type === 'class-start' || data.type === 'class-reminder') {
      console.log('[NotificationHandler] Navigating to Timetable with class data:', {
        subject: data.subject,
        time: data.classTime,
        room: data.room,
      });

      notificationNavigationRef.navigate('Timetable', {
        classSubject: data.subject,
        classTime: data.classTime,
        room: data.room,
        notificationType: data.type,
      });
    } else if (data.deepLink) {
      // Generic deep link support
      console.log('[NotificationHandler] Following deep link:', data.deepLink);
      notificationNavigationRef.navigate(data.deepLink);
    } else {
      console.log('[NotificationHandler] No specific route for notification data');
    }
  } catch (error) {
    console.error('[NotificationHandler] Error during deep linking:', error);
  }
}

/**
 * Setup all notification listeners
 * Must be called after navigation is ready
 *
 * Handles:
 * - Notifications received while app is foreground
 * - User tapping on notifications
 * - App opened from killed state via notification
 */
export function setupNotificationListeners() {
  if (Platform.OS === 'web') {
    console.log('[NotificationHandler] Skipping notification listeners on web platform');
    return;
  }

  try {
    console.log('[NotificationHandler] Setting up notification listeners...');

    // ───────────────────────────────────────────────────────────────────
    // 1. NOTIFICATION RECEIVED (foreground, app is open)
    // ───────────────────────────────────────────────────────────────────
    const receivedSubscription = Notifications.addNotificationReceivedListener((notification) => {
      console.log('[NotificationHandler] Notification received in foreground:', {
        title: notification.request.content.title,
        body: notification.request.content.body,
        data: notification.request.content.data,
      });

      // Could trigger analytics or logging here
      // Example: analytics.logEvent('notification_received', notification.request.content.data);
    });

    // ───────────────────────────────────────────────────────────────────
    // 2. NOTIFICATION RESPONSE (user tapped notification)
    // ───────────────────────────────────────────────────────────────────
    const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const { title, body, data } = response.notification.request.content;

      console.log('[NotificationHandler] User tapped notification:', {
        title,
        body,
        data,
        userInteraction: 'tapped',
      });

      // Handle deep linking based on notification data
      if (data && Object.keys(data).length > 0) {
        handleNotificationDeepLink(data as Record<string, any>);
      }
    });

    // ───────────────────────────────────────────────────────────────────
    // 3. APP OPENED FROM NOTIFICATION (killed state)
    // ───────────────────────────────────────────────────────────────────
    // This handles when app was killed and user taps notification to open it
    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (!response) {
          console.log('[NotificationHandler] App not opened from notification');
          return;
        }

        const { title, body, data } = response.notification.request.content;

        console.log('[NotificationHandler] App opened from notification (killed state):', {
          title,
          body,
          data,
        });

        // Small delay to ensure navigation is ready
        const timer = setTimeout(() => {
          if (data && Object.keys(data).length > 0) {
            handleNotificationDeepLink(data as Record<string, any>);
          }
        }, 500);

        return () => clearTimeout(timer);
      })
      .catch((error) => {
        console.error('[NotificationHandler] Error checking last notification:', error);
      });

    console.log('[NotificationHandler] Notification listeners setup complete');

    // Return cleanup function
    return () => {
      console.log('[NotificationHandler] Cleaning up notification listeners');
      receivedSubscription.remove();
      responseSubscription.remove();
    };
  } catch (error) {
    console.error('[NotificationHandler] Error setting up notification listeners:', error);
    return undefined;
  }
}

/**
 * Utility: Log all currently scheduled notifications
 * Useful for debugging
 */
export async function logScheduledNotifications() {
  if (Platform.OS === 'web') return;

  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    console.log('[NotificationHandler] Currently scheduled notifications:');
    scheduled.forEach((notif, index) => {
      console.log(`  [${index}]`, {
        id: notif.identifier,
        title: notif.content.title,
        trigger: notif.trigger,
      });
    });
  } catch (error) {
    console.error('[NotificationHandler] Error logging scheduled notifications:', error);
  }
}

/**
 * Utility: Clear all scheduled notifications
 * Only call when user explicitly disables notifications
 */
export async function clearAllScheduledNotifications() {
  if (Platform.OS === 'web') return;

  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('[NotificationHandler] All scheduled notifications cleared');
  } catch (error) {
    console.error('[NotificationHandler] Error clearing scheduled notifications:', error);
  }
}

/**
 * Utility: Send a test notification (for debugging)
 */
export async function sendTestNotification() {
  if (Platform.OS === 'web') return;

  try {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: '✅ Test Notification',
        body: 'This is a test notification. If you see this, notifications are working!',
        data: {
          type: 'test',
          timestamp: new Date().toISOString(),
        },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 2,
      },
    });

    console.log('[NotificationHandler] Test notification scheduled:', notificationId);
  } catch (error) {
    console.error('[NotificationHandler] Error sending test notification:', error);
  }
}
