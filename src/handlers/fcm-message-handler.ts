/**
 * Firebase Cloud Messaging (FCM) Message Handler
 *
 * Unified handler for processing FCM messages across all app states:
 * - Foreground (app open)
 * - Background (app backgrounded)
 * - Terminated (app closed)
 *
 * This handler converts FCM messages to system notifications and logs data.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

export interface FCMMessage {
  notification?: {
    title?: string;
    body?: string;
  };
  data?: Record<string, string>;
  messageId?: string;
  sentTime?: number;
  from?: string;
}

interface ProcessedNotification {
  id: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  receivedAt: number;
  state: "foreground" | "background" | "terminated";
}

const NOTIFICATION_HISTORY_KEY = "fcm_notification_history";
const MAX_HISTORY_SIZE = 50;
const FCM_CHANNEL_ID = "fcm-messages";

/**
 * Ensure FCM channel exists on Android
 */
async function ensureFCMChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  try {
    await Notifications.setNotificationChannelAsync(FCM_CHANNEL_ID, {
      name: "Firebase Messages",
      importance: Notifications.AndroidImportance.MAX,
      sound: "default",
      vibrationPattern: [0, 250, 250, 250],
      enableVibrate: true,
      enableLights: true,
      lightColor: "#6C63FF",
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: true,
    });
  } catch (error) {
    console.warn("[FCM] Channel creation error:", error);
  }
}

export async function displayNotification(
  title: string,
  body: string,
  data?: Record<string, string>,
): Promise<string> {
  if (Platform.OS === "web") {
    console.log("[FCM] Skipping notification on web platform");
    return "";
  }

  try {
    // Ensure channel is created first
    await ensureFCMChannel();

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: "default",
        badge: 1,
        priority: "high",
        data: data || {},
      },
      trigger: Platform.OS === "android"
        ? {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(Date.now() + 100), // Fire in 100ms
          channelId: FCM_CHANNEL_ID, // Use default FCM channel
        }
        : null,
    });

    console.log("[FCM] Notification displayed:", notificationId);
    return notificationId;
  } catch (error) {
    console.error("[FCM] Error displaying notification:", error);
    return "";
  }
}

/**
 * Main message handler - processes FCM message and shows notification
 * Call this from foreground, background, and notification handlers
 */
export async function handleFCMMessage(
  message: FCMMessage,
  state: "foreground" | "background" | "terminated" = "foreground",
): Promise<void> {
  try {
    const title = message.notification?.title || "New Message";
    const body = message.notification?.body || "You have a new notification";

    console.log(`[FCM] Message received (${state}):`, {
      title,
      body,
      data: message.data,
    });

    // Display system notification (works in all states)
    await displayNotification(title, body, message.data);

    // Store in history for debugging
    const notification: ProcessedNotification = {
      id: message.messageId || `fcm_${Date.now()}`,
      title,
      body,
      data: message.data,
      receivedAt: Date.now(),
      state,
    };

    await storeNotificationHistory(notification);
  } catch (error) {
    console.error("[FCM] Error handling message:", error);
  }
}

/**
 * Store notification history for debugging
 */
async function storeNotificationHistory(
  notification: ProcessedNotification,
): Promise<void> {
  try {
    const historyStr = await AsyncStorage.getItem(NOTIFICATION_HISTORY_KEY);
    const history: ProcessedNotification[] = historyStr
      ? JSON.parse(historyStr)
      : [];

    history.push(notification);

    // Keep only recent notifications
    if (history.length > MAX_HISTORY_SIZE) {
      history.shift();
    }

    await AsyncStorage.setItem(
      NOTIFICATION_HISTORY_KEY,
      JSON.stringify(history),
    );
  } catch (error) {
    console.error("[FCM] Error storing notification history:", error);
  }
}

/**
 * Get notification history (for debugging/testing)
 */
export async function getNotificationHistory(): Promise<
  ProcessedNotification[]
> {
  try {
    const historyStr = await AsyncStorage.getItem(NOTIFICATION_HISTORY_KEY);
    return historyStr ? JSON.parse(historyStr) : [];
  } catch (error) {
    console.error("[FCM] Error retrieving notification history:", error);
    return [];
  }
}

/**
 * Clear notification history
 */
export async function clearNotificationHistory(): Promise<void> {
  try {
    await AsyncStorage.removeItem(NOTIFICATION_HISTORY_KEY);
    console.log("[FCM] Notification history cleared");
  } catch (error) {
    console.error("[FCM] Error clearing notification history:", error);
  }
}

/**
 * Format notification history for display
 */
export async function getFormattedNotificationHistory(): Promise<string> {
  const history = await getNotificationHistory();

  if (history.length === 0) {
    return "No notifications received yet.";
  }

  return history
    .reverse() // Most recent first
    .map((n) => {
      const time = new Date(n.receivedAt).toLocaleTimeString();
      return `[${time}] (${n.state.toUpperCase()}) ${n.title}\n${n.body}`;
    })
    .join("\n\n");
}

/**
 * Send a test FCM message (simulates receiving a notification)
 * For testing across all app states
 */
export async function sendTestFcmNotification(
  title: string = "📬 Test FCM",
  body: string = "Test notification received!",
): Promise<void> {
  if (Platform.OS === "web") {
    console.log("[FCM] Test notification skipped on web");
    return;
  }

  try {
    console.log("[FCM] Sending test notification...");

    const testMessage: FCMMessage = {
      notification: { title, body },
      data: {
        type: "test",
        timestamp: Date.now().toString(),
        source: "test-button",
      },
      messageId: `test_${Date.now()}`,
    };

    // Process as if received
    await handleFCMMessage(testMessage, "foreground");

    console.log("[FCM] Test notification sent");
  } catch (error) {
    console.error("[FCM] Error sending test notification:", error);
  }
}
