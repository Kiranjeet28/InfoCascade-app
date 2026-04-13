/**
 * Timetable Notification Scheduler
 *
 * Schedules OS-level notifications for all daily classes in the user's timetable.
 * Notifications fire exactly 5 minutes before each class starts, and persist
 * even when the app is backgrounded or closed.
 *
 * Features:
 * - Automatic scheduling of all daily classes
 * - Deduplication (won't schedule the same class twice)
 * - Cleanup of past notifications
 * - Integration with expo-notifications
 * - Persistent storage via AsyncStorage
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { ClassSlot } from "../types";

// Storage keys
const SCHEDULED_CLASSES_KEY = "timetable_scheduled_classes_v1";
const NOTIFICATION_ID_PREFIX = "timetable_class_";

interface ScheduledClassNotification {
  classId: string; // Unique ID for the class (day + time + subject)
  notificationId: string; // Expo notification ID
  dayOfClass: string;
  timeOfClass: string;
  subject: string;
  room?: string;
  teacher?: string;
  scheduledAt: number; // Timestamp when we scheduled it
  triggerTime: number; // Timestamp when notification should fire
}

/**
 * Convert HH:MM time string to minutes since midnight
 */
function timeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Convert minutes since midnight back to HH:MM string
 */
function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Get current day name (Monday, Tuesday, etc.)
 */
function getCurrentDay(): string {
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  return days[new Date().getDay()];
}

/**
 * Get current time in minutes since midnight
 */
function getCurrentMinutes(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

/**
 * Generate unique ID for a class (day + time + subject)
 */
function generateClassId(
  dayOfClass: string,
  timeOfClass: string,
  subject: string,
): string {
  return `${dayOfClass}_${timeOfClass}_${subject}`.replace(/\s+/g, "_");
}

/**
 * Load previously scheduled classes from AsyncStorage
 */
async function getScheduledClasses(): Promise<
  Map<string, ScheduledClassNotification>
> {
  try {
    const data = await AsyncStorage.getItem(SCHEDULED_CLASSES_KEY);
    if (!data) return new Map();

    const parsed = JSON.parse(data) as Record<
      string,
      ScheduledClassNotification
    >;
    return new Map(Object.entries(parsed));
  } catch (error) {
    console.error(
      "[TimetableNotificationScheduler] Error loading scheduled classes:",
      error,
    );
    return new Map();
  }
}

/**
 * Save scheduled classes to AsyncStorage
 */
async function saveScheduledClasses(
  scheduled: Map<string, ScheduledClassNotification>,
): Promise<void> {
  try {
    const obj = Object.fromEntries(scheduled);
    await AsyncStorage.setItem(
      SCHEDULED_CLASSES_KEY,
      JSON.stringify(obj),
    );
  } catch (error) {
    console.error(
      "[TimetableNotificationScheduler] Error saving scheduled classes:",
      error,
    );
  }
}

/**
 * Cancel a specific notification by ID
 */
async function cancelNotification(notificationId: string): Promise<void> {
  if (Platform.OS === "web") return;

  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (error) {
    console.warn(
      "[TimetableNotificationScheduler] Error canceling notification:",
      error,
    );
  }
}

/**
 * Check if a class is in the past (shouldn't schedule)
 */
function isClassInPast(dayOfClass: string, timeOfClass: string): boolean {
  const today = getCurrentDay();
  const currentMinutes = getCurrentMinutes();
  const classMinutes = timeToMinutes(timeOfClass);

  // If it's a different day
  if (dayOfClass !== today) {
    // Check if it's a weekday that has already passed this week
    const weekDays = [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
    ];
    const todayIndex = weekDays.indexOf(today);
    const classIndex = weekDays.indexOf(dayOfClass);

    // Only consider it "in the past" if it's earlier in the week
    if (todayIndex > classIndex) {
      return true;
    }
    // Different day but same week or future = not in past
    return false;
  }

  // Same day: check if time has passed (+ 1 hour for class duration)
  return currentMinutes > classMinutes + 60;
}

/**
 * Schedule a single class notification
 * Returns the notification ID if successful, null otherwise
 */
async function scheduleClassNotification(
  cls: ClassSlot,
  minutesBefore: number = 5,
): Promise<string | null> {
  if (Platform.OS === "web") {
    console.log("[TimetableNotificationScheduler] Skipping on web platform");
    return null;
  }

  try {
    // Check if class is in the past
    if (isClassInPast(cls.dayOfClass, cls.timeOfClass)) {
      console.log(
        `[TimetableNotificationScheduler] Skipping past class: ${cls.data.subject} on ${cls.dayOfClass} at ${cls.timeOfClass}`,
      );
      return null;
    }

    // Extract class info
    const subject =
      cls.data.subject ??
      cls.data.entries?.[0]?.subject ??
      "Class";
    const room =
      cls.data.classRoom ??
      cls.data.entries?.[0]?.classRoom ??
      "TBD";
    const teacher =
      cls.data.teacher ??
      cls.data.entries?.[0]?.teacher ??
      "";

    // Calculate trigger time (5 minutes before class)
    const classMinutes = timeToMinutes(cls.timeOfClass);
    const triggerMinutes = Math.max(0, classMinutes - minutesBefore);
    const triggerTime = minutesToTime(triggerMinutes);

    // Calculate delay in seconds from now
    const now = new Date();
    let classDate = new Date();

    // Find the next occurrence of this day
    const weekDays = [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
    ];
    const classIndex = weekDays.indexOf(cls.dayOfClass);
    const todayIndex = weekDays.indexOf(getCurrentDay());

    // Calculate days until this class
    let daysUntil = (classIndex - todayIndex + 5) % 5;
    if (
      daysUntil === 0 &&
      timeToMinutes(cls.timeOfClass) <= getCurrentMinutes()
    ) {
      daysUntil = 5; // Schedule for next week if time has passed
    }

    classDate.setDate(classDate.getDate() + daysUntil);

    // Set the class time
    const [triggerHours, triggerMinutesNum] = triggerTime
      .split(":")
      .map(Number);
    classDate.setHours(triggerHours, triggerMinutesNum, 0, 0);

    // If trigger time is in the past, skip
    if (classDate <= now) {
      console.log(
        `[TimetableNotificationScheduler] Trigger time in past for ${subject}`,
      );
      return null;
    }

    const delayMs = classDate.getTime() - now.getTime();
    const delaySeconds = Math.ceil(delayMs / 1000);

    // Build notification content
    const title = `📚 ${subject}`;
    const endTime = `${String(Math.floor((classMinutes + 60) / 60)).padStart(2, "0")}:${String((classMinutes + 60) % 60).padStart(2, "0")}`;
    const teacherSuffix = teacher ? ` (${teacher})` : "";
    const body = `${cls.timeOfClass} - ${endTime} in ${room}${teacherSuffix}`;

    console.log(
      `[TimetableNotificationScheduler] Scheduling notification for ${subject} at ${cls.timeOfClass} (trigger in ${delaySeconds}s)`,
    );

    // Schedule the notification
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: "default",
        badge: 1,
        priority: "high",
        data: {
          classSlot: JSON.stringify(cls),
          subject,
          room,
          teacher,
          timeOfClass: cls.timeOfClass,
          dayOfClass: cls.dayOfClass,
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: delaySeconds,
        repeats: false,
      },
    });

    return notificationId;
  } catch (error) {
    console.error(
      "[TimetableNotificationScheduler] Error scheduling notification:",
      error,
    );
    return null;
  }
}

/**
 * Schedule notifications for all classes in the timetable
 * Deduplicates by class ID to avoid scheduling the same class twice
 */
export async function scheduleAllTimetableNotifications(
  allClasses: ClassSlot[],
  minutesBefore: number = 5,
): Promise<number> {
  try {
    console.log(
      `[TimetableNotificationScheduler] Scheduling notifications for ${allClasses.length} classes`,
    );

    const scheduled = await getScheduledClasses();
    let successCount = 0;

    // Get today's classes and future classes
    const weekDays = [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
    ];
    const todayIndex = weekDays.indexOf(getCurrentDay());

    for (const cls of allClasses) {
      // Skip free periods
      if (cls.data.freeClass) continue;

      // Skip if not a weekday
      if (!weekDays.includes(cls.dayOfClass)) continue;

      // Generate unique class ID
      const classId = generateClassId(
        cls.dayOfClass,
        cls.timeOfClass,
        cls.data.subject ?? "Class",
      );

      // Check if already scheduled
      if (scheduled.has(classId)) {
        console.log(
          `[TimetableNotificationScheduler] Class already scheduled: ${classId}`,
        );
        continue;
      }

      // Schedule the notification
      const notificationId = await scheduleClassNotification(
        cls,
        minutesBefore,
      );

      if (notificationId) {
        const scheduledNotif: ScheduledClassNotification = {
          classId,
          notificationId,
          dayOfClass: cls.dayOfClass,
          timeOfClass: cls.timeOfClass,
          subject: cls.data.subject ?? "Class",
          room: cls.data.classRoom,
          teacher: cls.data.teacher,
          scheduledAt: Date.now(),
          triggerTime: 0, // Computed at schedule time
        };

        scheduled.set(classId, scheduledNotif);
        successCount++;
      }
    }

    // Save updated schedule
    await saveScheduledClasses(scheduled);

    console.log(
      `[TimetableNotificationScheduler] Scheduled ${successCount} new notifications`,
    );
    return successCount;
  } catch (error) {
    console.error(
      "[TimetableNotificationScheduler] Error scheduling all notifications:",
      error,
    );
    return 0;
  }
}

/**
 * Refresh/reschedule notifications
 * Call this when timetable changes, user enables notifications, or app resumes
 */
export async function refreshTimetableNotifications(
  allClasses: ClassSlot[],
  minutesBefore: number = 5,
): Promise<void> {
  try {
    console.log(
      "[TimetableNotificationScheduler] Refreshing timetable notifications",
    );

    const scheduled = await getScheduledClasses();

    // Cancel notifications for classes that are now in the past
    for (const [classId, notif] of scheduled) {
      if (isClassInPast(notif.dayOfClass, notif.timeOfClass)) {
        console.log(
          `[TimetableNotificationScheduler] Canceling past notification: ${classId}`,
        );
        await cancelNotification(notif.notificationId);
        scheduled.delete(classId);
      }
    }

    await saveScheduledClasses(scheduled);

    // Schedule any new classes
    await scheduleAllTimetableNotifications(allClasses, minutesBefore);
  } catch (error) {
    console.error(
      "[TimetableNotificationScheduler] Error refreshing notifications:",
      error,
    );
  }
}

/**
 * Cancel all scheduled timetable notifications
 * Call this when user disables notifications or logs out
 */
export async function cancelAllTimetableNotifications(): Promise<void> {
  try {
    console.log(
      "[TimetableNotificationScheduler] Canceling all timetable notifications",
    );

    const scheduled = await getScheduledClasses();

    for (const [classId, notif] of scheduled) {
      try {
        await cancelNotification(notif.notificationId);
      } catch (err) {
        console.warn(
          `[TimetableNotificationScheduler] Failed to cancel ${classId}:`,
          err,
        );
      }
    }

    // Clear storage
    await AsyncStorage.removeItem(SCHEDULED_CLASSES_KEY);
    console.log(
      "[TimetableNotificationScheduler] All notifications canceled",
    );
  } catch (error) {
    console.error(
      "[TimetableNotificationScheduler] Error canceling all notifications:",
      error,
    );
  }
}

/**
 * Get count of scheduled notifications
 */
export async function getScheduledNotificationCount(): Promise<number> {
  try {
    const scheduled = await getScheduledClasses();
    return scheduled.size;
  } catch (error) {
    console.error(
      "[TimetableNotificationScheduler] Error getting count:",
      error,
    );
    return 0;
  }
}

/**
 * Get list of all scheduled notifications (for debugging/UI display)
 */
export async function getScheduledNotificationsList(): Promise<
  ScheduledClassNotification[]
> {
  try {
    const scheduled = await getScheduledClasses();
    return Array.from(scheduled.values());
  } catch (error) {
    console.error(
      "[TimetableNotificationScheduler] Error getting list:",
      error,
    );
    return [];
  }
}
