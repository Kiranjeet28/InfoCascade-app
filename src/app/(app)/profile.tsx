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
import AppIcon from '../../components/app-icon';
import BackButton from '../../components/layout/back-button';
import BgBlobs from '../../components/layout/bg-blobs';
import Badge from '../../components/ui/badge';
import { DEPARTMENT_OPTIONS } from '../../constants/theme';
import { useProfile } from '../../context/profile-context';
import { useThemeColors } from '../../context/theme-context';

// Load group lists from GitHub repository
const GITHUB_RAW_URL = 'https://raw.githubusercontent.com/Kiranjeet28/infocascade-data/main/web/group';
const GROUP_CACHE: Record<string, string[]> = {};

async function loadGroupsForDept(department: string): Promise<string[]> {
    if (GROUP_CACHE[department]) {
        return GROUP_CACHE[department];
    }
    try {
        const res = await fetch(`${GITHUB_RAW_URL}/${department}.json`);
        if (res.ok) {
            const groups = await res.json();
            GROUP_CACHE[department] = groups;
            return groups;
        }
    } catch (e) {
        console.warn(`Failed to load groups for ${department}:`, e);
    }
    return [];
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
            Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: false }),
            Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 9, useNativeDriver: false }),
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
        const success = await saveProfile({
            name,
            department,
            group: selectedGroup,
            email: '',
            urn: '',
            crn: ''
        });
        setSaving(false);
        if (success) {
            Alert.alert('Profile Saved', 'Your profile has been updated!', [
                { text: 'View Timetable', onPress: () => router.push('/(app)/timetable') },
                { text: 'Done', onPress: () => router.push('/(app)/home') },
            ]);
        } else {
            Alert.alert('Error', 'Failed to save profile. Please try again.');
        }
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
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                        <BackButton label="Home" onPress={() => router.push('/(app)/home')} />
                        <TouchableOpacity
                            style={{
                                backgroundColor: colors.primary + '15',
                                borderRadius: 10,
                                padding: 8,
                                borderWidth: 1,
                                borderColor: colors.primary + '30',
                            }}
                            onPress={() => router.push('/(settings)/settings')}
                            activeOpacity={0.7}
                        >
                            <AppIcon family="MaterialCommunityIcons" name="cog" size={20} color={colors.primary} />
                        </TouchableOpacity>
                    </View>

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
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <AppIcon family="MaterialCommunityIcons" name="account" size={18} color={colors.textPrimary} />
                            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textPrimary }}>
                                Personal Info
                            </Text>
                        </View>
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
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <AppIcon family="MaterialCommunityIcons" name="school" size={18} color={colors.textPrimary} />
                            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textPrimary }}>
                                Department
                            </Text>
                        </View>
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
                                            <AppIcon
                                                family={(opt as any).icon.family}
                                                name={(opt as any).icon.name}
                                                size={16}
                                                color={isSel ? colors.primary : colors.textSecondary}
                                            />
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
                                    <AppIcon
                                        family={(selectedDept as any)?.icon?.family ?? 'MaterialCommunityIcons'}
                                        name={(selectedDept as any)?.icon?.name ?? 'school'}
                                        size={18}
                                        color={colors.textPrimary}
                                    />
                                    <Text style={{ fontSize: 15, fontWeight: '700', color: colors.textPrimary }}>{selectedDept?.label ?? department}</Text>
                                </View>

                            </View>
                        )}
                    </View>

                    {/* Group card */}
                    <View style={cardStyle}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <AppIcon family="Ionicons" name="clipboard" size={16} color={colors.textPrimary} />
                                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textPrimary }}>Select Group</Text>
                            </View>
                            {selectedDept && (
                                <View style={{ backgroundColor: colors.primary + '20', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: colors.primary + '30' }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                        <AppIcon family={(selectedDept as any).icon.family} name={(selectedDept as any).icon.name} size={12} color={colors.primary} />
                                        <Text style={{ fontSize: 11, color: colors.primary, fontWeight: '600' }}>
                                            {selectedDept.label}
                                        </Text>
                                    </View>
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
                                <AppIcon name={isValidGroup ? 'check-circle' : 'close-circle'} family="MaterialCommunityIcons" size={20} color={isValidGroup ? colors.success : colors.error} />
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
                                boxShadow: '0px 8px 16px rgba(108,99,255,0.35)', elevation: 8,
                            },
                            (saving || !name.trim() || !selectedGroup) && { opacity: 0.5 },
                        ]}
                        onPress={save}
                        disabled={saving || !name.trim() || !selectedGroup}
                        activeOpacity={0.85}
                    >
                        {saving
                            ? <ActivityIndicator color="#fff" size="small" />
                            : <Text style={{ fontSize: 17, fontWeight: '700', color: '#fff', letterSpacing: 0.3 }}>Save Profile</Text>
                        }
                    </TouchableOpacity>

                </Animated.View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}