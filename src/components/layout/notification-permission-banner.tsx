import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, Animated, Platform } from "react-native";
import { useThemeColors } from "../../context/theme-context";
import { useWebNotifications } from "../../context/web-notifications-context";

/**
 * Notification Permission Banner Component
 * Shows on web platform to request browser notification permission
 * Only appears when permission is in 'default' state (not yet requested)
 */
export default function NotificationPermissionBanner() {
  const { colors } = useThemeColors();
  const { isSupported, isDefault, isGranted, requestPermission, isRequesting } =
    useWebNotifications();

  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const slideAnim = React.useRef(new Animated.Value(-100)).current;

  // Initialize visibility on mount
  useEffect(() => {
    // Only on web
    if (typeof window === "undefined") return;

    // Show if: supported AND default state AND not already granted AND not dismissed
    const shouldShow = isSupported && isDefault && !isGranted && !dismissed;
    setVisible(shouldShow);

    if (shouldShow) {
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 7,
        useNativeDriver: false,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  }, [isSupported, isDefault, isGranted, dismissed, slideAnim]);

  if (!visible) {
    return null;
  }

  const handleAllow = async () => {
    try {
      await requestPermission();
      // Banner will auto-hide when permission state changes
    } catch (error) {
      console.error("[NotificationBanner] Error requesting permission:", error);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    Animated.timing(slideAnim, {
      toValue: -100,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  return (
    <Animated.View
      style={{
        transform: [{ translateY: slideAnim }],
        backgroundColor: colors.primary,
        borderBottomWidth: 1,
        borderBottomColor: colors.primary + "30",
        zIndex: 1000,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 12,
          gap: 12,
        }}
      >
        {/* Icon */}
        <Text style={{ fontSize: 20 }}>🔔</Text>

        {/* Text Content */}
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 14,
              fontWeight: "600",
              color: "#fff",
              marginBottom: 4,
            }}
          >
            Enable Notifications
          </Text>
          <Text
            style={{
              fontSize: 12,
              color: "rgba(255,255,255,0.85)",
            }}
          >
            Get alerts for upcoming classes
          </Text>
        </View>

        {/* Allow Button */}
        <TouchableOpacity
          onPress={handleAllow}
          disabled={isRequesting}
          style={{
            backgroundColor: "#fff",
            borderRadius: 8,
            paddingHorizontal: 14,
            paddingVertical: 8,
            opacity: isRequesting ? 0.7 : 1,
          }}
        >
          <Text
            style={{
              fontSize: 12,
              fontWeight: "700",
              color: colors.primary,
            }}
          >
            {isRequesting ? "Asking..." : "Allow"}
          </Text>
        </TouchableOpacity>

        {/* Close Button */}
        <TouchableOpacity
          onPress={handleDismiss}
          disabled={isRequesting}
          style={{
            padding: 4,
            opacity: isRequesting ? 0.7 : 1,
          }}
        >
          <Text
            style={{
              fontSize: 18,
              color: "rgba(255,255,255,0.6)",
              fontWeight: "bold",
            }}
          >
            ✕
          </Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}
