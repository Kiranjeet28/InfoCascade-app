// ─── Notification Preferences Context ─────────────────────────────────────
// Manages user notification preferences (sound, vibration, timing, etc.)

import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';

export interface NotificationPreferences {
    soundEnabled: boolean;
    vibrationEnabled: boolean;
    reminderTime: 10 | 15 | 30; // minutes before class
    notifyOnClassStart: boolean;
    doNotDisturbEnabled: boolean;
    doNotDisturbStart?: string; // HH:MM format
    doNotDisturbEnd?: string; // HH:MM format
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
    soundEnabled: true,
    vibrationEnabled: true,
    reminderTime: 10,
    notifyOnClassStart: true,
    doNotDisturbEnabled: false,
};

interface NotificationPreferencesContextType {
    preferences: NotificationPreferences;
    updatePreferences: (updates: Partial<NotificationPreferences>) => Promise<void>;
    loading: boolean;
    error: string | null;
}

const NotificationPreferencesContext = createContext<NotificationPreferencesContextType | undefined>(undefined);

export function useNotificationPreferences() {
    const context = useContext(NotificationPreferencesContext);
    if (!context) {
        throw new Error('useNotificationPreferences must be used within NotificationPreferencesProvider');
    }
    return context;
}

export function NotificationPreferencesProvider({ children }: { children: React.ReactNode }) {
    const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFERENCES);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Load preferences from AsyncStorage on mount
    useEffect(() => {
        loadPreferences();
    }, []);

    const loadPreferences = async () => {
        try {
            setLoading(true);
            const stored = await AsyncStorage.getItem('notificationPreferences');
            if (stored) {
                const parsed = JSON.parse(stored);
                setPreferences({ ...DEFAULT_PREFERENCES, ...parsed });
            }
            setError(null);
        } catch (e) {
            console.error('Error loading notification preferences:', e);
            setError('Failed to load preferences');
            setPreferences(DEFAULT_PREFERENCES);
        } finally {
            setLoading(false);
        }
    };

    const updatePreferences = async (updates: Partial<NotificationPreferences>) => {
        try {
            const newPreferences = { ...preferences, ...updates };
            setPreferences(newPreferences);
            await AsyncStorage.setItem('notificationPreferences', JSON.stringify(newPreferences));
            setError(null);
        } catch (e) {
            console.error('Error updating notification preferences:', e);
            setError('Failed to save preferences');
            setPreferences(preferences); // Revert on error
        }
    };

    return (
        <NotificationPreferencesContext.Provider value={{ preferences, updatePreferences, loading, error }}>
            {children}
        </NotificationPreferencesContext.Provider>
    );
}
