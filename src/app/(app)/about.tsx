import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { Animated, ScrollView, Text, View } from 'react-native';
import BackButton from '../../components/layout/back-button';
import BgBlobs from '../../components/layout/bg-blobs';
import SectionTitle from '../../components/ui/section-title';
import { useThemeColors } from '../../context/theme-context';

const FEATURES = [
    { icon: '📅', title: 'Daily Timetable', desc: 'View your full day schedule with time slots at a glance.' },
    { icon: '⚡', title: 'Live Class Tracker', desc: 'See your current and upcoming class in real time.' },
    { icon: '👤', title: 'Student Profiles', desc: 'Set your department and group for a personalized view.' },
    { icon: '🗓️', title: 'Week Overview', desc: 'Navigate all 5 weekdays with compact mini cards.' },
    { icon: '🏷️', title: 'Class Type Badges', desc: 'Instantly spot Labs, Tutorials, Electives, and Projects.' },
    { icon: '🔒', title: 'Secure Auth', desc: 'URN-based login and registration for students.' },
];

const STACK = [
    { label: 'Framework', value: 'React Native (Expo 55)' },
    { label: 'Navigation', value: 'Expo Router v4' },
    { label: 'State', value: 'Context API' },
    { label: 'Styling', value: 'NativeWind + Tailwind' },
    { label: 'Data', value: 'JSON Timetables' },
];

export default function AboutScreen() {
    const router = useRouter();
    const { colors, isDark } = useThemeColors();

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(24)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
            Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 9, useNativeDriver: true }),
        ]).start();
    }, []);

    return (
        <View style={{ flex: 1, backgroundColor: colors.bg }}>
            <StatusBar style={isDark ? 'light' : 'dark'} />
            <BgBlobs />

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 56, paddingBottom: 40 }}
            >
                <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

                    <BackButton label="← Home" onPress={() => router.push('/home')} />

                    {/* Hero */}
                    <View style={{ alignItems: 'center', marginBottom: 40 }}>
                        <View
                            style={{
                                width: 88, height: 88, borderRadius: 44, borderWidth: 2,
                                borderColor: '#6C63FF50', backgroundColor: '#6C63FF15',
                                justifyContent: 'center', alignItems: 'center', marginBottom: 20,
                            }}
                        >
                            <Text style={{ fontSize: 36 }}>⏱</Text>
                        </View>

                        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'baseline', marginBottom: 10 }}>
                            <Text style={{ fontSize: 34, fontWeight: '800', color: colors.textPrimary, letterSpacing: -1 }}>Info</Text>
                            <Text style={{ fontSize: 34, fontWeight: '800', color: colors.primary, letterSpacing: -1 }}>Cascade</Text>
                        </View>

                        <View
                            style={{
                                backgroundColor: colors.accent + '15', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4,
                                borderWidth: 1, borderColor: colors.accent + '30', marginBottom: 16,
                            }}
                        >
                            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.accent, letterSpacing: 1 }}>v1.0.0</Text>
                        </View>

                        <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 22, paddingHorizontal: 16 }}>
                            A modern student timetable app built to make checking your schedule fast, clear, and beautiful.
                        </Text>
                    </View>

                    {/* Features */}
                    <SectionTitle label="Features" />
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 32 }}>
                        {FEATURES.map((f, i) => (
                            <View
                                key={i}
                                style={{
                                    width: '47%', backgroundColor: colors.surface, borderRadius: 16,
                                    padding: 16, borderWidth: 1, borderColor: colors.border,
                                }}
                            >
                                <View
                                    style={{
                                        width: 40, height: 40, borderRadius: 12, backgroundColor: colors.primary + '15',
                                        justifyContent: 'center', alignItems: 'center', marginBottom: 12,
                                    }}
                                >
                                    <Text style={{ fontSize: 20 }}>{f.icon}</Text>
                                </View>
                                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary, marginBottom: 6 }}>{f.title}</Text>
                                <Text style={{ fontSize: 11, color: colors.textSecondary, lineHeight: 16 }}>{f.desc}</Text>
                            </View>
                        ))}
                    </View>

                    {/* Tech Stack */}
                    <SectionTitle label="Built With" />
                    <View
                        style={{
                            backgroundColor: colors.surface, borderRadius: 20,
                            borderWidth: 1, borderColor: colors.border, marginBottom: 32,
                        }}
                    >
                        {STACK.map((s, i) => (
                            <View
                                key={i}
                                style={[
                                    { flexDirection: 'row', justifyContent: 'space-between', padding: 16 },
                                    i < STACK.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                                ]}
                            >
                                <Text style={{ fontSize: 13, color: colors.textSecondary, fontWeight: '500' }}>{s.label}</Text>
                                <Text style={{ fontSize: 13, color: colors.textPrimary, fontWeight: '700' }}>{s.value}</Text>
                            </View>
                        ))}
                    </View>

                    {/* Footer */}
                    <View style={{ alignItems: 'center', gap: 6 }}>
                        <Text style={{ fontSize: 14, color: colors.textSecondary, fontWeight: '600' }}>Made with ❤️ for students</Text>
                        <Text style={{ fontSize: 12, color: colors.textMuted }}>© 2024 InfoCascade. All rights reserved.</Text>
                    </View>

                </Animated.View>
            </ScrollView>
        </View>
    );
}