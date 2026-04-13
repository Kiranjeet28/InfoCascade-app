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
  state: "foreground" | "background" | "terminated" = "foreground",
): Promise<void> {
  try {
    const title = message?.notification?.title || "Notification";
    const body = message?.notification?.body || "New message";
    const data = message?.data || {};

    console.log(`[FCM] ${state}: ${title}`);

    // Schedule notification with immediate trigger
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: "default",
        badge: 1,
        priority: "high",
        data,
      },
      trigger: null, // null = immediate
    });

    console.log(`[FCM] ✓ Notification (${state}):`, notificationId);
  } catch (error) {
    console.error(
      "[FCM] Error:",
      error instanceof Error ? error.message : error,
    );
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
    console.log("[FCM] Permissions requested");

    // Configure notification behavior - FORCE SHOW IN FOREGROUND
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    console.log("[FCM] Notification handler configured");

    // Handle notification taps
    Notifications.addNotificationResponseReceivedListener((response) => {
      console.log("[FCM] Tapped:", response.notification.request.content.data);
    });

    console.log("[FCM] Response listener registered");

    // Foreground listener
    try {
      const messaging = getMessaging(app);
      onMessage(messaging, (msg) => {
        console.log(
          "[FCM] Foreground message from Firebase:",
          msg.notification?.title,
        );
        handleMessage(msg, "foreground");
      });
      console.log("[FCM] Foreground listener registered");
    } catch (err) {
      console.warn("[FCM] Firebase messaging unavailable:", err);
    }

    // Background listener
    Notifications.addNotificationReceivedListener((notification) => {
      console.log("[FCM] Background notification received");
      handleMessage(
        {
          notification: {
            title: notification.request.content.title,
            body: notification.request.content.body,
          },
          data: notification.request.content.data,
        },
        "background",
      );
    });

    console.log("[FCM] Background listener registered");

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
  console.log("[FCM] Test button clicked");
  await handleMessage(
    {
      notification: {
        title: "📬 Test FCM",
        body: "Test notification!",
      },
      data: { type: "test", time: new Date().toLocaleTimeString() },
    },
    "foreground",
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
