import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Profile } from '../types';
import { DEPT_LABELS } from '../constants/theme';

interface ProfileContextType {
    profile: Profile | null;
    hasProfile: boolean;
    loading: boolean;
    saveProfile: (p: Profile) => Promise<boolean>;
    clearProfile: () => Promise<void>;
    getDepartmentLabel: () => string;
    getTimetableFile: () => string;
}

const ProfileContext = createContext<ProfileContextType>({
    profile: null,
    hasProfile: false,
    loading: true,
    saveProfile: async () => false,
    clearProfile: async () => { },
    getDepartmentLabel: () => '',
    getTimetableFile: () => 'timetable.json',
});

const STORAGE_KEY = 'studentProfile';

export function ProfileProvider({ children }: { children: React.ReactNode }) {
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        AsyncStorage.getItem(STORAGE_KEY)
            .then((val) => {
                if (val) setProfile(JSON.parse(val) as Profile);
            })
            .finally(() => setLoading(false));
    }, []);

    async function saveProfile(p: Profile): Promise<boolean> {
        try {
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(p));
            setProfile(p);
            return true;
        } catch {
            return false;
        }
    }

    async function clearProfile(): Promise<void> {
        await AsyncStorage.removeItem(STORAGE_KEY);
        setProfile(null);
    }

    function getDepartmentLabel(): string {
        if (!profile?.department) return '';
        return DEPT_LABELS[profile.department] ?? profile.department;
    }

    function getTimetableFile(): string {
        if (!profile?.department) return 'timetable.json';
        return `timetable_${profile.department}.json`;
    }

    return (
        <ProfileContext.Provider
            value={{
                profile,
                hasProfile: !!profile,
                loading,
                saveProfile,
                clearProfile,
                getDepartmentLabel,
                getTimetableFile,
            }}
        >
            {children}
        </ProfileContext.Provider>
    );
}

export function useProfile(): ProfileContextType {
    return useContext(ProfileContext);
}