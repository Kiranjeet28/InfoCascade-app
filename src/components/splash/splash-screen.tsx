/**
 * Custom Splash Screen Component
 * Displays app icon with rounded corners in the center
 * Supports light and dark themes
 */

import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { Image, StyleSheet, useColorScheme, View } from "react-native";

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync().catch(() => {
  // Error may be thrown if splash already hidden
});

interface SplashScreenComponentProps {
  onFinish?: () => void;
}

export default function SplashScreenComponent({
  onFinish,
}: SplashScreenComponentProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  useEffect(() => {
    // Optionally hide splash after a minimal delay
    // The parent component (_layout.tsx) controls when the splash is actually hidden
    // This timeout is a fallback to prevent splash from being stuck
    const timer = setTimeout(() => {
      if (onFinish) {
        onFinish();
      }
    }, 100); // Minimal fallback delay - parent handles actual hide timing

    return () => clearTimeout(timer);
  }, [onFinish]);

  const styles = getStyles(isDark);

  return (
    <View style={styles.container}>
      {/* Background */}
      <View style={styles.background} />

      {/* Centered Icon with Rounded Corners */}
      <View style={styles.iconWrapper}>
        <Image
          source={require("../../../assets/expo-icon-final.png")} // Using the icon from assets
          style={styles.icon}
          resizeMode="contain"
        />
      </View>
    </View>
  );
}

/**
 * Styles with theme support
 */
function getStyles(isDark: boolean) {
  return StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: isDark ? "#000000" : "#FFFFFF",
    },
    background: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: isDark ? "#000000" : "#FFFFFF",
    },
    iconWrapper: {
      width: 140,
      height: 140,
      borderRadius: 35, // Curved square effect (width/4)
      backgroundColor: isDark ? "#1A1A1A" : "#F5F5F5", // Subtle background
      justifyContent: "center",
      alignItems: "center",
      overflow: "hidden",
      // Shadow for depth
      boxShadow: "0px 4px 8px rgba(0,0,0,0.15)",
      elevation: 5, // Android shadow
    },
    icon: {
      width: 120,
      height: 120,
      borderRadius: 30, // Icon also has rounded corners
    },
  });
}
