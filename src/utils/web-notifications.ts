// ─── Web Notifications Utility ────────────────────────────────────────────────
// Handles browser notifications for web platform with permission management

export interface WebNotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  vibrate?: number[];
  requireInteraction?: boolean;
  data?: Record<string, any>;
  actions?: { action: string; title: string }[];
}

export interface NotificationPermissionState {
  permission: NotificationPermission | "default";
  timestamp: number;
}

const NOTIFICATION_PERMISSION_KEY = "infocascade_notification_permission";
const NOTIFICATION_STORAGE_KEY = "infocascade_notifications";

/**
 * Check if browser supports notifications
 */
export function canUseWebNotifications(): boolean {
  if (typeof window === "undefined") return false;
  return "Notification" in window && "serviceWorker" in navigator;
}

/**
 * Get current notification permission status
 */
export function getNotificationPermission(): NotificationPermission {
  if (!canUseWebNotifications()) return "denied";
  return window.Notification.permission;
}

/**
 * Check if notifications are enabled
 */
export function areNotificationsEnabled(): boolean {
  return getNotificationPermission() === "granted";
}

/**
 * Register service worker for web push notifications
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  try {
    if (!canUseWebNotifications()) {
      console.log("[WebNotifications] Service Workers not supported");
      return null;
    }

    const registration = await navigator.serviceWorker.register(
      "/service-worker.js",
      {
        scope: "/",
      },
    );
    console.log("[WebNotifications] Service Worker registered:", registration);
    return registration;
  } catch (error) {
    console.error(
      "[WebNotifications] Service Worker registration failed:",
      error,
    );
    return null;
  }
}

/**
 * Request notification permissions from user
 * Returns true if permission granted, false otherwise
 */
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    if (!canUseWebNotifications()) {
      console.log(
        "[WebNotifications] Notifications not supported in this browser",
      );
      return false;
    }

    const currentPermission = getNotificationPermission();

    // If already granted, return true
    if (currentPermission === "granted") {
      console.log("[WebNotifications] Notifications already granted");
      return true;
    }

    // If already denied, return false (can't re-request)
    if (currentPermission === "denied") {
      console.log("[WebNotifications] Notifications denied by user");
      return false;
    }

    // Request permission
    console.log("[WebNotifications] Requesting notification permission...");
    const permission = await window.Notification.requestPermission();

    const isGranted = permission === "granted";
    console.log(
      `[WebNotifications] Permission ${isGranted ? "granted" : "denied"}`,
    );

    // Store permission state
    savePermissionState(permission);

    // Register service worker if permission granted
    if (isGranted) {
      await registerServiceWorker();
    }

    return isGranted;
  } catch (error) {
    console.error("[WebNotifications] Error requesting permission:", error);
    return false;
  }
}

/**
 * Save permission state to localStorage
 */
function savePermissionState(permission: NotificationPermission): void {
  try {
    const state: NotificationPermissionState = {
      permission,
      timestamp: Date.now(),
    };
    localStorage.setItem(NOTIFICATION_PERMISSION_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn("[WebNotifications] Failed to save permission state:", error);
  }
}

/**
 * Get saved permission state
 */
export function getPermissionState(): NotificationPermissionState | null {
  try {
    const stored = localStorage.getItem(NOTIFICATION_PERMISSION_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.warn("[WebNotifications] Failed to get permission state:", error);
    return null;
  }
}

/**
 * Send a browser notification
 */
export async function sendWebNotification(
  options: WebNotificationOptions,
): Promise<boolean> {
  try {
    if (!areNotificationsEnabled()) {
      console.log("[WebNotifications] Notifications not enabled");
      return false;
    }

    const {
      title,
      body,
      icon = "/favicon.ico",
      badge = "/favicon.ico",
      tag = "infocascade-notification",
      vibrate = [100, 50, 100],
      requireInteraction = false,
      data = {},
      actions = [],
    } = options;

    const notificationOptions: NotificationOptions = {
      body,
      icon,
      badge,
      tag,
      vibrate,
      requireInteraction,
      data,
      actions,
      silent: false,
      dir: "auto",
    };

    // Try to use service worker for notifications if available
    if (navigator.serviceWorker?.controller) {
      console.log("[WebNotifications] Sending notification via service worker");
      new window.Notification(title, notificationOptions);
    } else {
      console.log("[WebNotifications] Sending direct notification");
      new window.Notification(title, notificationOptions);
    }

    // Store notification in history
    storeNotificationHistory(title, body);
    return true;
  } catch (error) {
    console.error("[WebNotifications] Error sending notification:", error);
    return false;
  }
}

/**
 * Send class notification for web
 */
export async function sendWebClassNotification(
  type: "current" | "next",
  subject: string,
  room: string,
  time: string,
): Promise<boolean> {
  const icon = type === "current" ? "🔴" : "📋";
  const title = type === "current" ? "Class Started" : "Up Next";

  const body =
    type === "current"
      ? `${subject}${room ? ` • ${room}` : ""}`
      : `${subject}${room ? ` • ${room}` : ""} at ${time}`;

  return sendWebNotification({
    title: `${icon} ${title}`,
    body,
    tag: `class-${type}-${subject}-${time}`,
    requireInteraction: type === "current",
    data: {
      type: "class-notification",
      notificationType: type,
      subject,
      room,
      time,
    },
    actions: [
      { action: "open", title: "Open App" },
      { action: "close", title: "Dismiss" },
    ],
  });
}

/**
 * Store notification in history
 */
function storeNotificationHistory(title: string, body: string): void {
  try {
    const stored = localStorage.getItem(NOTIFICATION_STORAGE_KEY);
    const history = stored ? JSON.parse(stored) : [];

    const notification = {
      title,
      body,
      timestamp: Date.now(),
      id: `notif-${Date.now()}-${Math.random()}`,
    };

    history.unshift(notification);
    // Keep only last 50 notifications
    history.splice(50);

    localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(history));
  } catch (error) {
    console.warn(
      "[WebNotifications] Failed to store notification history:",
      error,
    );
  }
}

/**
 * Get notification history
 */
export function getNotificationHistory(
  limit: number = 20,
): Array<{ title: string; body: string; timestamp: number; id: string }> {
  try {
    const stored = localStorage.getItem(NOTIFICATION_STORAGE_KEY);
    const history = stored ? JSON.parse(stored) : [];
    return history.slice(0, limit);
  } catch (error) {
    console.warn(
      "[WebNotifications] Failed to get notification history:",
      error,
    );
    return [];
  }
}

/**
 * Clear notification history
 */
export function clearNotificationHistory(): void {
  try {
    localStorage.removeItem(NOTIFICATION_STORAGE_KEY);
    console.log("[WebNotifications] Notification history cleared");
  } catch (error) {
    console.warn(
      "[WebNotifications] Failed to clear notification history:",
      error,
    );
  }
}

/**
 * Request and setup notifications on page load
 */
export async function initializeWebNotifications(): Promise<boolean> {
  try {
    if (!canUseWebNotifications()) {
      console.log("[WebNotifications] Web notifications not supported");
      return false;
    }

    // Check current permission
    const permission = getNotificationPermission();

    if (permission === "granted") {
      console.log("[WebNotifications] Notifications already granted");
      await registerServiceWorker();
      return true;
    }

    if (permission === "denied") {
      console.log("[WebNotifications] Notifications denied by user");
      return false;
    }

    // Default state - wait for user to request
    console.log("[WebNotifications] Ready to request notification permission");
    return false;
  } catch (error) {
    console.error("[WebNotifications] Initialization failed:", error);
    return false;
  }
}

/**
 * Send test notification for debugging
 */
export async function sendTestNotification(): Promise<boolean> {
  return sendWebNotification({
    title: "✅ Test Notification",
    body: "This is a test notification from InfoCascade. Your notifications are working!",
    icon: "/favicon.ico",
    data: { type: "test" },
  });
}

/**
 * Prompt user to enable notifications with friendly UI
 */
export async function promptForNotificationPermission(): Promise<boolean> {
  try {
    if (!canUseWebNotifications()) {
      console.log("[WebNotifications] Notifications not supported");
      return false;
    }

    const permission = getNotificationPermission();

    // Already denied - can't ask again
    if (permission === "denied") {
      console.log(
        "[WebNotifications] Notifications blocked. Please enable in browser settings.",
      );
      return false;
    }

    // Already granted
    if (permission === "granted") {
      console.log("[WebNotifications] Notifications already enabled");
      return true;
    }

    // Ask for permission
    const granted = await requestNotificationPermission();

    if (!granted) {
      console.log("[WebNotifications] User declined notifications");
    }

    return granted;
  } catch (error) {
    console.error("[WebNotifications] Error in permission prompt:", error);
    return false;
  }
}

/**
 * Close all active notifications
 */
export function closeAllNotifications(): void {
  try {
    if (!canUseWebNotifications()) return;

    // Get all active notifications
    if (navigator.serviceWorker?.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: "CLOSE_ALL_NOTIFICATIONS",
      });
    }

    console.log("[WebNotifications] Closing all notifications");
  } catch (error) {
    console.warn("[WebNotifications] Error closing notifications:", error);
  }
}

/**
 * Check if we should show notification permission UI
 * Returns true if permission is 'default' (not yet asked)
 */
export function shouldShowPermissionPrompt(): boolean {
  if (!canUseWebNotifications()) return false;
  return getNotificationPermission() === "default";
}
