import { Picker } from '@react-native-picker/picker';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    KeyboardAvoidingView, Platform,
    ScrollView,
    Text, TouchableOpacity,
    View,
} from 'react-native';
import BackButton from '../../components/layout/back-button';
import BgBlobs from '../../components/layout/bg-blobs';
import Badge from '../../components/ui/badge';
import InputField from '../../components/ui/input-field';
import { useThemeColors } from '../../context/theme-context';
import { fetchDepartments, fetchGroups } from '../../utils/departmentUtils';

interface StepDotProps { active: boolean; done: boolean; num: number; }

function StepDot({ active, done, num }: StepDotProps) {
    const { colors } = useThemeColors();
    return (
        <View style={{ alignItems: 'center' }}>
            <View
                style={{
                    width: 32, height: 32, borderRadius: 16,
                    backgroundColor: done ? colors.accent + '20' : active ? colors.primary + '20' : colors.surface,
                    borderWidth: 2,
                    borderColor: done ? colors.accent : active ? colors.primary : colors.border,
                    justifyContent: 'center', alignItems: 'center',
                }}
            >
                <Text style={{ fontSize: 13, fontWeight: '700', color: active || done ? colors.textPrimary : colors.textMuted }}>
                    {done ? '✓' : num}
                </Text>
            </View>
        </View>
    );
}

export default function RegisterScreen() {
    const router = useRouter();
    const { colors, isDark } = useThemeColors();

    const [step, setStep] = useState(0);
    const [urn, setUrn] = useState('');
    const [crn, setCrn] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [department, setDepartment] = useState('');
    const [group, setGroup] = useState('');
    const [departments, setDepartments] = useState<string[]>([]);
    const [groups, setGroups] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [messageType, setMessageType] = useState<'success' | 'error'>('error');

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
            Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 9, useNativeDriver: true }),
        ]).start();
    }, []);

    useEffect(() => {
        fetchDepartments().then(setDepartments);
    }, []);

    useEffect(() => {
        if (department) {
            fetchGroups(department).then((list) => { setGroups(list); setGroup(''); });
        } else {
            setGroups([]); setGroup('');
        }
    }, [department]);

    async function handleRegister() {
        setLoading(true);
        setMessage(null);
        try {
            const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/students/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ urn, crn, password, name, department, group }),
            });
            const data = await res.json();
            if (res.ok) {
                setMessage('Registration successful!');
                setMessageType('success');
                setTimeout(() => { setMessage(null); router.replace('/home'); }, 1200);
            } else {
                setMessage(data.error ?? 'Something went wrong.');
                setMessageType('error');
            }
        } catch {
            setMessage('Could not reach the server.');
            setMessageType('error');
        } finally {
            setLoading(false);
        }
    }

    const steps = [{ label: 'Identity', icon: '🎓' }, { label: 'Security', icon: '🔐' }, { label: 'Academic', icon: '📚' }];

    const cardStyle = {
        backgroundColor: colors.surface, borderRadius: 20, padding: 24,
        borderWidth: 1, borderColor: colors.border, marginBottom: 20,
    };

    const nextBtnStyle = {
        backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 16,
        flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const,
        gap: 8, marginTop: 4,
        shadowColor: '#6C63FF', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
    };

    return (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <StatusBar style={isDark ? 'light' : 'dark'} />

            <ScrollView
                style={{ flex: 1, backgroundColor: colors.bg }}
                contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 60, paddingBottom: 48 }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <BgBlobs />

                {/* Notification */}
                {message && (
                    <View
                        style={{
                            marginBottom: 8, padding: 12, borderRadius: 10, alignItems: 'center',
                            backgroundColor: messageType === 'success' ? '#00D9AA33' : '#FF4D6D33',
                            borderColor: messageType === 'success' ? colors.accent : colors.error,
                            borderWidth: 1,
                        }}
                    >
                        <Text style={{ color: colors.textPrimary, fontWeight: '600', fontSize: 15 }}>{message}</Text>
                    </View>
                )}

                <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
                    <BackButton label="← Back" />

                    {/* Header */}
                    <View style={{ marginBottom: 28 }}>
                        <Badge label="New Account" />
                        <Text style={{ fontSize: 36, fontWeight: '800', color: colors.textPrimary, letterSpacing: -1.2, lineHeight: 40, marginBottom: 10 }}>
                            Create Your{'\n'}Profile
                        </Text>
                        <Text style={{ fontSize: 14, color: colors.textSecondary }}>
                            Join and access your timetable instantly
                        </Text>
                    </View>

                    {/* Step indicator */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 28 }}>
                        {steps.map((s, i) => (
                            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', flex: i < steps.length - 1 ? 1 : 0 }}>
                                <View style={{ alignItems: 'center', gap: 6 }}>
                                    <StepDot num={i + 1} active={step === i} done={step > i} />
                                    <Text style={{ fontSize: 11, color: step === i ? colors.primary : colors.textMuted, fontWeight: '600' }}>
                                        {s.label}
                                    </Text>
                                </View>
                                {i < steps.length - 1 && (
                                    <View
                                        style={{
                                            flex: 1, height: 2, marginHorizontal: 8, marginBottom: 16,
                                            backgroundColor: step > i ? colors.accent : colors.border,
                                            borderRadius: 2,
                                        }}
                                    />
                                )}
                            </View>
                        ))}
                    </View>

                    {/* Step 0: Identity */}
                    {step === 0 && (
                        <View style={cardStyle}>
                            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 }}>
                                🎓 Your Identity
                            </Text>
                            <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 20 }}>
                                Your university credentials
                            </Text>
                            <InputField label="Full Name" value={name} onChangeText={setName} placeholder="Enter your full name" icon="👤" autoCapitalize="words" />
                            <InputField label="URN (University Roll No.)" value={urn} onChangeText={setUrn} placeholder="e.g. 12345678" icon="🎓" keyboardType="numeric" />
                            <InputField label="CRN (Class Roll No.)" value={crn} onChangeText={setCrn} placeholder="e.g. 1234" icon="📋" keyboardType="numeric" />
                            <TouchableOpacity
                                style={[nextBtnStyle, (!name.trim() || !urn.trim() || !crn.trim()) && { opacity: 0.5 }]}
                                onPress={() => {
                                    if (!name.trim() || !urn.trim() || !crn.trim()) {
                                        Alert.alert('Missing fields', 'Please fill all fields to continue.');
                                        return;
                                    }
                                    setStep(1);
                                }}
                            >
                                <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>Continue</Text>
                                <Text style={{ fontSize: 16, color: '#fff', fontWeight: '700' }}>→</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Step 1: Security */}
                    {step === 1 && (
                        <View style={cardStyle}>
                            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 }}>
                                🔐 Set Password
                            </Text>
                            <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 20 }}>
                                Choose a secure password
                            </Text>
                            <InputField label="Password" value={password} onChangeText={setPassword} placeholder="Min. 6 characters" icon="🔒" secureTextEntry />
                            <View style={{ marginTop: 4, marginBottom: 20, gap: 6 }}>
                                {['6+ characters', 'Mix of letters & numbers', 'Easy to remember'].map((hint, i) => (
                                    <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        <Text style={{ fontSize: 16, color: password.length >= 6 && i === 0 ? colors.accent : colors.textMuted }}>•</Text>
                                        <Text style={{ fontSize: 13, color: password.length >= 6 && i === 0 ? colors.accent : colors.textMuted }}>{hint}</Text>
                                    </View>
                                ))}
                            </View>
                            <View style={{ flexDirection: 'row', gap: 12 }}>
                                <TouchableOpacity
                                    style={{ flex: 1, backgroundColor: colors.surface, borderRadius: 14, paddingVertical: 16, alignItems: 'center', borderWidth: 1.5, borderColor: colors.border }}
                                    onPress={() => setStep(0)}
                                >
                                    <Text style={{ fontSize: 15, fontWeight: '600', color: colors.textSecondary }}>← Back</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[{ ...nextBtnStyle, flex: 1 }, (!password.trim() || password.length < 6) && { opacity: 0.5 }]}
                                    onPress={() => {
                                        if (!password.trim() || password.length < 6) {
                                            Alert.alert('Weak password', 'Password must be at least 6 characters.');
                                            return;
                                        }
                                        setStep(2);
                                    }}
                                >
                                    <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>Continue →</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    {/* Step 2: Academic */}
                    {step === 2 && (
                        <View style={cardStyle}>
                            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 }}>
                                📚 Academic Info
                            </Text>
                            <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 20 }}>
                                Select your department and group
                            </Text>

                            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary, marginBottom: 7, letterSpacing: 0.8, textTransform: 'uppercase' }}>
                                Department
                            </Text>
                            <View style={{ borderWidth: 1.5, borderColor: colors.border, borderRadius: 14, backgroundColor: colors.bg, overflow: 'hidden', marginBottom: 16 }}>
                                <Picker selectedValue={department} onValueChange={setDepartment}
                                    style={{ color: colors.textPrimary, backgroundColor: 'transparent' }}
                                    dropdownIconColor={colors.textSecondary}>
                                    <Picker.Item label="Select Department" value="" color={colors.textMuted} />
                                    {departments.map((dept) => (
                                        <Picker.Item key={dept} label={dept.charAt(0).toUpperCase() + dept.slice(1)} value={dept} color={colors.textPrimary} />
                                    ))}
                                </Picker>
                            </View>

                            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary, marginBottom: 7, letterSpacing: 0.8, textTransform: 'uppercase' }}>
                                Group
                            </Text>
                            <View style={[{ borderWidth: 1.5, borderColor: colors.border, borderRadius: 14, backgroundColor: colors.bg, overflow: 'hidden' }, !department && { opacity: 0.5 }]}>
                                <Picker selectedValue={group} onValueChange={setGroup} enabled={!!department && groups.length > 0}
                                    style={{ color: colors.textPrimary, backgroundColor: 'transparent' }}
                                    dropdownIconColor={colors.textSecondary}>
                                    <Picker.Item
                                        label={!department ? 'Select department first' : groups.length ? 'Select Group' : 'No groups found'}
                                        value="" color={colors.textMuted}
                                    />
                                    {groups.map((grp) => (
                                        <Picker.Item key={grp} label={grp} value={grp} color={colors.textPrimary} />
                                    ))}
                                </Picker>
                            </View>

                            <View style={{ flexDirection: 'row', gap: 12, marginTop: 24 }}>
                                <TouchableOpacity
                                    style={{ flex: 1, backgroundColor: colors.surface, borderRadius: 14, paddingVertical: 16, alignItems: 'center', borderWidth: 1.5, borderColor: colors.border }}
                                    onPress={() => setStep(1)}
                                >
                                    <Text style={{ fontSize: 15, fontWeight: '600', color: colors.textSecondary }}>← Back</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[{ ...nextBtnStyle, flex: 1 }, (loading || !department || !group) && { opacity: 0.5 }]}
                                    onPress={handleRegister}
                                    disabled={loading || !department || !group}
                                >
                                    {loading
                                        ? <ActivityIndicator color="#fff" size="small" />
                                        : <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>Register 🎉</Text>
                                    }
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    {/* Sign in link */}
                    <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 4 }}>
                        <Text style={{ fontSize: 14, color: colors.textSecondary }}>Already registered? </Text>
                        <TouchableOpacity onPress={() => router.push('/login')}>
                            <Text style={{ fontSize: 14, color: colors.primary, fontWeight: '700' }}>Sign In</Text>
                        </TouchableOpacity>
                    </View>

                </Animated.View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}