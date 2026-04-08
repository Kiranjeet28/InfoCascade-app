import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  canUseWebNotifications,
  getNotificationPermission,
  requestNotificationPermission,
  registerServiceWorker,
  initializeWebNotifications,
  sendWebNotification,
  sendWebClassNotification,
  sendTestNotification,
} from "../utils/web-notifications";

export interface WebNotificationContextType {
  isSupported: boolean;
  permission: NotificationPermission;
  isGranted: boolean;
  isDenied: boolean;
  isDefault: boolean;
  isInitialized: boolean;
  isRequesting: boolean;
  requestPermission: () => Promise<boolean>;
  sendNotification: (
    title: string,
    body: string,
    options?: any,
  ) => Promise<boolean>;
  sendClassNotification: (
    type: "current" | "next",
    subject: string,
    room: string,
    time: string,
  ) => Promise<boolean>;
  sendTest: () => Promise<boolean>;
}

const WebNotificationContext = createContext<WebNotificationContextType | null>(
  null,
);

export function useWebNotifications() {
  const context = useContext(WebNotificationContext);
  if (!context) {
    throw new Error(
      "useWebNotifications must be used within WebNotificationProvider",
    );
  }
  return context;
}

export function WebNotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] =
    useState<NotificationPermission>("denied");
  const [isInitialized, setIsInitialized] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const initRef = useRef(false);

  // Initialize on mount
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const init = async () => {
      try {
        const supported = canUseWebNotifications();
        setIsSupported(supported);

        if (!supported) {
          console.log("[WebNotificationProvider] Notifications not supported");
          setIsInitialized(true);
          return;
        }

        // Initialize service worker and check permissions
        await initializeWebNotifications();
        const currentPermission = getNotificationPermission();
        setPermission(currentPermission);

        console.log(
          "[WebNotificationProvider] Initialized with permission:",
          currentPermission,
        );
        setIsInitialized(true);
      } catch (error) {
        console.error("[WebNotificationProvider] Init error:", error);
        setIsInitialized(true);
      }
    };

    init();
  }, []);

  // Poll permission state periodically
  useEffect(() => {
    if (!isSupported) return;

    const interval = setInterval(() => {
      const currentPermission = getNotificationPermission();
      setPermission(currentPermission);
    }, 2000);

    return () => clearInterval(interval);
  }, [isSupported]);

  const handleRequestPermission = async (): Promise<boolean> => {
    try {
      setIsRequesting(true);
      console.log("[WebNotificationProvider] Requesting permission...");
      const granted = await requestNotificationPermission();
      const newPermission = getNotificationPermission();
      setPermission(newPermission);
      console.log("[WebNotificationProvider] Permission result:", granted);
      return granted;
    } catch (error) {
      console.error(
        "[WebNotificationProvider] Error requesting permission:",
        error,
      );
      return false;
    } finally {
      setIsRequesting(false);
    }
  };

  const handleSendNotification = async (
    title: string,
    body: string,
    options?: any,
  ): Promise<boolean> => {
    if (!isSupported) {
      console.warn("[WebNotificationProvider] Notifications not supported");
      return false;
    }

    if (permission !== "granted") {
      console.warn("[WebNotificationProvider] Permission not granted");
      return false;
    }

    try {
      return await sendWebNotification({
        title,
        body,
        ...options,
      });
    } catch (error) {
      console.error(
        "[WebNotificationProvider] Error sending notification:",
        error,
      );
      return false;
    }
  };

  const handleSendClassNotification = async (
    type: "current" | "next",
    subject: string,
    room: string,
    time: string,
  ): Promise<boolean> => {
    if (!isSupported || permission !== "granted") {
      return false;
    }

    try {
      return await sendWebClassNotification(type, subject, room, time);
    } catch (error) {
      console.error(
        "[WebNotificationProvider] Error sending class notification:",
        error,
      );
      return false;
    }
  };

  const handleSendTest = async (): Promise<boolean> => {
    if (!isSupported || permission !== "granted") {
      return false;
    }

    try {
      return await sendTestNotification();
    } catch (error) {
      console.error("[WebNotificationProvider] Error sending test:", error);
      return false;
    }
  };

  const value: WebNotificationContextType = {
    isSupported,
    permission,
    isGranted: permission === "granted",
    isDenied: permission === "denied",
    isDefault: permission === "default",
    isInitialized,
    isRequesting,
    requestPermission: handleRequestPermission,
    sendNotification: handleSendNotification,
    sendClassNotification: handleSendClassNotification,
    sendTest: handleSendTest,
  };

  return (
    <WebNotificationContext.Provider value={value}>
      {children}
    </WebNotificationContext.Provider>
  );
}
