import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { ClassSlot } from "../types";

// Storage keys
const SCHEDULED_IDS_KEY = "scheduled_notification_ids";
const NOTIFICATION_SETTINGS_KEY = "next_class_notification_settings";

interface NotificationSettings {
  enabled: boolean;
  minutesBefore: number;
}

// ── Notification handler — must be top-level, outside any component ────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ── Helpers ────────────────────────────────────────────────────────────────
function timeToSeconds(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 3600 + m * 60;
}

function isWeekday(): boolean {
  const day = new Date().getDay();
  return day !== 0 && day !== 6;
}

function calculateEndTime(startTime: string, durationMinutes = 60): string {
  const [h, m] = startTime.split(":").map(Number);
  const total = h * 60 + m + durationMinutes;
  const endH = Math.floor(total / 60) % 24;
  const endM = total % 60;
  return `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
}

function getTodayName(): string {
  const days = [
    "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
  ];
  return days[new Date().getDay()];
}

// ── Permission + push token registration ──────────────────────────────────
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (Platform.OS === "web") return null;

  // Android notification channel
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("next-class", {
      name: "Next Class Notifications",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
      sound: "default",
      enableVibrate: true,
    });
  }

  if (!Device.isDevice) {
    console.warn("[NextClassNotifications] Must use a physical device");
    return null;
  }

  // Request permissions
  const existingPermissions = await Notifications.getPermissionsAsync();
  let finalGranted = (existingPermissions as any)?.granted ?? false;

  if (!finalGranted) {
    const requestedPermissions = await Notifications.requestPermissionsAsync();
    finalGranted = (requestedPermissions as any)?.granted ?? false;
  }

  if (!finalGranted) {
    console.warn("[NextClassNotifications] Permission not granted");
    return null;
  }

  // Expo push token (optional — only needed for remote push later)
  try {
    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ??
      Constants?.easConfig?.projectId;

    if (projectId) {
      const token = (
        await Notifications.getExpoPushTokenAsync({ projectId })
      ).data;
      console.log("[NextClassNotifications] Push token:", token);
      return token;
    }
  } catch (e) {
    console.warn("[NextClassNotifications] Could not get push token:", e);
  }

  return null;
}

// ── Initialize — call once at app start ───────────────────────────────────
export async function initializeNextClassNotifications(): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    await registerForPushNotificationsAsync();
    console.log("[NextClassNotifications] Initialized");
  } catch (error) {
    console.error("[NextClassNotifications] Init error:", error);
  }
}

// ── Cancel all previously scheduled class notifications ───────────────────
export async function cancelAllClassNotifications(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(SCHEDULED_IDS_KEY);
    if (raw) {
      const ids: string[] = JSON.parse(raw);
      await Promise.all(
        ids.map((id) =>
          Notifications.cancelScheduledNotificationAsync(id).catch(() => { }),
        ),
      );
      await AsyncStorage.removeItem(SCHEDULED_IDS_KEY);
      console.log(`[NextClassNotifications] Cancelled ${ids.length} notifications`);
    }
  } catch (error) {
    console.error("[NextClassNotifications] Cancel error:", error);
  }
}

// ── Schedule a notification for EVERY remaining class today ───────────────
/**
 * This is the key function.
 *
 * It schedules ONE local OS notification per remaining class today,
 * each with its own TIME_INTERVAL trigger. Because the triggers are
 * registered with the OS (not a JS timer), they fire even when:
 *   - the app is backgrounded
 *   - the screen is off / locked
 *   - the app is completely closed (Android only needs this once per day)
 *
 * The notification body shows: subject, time, room, teacher.
 */
export async function scheduleNextClassNotification(
  classes: ClassSlot[],
  minutesBefore = 15,
): Promise<boolean> {
  if (Platform.OS === "web") return false;

  try {
    await cancelAllClassNotifications();

    if (!isWeekday()) {
      console.log("[NextClassNotifications] Weekend — skipping");
      return false;
    }

    const validMinutes = Math.max(5, Math.min(30, minutesBefore));
    const todayName = getTodayName();

    const now = new Date();
    const nowSeconds =
      now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();

    // Get all of today's real classes whose notification time hasn't passed
    const todayClasses = classes
      .filter(
        (c) =>
          c.dayOfClass === todayName &&
          !c.data.freeClass &&
          timeToSeconds(c.timeOfClass) - validMinutes * 60 > nowSeconds,
      )
      .sort(
        (a, b) =>
          timeToSeconds(a.timeOfClass) - timeToSeconds(b.timeOfClass),
      );

    if (todayClasses.length === 0) {
      console.log("[NextClassNotifications] No remaining classes today");
      return false;
    }

    const scheduledIds: string[] = [];

    for (const cls of todayClasses) {
      const classSeconds = timeToSeconds(cls.timeOfClass);
      const notifSeconds = classSeconds - validMinutes * 60;
      // Must be integer >= 10 for SDK 55 TIME_INTERVAL trigger
      const delaySeconds = Math.max(10, Math.round(notifSeconds - nowSeconds));

      // Extract class details
      const subject = cls.data?.subject ?? "Class";
      const room =
        cls.data?.classRoom ??
        cls.data?.entries?.[0]?.classRoom ??
        "TBD";
      const teacher =
        (cls.data as any)?.teacherName ??
        (cls.data?.entries?.[0] as any)?.teacherName ??
        (cls.data as any)?.teacher ??
        (cls.data?.entries?.[0] as any)?.teacher ??
        "";
      const classType =
        (cls.data as any)?.classType ??
        (cls.data?.entries?.[0] as any)?.classType ??
        "";

      const durationMinutes = classType?.toUpperCase() === "LAB" ? 120 : 60;
      const endTime = calculateEndTime(cls.timeOfClass, durationMinutes);
      const teacherSuffix = teacher ? ` · ${teacher}` : "";
      const typeSuffix = classType ? ` [${classType.toUpperCase()}]` : "";

      // Notification content — class name + subject in title, room + teacher in body
      const title = `📚 ${subject}${typeSuffix} in ${validMinutes} min`;
      const body = `${cls.timeOfClass} – ${endTime}  📍 ${room}${teacherSuffix}`;

      console.log(
        `[NextClassNotifications] Scheduling "${subject}" at ${cls.timeOfClass} → fires in ${delaySeconds}s`,
      );

      // OS-level scheduled notification — fires regardless of app state
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          // channelId targets the Android channel we created above
          ...(Platform.OS === "android" ? { channelId: "next-class" } : {}),
          data: {
            subject,
            room,
            timeOfClass: cls.timeOfClass,
            endTime,
            classType,
            teacher,
          },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: delaySeconds,
          // Do NOT pass repeats — defaults to false in SDK 55
        },
      });

      scheduledIds.push(notificationId);
    }

    // Persist IDs so we can cancel them on logout or next reschedule
    await AsyncStorage.setItem(SCHEDULED_IDS_KEY, JSON.stringify(scheduledIds));

    // Badge = number of upcoming classes
    try {
      await Notifications.setBadgeCountAsync(scheduledIds.length);
    } catch { }

    console.log(
      `[NextClassNotifications] ${scheduledIds.length} notifications scheduled for today`,
    );
    return true;
  } catch (error) {
    console.error("[NextClassNotifications] Scheduling error:", error);
    return false;
  }
}

// ── Settings ───────────────────────────────────────────────────────────────
export async function setNotificationSettings(
  settings: NotificationSettings,
): Promise<void> {
  try {
    await AsyncStorage.setItem(
      NOTIFICATION_SETTINGS_KEY,
      JSON.stringify(settings),
    );
  } catch (error) {
    console.error("[NextClassNotifications] Error saving settings:", error);
  }
}

export async function getNotificationSettings(): Promise<NotificationSettings> {
  try {
    const data = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
    if (data) return JSON.parse(data);
  } catch (error) {
    console.error("[NextClassNotifications] Error loading settings:", error);
  }
  return { enabled: false, minutesBefore: 15 };
}

export async function areNotificationsEnabled(): Promise<boolean> {
  try {
    const { enabled } = await getNotificationSettings();
    return enabled;
  } catch {
    return false;
  }
}

// ── Refresh — call on app resume or timetable reload ─────────────────────
export async function refreshNotificationSchedule(
  classes: ClassSlot[],
): Promise<boolean> {
  try {
    const enabled = await areNotificationsEnabled();
    if (!enabled) return false;
    const { minutesBefore } = await getNotificationSettings();
    return await scheduleNextClassNotification(classes, minutesBefore);
  } catch (error) {
    console.error("[NextClassNotifications] Refresh error:", error);
    return false;
  }
}

// ── Full clear — call on logout or reset ──────────────────────────────────
export async function clearAllNotificationData(): Promise<void> {
  try {
    await cancelAllClassNotifications();
    await AsyncStorage.removeItem(NOTIFICATION_SETTINGS_KEY);
    try {
      await Notifications.setBadgeCountAsync(0);
    } catch { }
    console.log("[NextClassNotifications] All data cleared");
  } catch (error) {
    console.error("[NextClassNotifications] Clear error:", error);
  }
}