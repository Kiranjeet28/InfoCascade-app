import { Picker } from '@react-native-picker/picker';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator, Alert, Animated, KeyboardAvoidingView, Linking,
    Platform, ScrollView, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import BackButton from '../../components/layout/back-button';
import BgBlobs from '../../components/layout/bg-blobs';
import Badge from '../../components/ui/badge';
import InputField from '../../components/ui/input-field';
import { useProfile } from '../../context/profile-context';
import { useThemeColors } from '../../context/theme-context';
import { isValidGNDECEmail, sendOTP, verifyOTP } from '../../services/otp-service';
import { postJson, resolveApiBase } from '../../utils/api';
import { saveSession } from '../../utils/auth-cache';
import { fetchDepartments, fetchGroups } from '../../utils/departmentUtils';

// ─── Step Indicator ───────────────────────────────────────────────────────────
function StepDot({ num, active, done }: { num: number; active: boolean; done: boolean }) {
    const { colors } = useThemeColors();
    return (
        <View style={{
            width: 28, height: 28, borderRadius: 14,
            backgroundColor: done ? colors.accent + '20' : active ? colors.primary + '20' : colors.surface,
            borderWidth: 2, borderColor: done ? colors.accent : active ? colors.primary : colors.border,
            justifyContent: 'center', alignItems: 'center',
        }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: active || done ? colors.textPrimary : colors.textMuted }}>
                {done ? '✓' : num}
            </Text>
        </View>
    );
}

// ─── OTP Input Component ──────────────────────────────────────────────────────
function OTPInput({ value, onChange, length = 6 }: { value: string; onChange: (v: string) => void; length?: number }) {
    const { colors } = useThemeColors();
    const inputRef = useRef<TextInput>(null);

    return (
        <TouchableOpacity activeOpacity={1} onPress={() => inputRef.current?.focus()}>
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
                {Array.from({ length }).map((_, i) => (
                    <View key={i} style={{
                        width: 44, height: 52, borderRadius: 12,
                        backgroundColor: colors.surface, borderWidth: 2,
                        borderColor: value[i] ? colors.primary : colors.border,
                        justifyContent: 'center', alignItems: 'center',
                    }}>
                        <Text style={{ fontSize: 22, fontWeight: '700', color: colors.textPrimary }}>
                            {value[i] || ''}
                        </Text>
                    </View>
                ))}
            </View>
            <TextInput
                ref={inputRef}
                value={value}
                onChangeText={(t) => onChange(t.replace(/[^0-9]/g, '').slice(0, length))}
                keyboardType="number-pad"
                maxLength={length}
                style={{ position: 'absolute', opacity: 0, height: 1 }}
                autoFocus
            />
        </TouchableOpacity>
    );
}

// ─── Help Modal for Email ─────────────────────────────────────────────────────
function EmailHelpCard({ onClose }: { onClose: () => void }) {
    const { colors } = useThemeColors();
    const steps = [
        { icon: '1️⃣', text: 'Go to Academic Portal & Login' },
        { icon: '2️⃣', text: 'Open "Control Panel"' },
        { icon: '3️⃣', text: 'Click "GNDEC E-mail Credentials"' },
        { icon: '4️⃣', text: 'Note your email & password' },
    ];

    return (
        <View style={{
            backgroundColor: colors.surface, borderRadius: 16, padding: 20,
            borderWidth: 1, borderColor: colors.accent + '40', marginBottom: 16,
        }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.textPrimary }}>
                    📧 How to get GNDEC Email?
                </Text>
                <TouchableOpacity onPress={onClose}>
                    <Text style={{ fontSize: 18, color: colors.textMuted }}>✕</Text>
                </TouchableOpacity>
            </View>

            {steps.map((s, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <Text style={{ fontSize: 16 }}>{s.icon}</Text>
                    <Text style={{ fontSize: 13, color: colors.textSecondary, flex: 1 }}>{s.text}</Text>
                </View>
            ))}

            <TouchableOpacity
                onPress={() => Linking.openURL('https://gndec.ac.in')}
                style={{
                    backgroundColor: colors.primary + '15', borderRadius: 10, padding: 12,
                    marginTop: 8, alignItems: 'center', borderWidth: 1, borderColor: colors.primary + '30',
                }}
            >
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.primary }}>
                    Open Academic Portal →
                </Text>
            </TouchableOpacity>
        </View>
    );
}

// ─── Main Register Screen ─────────────────────────────────────────────────────
export default function RegisterScreen() {
    const router = useRouter();
    const { colors, isDark } = useThemeColors();
    const { saveProfile } = useProfile();

    // Steps: 0=Email, 1=OTP, 2=Identity (URN/CRN), 3=Academic (Dept/Group)
    const [step, setStep] = useState(0);
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [urn, setUrn] = useState('');
    const [crn, setCrn] = useState('');
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [department, setDepartment] = useState('');
    const [group, setGroup] = useState('');
    const [departments, setDepartments] = useState<string[]>([]);
    const [groups, setGroups] = useState<string[]>([]);
    const [showHelp, setShowHelp] = useState(false);
    const [loading, setLoading] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
            Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 9, useNativeDriver: true }),
        ]).start();
    }, []);

    // Load departments
    useEffect(() => { fetchDepartments().then(setDepartments); }, []);

    // Load groups when department changes
    useEffect(() => {
        if (department) {
            fetchGroups(department).then((list) => { setGroups(list); setGroup(''); });
        } else { setGroups([]); setGroup(''); }
    }, [department]);

    // Countdown timer for resend
    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [countdown]);

    const showMessage = useCallback((text: string, type: 'success' | 'error') => {
        setMsg({ text, type });
        setTimeout(() => setMsg(null), 3000);
    }, []);

    // ─── Send OTP ───────────────────────────────────────────────────────────────
    const handleSendOTP = async () => {
        if (!isValidGNDECEmail(email)) {
            showMessage('Enter valid GNDEC email (@gndec.ac.in)', 'error');
            return;
        }
        setLoading(true);
        const result = await sendOTP(email);
        setLoading(false);
        if (result.success) {
            showMessage(result.message, 'success');
            setStep(1);
            setCountdown(60);
        } else {
            showMessage(result.message, 'error');
        }
    };

    // ─── Verify OTP ─────────────────────────────────────────────────────────────
    const handleVerifyOTP = () => {
        if (otp.length !== 6) {
            showMessage('Enter 6-digit OTP', 'error');
            return;
        }
        const result = verifyOTP(email, otp);
        if (result.success) {
            showMessage(result.message, 'success');
            setStep(2);
        } else {
            showMessage(result.message, 'error');
        }
    };

    // ─── Resend OTP ─────────────────────────────────────────────────────────────
    const handleResendOTP = async () => {
        if (countdown > 0) return;
        setLoading(true);
        const result = await sendOTP(email);
        setLoading(false);
        if (result.success) {
            setOtp('');
            setCountdown(60);
            showMessage('OTP resent!', 'success');
        } else {
            showMessage(result.message, 'error');
        }
    };

    // ─── Register ───────────────────────────────────────────────────────────────
    const handleRegister = async () => {
        if (!department || !group) {
            showMessage('Select department and group', 'error');
            return;
        }
        setLoading(true);
        try {
            const res = await postJson('/api/students/register', {
                email, urn, crn, password, name, department, group,
            }, 12000);
            const data = await res.json().catch(() => ({}));

            if (res.ok) {
                const nameFromResp = data.name ?? data.student?.name ?? name;
                if (data.token || data.accessToken) {
                    await saveSession({ urn, token: data.token ?? data.accessToken, name: nameFromResp });
                }
                await saveProfile({ name: nameFromResp, department, group });
                showMessage('Registration successful! 🎉', 'success');
                setTimeout(() => router.replace('/(app)/home'), 1200);
            } else {
                showMessage(data.error ?? data.message ?? `Error ${res.status}`, 'error');
            }
        } catch (e: any) {
            const base = resolveApiBase();
            showMessage(e?.name === 'AbortError' ? 'Request timed out' : `Server error (${base})`, 'error');
        } finally {
            setLoading(false);
        }
    };

    const steps = ['Email', 'Verify', 'Identity', 'Academic'];
    const card = { backgroundColor: colors.surface, borderRadius: 18, padding: 20, borderWidth: 1, borderColor: colors.border };
    const btn = { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center' as const, justifyContent: 'center' as const };
    const btnDisabled = { opacity: 0.5 };

    return (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <StatusBar style={isDark ? 'light' : 'dark'} />
            <ScrollView
                style={{ flex: 1, backgroundColor: colors.bg }}
                contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 50, paddingBottom: 40 }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <BgBlobs />

                {/* Message Toast */}
                {msg && (
                    <View style={{
                        marginBottom: 12, padding: 12, borderRadius: 10, alignItems: 'center',
                        backgroundColor: msg.type === 'success' ? '#00D9AA25' : '#FF4D6D25',
                        borderWidth: 1, borderColor: msg.type === 'success' ? colors.accent : colors.error,
                    }}>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textPrimary }}>{msg.text}</Text>
                    </View>
                )}

                <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
                    <BackButton label="← Back" />

                    {/* Header */}
                    <View style={{ marginBottom: 24 }}>
                        <Badge label="Register" />
                        <Text style={{ fontSize: 30, fontWeight: '800', color: colors.textPrimary, letterSpacing: -1, marginBottom: 6 }}>
                            Create Account
                        </Text>
                        <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                            Verify your GNDEC email to continue
                        </Text>
                    </View>

                    {/* Step Indicator */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}>
                        {steps.map((s, i) => (
                            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', flex: i < steps.length - 1 ? 1 : 0 }}>
                                <View style={{ alignItems: 'center', gap: 4 }}>
                                    <StepDot num={i + 1} active={step === i} done={step > i} />
                                    <Text style={{ fontSize: 10, color: step === i ? colors.primary : colors.textMuted, fontWeight: '600' }}>{s}</Text>
                                </View>
                                {i < steps.length - 1 && (
                                    <View style={{ flex: 1, height: 2, marginHorizontal: 6, marginBottom: 14, backgroundColor: step > i ? colors.accent : colors.border, borderRadius: 1 }} />
                                )}
                            </View>
                        ))}
                    </View>

                    {/* ── Step 0: Email ────────────────────────────────────────────────── */}
                    {step === 0 && (
                        <View style={card}>
                            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 }}>
                                📧 GNDEC Email
                            </Text>
                            <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 16 }}>
                                Enter your college email ending with @gndec.ac.in
                            </Text>

                            {showHelp && <EmailHelpCard onClose={() => setShowHelp(false)} />}

                            <InputField
                                label="Email Address"
                                value={email}
                                onChangeText={setEmail}
                                placeholder="yourname@gndec.ac.in"
                                icon="📧"
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />

                            <TouchableOpacity onPress={() => setShowHelp(!showHelp)} style={{ marginBottom: 16 }}>
                                <Text style={{ fontSize: 12, color: colors.primary, fontWeight: '600' }}>
                                    {showHelp ? 'Hide help' : "Don't know your GNDEC email? →"}
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[btn, (!isValidGNDECEmail(email) || loading) && btnDisabled]}
                                onPress={handleSendOTP}
                                disabled={!isValidGNDECEmail(email) || loading}
                            >
                                {loading ? <ActivityIndicator color="#fff" /> : (
                                    <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>Send OTP →</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* ── Step 1: Verify OTP ───────────────────────────────────────────── */}
                    {step === 1 && (
                        <View style={card}>
                            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 }}>
                                🔐 Verify OTP
                            </Text>
                            <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 20 }}>
                                Enter the 6-digit code sent to {email}
                            </Text>

                            <OTPInput value={otp} onChange={setOtp} />

                            <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 16, marginBottom: 20 }}>
                                <Text style={{ fontSize: 13, color: colors.textSecondary }}>Didn't receive? </Text>
                                <TouchableOpacity onPress={handleResendOTP} disabled={countdown > 0}>
                                    <Text style={{ fontSize: 13, color: countdown > 0 ? colors.textMuted : colors.primary, fontWeight: '600' }}>
                                        {countdown > 0 ? `Resend in ${countdown}s` : 'Resend OTP'}
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            <View style={{ flexDirection: 'row', gap: 10 }}>
                                <TouchableOpacity
                                    style={{ flex: 1, backgroundColor: colors.surface, borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 1.5, borderColor: colors.border }}
                                    onPress={() => { setStep(0); setOtp(''); }}
                                >
                                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textSecondary }}>← Back</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[btn, { flex: 1 }, otp.length !== 6 && btnDisabled]}
                                    onPress={handleVerifyOTP}
                                    disabled={otp.length !== 6}
                                >
                                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>Verify ✓</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    {/* ── Step 2: Identity (URN/CRN/Name/Password) ─────────────────────── */}
                    {step === 2 && (
                        <View style={card}>
                            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 }}>
                                🎓 Your Details
                            </Text>
                            <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 16 }}>
                                Enter your university credentials
                            </Text>

                            <InputField label="Full Name" value={name} onChangeText={setName} placeholder="Your full name" icon="👤" autoCapitalize="words" />
                            <InputField label="URN (University Roll)" value={urn} onChangeText={setUrn} placeholder="e.g. 12345678" icon="🎓" keyboardType="numeric" />
                            <InputField label="CRN (Class Roll)" value={crn} onChangeText={setCrn} placeholder="e.g. 1234" icon="📋" keyboardType="numeric" />
                            <InputField label="Password" value={password} onChangeText={setPassword} placeholder="Min 6 characters" icon="🔒" secureTextEntry />

                            <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                                <TouchableOpacity
                                    style={{ flex: 1, backgroundColor: colors.surface, borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 1.5, borderColor: colors.border }}
                                    onPress={() => setStep(1)}
                                >
                                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textSecondary }}>← Back</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[btn, { flex: 1 }, (!name.trim() || !urn.trim() || !crn.trim() || password.length < 6) && btnDisabled]}
                                    onPress={() => {
                                        if (!name.trim() || !urn.trim() || !crn.trim()) {
                                            Alert.alert('Missing', 'Please fill all fields');
                                            return;
                                        }
                                        if (password.length < 6) {
                                            Alert.alert('Weak Password', 'Password must be 6+ characters');
                                            return;
                                        }
                                        setStep(3);
                                    }}
                                    disabled={!name.trim() || !urn.trim() || !crn.trim() || password.length < 6}
                                >
                                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>Continue →</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    {/* ── Step 3: Academic (Dept/Group) ────────────────────────────────── */}
                    {step === 3 && (
                        <View style={card}>
                            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 }}>
                                📚 Academic Info
                            </Text>
                            <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 16 }}>
                                Select your department and group
                            </Text>

                            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary, marginBottom: 6, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                                Department
                            </Text>
                            <View style={{ borderWidth: 1.5, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.surface, overflow: 'hidden', marginBottom: 14 }}>
                                <Picker
                                    selectedValue={department}
                                    onValueChange={setDepartment}
                                    style={{ color: colors.textPrimary }}
                                    dropdownIconColor={colors.textSecondary}
                                >
                                    <Picker.Item label="Select Department" value="" color={colors.textMuted} />
                                    {departments.map((d) => (
                                        <Picker.Item key={d} label={d.charAt(0).toUpperCase() + d.slice(1)} value={d} color={colors.textPrimary} />
                                    ))}
                                </Picker>
                            </View>

                            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary, marginBottom: 6, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                                Group
                            </Text>
                            <View style={[
                                { borderWidth: 1.5, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.surface, overflow: 'hidden' },
                                !department && { opacity: 0.5 },
                            ]}>
                                <Picker
                                    selectedValue={group}
                                    onValueChange={setGroup}
                                    enabled={!!department && groups.length > 0}
                                    style={{ color: colors.textPrimary }}
                                    dropdownIconColor={colors.textSecondary}
                                >
                                    <Picker.Item
                                        label={!department ? 'Select department first' : groups.length ? 'Select Group' : 'No groups'}
                                        value=""
                                        color={colors.textMuted}
                                    />
                                    {groups.map((g) => (
                                        <Picker.Item key={g} label={g} value={g} color={colors.textPrimary} />
                                    ))}
                                </Picker>
                            </View>

                            <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
                                <TouchableOpacity
                                    style={{ flex: 1, backgroundColor: colors.surface, borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 1.5, borderColor: colors.border }}
                                    onPress={() => setStep(2)}
                                >
                                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textSecondary }}>← Back</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[btn, { flex: 1 }, (loading || !department || !group) && btnDisabled]}
                                    onPress={handleRegister}
                                    disabled={loading || !department || !group}
                                >
                                    {loading ? <ActivityIndicator color="#fff" /> : (
                                        <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>Register 🎉</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    {/* Sign In Link */}
                    <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 20 }}>
                        <Text style={{ fontSize: 13, color: colors.textSecondary }}>Already have account? </Text>
                        <TouchableOpacity onPress={() => router.push('/login')}>
                            <Text style={{ fontSize: 13, color: colors.primary, fontWeight: '700' }}>Sign In</Text>
                        </TouchableOpacity>
                    </View>

                </Animated.View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
