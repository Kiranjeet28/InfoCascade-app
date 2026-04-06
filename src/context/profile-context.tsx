import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { DEPT_LABELS } from '../constants/theme';
import { fetchStudentProfile } from '../services/auth-service';
import { Profile } from '../types';

interface ProfileContextType {
    profile: Profile | null;
    hasProfile: boolean;
    loading: boolean;
    saveProfile: (p: Profile) => Promise<boolean>;
    clearProfile: () => Promise<void>;
    syncProfileFromBackend: (token: string) => Promise<void>;
    getDepartmentLabel: () => string;
    getTimetableFile: () => string;
}

const ProfileContext = createContext<ProfileContextType>({
    profile: null,
    hasProfile: false,
    loading: true,
    saveProfile: async () => false,
    clearProfile: async () => { },
    syncProfileFromBackend: async () => { },
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
        async function loadProfile() {
            try {
                console.log('[ProfileProvider] Loading profile...');

                let val = null;
                try {
                    val = await AsyncStorage.getItem(STORAGE_KEY);
                } catch (err) {
                    console.warn('[ProfileProvider] Error reading profile from storage:', err);
                    return;
                }

                if (!val) {
                    console.log('[ProfileProvider] No profile found in storage');
                    return;
                }

                try {
                    const stored = JSON.parse(val) as StoredProfile;

                    if (!stored?.profile) {
                        console.warn('[ProfileProvider] Invalid profile structure, clearing');
                        await AsyncStorage.removeItem(STORAGE_KEY).catch(err =>
                            console.warn('[ProfileProvider] Error clearing invalid profile:', err)
                        );
                        return;
                    }

                    if (!stored.savedAt || Date.now() - stored.savedAt > PROFILE_TTL_MS) {
                        console.log('[ProfileProvider] Profile expired, clearing');
                        await AsyncStorage.removeItem(STORAGE_KEY).catch(err =>
                            console.warn('[ProfileProvider] Error clearing expired profile:', err)
                        );
                        return;
                    }

                    console.log('[ProfileProvider] Profile loaded successfully');
                    setProfile(stored.profile);
                } catch (parseErr) {
                    console.warn('[ProfileProvider] Error parsing profile:', parseErr);
                    await AsyncStorage.removeItem(STORAGE_KEY).catch(err =>
                        console.warn('[ProfileProvider] Error clearing corrupted profile:', err)
                    );
                }
            } catch (error) {
                console.error('[ProfileProvider] Unexpected error loading profile:', error);
            } finally {
                setLoading(false);
            }
        }

        loadProfile();
    }, []);

    async function saveProfile(p: Profile): Promise<boolean> {
        try {
            console.log('[ProfileProvider] Saving profile...');

            if (!p || !p.department) {
                console.warn('[ProfileProvider] Invalid profile data, not saving');
                return false;
            }

            const stored: StoredProfile = { profile: p, savedAt: Date.now() };
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
            setProfile(p);
            console.log('[ProfileProvider] Profile saved successfully');
            return true;
        } catch (error) {
            console.error('[ProfileProvider] Error saving profile:', error);
            return false;
        }
    }

    async function clearProfile(): Promise<void> {
        try {
            console.log('[ProfileProvider] Clearing profile...');
            await AsyncStorage.removeItem(STORAGE_KEY);
            setProfile(null);
            console.log('[ProfileProvider] Profile cleared successfully');
        } catch (error) {
            console.error('[ProfileProvider] Error clearing profile:', error);
        }
    }

    async function syncProfileFromBackend(token: string): Promise<void> {
        try {
            console.log('[ProfileProvider] Syncing profile from backend...');
            const response = await fetchStudentProfile(token);

            if (!response.success || !response.student) {
                console.warn('[ProfileProvider] Failed to sync profile from backend:', response.message);
                return;
            }

            const backendStudent = response.student;
            const newProfile: Profile = {
                name: backendStudent.name || '',
                email: backendStudent.email || '',
                urn: backendStudent.urn || '',
                crn: backendStudent.crn || '',
                department: backendStudent.department || '',
                group: backendStudent.group || '',
            };

            // Save the synced profile
            const saveSuccess = await saveProfile(newProfile);
            if (saveSuccess) {
                console.log('[ProfileProvider] Profile synced successfully from backend');
            } else {
                console.warn('[ProfileProvider] Failed to save synced profile');
            }
        } catch (error) {
            console.error('[ProfileProvider] Error syncing profile from backend:', error);
        }
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
                syncProfileFromBackend,
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