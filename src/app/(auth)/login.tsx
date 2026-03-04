import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, KeyboardAvoidingView, Platform, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import BackButton from '../../components/layout/back-button';
import BgBlobs from '../../components/layout/bg-blobs';
import Badge from '../../components/ui/badge';
import InputField from '../../components/ui/input-field';
import { useThemeColors } from '../../context/theme-context';
import { postJson, resolveApiBase } from '../../utils/api';
import { getSession, saveSession } from '../../utils/auth-cache';

export default function LoginScreen() {
    const router = useRouter();
    const { colors, isDark } = useThemeColors();

    const [urn, setUrn] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [checkingCache, setCheckingCache] = useState(true);
    const [message, setMessage] = useState<string | null>(null);
    const [messageType, setMessageType] = useState<'success' | 'error'>('error');

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;
    const notifAnim = useRef(new Animated.Value(-60)).current;

    // ── Check cache: if already logged in skip the login screen ──────────────
    useEffect(() => {
        getSession().then((session) => {
            if (session?.token) {
                router.replace('/(app)/home');
            } else {
                setCheckingCache(false);
                Animated.parallel([
                    Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
                    Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 9, useNativeDriver: true }),
                ]).start();
            }
        });
    }, []);

    useEffect(() => {
        Animated.timing(notifAnim, {
            toValue: message ? 0 : -60, duration: 350, useNativeDriver: true,
        }).start();
    }, [message]);

    function showMsg(msg: string, type: 'success' | 'error') {
        setMessage(msg);
        setMessageType(type);
        setTimeout(() => setMessage(null), 3000);
    }


    async function handleLogin() {
        if (!urn.trim() || !password.trim()) { showMsg('All fields required.', 'error'); return; }
        setLoading(true);
        try {
            const res = await postJson('/api/students/sign', { identifier: urn, password }, 12000);
            const data = await res.json().catch(() => ({}));
            if (res.ok) {
                await saveSession({
                    urn: urn.trim(),
                    token: data.token ?? data.accessToken ?? 'local',
                    name: data.name ?? data.student?.name ?? '',
                });
                showMsg('Login successful!', 'success');
                setTimeout(() => router.replace('/(app)/home'), 900);
            } else {
                const errMsg = data?.error || data?.message || `Server returned ${res.status}`;
                showMsg(errMsg, 'error');
            }
        } catch (e: any) {
            const base = resolveApiBase();
            if (e?.name === 'AbortError') {
                showMsg(`Request timed out. Tried ${base}/api/students/sign`, 'error');
            } else {
                showMsg(`Could not reach server (${base}).`, 'error');
            }
        } finally {
            setLoading(false);
        }
    }

    const isSuccess = messageType === 'success';

    if (checkingCache) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator color={colors.primary} size="large" />
            </View>
        );
    }

    return (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <StatusBar style={isDark ? 'light' : 'dark'} />
            <View style={{ flex: 1, backgroundColor: colors.bg, overflow: 'hidden' }}>
                <BgBlobs />

                {/* Slide-in notification */}
                <Animated.View
                    style={{
                        position: 'absolute', left: 24, right: 24, top: 24, zIndex: 10,
                        padding: 13, borderRadius: 12, alignItems: 'center', elevation: 8,
                        backgroundColor: isSuccess ? '#00D9AA33' : '#FF4D6D33',
                        borderColor: isSuccess ? colors.accent : colors.error,
                        borderWidth: 1.2,
                        transform: [{ translateY: notifAnim }],
                    }}
                >
                    {message ? (
                        <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 16 }}>{message}</Text>
                    ) : null}
                </Animated.View>

                <ScrollView
                    contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 40, paddingBottom: 40 }}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

                        {/* Logo */}
                        <View style={{ alignItems: 'center', marginBottom: 10 }}>

                        </View>

                        <BackButton label="← Back" />

                        {/* Header */}
                        <View style={{ marginBottom: 28 }}>
                            <Badge label="Sign In" />
                            <Text style={{ fontSize: 42, fontWeight: '900', color: colors.textPrimary, letterSpacing: -1.5, lineHeight: 48, marginBottom: 8 }}>
                                Welcome{'\n'}<Text style={{ color: colors.primary }}>Back</Text>
                            </Text>
                            <Text style={{ fontSize: 15, color: colors.textSecondary, lineHeight: 22 }}>
                                Access your personalized timetable
                            </Text>
                        </View>

                        {/* Input card */}
                        <View
                            style={{
                                backgroundColor: colors.surfaceElevated + 'CC', borderRadius: 22, padding: 26,
                                borderWidth: 1.5, borderColor: '#ffffff18', marginBottom: 22,
                                shadowColor: '#000', shadowOffset: { width: 0, height: 12 },
                                shadowOpacity: 0.18, shadowRadius: 24, elevation: 12,
                            }}
                        >
                            <InputField
                                label="University Roll Number"
                                value={urn}
                                onChangeText={setUrn}
                                placeholder="e.g. 12345678"
                                icon="🎓"
                            />
                            <InputField
                                label="Password"
                                value={password}
                                onChangeText={setPassword}
                                placeholder="Enter your password"
                                icon="🔒"
                                secureTextEntry
                            />
                            <TouchableOpacity style={{ alignSelf: 'flex-end', marginTop: -8 }}>
                                <Text style={{ fontSize: 13, color: colors.primary, fontWeight: '600' }}>Forgot password?</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Divider */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 10, marginBottom: 18 }}>
                            <View style={{ flex: 1, height: 1.5, backgroundColor: '#23263A', borderRadius: 2, marginHorizontal: 8 }} />
                            <Text style={{ color: colors.textMuted, fontWeight: '700', fontSize: 13, letterSpacing: 1 }}>OR</Text>
                            <View style={{ flex: 1, height: 1.5, backgroundColor: '#23263A', borderRadius: 2, marginHorizontal: 8 }} />
                        </View>

                        {/* Login button */}
                        <TouchableOpacity
                            style={[
                                {
                                    backgroundColor: colors.primary, borderRadius: 18, paddingVertical: 18,
                                    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
                                    shadowColor: '#6C63FF', shadowOffset: { width: 0, height: 10 },
                                    shadowOpacity: 0.38, shadowRadius: 18, elevation: 10,
                                },
                                loading && { opacity: 0.7 },
                            ]}
                            onPress={handleLogin}
                            disabled={loading}
                            activeOpacity={0.85}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" size="small" />
                            ) : (
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Text style={{ fontSize: 18, fontWeight: '800', color: '#fff', letterSpacing: 0.5, marginRight: 8 }}>
                                        Sign In
                                    </Text>
                                    <Text style={{ fontSize: 20, color: '#fff', fontWeight: '800' }}>→</Text>
                                </View>
                            )}
                        </TouchableOpacity>

                        {/* Register link */}
                        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
                            <Text style={{ fontSize: 15, color: colors.textSecondary }}>New student? </Text>
                            <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
                                <Text style={{ fontSize: 15, color: colors.primary, fontWeight: '800' }}>Create Account</Text>
                            </TouchableOpacity>
                        </View>

                    </Animated.View>
                </ScrollView>
            </View>
        </KeyboardAvoidingView>
    );
}