import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    KeyboardAvoidingView, Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text, TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import appliedscienceGroups from '../../../web/group/appliedscience.json';
import bcaGroups from '../../../web/group/bca.json';
import civilGroups from '../../../web/group/civil.json';
import cseGroups from '../../../web/group/cse.json';
import eceGroups from '../../../web/group/ece.json';
import electricalGroups from '../../../web/group/electrical.json';
import itGroups from '../../../web/group/it.json';
import mechanicalGroups from '../../../web/group/mechanical.json';
import { useProfile } from '../../context/profile-context';
const theme = {
    bg: '#0D0F14',
    surface: '#161923',
    surfaceElevated: '#1E2330',
    border: '#252A38',
    primary: '#6C63FF',
    accent: '#00D9AA',
    textPrimary: '#F0F2FF',
    textSecondary: '#8892AA',
    textMuted: '#535D78',
    error: '#FF4D6D',
};

const DEPARTMENT_OPTIONS = [
    { label: 'CSE', value: 'cse', emoji: '💻' },
    { label: 'IT', value: 'it', emoji: '🌐' },
    { label: 'ECE', value: 'ece', emoji: '📡' },
    { label: 'Electrical', value: 'electrical', emoji: '⚡' },
    { label: 'Mechanical', value: 'mechanical', emoji: '⚙️' },
    { label: 'Civil', value: 'civil', emoji: '🏗️' },
    { label: 'Applied Science', value: 'appliedscience', emoji: '📊' },
    { label: 'BCA', value: 'bca', emoji: '🎓' },
];

export default function StudentForm() {
    const router = useRouter();
    const { profile, saveProfile } = useProfile();
    const [name, setName] = useState('');
    const [department, setDepartment] = useState('cse');
    const [selectedGroup, setSelectedGroup] = useState('');
    const [availableGroups, setAvailableGroups] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [nameFocused, setNameFocused] = useState(false);

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
        let groups: string[] = [];
        switch (department) {
            case 'cse':
                groups = cseGroups;
                break;
            case 'bca':
                groups = bcaGroups;
                break;
            case 'it':
                groups = itGroups;
                break;
            case 'ece':
                groups = eceGroups;
                break;
            case 'electrical':
                groups = electricalGroups;
                break;
            case 'mechanical':
                groups = mechanicalGroups;
                break;
            case 'civil':
                groups = civilGroups;
                break;
            case 'ca':
                groups = appliedscienceGroups;
                break;
            default:
                groups = [];
        }
        setAvailableGroups(groups);
        setSelectedGroup('');
        setLoading(false);
    }, [department]);

    useEffect(() => {
        if (profile) {
            setName(profile.name || '');
            if (profile.group) setSelectedGroup(profile.group);
            if (profile.department) setDepartment(profile.department);
        }
    }, [profile]);

    const isValidGroup = availableGroups.length === 0 || availableGroups.includes(selectedGroup);

    async function save() {
        if (!name.trim()) { Alert.alert('Missing Name', 'Please enter your full name to continue.'); return; }
        if (!selectedGroup) { Alert.alert('No Group Selected', 'Please select a group from the list.'); return; }
        if (availableGroups.length > 0 && !isValidGroup) {
            Alert.alert('Invalid Group', `Group "${selectedGroup}" is not available. Please select a valid group.`);
            return;
        }
        setSaving(true);
        const success = await saveProfile({ name, department, group: selectedGroup });
        setSaving(false);
        if (success) {
            Alert.alert('✅ Profile Saved', 'Your profile has been updated successfully!', [
                { text: 'View Timetable', onPress: () => router.push('/timetable') },
                { text: 'Done', onPress: () => router.push('/home') },
            ]);
        } else {
            Alert.alert('Error', 'Failed to save profile. Please try again.');
        }
    }

    const selectedDept = DEPARTMENT_OPTIONS.find(d => d.value === department);

    return (
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <StatusBar barStyle="light-content" backgroundColor={theme.bg} />
            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.bgBlob1} />
                <View style={styles.bgBlob2} />

                <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
                    {/* Back */}
                    <TouchableOpacity style={styles.backBtn} onPress={() => router.push('/home')}>
                        <Text style={styles.backText}>← Home</Text>
                    </TouchableOpacity>

                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>Profile Setup</Text>
                        </View>
                        <Text style={styles.title}>Your Academic{'\n'}Profile</Text>
                        <Text style={styles.subtitle}>Set your details to get a personalized timetable</Text>
                    </View>

                    {/* Name Card */}
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>👤 Personal Info</Text>
                        <Text style={styles.inputLabel}>Full Name</Text>
                        <Animated.View style={[
                            styles.inputWrap,
                            {
                                borderColor: nameBorderAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [theme.border, theme.primary],
                                })
                            }
                        ]}>
                            <TextInput
                                style={styles.input}
                                value={name}
                                onChangeText={setName}
                                placeholder="Enter your full name"
                                placeholderTextColor={theme.textMuted}
                                onFocus={() => {
                                    setNameFocused(true);
                                    Animated.timing(nameBorderAnim, { toValue: 1, duration: 200, useNativeDriver: false }).start();
                                }}
                                onBlur={() => {
                                    setNameFocused(false);
                                    Animated.timing(nameBorderAnim, { toValue: 0, duration: 200, useNativeDriver: false }).start();
                                }}
                            />
                        </Animated.View>
                    </View>

                    {/* Department Card */}
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>🏛️ Department</Text>
                        <Text style={styles.cardSubtitle}>Select your department</Text>
                        <View style={styles.deptGrid}>
                            {DEPARTMENT_OPTIONS.map((opt) => {
                                const isSelected = department === opt.value;
                                return (
                                    <TouchableOpacity
                                        key={opt.value}
                                        style={[styles.deptCard, isSelected && styles.deptCardSelected]}
                                        onPress={() => setDepartment(opt.value)}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={styles.deptEmoji}>{opt.emoji}</Text>
                                        <Text style={[styles.deptLabel, isSelected && styles.deptLabelSelected]}>{opt.label}</Text>
                                        {isSelected && <View style={styles.deptCheckDot} />}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>

                    {/* Group Card */}
                    <View style={styles.card}>
                        <View style={styles.groupCardHeader}>
                            <Text style={styles.cardTitle}>📋 Select Group</Text>
                            {selectedDept && (
                                <View style={styles.deptPill}>
                                    <Text style={styles.deptPillText}>{selectedDept.emoji} {selectedDept.label}</Text>
                                </View>
                            )}
                        </View>
                        <Text style={styles.cardSubtitle}>Choose your class group</Text>

                        {loading ? (
                            <View style={styles.loadingWrap}>
                                <ActivityIndicator color={theme.primary} size="small" />
                                <Text style={styles.loadingText}>Loading groups...</Text>
                            </View>
                        ) : availableGroups.length === 0 ? (
                            <View style={styles.noGroupsWrap}>
                                <Text style={styles.noGroupsText}>No groups found for this department</Text>
                            </View>
                        ) : (
                            <View style={styles.groupGrid}>
                                {availableGroups.map((group) => {
                                    const isSelected = selectedGroup === group;
                                    return (
                                        <TouchableOpacity
                                            key={group}
                                            style={[styles.groupCard, isSelected && styles.groupCardSelected]}
                                            onPress={() => setSelectedGroup(group)}
                                            activeOpacity={0.8}
                                        >
                                            <Text style={[styles.groupText, isSelected && styles.groupTextSelected]}>{group}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        )}
                    </View>

                    {/* Selected Summary */}
                    {selectedGroup ? (
                        <View style={[styles.summaryCard, !isValidGroup && styles.summaryCardError]}>
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryIcon}>{isValidGroup ? '✅' : '❌'}</Text>
                                <View>
                                    <Text style={styles.summaryLabel}>{isValidGroup ? 'Selected Group' : 'Invalid Group'}</Text>
                                    <Text style={[styles.summaryValue, !isValidGroup && { color: theme.error }]}>{selectedGroup}</Text>
                                </View>
                            </View>
                            {!isValidGroup && (
                                <Text style={styles.invalidMsg}>This group is not available in the timetable.</Text>
                            )}
                        </View>
                    ) : null}

                    {/* Save Button */}
                    <TouchableOpacity
                        style={[styles.saveBtn, (saving || !name.trim() || !selectedGroup) && styles.saveBtnDisabled]}
                        onPress={save}
                        disabled={saving || !name.trim() || !selectedGroup}
                        activeOpacity={0.85}
                    >
                        {saving ? (
                            <ActivityIndicator color="#fff" size="small" />
                        ) : (
                            <Text style={styles.saveBtnText}>Save Profile →</Text>
                        )}
                    </TouchableOpacity>
                </Animated.View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    flex: { flex: 1 },
    container: { flex: 1, backgroundColor: theme.bg },
    scrollContent: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 40 },
    bgBlob1: {
        position: 'absolute', width: 280, height: 280, borderRadius: 140,
        backgroundColor: '#6C63FF', opacity: 0.06, top: -60, right: -80,
    },
    bgBlob2: {
        position: 'absolute', width: 200, height: 200, borderRadius: 100,
        backgroundColor: '#00D9AA', opacity: 0.05, bottom: 200, left: -60,
    },
    backBtn: { alignSelf: 'flex-start', marginBottom: 28, paddingVertical: 6 },
    backText: { fontSize: 15, color: theme.textSecondary, fontWeight: '500' },
    header: { marginBottom: 28 },
    badge: {
        alignSelf: 'flex-start', backgroundColor: '#6C63FF20', borderRadius: 8,
        paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: '#6C63FF40', marginBottom: 12,
    },
    badgeText: { fontSize: 11, fontWeight: '700', color: theme.primary, letterSpacing: 1, textTransform: 'uppercase' },
    title: { fontSize: 34, fontWeight: '800', color: theme.textPrimary, letterSpacing: -1, lineHeight: 38, marginBottom: 10 },
    subtitle: { fontSize: 14, color: theme.textSecondary },
    card: {
        backgroundColor: theme.surface, borderRadius: 20, padding: 20,
        borderWidth: 1, borderColor: theme.border, marginBottom: 16,
    },
    cardTitle: { fontSize: 16, fontWeight: '700', color: theme.textPrimary, marginBottom: 4 },
    cardSubtitle: { fontSize: 12, color: theme.textSecondary, marginBottom: 16 },
    inputLabel: { fontSize: 12, fontWeight: '700', color: theme.textSecondary, marginBottom: 8, letterSpacing: 0.8, textTransform: 'uppercase', marginTop: 12 },
    inputWrap: {
        flexDirection: 'row', alignItems: 'center', borderWidth: 1.5,
        borderRadius: 14, backgroundColor: theme.bg, paddingHorizontal: 16, height: 54,
    },
    input: { flex: 1, fontSize: 15, color: theme.textPrimary, fontWeight: '500' },
    deptGrid: {
        flexDirection: 'row', flexWrap: 'wrap', gap: 10,
    },
    deptCard: {
        paddingVertical: 10, paddingHorizontal: 14, borderRadius: 14,
        borderWidth: 1.5, borderColor: theme.border, backgroundColor: theme.bg,
        flexDirection: 'row', alignItems: 'center', gap: 6, position: 'relative',
    },
    deptCardSelected: {
        borderColor: theme.primary, backgroundColor: '#6C63FF15',
    },
    deptEmoji: { fontSize: 14 },
    deptLabel: { fontSize: 13, fontWeight: '600', color: theme.textSecondary },
    deptLabelSelected: { color: theme.primary },
    deptCheckDot: {
        width: 6, height: 6, borderRadius: 3, backgroundColor: theme.primary, marginLeft: 4,
    },
    groupCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
    deptPill: {
        backgroundColor: '#6C63FF20', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4,
        borderWidth: 1, borderColor: '#6C63FF30',
    },
    deptPillText: { fontSize: 11, color: theme.primary, fontWeight: '600' },
    loadingWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
    loadingText: { fontSize: 13, color: theme.textSecondary },
    noGroupsWrap: { paddingVertical: 16, alignItems: 'center' },
    noGroupsText: { fontSize: 13, color: theme.textMuted },
    groupGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    groupCard: {
        paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12,
        borderWidth: 1.5, borderColor: theme.border, backgroundColor: theme.bg,
        minWidth: 60, alignItems: 'center',
    },
    groupCardSelected: { borderColor: theme.primary, backgroundColor: '#6C63FF20' },
    groupText: { fontSize: 14, fontWeight: '700', color: theme.textSecondary },
    groupTextSelected: { color: theme.primary },
    summaryCard: {
        backgroundColor: '#00D9AA12', borderRadius: 16, padding: 16, marginBottom: 16,
        borderWidth: 1.5, borderColor: '#00D9AA30',
    },
    summaryCardError: { backgroundColor: '#FF4D6D12', borderColor: '#FF4D6D30' },
    summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    summaryIcon: { fontSize: 20 },
    summaryLabel: { fontSize: 11, color: theme.textSecondary, marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '600' },
    summaryValue: { fontSize: 18, fontWeight: '800', color: theme.accent },
    invalidMsg: { fontSize: 12, color: theme.error, marginTop: 8 },
    saveBtn: {
        backgroundColor: theme.primary, borderRadius: 16, paddingVertical: 18, alignItems: 'center',
        shadowColor: '#6C63FF', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 8,
    },
    saveBtnDisabled: { opacity: 0.5 },
    saveBtnText: { fontSize: 17, fontWeight: '700', color: '#fff', letterSpacing: 0.3 },
});
