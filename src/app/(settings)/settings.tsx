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
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import AppIcon from '../../components/app-icon';
import BackButton from '../../components/layout/back-button';
import BgBlobs from '../../components/layout/bg-blobs';
import Badge from '../../components/ui/badge';
import { useAuth } from '../../context/auth-context';
import { useProfile } from '../../context/profile-context';
import { useThemeColors } from '../../context/theme-context';
import { ThemeMode } from '../../types';
import { clearAllCache } from '../../utils/auth-cache';

export default function SettingsScreen() {
    const router = useRouter();
    const { colors, isDark, themeMode, setThemeMode } = useThemeColors();
    const { clearProfile } = useProfile();
    const { logout } = useAuth();

    const [showThemeOptions, setShowThemeOptions] = useState(false);

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: false }),
            Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 9, useNativeDriver: false }),
        ]).start();
    }, []);

    async function handleLogout() {
        Alert.alert(
            'Log Out',
            'Are you sure you want to log out? All data will be cleared from this device.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Log Out',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            // Clear all app cache and storage
                            await clearAllCache();

                            // Call auth context logout
                            await logout();

                            // Navigate to login
                            router.replace('/(auth)/login');
                        } catch (error) {
                            console.error('Error during logout:', error);
                            Alert.alert('Error', 'Failed to log out. Please try again.');
                        }
                    },
                },
            ]
        );
    }

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

                    {/* Appearance Section */}
                    <View style={cardStyle}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                            <AppIcon
                                family="MaterialCommunityIcons"
                                name={isDark ? 'moon-waning-crescent' : 'white-balance-sunny'}
                                size={18}
                                color={colors.textPrimary}
                            />
                            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textPrimary }}>
                                Appearance
                            </Text>
                        </View>

                        <View
                            style={{
                                borderTopWidth: 1,
                                borderTopColor: colors.border,
                                paddingTop: 12,
                            }}
                        >
                            <TouchableOpacity
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    paddingVertical: 12,
                                }}
                                onPress={() => setShowThemeOptions(true)}
                                activeOpacity={0.7}
                            >
                                <View>
                                    <Text
                                        style={{
                                            fontSize: 14,
                                            fontWeight: '600',
                                            color: colors.textPrimary,
                                            marginBottom: 4,
                                        }}
                                    >
                                        Theme
                                    </Text>
                                    <Text
                                        style={{
                                            fontSize: 12,
                                            color: colors.textSecondary,
                                        }}
                                    >
                                        Choose your preferred theme
                                    </Text>
                                </View>
                                <View
                                    style={{
                                        backgroundColor: colors.primary + '20',
                                        paddingHorizontal: 12,
                                        paddingVertical: 6,
                                        borderRadius: 8,
                                        borderWidth: 1,
                                        borderColor: colors.primary + '40',
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        gap: 6,
                                    }}
                                >
                                    <AppIcon
                                        family="MaterialCommunityIcons"
                                        name={themeMode === 'system' ? 'auto-fix' : themeMode === 'dark' ? 'moon-waning-crescent' : 'white-balance-sunny'}
                                        size={14}
                                        color={colors.primary}
                                    />
                                    <Text
                                        style={{
                                            fontSize: 12,
                                            fontWeight: '600',
                                            color: colors.primary,
                                            textTransform: 'capitalize',
                                        }}
                                    >
                                        {themeMode}
                                    </Text>
                                </View>
                            </TouchableOpacity>
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

            {/* Theme Options Modal */}
            <Modal
                visible={showThemeOptions}
                transparent
                animationType="fade"
                onRequestClose={() => setShowThemeOptions(false)}
            >
                <TouchableOpacity
                    style={{
                        flex: 1,
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        justifyContent: 'flex-end',
                    }}
                    activeOpacity={1}
                    onPress={() => setShowThemeOptions(false)}
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
                                Choose Theme
                            </Text>
                            <TouchableOpacity onPress={() => setShowThemeOptions(false)}>
                                <AppIcon
                                    family="MaterialCommunityIcons"
                                    name="close"
                                    size={24}
                                    color={colors.textSecondary}
                                />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 200 }}>
                            {(['system', 'light', 'dark'] as ThemeMode[]).map((mode) => (
                                <TouchableOpacity
                                    key={mode}
                                    style={{
                                        paddingVertical: 14,
                                        paddingHorizontal: 16,
                                        borderRadius: 12,
                                        marginBottom: 8,
                                        backgroundColor:
                                            themeMode === mode
                                                ? colors.primary + '20'
                                                : colors.bg,
                                        borderWidth: themeMode === mode ? 2 : 1,
                                        borderColor:
                                            themeMode === mode ? colors.primary : colors.border,
                                    }}
                                    onPress={() => {
                                        setThemeMode(mode);
                                        setShowThemeOptions(false);
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
                                                    themeMode === mode ? colors.primary : 'transparent',
                                            }}
                                        >
                                            {themeMode === mode && (
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
                                                    textTransform: 'capitalize',
                                                }}
                                            >
                                                {mode === 'system' ? '🔄 System' : mode === 'dark' ? '🌙 Dark' : '☀️ Light'}
                                            </Text>
                                            <Text
                                                style={{
                                                    fontSize: 12,
                                                    color: colors.textSecondary,
                                                    marginTop: 2,
                                                }}
                                            >
                                                {mode === 'system' ? 'Follow device settings' : mode === 'dark' ? 'Dark theme' : 'Light theme'}
                                            </Text>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </TouchableOpacity>
            </Modal>

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
        </KeyboardAvoidingView >
    );
}
