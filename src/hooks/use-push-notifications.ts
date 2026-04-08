import { usePushNotifications } from '../context/push-notification-context';
import { useInAppNotifications } from '../context/in-app-notification-context';
import { useMemo } from 'react';

export interface NotificationOptions {
  title: string;
  body: string;
  type?: 'reminder' | 'start' | 'info';
  data?: Record<string, any>;
  showInApp?: boolean;
  sound?: boolean;
}

export function usePushNotificationsHook() {
  const pushNotifications = usePushNotifications();
  const inAppNotifications = useInAppNotifications();

  /**
   * Show both push and in-app notification
   */
  const showNotification = async (options: NotificationOptions) => {
    const {
      title,
      body,
      type = 'info',
      data = {},
      showInApp = true,
      sound = true,
    } = options;

    try {
      // Show in-app notification if requested
      if (showInApp) {
        inAppNotifications.showNotification({
          title,
          body,
          type,
        });
      }

      // Send push notification if enabled on physical device
      if (pushNotifications.isNotificationsEnabled) {
        await pushNotifications.sendLocalNotification(title, body, {
          ...data,
          type,
          sound,
        });
      }
    } catch (error) {
      console.error('[usePushNotifications] Error showing notification:', error);
    }
  };

  /**
   * Show only in-app notification (no push)
   */
  const showInAppOnly = (
    title: string,
    body: string,
    type: 'reminder' | 'start' | 'info' = 'info',
  ) => {
    inAppNotifications.showNotification({
      title,
      body,
      type,
    });
  };

  /**
   * Show only push notification (no in-app)
   */
  const showPushOnly = async (
    title: string,
    body: string,
    data?: Record<string, any>,
  ) => {
    if (pushNotifications.isNotificationsEnabled) {
      await pushNotifications.sendLocalNotification(title, body, data);
    }
  };

  /**
   * Show class reminder notification
   */
  const showClassReminder = async (
    className: string,
    startTime: string,
    minutesBefore: number = 5,
  ) => {
    await showNotification({
      title: 'Class Starting Soon',
      body: `${className} starts in ${minutesBefore} minutes at ${startTime}`,
      type: 'reminder',
      data: {
        type: 'classReminder',
        className,
        startTime,
      },
      showInApp: true,
      sound: true,
    });
  };

  /**
   * Show class started notification
   */
  const showClassStarted = async (className: string, startTime: string) => {
    await showNotification({
      title: 'Class Starting',
      body: `${className} is starting now at ${startTime}`,
      type: 'start',
      data: {
        type: 'classStarted',
        className,
        startTime,
      },
      showInApp: true,
      sound: true,
    });
  };

  /**
   * Show info notification
   */
  const showInfo = async (
    title: string,
    body: string,
    data?: Record<string, any>,
  ) => {
    await showNotification({
      title,
      body,
      type: 'info',
      data: {
        type: 'info',
        ...data,
      },
      showInApp: true,
      sound: false,
    });
  };

  /**
   * Clear all in-app notifications
   */
  const clearInAppNotifications = () => {
    inAppNotifications.clearAll();
  };

  /**
   * Request notification permissions
   */
  const requestPermissions = async () => {
    return await pushNotifications.requestPermissions();
  };

  /**
   * Get current notification status
   */
  const getNotificationStatus = () => {
    return {
      isPushEnabled: pushNotifications.isNotificationsEnabled,
      pushToken: pushNotifications.expoPushToken,
      inAppNotificationCount: inAppNotifications.notifications.length,
    };
  };

  return useMemo(
    () => ({
      // Status
      isPushEnabled: pushNotifications.isNotificationsEnabled,
      pushToken: pushNotifications.expoPushToken,
      inAppNotifications: inAppNotifications.notifications,

      // Core methods
      showNotification,
      showInAppOnly,
      showPushOnly,

      // Convenience methods
      showClassReminder,
      showClassStarted,
      showInfo,

      // Management
      clearInAppNotifications,
      requestPermissions,
      getNotificationStatus,

      // Direct context access if needed
      _pushNotifications: pushNotifications,
      _inAppNotifications: inAppNotifications,
    }),
    [pushNotifications, inAppNotifications],
  );
}

/**
 * Alias for backwards compatibility
 */
export const useNotifications = usePushNotificationsHook;
