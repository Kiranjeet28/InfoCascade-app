// ─── useNotificationsWithPreferences Hook ─────────────────────────────────
// Enhanced hook that integrates notification preferences with scheduling

import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import { WEEK_DAYS } from '../constants/theme';
import { useNotificationPreferences } from '../context/notification-preferences-context';
import { useProfile } from '../context/profile-context';
import { scheduleDayNotifications } from '../services/notification-service';
import { TimetableJson } from '../types';

function getNotificationsModule() {
    if (Platform.OS === 'web') return null;
    try {
        return require('expo-notifications');
    } catch {
        return null;
    }
}

export interface UseNotificationsWithPreferencesResult {
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

export function useNotificationsWithPreferences(): UseNotificationsWithPreferencesResult {
    const { profile, hasProfile, getTimetableFile, loading: profileLoading } = useProfile();
    const { preferences } = useNotificationPreferences();

    const [permissionGranted, setPermissionGranted] = useState(false);
    const [notificationsEnabled, setNotificationsEnabled] = useState(false);
    const [scheduledCount, setScheduledCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const appState = useRef(AppState.currentState);

    // Check permissions on mount
    useEffect(() => {
        if (Platform.OS === 'web') {
            setLoading(false);
            return;
        }

        const Notifications = getNotificationsModule();
        if (!Notifications) {
            setLoading(false);
            return;
        }

        (async () => {
            try {
                const granted = await requestNotificationPermissions();
                setPermissionGranted(granted);
                if (granted) {
                    setNotificationsEnabled(true);
                }
                setError(null);
            } catch (e) {
                console.error('Error checking notification permissions:', e);
                setError('Failed to check permissions');
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

        const responseSubscription = Notifications.addNotificationResponseReceivedListener((response: any) => {
            console.log('Notification tapped:', response.notification.request.content);
        });

        const receivedSubscription = Notifications.addNotificationReceivedListener((notification: any) => {
            console.log('Notification received:', notification.request.content);
        });

        return () => {
            responseSubscription.remove();
            receivedSubscription.remove();
        };
    }, []);

    // Schedule notifications with preferences
    const scheduleNotifications = useCallback(async () => {
        if (Platform.OS === 'web') return;

        const Notifications = getNotificationsModule();
        if (!Notifications) return;

        try {
            // Cancel existing notifications
            await Notifications.cancelAllScheduledNotificationsAsync();

            if (!hasProfile || !profile) {
                setScheduledCount(0);
                return;
            }

            const currentDay = getCurrentDay();
            const timetableFile = getTimetableFile();
            if (!timetableFile) {
                setScheduledCount(0);
                return;
            }

            try {
                const GITHUB_RAW_URL = 'https://raw.githubusercontent.com/Kiranjeet28/infocascade-data/main/web';
                const res = await fetch(`${GITHUB_RAW_URL}/${timetableFile}`);
                if (!res.ok) throw new Error(`Failed to fetch timetable: ${res.status}`);
                const timetableData: TimetableJson = await res.json();
                const groupTimetable = timetableData.timetable?.[profile.group];
                const allClasses = groupTimetable?.classes || [];

                let totalScheduled = 0;

                // Schedule for today
                const todayIds = await scheduleDayNotifications(
                    allClasses,
                    currentDay,
                    0,
                    preferences
                );
                totalScheduled += todayIds.length;

                // Schedule for tomorrow if it's a weekday
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                const tomorrowDayIndex = tomorrow.getDay();
                const tomorrowDayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][tomorrowDayIndex];

                if ((WEEK_DAYS as readonly string[]).includes(tomorrowDayName)) {
                    const tomorrowIds = await scheduleDayNotifications(
                        allClasses,
                        tomorrowDayName,
                        1,
                        preferences
                    );
                    totalScheduled += tomorrowIds.length;
                }

                setScheduledCount(totalScheduled);
                setError(null);
            } catch (e) {
                console.warn('Error loading timetable for notifications:', e);
                setScheduledCount(0);
            }
        } catch (e) {
            console.error('Error scheduling notifications:', e);
            setError('Failed to schedule notifications');
            setScheduledCount(0);
        }
    }, [notificationsEnabled, hasProfile, profile, preferences, getTimetableFile]);

    // Enable notifications
    const enableNotifications = useCallback(async (): Promise<boolean> => {
        if (Platform.OS === 'web') return false;

        const Notifications = getNotificationsModule();
        if (!Notifications) return false;

        try {
            const granted = await requestNotificationPermissions();
            setPermissionGranted(granted);

            if (granted) {
                setNotificationsEnabled(true);
                await scheduleNotifications();
                return true;
            }
            return false;
        } catch (e) {
            console.error('Error enabling notifications:', e);
            setError('Failed to enable notifications');
            return false;
        }
    }, [scheduleNotifications]);

    // Disable notifications
    const disableNotifications = useCallback(async (): Promise<void> => {
        if (Platform.OS === 'web') return;

        const Notifications = getNotificationsModule();
        if (!Notifications) return;

        await Notifications.cancelAllScheduledNotificationsAsync();
        setNotificationsEnabled(false);
        setScheduledCount(0);
    }, []);

    // Handle app state changes
    useEffect(() => {
        const subscription = AppState.addEventListener('change', handleAppStateChange);

        return () => {
            subscription.remove();
        };
    }, []);

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
        if (
            appState.current.match(/inactive|background/) &&
            nextAppState === 'active' &&
            notificationsEnabled &&
            hasProfile
        ) {
            scheduleNotifications();
        }

        appState.current = nextAppState;
    };

    // Auto-schedule when profile or preferences change
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
