import LiveClassBanner from '@/components/timetable/current-class-banner';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import ClassCard from '../../components/timetable/class-card';
import DaySelector from '../../components/timetable/day-selector';
import { TIME_SLOTS, WEEK_DAYS } from '../../constants/theme';
import { useProfile } from '../../context/profile-context';
import { useThemeColors } from '../../context/theme-context';
import { ClassSlot, TimetableJson } from '../../types';

function getCurrentDay(): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = days[new Date().getDay()];
    return (WEEK_DAYS as readonly string[]).includes(today) ? today : 'Monday';
}

function getEndTime(time: string): string {
    const [h, m] = time.split(':').map(Number);
    const total = h * 60 + m + 50;
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function timeToMinutes(t: string): number {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
}

function findCurrentAndNextClass(
    classes: ClassSlot[],
    overrideTime = ''
): { current: ClassSlot | null; next: ClassSlot | null } {
    const now = new Date();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentDay = days[now.getDay()];
    const currentMin = overrideTime && /^\d{2}:\d{2}$/.test(overrideTime)
        ? timeToMinutes(overrideTime)
        : now.getHours() * 60 + now.getMinutes();

    const todayClasses = classes
        .filter(c => c.dayOfClass === currentDay && !c.data.freeClass)
        .sort((a, b) => timeToMinutes(a.timeOfClass) - timeToMinutes(b.timeOfClass));

    let current: ClassSlot | null = null;
    let next: ClassSlot | null = null;

    for (let i = 0; i < todayClasses.length; i++) {
        const cls = todayClasses[i];
        const start = timeToMinutes(cls.timeOfClass);
        const end = start + 50;
        if (currentMin >= start && currentMin < end) { current = cls; next = todayClasses[i + 1] ?? null; break; }
        else if (currentMin < start) { next = cls; break; }
    }
    return { current, next };
}

export default function TimetableScreen() {
    const router = useRouter();
    const { colors, isDark } = useThemeColors();
    const { profile, loading: profileLoading, getTimetableFile, getDepartmentLabel, hasProfile } = useProfile();

    const [timetableData, setTimetableData] = useState<{ classes: ClassSlot[] } | null>(null);
    const [currentNext, setCurrentNext] = useState<{ current: ClassSlot | null; next: ClassSlot | null }>({ current: null, next: null });
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedDay, setSelectedDay] = useState(getCurrentDay());
    const [testTime, setTestTime] = useState('');

    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    }, []);

    useEffect(() => {
        if (profileLoading) return;
        if (!hasProfile) { setError('Please set up your profile first'); setLoading(false); return; }

        let mounted = true;
        (async () => {
            try {
                setLoading(true);
                const timetableFile = getTimetableFile();
                const resp = await fetch(`/${timetableFile}`);
                if (!resp.ok) throw new Error(`${resp.status} ${resp.statusText}`);
                const json: TimetableJson = await resp.json();
                if (!mounted) return;

                if (json.timetable && profile?.group && json.timetable[profile.group]) {
                    const data = json.timetable[profile.group];
                    setTimetableData(data);
                    const validTestTime = /^\d{2}:\d{2}$/.test(testTime);
                    const result = findCurrentAndNextClass(data.classes, validTestTime ? testTime : '');
                    setCurrentNext(result);
                    setError(null);
                } else {
                    setError(`No timetable found for group: ${profile?.group}`);
                }
            } catch (e) {
                if (mounted) setError(String(e));
            } finally {
                if (mounted) setLoading(false);
            }
        })();
        return () => { mounted = false; };
    }, [profile, profileLoading, hasProfile, testTime]);

    function getClassForSlot(day: string, time: string): ClassSlot | null {
        return timetableData?.classes.find(c => c.dayOfClass === day && c.timeOfClass === time) ?? null;
    }

    // Loading state
    if (loading || profileLoading) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 28 }}>
                <StatusBar style={isDark ? 'light' : 'dark'} />
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={{ marginTop: 16, fontSize: 14, color: colors.textSecondary }}>Loading timetable...</Text>
            </View>
        );
    }

    // Error state
    if (error) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 28 }}>
                <StatusBar style={isDark ? 'light' : 'dark'} />
                <Text style={{ fontSize: 52, marginBottom: 16 }}>{!hasProfile ? '👤' : '⚠️'}</Text>
                <Text style={{ fontSize: 20, fontWeight: '700', color: colors.textPrimary, marginBottom: 8 }}>
                    {!hasProfile ? 'No Profile Found' : 'Something went wrong'}
                </Text>
                <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: 24 }}>{error}</Text>
                <TouchableOpacity
                    style={{ backgroundColor: colors.primary, paddingVertical: 14, paddingHorizontal: 28, borderRadius: 14 }}
                    onPress={() => router.push(!hasProfile ? '/profile' : '/home')}
                >
                    <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>
                        {!hasProfile ? 'Set Up Profile' : 'Go to Home'}
                    </Text>
                </TouchableOpacity>
            </View>
        );
    }

    const todayDay = getCurrentDay();

    return (
        <View style={{ flex: 1, backgroundColor: colors.bg }}>
            <StatusBar style={isDark ? 'light' : 'dark'} />

            {/* Test time override — remove in production */}
            <View style={{ padding: 10, backgroundColor: colors.surfaceElevated, margin: 10, borderRadius: 10 }}>
                <Text style={{ color: colors.textSecondary, marginBottom: 4, fontSize: 12 }}>Test: Set Current Time (HH:MM)</Text>
                <TextInput
                    value={testTime}
                    onChangeText={setTestTime}
                    placeholder="e.g. 10:30"
                    placeholderTextColor={colors.textMuted}
                    style={{ color: colors.textPrimary, backgroundColor: colors.surface, borderRadius: 6, padding: 8, fontSize: 16 }}
                    keyboardType="numeric"
                />
            </View>

            <View style={{ position: 'absolute', width: 300, height: 300, borderRadius: 150, backgroundColor: '#6C63FF', opacity: 0.05, top: -80, right: -80 }} />

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 56, paddingBottom: 40 }}>
                <Animated.View style={{ opacity: fadeAnim }}>

                    {/* Top Bar */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                        <TouchableOpacity onPress={() => router.push('/home')}>
                            <Text style={{ fontSize: 15, color: colors.textSecondary, fontWeight: '500' }}>← Home</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={{ backgroundColor: colors.surface, borderRadius: 10, paddingVertical: 7, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.border }}
                            onPress={() => router.push('/profile')}
                        >
                            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary }}>✏️ Edit Profile</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Title */}
                    <View style={{ marginBottom: 20 }}>
                        <View style={{ alignSelf: 'flex-start', backgroundColor: colors.primary + '20', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: colors.primary + '40', marginBottom: 10 }}>
                            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.primary, letterSpacing: 1, textTransform: 'uppercase' }}>📅 Timetable</Text>
                        </View>
                        <Text style={{ fontSize: 32, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.8, marginBottom: 12 }}>
                            {getDepartmentLabel()}
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                            <View style={{ paddingVertical: 6, paddingHorizontal: 12, backgroundColor: colors.surface, borderRadius: 20, borderWidth: 1, borderColor: colors.border }}>
                                <Text style={{ fontSize: 12, color: colors.textSecondary, fontWeight: '500' }}>👤 {profile?.name}</Text>
                            </View>
                            <View style={{ paddingVertical: 6, paddingHorizontal: 12, backgroundColor: colors.primary + '20', borderRadius: 20, borderWidth: 1, borderColor: colors.primary + '50' }}>
                                <Text style={{ fontSize: 12, color: colors.primary, fontWeight: '700' }}>{profile?.group}</Text>
                            </View>
                        </View>
                    </View>

                    <LiveClassBanner current={currentNext.current} next={currentNext.next} />

                    <DaySelector selectedDay={selectedDay} todayDay={todayDay} onSelect={setSelectedDay} />

                    {/* Day Schedule */}
                    <View style={{ backgroundColor: colors.surface, borderRadius: 20, padding: 20, marginBottom: 28, borderWidth: 1, borderColor: colors.border }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                            <Text style={{ fontSize: 20, fontWeight: '800', color: colors.textPrimary }}>{selectedDay}</Text>
                            {selectedDay === todayDay && (
                                <View style={{ backgroundColor: colors.accent + '20', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: colors.accent + '40' }}>
                                    <Text style={{ fontSize: 11, fontWeight: '700', color: colors.accent, letterSpacing: 0.5 }}>Today</Text>
                                </View>
                            )}
                        </View>

                        {TIME_SLOTS.map((time) => {
                            const cls = getClassForSlot(selectedDay, time);
                            const now = new Date();
                            const currentMin = now.getHours() * 60 + now.getMinutes();
                            const slotStart = timeToMinutes(time);
                            const isActive = selectedDay === todayDay && currentMin >= slotStart && currentMin < slotStart + 50;

                            return (
                                <View
                                    key={time}
                                    style={[
                                        { flexDirection: 'row', marginBottom: 12, minHeight: 64 },
                                        isActive && {
                                            backgroundColor: colors.primary + '08', borderRadius: 12,
                                            marginHorizontal: -8, paddingHorizontal: 8, borderWidth: 1, borderColor: colors.primary + '20',
                                        },
                                    ]}
                                >
                                    <View style={{ width: 56, justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
                                        {isActive && (
                                            <View style={{ position: 'absolute', left: -8, top: '50%', width: 3, height: 24, backgroundColor: colors.primary, borderRadius: 2, marginTop: -12 }} />
                                        )}
                                        <Text style={{ fontSize: 13, fontWeight: '700', color: isActive ? colors.primary : colors.textMuted }}>{time}</Text>
                                        <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 2 }}>–{getEndTime(time)}</Text>
                                    </View>
                                    <View style={{ flex: 1, marginLeft: 12, justifyContent: 'center' }}>
                                        {cls ? (
                                            <ClassCard classData={cls} compact={false} />
                                        ) : (
                                            <View style={{ flex: 1, justifyContent: 'center', paddingVertical: 20 }}>
                                                <View style={{ height: 1, backgroundColor: colors.border }} />
                                            </View>
                                        )}
                                    </View>
                                </View>
                            );
                        })}
                    </View>

                    {/* Week Overview */}
                    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textSecondary, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 16 }}>
                        Week Overview
                    </Text>
                    {WEEK_DAYS.map((day) => (
                        <View key={day} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                            <Text style={{ width: 36, fontSize: 12, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase' }}>
                                {day.slice(0, 3)}
                            </Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
                                {TIME_SLOTS.map((time) => {
                                    const cls = getClassForSlot(day, time);
                                    if (!cls || cls.data.freeClass) {
                                        return <View key={time} style={{ width: 12, height: 60, marginRight: 8 }} />;
                                    }
                                    const subject = cls.data.subject ?? cls.data.entries?.[0]?.subject ?? '';
                                    const typeKey = cls.data.Lab ? 'Lab' : cls.data.Tut ? 'Tut' : cls.data.elective ? 'elective' : 'normal';
                                    const typeColors: Record<string, string> = {
                                        Lab: colors.lab, Tut: colors.tut, elective: colors.elective, normal: colors.primary,
                                    };
                                    return (
                                        <View
                                            key={time}
                                            style={{
                                                width: 72, height: 60, backgroundColor: colors.surface, borderRadius: 10,
                                                padding: 8, marginRight: 8, borderWidth: 1, borderColor: colors.border,
                                                borderTopWidth: 3, borderTopColor: typeColors[typeKey],
                                            }}
                                        >
                                            <Text style={{ fontSize: 9, color: colors.primary, fontWeight: '700', marginBottom: 3 }}>{time}</Text>
                                            <Text numberOfLines={2} style={{ fontSize: 10, color: colors.textSecondary, lineHeight: 13 }}>{subject}</Text>
                                        </View>
                                    );
                                })}
                            </ScrollView>
                        </View>
                    ))}

                </Animated.View>
            </ScrollView>
        </View>
    );
}