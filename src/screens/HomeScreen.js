import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import Header from '../components/Header';
import PrimaryButton from '../components/PrimaryButton';

export default function HomeScreen({ navigate }) {
  // Manual options (static) — derived from the provided table of contents
  const options = {
    D2CSE: ['D2 CS A','D2 CS B','D2 CS C','D2 CS D','D2 CS E','D2 CS F'],
    D3CSE: ['D3 CS A','D3 CS B','D3 CS C','D3 CS D','D3 CS E'],
    D4CSE: ['D4 CS A','D4 CS B','D4 CS C'],
    M1: ['M1 Automatic Group'],
    M3: ['M3 Automatic Group'],
    'Ph.D': ['Ph.D Automatic Group'],
    'D1 CS A': ['D1 CS A1','D1 CS A2'],
    'D1 CS B': ['D1 CS B1','D1 CS B2'],
    'D1 CS C': ['D1 CS C1','D1 CS C2'],
    'D1 CS D': ['D1 CS D1','D1 CS D2'],
    'D1 CS E': ['D1 CS E1','D1 CS E2'],
    'D1 CS F': ['D1 CS F1','D1 CS F2'],
    'D1 ME A': ['D1 ME A1','D1 ME A2'],
    'D1 ME B': ['D1 ME B1','D1 ME B2'],
    'D1 EC A': ['D1 EC A1','D1 EC A2'],
    'D1 ECB ITD': ['D1 ECB','D1 ITD'],
    'D1 MX': ['D1 MX1','D1 MX2'],
    'MBA DEPT': ['MBA DEPT Automatic Group']
  };

  const years = Object.keys(options);
  const [year, setYear] = useState(years[0]);
  const [group, setGroup] = useState(options[years[0]][0]);

  async function handleGetTimetable() {
    try {
      // Read the pre-fetched timetable file placed at /web/timetable.json
      const resp = await fetch('/timetable.json');
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`Failed to load timetable: ${resp.status} ${resp.statusText}\n${text.slice(0,200)}`);
      }
      const ct = resp.headers.get('content-type') || '';
      if (!ct.includes('application/json')) {
        const text = await resp.text();
        throw new Error(`Expected JSON but received ${ct}: ${text.slice(0,200)}`);
      }
      const json = await resp.json();

      // filter matches locally for the selected group
      const groupLower = (group || '').toLowerCase();
      const matches = [];
      (json.tables || []).forEach((table, ti) => {
        (table.rows || []).forEach((row, ri) => {
          const combined = Object.values(row).join(' ').toLowerCase();
          if (combined.includes(groupLower)) matches.push({ table: ti, rowIndex: ri, row });
        });
      });

      navigate('results', { group, data: { group, matches, sourceUrl: json.url } });
    } catch (err) {
      Alert.alert('Error', String(err));
      console.error(err);
    }
  }

  return (
    <View style={styles.container}>
      <Header title="Home" />
      <View style={{ alignItems: 'flex-end' }}>
        <PrimaryButton title="Edit Profile" onPress={() => navigate('student')} />
      </View>
      <Text style={styles.text}>Select Year and Group to fetch timetable:</Text>

      <Text style={styles.label}>Year</Text>
      <View style={styles.pickerWrap}>
        <Picker selectedValue={year} onValueChange={v => { setYear(v); setGroup(options[v][0]); }}>
          {years.map(y => <Picker.Item key={y} label={y} value={y} />)}
        </Picker>
      </View>

      <Text style={styles.label}>Group</Text>
      <View style={styles.pickerWrap}>
        <Picker selectedValue={group} onValueChange={v => setGroup(v)}>
          {(options[year] || []).map(g => <Picker.Item key={g} label={g} value={g} />)}
        </Picker>
      </View>

      <View style={styles.buttonWrap}>
        <PrimaryButton title="Get Timetable" onPress={handleGetTimetable} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff'
  },
  text: {
    fontSize: 16,
    color: '#333',
    marginVertical: 12,
  },
  buttonWrap: {
    marginTop: 16,
    width: '60%'
  }
});
