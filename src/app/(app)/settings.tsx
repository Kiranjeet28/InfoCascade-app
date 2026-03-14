import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import {
    Alert,
    Animated,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    Switch,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import AppIcon from '../../components/app-icon';
import BackButton from '../../components/layout/back-button';
import BgBlobs from '../../components/layout/bg-blobs';
import Badge from '../../components/ui/badge';
import { useNotificationPreferences } from '../../context/notification-preferences-context';
import { useProfile } from '../../context/profile-context';
import { useThemeColors } from '../../context/theme-context';
import { checkNotificationPermission, requestNotificationPermissionWithAlert } from '../../services/permission-service';
import { clearSession } from '../../utils/auth-cache';

export default function SettingsScreen() {
    const router = useRouter();
    const { colors, isDark } = useThemeColors();
    const { clearProfile } = useProfile();
    const { preferences, updatePreferences, loading: prefLoading } = useNotificationPreferences();

    const [notificationsEnabled, setNotificationsEnabled] = useState(false);
    const [loadingNotif, setLoadingNotif] = useState(true);
    const [showReminderOptions, setShowReminderOptions] = useState(false);

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
            Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 9, useNativeDriver: true }),
        ]).start();
    }, []);

    // Check notification permission on mount
    useEffect(() => {
        checkNotificationPermission().then((granted) => {
            setNotificationsEnabled(granted);
            setLoadingNotif(false);
        });
    }, []);

    async function handleLogout() {
        Alert.alert(
            'Log Out',
            'Are you sure you want to log out?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Log Out',
                    style: 'destructive',
                    onPress: async () => {
                        await clearSession();
                        await clearProfile();
                        router.replace('/(auth)/login');
                    },
                },
            ]
        );
    }

    const handleNotificationToggle = async (value: boolean) => {
        if (value && !notificationsEnabled) {
            // Request permissions when turning on
            try {
                const granted = await requestNotificationPermissionWithAlert();
                setNotificationsEnabled(granted);
            } catch (e) {
                console.error('Error requesting notification permission:', e);
                Alert.alert('Error', 'Unable to enable notifications');
                setNotificationsEnabled(false);
            }
        } else {
            // Just toggle locally (can't disable system notifications programmatically)
            setNotificationsEnabled(value);
        }
    };

    const cardStyle = {
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: 16,
    };

    const settingItemStyle = {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        justifyContent: 'space-between' as const,
        paddingVertical: 12,
    };

    return (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <StatusBar style={isDark ? 'light' : 'dark'} />
            <ScrollView
                style={{ flex: 1, backgroundColor: colors.bg }}
                contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 56, paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                <BgBlobs />

                <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
                    <BackButton label="Home" onPress={() => router.push('/(app)/home')} />

                    {/* Header */}
                    <View style={{ marginBottom: 28 }}>
                        <Badge label="Settings" />
                        <Text
                            style={{
                                fontSize: 34,
                                fontWeight: '800',
                                color: colors.textPrimary,
                                letterSpacing: -1,
                                lineHeight: 38,
                                marginBottom: 10,
                            }}
                        >
                            Settings
                        </Text>
                        <Text style={{ fontSize: 14, color: colors.textSecondary }}>
                            Manage your app preferences and account
                        </Text>
                    </View>

                    {/* Notifications Section */}
                    <View style={cardStyle}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                            <AppIcon
                                family="MaterialCommunityIcons"
                                name="bell"
                                size={18}
                                color={colors.textPrimary}
                            />
                            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textPrimary }}>
                                Notifications
                            </Text>
                        </View>

                        <View
                            style={{
                                borderTopWidth: 1,
                                borderTopColor: colors.border,
                                paddingTop: 12,
                            }}
                        >
                            {/* Main toggle */}
                            <View style={settingItemStyle}>
                                <View>
                                    <Text
                                        style={{
                                            fontSize: 14,
                                            fontWeight: '600',
                                            color: colors.textPrimary,
                                            marginBottom: 4,
                                        }}
                                    >
                                        Class Notifications
                                    </Text>
                                    <Text
                                        style={{
                                            fontSize: 12,
                                            color: colors.textSecondary,
                                        }}
                                    >
                                        Get notified about your classes
                                    </Text>
                                </View>
                                {!loadingNotif && (
                                    <Switch
                                        value={notificationsEnabled}
                                        onValueChange={handleNotificationToggle}
                                        trackColor={{ false: colors.border, true: colors.primary + '60' }}
                                        thumbColor={notificationsEnabled ? colors.primary : colors.textMuted}
                                    />
                                )}
                            </View>

                            {/* Options (only show when notifications are enabled) */}
                            {notificationsEnabled && !prefLoading && (
                                <>
                                    {/* Divider */}
                                    <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 12 }} />

                                    {/* Sound Toggle */}
                                    <View style={settingItemStyle}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                            <AppIcon
                                                family="MaterialCommunityIcons"
                                                name="volume-high"
                                                size={16}
                                                color={colors.accent}
                                            />
                                            <View>
                                                <Text
                                                    style={{
                                                        fontSize: 14,
                                                        fontWeight: '600',
                                                        color: colors.textPrimary,
                                                    }}
                                                >
                                                    Sound
                                                </Text>
                                                <Text
                                                    style={{
                                                        fontSize: 11,
                                                        color: colors.textSecondary,
                                                        marginTop: 2,
                                                    }}
                                                >
                                                    Play sound with notifications
                                                </Text>
                                            </View>
                                        </View>
                                        <Switch
                                            value={preferences.soundEnabled}
                                            onValueChange={(value) =>
                                                updatePreferences({ soundEnabled: value })
                                            }
                                            trackColor={{ false: colors.border, true: colors.accent + '60' }}
                                            thumbColor={preferences.soundEnabled ? colors.accent : colors.textMuted}
                                        />
                                    </View>

                                    {/* Vibration Toggle */}
                                    <View style={settingItemStyle}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                            <AppIcon
                                                family="MaterialCommunityIcons"
                                                name="vibrate"
                                                size={16}
                                                color={colors.accent}
                                            />
                                            <View>
                                                <Text
                                                    style={{
                                                        fontSize: 14,
                                                        fontWeight: '600',
                                                        color: colors.textPrimary,
                                                    }}
                                                >
                                                    Vibration
                                                </Text>
                                                <Text
                                                    style={{
                                                        fontSize: 11,
                                                        color: colors.textSecondary,
                                                        marginTop: 2,
                                                    }}
                                                >
                                                    Vibrate on notification
                                                </Text>
                                            </View>
                                        </View>
                                        <Switch
                                            value={preferences.vibrationEnabled}
                                            onValueChange={(value) =>
                                                updatePreferences({ vibrationEnabled: value })
                                            }
                                            trackColor={{ false: colors.border, true: colors.accent + '60' }}
                                            thumbColor={preferences.vibrationEnabled ? colors.accent : colors.textMuted}
                                        />
                                    </View>

                                    {/* Reminder Time Selector */}
                                    <TouchableOpacity
                                        style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            paddingVertical: 12,
                                            borderTopWidth: 1,
                                            borderTopColor: colors.border,
                                            marginTop: 12,
                                        }}
                                        onPress={() => setShowReminderOptions(true)}
                                        activeOpacity={0.7}
                                    >
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                            <AppIcon
                                                family="MaterialCommunityIcons"
                                                name="clock-outline"
                                                size={16}
                                                color={colors.accent}
                                            />
                                            <View>
                                                <Text
                                                    style={{
                                                        fontSize: 14,
                                                        fontWeight: '600',
                                                        color: colors.textPrimary,
                                                    }}
                                                >
                                                    Reminder Time
                                                </Text>
                                                <Text
                                                    style={{
                                                        fontSize: 11,
                                                        color: colors.textSecondary,
                                                        marginTop: 2,
                                                    }}
                                                >
                                                    Minutes before class
                                                </Text>
                                            </View>
                                        </View>
                                        <View
                                            style={{
                                                backgroundColor: colors.primary + '20',
                                                paddingHorizontal: 12,
                                                paddingVertical: 6,
                                                borderRadius: 8,
                                                borderWidth: 1,
                                                borderColor: colors.primary + '40',
                                            }}
                                        >
                                            <Text
                                                style={{
                                                    fontSize: 13,
                                                    fontWeight: '700',
                                                    color: colors.primary,
                                                }}
                                            >
                                                {preferences.reminderTime}m
                                            </Text>
                                        </View>
                                    </TouchableOpacity>

                                    {/* Notify on class start */}
                                    <View style={settingItemStyle}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                            <AppIcon
                                                family="MaterialCommunityIcons"
                                                name="play-circle-outline"
                                                size={16}
                                                color={colors.accent}
                                            />
                                            <View>
                                                <Text
                                                    style={{
                                                        fontSize: 14,
                                                        fontWeight: '600',
                                                        color: colors.textPrimary,
                                                    }}
                                                >
                                                    Class Start Alert
                                                </Text>
                                                <Text
                                                    style={{
                                                        fontSize: 11,
                                                        color: colors.textSecondary,
                                                        marginTop: 2,
                                                    }}
                                                >
                                                    When class begins
                                                </Text>
                                            </View>
                                        </View>
                                        <Switch
                                            value={preferences.notifyOnClassStart}
                                            onValueChange={(value) =>
                                                updatePreferences({ notifyOnClassStart: value })
                                            }
                                            trackColor={{ false: colors.border, true: colors.accent + '60' }}
                                            thumbColor={preferences.notifyOnClassStart ? colors.accent : colors.textMuted}
                                        />
                                    </View>
                                </>
                            )}
                        </View>
                    </View>

                    {/* Account Section */}
                    <View style={cardStyle}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                            <AppIcon
                                family="MaterialCommunityIcons"
                                name="account"
                                size={18}
                                color={colors.textPrimary}
                            />
                            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textPrimary }}>
                                Account
                            </Text>
                        </View>

                        <View
                            style={{
                                borderTopWidth: 1,
                                borderTopColor: colors.border,
                            }}
                        >
                            {/* Logout button */}
                            <TouchableOpacity
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    paddingVertical: 14,
                                }}
                                onPress={handleLogout}
                                activeOpacity={0.7}
                            >
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                    <AppIcon
                                        family="MaterialCommunityIcons"
                                        name="logout"
                                        size={18}
                                        color={colors.error}
                                    />
                                    <Text
                                        style={{
                                            fontSize: 15,
                                            fontWeight: '600',
                                            color: colors.error,
                                        }}
                                    >
                                        Log Out
                                    </Text>
                                </View>
                                <AppIcon
                                    family="MaterialCommunityIcons"
                                    name="chevron-right"
                                    size={20}
                                    color={colors.error}
                                />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* About Section */}
                    <View style={cardStyle}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                            <AppIcon
                                family="MaterialCommunityIcons"
                                name="information"
                                size={18}
                                color={colors.textPrimary}
                            />
                            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textPrimary }}>
                                About
                            </Text>
                        </View>

                        <View
                            style={{
                                borderTopWidth: 1,
                                borderTopColor: colors.border,
                                paddingTop: 12,
                            }}
                        >
                            <View style={{ marginBottom: 12 }}>
                                <Text
                                    style={{
                                        fontSize: 12,
                                        color: colors.textMuted,
                                        textTransform: 'uppercase',
                                        letterSpacing: 0.5,
                                        fontWeight: '600',
                                    }}
                                >
                                    App Version
                                </Text>
                                <Text
                                    style={{
                                        fontSize: 14,
                                        fontWeight: '600',
                                        color: colors.textPrimary,
                                        marginTop: 4,
                                    }}
                                >
                                    1.0.0
                                </Text>
                            </View>
                        </View>
                    </View>
                </Animated.View>
            </ScrollView>

            {/* Reminder Time Modal */}
            <Modal
                visible={showReminderOptions}
                transparent
                animationType="fade"
                onRequestClose={() => setShowReminderOptions(false)}
            >
                <TouchableOpacity
                    style={{
                        flex: 1,
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        justifyContent: 'flex-end',
                    }}
                    activeOpacity={1}
                    onPress={() => setShowReminderOptions(false)}
                >
                    <View
                        style={{
                            backgroundColor: colors.surface,
                            borderTopLeftRadius: 20,
                            borderTopRightRadius: 20,
                            padding: 24,
                            maxHeight: '50%',
                        }}
                        onStartShouldSetResponder={() => true}
                    >
                        <View
                            style={{
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: 20,
                            }}
                        >
                            <Text
                                style={{
                                    fontSize: 18,
                                    fontWeight: '700',
                                    color: colors.textPrimary,
                                }}
                            >
                                Reminder Time
                            </Text>
                            <TouchableOpacity onPress={() => setShowReminderOptions(false)}>
                                <AppIcon
                                    family="MaterialCommunityIcons"
                                    name="close"
                                    size={24}
                                    color={colors.textSecondary}
                                />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 200 }}>
                            {[10, 15, 30].map((time) => (
                                <TouchableOpacity
                                    key={time}
                                    style={{
                                        paddingVertical: 14,
                                        paddingHorizontal: 16,
                                        borderRadius: 12,
                                        marginBottom: 8,
                                        backgroundColor:
                                            preferences.reminderTime === time
                                                ? colors.primary + '20'
                                                : colors.bg,
                                        borderWidth: preferences.reminderTime === time ? 2 : 1,
                                        borderColor:
                                            preferences.reminderTime === time ? colors.primary : colors.border,
                                    }}
                                    onPress={() => {
                                        updatePreferences({ reminderTime: time as 10 | 15 | 30 });
                                        setShowReminderOptions(false);
                                    }}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                        <View
                                            style={{
                                                width: 20,
                                                height: 20,
                                                borderRadius: 10,
                                                borderWidth: 2,
                                                borderColor: colors.primary,
                                                justifyContent: 'center',
                                                alignItems: 'center',
                                                backgroundColor:
                                                    preferences.reminderTime === time ? colors.primary : 'transparent',
                                            }}
                                        >
                                            {preferences.reminderTime === time && (
                                                <View
                                                    style={{
                                                        width: 8,
                                                        height: 8,
                                                        borderRadius: 4,
                                                        backgroundColor: colors.surface,
                                                    }}
                                                />
                                            )}
                                        </View>
                                        <View>
                                            <Text
                                                style={{
                                                    fontSize: 16,
                                                    fontWeight: '600',
                                                    color: colors.textPrimary,
                                                }}
                                            >
                                                {time} minutes before
                                            </Text>
                                            <Text
                                                style={{
                                                    fontSize: 12,
                                                    color: colors.textSecondary,
                                                    marginTop: 2,
                                                }}
                                            >
                                                Get notified {time} mins early
                                            </Text>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </TouchableOpacity>
            </Modal>
        </KeyboardAvoidingView>
    );
}
