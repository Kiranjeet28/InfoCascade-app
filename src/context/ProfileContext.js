import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ProfileContext = createContext();

export function ProfileProvider({ children }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load profile on mount
  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      const raw = await AsyncStorage.getItem('@tt/profile');
      if (raw) {
        setProfile(JSON.parse(raw));
      }
    } catch (e) {
      console.warn('Failed to load profile:', e);
    } finally {
      setLoading(false);
    }
  }

  async function saveProfile(newProfile) {
    try {
      await AsyncStorage.setItem('@tt/profile', JSON.stringify(newProfile));
      setProfile(newProfile);
      return true;
    } catch (e) {
      console.error('Failed to save profile:', e);
      return false;
    }
  }

  async function clearProfile() {
    try {
      await AsyncStorage.removeItem('@tt/profile');
      setProfile(null);
      return true;
    } catch (e) {
      console.error('Failed to clear profile:', e);
      return false;
    }
  }

  // Helper to get the timetable file name based on department
  function getTimetableFile() {
    if (!profile || !profile.department) return 'timetable_cse.json';
    
    const deptFiles = {
      cse: 'timetable_cse.json',
      it: 'timetable_it.json',
      ece: 'timetable_ece.json',
      electrical: 'timetable_electrical.json',
      mechanical: 'timetable_mechanical.json',
      civil: 'timetable_civil.json',
      ca: 'timetable_ca.json',
      bca: 'timetable_bca.json',
    };
    return deptFiles[profile.department] || 'timetable_cse.json';
  }

  // Helper to get department label
  function getDepartmentLabel() {
    if (!profile || !profile.department) return 'CSE';
    
    const deptLabels = {
      cse: 'CSE',
      it: 'IT',
      ece: 'ECE',
      electrical: 'Electrical',
      mechanical: 'Mechanical',
      civil: 'Civil',
      ca: 'CA',
      bca: 'BCA',
    };
    return deptLabels[profile.department] || 'CSE';
  }

  const value = {
    profile,
    loading,
    saveProfile,
    clearProfile,
    loadProfile,
    getTimetableFile,
    getDepartmentLabel,
    hasProfile: !!profile && !!profile.group,
  };

  return (
    <ProfileContext.Provider value={value}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
}

export default ProfileContext;
