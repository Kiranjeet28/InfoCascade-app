import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * Comprehensive notification debugging utilities
 * Use these to troubleshoot notification scheduling issues
 */
export class NotificationDebugger {
  /**
   * Log all currently scheduled notifications
   * This is the PRIMARY debug tool - use this to verify notifications are actually scheduled
   */
  static async logScheduledNotifications() {
    try {
      console.log('\n========== 📋 SCHEDULED NOTIFICATIONS ==========');
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();

      if (scheduled.length === 0) {
        console.log('❌ NO NOTIFICATIONS SCHEDULED');
        console.log('   ↳ If you expected notifications, something is wrong!');
        return [];
      }

      console.log(`✅ Found ${scheduled.length} notification(s):\n`);

      scheduled.forEach((notif, index) => {
        console.log(`[${index + 1}] ━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`    ID: ${notif.identifier}`);
        console.log(`    Title: ${notif.content.title}`);
        console.log(`    Body: ${notif.content.body}`);

        if (notif.trigger && typeof notif.trigger === 'object' && 'date' in notif.trigger) {
          const triggerDate = new Date(notif.trigger.date);
          const now = new Date();
          const delaySeconds = Math.round((triggerDate.getTime() - now.getTime()) / 1000);

          console.log(`    Trigger Time: ${triggerDate.toISOString()}`);
          console.log(`    Time Until Trigger: ${delaySeconds}s (${Math.round(delaySeconds / 60)}m)`);
          console.log(`    Status: ${delaySeconds > 0 ? '⏳ PENDING' : '⚠️ SHOULD HAVE FIRED'}`);
        }

        if (notif.content.data && Object.keys(notif.content.data).length > 0) {
          console.log(`    Data:`, notif.content.data);
        }
      });

      console.log('\n================================================\n');
      return scheduled;
    } catch (error) {
      console.error('[NotificationDebugger] ❌ Error:', error);
      return [];
    }
  }

  /**
   * Test notification scheduling (fires in 5 seconds)
   * Use this to verify the notification system works at all
   */
  static async testScheduleNotification() {
    try {
      console.log('\n[NotificationDebugger] 🧪 Testing notification scheduling...');

      const triggerDate = new Date(Date.now() + 5000);

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: '🧪 Test Notification',
          body: 'If you see this, notifications are WORKING! (scheduled 5s ago)',
          data: {
            test: 'true',
            scheduledAt: new Date().toISOString(),
          },
          sound: true,
          badge: 1,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerDate,
          ...(Platform.OS === 'android' && {
            channelId: 'class-notifications',
          }),
        },
      });

      console.log(`✅ Test notification scheduled!`);
      console.log(`   ID: ${notificationId}`);
      console.log(`   Will fire at: ${triggerDate.toISOString()}`);
      console.log(`   ↳ Verify with: NotificationDebugger.logScheduledNotifications()`);
      console.log(`   ↳ Should appear in device notification tray in ~5 seconds\n`);

      return notificationId;
    } catch (error) {
      console.error('[NotificationDebugger] ❌ Error scheduling test notification:', error);
      return null;
    }
  }

  /**
   * Check notification permissions status
   */
  static async checkPermissions() {
    try {
      console.log('\n========== 🔐 PERMISSIONS STATUS ==========');

      if (Platform.OS === 'web') {
        console.log('ℹ️  Web platform - skipping native permission check\n');
        return { granted: false, reason: 'Web platform' };
      }

      const { status } = await Notifications.getPermissionsAsync();

      console.log(`Platform: ${Platform.OS}`);
      console.log(`Status: ${status}`);

      if (status === 'granted') {
        console.log('✅ Notifications ENABLED - Good to go!\n');
      } else if (status === 'denied') {
        console.log('❌ Notifications DISABLED');
        console.log('   ↳ User must enable in: Settings > Apps > [YourApp] > Notifications\n');
      } else {
        console.log(`⚠️  Status: ${status}\n`);
      }

      return { granted: status === 'granted', status };
    } catch (error) {
      console.error('[NotificationDebugger] ❌ Error:', error);
      return { granted: false, error };
    }
  }

  /**
   * Request notification permissions
   */
  static async requestPermissions() {
    try {
      console.log('[NotificationDebugger] 📍 Requesting notification permissions...');

      if (Platform.OS === 'web') {
        console.log('ℹ️  Web platform - skipping\n');
        return false;
      }

      const { status } = await Notifications.requestPermissionsAsync();

      if (status === 'granted') {
        console.log('✅ Permissions GRANTED\n');
        return true;
      } else {
        console.log('❌ Permissions DENIED - User must enable in Settings\n');
        return false;
      }
    } catch (error) {
      console.error('[NotificationDebugger] ❌ Error:', error);
      return false;
    }
  }

  /**
   * Full system diagnostics
   */
  static async getFullDiagnostics() {
    try {
      console.log('\n╔════════════════════════════════════════╗');
      console.log('║  🔍 NOTIFICATION SYSTEM DIAGNOSTICS   ║');
      console.log('╚════════════════════════════════════════╝\n');

      // Platform
      console.log(`📱 Platform: ${Platform.OS}`);

      // Permissions
      const perms = await this.checkPermissions();
      console.log(`🔐 Permissions: ${perms.granted ? '✅ Granted' : '❌ Denied'}`);

      // Scheduled notifications
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      console.log(`📋 Scheduled: ${scheduled.length} notification(s)`);

      console.log('\n✅ Diagnostics complete\n');

      // Recommendations
      console.log('📝 NEXT STEPS:');
      console.log('   1. If permissions are ❌, enable in Settings');
      console.log('   2. Test with: NotificationDebugger.testScheduleNotification()');
      console.log('   3. View scheduled: NotificationDebugger.logScheduledNotifications()');
      console.log('   4. Check logs for [useClassNotifications] messages\n');

    } catch (error) {
      console.error('[NotificationDebugger] ❌ Error:', error);
    }
  }

  /**
   * Cancel all scheduled notifications
   */
  static async cancelAllNotifications() {
    try {
      console.log('[NotificationDebugger] 🧹 Cancelling all scheduled notifications...');
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('✅ All notifications cleared\n');
    } catch (error) {
      console.error('[NotificationDebugger] ❌ Error:', error);
    }
  }

  /**
   * Cancel specific notification by ID
   */
  static async cancelNotification(id: string) {
    try {
      console.log(`[NotificationDebugger] Cancelling: ${id}`);
      await Notifications.cancelScheduledNotificationAsync(id);
      console.log(`✅ Cancelled\n`);
    } catch (error) {
      console.error('[NotificationDebugger] ❌ Error:', error);
    }
  }
}

/**
 * Setup comprehensive notification lifecycle logging
 * Call this in your app initialization to see all notification events
 */
export function setupNotificationLogging() {
  if (Platform.OS === 'web') {
    console.log('[NotificationLogging] Skipping on web platform');
    return;
  }

  console.log('[NotificationLogging] 📍 Setting up notification lifecycle logging\n');

  // Log received notifications (foreground)
  const receivedSub = Notifications.addNotificationReceivedListener((notification) => {
    console.log('[🔔 Notification Received - Foreground]', {
      title: notification.request.content.title,
      body: notification.request.content.body,
      time: new Date().toISOString(),
    });
  });

  // Log user interactions
  const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
    console.log('[👆 User Tapped Notification]', {
      title: response.notification.request.content.title,
      body: response.notification.request.content.body,
      time: new Date().toISOString(),
    });
  });

  console.log('[NotificationLogging] ✅ Logging active\n');

  return () => {
    receivedSub.remove();
    responseSub.remove();
  };
}

/**
 * Quick command reference for debugging
 */
export const NOTIFICATION_DEBUG_COMMANDS = {
  // Check current scheduled notifications
  CHECK: () => NotificationDebugger.logScheduledNotifications(),

  // Test notification (fires in 5 seconds)
  TEST: () => NotificationDebugger.testScheduleNotification(),

  // Check permissions
  PERMS: () => NotificationDebugger.checkPermissions(),

  // Request permissions
  REQUEST_PERMS: () => NotificationDebugger.requestPermissions(),

  // Full diagnostics
  DIAG: () => NotificationDebugger.getFullDiagnostics(),

  // Clear all
  CLEAR: () => NotificationDebugger.cancelAllNotifications(),
};

/**
 * Usage in your app:
 *
 * In your root component, add:
 *
 *   useEffect(() => {
 *     if (__DEV__) {
 *       setupNotificationLogging();
 *
 *       // Make available globally in console for quick debugging
 *       (global as any).NotificationDebug = NOTIFICATION_DEBUG_COMMANDS;
 *     }
 *   }, []);
 *
 * Then in React Native debugger console:
 *   - NotificationDebug.CHECK()     // See all scheduled notifications
 *   - NotificationDebug.TEST()      // Schedule a test notification
 *   - NotificationDebug.PERMS()     // Check permissions
 *   - NotificationDebug.DIAG()      // Full diagnostics
 */
