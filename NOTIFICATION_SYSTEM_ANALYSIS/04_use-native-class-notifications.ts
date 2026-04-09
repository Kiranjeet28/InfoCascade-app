/**
 * use-native-class-notifications.ts
 *
 * Hook for scheduling NATIVE system notifications for classes
 * Separate from in-app toasts - works in background and foreground
 * Uses expo-notifications for proper native scheduling on iOS/Android
 *
 * Key differences from use-class-notifications.ts:
 * - Schedules actual system notifications (not React toasts)
 * - Works when app is in background or killed
 * - Uses expo-notifications for proper persistence
 * - Only runs on native platforms (iOS/Android)
 */

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useRef } from 'react';
import { ClassSlot } from '../types';

/**
 * Interface for tracking scheduled notifications
 */
interface ScheduledNotificationInfo {
  id: string;
  classId: string;
  type: 'reminder' | 'start';
  subject: string;
  time: string;
  scheduledDate: Date;
}

/**
 * Hook to schedule NATIVE system notifications for classes
 *
 * Usage:
 * ```tsx
 * export function TimetableScreen() {
 *   const { current, next } = useTimetableState();
 *   const { scheduledCount, clearAllNotifications } = useNativeClassNotifications(current, next);
 *
 *   return (
 *     <View>
 *       <Text>Scheduled: {scheduledCount} notifications</Text>
 *     </View>
 *   );
 * }
 * ```
 *
 * @param current - Current class slot
 * @param next - Next class slot
 * @returns Object with scheduled count and control functions
 */
export function useNativeClassNotifications(
  current: ClassSlot | null,
  next: ClassSlot | null,
) {
  // Only run on native platforms
  if (Platform.OS === 'web') {
    return {
      scheduledCount: 0,
      isLoading: false,
      error: null,
      clearAllNotifications: async () => {},
    };
  }

  const scheduledNotificationsRef = useRef<Map<string, ScheduledNotificationInfo>>(new Map());
  const scheduledIdsRef = useRef<Set<string>>(new Set());

  /**
   * Helper: Extract class information
   */
  const getClassInfo = useCallback((cls: ClassSlot | null) => {
    if (!cls) return null;

    const isProject =
      cls.data.subject === 'Minor Project' || cls.data.subject === 'Major Project';
    const isMandatory = cls.data.OtherDepartment === true && !isProject;

    const subject = cls.data.subject ?? cls.data.entries?.[0]?.subject ?? 'Unknown Class';
    const room = cls.data.classRoom ?? cls.data.entries?.[0]?.classRoom ?? '';
    const time = cls.timeOfClass;

    return { subject, room, time };
  }, []);

  /**
   * Helper: Create unique class identifier for deduplication
   */
  const getClassId = useCallback((cls: ClassSlot | null) => {
    if (!cls) return null;
    return `${cls.dayOfClass}-${cls.timeOfClass}-${cls.data.subject}`;
  }, []);

  /**
   * Helper: Convert time string (HH:MM) to minutes since midnight
   */
  const timeToMinutes = useCallback((time: string): number => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  }, []);

  /**
   * Helper: Get end time (1 hour after start)
   */
  const getEndTime = useCallback((time: string): string => {
    const [h, m] = time.split(':').map(Number);
    const total = h * 60 + m + 60;
    const endHour = Math.floor(total / 60);
    const endMin = total % 60;
    return `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;
  }, []);

  /**
   * Schedule a reminder notification (10 minutes before class)
   */
  const scheduleReminderNotification = useCallback(
    async (cls: ClassSlot | null): Promise<string | null> => {
      if (!cls) return null;

      try {
        const classId = getClassId(cls);
        const classInfo = getClassInfo(cls);

        if (!classInfo || !classId) return null;

        // Check if already scheduled
        if (scheduledIdsRef.current.has(`${classId}-reminder`)) {
          console.log('[useNativeClassNotifications] Reminder already scheduled for:', classInfo.subject);
          return null;
        }

        // Calculate reminder time (10 minutes before class)
        const now = new Date();
        const [hours, minutes] = classInfo.time.split(':').map(Number);
        const classTime = new Date(now);
        classTime.setHours(hours, minutes, 0, 0);
        const reminderTime = new Date(classTime.getTime() - 10 * 60 * 1000);

        // Only schedule if reminder time is in the future
        if (reminderTime <= now) {
          console.log('[useNativeClassNotifications] Reminder time already passed:', classInfo.subject);
          return null;
        }

        // Schedule the reminder notification
        const notificationId = await Notifications.scheduleNotificationAsync({
          content: {
            title: '📋 Up Next',
            body: `${classInfo.subject}${classInfo.room ? ` • ${classInfo.room}` : ''} starts at ${classInfo.time}`,
            data: {
              type: 'class-reminder',
              subject: classInfo.subject,
              room: classInfo.room,
              classTime: classInfo.time,
              classId,
            },
            sound: true,
            badge: 1,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: reminderTime,
            ...(Platform.OS === 'android' && { channelId: 'class-notifications' }),
          },
        });

        // Track this notification
        scheduledIdsRef.current.add(`${classId}-reminder`);
        scheduledNotificationsRef.current.set(notificationId, {
          id: notificationId,
          classId,
          type: 'reminder',
          subject: classInfo.subject,
          time: classInfo.time,
          scheduledDate: reminderTime,
        });

        console.log('[useNativeClassNotifications] Scheduled reminder:', {
          id: notificationId,
          subject: classInfo.subject,
          reminderTime: reminderTime.toLocaleTimeString(),
        });

        return notificationId;
      } catch (error) {
        console.error('[useNativeClassNotifications] Error scheduling reminder:', error);
        return null;
      }
    },
    [getClassId, getClassInfo]
  );

  /**
   * Schedule a class start notification
   */
  const scheduleClassStartNotification = useCallback(
    async (cls: ClassSlot | null): Promise<string | null> => {
      if (!cls) return null;

      try {
        const classId = getClassId(cls);
        const classInfo = getClassInfo(cls);

        if (!classInfo || !classId) return null;

        // Check if already scheduled
        if (scheduledIdsRef.current.has(`${classId}-start`)) {
          console.log('[useNativeClassNotifications] Start notification already scheduled for:', classInfo.subject);
          return null;
        }

        // Calculate class start time
        const now = new Date();
        const [hours, minutes] = classInfo.time.split(':').map(Number);
        const classTime = new Date(now);
        classTime.setHours(hours, minutes, 0, 0);

        // Only schedule if class time is in the future
        if (classTime <= now) {
          console.log('[useNativeClassNotifications] Class time already passed:', classInfo.subject);
          return null;
        }

        const endTime = getEndTime(classInfo.time);

        // Schedule the class start notification
        const notificationId = await Notifications.scheduleNotificationAsync({
          content: {
            title: '🔴 Class Started',
            body: `${classInfo.subject} (${classInfo.time} - ${endTime})${classInfo.room ? ` • ${classInfo.room}` : ''}`,
            data: {
              type: 'class-start',
              subject: classInfo.subject,
              room: classInfo.room,
              classTime: classInfo.time,
              endTime,
              classId,
            },
            sound: true,
            badge: 1,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: classTime,
            ...(Platform.OS === 'android' && { channelId: 'class-notifications' }),
          },
        });

        // Track this notification
        scheduledIdsRef.current.add(`${classId}-start`);
        scheduledNotificationsRef.current.set(notificationId, {
          id: notificationId,
          classId,
          type: 'start',
          subject: classInfo.subject,
          time: classInfo.time,
          scheduledDate: classTime,
        });

        console.log('[useNativeClassNotifications] Scheduled class start:', {
          id: notificationId,
          subject: classInfo.subject,
          startTime: classTime.toLocaleTimeString(),
        });

        return notificationId;
      } catch (error) {
        console.error('[useNativeClassNotifications] Error scheduling class start:', error);
        return null;
      }
    },
    [getClassId, getClassInfo, getEndTime]
  );

  /**
   * Schedule notifications for current class
   */
  useEffect(() => {
    if (!current || Platform.OS === 'web') return;

    const scheduleCurrentClass = async () => {
      // For current class, we typically just show start notification
      // since we're already in the class
      await scheduleClassStartNotification(current);
    };

    scheduleCurrentClass().catch((error) => {
      console.error('[useNativeClassNotifications] Error in current class effect:', error);
    });
  }, [current, scheduleClassStartNotification]);

  /**
   * Schedule notifications for next class (reminder + start)
   */
  useEffect(() => {
    if (!next || Platform.OS === 'web') return;

    const scheduleNextClass = async () => {
      // Schedule reminder (10 minutes before)
      await scheduleReminderNotification(next);

      // Schedule class start notification
      await scheduleClassStartNotification(next);
    };

    scheduleNextClass().catch((error) => {
      console.error('[useNativeClassNotifications] Error in next class effect:', error);
    });
  }, [next, scheduleReminderNotification, scheduleClassStartNotification]);

  /**
   * Clear all scheduled notifications
   * Only call when user explicitly disables notifications
   */
  const clearAllNotifications = useCallback(async () => {
    try {
      if (Platform.OS === 'web') return;

      await Notifications.cancelAllScheduledNotificationsAsync();
      scheduledIdsRef.current.clear();
      scheduledNotificationsRef.current.clear();

      console.log('[useNativeClassNotifications] All scheduled notifications cleared');
    } catch (error) {
      console.error('[useNativeClassNotifications] Error clearing notifications:', error);
    }
  }, []);

  /**
   * Get list of all scheduled notifications
   * Useful for debugging
   */
  const getScheduledNotifications = useCallback(async () => {
    try {
      if (Platform.OS === 'web') return [];

      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      return scheduled.map((notif) => ({
        id: notif.identifier,
        title: notif.content.title,
        body: notif.content.body,
        trigger: notif.trigger,
      }));
    } catch (error) {
      console.error('[useNativeClassNotifications] Error getting scheduled notifications:', error);
      return [];
    }
  }, []);

  /**
   * Cancel a specific notification
   */
  const cancelNotification = useCallback(
    async (notificationId: string) => {
      try {
        if (Platform.OS === 'web') return;

        await Notifications.cancelScheduledNotificationAsync(notificationId);
        scheduledNotificationsRef.current.delete(notificationId);

        console.log('[useNativeClassNotifications] Cancelled notification:', notificationId);
      } catch (error) {
        console.error('[useNativeClassNotifications] Error cancelling notification:', error);
      }
    },
    []
  );

  return {
    scheduledCount: scheduledIdsRef.current.size,
    scheduledNotifications: Array.from(scheduledNotificationsRef.current.values()),
    clearAllNotifications,
    getScheduledNotifications,
    cancelNotification,
  };
}
