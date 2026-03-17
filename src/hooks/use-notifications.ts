// ─── useNotifications Hook ────────────────────────────────────────────────────
// Manages class notifications scheduling and permissions
// NOTE: expo-notifications is not available in Expo Go (SDK 53+).
// We dynamically require it only when needed to avoid module-level errors.

import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import { WEEK_DAYS } from '../constants/theme';
import { useProfile } from '../context/profile-context';
import { ClassSlot, TimetableJson } from '../types';
import { registerServiceWorker } from '../utils/web-notifications';

// ─── Lazy load expo-notifications only when needed ─────────────────────────────
function getNotificationsModule() {
    if (Platform.OS === 'web') return null;
    try {
        return require('expo-notifications');
    } catch {
        return null;
    }
}

// ─── Web Notification Helpers ─────────────────────────────────────────────────
function canUseWebNotifications(): boolean {
    return Platform.OS === 'web' && typeof window !== 'undefined' && 'Notification' in window;
}

async function requestWebNotificationPermission(): Promise<boolean> {
    if (!canUseWebNotifications()) return false;

    if (window.Notification.permission === 'granted') {
        return true;
    }

    if (window.Notification.permission !== 'denied') {
        const permission = await window.Notification.requestPermission();
        return permission === 'granted';
    }

    return false;
}

interface ScheduledWebNotification {
    id: string;
    timeoutId: NodeJS.Timeout;
}

const webNotificationTimeouts = new Map<string, ScheduledWebNotification>();
let webNotificationCounter = 0;

async function scheduleWebNotification(subject: string, body: string, scheduledTime: Date): Promise<string> {
    if (!canUseWebNotifications()) return '';

    const now = new Date();
    const delay = scheduledTime.getTime() - now.getTime();

    if (delay <= 0) return '';

    const id = `web-notif-${++webNotificationCounter}`;

    const timeoutId = setTimeout(() => {
        try {
            new window.Notification(subject, {
                body,
                icon: '/favicon.ico',
                badge: '/favicon.ico',
                tag: `class-notification`,
                requireInteraction: true,
            });
            webNotificationTimeouts.delete(id);
        } catch (e) {
            console.error('Error showing web notification:', e);
        }
    }, delay);

    webNotificationTimeouts.set(id, { id, timeoutId });
    return id;
}

function cancelWebNotification(id: string): void {
    const scheduled = webNotificationTimeouts.get(id);
    if (scheduled) {
        clearTimeout(scheduled.timeoutId);
        webNotificationTimeouts.delete(id);
    }
}

function cancelAllWebNotifications(): void {
    webNotificationTimeouts.forEach(({ timeoutId }) => clearTimeout(timeoutId));
    webNotificationTimeouts.clear();
}

// Type definitions for expo-notifications
interface NotificationResponse {
    notification: {
        request: {
            content: Record<string, any>;
        };
    };
}

interface Notification {
    request: {
        content: Record<string, any>;
    };
}

export interface UseNotificationsResult {
    permissionGranted: boolean;
    notificationsEnabled: boolean;
    scheduledCount: number;
    enableNotifications: () => Promise<boolean>;
    disableNotifications: () => Promise<void>;
    refreshNotifications: () => Promise<void>;
    loading: boolean;
    error: string | null;
}

function getCurrentDay(): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = days[new Date().getDay()];
    return (WEEK_DAYS as readonly string[]).includes(today) ? today : 'Monday';
}

// ─── Request Permissions ──────────────────────────────────────────────────────
async function requestNotificationPermissions(): Promise<boolean> {
    const Notifications = getNotificationsModule();
    if (!Notifications) return false;

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

// ─── Schedule Notification ────────────────────────────────────────────────────
function getEndTime(time: string): string {
    const [h, m] = time.split(':').map(Number);
    const total = h * 60 + m + 60;
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

async function scheduleClassNotification(cls: ClassSlot, dayOffset: number = 0): Promise<string[]> {
    // Handle web notifications
    if (canUseWebNotifications()) {
        if (window.Notification.permission !== 'granted') return [];

        const scheduledIds: string[] = [];
        const subject = getSubjectName(cls);
        const room = getRoomName(cls);
        const classType = getClassType(cls);
        const time = cls.timeOfClass;
        const endTime = getEndTime(time);

        const now = new Date();
        const [hours, minutes] = time.split(':').map(Number);

        const classDate = new Date(now);
        classDate.setDate(classDate.getDate() + dayOffset);
        classDate.setHours(hours, minutes, 0, 0);

        const reminderDate = new Date(classDate);
        reminderDate.setMinutes(reminderDate.getMinutes() - 10);

        if (reminderDate > now) {
            try {
                const reminderId = await scheduleWebNotification(
                    '⏰ Class in 10 minutes!',
                    `${subject} starts at ${time}\n${classType} ${room ? `• Room: ${room}` : ''}`,
                    reminderDate
                );
                if (reminderId) scheduledIds.push(reminderId);
            } catch (e) {
                console.error('Error scheduling reminder web notification:', e);
            }
        }

        if (classDate > now) {
            try {
                const startId = await scheduleWebNotification(
                    '🔔 Class Starting Now!',
                    `${subject} (${time} - ${endTime})\n${classType} ${room ? `• Room: ${room}` : ''}`,
                    classDate
                );
                if (startId) scheduledIds.push(startId);
            } catch (e) {
                console.error('Error scheduling start web notification:', e);
            }
        }

        return scheduledIds;
    }

    // Handle native (iOS/Android) notifications
    const Notifications = getNotificationsModule();
    if (!Notifications) return [];
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
        try {
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
                },
            });
            scheduledIds.push(reminderId);
        } catch (e) {
            console.error('Error scheduling reminder notification:', e);
        }
    }

    // At class start time
    if (classDate > now) {
        try {
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
                },
            });
            scheduledIds.push(startId);
        } catch (e) {
            console.error('Error scheduling start notification:', e);
        }
    }

    return scheduledIds;
}

async function scheduleDayNotifications(classes: ClassSlot[], day: string, dayOffset: number = 0): Promise<string[]> {
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

// ─── Main Hook ────────────────────────────────────────────────────────────────
export function useNotifications(): UseNotificationsResult {
    const { profile, hasProfile, getTimetableFile, loading: profileLoading } = useProfile();

    const [permissionGranted, setPermissionGranted] = useState(false);
    const [notificationsEnabled, setNotificationsEnabled] = useState(false);
    const [scheduledCount, setScheduledCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const appState = useRef(AppState.currentState);

    // Check permissions on mount
    useEffect(() => {
        (async () => {
            try {
                let granted = false;

                if (Platform.OS === 'web') {
                    // Register service worker for web
                    await registerServiceWorker();
                    granted = await requestWebNotificationPermission();
                } else {
                    const Notifications = getNotificationsModule();
                    if (Notifications) {
                        granted = await requestNotificationPermissions();
                    }
                }

                setPermissionGranted(granted);
                if (granted) {
                    setNotificationsEnabled(true);
                }
            } catch (e) {
                console.error('Error checking notification permissions:', e);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    // Setup notification listeners
    useEffect(() => {
        if (Platform.OS === 'web') return;

        const Notifications = getNotificationsModule();
        if (!Notifications) return;

        const responseSubscription = Notifications.addNotificationResponseReceivedListener((response: NotificationResponse) => {
            console.log('Notification tapped:', response.notification.request.content);
            // Handle navigation when notification is tapped
        });

        const receivedSubscription = Notifications.addNotificationReceivedListener((notification: Notification) => {
            console.log('Notification received:', notification.request.content);
        });

        return () => {
            responseSubscription.remove();
            receivedSubscription.remove();
        };
    }, []);

    // Schedule notifications for today's classes
    const scheduleNotifications = useCallback(async () => {
        if (!hasProfile || !profile?.group) return;

        const day = new Date().getDay();
        const isWeekend = day === 0 || day === 6;
        if (isWeekend) return;

        try {
            setLoading(true);
            setError(null);

            // Cancel existing notifications first
            if (Platform.OS === 'web') {
                cancelAllWebNotifications();
            } else {
                const Notifications = getNotificationsModule();
                if (!Notifications) return;
                await Notifications.cancelAllScheduledNotificationsAsync();
            }

            // Fetch timetable
            const file = getTimetableFile();
            const resp = await fetch(`/${file}`);
            if (!resp.ok) throw new Error(`Failed to load timetable`);

            const json: TimetableJson = await resp.json();
            const groupData = json.timetable?.[profile.group];

            if (!groupData) {
                setError(`No timetable for group ${profile.group}`);
                return;
            }

            const currentDay = getCurrentDay();
            const ids = await scheduleDayNotifications(groupData.classes, currentDay, 0);
            setScheduledCount(ids.length);

        } catch (e) {
            console.error('Error scheduling notifications:', e);
            setError(String(e));
        } finally {
            setLoading(false);
        }
    }, [hasProfile, profile, getTimetableFile]);

    // Re-schedule notifications when app comes to foreground
    useEffect(() => {
        if (Platform.OS === 'web') return;

        const Notifications = getNotificationsModule();
        if (!Notifications) return;

        const subscription = AppState.addEventListener('change', async (nextAppState: AppStateStatus) => {
            if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
                // App has come to the foreground
                if (notificationsEnabled && hasProfile) {
                    await scheduleNotifications();
                }
            }
            appState.current = nextAppState;
        });

        return () => subscription.remove();
    }, [notificationsEnabled, hasProfile, profile, scheduleNotifications]);

    // Enable notifications
    const enableNotifications = useCallback(async (): Promise<boolean> => {
        try {
            let granted = false;

            if (Platform.OS === 'web') {
                granted = await requestWebNotificationPermission();
            } else {
                const Notifications = getNotificationsModule();
                if (!Notifications) return false;
                granted = await requestNotificationPermissions();
            }

            setPermissionGranted(granted);

            if (granted) {
                setNotificationsEnabled(true);
                await scheduleNotifications();
                return true;
            }
            return false;
        } catch (e) {
            console.error('Error enabling notifications:', e);
            return false;
        }
    }, [scheduleNotifications]);

    // Disable notifications
    const disableNotifications = useCallback(async (): Promise<void> => {
        if (Platform.OS === 'web') {
            cancelAllWebNotifications();
        } else {
            const Notifications = getNotificationsModule();
            if (Notifications) {
                await Notifications.cancelAllScheduledNotificationsAsync();
            }
        }
        setNotificationsEnabled(false);
        setScheduledCount(0);
    }, []);

    // Auto-schedule when profile is ready
    useEffect(() => {
        if (!profileLoading && hasProfile && notificationsEnabled && permissionGranted) {
            scheduleNotifications();
        }
    }, [profileLoading, hasProfile, notificationsEnabled, permissionGranted, scheduleNotifications]);

    return {
        permissionGranted,
        notificationsEnabled,
        scheduledCount,
        enableNotifications,
        disableNotifications,
        refreshNotifications: scheduleNotifications,
        loading,
        error,
    };
}
