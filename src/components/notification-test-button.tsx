import { useThemeColors } from "@/context/theme-context";
import {
  addNotificationListeners,
  registerForPushNotificationsAsync,
  sendPushNotification,
} from "@/utils/notifications";
import * as Notifications from "expo-notifications";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Text,
  TouchableOpacity,
} from "react-native";

interface NotificationTestButtonProps {
  onTokenReceived?: (token: string) => void;
  title?: string;
  style?: any;
}

export default function NotificationTestButton({
  onTokenReceived,
  title = "Test Notification",
  style,
}: NotificationTestButtonProps) {
  const { colors } = useThemeColors();
  const [expoPushToken, setExpoPushToken] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<any>(undefined);

  useEffect(() => {
    // Skip if on web platform
    if (Platform.OS === "web") {
      console.log("Notifications not supported on web");
      return;
    }

    // Register for push notifications on mount
    const register = async () => {
      try {
        const token = await registerForPushNotificationsAsync();
        if (token) {
          setExpoPushToken(token);
          onTokenReceived?.(token);
        }
      } catch (error) {
        console.error("Failed to register for notifications:", error);
      }
    };

    register();

    // Add listeners for notification events
    const unsubscribe = addNotificationListeners(
      (notification) => {
        setNotification(notification);
      },
      (response) => {
        console.log("User interacted with notification:", response);
      },
    );

    return unsubscribe;
  }, [onTokenReceived]);

  const handleSendNotification = async () => {
    if (!expoPushToken) {
      Alert.alert(
        "Error",
        "Push token not available. Please make sure you have granted notification permissions.",
      );
      return;
    }

    setIsLoading(true);
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Test Notification",
          body: "This is a test local notification!",
        },
        trigger: null,
      });
      Alert.alert("Success", "Local notification scheduled!");
    } catch (error) {
      Alert.alert("Error", `Failed to schedule notification: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <TouchableOpacity
      style={[
        {
          paddingHorizontal: 16,
          paddingVertical: 10,
          borderRadius: 8,
          backgroundColor: colors.primary,
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "row",
          gap: 8,
        },
        style,
      ]}
      onPress={handleSendNotification}
      disabled={isLoading}
      activeOpacity={0.7}
    >
      {isLoading && <ActivityIndicator color="#fff" size="small" />}
      <Text style={{ color: "#fff", fontSize: 14, fontWeight: "600" }}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}
