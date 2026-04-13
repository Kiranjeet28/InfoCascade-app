/**
 * Hook for managing timetable notifications
 * Automatically schedules OS-level notifications for all daily classes
 * Notifications fire 5 minutes before each class starts
 */

import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useState } from "react";
import { ClassSlot } from "../types";
import {
  cancelAllTimetableNotifications,
  getScheduledNotificationCount,
  getScheduledNotificationsList,
  refreshTimetableNotifications,
  scheduleAllTimetableNotifications,
} from "../services/timetable-notification-scheduler";

interface UseTimetableNotificationsResult {
  isEnabled: boolean;
  isScheduling: boolean;
  scheduledCount: number;
  error: string | null;
  enableNotifications: () => Promise<void>;
  disableNotifications: () => Promise<void>;
  refreshNotifications: (classes: ClassSlot[]) => Promise<void>;
  getScheduledList: () => Promise<any[]>;
}

export function useTimetableNotifications(): UseTimetableNotificationsResult {
  const [isEnabled, setIsEnabled] = useState(true);
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduledCount, setScheduledCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Load initial scheduled count
  useEffect(() => {
    const loadCount = async () => {
      try {
        const count = await getScheduledNotificationCount();
        setScheduledCount(count);
      } catch (err) {
        console.error(
          "[useTimetableNotifications] Error loading scheduled count:",
          err,
        );
      }
    };

    loadCount();
  }, []);

  // Refresh count when app comes to foreground
  useFocusEffect(
    useCallback(() => {
      const loadCount = async () => {
        try {
          const count = await getScheduledNotificationCount();
          setScheduledCount(count);
        } catch (err) {
          console.error(
            "[useTimetableNotifications] Error refreshing count:",
            err,
          );
        }
      };

      loadCount();
    }, []),
  );

  const enableNotifications = useCallback(async () => {
    try {
      setIsEnabled(true);
      setError(null);
      console.log("[useTimetableNotifications] Notifications enabled");
    } catch (err) {
      const errMsg = String(err);
      setError(errMsg);
      console.error(
        "[useTimetableNotifications] Error enabling notifications:",
        err,
      );
    }
  }, []);

  const disableNotifications = useCallback(async () => {
    try {
      setIsScheduling(true);
      await cancelAllTimetableNotifications();
      setIsEnabled(false);
      setScheduledCount(0);
      setError(null);
      console.log("[useTimetableNotifications] Notifications disabled");
    } catch (err) {
      const errMsg = String(err);
      setError(errMsg);
      console.error(
        "[useTimetableNotifications] Error disabling notifications:",
        err,
      );
    } finally {
      setIsScheduling(false);
    }
  }, []);

  const refreshNotifications = useCallback(async (classes: ClassSlot[]) => {
    try {
      if (!isEnabled) {
        console.log(
          "[useTimetableNotifications] Notifications disabled, skipping refresh",
        );
        return;
      }

      setIsScheduling(true);
      setError(null);

      await refreshTimetableNotifications(classes, 5);

      const count = await getScheduledNotificationCount();
      setScheduledCount(count);

      console.log(
        `[useTimetableNotifications] Refreshed ${count} scheduled notifications`,
      );
    } catch (err) {
      const errMsg = String(err);
      setError(errMsg);
      console.error(
        "[useTimetableNotifications] Error refreshing notifications:",
        err,
      );
    } finally {
      setIsScheduling(false);
    }
  }, [isEnabled]);

  const scheduleAllClasses = useCallback(async (classes: ClassSlot[]) => {
    try {
      if (!isEnabled) {
        console.log(
          "[useTimetableNotifications] Notifications disabled, skipping schedule",
        );
        return;
      }

      setIsScheduling(true);
      setError(null);

      const scheduled = await scheduleAllTimetableNotifications(classes, 5);
      const count = await getScheduledNotificationCount();
      setScheduledCount(count);

      console.log(
        `[useTimetableNotifications] Scheduled ${scheduled} new notifications (total: ${count})`,
      );
    } catch (err) {
      const errMsg = String(err);
      setError(errMsg);
      console.error(
        "[useTimetableNotifications] Error scheduling all classes:",
        err,
      );
    } finally {
      setIsScheduling(false);
    }
  }, [isEnabled]);

  const getScheduledList = useCallback(async () => {
    try {
      return await getScheduledNotificationsList();
    } catch (err) {
      console.error(
        "[useTimetableNotifications] Error getting scheduled list:",
        err,
      );
      return [];
    }
  }, []);

  return {
    isEnabled,
    isScheduling,
    scheduledCount,
    error,
    enableNotifications,
    disableNotifications,
    refreshNotifications,
    getScheduledList: getScheduledList,
  };
}
