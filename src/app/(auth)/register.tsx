import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator, Alert, Animated, KeyboardAvoidingView,
    Platform, ScrollView, Text, TextInput, TouchableOpacity, View
} from 'react-native';
import BackButton from '../../components/layout/back-button';
import BgBlobs from '../../components/layout/bg-blobs';
import Badge from '../../components/ui/badge';
import InputField from '../../components/ui/input-field';
import SelectField from '../../components/ui/select-field';
import { useProfile } from '../../context/profile-context';
import { useThemeColors } from '../../context/theme-context';
import { useEmailAvailability } from '../../hooks/use-email-availability';
import { isValidGNDECEmail, resendOTP, sendOTP, verifyOTP } from '../../services/otp-service';
import { requestAllPermissionsSequentially } from '../../services/permission-service';
import { postJson, resolveApiBase } from '../../utils/api';
import { saveSession } from '../../utils/auth-cache';
import type { AvailabilityStatus } from '../../utils/availability';
import { cancelPendingChecks, checkAvailabilityDebounced } from '../../utils/availability';
import { fetchDepartments, fetchGroups } from '../../utils/departmentUtils';
import { registerServiceWorker } from '../../utils/web-notifications';

// ─── Password Validation Function ────────────────────────────────────────────
const validatePassword = (pwd: string) => {
    return {
        hasAlphabet: /[a-zA-Z]/.test(pwd),
        hasNumber: /[0-9]/.test(pwd),
        hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd),
        isLongEnough: pwd.length >= 8,
    };
};

const isPasswordStrong = (pwd: string): boolean => {
    const checks = validatePassword(pwd);
    return checks.hasAlphabet && checks.hasNumber && checks.hasSpecialChar && checks.isLongEnough;
};

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
    const [loading, setLoading] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

    // Email availability check using reusable hook
    const emailAvailability = useEmailAvailability(email, 300);

    // Availability check states for URN and CRN
    const [urnStatus, setUrnStatus] = useState<AvailabilityStatus>('idle');
    const [urnMsg, setUrnMsg] = useState<string>('');
    const [crnStatus, setCrnStatus] = useState<AvailabilityStatus>('idle');
    const [crnMsg, setCrnMsg] = useState<string>('');

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
            Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 9, useNativeDriver: true }),
        ]).start();
        return () => cancelPendingChecks(); // Cleanup on unmount
    }, []);


    // Check URN availability (debounced)
    useEffect(() => {
        if (!urn.trim()) {
            setUrnStatus('idle');
            return;
        }
        // Validate URN format first: must be exactly 7 digits
        if (!/^\d{7}$/.test(urn.trim())) {
            setUrnStatus('error');
            setUrnMsg('URN must be exactly 7 digits');
            return;
        }
        // Format is valid, check availability
        checkAvailabilityDebounced('urn', urn, (result: any) => {
            setUrnStatus(result.status);
            setUrnMsg(result.message || '');
        }, 300); // Reduced from 400ms to 300ms for faster feedback
    }, [urn]);

    // Check CRN availability (debounced)
    useEffect(() => {
        if (!crn.trim()) {
            setCrnStatus('idle');
            return;
        }
        // Validate CRN format first: must be exactly 7 digits
        if (!/^\d{7}$/.test(crn.trim())) {
            setCrnStatus('error');
            setCrnMsg('CRN must be exactly 7 digits');
            return;
        }
        // Format is valid, check availability
        checkAvailabilityDebounced('crn', crn, (result: any) => {
            setCrnStatus(result.status);
            setCrnMsg(result.message || '');
        }, 300); // Reduced from 400ms to 300ms for faster feedback
    }, [crn]);

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
            showMessage('Enter a valid Gmail address (@gmail.com)', 'error');
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
    const handleVerifyOTP = async () => {
        if (otp.length !== 6) {
            showMessage('Enter 6-digit OTP', 'error');
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

    // ─── Resend OTP ─────────────────────────────────────────────────────────────
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

    // ─── Validate all required fields ──────────────────────────────────────────
    const validateRegistration = (): boolean => {
        if (!name.trim()) {
            showMessage('Full name is required', 'error');
            return false;
        }
        if (!email.trim()) {
            showMessage('Email is required', 'error');
            return false;
        }
        if (!isValidGNDECEmail(email)) {
            showMessage('Email must end with @gmail.com', 'error');
            return false;
        }
        if (emailAvailability.isChecking) {
            showMessage('Please wait for email validation to complete', 'error');
            return false;
        }
        if (emailAvailability.status === 'taken') {
            showMessage('This email is already registered', 'error');
            return false;
        }
        if (emailAvailability.status === 'error') {
            showMessage('Unable to validate email. Please try again.', 'error');
            return false;
        }
        if (!urn.trim()) {
            showMessage('URN is required', 'error');
            return false;
        }
        if (urnStatus === 'checking') {
            showMessage('Please wait for URN validation to complete', 'error');
            return false;
        }
        if (urnStatus === 'taken') {
            showMessage('This URN is already registered', 'error');
            return false;
        }
        if (urnStatus === 'error') {
            showMessage('Unable to validate URN. Please try again.', 'error');
            return false;
        }
        if (!crn.trim()) {
            showMessage('CRN is required', 'error');
            return false;
        }
        if (crnStatus === 'checking') {
            showMessage('Please wait for CRN validation to complete', 'error');
            return false;
        }
        if (crnStatus === 'taken') {
            showMessage('This CRN is already registered', 'error');
            return false;
        }
        if (crnStatus === 'error') {
            showMessage('Unable to validate CRN. Please try again.', 'error');
            return false;
        }
        if (!password.trim()) {
            showMessage('Password is required', 'error');
            return false;
        }
        if (!isPasswordStrong(password)) {
            const checks = validatePassword(password);
            let errorMsg = 'Password must contain: ';
            const missing = [];
            if (!checks.hasAlphabet) missing.push('letters');
            if (!checks.hasNumber) missing.push('numbers');
            if (!checks.hasSpecialChar) missing.push('special characters (!@#$%^&*)');
            if (!checks.isLongEnough) missing.push('at least 8 characters');
            showMessage(errorMsg + missing.join(', '), 'error');
            return false;
        }
        if (!department.trim()) {
            showMessage('Department is required', 'error');
            return false;
        }
        return true;
    };

    // ─── Register ───────────────────────────────────────────────────────────────
    const handleRegister = async () => {
        // Validate all fields
        if (!validateRegistration()) {
            return;
        }

        setLoading(true);

        try {
            // Build payload according to backend contract
            const payload: any = {
                name: name.trim(),
                email: email.trim(),
                urn: urn.trim(),
                crn: crn.trim(),
                password: password.trim(),
                department: department.trim(),
            };

            // Add optional fields if provided
            if (group && group.trim()) {
                payload.group = group.trim();
            }

            const base = resolveApiBase();
            const endpoint = '/api/students/register';
            const fullUrl = `${base}${endpoint}`;

            console.log('[Registration] Sending POST to:', fullUrl);
            console.log('[Registration] Method: POST');
            console.log('[Registration] Headers: Content-Type: application/json');
            console.log('[Registration] Payload:', JSON.stringify(payload, null, 2));

            // Send request
            const res = await postJson(endpoint, payload, 12000);
            const data = await res.json().catch(() => ({}));

            console.log('[Registration] Response Status:', res.status);
            console.log('[Registration] Response Headers:', {
                'content-type': res.headers.get('content-type'),
                'content-length': res.headers.get('content-length'),
            });
            console.log('[Registration] Response Body:', JSON.stringify(data, null, 2));

            // Handle success (status 201 Created or 200 OK)
            if (res.status === 201 || res.status === 200 || res.ok) {
                const nameFromResp = data.name ?? data.student?.name ?? name;
                const token = data.token ?? data.accessToken ?? 'local';

                // Always save session so auto-login works on next launch
                await saveSession({ urn, token, name: nameFromResp });

                // Save profile to context + AsyncStorage
                await saveProfile({ name: nameFromResp, email, urn, crn, department, group });

                showMessage('Registration successful!', 'success');
                setTimeout(async () => {
                    // Register service worker on web
                    if (Platform.OS === 'web') {
                        await registerServiceWorker();
                    }
                    await requestAllPermissionsSequentially();
                    router.replace('/(app)/home');
                }, 1200);
            }
            // Handle client/validation errors
            else if (res.status === 400) {
                const errorMsg = data.error ?? data.message ?? 'Invalid request data';
                console.error('[Registration] 400 - Bad Request Details:', {
                    endpoint: fullUrl,
                    payload,
                    responseHeaders: Object.fromEntries(res.headers.entries()),
                    responseData: data,
                });
                showMessage(errorMsg, 'error');
            }
            // Handle duplicate/conflict errors (duplicate URN, CRN, or email)
            else if (res.status === 409) {
                const errorMsg = data.error ?? data.message ?? 'This data is already registered';
                showMessage(errorMsg, 'error');
                console.warn('[Registration] 409 Conflict:', errorMsg);
            }
            // Handle other errors
            else if (res.status === 404) {
                console.error('[Registration] 404 - Endpoint not found', {
                    endpoint: fullUrl,
                    method: 'POST',
                    note: 'Check if backend has this endpoint',
                });
                showMessage('Backend endpoint not found. Check server or endpoint path.', 'error');
            } else if (res.status >= 500) {
                showMessage('Server error. Please try again later.', 'error');
                console.error('[Registration] Server error:', res.status, data);
            } else {
                const errorMsg = data.error ?? data.message ?? `Error ${res.status}`;
                showMessage(errorMsg, 'error');
                console.error('[Registration] Error:', res.status, errorMsg);
            }
        } catch (e: any) {
            const base = resolveApiBase();
            const errorMsg = e?.name === 'AbortError'
                ? 'Request timed out. Please try again.'
                : `Network error: ${e?.message || 'Unable to connect to server'}`;
            showMessage(errorMsg, 'error');
            console.error('[Registration] Exception:', e);
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
                    <BackButton label="Back" />

                    {/* Header */}
                    <View style={{ marginBottom: 24 }}>
                        <Badge label="Register" />
                        <Text style={{ fontSize: 30, fontWeight: '800', color: colors.textPrimary, letterSpacing: -1, marginBottom: 6 }}>
                            Create Account
                        </Text>
                        <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                            Verify your Gmail to continue
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
                                Gmail Address
                            </Text>


                            <InputField
                                label="Email Address"
                                value={email}
                                onChangeText={setEmail}
                                placeholder="yourname@gmail.com"
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />

                            {/* Email Availability Status */}
                            {email.trim() && isValidGNDECEmail(email) && (
                                <View style={{ marginBottom: 16, paddingHorizontal: 2 }}>
                                    {emailAvailability.isChecking && (
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                            <ActivityIndicator size="small" color={colors.primary} />
                                            <Text style={{ fontSize: 12, color: colors.primary, fontWeight: '500' }}>Checking...</Text>
                                        </View>
                                    )}
                                    {emailAvailability.status === 'available' && (
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                            <Text style={{ fontSize: 12, color: colors.accent, fontWeight: '500' }}>{emailAvailability.message || 'Available'}</Text>
                                        </View>
                                    )}
                                    {emailAvailability.status === 'taken' && (
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                            <Text style={{ fontSize: 12, color: colors.error, fontWeight: '500' }}>{emailAvailability.message || 'Already registered'}</Text>
                                        </View>
                                    )}
                                    {emailAvailability.status === 'error' && (
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                            <Text style={{ fontSize: 12, color: colors.textMuted, fontWeight: '500' }}>{emailAvailability.message || 'Unable to validate'}</Text>
                                        </View>
                                    )}
                                </View>
                            )}

                            <TouchableOpacity
                                style={[btn, (!isValidGNDECEmail(email) || loading || emailAvailability.isChecking || emailAvailability.status === 'taken' || emailAvailability.status === 'error') && btnDisabled]}
                                onPress={handleSendOTP}
                                disabled={!isValidGNDECEmail(email) || loading || emailAvailability.isChecking || emailAvailability.status === 'taken' || emailAvailability.status === 'error'}
                            >
                                {loading ? <ActivityIndicator color="#fff" /> : (
                                    <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>Send OTP</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* ── Step 1: Verify OTP ───────────────────────────────────────────── */}
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

                    {/* ── Step 2: Identity (URN/CRN/Name/Password) ─────────────────────── */}
                    {step === 2 && (
                        <View style={card}>
                            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 }}>
                                Your Details
                            </Text>
                            <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 16 }}>
                                Enter your university credentials
                            </Text>

                            <InputField label="Full Name" value={name} onChangeText={setName} placeholder="Your full name" icon={{ family: 'MaterialCommunityIcons', name: 'account' }} autoCapitalize="words" />
                            <InputField label="URN (University Roll) - 7 digits only" value={urn} onChangeText={(text) => setUrn(text.replace(/[^0-9]/g, '').slice(0, 7))} placeholder="e.g. 1234567" icon={{ family: 'MaterialCommunityIcons', name: 'identifier' }} keyboardType="numeric" />

                            {/* URN Availability Status */}
                            {urn.trim() && (
                                <View style={{ marginBottom: 16, marginTop: -12, paddingHorizontal: 2 }}>
                                    {urnStatus === 'checking' && (
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                            <ActivityIndicator size="small" color={colors.primary} />
                                            <Text style={{ fontSize: 12, color: colors.primary, fontWeight: '500' }}>Checking...</Text>
                                        </View>
                                    )}
                                    {urnStatus === 'available' && (
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                            <Text style={{ fontSize: 12, color: colors.accent, fontWeight: '500' }}>{urnMsg || 'Available'}</Text>
                                        </View>
                                    )}
                                    {urnStatus === 'taken' && (
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                            <Text style={{ fontSize: 12, color: colors.error, fontWeight: '500' }}>{urnMsg || 'Already registered'}</Text>
                                        </View>
                                    )}
                                    {urnStatus === 'error' && (
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                            <Text style={{ fontSize: 12, color: colors.textMuted, fontWeight: '500' }}>{urnMsg || 'Unable to validate'}</Text>
                                        </View>
                                    )}
                                </View>
                            )}

                            <InputField label="CRN (Class Roll) - 7 digits only" value={crn} onChangeText={(text) => setCrn(text.replace(/[^0-9]/g, '').slice(0, 7))} placeholder="e.g. 1234567" icon={{ family: 'MaterialCommunityIcons', name: 'note-outline' }} keyboardType="numeric" />

                            {/* CRN Availability Status */}
                            {crn.trim() && (
                                <View style={{ marginBottom: 16, marginTop: -12, paddingHorizontal: 2 }}>
                                    {crnStatus === 'checking' && (
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                            <ActivityIndicator size="small" color={colors.primary} />
                                            <Text style={{ fontSize: 12, color: colors.primary, fontWeight: '500' }}>Checking...</Text>
                                        </View>
                                    )}
                                    {crnStatus === 'available' && (
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                            <Text style={{ fontSize: 12, color: colors.accent, fontWeight: '500' }}>{crnMsg || 'Available'}</Text>
                                        </View>
                                    )}
                                    {crnStatus === 'taken' && (
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                            <Text style={{ fontSize: 12, color: colors.error, fontWeight: '500' }}>{crnMsg || 'Already registered'}</Text>
                                        </View>
                                    )}
                                    {crnStatus === 'error' && (
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                            <Text style={{ fontSize: 12, color: colors.textMuted, fontWeight: '500' }}>{crnMsg || 'Unable to validate'}</Text>
                                        </View>
                                    )}
                                </View>
                            )}

                            <InputField label="Password" value={password} onChangeText={setPassword} placeholder="Min 8 characters (letter, number, special char)" icon={{ family: 'MaterialCommunityIcons', name: 'lock' }} secureTextEntry />

                            {/* Password Strength Indicator */}
                            {password && (
                                <View style={{ marginBottom: 16, marginTop: -12, paddingHorizontal: 2, gap: 6 }}>
                                    {(() => {
                                        const checks = validatePassword(password);
                                        return (
                                            <>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                    <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: checks.hasAlphabet ? colors.accent : colors.border }} />
                                                    <Text style={{ fontSize: 11, color: colors.textSecondary, fontWeight: '500' }}>
                                                        {checks.hasAlphabet ? '✓' : '○'} Letters (A-Z, a-z)
                                                    </Text>
                                                </View>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                    <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: checks.hasNumber ? colors.accent : colors.border }} />
                                                    <Text style={{ fontSize: 11, color: colors.textSecondary, fontWeight: '500' }}>
                                                        {checks.hasNumber ? '✓' : '○'} Numbers (0-9)
                                                    </Text>
                                                </View>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                    <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: checks.hasSpecialChar ? colors.accent : colors.border }} />
                                                    <Text style={{ fontSize: 11, color: colors.textSecondary, fontWeight: '500' }}>
                                                        {checks.hasSpecialChar ? '✓' : '○'} Special chars (!@#$%^&*)
                                                    </Text>
                                                </View>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                    <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: checks.isLongEnough ? colors.accent : colors.border }} />
                                                    <Text style={{ fontSize: 11, color: colors.textSecondary, fontWeight: '500' }}>
                                                        {checks.isLongEnough ? '✓' : '○'} At least 8 characters
                                                    </Text>
                                                </View>
                                            </>
                                        );
                                    })()}
                                </View>
                            )}

                            <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                                <TouchableOpacity
                                    style={{ flex: 1, backgroundColor: colors.surface, borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 1.5, borderColor: colors.border }}
                                    onPress={() => setStep(1)}
                                >
                                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textSecondary }}>Back</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[btn, { flex: 1 }, (!name.trim() || !urn.trim() || !crn.trim() || !isPasswordStrong(password) || urnStatus === 'checking' || urnStatus === 'taken' || urnStatus === 'error' || crnStatus === 'checking' || crnStatus === 'taken' || crnStatus === 'error') && btnDisabled]}
                                    onPress={() => {
                                        if (!name.trim() || !urn.trim() || !crn.trim()) {
                                            Alert.alert('Missing', 'Please fill all fields');
                                            return;
                                        }
                                        if (urnStatus === 'checking' || crnStatus === 'checking') {
                                            Alert.alert('Validating', 'Please wait for URN and CRN validation to complete');
                                            return;
                                        }
                                        if (urnStatus === 'taken' || urnStatus === 'error' || crnStatus === 'taken' || crnStatus === 'error') {
                                            Alert.alert('Validation Error', 'Please fix URN and CRN validation issues');
                                            return;
                                        }
                                        if (!isPasswordStrong(password)) {
                                            const checks = validatePassword(password);
                                            let errorMsg = 'Password must contain: ';
                                            const missing = [];
                                            if (!checks.hasAlphabet) missing.push('letters');
                                            if (!checks.hasNumber) missing.push('numbers');
                                            if (!checks.hasSpecialChar) missing.push('special characters');
                                            if (!checks.isLongEnough) missing.push('8+ characters');
                                            Alert.alert('Weak Password', errorMsg + missing.join(', '));
                                            return;
                                        }
                                        setStep(3);
                                    }}
                                    disabled={!name.trim() || !urn.trim() || !crn.trim() || !isPasswordStrong(password) || urnStatus === 'checking' || urnStatus === 'taken' || urnStatus === 'error' || crnStatus === 'checking' || crnStatus === 'taken' || crnStatus === 'error'}
                                >
                                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>Continue</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    {/* ── Step 3: Academic (Dept/Group) ────────────────────────────────── */}
                    {step === 3 && (
                        <View style={card}>
                            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 }}>
                                Academic Info
                            </Text>
                            <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 16 }}>
                                Select your department and group
                            </Text>

                            <SelectField
                                label="Department"
                                value={department}
                                onValueChange={setDepartment}
                                items={departments.map(d => ({
                                    label: d.charAt(0).toUpperCase() + d.slice(1),
                                    value: d,
                                }))}
                                placeholder="Select Department"
                                icon={{ name: 'school', family: 'MaterialCommunityIcons' }}
                            />

                            <SelectField
                                label="Group (Optional)"
                                value={group}
                                onValueChange={setGroup}
                                items={groups.map(g => ({
                                    label: g,
                                    value: g,
                                }))}
                                placeholder={!department ? 'Select department first' : groups.length ? 'Select Group (optional)' : 'No groups available'}
                                icon={{ name: 'people', family: 'MaterialCommunityIcons' }}
                                disabled={!department || groups.length === 0}
                            />

                            <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
                                <TouchableOpacity
                                    style={{ flex: 1, backgroundColor: colors.surface, borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 1.5, borderColor: colors.border }}
                                    onPress={() => setStep(2)}
                                >
                                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textSecondary }}>Back</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[btn, { flex: 1 }, (loading || !department) && btnDisabled]}
                                    onPress={handleRegister}
                                    disabled={loading || !department}
                                >
                                    {loading ? <ActivityIndicator color="#fff" /> : (
                                        <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>Register</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    {/* Sign In Link */}
                    <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 20 }}>
                        <Text style={{ fontSize: 13, color: colors.textSecondary }}>Already have account? </Text>
                        <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
                            <Text style={{ fontSize: 13, color: colors.primary, fontWeight: '700' }}>Sign In</Text>
                        </TouchableOpacity>
                    </View>

                </Animated.View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
