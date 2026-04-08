import * as Notifications from 'expo-notifications';

export interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
  sound?: boolean;
  badge?: number;
}

/**
 * Send an immediate local notification
 */
export async function sendImmediateNotification(
  payload: PushNotificationPayload,
): Promise<string | null> {
  try {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: payload.title,
        body: payload.body,
        data: payload.data || {},
        sound: payload.sound !== false,
        badge: payload.badge || 1,
      },
      trigger: { type: 'time', seconds: 1 },
    });
    console.log('[PushNotifications] Notification sent:', notificationId);
    return notificationId;
  } catch (error) {
    console.error('[PushNotifications] Error sending notification:', error);
    return null;
  }
}

/**
 * Schedule a notification for a specific time
 */
export async function scheduleNotificationForTime(
  payload: PushNotificationPayload,
  date: Date,
): Promise<string | null> {
  try {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: payload.title,
        body: payload.body,
        data: payload.data || {},
        sound: payload.sound !== false,
        badge: payload.badge || 1,
      },
      trigger: date,
    });
    console.log('[PushNotifications] Notification scheduled for:', date);
    return notificationId;
  } catch (error) {
    console.error('[PushNotifications] Error scheduling notification:', error);
    return null;
  }
}

/**
 * Schedule a daily notification at a specific time
 */
export async function scheduleDailyNotification(
  payload: PushNotificationPayload,
  hour: number,
  minute: number = 0,
): Promise<string | null> {
  try {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: payload.title,
        body: payload.body,
        data: payload.data || {},
        sound: payload.sound !== false,
        badge: payload.badge || 1,
      },
      trigger: {
        type: 'daily',
        hour,
        minute,
      },
    });
    console.log(
      `[PushNotifications] Daily notification scheduled at ${hour}:${minute}`,
    );
    return notificationId;
  } catch (error) {
    console.error('[PushNotifications] Error scheduling daily notification:', error);
    return null;
  }
}

/**
 * Cancel a scheduled notification
 */
export async function cancelNotification(notificationId: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
    console.log('[PushNotifications] Notification cancelled:', notificationId);
  } catch (error) {
    console.error('[PushNotifications] Error cancelling notification:', error);
  }
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllNotifications(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('[PushNotifications] All notifications cancelled');
  } catch (error) {
    console.error('[PushNotifications] Error cancelling all notifications:', error);
  }
}

/**
 * Get all scheduled notifications
 */
export async function getScheduledNotifications(): Promise<
  Notifications.NotificationRequest[]
> {
  try {
    const notifications =
      await Notifications.getAllScheduledNotificationsAsync();
    return notifications;
  } catch (error) {
    console.error(
      '[PushNotifications] Error getting scheduled notifications:',
      error,
    );
    return [];
  }
}

/**
 * Clear all notifications from the notification center
 */
export async function clearAllNotifications(): Promise<void> {
  try {
    await Notifications.dismissAllNotificationsAsync();
    console.log(
      '[PushNotifications] All notifications cleared from notification center',
    );
  } catch (error) {
    console.error('[PushNotifications] Error clearing notifications:', error);
  }
}

/**
 * Send a class reminder notification
 */
export async function sendClassReminderNotification(
  className: string,
  startTime: string,
  minutesBefore: number = 5,
): Promise<string | null> {
  return sendImmediateNotification({
    title: 'Class Starting Soon',
    body: `${className} starts in ${minutesBefore} minutes at ${startTime}`,
    data: {
      type: 'classReminder',
      className,
      startTime,
    },
    sound: true,
  });
}

/**
 * Send a general app notification
 */
export async function sendAppNotification(
  title: string,
  body: string,
  data?: Record<string, any>,
): Promise<string | null> {
  return sendImmediateNotification({
    title,
    body,
    data: {
      type: 'app',
      ...data,
    },
    sound: true,
  });
}

/**
 * Send a test notification
 */
export async function sendTestNotification(): Promise<string | null> {
  return sendImmediateNotification({
    title: 'Test Notification',
    body: 'This is a test push notification from Infocascade',
    data: {
      type: 'test',
      timestamp: new Date().toISOString(),
    },
  });
}
