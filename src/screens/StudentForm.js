import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PrimaryButton from '../components/PrimaryButton';

export default function StudentForm({ navigate }) {
  const [name, setName] = useState('');
  const [year, setYear] = useState('D2CSE');
  const [group, setGroup] = useState('D2 CS A');

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('@tt/profile');
        if (!raw) return;
        const p = JSON.parse(raw);
        setName(p.name || '');
        setYear(p.year || 'D2CSE');
        setGroup(p.group || 'D2 CS A');
      } catch (e) {
        console.warn(e);
      }
    })();
  }, []);

  async function save() {
    try {
      await AsyncStorage.setItem('@tt/profile', JSON.stringify({ name, year, group }));
      Alert.alert('Saved', 'Profile saved');
      navigate('home');
    } catch (e) {
      Alert.alert('Error', String(e));
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Name</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} />

      <Text style={styles.label}>Year</Text>
      <TextInput style={styles.input} value={year} onChangeText={setYear} />

      <Text style={styles.label}>Group</Text>
      <TextInput style={styles.input} value={group} onChangeText={setGroup} />

      <View style={styles.buttonWrap}>
        <PrimaryButton title="Save" onPress={save} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  label: { marginTop: 12, fontWeight: '600' },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 8, marginTop: 6 },
  buttonWrap: { marginTop: 16, width: '60%' }
});
