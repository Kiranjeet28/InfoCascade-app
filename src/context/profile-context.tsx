import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { DEPT_LABELS } from '../constants/theme';
import { Profile } from '../types';

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
const PROFILE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

type StoredProfile = {
    profile: Profile;
    savedAt: number;
};

export function ProfileProvider({ children }: { children: React.ReactNode }) {
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        AsyncStorage.getItem(STORAGE_KEY)
            .then((val) => {
                if (!val) return;
                try {
                    const stored = JSON.parse(val) as StoredProfile;
                    if (!stored.savedAt || Date.now() - stored.savedAt > PROFILE_TTL_MS) {
                        AsyncStorage.removeItem(STORAGE_KEY);
                        return;
                    }
                    setProfile(stored.profile);
                } catch {
                    // ignore parse errors
                }
            })
            .finally(() => setLoading(false));
    }, []);

    async function saveProfile(p: Profile): Promise<boolean> {
        try {
            const stored: StoredProfile = { profile: p, savedAt: Date.now() };
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
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