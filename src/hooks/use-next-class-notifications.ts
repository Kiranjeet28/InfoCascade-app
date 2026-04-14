/**
 * use-next-class-notifications.ts
 *
 * React hook wrapper for next-class-notification-service.
 * Re-exports service functions for convenient use in components.
 *
 * NOTE: This is a thin re-export layer. The actual implementation
 * is in services/next-class-notification-service.ts
 */

export {
  areNotificationsEnabled, cancelAllClassNotifications, clearAllNotificationData, getNotificationSettings, initializeNextClassNotifications, refreshNotificationSchedule, scheduleNextClassNotification, setNotificationSettings
} from "../services/next-class-notification-service";
