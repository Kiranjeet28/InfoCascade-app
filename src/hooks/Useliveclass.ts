import { useCallback, useEffect, useState } from 'react';
import { WEEK_DAYS } from '../constants/theme';
import { useProfile } from '../context/profile-context';
import { ClassSlot, TimetableJson } from '../types';

function timeToMinutes(t: string): number {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
}

function getCurrentDay(): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = days[new Date().getDay()];
    return (WEEK_DAYS as readonly string[]).includes(today) ? today : 'Monday';
}

export function getEndTime(time: string): string {
    const [h, m] = time.split(':').map(Number);
    const total = h * 60 + m + 60;
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

export function findCurrentAndNext(
    classes: ClassSlot[]
): { current: ClassSlot | null; next: ClassSlot | null } {
    const now = new Date();
    const currentDay = getCurrentDay();
    const currentMin = now.getHours() * 60 + now.getMinutes();

    const todayClasses = classes
        .filter(c => c.dayOfClass === currentDay && !c.data.freeClass)
        .sort((a, b) => timeToMinutes(a.timeOfClass) - timeToMinutes(b.timeOfClass));

    let current: ClassSlot | null = null;
    let next: ClassSlot | null = null;

    for (let i = 0; i < todayClasses.length; i++) {
        const cls = todayClasses[i];
        const start = timeToMinutes(cls.timeOfClass);
        const end = start + 50;
        if (currentMin >= start && currentMin < end) {
            current = cls;
            next = todayClasses[i + 1] ?? null;
            break;
        } else if (currentMin < start) {
            next = cls;
            break;
        }
    }
    return { current, next };
}

export interface LiveClassState {
    current: ClassSlot | null;
    next: ClassSlot | null;
    loading: boolean;
    error: string | null;
    isWeekend: boolean;
    refresh: () => void;
}

export function useLiveClass(): LiveClassState {
    const { profile, hasProfile, getTimetableFile, loading: profileLoading } = useProfile();

    const [current, setCurrent] = useState<ClassSlot | null>(null);
    const [next, setNext] = useState<ClassSlot | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const day = new Date().getDay();
    const isWeekend = day === 0 || day === 6;

    const load = useCallback(async () => {
        if (profileLoading) return;
        if (!hasProfile || !profile?.group) {
            setLoading(false);
            setError('profile_missing');
            return;
        }
        if (isWeekend) {
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            const file = getTimetableFile();
            const resp = await fetch(`/${file}`);
            if (!resp.ok) throw new Error(`Failed to load timetable (${resp.status})`);
            const json: TimetableJson = await resp.json();

            if (json.timetable?.[profile.group]) {
                const { classes } = json.timetable[profile.group];
                const result = findCurrentAndNext(classes);
                setCurrent(result.current);
                setNext(result.next);
                setError(null);
            } else {
                setError(`No timetable for group ${profile.group}`);
            }
        } catch (e) {
            setError(String(e));
        } finally {
            setLoading(false);
        }
    }, [profile, hasProfile, profileLoading, isWeekend]);

    // Initial load
    useEffect(() => { load(); }, [load]);

    // Auto-refresh every minute
    useEffect(() => {
        const interval = setInterval(load, 60_000);
        return () => clearInterval(interval);
    }, [load]);

    return { current, next, loading, error, isWeekend, refresh: load };
}