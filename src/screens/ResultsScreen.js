import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import Header from '../components/Header';
import PrimaryButton from '../components/PrimaryButton';
import colors from '../constants/colors';
import { useProfile } from '../context/ProfileContext';

const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const TIME_SLOTS = ['08:30', '09:30', '10:30', '11:30', '12:30', '13:30', '14:30', '15:30'];

export default function ResultsScreen({ navigate }) {
  const { profile, loading: profileLoading, getTimetableFile, getDepartmentLabel, hasProfile } = useProfile();
  const [timetableData, setTimetableData] = useState(null);
  const [currentNext, setCurrentNext] = useState({ current: null, next: null });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(getCurrentDay());

  function getCurrentDay() {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = days[new Date().getDay()];
    return WEEK_DAYS.includes(today) ? today : 'Monday';
  }

  useEffect(() => {
    if (profileLoading) return;
    
    if (!hasProfile) {
      setError('Please set up your profile first');
      setLoading(false);
      return;
    }

    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const timetableFile = getTimetableFile();
        const resp = await fetch(`/${timetableFile}`);
        if (!resp.ok) throw new Error(`${resp.status} ${resp.statusText}`);
        const json = await resp.json();
        
        if (!mounted) return;
        
        if (json.timetable && json.timetable[profile.group]) {
          setTimetableData(json.timetable[profile.group]);
          // Calculate current and next class
          const classes = json.timetable[profile.group].classes || [];
          const { current, next } = findCurrentAndNextClass(classes);
          setCurrentNext({ current, next });
          setError(null);
        } else {
          setError(`No timetable found for group: ${profile.group}`);
        }
      } catch (e) {
        console.error(e);
        if (!mounted) return;
        setError(String(e));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [profile, profileLoading, hasProfile]);

  function findCurrentAndNextClass(classes) {
    const now = new Date();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentDay = days[now.getDay()];
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    // Filter today's classes
    const todaysClasses = classes
      .filter(c => c.dayOfClass === currentDay && !c.data.freeClass)
      .sort((a, b) => timeToMinutes(a.timeOfClass) - timeToMinutes(b.timeOfClass));

    let current = null;
    let next = null;

    for (let i = 0; i < todaysClasses.length; i++) {
      const cls = todaysClasses[i];
      const startMin = timeToMinutes(cls.timeOfClass);
      const endMin = startMin + 50; // Each class is ~50 mins

      if (currentMinutes >= startMin && currentMinutes < endMin) {
        current = cls;
        next = todaysClasses[i + 1] || null;
        break;
      } else if (currentMinutes < startMin) {
        next = cls;
        break;
      }
    }

    return { current, next };
  }

  function timeToMinutes(timeStr) {
    const [hours, mins] = timeStr.split(':').map(Number);
    return hours * 60 + mins;
  }

  function getClassesForDayAndTime(day, time) {
    if (!timetableData || !timetableData.classes) return null;
    return timetableData.classes.find(c => c.dayOfClass === day && c.timeOfClass === time);
  }

  function renderClassCard(classData) {
    if (!classData) return null;
    const { data } = classData;

    if (data.freeClass) {
      return (
        <View style={styles.freeClassCard}>
          <Text style={styles.freeText}>Free</Text>
        </View>
      );
    }

    if (data.entries && data.entries.length > 0) {
      // Multiple entries (Lab or Elective)
      return (
        <View style={[styles.classCard, data.Lab && styles.labCard, data.elective && styles.electiveCard]}>
          {data.Lab && <Text style={styles.labBadge}>LAB</Text>}
          {data.elective && <Text style={styles.electiveBadge}>ELECTIVE</Text>}
          {data.entries.map((entry, idx) => (
            <View key={idx} style={idx > 0 && styles.entryDivider}>
              <Text style={styles.subjectText}>{entry.subject}</Text>
              <Text style={styles.teacherText}>{entry.teacher}</Text>
              <Text style={styles.roomText}>📍 {entry.classRoom}</Text>
            </View>
          ))}
        </View>
      );
    }

    // Single subject class (including Tut with 1 entry - flattened structure)
    // If OtherDepartment is true, show "Mandatory Course" as subject
    if (data.OtherDepartment === true) {
      return (
        <View style={[styles.classCard, styles.freeClassCard]}>
          <Text style={styles.subjectText}>Mandatory Course</Text>
        </View>
      );
    }
    
    
    return (
      <View style={[styles.classCard, data.Lab && styles.labCard, data.Tut && styles.tutCard, data.MinorProject && styles.mnpCard]}>
        {data.Lab && <Text style={styles.labBadge}>LAB</Text>}
        {data.Tut && <Text style={styles.tutBadge}>TUT</Text>}
        {data.MinorProject && <Text style={styles.mnpBadge}>MNP</Text>}
        <Text style={styles.subjectText}>{data.MinorProject ? 'Minor Project' : data.subject}</Text>
        {data.teacher ? <Text style={styles.teacherText}>{data.teacher}</Text> : null}
        {data.classRoom ? <Text style={styles.roomText}>📍 {data.classRoom}</Text> : null}
      </View>
    );
  }

  function formatClassInfo(cls) {
    if (!cls) return 'None';
    const { data, timeOfClass } = cls;
    if (data.freeClass) return `${timeOfClass} - Free Period`;
    
    const subject = data.subject || (data.entries && data.entries[0]?.subject) || 'Unknown';
    const room = data.classRoom || (data.entries && data.entries[0]?.classRoom) || '';
    return `${timeOfClass} - ${subject} ${room ? `(${room})` : ''}`;
  }

  return (
    <View style={styles.container}>
      <Header title={`${getDepartmentLabel()} Timetable`} />
      
      {/* Profile Info Bar */}
      {hasProfile && (
        <View style={styles.groupInfoBar}>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{profile.name}</Text>
            <View style={styles.badgeRow}>
              <View style={styles.deptBadge}>
                <Text style={styles.deptText}>{getDepartmentLabel()}</Text>
              </View>
              <View style={styles.groupBadge}>
                <Text style={styles.groupText}>{profile.group}</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity style={styles.editBtn} onPress={() => navigate('student')}>
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading || profileLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading timetable...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          {!hasProfile ? (
            <PrimaryButton title="Set Up Profile" onPress={() => navigate('student')} />
          ) : (
            <PrimaryButton title="Go to Home" onPress={() => navigate('home')} />
          )}
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 40 }}>
          {/* Current & Next Class */}
          <View style={styles.currentNextContainer}>
            <View style={styles.currentCard}>
              <Text style={styles.currentLabel}>🕐 Current Class</Text>
              <Text style={styles.currentText}>
                {formatClassInfo(currentNext.current)}
              </Text>
            </View>
            <View style={styles.nextCard}>
              <Text style={styles.nextLabel}>⏭️ Next Class</Text>
              <Text style={styles.nextText}>
                {formatClassInfo(currentNext.next)}
              </Text>
            </View>
          </View>

          {/* Day Tabs */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayTabs}>
            {WEEK_DAYS.map(day => (
              <TouchableOpacity
                key={day}
                style={[styles.dayTab, selectedDay === day && styles.dayTabActive]}
                onPress={() => setSelectedDay(day)}
              >
                <Text style={[styles.dayTabText, selectedDay === day && styles.dayTabTextActive]}>
                  {day.slice(0, 3)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Timetable for Selected Day */}
          <View style={styles.daySchedule}>
            <Text style={styles.dayTitle}>{selectedDay}</Text>
            {TIME_SLOTS.map(time => {
              const classData = getClassesForDayAndTime(selectedDay, time);
              return (
                <View key={time} style={styles.timeSlot}>
                  <View style={styles.timeLabel}>
                    <Text style={styles.timeText}>{time}</Text>
                    <Text style={styles.timeEndText}>{getEndTime(time)}</Text>
                  </View>
                  <View style={styles.classContainer}>
                    {classData ? renderClassCard(classData) : (
                      <View style={styles.noClassCard}>
                        <Text style={styles.noClassText}>-</Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>

          {/* Full Week View */}
          <Text style={styles.sectionTitle}>Full Week Overview</Text>
          {WEEK_DAYS.map(day => (
            <View key={day} style={styles.weekDaySection}>
              <Text style={styles.weekDayTitle}>{day}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {TIME_SLOTS.map(time => {
                  const classData = getClassesForDayAndTime(day, time);
                  return (
                    <View key={time} style={styles.miniCard}>
                      <Text style={styles.miniTime}>{time}</Text>
                      {classData && !classData.data.freeClass ? (
                        <Text style={styles.miniSubject} numberOfLines={2}>
                          {classData.data.subject || classData.data.entries?.[0]?.subject || ''}
                        </Text>
                      ) : (
                        <Text style={styles.miniFree}>-</Text>
                      )}
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function getEndTime(startTime) {
  const [hours, mins] = startTime.split(':').map(Number);
  const endMins = hours * 60 + mins + 50;
  const endHour = Math.floor(endMins / 60);
  const endMin = endMins % 60;
  return `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa' },
  groupInfoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  deptBadge: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  deptText: {
    color: '#1565c0',
    fontWeight: '600',
    fontSize: 12,
  },
  groupBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  groupText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  editBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  editBtnText: {
    color: colors.primary,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.muted,
  },
  scroll: { flex: 1 },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  currentNextContainer: {
    flexDirection: 'row',
    padding: 12,
    gap: 12,
  },
  currentCard: {
    flex: 1,
    backgroundColor: '#e8f5e9',
    padding: 12,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4caf50',
  },
  nextCard: {
    flex: 1,
    backgroundColor: '#e3f2fd',
    padding: 12,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#2196f3',
  },
  currentLabel: {
    fontSize: 12,
    color: '#2e7d32',
    fontWeight: '600',
    marginBottom: 4,
  },
  nextLabel: {
    fontSize: 12,
    color: '#1565c0',
    fontWeight: '600',
    marginBottom: 4,
  },
  currentText: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '500',
  },
  nextText: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '500',
  },
  dayTabs: {
    backgroundColor: '#fff',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  dayTab: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  dayTabActive: {
    backgroundColor: colors.primary,
  },
  dayTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.muted,
  },
  dayTabTextActive: {
    color: '#fff',
  },
  daySchedule: {
    backgroundColor: '#fff',
    margin: 12,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dayTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  timeSlot: {
    flexDirection: 'row',
    marginBottom: 12,
    minHeight: 70,
  },
  timeLabel: {
    width: 60,
    justifyContent: 'center',
  },
  timeText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  timeEndText: {
    fontSize: 11,
    color: colors.muted,
  },
  classContainer: {
    flex: 1,
    marginLeft: 12,
  },
  classCard: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  labCard: {
    borderLeftColor: '#9c27b0',
    backgroundColor: '#f3e5f5',
  },
  electiveCard: {
    borderLeftColor: '#ff9800',
    backgroundColor: '#fff3e0',
  },
  tutCard: {
    borderLeftColor: '#2196f3',
    backgroundColor: '#e3f2fd',
  },
  labBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#9c27b0',
    color: '#fff',
    fontSize: 9,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontWeight: 'bold',
    overflow: 'hidden',
  },
  electiveBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#ff9800',
    color: '#fff',
    fontSize: 9,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontWeight: 'bold',
    overflow: 'hidden',
  },
  tutBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#2196f3',
    color: '#fff',
    fontSize: 9,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontWeight: 'bold',
    overflow: 'hidden',
  },
  mnpCard: {
    borderLeftColor: '#4caf50',
    backgroundColor: '#e8f5e9',
  },
  mnpBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#4caf50',
    color: '#fff',
    fontSize: 9,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontWeight: 'bold',
    overflow: 'hidden',
  },
  otherDeptCard: {
    borderLeftColor: '#607d8b',
    backgroundColor: '#eceff1',
  },
  otherDeptBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#607d8b',
    color: '#fff',
    fontSize: 9,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontWeight: 'bold',
    overflow: 'hidden',
  },
  freeClassCard: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  freeText: {
    color: colors.muted,
    fontStyle: 'italic',
  },
  noClassCard: {
    backgroundColor: '#fafafa',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  noClassText: {
    color: '#ddd',
    fontSize: 16,
  },
  subjectText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  teacherText: {
    fontSize: 12,
    color: colors.muted,
    marginBottom: 2,
  },
  roomText: {
    fontSize: 11,
    color: colors.primary,
  },
  entryDivider: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 12,
  },
  weekDaySection: {
    marginHorizontal: 12,
    marginBottom: 16,
  },
  weekDayTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  miniCard: {
    width: 80,
    backgroundColor: '#fff',
    padding: 8,
    borderRadius: 8,
    marginRight: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  miniTime: {
    fontSize: 10,
    color: colors.primary,
    fontWeight: '600',
    marginBottom: 4,
  },
  miniSubject: {
    fontSize: 10,
    color: colors.text,
    textAlign: 'center',
  },
  miniFree: {
    fontSize: 12,
    color: '#ddd',
  },
});
