/**
 * Hook for managing next class notifications
 * Handles scheduling, enabling/disabling, and refreshing notifications
 */

import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useState } from "react";
import { ClassSlot } from "../types";
import {
  clearAllNotificationData,
  getNotificationSettings,
  getScheduledNotification,
  initializeNextClassNotifications,
  requestNotificationPermissions,
  scheduleNextClassNotification,
  setNotificationSettings,
} from "../services/next-class-notification-service";

interface UseNextClassNotificationsResult {
  isInitialized: boolean;
  isEnabled: boolean;
  setEnabled: (enabled: boolean) => Promise<void>;
  minutesBefore: number;
  setMinutesBefore: (minutes: number) => Promise<void>;
  scheduleNotification: (classes: ClassSlot[]) => Promise<boolean>;
  hasPermission: boolean;
  scheduledClass: ClassSlot | null;
  loading: boolean;
}

export function useNextClassNotifications(): UseNextClassNotificationsResult {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isEnabled, setIsEnabledState] = useState(true);
  const [minutesBefore, setMinutesBeforeState] = useState(15);
  const [hasPermission, setHasPermission] = useState(false);
  const [scheduledClass, setScheduledClass] = useState<ClassSlot | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize notifications on mount
  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);

        // Initialize the notification system
        await initializeNextClassNotifications();

        // Request permissions
        const hasPerms = await requestNotificationPermissions();
        setHasPermission(hasPerms);

        // Load settings
        const settings = await getNotificationSettings();
        setIsEnabledState(settings.enabled);
        setMinutesBeforeState(settings.minutesBefore);

        // Load scheduled notification
        const scheduled = await getScheduledNotification();
        if (scheduled) {
          setScheduledClass(scheduled.classSlot);
        }

        setIsInitialized(true);
        console.log("[useNextClassNotifications] Initialized");
      } catch (error) {
        console.error(
          "[useNextClassNotifications] Initialization error:",
          error,
        );
        setIsInitialized(true); // Still mark as initialized even on error
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  // Refresh scheduled notification when app comes to foreground
  useFocusEffect(
    useCallback(() => {
      const refresh = async () => {
        try {
          const scheduled = await getScheduledNotification();
          if (scheduled) {
            setScheduledClass(scheduled.classSlot);
          }
        } catch (error) {
          console.error(
            "[useNextClassNotifications] Error refreshing scheduled class:",
            error,
          );
        }
      };

      refresh();
    }, []),
  );

  const setEnabled = async (enabled: boolean) => {
    try {
      await setNotificationSettings({
        enabled,
        minutesBefore,
      });
      setIsEnabledState(enabled);
      console.log(
        "[useNextClassNotifications] Notifications",
        enabled ? "enabled" : "disabled",
      );

      if (!enabled) {
        // Clear notification data when disabled
        await clearAllNotificationData();
        setScheduledClass(null);
      }
    } catch (error) {
      console.error(
        "[useNextClassNotifications] Error setting enabled state:",
        error,
      );
    }
  };

  const setMinutesBefore = async (minutes: number) => {
    try {
      // Validate input
      const validMinutes = Math.max(5, Math.min(30, minutes));

      await setNotificationSettings({
        enabled: isEnabled,
        minutesBefore: validMinutes,
      });
      setMinutesBeforeState(validMinutes);
      console.log(
        "[useNextClassNotifications] Minutes before updated to:",
        validMinutes,
      );
    } catch (error) {
      console.error(
        "[useNextClassNotifications] Error setting minutes before:",
        error,
      );
    }
  };

  const scheduleNotification = async (
    classes: ClassSlot[],
  ): Promise<boolean> => {
    try {
      if (!isEnabled) {
        console.log(
          "[useNextClassNotifications] Notifications disabled, skipping schedule",
        );
        return false;
      }

      if (!hasPermission) {
        console.log(
          "[useNextClassNotifications] No permission to schedule notifications",
        );
        return false;
      }

      const success = await scheduleNextClassNotification(
        classes,
        minutesBefore,
      );

      if (success) {
        // Update scheduled class
        const scheduled = await getScheduledNotification();
        if (scheduled) {
          setScheduledClass(scheduled.classSlot);
        }
      }

      return success;
    } catch (error) {
      console.error(
        "[useNextClassNotifications] Error scheduling notification:",
        error,
      );
      return false;
    }
  };

  return {
    isInitialized,
    isEnabled,
    setEnabled,
    minutesBefore,
    setMinutesBefore,
    scheduleNotification,
    hasPermission,
    scheduledClass,
    loading,
  };
}
