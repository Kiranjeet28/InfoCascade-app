import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * Setup notification handlers for background and foreground notifications
 * This ensures notifications are properly handled when the app is in any state
 */
export function setupNotificationHandlers() {
  if (Platform.OS === 'web') {
    console.log('[NotificationHandler] Skipping notification handlers on web platform');
    return;
  }

  try {
    // Configure notification handler - determines how notifications are displayed
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    console.log('[NotificationHandler] Notification handler configured');

    // Listen for notification responses (when user taps the notification)
    const responseSubscription =
      Notifications.addNotificationResponseReceivedListener((response) => {
        console.log('[NotificationHandler] User tapped notification:', {
          title: response.notification.request.content.title,
          body: response.notification.request.content.body,
          data: response.notification.request.content.data,
        });

        // Optional: Add navigation logic based on notification data
        // Example:
        // if (response.notification.request.content.data?.classId) {
        //   navigationRef.navigate('ClassDetails', {
        //     classId: response.notification.request.content.data.classId,
        //   });
        // }
      });

    // Listen for notifications received while app is in foreground
    const receivedSubscription =
      Notifications.addNotificationReceivedListener((notification) => {
        console.log('[NotificationHandler] Notification received in foreground:', {
          title: notification.request.content.title,
          body: notification.request.content.body,
          data: notification.request.content.data,
        });
      });

    console.log('[NotificationHandler] Notification listeners registered successfully');

    // Return cleanup function to remove listeners
    return () => {
      responseSubscription.remove();
      receivedSubscription.remove();
      console.log('[NotificationHandler] Notification listeners cleaned up');
    };
  } catch (error) {
    console.error('[NotificationHandler] Error setting up notification handlers:', error);
    return undefined;
  }
}
