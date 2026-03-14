// ─── Permission Service ───────────────────────────────────────────────────────
// Handles requesting notifications and location permissions after login/registration

import * as Notifications from 'expo-notifications';
import { Alert, Platform } from 'react-native';

// Import expo-location only on native platforms
let Location: any = null;
if (Platform.OS !== 'web') {
    try {
        Location = require('expo-location');
    } catch (e) {
        console.warn('expo-location not available on this platform');
    }
}

// ─── Web Notification Helper ──────────────────────────────────────────────────
function requestWebNotificationPermission(): Promise<boolean> {
    return new Promise((resolve) => {
        if (typeof window === 'undefined' || !('Notification' in window)) {
            // Not a web environment or notifications not supported
            resolve(false);
            return;
        }

        if (Notification.permission === 'granted') {
            resolve(true);
            return;
        }

        if (Notification.permission !== 'denied') {
            Notification.requestPermission().then((permission) => {
                resolve(permission === 'granted');
            }).catch(() => resolve(false));
        } else {
            resolve(false);
        }
    });
}

// ─── Request Notification Permission ──────────────────────────────────────────
export async function requestNotificationPermissionWithAlert(): Promise<boolean> {
    return new Promise((resolve) => {
        Alert.alert(
            'Enable Notifications',
            'Get notified about your upcoming classes and important updates',
            [
                {
                    text: 'Not Now',
                    onPress: () => resolve(false),
                    style: 'cancel',
                },
                {
                    text: 'Allow',
                    onPress: async () => {
                        try {
                            // Check if running on web
                            if (Platform.OS === 'web') {
                                const webGranted = await requestWebNotificationPermission();
                                resolve(webGranted);
                            } else {
                                // Native mobile (iOS, Android)
                                const { status } = await Notifications.requestPermissionsAsync();
                                const granted = status === 'granted';
                                if (granted && Platform.OS === 'android') {
                                    await Notifications.setNotificationChannelAsync('class-notifications', {
                                        name: 'Class Notifications',
                                        description: 'Notifications for upcoming classes',
                                        importance: Notifications.AndroidImportance.HIGH,
                                        vibrationPattern: [0, 250, 250, 250],
                                        lightColor: '#6C63FF',
                                        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
                                    });
                                }
                                resolve(granted);
                            }
                        } catch (e) {
                            console.error('Error requesting notification permission:', e);
                            resolve(false);
                        }
                    },
                    style: 'default',
                },
            ]
        );
    });
}

// ─── Request Location Permission ──────────────────────────────────────────────
export async function requestLocationPermissionWithAlert(): Promise<boolean> {
    return new Promise((resolve) => {
        Alert.alert(
            'Enable Location Access',
            'Allow access to your location to provide location-based features and nearby information',
            [
                {
                    text: 'Not Now',
                    onPress: () => resolve(false),
                    style: 'cancel',
                },
                {
                    text: 'Allow',
                    onPress: async () => {
                        try {
                            // Check if running on web
                            if (Platform.OS === 'web') {
                                // Request geolocation on web
                                if ('geolocation' in navigator) {
                                    navigator.geolocation.getCurrentPosition(
                                        () => resolve(true),
                                        () => resolve(false)
                                    );
                                } else {
                                    resolve(false);
                                }
                            } else if (Location) {
                                // Native mobile (iOS, Android) with expo-location available
                                const { status } = await Location.requestForegroundPermissionsAsync();
                                const granted = status === 'granted';
                                resolve(granted);
                            } else {
                                // expo-location not available
                                resolve(false);
                            }
                        } catch (e) {
                            console.error('Error requesting location permission:', e);
                            resolve(false);
                        }
                    },
                    style: 'default',
                },
            ]
        );
    });
}

// ─── Request All Permissions ──────────────────────────────────────────────────
// This will sequentially request both notification and location permissions
export async function requestAllPermissionsSequentially(): Promise<{
    notifications: boolean;
    location: boolean;
}> {
    // Request notifications first
    const notificationGranted = await requestNotificationPermissionWithAlert();

    // Wait a moment before requesting location
    await new Promise(resolve => setTimeout(resolve, 500));

    // Then request location
    const locationGranted = await requestLocationPermissionWithAlert();

    return {
        notifications: notificationGranted,
        location: locationGranted,
    };
}

// ─── Check if Permission is Granted (without requesting) ──────────────────────
export async function checkNotificationPermission(): Promise<boolean> {
    try {
        if (Platform.OS === 'web') {
            return typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted';
        } else {
            const { status } = await Notifications.getPermissionsAsync();
            return status === 'granted';
        }
    } catch (e) {
        console.error('Error checking notification permission:', e);
        return false;
    }
}

export async function checkLocationPermission(): Promise<boolean> {
    try {
        if (Platform.OS === 'web') {
            return false; // Web doesn't have a direct way to check without requesting
        } else if (Location) {
            const { status } = await Location.getForegroundPermissionsAsync();
            return status === 'granted';
        } else {
            return false;
        }
    } catch (e) {
        console.error('Error checking location permission:', e);
        return false;
    }
}
