import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
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
 * - Sends both in-app and native system notifications when on native platform
 * - Schedules native notifications that persist after app is closed
 */
export function useClassNotifications(
  current: ClassSlot | null,
  next: ClassSlot | null,
) {
  const { showNotification } = useInAppNotifications();
  const webNotif = useWebNotifications();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isWeb = canUseWebNotifications();
  const isNative = Platform.OS === "ios" || Platform.OS === "android";

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

  // Schedule native system notification using expo-notifications
  const scheduleNativeNotification = async (
    title: string,
    body: string,
    triggerDate: Date,
    data: Record<string, string>,
  ) => {
    if (!isNative) {
      console.log(
        "[useClassNotifications] Skipping native notification on web",
      );
      return;
    }

    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: true,
          badge: 1,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerDate,
          ...(Platform.OS === "android" && {
            channelId: "class-notifications",
          }),
        },
      });

      console.log("[useClassNotifications] 📱 Native notification scheduled:", {
        id: notificationId,
        title,
        triggerTime: triggerDate.toISOString(),
        delayMs: triggerDate.getTime() - new Date().getTime(),
      });

      return notificationId;
    } catch (error) {
      console.error(
        "[useClassNotifications] ❌ Error scheduling native notification:",
        error,
      );
    }
  };

  // Show notification for current class when it starts
  useEffect(() => {
    if (current) {
      const classId = getClassId(current);
      const classInfo = getClassInfo(current);

      if (classInfo && classId && !notifiedClasses.has(classId)) {
        console.log(
          "[useClassNotifications] Processing current class:",
          classInfo.subject,
        );

        // Show in-app notification
        showNotification({
          title: "🔴 Class Started",
          body: `${classInfo.subject}${classInfo.room ? ` • ${classInfo.room}` : ""}`,
          type: "start",
        });

        // Schedule native notification for current class START (immediately or very soon)
        if (isNative) {
          const [h, m] = classInfo.time.split(":").map(Number);
          const now = new Date();
          const classStartTime = new Date(now);
          classStartTime.setHours(h, m, 0, 0);

          // If we're already past the start time, schedule it for now + 1 second
          if (classStartTime <= now) {
            classStartTime.setSeconds(classStartTime.getSeconds() + 1);
            console.log(
              "[useClassNotifications] Class already started, scheduling for ~now",
            );
          }

          scheduleNativeNotification(
            "🔴 Class Started",
            `${classInfo.subject} (${classInfo.time})${classInfo.room ? ` • ${classInfo.room}` : ""}`,
            classStartTime,
            {
              type: "start",
              classTime: classInfo.time,
              subject: classInfo.subject,
              room: classInfo.room || "",
            },
          );
        }

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
  }, [current, showNotification, webNotif, isWeb, isNative]);

  // Show notification for next class with time-based trigger
  useEffect(() => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (!next) {
      console.log("[useClassNotifications] No next class available");
      return;
    }

    const classId = getClassId(next);
    const classInfo = getClassInfo(next);

    if (!classInfo || !classId || notifiedClasses.has(classId)) {
      if (notifiedClasses.has(classId || "")) {
        console.log(
          "[useClassNotifications] Next class already notified:",
          classId,
        );
      }
      return;
    }

    console.log(
      "[useClassNotifications] Processing next class:",
      classInfo.subject,
    );

    // Calculate time until next class starts
    const now = new Date();
    const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();
    const nextClassStartInMinutes = timeToMinutes(next.timeOfClass);
    const minutesUntilNextClass =
      nextClassStartInMinutes - currentTimeInMinutes;

    // Show notification 10 minutes before the next class starts
    const NOTIFICATION_ADVANCE_MINUTES = 10;

    console.log("[useClassNotifications] Next class timing:", {
      subject: classInfo.subject,
      classTime: classInfo.time,
      currentTimeInMinutes,
      nextClassStartInMinutes,
      minutesUntilNextClass,
    });

    if (minutesUntilNextClass > NOTIFICATION_ADVANCE_MINUTES) {
      // Schedule notification for later
      const delayMs =
        (minutesUntilNextClass - NOTIFICATION_ADVANCE_MINUTES) * 60 * 1000;

      console.log(
        "[useClassNotifications] Scheduling reminder in",
        Math.round(delayMs / 1000),
        "seconds",
      );

      // Calculate the exact reminder time
      const [h, m] = next.timeOfClass.split(":").map(Number);
      const reminderDate = new Date(now);
      reminderDate.setHours(h, m, 0, 0);
      reminderDate.setMinutes(
        reminderDate.getMinutes() - NOTIFICATION_ADVANCE_MINUTES,
      );

      // Schedule native notification (persists after app closes)
      if (isNative) {
        scheduleNativeNotification(
          "⏰ Class in 10 minutes!",
          `${classInfo.subject} starts at ${classInfo.time}${classInfo.room ? ` • ${classInfo.room}` : ""}`,
          reminderDate,
          {
            type: "reminder",
            classTime: classInfo.time,
            subject: classInfo.subject,
            room: classInfo.room || "",
          },
        );
      }

      // Also set timeout for in-app notification (for when app is running)
      timeoutRef.current = setTimeout(() => {
        if (!notifiedClasses.has(classId)) {
          console.log("[useClassNotifications] In-app reminder timeout fired");

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
      console.log(
        "[useClassNotifications] Next class within 10 mins, notifying immediately",
      );

      showNotification({
        title: "📋 Up Next",
        body: `${classInfo.subject}${classInfo.room ? ` • ${classInfo.room}` : ""} at ${classInfo.time}`,
        type: "reminder",
      });

      // Schedule native notification for ~now
      if (isNative) {
        const [h, m] = next.timeOfClass.split(":").map(Number);
        const reminderDate = new Date(now);
        reminderDate.setHours(h, m, 0, 0);
        reminderDate.setMinutes(
          reminderDate.getMinutes() - NOTIFICATION_ADVANCE_MINUTES,
        );

        // Ensure it's in the future
        if (reminderDate <= now) {
          reminderDate.setSeconds(reminderDate.getSeconds() + 1);
        }

        scheduleNativeNotification(
          "⏰ Class in 10 minutes!",
          `${classInfo.subject} starts at ${classInfo.time}${classInfo.room ? ` • ${classInfo.room}` : ""}`,
          reminderDate,
          {
            type: "reminder",
            classTime: classInfo.time,
            subject: classInfo.subject,
            room: classInfo.room || "",
          },
        );
      }

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
    } else {
      console.log(
        "[useClassNotifications] Next class is in the past, skipping",
      );
    }
  }, [next, showNotification, webNotif, isWeb, isNative]);

  // Cleanup: Clear notifications when day changes
  useEffect(() => {
    const checkDayChange = async () => {
      try {
        const now = new Date();
        const dayId = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
        const lastDayId = await AsyncStorage.getItem("lastNotificationDayId");

        if (lastDayId !== dayId) {
          console.log(
            "[useClassNotifications] Day changed, clearing notification cache",
          );
          notifiedClasses.clear();
          await AsyncStorage.setItem("lastNotificationDayId", dayId);

          // Cancel all previous notifications for new day
          if (isNative) {
            await Notifications.cancelAllScheduledNotificationsAsync();
            console.log(
              "[useClassNotifications] Cancelled all previous scheduled notifications",
            );
          }
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
  }, [isNative]);
}
