// ─── In-App Notification Toast ────────────────────────────────────────────────
// Shows notifications as in-app toasts (works in Expo Go)

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Animated, Platform, Text, TouchableOpacity, View } from 'react-native';
import { useThemeColors } from '../context/theme-context';

export interface InAppNotification {
    id: string;
    title: string;
    body: string;
    type: 'reminder' | 'start' | 'info';
    timestamp: Date;
}

interface NotificationContextType {
    notifications: InAppNotification[];
    showNotification: (notification: Omit<InAppNotification, 'id' | 'timestamp'>) => void;
    dismissNotification: (id: string) => void;
    clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType>({
    notifications: [],
    showNotification: () => { },
    dismissNotification: () => { },
    clearAll: () => { },
});

export function useInAppNotifications() {
    return useContext(NotificationContext);
}

// ─── Toast Component ──────────────────────────────────────────────────────────
function NotificationToast({
    notification,
    onDismiss
}: {
    notification: InAppNotification;
    onDismiss: () => void;
}) {
    const { colors } = useThemeColors();
    const slideAnim = useRef(new Animated.Value(-100)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Slide in
        Animated.parallel([
            Animated.spring(slideAnim, {
                toValue: 0,
                tension: 100,
                friction: 10,
                useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start();

        // Auto dismiss after 5 seconds
        const timer = setTimeout(() => {
            dismissWithAnimation();
        }, 5000);

        return () => clearTimeout(timer);
    }, []);

    const dismissWithAnimation = () => {
        Animated.parallel([
            Animated.timing(slideAnim, {
                toValue: -100,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start(() => onDismiss());
    };

    const bgColor = notification.type === 'reminder'
        ? colors.accent
        : notification.type === 'start'
            ? colors.primary
            : colors.surface;

    const icon = notification.type === 'reminder' ? '⏰' : notification.type === 'start' ? '🔔' : 'ℹ️';

    return (
        <Animated.View
            style={{
                transform: [{ translateY: slideAnim }],
                opacity: opacityAnim,
                marginBottom: 8,
            }}
        >
            <TouchableOpacity
                activeOpacity={0.9}
                onPress={dismissWithAnimation}
                style={{
                    backgroundColor: bgColor,
                    borderRadius: 16,
                    padding: 16,
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    gap: 12,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    elevation: 8,
                }}
            >
                <Text style={{ fontSize: 24 }}>{icon}</Text>
                <View style={{ flex: 1 }}>
                    <Text style={{
                        fontSize: 15,
                        fontWeight: '700',
                        color: '#fff',
                        marginBottom: 4,
                    }}>
                        {notification.title}
                    </Text>
                    <Text style={{
                        fontSize: 13,
                        color: 'rgba(255,255,255,0.9)',
                        lineHeight: 18,
                    }}>
                        {notification.body}
                    </Text>
                </View>
                <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>✕</Text>
            </TouchableOpacity>
        </Animated.View>
    );
}

// ─── Provider Component ───────────────────────────────────────────────────────
export function InAppNotificationProvider({ children }: { children: React.ReactNode }) {
    const [notifications, setNotifications] = useState<InAppNotification[]>([]);

    const showNotification = useCallback((notification: Omit<InAppNotification, 'id' | 'timestamp'>) => {
        const newNotification: InAppNotification = {
            ...notification,
            id: Math.random().toString(36).substr(2, 9),
            timestamp: new Date(),
        };
        setNotifications(prev => [newNotification, ...prev].slice(0, 3)); // Max 3 visible
    }, []);

    const dismissNotification = useCallback((id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    }, []);

    const clearAll = useCallback(() => {
        setNotifications([]);
    }, []);

    return (
        <NotificationContext.Provider value={{ notifications, showNotification, dismissNotification, clearAll }}>
            {children}
            {/* Notification Toast Container */}
            <View
                style={{
                    position: 'absolute',
                    top: Platform.OS === 'ios' ? 50 : 40,
                    left: 16,
                    right: 16,
                    zIndex: 9999,
                }}
                pointerEvents="box-none"
            >
                {notifications.map(notification => (
                    <NotificationToast
                        key={notification.id}
                        notification={notification}
                        onDismiss={() => dismissNotification(notification.id)}
                    />
                ))}
            </View>
        </NotificationContext.Provider>
    );
}
