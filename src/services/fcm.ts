/**
 * Firebase Cloud Messaging (FCM) Service
 *
 * Unified message handler for all app states:
 * - Foreground: Firebase onMessage listener
 * - Background: Notification listener
 * - Terminated: OS displays automatically
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { getMessaging, onMessage } from "firebase/messaging";
import { Platform } from "react-native";
import { app } from "../utils/firebaseConfig";

const TOKEN_KEY = "fcm_token";

/**
 * Unified message handler - works for all states
 */
export async function handleMessage(
  message: any,
  state: "foreground" | "background" | "terminated" = "foreground"
): Promise<void> {
  try {
    const title = message?.notification?.title || "Notification";
    const body = message?.notification?.body || "New message";
    const data = message?.data || {};

    console.log(`[FCM] ${state}: ${title}`);

    // Display system notification
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: "default",
        badge: 1,
        priority: "high",
        data,
      },
      trigger: null,
    });
  } catch (error) {
    console.error("[FCM] Handle error:", error);
  }
}

/**
 * Get or create FCM token
 */
export async function getToken(): Promise<string | null> {
  if (Platform.OS === "web") return null;

  try {
    const cached = await AsyncStorage.getItem(TOKEN_KEY);
    if (cached) return cached;

    const { data: token } = await Notifications.getExpoPushTokenAsync();
    if (token) {
      await AsyncStorage.setItem(TOKEN_KEY, token);
      console.log("[FCM] Token:", token.substring(0, 20) + "...");
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
export async function initFCM(): Promise<void> {
  if (Platform.OS === "web") return;

  try {
    console.log("[FCM] Initializing...");

    // Request permissions
    await Notifications.requestPermissionsAsync();

    // Configure notification behavior
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    // Handle notification taps
    Notifications.addNotificationResponseReceivedListener((response) => {
      console.log("[FCM] Tapped:", response.notification.request.content.data);
    });

    // Foreground listener
    try {
      const messaging = getMessaging(app);
      onMessage(messaging, (msg) => handleMessage(msg, "foreground"));
    } catch {
      console.warn("[FCM] Firebase messaging unavailable");
    }

    // Background listener
    Notifications.addNotificationReceivedListener((notification) => {
      handleMessage(
        {
          notification: {
            title: notification.request.content.title,
            body: notification.request.content.body,
          },
          data: notification.request.content.data,
        },
        "background"
      );
    });

    // Get token
    await getToken();

    console.log("[FCM] ✓ Ready");
  } catch (error) {
    console.error("[FCM] Init error:", error);
  }
}

/**
 * Send test notification
 */
export async function sendTest(): Promise<void> {
  await handleMessage(
    {
      notification: {
        title: "📬 Test FCM",
        body: "Test notification!",
      },
      data: { type: "test", time: new Date().toLocaleTimeString() },
    },
    "foreground"
  );
}

/**
 * Clear token on logout
 */
export async function clearToken(): Promise<void> {
  try {
    await AsyncStorage.removeItem(TOKEN_KEY);
    console.log("[FCM] Token cleared");
  } catch (error) {
    console.error("[FCM] Clear error:", error);
  }
}
