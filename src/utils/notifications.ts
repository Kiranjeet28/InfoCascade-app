import Constants from "expo-constants";
import * as Device from "expo-device";
import { Platform } from "react-native";

// Only import Notifications on native platforms
let Notifications: any = null;
let notificationsAvailable = false;

if (Platform.OS !== "web") {
  try {
    Notifications = require("expo-notifications");
    notificationsAvailable = true;

    // Configure how notifications should be handled
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch (error) {
    console.warn("Notifications module not available:", error);
    notificationsAvailable = false;
  }
}

/**
 * Send a push notification to the given Expo push token
 */
export async function sendPushNotification(
  expoPushToken: string,
  title: string,
  body: string,
) {
  if (!notificationsAvailable) {
    console.warn("Notifications not available on this platform");
    return;
  }

  const message = {
    to: expoPushToken,
    sound: "default",
    title,
    body,
    data: { someData: "goes here" },
  };

  await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Accept-encoding": "gzip, deflate",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(message),
  });
}

/**
 * Handle registration errors
 */
function handleRegistrationError(errorMessage: string) {
  console.error("Notification Error:", errorMessage);
  alert(errorMessage);
  throw new Error(errorMessage);
}

/**
 * Register for push notifications and get the Expo push token
 */
export async function registerForPushNotificationsAsync(): Promise<
  string | null
> {
  if (!notificationsAvailable) {
    console.warn("Notifications not available on this platform");
    return null;
  }

  if (Platform.OS === "android") {
    try {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FF231F7C",
      });
    } catch (error) {
      console.warn("Failed to set notification channel:", error);
    }
  }

  if (Device.isDevice) {
    try {
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== "granted") {
        handleRegistrationError(
          "Permission not granted to get push token for push notification!",
        );
        return null;
      }
      const projectId =
        Constants?.expoConfig?.extra?.eas?.projectId ??
        Constants?.easConfig?.projectId;
      if (!projectId) {
        handleRegistrationError("Project ID not found");
        return null;
      }
      try {
        const pushTokenString = (
          await Notifications.getExpoPushTokenAsync({
            projectId,
          })
        ).data;
        console.log("Push Token:", pushTokenString);
        return pushTokenString;
      } catch (e: unknown) {
        handleRegistrationError(`${e}`);
        return null;
      }
    } catch (error) {
      console.error("Error in registerForPushNotificationsAsync:", error);
      return null;
    }
  } else {
    handleRegistrationError("Must use physical device for push notifications");
    return null;
  }
}

/**
 * Add listeners for notification events
 */
export function addNotificationListeners(
  onNotificationReceived?: (notification: any) => void,
  onNotificationResponse?: (response: any) => void,
) {
  if (!notificationsAvailable) {
    console.warn("Notifications not available on this platform");
    return () => {};
  }

  try {
    const notificationListener = Notifications.addNotificationReceivedListener(
      async (notification: any) => {
        console.log("Notification received:", notification);
        onNotificationReceived?.(notification);

        // Force show notification in OS tray by scheduling a local notification
        try {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: notification.request.content.title || "Notification",
              body: notification.request.content.body || "",
              data: notification.request.content.data || {},
              sound: notification.request.content.sound || "default",
            },
            trigger: null, // Show immediately
          });
        } catch (error) {
          console.error("Failed to present notification:", error);
        }
      },
    );

    const responseListener =
      Notifications.addNotificationResponseReceivedListener((response: any) => {
        console.log("Notification response:", response);
        onNotificationResponse?.(response);
      });

    return () => {
      notificationListener.remove();
      responseListener.remove();
    };
  } catch (error) {
    console.error("Error adding notification listeners:", error);
    return () => {};
  }
}
