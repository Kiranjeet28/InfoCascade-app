/**
 * Firebase Cloud Messaging (FCM) Service
 *
 * Unified FCM for all app states:
 * - Foreground: Firebase onMessage listener
 * - Background: Notification received listener
 * - Terminated: OS shows automatically
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { getMessaging, onMessage } from "firebase/messaging";
import { Platform } from "react-native";
import { app } from "../utils/firebaseConfig";

const FCM_TOKEN_KEY = "fcm_device_token";

/**
 * Process incoming FCM message - works for all app states
 */
export async function processFcmMessage(
  message: any,
  state: "foreground" | "background" | "terminated" = "foreground"
): Promise<void> {
  try {
    const title = message?.notification?.title || "Notification";
    const body = message?.notification?.body || "New message";
    const data = message?.data || {};

    console.log(`[FCM] ${state}:`, title);

    // Show system notification
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: "default",
        badge: 1,
        priority: "high",
        data: { ...data, state },
      },
      trigger: null, // Show immediately
    });
  } catch (error) {
    console.error("[FCM] Error:", error);
  }
}

/**
 * Get or generate FCM token
 */
export async function getFcmToken(): Promise<string | null> {
  if (Platform.OS === "web") return null;

  try {
    const cached = await AsyncStorage.getItem(FCM_TOKEN_KEY);
    if (cached) return cached;

    const { data: token } = await Notifications.getExpoPushTokenAsync();
    if (token) {
      await AsyncStorage.setItem(FCM_TOKEN_KEY, token);
      console.log("[FCM] Token:", token.substring(0, 30) + "...");
      return token;
    }
    return null;
  } catch (error) {
    console.error("[FCM] Token error:", error);
    return null;
  }
}

/**
 * Initialize FCM - call once on app startup
 */
export async function initializeFcm(): Promise<void> {
  if (Platform.OS === "web") return;

  try {
    console.log("[FCM] Initializing...");

    // Request permissions
    await Notifications.requestPermissionsAsync();

    // Setup notification behavior
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    // Listen to notification taps
    Notifications.addNotificationResponseReceivedListener((response) => {
      console.log("[FCM] Tapped:", response.notification.request.content.data);
    });

    // Foreground listener (app open)
    try {
      const messaging = getMessaging(app);
      onMessage(messaging, (message) => {
        processFcmMessage(message, "foreground");
      });
    } catch (err) {
      console.warn("[FCM] Firebase messaging not available");
    }

    // Background listener (app backgrounded)
    Notifications.addNotificationReceivedListener((notification) => {
      const message = {
        notification: {
          title: notification.request.content.title,
          body: notification.request.content.body,
        },
        data: notification.request.content.data,
      };
      processFcmMessage(message, "background");
    });

    // Get token
    await getFcmToken();

    console.log("[FCM] ✓ Ready");
  } catch (error) {
    console.error("[FCM] Init error:", error);
  }
}

/**
 * Send test notification (for "Test" button)
 */
export async function sendTestNotification(): Promise<void> {
  try {
    await processFcmMessage(
      {
        notification: {
          title: "📬 Test FCM",
          body: "Test notification received!",
        },
        data: { type: "test", time: new Date().toLocaleTimeString() },
      },
      "foreground"
    );
  } catch (error) {
    console.error("[FCM] Test error:", error);
  }
}

/**
 * Clear FCM data (e.g., on logout)
 */
export async function clearFcmData(): Promise<void> {
  try {
    await AsyncStorage.removeItem(FCM_TOKEN_KEY);
    console.log("[FCM] Data cleared");
  } catch (error) {
    console.error("[FCM] Clear error:", error);
  }
}
