import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { ClassSlot } from "../types";

const SCHEDULED_IDS_KEY = "scheduled_notification_ids";
const NOTIFICATION_SETTINGS_KEY = "next_class_notification_settings";
const NEXT_CLASS_CHANNEL_ID = "next-class-alerts";

interface NotificationSettings {
  enabled: boolean;
  minutesBefore: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 1 — Module-level notification handler
// ─────────────────────────────────────────────────────────────────────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ─────────────────────────────────────────────────────────────────────────────
// STEP 2 — Create Android notification channel at module level
// ─────────────────────────────────────────────────────────────────────────────
async function ensureNextClassChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  try {
    await Notifications.setNotificationChannelAsync(NEXT_CLASS_CHANNEL_ID, {
      name: "Next Class Alerts",
      description: "Notifies you before each class starts",
      importance: Notifications.AndroidImportance.MAX,
      sound: "default",
      vibrationPattern: [0, 250, 250, 250],
      enableLights: true,
      enableVibrate: true,
      lightColor: "#6C63FF",
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: false,
    });
  } catch (error) {
    console.warn("[NextClassNotifications] Channel error:", error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 3 — Request permissions including POST_NOTIFICATIONS
// ─────────────────────────────────────────────────────────────────────────────
async function requestNextClassPermissions(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  if (!Device.isDevice) {
    console.warn("[NextClassNotifications] Requires physical device");
    return false;
  }

  try {
    const existing = await Notifications.getPermissionsAsync();
    let final = (existing as any)?.granted ?? existing;

    if (final !== "granted") {
      const requested = await Notifications.requestPermissionsAsync();
      final = (requested as any)?.granted ?? requested;
    }

    const granted = final === "granted" || final === true;
    console.log("[NextClassNotifications] Permissions:", granted ? "granted" : "DENIED");
    return granted;
  } catch (error) {
    console.error("[NextClassNotifications] Permission error:", error);
    return false;
  }
}

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

export async function initializeNextClassNotifications(): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    await ensureNextClassChannel();
    await requestNextClassPermissions();
    console.log("[NextClassNotifications] ✓ Ready");
  } catch (error) {
    console.error("[NextClassNotifications] Init error:", error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Cancel all previously scheduled notifications
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// CORE — Schedule notifications with DATE trigger
//
// KEY FIX: Uses DATE trigger (exact timestamp) instead of TIME_INTERVAL.
// DATE trigger fires at exact wall-clock time even if app is killed.
// channelId is in TRIGGER (not content) — SDK 55 Android requirement.
// ─────────────────────────────────────────────────────────────────────────────
export async function scheduleNextClassNotification(
  classes: ClassSlot[],
  minutesBefore = 15,
): Promise<boolean> {
  if (Platform.OS === "web") return false;

  try {
    await ensureNextClassChannel();
    await cancelAllClassNotifications();

    if (!isWeekday()) {
      console.log("[NextClassNotifications] Weekend — skipping");
      return false;
    }

    const validMinutes = Math.max(5, Math.min(30, minutesBefore));
    const todayName = getTodayName();
    const now = new Date();
    const nowMs = now.getTime();

    // Filter today's real classes whose notification time is still in future
    const todayClasses = classes
      .filter((c) => {
        if (c.dayOfClass !== todayName || c.data.freeClass) return false;
        const classSeconds = timeToSeconds(c.timeOfClass);
        const notifMs =
          new Date().setHours(0, 0, 0, 0) +
          (classSeconds - validMinutes * 60) * 1000;
        return notifMs > nowMs;
      })
      .sort(
        (a, b) => timeToSeconds(a.timeOfClass) - timeToSeconds(b.timeOfClass),
      );

    if (todayClasses.length === 0) {
      console.log("[NextClassNotifications] No remaining classes today");
      return false;
    }

    const scheduledIds: string[] = [];
    const midnightMs = new Date().setHours(0, 0, 0, 0);

    for (const cls of todayClasses) {
      const classSeconds = timeToSeconds(cls.timeOfClass);

      // Exact Date object when notification should fire
      const fireAtMs = midnightMs + (classSeconds - validMinutes * 60) * 1000;
      const fireAt = new Date(fireAtMs);

      // Class details
      const subject = cls.data?.subject ?? "Class";
      const room =
        cls.data?.classRoom ?? cls.data?.entries?.[0]?.classRoom ?? "TBD";
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

      const title = `📚 ${subject}${typeSuffix} starts in ${validMinutes} min`;
      const body = `${cls.timeOfClass} – ${endTime}  📍 ${room}${teacherSuffix}`;

      console.log(
        `[NextClassNotifications] Scheduling "${subject}" → fires at ${fireAt.toLocaleTimeString()}`,
      );

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: {
            subject,
            room,
            timeOfClass: cls.timeOfClass,
            endTime,
            classType,
            teacher,
          },
          // sound must NOT be set here — it belongs to the channel on Android
        },
        trigger: Platform.OS === "android"
          ? {
            // DATE trigger fires at exact wall-clock time — works when app is killed
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: fireAt,
            channelId: NEXT_CLASS_CHANNEL_ID, // ← MUST be in trigger, not content, for SDK 55
          }
          : {
            // iOS uses DATE trigger too
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: fireAt,
          },
      });

      scheduledIds.push(notificationId);
    }

    await AsyncStorage.setItem(SCHEDULED_IDS_KEY, JSON.stringify(scheduledIds));

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