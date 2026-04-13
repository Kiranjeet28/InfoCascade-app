/**
 * FCM Initialization Service
 *
 * Sets up Firebase Cloud Messaging on app startup.
 * Handles token generation and initialization.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { getMessaging, onMessage } from "firebase/messaging";
import { Platform } from "react-native";
import { app } from "../utils/firebaseConfig";
import { handleFCMMessage } from "../handlers/fcm-message-handler";

const FCM_TOKEN_KEY = "fcm_device_token";

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
 * Setup notification handler for display behavior
 */
function setupNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  // Handle user interaction with notifications
  Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data;
    console.log("[FCM] Notification tapped:", data);
  });

  console.log("[FCM] Notification handler configured");
}

/**
 * Setup listener for foreground notifications
 */
function setupForegroundListener(): void {
  try {
    const messaging = getMessaging(app);

    onMessage(messaging, (message: any) => {
      console.log("[FCM] Foreground:", message.notification?.title);
      handleFCMMessage(message, "foreground");
    });
  } catch (error) {
    console.error("[FCM] Foreground listener error:", error);
  }
}

/**
 * Setup handler for notifications in background state
 */
function setupBackgroundListener(): void {
  if (Platform.OS === "web") return;

  Notifications.addNotificationReceivedListener((notification) => {
    const data = notification.request.content.data as any;
    console.log(
      "[FCM] Background/Terminated:",
      notification.request.content.title,
    );

    // Handle the message
    handleFCMMessage(
      {
        notification: {
          title: notification.request.content.title || undefined,
          body: notification.request.content.body || undefined,
        },
        data: data,
      },
      "background",
    );
  });
}

/**
 * Request notification permissions
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    await Notifications.requestPermissionsAsync();
    console.log("[FCM] Permissions requested");
    return true;
  } catch (error) {
    console.error("[FCM] Permission error:", error);
    return false;
  }
}

/**
 * Initialize FCM completely
 * Call this once in _layout.tsx after auth check
 */
export async function initializeFcm(): Promise<void> {
  try {
    console.log("[FCM] Initializing...");

    if (Platform.OS === "web") {
      console.log("[FCM] Skipped on web");
      return;
    }

    // Request permissions
    await requestNotificationPermissions();

    // Setup handlers
    setupNotificationHandler();
    setupForegroundListener();
    setupBackgroundListener();

    // Get token
    await getFcmToken();

    console.log("[FCM] ✓ Ready");
  } catch (error) {
    console.error("[FCM] Init error:", error);
  }
}

/**
 * Clear token on logout
 */
export async function clearFcmToken(): Promise<void> {
  try {
    await AsyncStorage.removeItem(FCM_TOKEN_KEY);
    console.log("[FCM] Token cleared");
  } catch (error) {
    console.error("[FCM] Clear error:", error);
  }
}
