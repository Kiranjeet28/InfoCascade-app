import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  StyleSheet, 
  Alert, 
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PrimaryButton from '../components/PrimaryButton';
import colors from '../constants/colors';

// Year options based on timetable data (D2, D3, D4 = 2nd, 3rd, 4th year)
const YEAR_OPTIONS = [
  { label: '2nd Year', value: 'D2' },
  { label: '3rd Year', value: 'D3' },
  { label: '4th Year', value: 'D4' },
];

// Section options (A, B, C, D, E, F)
const SECTION_OPTIONS = [
  { label: 'A', value: 'A' },
  { label: 'B', value: 'B' },
  { label: 'C', value: 'C' },
  { label: 'D', value: 'D' },
  { label: 'E', value: 'E' },
  { label: 'F', value: 'F' },
];

// Subgroup options (1 or 2)
const SUBGROUP_OPTIONS = [
  { label: 'Group 1', value: '1' },
  { label: 'Group 2', value: '2' },
];

export default function StudentForm({ navigate }) {
  const [name, setName] = useState('');
  const [year, setYear] = useState('D2');
  const [section, setSection] = useState('A');
  const [subgroup, setSubgroup] = useState('1');
  const [availableGroups, setAvailableGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load timetable data to get available groups
  useEffect(() => {
    (async () => {
      try {
        const resp = await fetch('/timetable_cse.json');
        if (resp.ok) {
          const json = await resp.json();
          if (json.timetable) {
            const groups = Object.keys(json.timetable);
            setAvailableGroups(groups);
          }
        }
      } catch (e) {
        console.warn('Failed to load timetable:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Load saved profile
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('@tt/profile');
        if (!raw) return;
        const p = JSON.parse(raw);
        setName(p.name || '');
        // Parse the group format (e.g., "D2A1" -> year: D2, section: A, subgroup: 1)
        if (p.group) {
          const match = p.group.match(/^(D\d)([A-F])(\d)$/);
          if (match) {
            setYear(match[1]);
            setSection(match[2]);
            setSubgroup(match[3]);
          }
        }
      } catch (e) {
        console.warn(e);
      }
    })();
  }, []);

  // Compute the full group code
  const groupCode = `${year}${section}${subgroup}`;
  const isValidGroup = availableGroups.length === 0 || availableGroups.includes(groupCode);

  async function save() {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }
    if (availableGroups.length > 0 && !isValidGroup) {
      Alert.alert('Error', `Group ${groupCode} is not available in the timetable. Please select a valid combination.`);
      return;
    }
    try {
      await AsyncStorage.setItem('@tt/profile', JSON.stringify({ 
        name, 
        year, 
        section,
        subgroup,
        group: groupCode 
      }));
      Alert.alert('Saved', 'Profile saved successfully!');
      navigate('home');
    } catch (e) {
      Alert.alert('Error', String(e));
    }
  }

  // Check which sections are available for selected year
  const getAvailableSections = () => {
    if (availableGroups.length === 0) return SECTION_OPTIONS;
    return SECTION_OPTIONS.filter(opt => 
      availableGroups.some(g => g.startsWith(`${year}${opt.value}`))
    );
  };

  const availableSections = getAvailableSections();

  return (
    <KeyboardAvoidingView 
      style={styles.keyboardView}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Student Profile</Text>
            <Text style={styles.subtitle}>Enter your details to get personalized CSE timetable</Text>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
          ) : (
            <>
              {/* Form Card */}
              <View style={styles.formCard}>
                {/* Name Input */}
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Full Name</Text>
                  <TextInput 
                    style={styles.input} 
                    value={name} 
                    onChangeText={setName}
                    placeholder="Enter your name"
                    placeholderTextColor={colors.muted}
                  />
                </View>

                {/* Year Selection */}
                <View style={styles.sectionContainer}>
                  <Text style={styles.label}>Select Year</Text>
                  <View style={styles.optionsRow}>
                    {YEAR_OPTIONS.map((option) => (
                      <TouchableOpacity
                        key={option.value}
                        style={[
                          styles.optionButton,
                          year === option.value && styles.optionButtonSelected
                        ]}
                        onPress={() => {
                          setYear(option.value);
                          // Reset section if not available for new year
                          const newAvailableSections = SECTION_OPTIONS.filter(opt => 
                            availableGroups.some(g => g.startsWith(`${option.value}${opt.value}`))
                          );
                          if (newAvailableSections.length > 0 && !newAvailableSections.find(s => s.value === section)) {
                            setSection(newAvailableSections[0].value);
                          }
                        }}
                      >
                        <Text style={[
                          styles.optionText,
                          year === option.value && styles.optionTextSelected
                        ]}>
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Section Selection */}
                <View style={styles.sectionContainer}>
                  <Text style={styles.label}>Select Section</Text>
                  <View style={styles.sectionGrid}>
                    {availableSections.map((option) => (
                      <TouchableOpacity
                        key={option.value}
                        style={[
                          styles.sectionCard,
                          section === option.value && styles.sectionCardSelected
                        ]}
                        onPress={() => setSection(option.value)}
                      >
                        <View style={[
                          styles.sectionIndicator,
                          section === option.value && styles.sectionIndicatorSelected
                        ]}>
                          <Text style={[
                            styles.sectionLetter,
                            section === option.value && styles.sectionLetterSelected
                          ]}>
                            {option.value}
                          </Text>
                        </View>
                        <Text style={[
                          styles.sectionLabel,
                          section === option.value && styles.sectionLabelSelected
                        ]}>
                          Section {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Subgroup Selection */}
                <View style={styles.sectionContainer}>
                  <Text style={styles.label}>Select Subgroup (for Labs)</Text>
                  <Text style={styles.hint}>Your lab batch assignment</Text>
                  <View style={styles.subgroupRow}>
                    {SUBGROUP_OPTIONS.map((option) => (
                      <TouchableOpacity
                        key={option.value}
                        style={[
                          styles.subgroupCard,
                          subgroup === option.value && styles.subgroupCardSelected
                        ]}
                        onPress={() => setSubgroup(option.value)}
                      >
                        <Text style={[
                          styles.subgroupNumber,
                          subgroup === option.value && styles.subgroupNumberSelected
                        ]}>
                          {option.value}
                        </Text>
                        <Text style={[
                          styles.subgroupLabel,
                          subgroup === option.value && styles.subgroupLabelSelected
                        ]}>
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Selected Group Display */}
                <View style={styles.groupDisplay}>
                  <Text style={styles.groupDisplayLabel}>Your Group Code:</Text>
                  <View style={[
                    styles.groupCodeBox,
                    !isValidGroup && styles.groupCodeBoxInvalid
                  ]}>
                    <Text style={[
                      styles.groupCodeText,
                      !isValidGroup && styles.groupCodeTextInvalid
                    ]}>
                      {groupCode}
                    </Text>
                  </View>
                  {!isValidGroup && (
                    <Text style={styles.invalidText}>
                      This group is not available in the timetable
                    </Text>
                  )}
                </View>
              </View>

              {/* Save Button */}
              <View style={styles.buttonWrap}>
                <PrimaryButton title="Save Profile" onPress={save} />
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: { 
    flex: 1, 
    padding: 20,
  },
  header: {
    marginBottom: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  inputContainer: {
    marginBottom: 20,
  },
  sectionContainer: {
    marginBottom: 24,
  },
  label: { 
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 10,
  },
  hint: {
    fontSize: 13,
    color: colors.muted,
    marginBottom: 12,
  },
  input: { 
    borderWidth: 1.5, 
    borderColor: '#e0e0e0', 
    padding: 14, 
    borderRadius: 12,
    fontSize: 16,
    backgroundColor: '#fafafa',
    color: colors.text,
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  optionButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    backgroundColor: '#fafafa',
    marginRight: 10,
    marginBottom: 8,
  },
  optionButtonSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  optionText: {
    fontSize: 15,
    color: colors.text,
    fontWeight: '600',
  },
  optionTextSelected: {
    color: '#fff',
  },
  sectionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  sectionCard: {
    width: '31%',
    backgroundColor: '#fafafa',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  sectionCardSelected: {
    backgroundColor: '#e6f0ff',
    borderColor: colors.primary,
  },
  sectionIndicator: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionIndicatorSelected: {
    backgroundColor: colors.primary,
  },
  sectionLetter: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.muted,
  },
  sectionLetterSelected: {
    color: '#fff',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  sectionLabelSelected: {
    color: colors.primary,
  },
  subgroupRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  subgroupCard: {
    width: '48%',
    backgroundColor: '#fafafa',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  subgroupCardSelected: {
    backgroundColor: '#e6f0ff',
    borderColor: colors.primary,
  },
  subgroupNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.muted,
    marginBottom: 4,
  },
  subgroupNumberSelected: {
    color: colors.primary,
  },
  subgroupLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  subgroupLabelSelected: {
    color: colors.primary,
  },
  groupDisplay: {
    marginTop: 10,
    alignItems: 'center',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  groupDisplayLabel: {
    fontSize: 14,
    color: colors.muted,
    marginBottom: 10,
  },
  groupCodeBox: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 10,
  },
  groupCodeBoxInvalid: {
    backgroundColor: '#ff6b6b',
  },
  groupCodeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  groupCodeTextInvalid: {
    color: '#fff',
  },
  invalidText: {
    fontSize: 12,
    color: '#ff6b6b',
    marginTop: 8,
  },
  buttonWrap: { 
    marginTop: 24, 
    alignSelf: 'center',
    width: '80%',
  },
});
