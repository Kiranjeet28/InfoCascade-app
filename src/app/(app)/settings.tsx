import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import {
    Alert,
    Animated,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import AppIcon from '../../components/app-icon';
import BackButton from '../../components/layout/back-button';
import BgBlobs from '../../components/layout/bg-blobs';
import Badge from '../../components/ui/badge';
import { useProfile } from '../../context/profile-context';
import { useThemeColors } from '../../context/theme-context';
import { checkNotificationPermission } from '../../services/permission-service';
import { clearSession } from '../../utils/auth-cache';

export default function SettingsScreen() {
    const router = useRouter();
    const { colors, isDark } = useThemeColors();
    const { clearProfile } = useProfile();

    const [notificationsEnabled, setNotificationsEnabled] = useState(false);
    const [loadingNotif, setLoadingNotif] = useState(true);

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
                const Notifications = require('expo-notifications');
                const { status } = await Notifications.requestPermissionsAsync();
                setNotificationsEnabled(status === 'granted');
            } catch (e) {
                console.error('Error requesting notification permission:', e);
                Alert.alert('Error', 'Unable to enable notifications');
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
        </KeyboardAvoidingView>
    );
}
