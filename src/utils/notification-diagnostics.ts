/**
 * Notification Diagnostics Utility
 * 
 * Helps verify that all notification systems are properly configured
 * and can display notifications on lock screen and in foreground
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

export interface NotificationDiagnostics {
    isPhysicalDevice: boolean;
    platform: string;
    permissionsStatus: string;
    expoTokenStatus: string;
    channelsConfigured: string[];
    issues: string[];
    recommendations: string[];
}

/**
 * Run comprehensive notification diagnostics
 */
export async function runNotificationDiagnostics(): Promise<NotificationDiagnostics> {
    const issues: string[] = [];
    const recommendations: string[] = [];
    const channelsConfigured: string[] = [];

    // Check if physical device
    const isPhysicalDevice = Device.isDevice;
    if (!isPhysicalDevice) {
        issues.push("Running on emulator/simulator - notifications may not work");
        recommendations.push("Test on a physical device for accurate notification behavior");
    }

    // Check permissions
    let permissionsStatus = "unknown";
    try {
        const perms = await Notifications.getPermissionsAsync();
        permissionsStatus = (perms as any)?.granted ?? perms ? "granted" : "denied";

        if (permissionsStatus !== "granted") {
            issues.push(`Notification permissions: ${permissionsStatus}`);
            recommendations.push("Grant notification permissions in app settings > Infocascade > Notifications");
        }
    } catch (err) {
        issues.push(`Failed to check permissions: ${err}`);
    }

    // Check Expo token
    let expoTokenStatus = "unknown";
    try {
        const token = await Notifications.getExpoPushTokenAsync();
        expoTokenStatus = token?.data ? "available" : "unavailable";

        if (!token?.data) {
            issues.push("Expo push token not available");
            recommendations.push("Ensure device is registered for push notifications");
        }
    } catch (err) {
        issues.push(`Failed to get Expo token: ${err}`);
    }

    // Check Android channels
    if (Platform.OS === "android") {
        try {
            // Note: Getting all channels is not directly exposed in Expo SDK
            // We'll log what we know is configured
            channelsConfigured.push("next-class-alerts", "fcm-messages");
        } catch (err) {
            issues.push(`Failed to check Android channels: ${err}`);
        }
    }

    // Check notification settings
    try {
        const settings = await AsyncStorage.getItem("next_class_notification_settings");
        if (settings) {
            const parsed = JSON.parse(settings);
            if (!parsed.enabled) {
                recommendations.push("Enable notifications in app settings (toggle 'Next Class Alerts')");
            }
        }
    } catch (err) {
        issues.push(`Failed to check notification settings: ${err}`);
    }

    // Platform-specific checks
    if (Platform.OS === "android") {
        const apiLevel = parseInt(Platform.Version?.toString() || "0", 10);
        if (apiLevel < 24) {
            issues.push(`Android API level ${apiLevel} - notifications require API 24+`);
        }
        if (apiLevel >= 31) {
            recommendations.push("For Android 12+, battery optimization may affect notifications - check battery settings");
        }
    }

    return {
        isPhysicalDevice,
        platform: Platform.OS,
        permissionsStatus,
        expoTokenStatus,
        channelsConfigured,
        issues,
        recommendations,
    };
}

/**
 * Send a test notification to verify setup
 */
export async function sendTestNotification(): Promise<boolean> {
    if (Platform.OS === "web") {
        console.log("[Diagnostics] Test notifications not available on web");
        return false;
    }

    try {
        const notificationId = await Notifications.scheduleNotificationAsync({
            content: {
                title: "🧪 Test Notification",
                body: "If you see this, notifications are working!",
                sound: "default",
                badge: 1,
                priority: "high",
            },
            trigger: Platform.OS === "android"
                ? {
                    type: Notifications.SchedulableTriggerInputTypes.DATE,
                    date: new Date(Date.now() + 1000), // Fire in 1 second
                    channelId: "next-class-alerts",
                }
                : { seconds: 1 },
        });

        console.log("[Diagnostics] Test notification scheduled:", notificationId);
        return true;
    } catch (error) {
        console.error("[Diagnostics] Failed to send test notification:", error);
        return false;
    }
}

/**
 * Log diagnostics information
 */
export async function logNotificationDiagnostics(): Promise<void> {
    const diag = await runNotificationDiagnostics();

    console.log("═══════════════════════════════════════════════════════════");
    console.log("   NOTIFICATION SYSTEM DIAGNOSTICS");
    console.log("═══════════════════════════════════════════════════════════");
    console.log(`Platform: ${diag.platform}`);
    console.log(`Physical Device: ${diag.isPhysicalDevice ? "Yes ✓" : "No ✗"}`);
    console.log(`Permissions: ${diag.permissionsStatus}`);
    console.log(`Expo Token: ${diag.expoTokenStatus}`);

    if (diag.channelsConfigured.length > 0) {
        console.log(`Channels: ${diag.channelsConfigured.join(", ")}`);
    }

    if (diag.issues.length > 0) {
        console.log("\n⚠️  ISSUES FOUND:");
        diag.issues.forEach((issue) => console.log(`   • ${issue}`));
    } else {
        console.log("\n✅ No issues detected");
    }

    if (diag.recommendations.length > 0) {
        console.log("\n💡 RECOMMENDATIONS:");
        diag.recommendations.forEach((rec) => console.log(`   • ${rec}`));
    }

    console.log("═══════════════════════════════════════════════════════════\n");
}
