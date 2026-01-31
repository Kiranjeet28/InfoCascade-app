import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Header from '../components/Header';
import PrimaryButton from '../components/PrimaryButton';
import { normalizeTableToEvents, getCurrentAndNextClass } from '../utils/schedule';

const WEEK_DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

export default function ResultsScreen({ route, navigate }) {
  const { params = {} } = route || {};
  const { group } = params;
  const [eventsByDay, setEventsByDay] = useState({});
  const [currentNext, setCurrentNext] = useState({ current: null, next: null });
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const resp = await fetch('/timetable.json');
        if (!resp.ok) throw new Error(`${resp.status} ${resp.statusText}`);
        const json = await resp.json();
        const events = normalizeTableToEvents(json || { tables: [] });
        const grouped = {};
        WEEK_DAYS.forEach(d => grouped[d] = []);
        events.forEach(ev => {
          const day = ev.dayName && ev.dayName.trim() ? ev.dayName.trim() : 'Unknown';
          if (!grouped[day]) grouped[day] = [];
          if (!group || String(ev.group).toLowerCase().includes(String(group).toLowerCase()) || String(group).toLowerCase().includes(String(ev.group).toLowerCase())) {
            grouped[day].push(ev);
          }
        });
        Object.keys(grouped).forEach(d => grouped[d].sort((a,b)=>a.startMin-b.startMin));
        if (!mounted) return;
        setEventsByDay(grouped);
        setCurrentNext(getCurrentAndNextClass(events, group, new Date()));
      } catch (e) {
        console.error(e);
        if (!mounted) return;
        setError(String(e));
      }
    })();
    return () => { mounted = false; };
  }, [group]);

  return (
    <View style={styles.container}>
      <Header title="Timetable" />
      <View style={styles.headerRow}>
        <Text style={styles.title}>Timetable for: {group}</Text>
        <PrimaryButton title="Back" onPress={() => navigate('home')} />
      </View>

      {error ? (
        <View style={{ padding: 12 }}><Text style={{ color: 'red' }}>{error}</Text></View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 60 }}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Current</Text>
            {currentNext.current ? (
              <Text style={styles.itemText}>{formatEventShort(currentNext.current)}</Text>
            ) : (
              <Text style={styles.itemText}>No current class</Text>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Next</Text>
            {currentNext.next ? (
              <Text style={styles.itemText}>{formatEventShort(currentNext.next)}</Text>
            ) : (
              <Text style={styles.itemText}>No upcoming class</Text>
            )}
          </View>

          {WEEK_DAYS.map(day => (
            <View key={day} style={styles.dayWrap}>
              <Text style={styles.dayTitle}>{day}</Text>
              {(eventsByDay[day] || []).length === 0 ? (
                <Text style={styles.empty}>No entries</Text>
              ) : (
                (eventsByDay[day] || []).map((ev, i) => (
                  <View key={i} style={styles.eventRow}>
                    <Text style={styles.time}>{formatTimeRange(ev.startMin, ev.endMin)}</Text>
                    <Text style={styles.eventText}>{ev.text}</Text>
                  </View>
                ))
              )}
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function formatTimeRange(startMin, endMin) {
  if (startMin == null) return '';
  const sh = String(Math.floor(startMin/60)).padStart(2,'0');
  const sm = String(startMin%60).padStart(2,'0');
  const eh = String(Math.floor(endMin/60)).padStart(2,'0');
  const em = String(endMin%60).padStart(2,'0');
  return `${sh}:${sm} - ${eh}:${em}`;
}

function formatEventShort(ev) {
  return `${formatTimeRange(ev.startMin, ev.endMin)} • ${ev.text}`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  title: { fontSize: 16, fontWeight: '600', margin: 12 },
  buttonWrap: { paddingHorizontal: 12, marginBottom: 8 },
  scroll: { paddingHorizontal: 12 },
  pre: { fontFamily: 'monospace', fontSize: 12, color: '#222' }
});
