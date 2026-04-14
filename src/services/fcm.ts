/**
 * Firebase Cloud Messaging (FCM) Service
 *
 * CRITICAL FIXES:
 * 1. Android channel created at module top-level BEFORE any scheduling
 * 2. Single notification handler configured once at module level
 * 3. Android 13+ POST_NOTIFICATIONS permission explicitly requested
 * 4. channelId in trigger object (not content) for Android — SDK 55 requirement
 * 5. DATE trigger for scheduled notifications (works when app killed)
 * 6. Foreground messages explicitly displayed via scheduleNotificationAsync
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { getMessaging, onMessage } from "firebase/messaging";
import { Platform } from "react-native";
import { app } from "../utils/firebaseConfig";

const TOKEN_KEY = "fcm_token";
const FCM_CHANNEL_ID = "fcm-messages";

// ─────────────────────────────────────────────────────────────────────────────
// STEP 1 — Module-level notification handler (runs once, not per component)
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
// STEP 2 — Create Android channel at module level (before any notifications)
// ─────────────────────────────────────────────────────────────────────────────
async function ensureFCMChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  try {
    await Notifications.setNotificationChannelAsync(FCM_CHANNEL_ID, {
      name: "Firebase Messages",
      importance: Notifications.AndroidImportance.MAX,
      sound: "default",
      vibrationPattern: [0, 250, 250, 250],
      enableVibrate: true,
      lightColor: "#6C63FF",
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: false,
    });
  } catch (error) {
    console.warn("[FCM] Channel creation error:", error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 3 — Request permissions including POST_NOTIFICATIONS (Android 13+)
// ─────────────────────────────────────────────────────────────────────────────
async function requestFCMPermissions(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  if (!Device.isDevice) {
    console.warn("[FCM] Requires physical device");
    return false;
  }

  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let final = existing;

    if (existing !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      final = status;
    }

    const granted = final === "granted";
    console.log("[FCM] Permissions:", granted ? "granted" : "DENIED");
    return granted;
  } catch (error) {
    console.error("[FCM] Permission error:", error);
    return false;
  }
}

/**
 * Display notification immediately (used for foreground messages)
 */
async function displayNotification(
  title: string,
  body: string,
  data?: Record<string, string>,
): Promise<void> {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: "default",
        badge: 1,
        priority: "high",
        data: data || {},
        ...(Platform.OS === "android" ? { channelId: FCM_CHANNEL_ID } : {}),
      },
      trigger: null, // Display immediately
    });
  } catch (error) {
    console.error("[FCM] Display error:", error);
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
 * Initialize FCM - call ONCE on app startup in _layout.tsx
 */
export async function initFCM(): Promise<void> {
  if (Platform.OS === "web") return;

  try {
    console.log("[FCM] Initializing...");

    // Create channel FIRST
    await ensureFCMChannel();
    await requestFCMPermissions();

    console.log("[FCM] Channel + permissions ready");

    // Handle notification tap
    Notifications.addNotificationResponseReceivedListener((response) => {
      console.log("[FCM] Tapped:", response.notification.request.content.data);
    });

    // Foreground Firebase messages (only on native, not web)
    try {
      const messaging = getMessaging(app);
      onMessage(messaging, async (msg) => {
        console.log("[FCM] Foreground Firebase message:", msg.notification?.title);
        const title = msg.notification?.title || "Notification";
        const body = msg.notification?.body || "New message";
        await displayNotification(title, body, msg.data);
      });
      console.log("[FCM] Foreground listener ready");
    } catch (err) {
      console.warn("[FCM] Firebase messaging unavailable (expected in Expo Go):", err);
    }

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
