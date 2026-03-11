// ─── Notification Service ─────────────────────────────────────────────────────
// Handles class notifications: 10 min before, when class starts

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { ClassSlot } from '../types';

// Configure notification behavior
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

// ─── Types ────────────────────────────────────────────────────────────────────
export interface ScheduledNotification {
    id: string;
    type: 'reminder' | 'start';
    classTime: string;
    subject: string;
}

// ─── Permission Handling ──────────────────────────────────────────────────────
export async function requestNotificationPermissions(): Promise<boolean> {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== 'granted') {
        console.log('Notification permissions not granted');
        return false;
    }

    // Android-specific: Set up notification channel for high priority
    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('class-notifications', {
            name: 'Class Notifications',
            description: 'Notifications for upcoming classes',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#6C63FF',
            lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
            enableVibrate: true,
            enableLights: true,
            showBadge: true,
            bypassDnd: true,
        });
    }

    return true;
}

// ─── Helper Functions ─────────────────────────────────────────────────────────
function timeToMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
}

function getEndTime(time: string): string {
    const [h, m] = time.split(':').map(Number);
    const total = h * 60 + m + 50;
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function getSubjectName(cls: ClassSlot): string {
    return cls.data.subject ?? cls.data.entries?.[0]?.subject ?? 'Class';
}

function getRoomName(cls: ClassSlot): string {
    return cls.data.classRoom ?? cls.data.entries?.[0]?.classRoom ?? '';
}

function getClassType(cls: ClassSlot): string {
    if (cls.data.Lab) return '🔬 Lab';
    if (cls.data.Tut) return '📝 Tutorial';
    if (cls.data.elective) return '📚 Elective';
    return '📖 Lecture';
}

// ─── Schedule Notifications ───────────────────────────────────────────────────

/**
 * Schedule notifications for a class:
 * - 10 minutes before class starts
 * - When class starts
 */
export async function scheduleClassNotification(
    cls: ClassSlot,
    dayOffset: number = 0 // 0 = today, 1 = tomorrow, etc.
): Promise<string[]> {
    const scheduledIds: string[] = [];
    const subject = getSubjectName(cls);
    const room = getRoomName(cls);
    const classType = getClassType(cls);
    const time = cls.timeOfClass;
    const endTime = getEndTime(time);

    const now = new Date();
    const [hours, minutes] = time.split(':').map(Number);

    // Calculate the exact date/time for the class
    const classDate = new Date(now);
    classDate.setDate(classDate.getDate() + dayOffset);
    classDate.setHours(hours, minutes, 0, 0);

    // 10 minutes before
    const reminderDate = new Date(classDate);
    reminderDate.setMinutes(reminderDate.getMinutes() - 10);

    // Only schedule if the time is in the future
    if (reminderDate > now) {
        const reminderId = await Notifications.scheduleNotificationAsync({
            content: {
                title: '⏰ Class in 10 minutes!',
                body: `${subject} starts at ${time}\n${classType} ${room ? `• Room: ${room}` : ''}`,
                data: { type: 'reminder', classTime: time, subject },
                sound: true,
            },
            trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DATE,
                date: reminderDate,
                channelId: Platform.OS === 'android' ? 'class-notifications' : undefined,
            },
        });
        scheduledIds.push(reminderId);
    }

    // At class start time
    if (classDate > now) {
        const startId = await Notifications.scheduleNotificationAsync({
            content: {
                title: '🔔 Class Starting Now!',
                body: `${subject} (${time} - ${endTime})\n${classType} ${room ? `• Room: ${room}` : ''}`,
                data: { type: 'start', classTime: time, subject },
                sound: true,
            },
            trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DATE,
                date: classDate,
                channelId: Platform.OS === 'android' ? 'class-notifications' : undefined,
            },
        });
        scheduledIds.push(startId);
    }

    return scheduledIds;
}

/**
 * Schedule notifications for all classes in a day
 */
export async function scheduleDayNotifications(
    classes: ClassSlot[],
    day: string,
    dayOffset: number = 0
): Promise<string[]> {
    const allIds: string[] = [];

    // Filter classes for the specific day, excluding free classes
    const dayClasses = classes.filter(
        (cls) => cls.dayOfClass === day && !cls.data.freeClass
    );

    for (const cls of dayClasses) {
        const ids = await scheduleClassNotification(cls, dayOffset);
        allIds.push(...ids);
    }

    console.log(`Scheduled ${allIds.length} notifications for ${day}`);
    return allIds;
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllClassNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('All class notifications cancelled');
}

/**
 * Get all scheduled notifications
 */
export async function getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    return await Notifications.getAllScheduledNotificationsAsync();
}

/**
 * Add notification response listener
 */
export function addNotificationResponseListener(
    callback: (response: Notifications.NotificationResponse) => void
): Notifications.Subscription {
    return Notifications.addNotificationResponseReceivedListener(callback);
}

/**
 * Add notification received listener (when app is in foreground)
 */
export function addNotificationReceivedListener(
    callback: (notification: Notifications.Notification) => void
): Notifications.Subscription {
    return Notifications.addNotificationReceivedListener(callback);
}

// ─── Notification Badge ───────────────────────────────────────────────────────
export async function setBadgeCount(count: number): Promise<void> {
    await Notifications.setBadgeCountAsync(count);
}

export async function clearBadge(): Promise<void> {
    await Notifications.setBadgeCountAsync(0);
}
