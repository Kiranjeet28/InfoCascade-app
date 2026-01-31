import { useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { normalizeTableToEvents, getCurrentAndNextClass } from '../utils/schedule';

export default function useScheduleNotifier(timetable) {
  const last = useRef({ currentId: null, nextId: null });

  useEffect(() => {
    let mounted = true;
    async function tick() {
      try {
        const raw = await AsyncStorage.getItem('@tt/profile');
        if (!raw) return;
        const profile = JSON.parse(raw);
        const events = normalizeTableToEvents(timetable || { tables: [] });
        const { current, next } = getCurrentAndNextClass(events, profile.group, new Date());

        const curId = current ? `${current.dayName}-${current.startMin}` : null;
        const nextId = next ? `${next.dayName}-${next.startMin}` : null;

        if (curId !== last.currentId) {
          last.currentId = curId;
          if (current) {
            const msg = `Now: ${current.text}`;
            if (Notifications && Notifications.scheduleNotificationAsync) {
              await Notifications.scheduleNotificationAsync({ content: { title: 'Current Class', body: msg }, trigger: null });
            } else {
              alert(msg);
            }
          }
        }

        if (nextId !== last.nextId) {
          last.nextId = nextId;
          if (next) {
            const msg = `Next: ${next.text} at ${String(Math.floor(next.startMin/60)).padStart(2,'0')}:${String(next.startMin%60).padStart(2,'0')}`;
            if (Notifications && Notifications.scheduleNotificationAsync) {
              await Notifications.scheduleNotificationAsync({ content: { title: 'Next Class', body: msg }, trigger: null });
            } else {
              console.log(msg);
            }
          }
        }
      } catch (e) {
        console.warn('Notifier tick failed', e);
      }
    }

    tick();
    const id = setInterval(tick, 60 * 1000);
    return () => { mounted = false; clearInterval(id); };
  }, [timetable]);
}
