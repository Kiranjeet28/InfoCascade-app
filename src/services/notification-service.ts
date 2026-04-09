// ─── Notification Service ─────────────────────────────────────────────────────
// Handles class notifications with user preferences support

import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { ClassSlot } from "../types";

// Types for preferences
export interface NotificationPreferencesForService {
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  reminderTime: 10 | 15 | 30;
  notifyOnClassStart: boolean;
}

// Notification handler is configured in _layout.tsx to avoid conflicts

// ─── Types ────────────────────────────────────────────────────────────────────
export interface ScheduledNotification {
  id: string;
  type: "reminder" | "start";
  classTime: string;
  subject: string;
}

// ─── Permission Handling ──────────────────────────────────────────────────────
export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    console.log("[NotificationService] Requesting notification permissions...");

    if (Platform.OS === "web") {
      console.log(
        "[NotificationService] Skipping notifications on web platform",
      );
      return false;
    }

    let finalStatus: string;

    try {
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      finalStatus = existingStatus;
      console.log(
        "[NotificationService] Existing permission status:",
        existingStatus,
      );

      if (existingStatus !== "granted") {
        console.log("[NotificationService] Requesting new permissions...");
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
        console.log("[NotificationService] Permission request result:", status);
      }
    } catch (permErr) {
      console.warn(
        "[NotificationService] Error checking/requesting permissions:",
        permErr,
      );
      return false;
    }

    if (finalStatus !== "granted") {
      console.log("[NotificationService] Notification permissions not granted");
      return false;
    }

    if (Platform.OS === "android") {
      try {
        await Notifications.setNotificationChannelAsync("class-notifications", {
          name: "Class Notifications",
          description: "Notifications for upcoming classes",
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#6C63FF",
          lockscreenVisibility:
            Notifications.AndroidNotificationVisibility.PUBLIC,
          enableVibrate: true,
          enableLights: true,
          showBadge: true,
          bypassDnd: true,
        });
        console.log(
          "[NotificationService] Android notification channel created",
        );
      } catch (channelErr) {
        console.warn(
          "[NotificationService] Error setting up Android notification channel:",
          channelErr,
        );
      }
    }

    console.log("[NotificationService] Notifications successfully configured");
    return true;
  } catch (error) {
    console.error(
      "[NotificationService] Unexpected error in requestNotificationPermissions:",
      error,
    );
    return false;
  }
}

// ─── Helper Functions ─────────────────────────────────────────────────────────
function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function getEndTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + 60;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function getSubjectName(cls: ClassSlot): string {
  return cls.data.subject ?? cls.data.entries?.[0]?.subject ?? "Class";
}

function getRoomName(cls: ClassSlot): string {
  return cls.data.classRoom ?? cls.data.entries?.[0]?.classRoom ?? "";
}

function getClassType(cls: ClassSlot): string {
  if (cls.data.Lab) return "🔬 Lab";
  if (cls.data.Tut) return "📝 Tutorial";
  if (cls.data.elective) return "📚 Elective";
  return "📖 Lecture";
}

// ─── Schedule Notifications ───────────────────────────────────────────────────

/**
 * Schedule notifications for a class with user preferences
 * - Reminder before class starts (timing based on user preference)
 * - Optional notification when class starts
 */
export async function scheduleClassNotification(
  cls: ClassSlot,
  dayOffset: number = 0, // 0 = today, 1 = tomorrow, etc.
  preferences?: NotificationPreferencesForService,
): Promise<string[]> {
  const scheduledIds: string[] = [];
  const subject = getSubjectName(cls);
  const room = getRoomName(cls);
  const classType = getClassType(cls);
  const time = cls.timeOfClass;
  const endTime = getEndTime(time);

  // Use provided preferences or defaults
  const prefs = preferences || {
    soundEnabled: true,
    vibrationEnabled: true,
    reminderTime: 10,
    notifyOnClassStart: true,
  };

  const now = new Date();
  const [hours, minutes] = time.split(":").map(Number);

  // Calculate the exact date/time for the class
  const classDate = new Date(now);
  classDate.setDate(classDate.getDate() + dayOffset);
  classDate.setHours(hours, minutes, 0, 0);

  // Calculate reminder time based on user preference
  const reminderDate = new Date(classDate);
  reminderDate.setMinutes(reminderDate.getMinutes() - prefs.reminderTime);

  // Schedule reminder notification
  if (reminderDate > now) {
    try {
      const reminderId = await Notifications.scheduleNotificationAsync({
        content: {
          title: `⏰ Class in ${prefs.reminderTime} minutes!`,
          body: `${subject} starts at ${time}\n${classType} ${room ? `• Room: ${room}` : ""}`,
          data: { type: "reminder", classTime: time, subject },
          sound: prefs.soundEnabled,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: reminderDate,
          channelId:
            Platform.OS === "android" ? "class-notifications" : undefined,
        },
      });
      scheduledIds.push(reminderId);
    } catch (error) {
      console.error("Error scheduling reminder notification:", error);
    }
  }

  // Schedule class start notification if enabled
  if (prefs.notifyOnClassStart && classDate > now) {
    try {
      const startId = await Notifications.scheduleNotificationAsync({
        content: {
          title: "🔔 Class Starting Now!",
          body: `${subject} (${time} - ${endTime})\n${classType} ${room ? `• Room: ${room}` : ""}`,
          data: { type: "start", classTime: time, subject },
          sound: prefs.soundEnabled,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: classDate,
          channelId:
            Platform.OS === "android" ? "class-notifications" : undefined,
        },
      });
      scheduledIds.push(startId);
    } catch (error) {
      console.error("Error scheduling class start notification:", error);
    }
  }

  return scheduledIds;
}

/**
 * Schedule notifications for all classes in a day with user preferences
 */
export async function scheduleDayNotifications(
  classes: ClassSlot[],
  day: string,
  dayOffset: number = 0,
  preferences?: NotificationPreferencesForService,
): Promise<string[]> {
  const allIds: string[] = [];

  // Filter classes for the specific day, excluding free classes
  const dayClasses = classes.filter(
    (cls) => cls.dayOfClass === day && !cls.data.freeClass,
  );

  for (const cls of dayClasses) {
    const ids = await scheduleClassNotification(cls, dayOffset, preferences);
    allIds.push(...ids);
  }

  console.log(`Scheduled ${allIds.length} notifications for ${day}`);
  return allIds;
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllClassNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  console.log("All class notifications cancelled");
}

/**
 * Get all scheduled notifications
 */
export async function getScheduledNotifications(): Promise<
  Notifications.NotificationRequest[]
> {
  return await Notifications.getAllScheduledNotificationsAsync();
}

/**
 * Add notification response listener
 */
export function addNotificationResponseListener(
  callback: (response: Notifications.NotificationResponse) => void,
): Notifications.Subscription {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

/**
 * Add notification received listener (when app is in foreground)
 */
export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void,
): Notifications.Subscription {
  return Notifications.addNotificationReceivedListener(callback);
}

// ─── Notification Badge ───────────────────────────────────────────────────────
export async function setBadgeCount(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count);
}

export async function clearBadge(): Promise<void> {
  await Notifications.setBadgeCountAsync(0);
}
