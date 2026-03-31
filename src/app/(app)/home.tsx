import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Platform, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import AppIcon from '../../components/app-icon';
import BgBlobs from '../../components/layout/bg-blobs';
import SectionTitle from '../../components/ui/section-title';
import { useInAppNotifications } from '../../context/in-app-notification-context';
import { useProfile } from '../../context/profile-context';
import { useThemeColors } from '../../context/theme-context';
import { getEndTime, useLiveClass } from '../../hooks/Useliveclass';
import { useNotifications } from '../../hooks/use-notifications';
import { ClassSlot } from '../../types';
import { fetchJson } from '../../utils/api';

// ── Quick action card ──────────────────────────────────────────────────────
interface QuickActionProps {
    icon: string | { family?: 'MaterialCommunityIcons' | 'Ionicons' | 'FontAwesome'; name: string };
    label: string; color: string; onPress: () => void;
}
function QuickAction({ icon, label, color, onPress }: QuickActionProps) {
    const { colors } = useThemeColors();
    const scaleAnim = useRef(new Animated.Value(1)).current;
    return (
        <Animated.View style={{ transform: [{ scale: scaleAnim }], flex: 1 }}>
            <TouchableOpacity
                style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 16, alignItems: 'center', gap: 10, borderWidth: 1, borderColor: color + '30' }}
                onPress={onPress}
                onPressIn={() => Animated.spring(scaleAnim, { toValue: 0.93, useNativeDriver: true }).start()}
                onPressOut={() => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start()}
                activeOpacity={1}
            >
                <View style={{ width: 50, height: 50, borderRadius: 12, backgroundColor: color + '20', justifyContent: 'center', alignItems: 'center' }}>
                    {typeof icon === 'string' ? (
                        <Text style={{ fontSize: 24 }}>{icon}</Text>
                    ) : (
                        <AppIcon family={icon.family ?? 'MaterialCommunityIcons'} name={icon.name} size={24} color={color} />
                    )}
                </View>
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary }}>{label}</Text>
            </TouchableOpacity>
        </Animated.View>
    );
}

// ── Extract readable info from a ClassSlot ─────────────────────────────────
function slotInfo(cls: ClassSlot) {
    const isProject = cls.data.subject === 'Minor Project' || cls.data.subject === 'Major Project';
    const isMandatory = cls.data.OtherDepartment === true && !isProject;

    const subject = cls.data.subject ?? cls.data.entries?.[0]?.subject ?? (isMandatory ? 'Mandatory Course' : 'Unknown');
    const room = cls.data.classRoom ?? cls.data.entries?.[0]?.classRoom ?? '';
    const teacher =
        (cls.data as any).teacherName ??
        (cls.data.entries?.[0] as any)?.teacherName ??
        (cls.data as any).teacher ??
        (cls.data.entries?.[0] as any)?.teacher ??
        (cls.data as any).teacher_name ??
        (cls.data.entries?.[0] as any)?.teacher_name ??
        '';
    const type = (cls.data as any).classType ?? (cls.data.entries?.[0] as any)?.classType ?? (cls.data as any).class_type ?? (cls.data.entries?.[0] as any)?.class_type ?? '';
    return { subject, room, teacher, type, time: cls.timeOfClass, end: getEndTime(cls.timeOfClass) };
}

// ── Current class card ─────────────────────────────────────────────────────
function CurrentClassCard({ cls, onPress }: { cls: ClassSlot; onPress: () => void }) {
    const { colors } = useThemeColors();
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const info = slotInfo(cls);

    useEffect(() => {
        const anim = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.6, duration: 900, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
            ])
        );
        anim.start();
        return () => anim.stop();
    }, []);

    const typeColors: Record<string, string> = {
        LAB: '#FF8C42', TUT: '#00D9AA', ELECTIVE: '#A78BFA', PROJECT: '#F472B6',
    };
    const typeColor = typeColors[info.type?.toUpperCase()] ?? colors.accent;

    return (
        <TouchableOpacity
            onPress={onPress} activeOpacity={0.88}
            style={{
                backgroundColor: colors.accent + '10', borderRadius: 20, padding: 20, marginBottom: 12,
                borderWidth: 1.5, borderColor: colors.accent + '40',
            }}
        >
            {/* Badge row */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Animated.View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: colors.accent, transform: [{ scale: pulseAnim }] }} />
                    <Text style={{ fontSize: 11, fontWeight: '800', color: colors.accent, letterSpacing: 1.2 }}>LIVE NOW</Text>
                </View>
                {info.type ? (
                    <View style={{ backgroundColor: typeColor + '20', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, borderColor: typeColor + '40' }}>
                        <Text style={{ fontSize: 10, fontWeight: '800', color: typeColor, letterSpacing: 0.8 }}>{info.type.toUpperCase()}</Text>
                    </View>


                ) : null}
                <Text style={{ marginLeft: 'auto', fontSize: 12, color: colors.textMuted, fontWeight: '600' }}>{info.time} – {info.end}</Text>
            </View>

            {/* Subject */}
            <Text style={{ fontSize: 20, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.5, marginBottom: 8 }}>
                {info.subject}
            </Text>

            {/* Room + teacher */}
            <View style={{ flexDirection: 'row', gap: 16 }}>
                {info.room ? <Text style={{ fontSize: 13, color: colors.textSecondary, fontWeight: '500' }}>📍 {info.room}</Text> : null}
                {info.teacher ? <Text style={{ fontSize: 13, color: colors.textSecondary, fontWeight: '500' }}>Instructor: {info.teacher}</Text> : null}
            </View>
        </TouchableOpacity>
    );
}

// ── Next class card ────────────────────────────────────────────────────────
function NextClassCard({ cls, onPress }: { cls: ClassSlot; onPress: () => void }) {
    const { colors } = useThemeColors();
    const info = slotInfo(cls);
    return (
        <TouchableOpacity
            onPress={onPress} activeOpacity={0.88}
            style={{
                backgroundColor: colors.primary + '0D', borderRadius: 20, padding: 18, marginBottom: 12,
                borderWidth: 1, borderColor: colors.primary + '30',
                flexDirection: 'row', alignItems: 'center', gap: 16,
            }}
        >
            {/* Time pill */}
            <View style={{
                backgroundColor: colors.primary + '18', borderRadius: 14,
                paddingVertical: 10, paddingHorizontal: 12, alignItems: 'center', minWidth: 60,
                borderWidth: 1, borderColor: colors.primary + '30',
            }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: colors.primary }}>{info.time}</Text>
                <Text style={{ fontSize: 10, color: colors.textMuted, fontWeight: '500', marginTop: 2 }}>{info.end}</Text>
            </View>

            {/* Info */}
            <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 10, fontWeight: '800', color: colors.primary, letterSpacing: 1, marginBottom: 4 }}>NEXT UP</Text>
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 }}>{info.subject}</Text>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                    {info.room ? <Text style={{ fontSize: 12, color: colors.textSecondary }}>📍 {info.room}</Text> : null}
                    {info.teacher ? <Text style={{ fontSize: 12, color: colors.textSecondary }}>Instructor: {info.teacher}</Text> : null}
                </View>
            </View>
            <Text style={{ fontSize: 20, color: colors.textMuted }}>›</Text>
        </TouchableOpacity>
    );
}

// ── Now & Next wrapper ─────────────────────────────────────────────────────
function LiveClassSection({ onNavigate, onRefresh }: { onNavigate: () => void; onRefresh?: () => void }) {
    const { colors } = useThemeColors();
    const { current, next, loading, error, isWeekend, refresh } = useLiveClass();

    // Combined refresh handler
    const handleRefresh = useCallback(() => {
        refresh();
        onRefresh?.();
    }, [refresh, onRefresh]);

    if (loading) {
        return (
            <View style={{ alignItems: 'center', paddingVertical: 28, gap: 10 }}>
                <ActivityIndicator color={colors.primary} />
                <Text style={{ fontSize: 13, color: colors.textMuted }}>Loading schedule...</Text>
            </View>
        );
    }

    if (error === 'profile_missing') return null;

    if (isWeekend) {
        return (
            <View style={{ backgroundColor: colors.surface, borderRadius: 20, padding: 24, borderWidth: 1, borderColor: colors.border, alignItems: 'center', marginBottom: 12, gap: 10 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textPrimary }}>Weekend Break</Text>
                <Text style={{ fontSize: 13, color: colors.textSecondary, textAlign: 'center' }}>No classes scheduled. Enjoy your break.</Text>
                <TouchableOpacity onPress={onNavigate} style={{ marginTop: 4, backgroundColor: colors.primary + '15', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 18, borderWidth: 1, borderColor: colors.primary + '30' }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: colors.primary }}>View Timetable</Text>
                </TouchableOpacity>
            </View>
        );
    }

    if (!current && !next) {
        return (
            <View style={{ backgroundColor: colors.surface, borderRadius: 20, padding: 24, borderWidth: 1, borderColor: colors.border, alignItems: 'center', marginBottom: 12, gap: 10 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textPrimary }}>Schedule Complete</Text>
                <Text style={{ fontSize: 13, color: colors.textSecondary, textAlign: 'center' }}>No more classes scheduled today.</Text>
                <TouchableOpacity onPress={onNavigate} style={{ marginTop: 4, backgroundColor: colors.primary + '15', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 18, borderWidth: 1, borderColor: colors.primary + '30' }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: colors.primary }}>Full Timetable</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <>
            {current && <CurrentClassCard cls={current} onPress={onNavigate} />}
            {next && <NextClassCard cls={next} onPress={onNavigate} />}
            <TouchableOpacity onPress={onNavigate} style={{ alignItems: 'center', paddingVertical: 8, marginBottom: 4 }}>
                <Text style={{ fontSize: 13, color: colors.primary, fontWeight: '600' }}>See full day schedule</Text>
            </TouchableOpacity>
        </>
    );
}

// ── Main screen ────────────────────────────────────────────────────────────
export default function HomeScreen() {
    const router = useRouter();
    const { colors, isDark } = useThemeColors();
    const { profile, hasProfile, getDepartmentLabel, loading: profileLoading } = useProfile();
    const { showNotification } = useInAppNotifications();
    const { current, next, refresh: refreshLiveClass } = useLiveClass();

    // Notifications hook
    const {
        notificationsEnabled,
        scheduledCount,
        enableNotifications,
        refreshNotifications,
        loading: notificationsLoading,
    } = useNotifications();

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(20)).current;
    const [backendInfo, setBackendInfo] = useState<any>(null);
    const [backendLoading, setBackendLoading] = useState(true);
    const [backendError, setBackendError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    // Debug logging
    useEffect(() => {
        console.log('[HomeScreen] Component mounted/updated:', {
            profileLoading,
            hasProfile,
            profileName: profile?.name,
        });
    }, [profileLoading, hasProfile, profile]);

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
            Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 9, useNativeDriver: true }),
        ]).start();
    }, []);

    // Refresh "Next Class" data when screen comes into focus
    useFocusEffect(
        useCallback(() => {
            refreshLiveClass();
        }, [refreshLiveClass])
    );

    // Fetch backend root info for status/debugging
    const fetchBackendInfo = useCallback(async () => {
        try {
            setBackendLoading(true);
            const res = await fetchJson('/');
            if (!res.ok) {
                setBackendError(`Server returned ${res.status}`);
                setBackendInfo(null);
            } else {
                const json = await res.json().catch(() => null);
                setBackendInfo(json ?? { ok: true });
                setBackendError(null);
            }
        } catch (e: any) {
            setBackendError(String(e?.message ?? e));
            setBackendInfo(null);
        } finally {
            setBackendLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchBackendInfo();
    }, [fetchBackendInfo]);

    // Pull-to-refresh handler
    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            await Promise.all([
                fetchBackendInfo(),
                refreshNotifications(),
            ]);
        } catch (e) {
            console.error('Refresh error:', e);
        } finally {
            setRefreshing(false);
        }
    }, [fetchBackendInfo, refreshNotifications]);

    // If profile is missing after profile store finished loading, redirect to login
    useEffect(() => {
        if (!profileLoading && !hasProfile) {
            router.replace('/(auth)/login');
        }
    }, [profileLoading, hasProfile]);

    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

    // Show loading screen while profile is loading
    if (profileLoading) {
        console.log('[HomeScreen] Rendering loading state');
        return (
            <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }}>
                <StatusBar style={isDark ? 'light' : 'dark'} />
                <BgBlobs />
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={{ marginTop: 16, fontSize: 15, color: colors.textSecondary, fontWeight: '500' }}>
                    Loading your profile...
                </Text>
            </View>
        );
    }

    console.log('[HomeScreen] Rendering main content, hasProfile=', hasProfile);

    return (
        <View style={{ flex: 1, backgroundColor: colors.bg }}>
            <StatusBar style={isDark ? 'light' : 'dark'} />
            <BgBlobs />

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 56, paddingBottom: 32 }}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={[colors.primary]}
                        tintColor={colors.primary}
                        progressBackgroundColor={colors.surface}
                    />
                }
            >
                <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
                    <View style={{ minHeight: 100 }}>
                        {/* ── Top Bar ── */}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
                            <View>
                                <Text style={{ fontSize: 13, color: colors.textSecondary, fontWeight: '500', marginBottom: 2 }}>{greeting} 👋</Text>
                                <Text style={{ fontSize: 22, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.8 }}>InfoCascade</Text>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                {/* Notification Bell */}
                                {Platform.OS !== 'web' && (
                                    <TouchableOpacity
                                        style={{
                                            width: 42, height: 42, borderRadius: 21,
                                            backgroundColor: notificationsEnabled ? colors.accent + '20' : colors.surface,
                                            borderWidth: 2, borderColor: notificationsEnabled ? colors.accent + '60' : colors.border,
                                            justifyContent: 'center', alignItems: 'center',
                                        }}
                                        onPress={() => {
                                            if (notificationsEnabled) {
                                                refreshNotifications();
                                            } else {
                                                enableNotifications();
                                            }
                                        }}
                                        activeOpacity={0.75}
                                    >
                                        <AppIcon family="Ionicons" name={notificationsEnabled ? 'notifications' : 'notifications-off'} size={18} color={notificationsEnabled ? colors.accent : colors.textSecondary} />
                                        {notificationsEnabled && scheduledCount > 0 && (
                                            <View style={{
                                                position: 'absolute', top: -2, right: -2,
                                                backgroundColor: colors.accent, borderRadius: 8,
                                                minWidth: 16, height: 16, justifyContent: 'center', alignItems: 'center',
                                            }}>
                                                <Text style={{ fontSize: 9, fontWeight: '800', color: '#fff' }}>{scheduledCount}</Text>
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                )}
                                {/* Profile Avatar */}
                                <TouchableOpacity
                                    style={{
                                        width: 42, height: 42, borderRadius: 21,
                                        backgroundColor: profile?.name ? colors.primary + '20' : colors.surface,
                                        borderWidth: 2, borderColor: profile?.name ? colors.primary + '60' : colors.border,
                                        justifyContent: 'center', alignItems: 'center',
                                    }}
                                    onPress={() => router.push('/(app)/profile')}
                                    activeOpacity={0.75}
                                >
                                    {profile?.name
                                        ? <Text style={{ fontSize: 17, fontWeight: '800', color: colors.primary }}>{profile.name[0].toUpperCase()}</Text>
                                        : <AppIcon family="MaterialCommunityIcons" name="account" size={18} color={colors.textSecondary} />
                                    }
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* ── Notification Banner (Android) ── */}
                        {Platform.OS !== 'web' && !notificationsEnabled && hasProfile && (
                            <TouchableOpacity
                                onPress={enableNotifications}
                                style={{
                                    backgroundColor: colors.accent + '15',
                                    borderRadius: 14,
                                    padding: 14,
                                    marginBottom: 16,
                                    borderWidth: 1,
                                    borderColor: colors.accent + '30',
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 12,
                                }}
                            >
                                <AppIcon family="Ionicons" name="notifications" size={24} color={colors.accent} />
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textPrimary, marginBottom: 2 }}>
                                        Enable Class Notifications
                                    </Text>
                                    <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                                        Get notified 10 min before & when classes start
                                    </Text>
                                </View>
                                <Text style={{ fontSize: 14, color: colors.accent, fontWeight: '600' }}>Enable</Text>
                            </TouchableOpacity>
                        )}

                        {/* ── Now & Next (only when profile set) ── */}
                        {hasProfile && (
                            <>
                                <SectionTitle label="Now & Next" />
                                <LiveClassSection
                                    onNavigate={() => router.push('/(app)/timetable')}
                                    onRefresh={refreshNotifications}
                                />
                            </>
                        )}

                        {/* ── Quick Actions ── */}
                        <SectionTitle label="Quick Actions" />
                        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
                            <QuickAction icon={{ family: 'Ionicons', name: 'calendar' }} label="Timetable" color="#6C63FF" onPress={() => router.push('/(app)/timetable')} />
                            <QuickAction icon={{ family: 'MaterialCommunityIcons', name: 'account' }} label="Profile" color="#00D9AA" onPress={() => router.push('/(app)/profile')} />
                        </View>

                        {/* ── Profile card ── */}
                        <SectionTitle label="Your Profile" />

                        {hasProfile && profile ? (
                            <View style={{ backgroundColor: colors.surface, borderRadius: 20, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: colors.border }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                                    <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: '#6C63FF20', borderWidth: 2, borderColor: '#6C63FF50', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                                        <Text style={{ fontSize: 20, fontWeight: '800', color: colors.primary }}>{profile.name ? profile.name[0].toUpperCase() : '?'}</Text>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginBottom: 2 }}>{profile.name}</Text>
                                        <Text style={{ fontSize: 12, color: colors.textSecondary }}>Student</Text>
                                    </View>
                                    <TouchableOpacity
                                        style={{ backgroundColor: '#6C63FF15', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: '#6C63FF30', justifyContent: 'center', alignItems: 'center' }}
                                        onPress={() => router.push('/(app)/profile')}
                                    >
                                        <AppIcon family="MaterialCommunityIcons" name="pencil" size={18} color={colors.primary} />
                                    </TouchableOpacity>
                                </View>

                                <View style={{ height: 1, backgroundColor: colors.border, marginBottom: 16 }} />

                                <View style={{ flexDirection: 'row', marginBottom: 20 }}>
                                    <View style={{ flex: 1, alignItems: 'center' }}>
                                        <Text style={{ fontSize: 11, color: colors.textMuted, fontWeight: '600', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Department</Text>
                                        <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textPrimary }}>{getDepartmentLabel()}</Text>
                                    </View>
                                    <View style={{ width: 1, backgroundColor: colors.border, marginHorizontal: 16 }} />
                                    <View style={{ flex: 1, alignItems: 'center' }}>
                                        <Text style={{ fontSize: 11, color: colors.textMuted, fontWeight: '600', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Group</Text>
                                        <Text style={{ fontSize: 16, fontWeight: '800', color: colors.primary }}>{profile.group}</Text>
                                    </View>
                                </View>

                                <TouchableOpacity
                                    style={{ backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center', boxShadow: '0px 4px 10px rgba(108,99,255,0.3)', elevation: 5 }}
                                    onPress={() => router.push('/(app)/timetable')}
                                >
                                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>View My Timetable</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View style={{ backgroundColor: colors.surface, borderRadius: 20, padding: 24, marginBottom: 20, borderWidth: 1, borderColor: colors.border, alignItems: 'center' }}>
                                <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: colors.surfaceElevated, justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
                                    <AppIcon family="Ionicons" name="clipboard" size={30} color={colors.textSecondary} />
                                </View>
                                <Text style={{ fontSize: 17, fontWeight: '700', color: colors.textPrimary, marginBottom: 8 }}>Profile Not Set Up</Text>
                                <Text style={{ fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 19, marginBottom: 20 }}>
                                    Set your department, year, and group to unlock your personalized timetable.
                                </Text>
                                <TouchableOpacity
                                    style={{ backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 28, boxShadow: '0px 4px 10px rgba(108,99,255,0.3)', elevation: 5 }}
                                    onPress={() => router.push('/(app)/profile')}
                                >
                                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>Set Up Profile</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </Animated.View>
            </ScrollView>
        </View>
    );
}