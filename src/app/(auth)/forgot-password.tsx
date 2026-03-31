import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator, Animated, KeyboardAvoidingView,
    Platform, ScrollView, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import BackButton from '../../components/layout/back-button';
import BgBlobs from '../../components/layout/bg-blobs';
import Badge from '../../components/ui/badge';
import InputField from '../../components/ui/input-field';
import { useThemeColors } from '../../context/theme-context';
import { resendOTP, sendOTP, verifyOTP } from '../../services/otp-service';
import { postJson, resolveApiBase } from '../../utils/api';
import { getPasswordError, isPasswordStrong, isValidGmail } from '../../utils/validators';

// ─── Step Dot ─────────────────────────────────────────────────────────────────
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
                {done ? '●' : num}
            </Text>
        </View>
    );
}

// ─── OTP Input ────────────────────────────────────────────────────────────────
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

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ForgotPasswordScreen() {
    const router = useRouter();
    const { colors, isDark } = useThemeColors();

    // Steps: 0 = Email, 1 = Verify OTP, 2 = Set new password
    const [step, setStep] = useState(0);
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
    const [emailError, setEmailError] = useState('');
    const emailInputRef = useRef<TextInput>(null);

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: false }),
            Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 9, useNativeDriver: false }),
        ]).start();
    }, []);

    // Auto-focus email input on mount
    useEffect(() => {
        if (step === 0) {
            setTimeout(() => emailInputRef.current?.focus(), 300);
        }
    }, [step]);

    // Countdown for OTP resend
    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [countdown]);

    const showMessage = useCallback((text: string, type: 'success' | 'error') => {
        setMsg({ text, type });
        setTimeout(() => setMsg(null), 3500);
    }, []);

    const handleEmailChange = (text: string) => {
        setEmail(text);
        if (emailError) setEmailError('');
    };

    // ── Step 0 → Send OTP (Email only) ───────────────────────────────────────
    const handleSendOTP = async () => {
        if (!email.trim()) {
            setEmailError('Gmail address is required');
            return;
        }

        if (!isValidGmail(email)) {
            setEmailError('Please enter a valid Gmail address (@gmail.com)');
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

    // ── Step 1 → Verify OTP ─────────────────────────────────────────────────
    const handleVerifyOTP = async () => {
        if (otp.length !== 6) {
            showMessage('Enter the 6-digit OTP', 'error');
            return;
        }
        setLoading(true);
        const result = await verifyOTP(email, otp);
        setLoading(false);
        if (result.success) {
            showMessage(result.message, 'success');
            setStep(2);
        } else {
            showMessage(result.message, 'error');
        }
    };

    // ── Resend OTP ──────────────────────────────────────────────────────────
    const handleResendOTP = async () => {
        if (countdown > 0) return;
        setLoading(true);
        const result = await resendOTP(email);
        setLoading(false);
        if (result.success) {
            setOtp('');
            setCountdown(60);
            showMessage('OTP resent!', 'success');
        } else {
            showMessage(result.message, 'error');
        }
    };

    // ── Step 2 → Reset password ─────────────────────────────────────────────
    const handleResetPassword = async () => {
        const passwordErr = getPasswordError(newPassword);
        if (passwordErr) {
            showMessage(passwordErr, 'error');
            return;
        }

        if (newPassword !== confirmPassword) {
            showMessage('Passwords do not match', 'error');
            return;
        }

        if (!isPasswordStrong(newPassword)) {
            showMessage('Password must have uppercase, lowercase, numbers and special characters', 'error');
            return;
        }

        setLoading(true);
        try {
            const res = await postJson('/api/students/forgetpassword', {
                identifier: email.trim(),
                newPassword,
            }, 12000);
            const data = await res.json().catch(() => ({}));
            if (res.ok) {
                showMessage(data.message || 'Password updated successfully!', 'success');
                setTimeout(() => router.replace('/(auth)/login'), 1500);
            } else {
                // Handle specific error codes
                if (res.status === 403 && data.code === 'STUDENT_EMAIL_NOT_VERIFIED') {
                    showMessage('Email verification expired. Please start over.', 'error');
                    setTimeout(() => setStep(0), 1500);
                } else {
                    showMessage(data.error || data.message || `Error ${res.status}`, 'error');
                }
            }
        } catch (e: any) {
            const base = resolveApiBase();
            if (e?.name === 'TimeoutError' || e?.name === 'AbortError') {
                showMessage('Request timed out. Please try again.', 'error');
            } else {
                showMessage(`Server error (${base})`, 'error');
            }
        } finally {
            setLoading(false);
        }
    };

    const steps = ['Identify', 'Verify', 'Reset'];
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
                    <BackButton label="Back" />

                    {/* Header */}
                    <View style={{ marginBottom: 24 }}>
                        <Badge label="Reset Password" />
                        <Text style={{ fontSize: 30, fontWeight: '800', color: colors.textPrimary, letterSpacing: -1, marginBottom: 6 }}>
                            Forgot Password?
                        </Text>
                        <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                            Verify your Gmail to reset your password
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

                    {/* ── Step 0: Email Only ──────────────────────────────────────── */}
                    {step === 0 && (
                        <View style={card}>
                            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 }}>
                                Reset Password
                            </Text>
                            <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 16 }}>
                                Enter your Gmail address to receive OTP
                            </Text>

                            <View style={{ marginBottom: 16 }}>
                                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textPrimary, marginBottom: 8 }}>
                                    Gmail Address
                                </Text>
                                <TextInput
                                    ref={emailInputRef}
                                    placeholder="yourname@gmail.com"
                                    placeholderTextColor={colors.textMuted}
                                    value={email}
                                    onChangeText={handleEmailChange}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    editable={!loading}
                                    style={{
                                        borderWidth: 1,
                                        borderColor: emailError ? colors.error : colors.border,
                                        borderRadius: 8,
                                        paddingHorizontal: 12,
                                        paddingVertical: 12,
                                        fontSize: 14,
                                        color: colors.textPrimary,
                                        backgroundColor: colors.surface,
                                    }}
                                />
                                {emailError && (
                                    <Text style={{ fontSize: 12, color: colors.error, marginTop: 6 }}>
                                        {emailError}
                                    </Text>
                                )}
                            </View>

                            <TouchableOpacity
                                style={[btn, (!email.trim() || !isValidGmail(email) || loading) && btnDisabled]}
                                onPress={handleSendOTP}
                                disabled={!email.trim() || !isValidGmail(email) || loading}
                            >
                                {loading ? <ActivityIndicator color="#fff" /> : (
                                    <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>Send OTP</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* ── Step 1: Verify OTP ──────────────────────────────────────── */}
                    {step === 1 && (
                        <View style={card}>
                            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 }}>
                                Verify OTP
                            </Text>
                            <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 20 }}>
                                Enter the 6-digit code sent to {email}
                            </Text>

                            <OTPInput value={otp} onChange={setOtp} />

                            <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 16, marginBottom: 20 }}>
                                <Text style={{ fontSize: 13, color: colors.textSecondary }}>Didn&apos;t receive? </Text>
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
                                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textSecondary }}>Back</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[btn, { flex: 1 }, (otp.length !== 6 || loading) && btnDisabled]}
                                    onPress={handleVerifyOTP}
                                    disabled={otp.length !== 6 || loading}
                                >
                                    {loading ? <ActivityIndicator color="#fff" /> : (
                                        <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>Verify</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    {/* ── Step 2: New Password ────────────────────────────────────── */}
                    {step === 2 && (
                        <View style={card}>
                            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 }}>
                                Set New Password
                            </Text>
                            <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 16 }}>
                                Create a strong password with all character types
                            </Text>

                            <InputField
                                label="New Password"
                                value={newPassword}
                                onChangeText={setNewPassword}
                                placeholder="Min 8 chars: uppercase, lowercase, numbers, special chars"
                                icon={{ family: 'MaterialCommunityIcons', name: 'lock' }}
                                secureTextEntry
                            />

                            {/* Password Strength Indicator */}
                            {newPassword && (
                                <View style={{ marginBottom: 16, padding: 12, backgroundColor: colors.surface + '50', borderRadius: 10 }}>
                                    {/* Dynamic password requirements based on entered password */}
                                    {(() => {
                                        const checks = {
                                            hasAlphabet: /[a-zA-Z]/.test(newPassword),
                                            hasNumber: /[0-9]/.test(newPassword),
                                            hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword),
                                            isLongEnough: newPassword.length >= 8,
                                        };
                                        return (
                                            <View style={{ gap: 8 }}>
                                                <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textSecondary }}>Password Requirements:</Text>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                                    <Text style={{ fontSize: 14, color: checks.isLongEnough ? colors.accent : colors.textMuted }}>
                                                        {checks.isLongEnough ? '✓' : '✗'}
                                                    </Text>
                                                    <Text style={{ fontSize: 11, color: checks.isLongEnough ? colors.accent : colors.textMuted }}>
                                                        Minimum 8 characters
                                                    </Text>
                                                </View>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                                    <Text style={{ fontSize: 14, color: checks.hasAlphabet ? colors.accent : colors.textMuted }}>
                                                        {checks.hasAlphabet ? '✓' : '✗'}
                                                    </Text>
                                                    <Text style={{ fontSize: 11, color: checks.hasAlphabet ? colors.accent : colors.textMuted }}>
                                                        Uppercase and lowercase letters
                                                    </Text>
                                                </View>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                                    <Text style={{ fontSize: 14, color: checks.hasNumber ? colors.accent : colors.textMuted }}>
                                                        {checks.hasNumber ? '✓' : '✗'}
                                                    </Text>
                                                    <Text style={{ fontSize: 11, color: checks.hasNumber ? colors.accent : colors.textMuted }}>
                                                        At least one number
                                                    </Text>
                                                </View>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                                    <Text style={{ fontSize: 14, color: checks.hasSpecialChar ? colors.accent : colors.textMuted }}>
                                                        {checks.hasSpecialChar ? '✓' : '✗'}
                                                    </Text>
                                                    <Text style={{ fontSize: 11, color: checks.hasSpecialChar ? colors.accent : colors.textMuted }}>
                                                        Special character (!@#$%^&*)
                                                    </Text>
                                                </View>
                                            </View>
                                        );
                                    })()}
                                </View>
                            )}

                            <InputField
                                label="Confirm Password"
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                placeholder="Re-enter password"
                                icon={{ family: 'MaterialCommunityIcons', name: 'lock' }}
                                secureTextEntry
                            />

                            <View style={{ flexDirection: 'row', gap: 10 }}>
                                <TouchableOpacity
                                    style={{ flex: 1, backgroundColor: colors.surface, borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 1.5, borderColor: colors.border }}
                                    onPress={() => setStep(1)}
                                >
                                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textSecondary }}>Back</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[btn, { flex: 1 }, (loading || newPassword.length < 8 || newPassword !== confirmPassword) && btnDisabled]}
                                    onPress={handleResetPassword}
                                    disabled={loading || newPassword.length < 8 || newPassword !== confirmPassword}
                                >
                                    {loading ? <ActivityIndicator color="#fff" /> : (
                                        <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>Reset Password</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    {/* Sign In Link */}
                    <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 20 }}>
                        <Text style={{ fontSize: 13, color: colors.textSecondary }}>Remember your password? </Text>
                        <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
                            <Text style={{ fontSize: 13, color: colors.primary, fontWeight: '700' }}>Sign In</Text>
                        </TouchableOpacity>
                    </View>

                </Animated.View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
