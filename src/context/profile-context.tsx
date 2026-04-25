import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import React, { createContext, useContext, useEffect, useState } from "react";
import { DEPT_LABELS } from "../constants/theme";
import {
  fetchStudentProfile,
  refreshToken,
  verifyToken,
} from "../services/auth-service";
import { Profile } from "../types";

interface ProfileContextType {
  profile: Profile | null;
  hasProfile: boolean;
  loading: boolean;
  saveProfile: (p: Profile) => Promise<boolean>;
  clearProfile: () => Promise<void>;
  syncProfileFromBackend: (token?: string) => Promise<void>;
  saveTokens: (tokens: StoredTokens) => Promise<void>;
  getDepartmentLabel: () => string;
  getTimetableFile: () => string;
}

const ProfileContext = createContext<ProfileContextType>({
  profile: null,
  hasProfile: false,
  loading: true,
  saveProfile: async () => false,
  clearProfile: async () => {},
  syncProfileFromBackend: async () => {},
  saveTokens: async () => {},
  getDepartmentLabel: () => "",
  getTimetableFile: () => "timetable.json",
});

const STORAGE_KEY = "studentProfile";
const PROFILE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";

type StoredProfile = {
  profile: Profile;
  savedAt: number;
};

type StoredTokens = {
  accessToken: string;
  refreshToken: string;
};

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      try {
        console.log("[ProfileProvider] Loading profile...");

        let val = null;
        try {
          val = await AsyncStorage.getItem(STORAGE_KEY);
        } catch (err) {
          console.warn(
            "[ProfileProvider] Error reading profile from storage:",
            err,
          );
          return;
        }

        if (!val) {
          console.log("[ProfileProvider] No profile found in storage");
          return;
        }

        try {
          const stored = JSON.parse(val) as StoredProfile;

          if (!stored?.profile) {
            console.warn(
              "[ProfileProvider] Invalid profile structure, clearing",
            );
            await AsyncStorage.removeItem(STORAGE_KEY).catch((err) =>
              console.warn(
                "[ProfileProvider] Error clearing invalid profile:",
                err,
              ),
            );
            return;
          }

          if (!stored.savedAt || Date.now() - stored.savedAt > PROFILE_TTL_MS) {
            console.log("[ProfileProvider] Profile expired, clearing");
            await AsyncStorage.removeItem(STORAGE_KEY).catch((err) =>
              console.warn(
                "[ProfileProvider] Error clearing expired profile:",
                err,
              ),
            );
            return;
          }

          console.log("[ProfileProvider] Profile loaded successfully");
          setProfile(stored.profile);
        } catch (parseErr) {
          console.warn("[ProfileProvider] Error parsing profile:", parseErr);
          await AsyncStorage.removeItem(STORAGE_KEY).catch((err) =>
            console.warn(
              "[ProfileProvider] Error clearing corrupted profile:",
              err,
            ),
          );
        }
      } catch (error) {
        console.error(
          "[ProfileProvider] Unexpected error loading profile:",
          error,
        );
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, []);

  // Verify and refresh tokens on app start
  useEffect(() => {
    async function verifyTokens() {
      const tokens = await getStoredTokens();
      if (!tokens) return;

      const verify = await verifyToken(tokens.accessToken);
      if (!verify.valid) {
        console.log(
          "[ProfileProvider] Access token invalid, attempting refresh",
        );
        const refresh = await refreshToken(tokens.refreshToken);
        if (refresh.success && refresh.token) {
          await setStoredTokens({
            accessToken: refresh.token,
            refreshToken: refresh.refreshToken || tokens.refreshToken,
          });
          console.log("[ProfileProvider] Tokens refreshed successfully");
        } else {
          console.warn("[ProfileProvider] Token refresh failed, clearing auth");
          await clearStoredTokens();
          await clearProfile();
        }
      }
    }

    verifyTokens();
  }, []);

  async function saveProfile(p: Profile): Promise<boolean> {
    try {
      console.log("[ProfileProvider] Saving profile...");

      if (!p || !p.department) {
        console.warn("[ProfileProvider] Invalid profile data, not saving");
        return false;
      }

      const stored: StoredProfile = { profile: p, savedAt: Date.now() };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
      setProfile(p);
      console.log("[ProfileProvider] Profile saved successfully");
      return true;
    } catch (error) {
      console.error("[ProfileProvider] Error saving profile:", error);
      return false;
    }
  }

  async function clearProfile(): Promise<void> {
    try {
      console.log("[ProfileProvider] Clearing profile...");
      await AsyncStorage.removeItem(STORAGE_KEY);
      setProfile(null);
      console.log("[ProfileProvider] Profile cleared successfully");
    } catch (error) {
      console.error("[ProfileProvider] Error clearing profile:", error);
    }
  }

  async function syncProfileFromBackend(token?: string): Promise<void> {
    let accessToken = token;
    if (!accessToken) {
      const tokens = await getStoredTokens();
      accessToken = tokens?.accessToken;
    }
    if (!accessToken) {
      console.warn("[ProfileProvider] No token available for sync");
      return;
    }

    try {
      console.log("[ProfileProvider] Syncing profile from backend...");
      const response = await fetchStudentProfile(accessToken);

      if (!response.success || !response.student) {
        // Check if it's likely token expiry (401 unauthorized)
        if (
          response.message?.toLowerCase().includes("unauthorized") ||
          response.message?.toLowerCase().includes("token") ||
          response.message?.toLowerCase().includes("invalid")
        ) {
          console.log(
            "[ProfileProvider] Token may be expired, attempting refresh",
          );
          const tokens = await getStoredTokens();
          if (tokens) {
            const refresh = await refreshToken(tokens.refreshToken);
            if (refresh.success && refresh.token) {
              await setStoredTokens({
                accessToken: refresh.token,
                refreshToken: refresh.refreshToken || tokens.refreshToken,
              });
              // Retry with new token
              const retryResponse = await fetchStudentProfile(refresh.token);
              if (retryResponse.success && retryResponse.student) {
                const backendStudent = retryResponse.student;
                const newProfile: Profile = {
                  name: backendStudent.name || "",
                  email: backendStudent.email || "",
                  urn: backendStudent.urn || "",
                  crn: backendStudent.crn || "",
                  department: backendStudent.department || "",
                  group: backendStudent.group || "",
                };
                await saveProfile(newProfile);
                console.log(
                  "[ProfileProvider] Profile synced after token refresh",
                );
                return;
              }
            }
          }
          // If refresh failed, clear auth
          console.warn(
            "[ProfileProvider] Token refresh failed during sync, clearing auth",
          );
          await clearStoredTokens();
          await clearProfile();
          return;
        }

        console.warn(
          "[ProfileProvider] Failed to sync profile from backend:",
          response.message,
        );
        return;
      }

      const backendStudent = response.student;
      const newProfile: Profile = {
        name: backendStudent.name || "",
        email: backendStudent.email || "",
        urn: backendStudent.urn || "",
        crn: backendStudent.crn || "",
        department: backendStudent.department || "",
        group: backendStudent.group || "",
      };

      // Save the synced profile
      const saveSuccess = await saveProfile(newProfile);
      if (saveSuccess) {
        console.log(
          "[ProfileProvider] Profile synced successfully from backend",
        );
      } else {
        console.warn("[ProfileProvider] Failed to save synced profile");
      }
    } catch (error) {
      console.error(
        "[ProfileProvider] Error syncing profile from backend:",
        error,
      );
    }
  }

  function getDepartmentLabel(): string {
    if (!profile?.department) return "";
    return DEPT_LABELS[profile.department] ?? profile.department;
  }

  function getTimetableFile(): string {
    if (!profile?.department) return "timetable.json";
    return `timetable_${profile.department}.json`;
  }

  // Token management functions
  async function getStoredTokens(): Promise<StoredTokens | null> {
    try {
      const accessToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
      const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
      if (accessToken && refreshToken) {
        return { accessToken, refreshToken };
      }
      return null;
    } catch (error) {
      console.error("[ProfileProvider] Error getting stored tokens:", error);
      return null;
    }
  }

  async function setStoredTokens(tokens: StoredTokens): Promise<void> {
    try {
      await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, tokens.accessToken);
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refreshToken);
    } catch (error) {
      console.error("[ProfileProvider] Error storing tokens:", error);
    }
  }

  async function clearStoredTokens(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    } catch (error) {
      console.error("[ProfileProvider] Error clearing tokens:", error);
    }
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
        saveTokens: setStoredTokens,
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
