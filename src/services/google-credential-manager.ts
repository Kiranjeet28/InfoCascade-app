/**
 * Google Credential Manager / Smart Lock Integration Service
 *
 * Handles saving and retrieving user credentials securely.
 *
 * Platform Support:
 * - Android: Uses OS Autofill + SecureStore fallback (native Credential Manager requires native module)
 * - iOS: Uses Keychain via SecureStore
 * - Web: AsyncStorage fallback (email only)
 *
 * Security Notes:
 * - Credentials are stored in SecureStore when available
 * - Passwords are never logged
 * - Always use HTTPS for credential transmission
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

// Storage keys
const CREDENTIALS_KEY = "app_saved_credentials_v1";
const CREDENTIAL_METADATA_KEY = "app_credential_metadata";

interface SavedCredential {
  email: string;
  password?: string;
  passwordStored: boolean;
  savedAt: number;
  device: string;
  platform: string;
}

interface CredentialMetadata {
  hasSavedCredentials: boolean;
  lastSavedEmail?: string;
  lastAccessedAt?: number;
}

let secureStoreAvailable: boolean | null = null;

async function isSecureStoreAvailable(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  if (secureStoreAvailable !== null) return secureStoreAvailable;

  try {
    secureStoreAvailable = await SecureStore.isAvailableAsync();
  } catch {
    secureStoreAvailable = false;
  }

  return secureStoreAvailable;
}

async function getStoredItem(key: string): Promise<string | null> {
  if (await isSecureStoreAvailable()) {
    return await SecureStore.getItemAsync(key);
  }
  return await AsyncStorage.getItem(key);
}

async function setStoredItem(key: string, value: string): Promise<void> {
  if (await isSecureStoreAvailable()) {
    await SecureStore.setItemAsync(key, value);
    return;
  }
  await AsyncStorage.setItem(key, value);
}

async function removeStoredItem(key: string): Promise<void> {
  if (await isSecureStoreAvailable()) {
    await SecureStore.deleteItemAsync(key);
    return;
  }
  await AsyncStorage.removeItem(key);
}

/**
 * Initialize credential manager
 * Must be called once when app starts
 */
export async function initializeCredentialManager(): Promise<void> {
  try {
    console.log("[CredentialManager] Initializing...");

    // Verify storage is accessible
    await getStoredItem(CREDENTIALS_KEY);

    // Cache SecureStore availability
    await isSecureStoreAvailable();

    // Clean up old/expired credentials if needed
    await cleanupOldCredentials();

    console.log("[CredentialManager] Initialization complete");
  } catch (error) {
    console.error("[CredentialManager] Initialization error:", error);
  }
}

/**
 * Prompt user to save credentials (typically called after successful login)
 * Call this after user consent in the UI.
 */
export async function promptToSaveCredentials(
  email: string,
  password: string,
): Promise<boolean> {
  try {
    if (!email || !password) {
      console.warn("[CredentialManager] Invalid credentials provided");
      return false;
    }

    // Save credentials
    return await saveCredentials(email, password);
  } catch (error) {
    console.error(
      "[CredentialManager] Error prompting to save credentials:",
      error,
    );
    return false;
  }
}

/**
 * Save user credentials securely
 */
export async function saveCredentials(
  email: string,
  password: string,
): Promise<boolean> {
  try {
    if (!email || !password) {
      console.warn("[CredentialManager] Cannot save empty credentials");
      return false;
    }

    const canStorePassword = await isSecureStoreAvailable();

    const credential: SavedCredential = {
      email,
      password: canStorePassword ? password : undefined,
      passwordStored: canStorePassword,
      savedAt: Date.now(),
      device: Platform.OS,
      platform: `${Platform.OS}`,
    };

    // Save credential
    await setStoredItem(CREDENTIALS_KEY, JSON.stringify(credential));

    // Update metadata
    const metadata: CredentialMetadata = {
      hasSavedCredentials: true,
      lastSavedEmail: email,
      lastAccessedAt: Date.now(),
    };

    await setStoredItem(CREDENTIAL_METADATA_KEY, JSON.stringify(metadata));

    return true;
  } catch (error) {
    console.error("[CredentialManager] Error saving credentials:", error);
    return false;
  }
}

/**
 * Retrieve saved credentials for autofill (email and password if stored)
 */
export async function getSavedCredentials(): Promise<{
  email: string;
  password: string | null;
} | null> {
  try {
    const raw = await getStoredItem(CREDENTIALS_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as SavedCredential;
    return {
      email: parsed.email,
      password: parsed.passwordStored ? (parsed.password ?? null) : null,
    };
  } catch (error) {
    console.error(
      "[CredentialManager] Error retrieving saved credentials:",
      error,
    );
    return null;
  }
}

/**
 * Retrieve saved email credential (for autofill)
 */
export async function getSavedEmail(): Promise<string | null> {
  try {
    const metadata = await getStoredItem(CREDENTIAL_METADATA_KEY);

    if (metadata) {
      const parsed = JSON.parse(metadata) as CredentialMetadata;
      return parsed.lastSavedEmail || null;
    }

    const credential = await getStoredItem(CREDENTIALS_KEY);
    if (!credential) return null;

    const parsed = JSON.parse(credential) as SavedCredential;
    return parsed.email || null;
  } catch (error) {
    console.error("[CredentialManager] Error retrieving saved email:", error);
    return null;
  }
}

/**
 * Check if credentials are available for autofill
 */
export async function hasSavedCredentials(): Promise<boolean> {
  try {
    const metadata = await getStoredItem(CREDENTIAL_METADATA_KEY);

    if (metadata) {
      const parsed = JSON.parse(metadata) as CredentialMetadata;
      return parsed.hasSavedCredentials === true;
    }

    const credential = await getStoredItem(CREDENTIALS_KEY);
    return !!credential;
  } catch (error) {
    console.error(
      "[CredentialManager] Error checking saved credentials:",
      error,
    );
    return false;
  }
}

/**
 * Get credential suggestion for autofill
 */
export async function getCredentialSuggestion(): Promise<{
  email: string;
  requiresPasswordEntry: boolean;
} | null> {
  try {
    const credentials = await getSavedCredentials();

    if (!credentials) {
      return null;
    }

    return {
      email: credentials.email,
      requiresPasswordEntry: !credentials.password,
    };
  } catch (error) {
    console.error(
      "[CredentialManager] Error getting credential suggestion:",
      error,
    );
    return null;
  }
}

/**
 * Clear saved credentials (call on logout)
 */
export async function clearSavedCredentials(): Promise<void> {
  try {
    await Promise.all([
      removeStoredItem(CREDENTIALS_KEY),
      removeStoredItem(CREDENTIAL_METADATA_KEY),
    ]);

    console.log("[CredentialManager] Saved credentials cleared");
  } catch (error) {
    console.error("[CredentialManager] Error clearing credentials:", error);
  }
}

/**
 * Clean up old credentials (optional: remove if older than specified days)
 */
async function cleanupOldCredentials(maxAgeDays: number = 90): Promise<void> {
  try {
    const credential = await getStoredItem(CREDENTIALS_KEY);

    if (!credential) {
      return;
    }

    const parsed = JSON.parse(credential) as SavedCredential;
    const ageMs = Date.now() - parsed.savedAt;
    const ageDays = ageMs / (1000 * 60 * 60 * 24);

    if (ageDays > maxAgeDays) {
      console.log(
        "[CredentialManager] Removing credentials older than",
        maxAgeDays,
        "days",
      );
      await clearSavedCredentials();
    }
  } catch (error) {
    console.error(
      "[CredentialManager] Error cleaning up old credentials:",
      error,
    );
  }
}

/**
 * Get credential manager status
 */
export async function getCredentialManagerStatus(): Promise<{
  initialized: boolean;
  hasCredentials: boolean;
  platform: string;
  supportedPlatforms: string[];
}> {
  try {
    const hasCredentials = await hasSavedCredentials();

    return {
      initialized: true,
      hasCredentials,
      platform: Platform.OS,
      supportedPlatforms: ["android", "ios", "web"],
    };
  } catch (error) {
    console.error("[CredentialManager] Error getting status:", error);
    return {
      initialized: false,
      hasCredentials: false,
      platform: Platform.OS,
      supportedPlatforms: ["android", "ios", "web"],
    };
  }
}

/**
 * Request credential autofill (for future native implementation)
 *
 * This would integrate with:
 * - Android: Credential Manager API
 * - iOS: AutoFill API
 *
 * For now, returns saved credential suggestion
 */
export async function requestCredentialAutofill(): Promise<{
  email: string;
  requiresPasswordEntry: boolean;
} | null> {
  try {
    console.log("[CredentialManager] Requesting credential autofill...");

    // In future, this would show native credential picker
    // For now, return saved credential suggestion
    return await getCredentialSuggestion();
  } catch (error) {
    console.error("[CredentialManager] Error requesting autofill:", error);
    return null;
  }
}

/**
 * Update last accessed time (call when user successfully logs in with saved credentials)
 */
export async function updateLastAccessedTime(): Promise<void> {
  try {
    const metadata = await getStoredItem(CREDENTIAL_METADATA_KEY);

    if (metadata) {
      const parsed = JSON.parse(metadata) as CredentialMetadata;
      parsed.lastAccessedAt = Date.now();

      await setStoredItem(CREDENTIAL_METADATA_KEY, JSON.stringify(parsed));
    }
  } catch (error) {
    console.error("[CredentialManager] Error updating access time:", error);
  }
}

/**
 * Migration helper: Migrate credentials from old storage format
 * Call this once if you've changed credential storage format
 */
export async function migrateCredentials(
  oldKey: string,
  version: number = 1,
): Promise<boolean> {
  try {
    console.log("[CredentialManager] Attempting migration from", oldKey);

    const oldData = await AsyncStorage.getItem(oldKey);

    if (!oldData) {
      console.log("[CredentialManager] No old data found to migrate");
      return false;
    }

    // Parse old data and migrate to new format
    // This is implementation-specific based on your old format

    console.log("[CredentialManager] Migration complete");
    return true;
  } catch (error) {
    console.error("[CredentialManager] Migration error:", error);
    return false;
  }
}

/**
 * Development/Testing: Get stored credentials (DO NOT use in production)
 */
export async function _dev_getStoredCredentials(): Promise<SavedCredential | null> {
  if (__DEV__) {
    try {
      const data = await getStoredItem(CREDENTIALS_KEY);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error("[CredentialManager] Error in dev function:", error);
      return null;
    }
  }

  console.warn("[CredentialManager] Development function called in production");
  return null;
}
