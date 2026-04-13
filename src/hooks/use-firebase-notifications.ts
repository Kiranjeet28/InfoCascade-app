/**
 * Hook for managing Firebase Cloud Messaging notifications
 * Handles initialization, token management, and notification scheduling
 */

import { useCallback, useEffect, useState } from "react";
import { Platform } from "react-native";
import {
  clearFCMToken,
  getCurrentFCMToken,
  initializeFirebaseMessaging,
  refreshFCMToken,
  registerFCMToken,
  scheduleClassNotificationWithFCM,
  setupNotificationPermissions,
  updateBadgeCount,
} from "../services/firebase-messaging-service";
import { ClassSlot } from "../types";

interface UseFirebaseNotificationsResult {
  isInitialized: boolean;
  isPermissionGranted: boolean;
  currentToken: string | null;
  isLoading: boolean;
  error: string | null;
  initializeMessaging: () => Promise<void>;
  requestPermissions: () => Promise<boolean>;
  scheduleClassNotification: (
    classData: any,
    minutesBefore?: number,
  ) => Promise<boolean>;
  refreshToken: () => Promise<string | null>;
  clearToken: () => Promise<void>;
  setBadgeCount: (count: number) => Promise<void>;
}

export function useFirebaseNotifications(): UseFirebaseNotificationsResult {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isPermissionGranted, setIsPermissionGranted] = useState(false);
  const [currentToken, setCurrentToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize Firebase Messaging on mount
  useEffect(() => {
    const init = async () => {
      try {
        setIsLoading(true);
        setError(null);

        console.log("[useFirebaseNotifications] Initializing...");

        // Initialize Firebase messaging
        await initializeFirebaseMessaging();

        // Check permissions
        const permissionGranted = await setupNotificationPermissions();
        setIsPermissionGranted(permissionGranted);

        // Register/get token
        const token = await registerFCMToken();
        setCurrentToken(token);

        setIsInitialized(true);
        console.log("[useFirebaseNotifications] Initialized successfully");
      } catch (err) {
        const errMsg = String(err);
        setError(errMsg);
        console.error("[useFirebaseNotifications] Initialization error:", err);
        setIsInitialized(true); // Mark initialized even on error
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, []);

  const initializeMessaging = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      await initializeFirebaseMessaging();
      const token = await registerFCMToken();
      setCurrentToken(token);
      setIsInitialized(true);

      console.log("[useFirebaseNotifications] Manual initialization complete");
    } catch (err) {
      const errMsg = String(err);
      setError(errMsg);
      console.error("[useFirebaseNotifications] Manual initialization error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);

      const granted = await setupNotificationPermissions();
      setIsPermissionGranted(granted);

      if (granted) {
        // Register token if permissions granted
        const token = await registerFCMToken();
        setCurrentToken(token);
      }

      return granted;
    } catch (err) {
      const errMsg = String(err);
      setError(errMsg);
      console.error("[useFirebaseNotifications] Error requesting permissions:", err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const scheduleClassNotification = useCallback(
    async (classData: any, minutesBefore: number = 5): Promise<boolean> => {
      try {
        if (!isPermissionGranted) {
          setError("Notification permissions not granted");
          return false;
        }

        const result = await scheduleClassNotificationWithFCM(
          classData,
          minutesBefore,
        );

        return result.sent;
      } catch (err) {
        const errMsg = String(err);
        setError(errMsg);
        console.error(
          "[useFirebaseNotifications] Error scheduling notification:",
          err,
        );
        return false;
      }
    },
    [isPermissionGranted],
  );

  const refreshToken = useCallback(async (): Promise<string | null> => {
    try {
      setError(null);

      const token = await refreshFCMToken();
      setCurrentToken(token);

      return token;
    } catch (err) {
      const errMsg = String(err);
      setError(errMsg);
      console.error("[useFirebaseNotifications] Error refreshing token:", err);
      return null;
    }
  }, []);

  const clearToken = useCallback(async () => {
    try {
      setError(null);

      await clearFCMToken();
      setCurrentToken(null);

      console.log("[useFirebaseNotifications] Token cleared");
    } catch (err) {
      const errMsg = String(err);
      setError(errMsg);
      console.error("[useFirebaseNotifications] Error clearing token:", err);
    }
  }, []);

  const setBadgeCount = useCallback(async (count: number) => {
    try {
      if (Platform.OS === "web") {
        console.log("[useFirebaseNotifications] Badge not supported on web");
        return;
      }

      await updateBadgeCount(count);
    } catch (err) {
      console.error("[useFirebaseNotifications] Error updating badge:", err);
    }
  }, []);

  return {
    isInitialized,
    isPermissionGranted,
    currentToken,
    isLoading,
    error,
    initializeMessaging,
    requestPermissions,
    scheduleClassNotification,
    refreshToken,
    clearToken,
    setBadgeCount,
  };
}
