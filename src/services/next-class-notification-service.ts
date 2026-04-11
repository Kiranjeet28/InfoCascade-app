/**
 * Next Class Notification Service
 * Handles scheduling and managing notifications for the user's next class
 * Works in foreground, background, and when app is closed
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { ClassSlot } from "../types";
import { findCurrentAndNext } from "../hooks/Useliveclass";

// Storage keys
const SCHEDULED_NOTIFICATION_ID_KEY = "scheduled_notification_id";
const LAST_SCHEDULED_CLASS_KEY = "last_scheduled_class";
const NOTIFICATION_SETTINGS_KEY = "next_class_notification_settings";

interface NotificationSettings {
  enabled: boolean;
  minutesBefore: number; // 10-15 minutes before class
}

interface ScheduledNotification {
  notificationId: string;
  classSlot: ClassSlot;
  scheduledTime: number; // timestamp
}

/**
 * Converts time string (HH:MM) to minutes since midnight
 */
function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Checks if today is a weekday (Monday-Friday)
 */
function isWeekday(): boolean {
  const day = new Date().getDay();
  return day !== 0 && day !== 6;
}

/**
 * Initialize next class notification system
 * Must be called once when app starts
 */
export async function initializeNextClassNotifications(): Promise<void> {
  if (Platform.OS === "web") {
    console.log("[NextClassNotifications] Skipping on web platform");
    return;
  }

  try {
    console.log("[NextClassNotifications] Initializing...");

    // Set up notification handler
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    // Register Android notification channel
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("next-class", {
        name: "Next Class Notifications",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FF231F7C",
        sound: "default",
        enableVibrate: true,
      });
    }

    console.log("[NextClassNotifications] Initialization complete");
  } catch (error) {
    console.error("[NextClassNotifications] Initialization error:", error);
  }
}

/**
 * Schedule notification for the next class
 * @param classes - Array of class slots for today
 * @param minutesBefore - Minutes before class to show notification (10-15 recommended)
 */
export async function scheduleNextClassNotification(
  classes: ClassSlot[],
  minutesBefore: number = 15,
): Promise<boolean> {
  if (Platform.OS === "web") {
    console.log("[NextClassNotifications] Skipping on web platform");
    return false;
  }

  try {
    // Cancel any existing notification first
    await cancelNextClassNotification();

    // Check if it's a weekday
    if (!isWeekday()) {
      console.log("[NextClassNotifications] Weekend - no notification needed");
      return false;
    }

    // Validate minutes before
    const validMinutes = Math.max(5, Math.min(30, minutesBefore));

    // Find next class
    const { next } = findCurrentAndNext(classes);

    if (!next) {
      console.log("[NextClassNotifications] No next class found today");
      return false;
    }

    // Calculate notification time
    const now = new Date();
    const classTimeMinutes = timeToMinutes(next.timeOfClass);
    const notificationTimeMinutes = classTimeMinutes - validMinutes;

    // If notification time has already passed, don't schedule
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    if (notificationTimeMinutes <= currentMinutes) {
      console.log("[NextClassNotifications] Notification time already passed");
      return false;
    }

    // Calculate delay from now
    const delayMinutes = notificationTimeMinutes - currentMinutes;
    const delaySeconds = delayMinutes * 60;

    // Extract class details
    const subject = next.data?.subject || "Class";
    const room =
      next.data?.classRoom ?? next.data?.entries?.[0]?.classRoom ?? "TBD";
    const teacher =
      next.data?.teacher ?? next.data?.entries?.[0]?.teacher ?? "";
    const timeOfClass = next.timeOfClass;
    const endTime = calculateEndTime(next.timeOfClass);

    // Build notification content
    const title = "📚 " + subject;
    const teacherSuffix = teacher ? " (" + teacher + ")" : "";
    const body = timeOfClass + " - " + endTime + " in " + room + teacherSuffix;

    console.log("[NextClassNotifications] Scheduling notification:", {
      subject,
      timeOfClass,
      minutesBefore: validMinutes,
      delaySeconds,
    });

    // Schedule the notification
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: "default",
        badge: 1,
        priority: "high",
        data: {
          classSlot: JSON.stringify(next),
          subject,
          room,
          timeOfClass,
          endTime,
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: delaySeconds,
        repeats: false,
      },
    });

    // Save notification info
    const scheduledNotif: ScheduledNotification = {
      notificationId,
      classSlot: next,
      scheduledTime: Date.now() + delaySeconds * 1000,
    };

    await Promise.all([
      AsyncStorage.setItem(SCHEDULED_NOTIFICATION_ID_KEY, notificationId),
      AsyncStorage.setItem(
        LAST_SCHEDULED_CLASS_KEY,
        JSON.stringify(scheduledNotif),
      ),
    ]);

    console.log(
      "[NextClassNotifications] Notification scheduled with ID:",
      notificationId,
    );
    return true;
  } catch (error) {
    console.error(
      "[NextClassNotifications] Error scheduling notification:",
      error,
    );
    return false;
  }
}

/**
 * Cancel the next class notification
 */
export async function cancelNextClassNotification(): Promise<void> {
  try {
    const notificationId = await AsyncStorage.getItem(
      SCHEDULED_NOTIFICATION_ID_KEY,
    );

    if (notificationId) {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      await AsyncStorage.removeItem(SCHEDULED_NOTIFICATION_ID_KEY);
      console.log(
        "[NextClassNotifications] Notification cancelled:",
        notificationId,
      );
    }
  } catch (error) {
    console.error(
      "[NextClassNotifications] Error cancelling notification:",
      error,
    );
  }
}

/**
 * Get the currently scheduled notification
 */
export async function getScheduledNotification(): Promise<ScheduledNotification | null> {
  try {
    const data = await AsyncStorage.getItem(LAST_SCHEDULED_CLASS_KEY);
    if (data) {
      return JSON.parse(data);
    }
    return null;
  } catch (error) {
    console.error(
      "[NextClassNotifications] Error getting scheduled notification:",
      error,
    );
    return null;
  }
}

/**
 * Enable/disable next class notifications
 */
export async function setNotificationSettings(
  settings: NotificationSettings,
): Promise<void> {
  try {
    await AsyncStorage.setItem(
      NOTIFICATION_SETTINGS_KEY,
      JSON.stringify(settings),
    );
    console.log("[NextClassNotifications] Settings updated:", settings);
  } catch (error) {
    console.error(
      "[NextClassNotifications] Error setting notification settings:",
      error,
    );
  }
}

/**
 * Get notification settings
 */
export async function getNotificationSettings(): Promise<NotificationSettings> {
  try {
    const data = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.error(
      "[NextClassNotifications] Error getting notification settings:",
      error,
    );
  }

  // Default settings
  return {
    enabled: true,
    minutesBefore: 15,
  };
}

/**
 * Request notification permissions
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === "web") {
    return false;
  }

  try {
    // expo-notifications permission API typing differs across SDK versions:
    // some return `{ status }`, others return an object with platform fields like `granted`.
    const existingPerms: any = await Notifications.getPermissionsAsync();

    const getStatus = (p: any): string | undefined =>
      typeof p?.status === "string"
        ? p.status
        : typeof p?.ios?.status === "string"
          ? p.ios.status
          : typeof p?.android?.status === "string"
            ? p.android.status
            : undefined;

    const getGranted = (p: any): boolean | undefined =>
      typeof p?.granted === "boolean"
        ? p.granted
        : typeof p?.ios?.granted === "boolean"
          ? p.ios.granted
          : typeof p?.android?.granted === "boolean"
            ? p.android.granted
            : undefined;

    let finalStatus = getStatus(existingPerms);
    let granted = getGranted(existingPerms);

    // If we can't conclusively tell it's granted, request permissions.
    if (finalStatus !== "granted" && granted !== true) {
      const requestedPerms: any = await Notifications.requestPermissionsAsync();
      finalStatus = getStatus(requestedPerms) ?? finalStatus;
      granted = getGranted(requestedPerms) ?? granted;
    }

    const isGranted = granted === true || finalStatus === "granted";
    console.log(
      "[NextClassNotifications] Notification permissions:",
      isGranted ? "granted" : "denied",
    );
    return isGranted;
  } catch (error) {
    console.error(
      "[NextClassNotifications] Error requesting permissions:",
      error,
    );
    return false;
  }
}

/**
 * Check if notifications are enabled
 */
export async function areNotificationsEnabled(): Promise<boolean> {
  try {
    const settings = await getNotificationSettings();
    return settings.enabled;
  } catch (error) {
    console.error(
      "[NextClassNotifications] Error checking notification status:",
      error,
    );
    return false;
  }
}

/**
 * Refresh/reschedule notifications (call when timetable changes or app resumes)
 */
export async function refreshNotificationSchedule(
  classes: ClassSlot[],
): Promise<boolean> {
  try {
    const enabled = await areNotificationsEnabled();
    if (!enabled) {
      console.log("[NextClassNotifications] Notifications disabled");
      return false;
    }

    const settings = await getNotificationSettings();
    return await scheduleNextClassNotification(classes, settings.minutesBefore);
  } catch (error) {
    console.error(
      "[NextClassNotifications] Error refreshing notification schedule:",
      error,
    );
    return false;
  }
}

/**
 * Calculate end time (assumes 1-hour classes)
 */
function calculateEndTime(startTime: string): string {
  const [h, m] = startTime.split(":").map(Number);
  const endH = h + 1; // Classes are 1 hour long
  const endM = m;

  return String(endH).padStart(2, "0") + ":" + String(endM).padStart(2, "0");
}

/**
 * Clear all notification data (for logout or reset)
 */
export async function clearAllNotificationData(): Promise<void> {
  try {
    await cancelNextClassNotification();
    await Promise.all([
      AsyncStorage.removeItem(LAST_SCHEDULED_CLASS_KEY),
      AsyncStorage.removeItem(NOTIFICATION_SETTINGS_KEY),
    ]);
    console.log("[NextClassNotifications] All notification data cleared");
  } catch (error) {
    console.error(
      "[NextClassNotifications] Error clearing notification data:",
      error,
    );
  }
}
