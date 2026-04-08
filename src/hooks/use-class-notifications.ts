import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useRef } from "react";
import { useInAppNotifications } from "../context/in-app-notification-context";
import { useWebNotifications } from "../context/web-notifications-context";
import { canUseWebNotifications } from "../utils/web-notifications";
import { ClassSlot } from "../types";

// Global tracking to ensure notifications show only once per class across all component instances
const notifiedClasses = new Set<string>();

/**
 * Hook to show notifications for current and next class
 * - Shows notification when current class starts
 * - Shows notification for next class (with time-based trigger)
 * - Uses global tracking to ensure notifications show only once per class session
 * - Sends both in-app and web notifications when on web platform
 */
export function useClassNotifications(
  current: ClassSlot | null,
  next: ClassSlot | null,
) {
  const { showNotification } = useInAppNotifications();
  const webNotif = useWebNotifications();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isWeb = canUseWebNotifications();

  // Helper function to extract class info
  const getClassInfo = (cls: ClassSlot | null) => {
    if (!cls) return null;

    const isProject =
      cls.data.subject === "Minor Project" ||
      cls.data.subject === "Major Project";
    const isMandatory = cls.data.OtherDepartment === true && !isProject;

    const subject =
      cls.data.subject ??
      cls.data.entries?.[0]?.subject ??
      (isMandatory ? "Mandatory Course" : "Unknown");
    const room = cls.data.classRoom ?? cls.data.entries?.[0]?.classRoom ?? "";

    return { subject, room, time: cls.timeOfClass };
  };

  // Helper to create unique class identifier
  const getClassId = (cls: ClassSlot | null) => {
    if (!cls) return null;
    return `${cls.dayOfClass}-${cls.timeOfClass}-${cls.data.subject}`;
  };

  // Helper to convert time string to minutes since midnight
  const timeToMinutes = (time: string): number => {
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
  };

  // Show notification for current class when it starts
  useEffect(() => {
    if (current) {
      const classId = getClassId(current);
      const classInfo = getClassInfo(current);

      if (classInfo && classId && !notifiedClasses.has(classId)) {
        // Show in-app notification
        showNotification({
          title: "🔴 Class Started",
          body: `${classInfo.subject}${classInfo.room ? ` • ${classInfo.room}` : ""}`,
          type: "start",
        });

        // Send web notification if on web and permission is granted
        if (isWeb && webNotif.isGranted) {
          webNotif
            .sendClassNotification(
              "current",
              classInfo.subject,
              classInfo.room,
              classInfo.time,
            )
            .catch((err) => {
              console.warn(
                "[useClassNotifications] Error sending web notification:",
                err,
              );
            });
        }

        notifiedClasses.add(classId);
      }
    }
  }, [current, showNotification, webNotif, isWeb]);

  // Show notification for next class with time-based trigger
  useEffect(() => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (!next) return;

    const classId = getClassId(next);
    const classInfo = getClassInfo(next);

    if (!classInfo || !classId || notifiedClasses.has(classId)) return;

    // Calculate time until next class starts
    const now = new Date();
    const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();
    const nextClassStartInMinutes = timeToMinutes(next.timeOfClass);
    const minutesUntilNextClass =
      nextClassStartInMinutes - currentTimeInMinutes;

    // Show notification 10 minutes before the next class starts
    const NOTIFICATION_ADVANCE_MINUTES = 10;

    if (minutesUntilNextClass > NOTIFICATION_ADVANCE_MINUTES) {
      // Schedule notification for later
      const delayMs =
        (minutesUntilNextClass - NOTIFICATION_ADVANCE_MINUTES) * 60 * 1000;

      timeoutRef.current = setTimeout(() => {
        if (!notifiedClasses.has(classId)) {
          // Show in-app notification
          showNotification({
            title: "📋 Up Next",
            body: `${classInfo.subject}${classInfo.room ? ` • ${classInfo.room}` : ""} at ${classInfo.time}`,
            type: "reminder",
          });

          // Send web notification if on web and permission is granted
          if (isWeb && webNotif.isGranted) {
            webNotif
              .sendClassNotification(
                "next",
                classInfo.subject,
                classInfo.room,
                classInfo.time,
              )
              .catch((err) => {
                console.warn(
                  "[useClassNotifications] Error sending web notification:",
                  err,
                );
              });
          }

          notifiedClasses.add(classId);
        }
      }, delayMs);
    } else if (minutesUntilNextClass > 0) {
      // Next class is within 10 minutes, show notification immediately
      showNotification({
        title: "📋 Up Next",
        body: `${classInfo.subject}${classInfo.room ? ` • ${classInfo.room}` : ""} at ${classInfo.time}`,
        type: "reminder",
      });

      // Send web notification if on web and permission is granted
      if (isWeb && webNotif.isGranted) {
        webNotif
          .sendClassNotification(
            "next",
            classInfo.subject,
            classInfo.room,
            classInfo.time,
          )
          .catch((err) => {
            console.warn(
              "[useClassNotifications] Error sending web notification:",
              err,
            );
          });
      }

      notifiedClasses.add(classId);
    }
  }, [next, showNotification, webNotif, isWeb]);

  // Cleanup: Clear notifications when day changes
  useEffect(() => {
    const checkDayChange = async () => {
      try {
        const now = new Date();
        const dayId = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
        const lastDayId = await AsyncStorage.getItem("lastNotificationDayId");

        if (lastDayId !== dayId) {
          notifiedClasses.clear();
          await AsyncStorage.setItem("lastNotificationDayId", dayId);
        }
      } catch (err) {
        console.warn("[useClassNotifications] Error checking day change:", err);
      }
    };

    checkDayChange();
    const timer = setInterval(checkDayChange, 60000); // Check every minute

    return () => {
      clearInterval(timer);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
}
