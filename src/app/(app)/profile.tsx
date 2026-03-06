import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    KeyboardAvoidingView, Platform,
    ScrollView,
    Text, TextInput, TouchableOpacity,
    View,
} from 'react-native';
import BackButton from '../../components/layout/back-button';
import BgBlobs from '../../components/layout/bg-blobs';
import Badge from '../../components/ui/badge';
import { DEPARTMENT_OPTIONS } from '../../constants/theme';
import { useProfile } from '../../context/profile-context';
import { useThemeColors } from '../../context/theme-context';
import { clearSession } from '../../utils/auth-cache';

// static group lists (imported from web/group/*.json)
import appliedscienceGroups from '../../../web/group/appliedscience.json';
import bcaGroups from '../../../web/group/bca.json';
import civilGroups from '../../../web/group/civil.json';
import cseGroups from '../../../web/group/cse.json';
import eceGroups from '../../../web/group/ece.json';
import electricalGroups from '../../../web/group/electrical.json';
import itGroups from '../../../web/group/it.json';
import mechanicalGroups from '../../../web/group/mechanical.json';

// --- group loader ---------------------------------------------------------
const GROUP_MAP: Record<string, string[]> = {
    appliedscience: (appliedscienceGroups as unknown) as string[],
    bca: (bcaGroups as unknown) as string[],
    civil: (civilGroups as unknown) as string[],
    cse: (cseGroups as unknown) as string[],
    ece: (eceGroups as unknown) as string[],
    electrical: (electricalGroups as unknown) as string[],
    it: (itGroups as unknown) as string[],
    mechanical: (mechanicalGroups as unknown) as string[],
};

function loadGroupsForDept(department: string): string[] {
    return GROUP_MAP[department] ?? [];
}

export default function ProfileScreen() {
    const router = useRouter();
    const { colors, isDark } = useThemeColors();
    const { profile, saveProfile, clearProfile } = useProfile();

    const [name, setName] = useState('');
    const [department, setDepartment] = useState('cse');
    const [selectedGroup, setSelectedGroup] = useState('');
    const [availableGroups, setAvailableGroups] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(20)).current;
    const nameBorderAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
            Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 9, useNativeDriver: true }),
        ]).start();
    }, []);

    useEffect(() => {
        setLoading(true);
        const groups = loadGroupsForDept(department);
        setAvailableGroups(groups);
        setSelectedGroup('');
        setLoading(false);
    }, [department]);

    useEffect(() => {
        if (profile) {
            setName(profile.name ?? '');
            if (profile.group) setSelectedGroup(profile.group);
            if (profile.department) setDepartment(profile.department);
        }
    }, [profile]);

    const isValidGroup = availableGroups.length === 0 || availableGroups.includes(selectedGroup);
    const selectedDept = DEPARTMENT_OPTIONS.find(d => d.value === department);

    async function save() {
        if (!name.trim()) { Alert.alert('Missing Name', 'Please enter your full name.'); return; }
        if (!selectedGroup) { Alert.alert('No Group', 'Please select a group.'); return; }
        if (availableGroups.length > 0 && !isValidGroup) {
            Alert.alert('Invalid Group', `Group "${selectedGroup}" is not available.`);
            return;
        }
        setSaving(true);
        const success = await saveProfile({ name, department, group: selectedGroup });
        setSaving(false);
        if (success) {
            Alert.alert('✅ Profile Saved', 'Your profile has been updated!', [
                { text: 'View Timetable', onPress: () => router.push('/(app)/timetable') },
                { text: 'Done', onPress: () => router.push('/(app)/home') },
            ]);
        } else {
            Alert.alert('Error', 'Failed to save profile. Please try again.');
        }
    }

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

    const borderColor = nameBorderAnim.interpolate({ inputRange: [0, 1], outputRange: [colors.border, colors.primary] });

    const cardStyle = {
        backgroundColor: colors.surface, borderRadius: 20, padding: 20,
        borderWidth: 1, borderColor: colors.border, marginBottom: 16,
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
                    <BackButton label="← Home" onPress={() => router.push('/(app)/home')} />

                    {/* Header */}
                    <View style={{ marginBottom: 28 }}>
                        <Badge label="Profile Setup" />
                        <Text style={{ fontSize: 34, fontWeight: '800', color: colors.textPrimary, letterSpacing: -1, lineHeight: 38, marginBottom: 10 }}>
                            Your Academic{'\n'}Profile
                        </Text>
                        <Text style={{ fontSize: 14, color: colors.textSecondary }}>
                            Set your details to get a personalized timetable
                        </Text>
                    </View>

                    {/* Name card */}
                    <View style={cardStyle}>
                        <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 }}>
                            👤 Personal Info
                        </Text>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary, marginBottom: 8, marginTop: 12, letterSpacing: 0.8, textTransform: 'uppercase' }}>
                            Full Name
                        </Text>
                        <Animated.View
                            style={{
                                flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 14,
                                backgroundColor: colors.bg, paddingHorizontal: 16, height: 54, borderColor,
                            }}
                        >
                            <TextInput
                                style={{ flex: 1, fontSize: 15, color: colors.textPrimary, fontWeight: '500' }}
                                value={name}
                                onChangeText={setName}
                                placeholder="Enter your full name"
                                placeholderTextColor={colors.textMuted}
                                onFocus={() => Animated.timing(nameBorderAnim, { toValue: 1, duration: 200, useNativeDriver: false }).start()}
                                onBlur={() => Animated.timing(nameBorderAnim, { toValue: 0, duration: 200, useNativeDriver: false }).start()}
                            />
                        </Animated.View>
                    </View>

                    {/* Department card */}
                    <View style={cardStyle}>
                        <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 }}>
                            🏛️ Department
                        </Text>
                        <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 16 }}>Select your department</Text>

                        {/* Allow changing department only when currently selected dept is "appliedscience" */}
                        {department === 'appliedscience' ? (
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                                {DEPARTMENT_OPTIONS.map((opt) => {
                                    const isSel = department === opt.value;
                                    return (
                                        <TouchableOpacity
                                            key={opt.value}
                                            style={{
                                                paddingVertical: 10, paddingHorizontal: 14, borderRadius: 14,
                                                borderWidth: 1.5, flexDirection: 'row', alignItems: 'center', gap: 6,
                                                borderColor: isSel ? colors.primary : colors.border,
                                                backgroundColor: isSel ? colors.primary + '15' : colors.bg,
                                            }}
                                            onPress={() => setDepartment(opt.value)}
                                            activeOpacity={0.8}
                                        >
                                            <Text style={{ fontSize: 14 }}>{opt.emoji}</Text>
                                            <Text style={{ fontSize: 13, fontWeight: '600', color: isSel ? colors.primary : colors.textSecondary }}>
                                                {opt.label}
                                            </Text>
                                            {isSel && <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary, marginLeft: 4 }} />}
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        ) : (
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                    <Text style={{ fontSize: 18 }}>{selectedDept?.emoji ?? '🏛️'}</Text>
                                    <Text style={{ fontSize: 15, fontWeight: '700', color: colors.textPrimary }}>{selectedDept?.label ?? department}</Text>
                                </View>
 
                            </View>
                        )}
                    </View>

                    {/* Group card */}
                    <View style={cardStyle}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textPrimary }}>📋 Select Group</Text>
                            {selectedDept && (
                                <View style={{ backgroundColor: colors.primary + '20', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: colors.primary + '30' }}>
                                    <Text style={{ fontSize: 11, color: colors.primary, fontWeight: '600' }}>
                                        {selectedDept.emoji} {selectedDept.label}
                                    </Text>
                                </View>
                            )}
                        </View>
                        <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 16 }}>Choose your class group</Text>

                        {loading ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 }}>
                                <ActivityIndicator color={colors.primary} size="small" />
                                <Text style={{ fontSize: 13, color: colors.textSecondary }}>Loading groups...</Text>
                            </View>
                        ) : availableGroups.length === 0 ? (
                            <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                                <Text style={{ fontSize: 13, color: colors.textMuted }}>No groups found for this department</Text>
                            </View>
                        ) : (
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                                {availableGroups.map((group) => {
                                    const isSel = selectedGroup === group;
                                    return (
                                        <TouchableOpacity
                                            key={group}
                                            style={{
                                                paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1.5,
                                                minWidth: 60, alignItems: 'center',
                                                borderColor: isSel ? colors.primary : colors.border,
                                                backgroundColor: isSel ? colors.primary + '20' : colors.bg,
                                            }}
                                            onPress={() => setSelectedGroup(group)}
                                            activeOpacity={0.8}
                                        >
                                            <Text style={{ fontSize: 14, fontWeight: '700', color: isSel ? colors.primary : colors.textSecondary }}>
                                                {group}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        )}
                    </View>

                    {/* Summary */}
                    {selectedGroup ? (
                        <View
                            style={{
                                borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1.5,
                                backgroundColor: isValidGroup ? '#00D9AA12' : '#FF4D6D12',
                                borderColor: isValidGroup ? '#00D9AA30' : '#FF4D6D30',
                            }}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                <Text style={{ fontSize: 20 }}>{isValidGroup ? '✅' : '❌'}</Text>
                                <View>
                                    <Text style={{ fontSize: 11, color: colors.textSecondary, marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '600' }}>
                                        {isValidGroup ? 'Selected Group' : 'Invalid Group'}
                                    </Text>
                                    <Text style={{ fontSize: 18, fontWeight: '800', color: isValidGroup ? colors.accent : colors.error }}>
                                        {selectedGroup}
                                    </Text>
                                </View>
                            </View>
                            {!isValidGroup && (
                                <Text style={{ fontSize: 12, color: colors.error, marginTop: 8 }}>
                                    This group is not available in the timetable.
                                </Text>
                            )}
                        </View>
                    ) : null}

                    {/* Save button */}
                    <TouchableOpacity
                        style={[
                            {
                                backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 18, alignItems: 'center',
                                shadowColor: '#6C63FF', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 8,
                            },
                            (saving || !name.trim() || !selectedGroup) && { opacity: 0.5 },
                        ]}
                        onPress={save}
                        disabled={saving || !name.trim() || !selectedGroup}
                        activeOpacity={0.85}
                    >
                        {saving
                            ? <ActivityIndicator color="#fff" size="small" />
                            : <Text style={{ fontSize: 17, fontWeight: '700', color: '#fff', letterSpacing: 0.3 }}>Save Profile →</Text>
                        }
                    </TouchableOpacity>

                    {/* Logout button */}
                    <TouchableOpacity
                        style={{
                            marginTop: 16, borderRadius: 16, paddingVertical: 16, alignItems: 'center',
                            borderWidth: 1.5, borderColor: colors.error + '60',
                            backgroundColor: colors.error + '10',
                            flexDirection: 'row', justifyContent: 'center', gap: 8,
                        }}
                        onPress={handleLogout}
                        activeOpacity={0.8}
                    >
                        <Text style={{ fontSize: 16 }}>🚪</Text>
                        <Text style={{ fontSize: 15, fontWeight: '700', color: colors.error }}>Log Out</Text>
                    </TouchableOpacity>

                </Animated.View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}