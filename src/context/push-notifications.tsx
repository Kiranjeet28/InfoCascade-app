import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";

export interface ReceivedNotification {
  id: string;
  title?: string;
  body?: string;
  data?: Record<string, any>;
}

interface PushNotificationContextType {
  expoPushToken: string | undefined;
  notification: ReceivedNotification | null;
  isNotificationsEnabled: boolean;
  requestPermissions: () => Promise<boolean>;
  sendLocalNotification: (
    title: string,
    body: string,
    data?: Record<string, any>,
  ) => Promise<void>;
}

const PushNotificationContext = createContext<PushNotificationContextType>({
  expoPushToken: undefined,
  notification: null,
  isNotificationsEnabled: false,
  requestPermissions: async () => false,
  sendLocalNotification: async () => {},
});

export function usePushNotifications() {
  return useContext(PushNotificationContext);
}

// Set default notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export function PushNotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [expoPushToken, setExpoPushToken] = useState<string | undefined>(
    undefined,
  );
  const [notification, setNotification] = useState<ReceivedNotification | null>(
    null,
  );
  const [isNotificationsEnabled, setIsNotificationsEnabled] = useState(false);
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  // Request permissions and register for push notifications
  const requestPermissions = async (): Promise<boolean> => {
    try {
      // Check if device is physical (required for push notifications)
      if (!Device.isDevice) {
        console.log(
          "[PushNotifications] Push notifications only work on physical devices",
        );
        return false;
      }

      // Request notification permissions
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        console.log(
          "[PushNotifications] Failed to get push notification permissions",
        );
        setIsNotificationsEnabled(false);
        return false;
      }

      // Get the expo push token
      try {
        const token = await Notifications.getExpoPushTokenAsync();
        setExpoPushToken(token.data);
        setIsNotificationsEnabled(true);
        console.log(
          "[PushNotifications] Expo push token obtained:",
          token.data,
        );
        return true;
      } catch (error) {
        console.error("[PushNotifications] Error getting push token:", error);
        setIsNotificationsEnabled(false);
        return false;
      }
    } catch (error) {
      console.error("[PushNotifications] Error requesting permissions:", error);
      setIsNotificationsEnabled(false);
      return false;
    }
  };

  // Send local notification
  const sendLocalNotification = async (
    title: string,
    body: string,
    data?: Record<string, any>,
  ): Promise<void> => {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: data || {},
          sound: true,
          badge: 1,
        },
        trigger: { type: "time", seconds: 1 },
      });
      console.log("[PushNotifications] Local notification scheduled:", title);
    } catch (error) {
      console.error(
        "[PushNotifications] Error sending local notification:",
        error,
      );
    }
  };

  // Set up notification listeners
  useEffect(() => {
    // Request permissions on mount
    requestPermissions();

    // Listen for incoming notifications while app is in foreground
    notificationListener.current =
      Notifications.addNotificationReceivedListener((notif) => {
        console.log("[PushNotifications] Notification received:", notif);
        setNotification({
          id: notif.request.identifier,
          title: notif.request.content.title,
          body: notif.request.content.body,
          data: notif.request.content.data as Record<string, any> | undefined,
        });
      });

    // Listen for notification responses (when user taps on notification)
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        console.log(
          "[PushNotifications] User interacted with notification:",
          response,
        );
        const notif = response.notification;
        setNotification({
          id: notif.request.identifier,
          title: notif.request.content.title,
          body: notif.request.content.body,
          data: notif.request.content.data as Record<string, any> | undefined,
        });
      });

    // Cleanup listeners on unmount
    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  const value = {
    expoPushToken,
    notification,
    isNotificationsEnabled,
    requestPermissions,
    sendLocalNotification,
  };

  return (
    <PushNotificationContext.Provider value={value}>
      {children}
    </PushNotificationContext.Provider>
  );
}
