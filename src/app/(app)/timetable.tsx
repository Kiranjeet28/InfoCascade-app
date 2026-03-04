import LiveClassBanner from '@/components/timetable/current-class-banner';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, ScrollView, Text, TouchableOpacity, View } from 'react-native';
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
function findCurrentAndNextClass(classes: ClassSlot[]): { current: ClassSlot | null; next: ClassSlot | null } {
    const now = new Date();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentDay = days[now.getDay()];
    const currentMin = now.getHours() * 60 + now.getMinutes();
    const todayClasses = classes
        .filter(c => c.dayOfClass === currentDay && !c.data.freeClass)
        .sort((a, b) => timeToMinutes(a.timeOfClass) - timeToMinutes(b.timeOfClass));
    let current: ClassSlot | null = null;
    let next: ClassSlot | null = null;
    for (let i = 0; i < todayClasses.length; i++) {
        const cls = todayClasses[i];
        const start = timeToMinutes(cls.timeOfClass);
        if (currentMin >= start && currentMin < start + 50) { current = cls; next = todayClasses[i + 1] ?? null; break; }
        else if (currentMin < start) { next = cls; break; }
    }
    return { current, next };
}

// ── Week mini card ─────────────────────────────────────────────────────────
function WeekMiniCard({ cls, time, typeColor }: { cls: ClassSlot; time: string; typeColor: string }) {
    const { colors } = useThemeColors();
    const subject = cls.data.subject ?? cls.data.entries?.[0]?.subject ?? '';
    return (
        <View style={{
            width: 82, height: 68, backgroundColor: colors.surfaceElevated,
            borderRadius: 12, padding: 9, marginRight: 8,
            borderWidth: 1, borderColor: colors.border,
            borderTopWidth: 3, borderTopColor: typeColor,
        }}>
            <Text style={{ fontSize: 9, color: typeColor, fontWeight: '800', marginBottom: 3 }}>{time}</Text>
            <Text numberOfLines={3} style={{ fontSize: 10, color: colors.textSecondary, lineHeight: 13 }}>{subject}</Text>
        </View>
    );
}

// ── Time slot row ──────────────────────────────────────────────────────────
function TimeSlotRow({ time, cls, isActive }: { time: string; cls: ClassSlot | null; isActive: boolean }) {
    const { colors } = useThemeColors();
    return (
        <View style={{
            flexDirection: 'row', marginBottom: 10, borderRadius: 14,
            ...(isActive ? {
                backgroundColor: colors.primary + '08',
                borderWidth: 1, borderColor: colors.primary + '25',
                padding: 4, marginHorizontal: -4,
            } : {}),
        }}>
            <View style={{ width: 60, paddingTop: 10, alignItems: 'center', position: 'relative' }}>
                {isActive && (
                    <View style={{
                        position: 'absolute', left: -4, top: 6, bottom: 6,
                        width: 3, backgroundColor: colors.primary, borderRadius: 2,
                    }} />
                )}
                <Text style={{ fontSize: 13, fontWeight: '700', color: isActive ? colors.primary : colors.textMuted }}>{time}</Text>
                <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 2 }}>{getEndTime(time)}</Text>
            </View>
            <View style={{ flex: 1, paddingLeft: 10, justifyContent: 'center' }}>
                {cls ? (
                    <ClassCard classData={cls} compact={false} />
                ) : (
                    <View style={{ paddingVertical: 18 }}>
                        <View style={{ height: 1, backgroundColor: colors.border, opacity: 0.5 }} />
                    </View>
                )}
            </View>
        </View>
    );
}

// ── Main ───────────────────────────────────────────────────────────────────
export default function TimetableScreen() {
    const router = useRouter();
    const { colors, isDark } = useThemeColors();
    const { profile, loading: profileLoading, getTimetableFile, getDepartmentLabel, hasProfile } = useProfile();

    const [timetableData, setTimetableData] = useState<{ classes: ClassSlot[] } | null>(null);
    const [currentNext, setCurrentNext] = useState<{ current: ClassSlot | null; next: ClassSlot | null }>({ current: null, next: null });
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedDay, setSelectedDay] = useState(getCurrentDay());

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const headerAnim = useRef(new Animated.Value(-10)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
            Animated.spring(headerAnim, { toValue: 0, tension: 70, friction: 10, useNativeDriver: true }),
        ]).start();
    }, []);

    useEffect(() => {
        if (profileLoading) return;
        if (!hasProfile) { setError('Please set up your profile first'); setLoading(false); return; }
        let mounted = true;
        (async () => {
            try {
                setLoading(true);
                const resp = await fetch(`/${getTimetableFile()}`);
                if (!resp.ok) throw new Error(`${resp.status} ${resp.statusText}`);
                const json: TimetableJson = await resp.json();
                if (!mounted) return;
                if (json.timetable && profile?.group && json.timetable[profile.group]) {
                    const data = json.timetable[profile.group];
                    setTimetableData(data);
                    setCurrentNext(findCurrentAndNextClass(data.classes));
                    setError(null);
                } else {
                    setError(`No timetable found for group: ${profile?.group}`);
                }
            } catch (e) { if (mounted) setError(String(e)); }
            finally { if (mounted) setLoading(false); }
        })();
        return () => { mounted = false; };
    }, [profile, profileLoading, hasProfile]);

    function getClassForSlot(day: string, time: string): ClassSlot | null {
        return timetableData?.classes.find(c => c.dayOfClass === day && c.timeOfClass === time) ?? null;
    }
    function getTypeColor(cls: ClassSlot): string {
        if (cls.data.Lab) return colors.lab;
        if (cls.data.Tut) return colors.tut;
        if (cls.data.elective) return colors.elective;
        return colors.primary;
    }

    // ── Loading ──────────────────────────────────────────────────────────────
    if (loading || profileLoading) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', gap: 14 }}>
                <StatusBar style={isDark ? 'light' : 'dark'} />
                <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primary + '15', alignItems: 'center', justifyContent: 'center' }}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
                <Text style={{ fontSize: 14, color: colors.textSecondary, fontWeight: '500' }}>Loading timetable...</Text>
            </View>
        );
    }

    // ── Error ────────────────────────────────────────────────────────────────
    if (error) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 }}>
                <StatusBar style={isDark ? 'light' : 'dark'} />
                <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: colors.surfaceElevated, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 40 }}>{!hasProfile ? '👤' : '⚠️'}</Text>
                </View>
                <Text style={{ fontSize: 20, fontWeight: '800', color: colors.textPrimary, textAlign: 'center' }}>
                    {!hasProfile ? 'No Profile Found' : 'Something went wrong'}
                </Text>
                <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 }}>{error}</Text>
                <TouchableOpacity
                    style={{ marginTop: 8, backgroundColor: colors.primary, paddingVertical: 14, paddingHorizontal: 32, borderRadius: 14 }}
                    onPress={() => router.push(!hasProfile ? '/(app)/profile' : '/(app)/home')}
                >
                    <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>
                        {!hasProfile ? 'Set Up Profile' : 'Go to Home'}
                    </Text>
                </TouchableOpacity>
            </View>
        );
    }

    const todayDay = getCurrentDay();
    const currentMin = new Date().getHours() * 60 + new Date().getMinutes();

    return (
        <View style={{ flex: 1, backgroundColor: colors.bg }}>
            <StatusBar style={isDark ? 'light' : 'dark'} />

            {/* Background orb */}
            <View style={{
                position: 'absolute', width: 280, height: 280, borderRadius: 140,
                backgroundColor: colors.primary, opacity: 0.04, top: -60, right: -60,
            }} />

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 56, paddingBottom: 48 }}
            >
                <Animated.View style={{ opacity: fadeAnim }}>

                    {/* ── Top Nav ── */}
                    <Animated.View style={{
                        transform: [{ translateY: headerAnim }],
                        flexDirection: 'row', justifyContent: 'space-between',
                        alignItems: 'center', marginBottom: 28,
                    }}>
                        <TouchableOpacity
                            onPress={() => router.push('/(app)/home')}
                            style={{
                                flexDirection: 'row', alignItems: 'center', gap: 6,
                                backgroundColor: colors.surface, borderRadius: 12,
                                paddingVertical: 8, paddingHorizontal: 14,
                                borderWidth: 1, borderColor: colors.border,
                            }}
                        >
                            <Text style={{ fontSize: 14, color: colors.textSecondary, fontWeight: '600' }}>← Home</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => router.push('/(app)/profile')}
                            style={{
                                backgroundColor: colors.surface, borderRadius: 12,
                                paddingVertical: 8, paddingHorizontal: 14,
                                borderWidth: 1, borderColor: colors.border,
                                flexDirection: 'row', alignItems: 'center', gap: 6,
                            }}
                        >
                            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary }}>✏️ Profile</Text>
                        </TouchableOpacity>
                    </Animated.View>

                    {/* ── Header ── */}
                    <View style={{ marginBottom: 24 }}>
                        <View style={{
                            alignSelf: 'flex-start', backgroundColor: colors.primary + '18',
                            borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5,
                            borderWidth: 1, borderColor: colors.primary + '35', marginBottom: 12,
                        }}>
                            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.primary, letterSpacing: 1.2, textTransform: 'uppercase' }}>
                                📅 Timetable
                            </Text>
                        </View>
                        <Text style={{ fontSize: 30, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.8, marginBottom: 14 }}>
                            {getDepartmentLabel()}
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                            <View style={{
                                paddingVertical: 6, paddingHorizontal: 14,
                                backgroundColor: colors.surface, borderRadius: 20,
                                borderWidth: 1, borderColor: colors.border,
                                flexDirection: 'row', alignItems: 'center', gap: 6,
                            }}>
                                <Text style={{ fontSize: 12 }}>👤</Text>
                                <Text style={{ fontSize: 12, color: colors.textSecondary, fontWeight: '600' }}>{profile?.name}</Text>
                            </View>
                            <View style={{
                                paddingVertical: 6, paddingHorizontal: 14,
                                backgroundColor: colors.primary + '18', borderRadius: 20,
                                borderWidth: 1, borderColor: colors.primary + '40',
                            }}>
                                <Text style={{ fontSize: 12, color: colors.primary, fontWeight: '800' }}>{profile?.group}</Text>
                            </View>
                        </View>
                    </View>

                    {/* ── Live Banner ── */}
                    <LiveClassBanner current={currentNext.current} next={currentNext.next} />

                    {/* ── Day Selector ── */}
                    <DaySelector selectedDay={selectedDay} todayDay={todayDay} onSelect={setSelectedDay} />

                    {/* ── Day Schedule ── */}
                    <View style={{
                        backgroundColor: colors.surface, borderRadius: 22, padding: 20, marginBottom: 32,
                        borderWidth: 1, borderColor: colors.border,
                        shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 16, elevation: 4,
                    }}>
                        {/* Day header */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
                            <Text style={{ fontSize: 22, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.5 }}>{selectedDay}</Text>
                            {selectedDay === todayDay && (
                                <View style={{
                                    backgroundColor: colors.accent + '18', borderRadius: 10,
                                    paddingHorizontal: 12, paddingVertical: 5,
                                    borderWidth: 1, borderColor: colors.accent + '35',
                                    flexDirection: 'row', alignItems: 'center', gap: 5,
                                }}>
                                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent }} />
                                    <Text style={{ fontSize: 12, fontWeight: '700', color: colors.accent }}>Today</Text>
                                </View>
                            )}
                        </View>

                        {TIME_SLOTS.map((time) => {
                            const cls = getClassForSlot(selectedDay, time);
                            const slotStart = timeToMinutes(time);
                            const isActive = selectedDay === todayDay && currentMin >= slotStart && currentMin < slotStart + 50;
                            return <TimeSlotRow key={time} time={time} cls={cls} isActive={isActive} />;
                        })}
                    </View>

                    {/* ── Week Overview ── */}
                    <View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textSecondary, letterSpacing: 1, textTransform: 'uppercase' }}>
                                Week Overview
                            </Text>
                            <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
                        </View>

                        {WEEK_DAYS.map((day) => {
                            const isToday = day === todayDay;
                            const dayClasses = TIME_SLOTS
                                .map(t => ({ time: t, cls: getClassForSlot(day, t) }))
                                .filter(({ cls }) => cls && !cls.data.freeClass);

                            return (
                                <TouchableOpacity
                                    key={day} onPress={() => setSelectedDay(day)}
                                    activeOpacity={0.8} style={{ marginBottom: 16 }}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 }}>
                                        <Text style={{
                                            width: 36, fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5,
                                            color: isToday ? colors.primary : colors.textMuted,
                                        }}>
                                            {day.slice(0, 3)}
                                        </Text>
                                        {isToday && <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary }} />}
                                        <Text style={{ fontSize: 11, color: colors.textMuted }}>
                                            {dayClasses.length} {dayClasses.length === 1 ? 'class' : 'classes'}
                                        </Text>
                                    </View>

                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginLeft: 44 }}>
                                        {dayClasses.length === 0 ? (
                                            <View style={{
                                                height: 68, paddingHorizontal: 16, borderRadius: 12,
                                                backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border,
                                                alignItems: 'center', justifyContent: 'center',
                                            }}>
                                                <Text style={{ fontSize: 11, color: colors.textMuted }}>No classes</Text>
                                            </View>
                                        ) : (
                                            dayClasses.map(({ time, cls }) => (
                                                <WeekMiniCard key={time} cls={cls!} time={time} typeColor={getTypeColor(cls!)} />
                                            ))
                                        )}
                                    </ScrollView>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                </Animated.View>
            </ScrollView>
        </View>
    );
}