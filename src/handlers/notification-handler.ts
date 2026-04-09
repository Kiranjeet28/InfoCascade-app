import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

let navigationRef: any = null;

export function setNotificationNavigationRef(ref: any) {
  navigationRef = ref;
}

/**
 * Setup notification handlers for all app states:
 * - Foreground: Shows alert via setNotificationHandler
 * - Background: OS shows system notification
 * - Killed: OS shows notification, getLastNotificationResponseAsync() recovers it
 */
export function setupNotificationHandlers() {
  if (Platform.OS === 'web') {
    console.log('[NotificationHandler] Skipping on web');
    return;
  }

  try {
    // Configure how notifications display in foreground
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    console.log('[NotificationHandler] Handler configured');

    // CRITICAL: Listen for notification responses (when user taps)
    // Works in ALL states: foreground, background, AND killed
    const responseSubscription =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data;
        console.log('[NotificationHandler] User tapped notification:', {
          title: response.notification.request.content.title,
          type: data?.type,
          classTime: data?.classTime,
        });

        // Navigate when notification is tapped
        if (navigationRef && data) {
          navigationRef.navigate('(app)', { screen: 'home' });
        }
      });

    // Listen for notifications in foreground
    const receivedSubscription =
      Notifications.addNotificationReceivedListener((notification) => {
        console.log('[NotificationHandler] Notification in foreground:', {
          title: notification.request.content.title,
        });
      });

    // CRITICAL: Handle killed state recovery
    // When app was killed and user taps notification
    (async () => {
      const response = await Notifications.getLastNotificationResponseAsync();
      if (response) {
        console.log('[NotificationHandler] Recovered from killed state');
        const data = response.notification.request.content.data;
        
        // Small delay to ensure app is fully initialized
        setTimeout(() => {
          if (navigationRef && data) {
            navigationRef.navigate('(app)', { screen: 'home' });
          }
        }, 500);
      }
    })();

    console.log('[NotificationHandler] All listeners registered');

    return () => {
      responseSubscription.remove();
      receivedSubscription.remove();
      console.log('[NotificationHandler] Listeners cleaned up');
    };
  } catch (error) {
    console.error('[NotificationHandler] Error:', error);
    return undefined;
  }
}
