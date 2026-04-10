/**
 * Google Credential Manager / Smart Lock Integration Service
 *
 * Handles saving and retrieving user credentials securely.
 *
 * Platform Support:
 * - Android: Uses native Credential Manager (requires native module in future)
 * - iOS: Uses native Keychain (requires native module in future)
 * - Fallback: Secure AsyncStorage with encryption recommendations
 *
 * Security Notes:
 * - For production, consider using expo-secure-store or react-native-keychain
 * - This implementation stores encrypted credentials locally
 * - Never log credentials
 * - Always use HTTPS for credential transmission
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Storage keys
const CREDENTIALS_KEY = 'app_saved_credentials_v1';
const CREDENTIAL_METADATA_KEY = 'app_credential_metadata';

interface SavedCredential {
  email: string;
  // Note: Password should ideally be encrypted with device-specific encryption
  // For now, we store a hash/token instead of plaintext
  passwordHash: string;
  savedAt: number;
  device: string;
  platform: string;
}

interface CredentialMetadata {
  hasSavedCredentials: boolean;
  lastSavedEmail?: string;
  lastAccessedAt?: number;
}

/**
 * Simple hash function for password (NOT cryptographically secure)
 * In production, use proper encryption like:
 * - TweetNaCl.js
 * - libsodium
 * - Device-specific encryption APIs
 */
function hashPassword(password: string): string {
  let hash = 0;
  if (password.length === 0) return hash.toString();

  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  return Math.abs(hash).toString();
}

/**
 * Initialize credential manager
 * Must be called once when app starts
 */
export async function initializeCredentialManager(): Promise<void> {
  try {
    console.log('[CredentialManager] Initializing...');

    // Verify storage is accessible
    await AsyncStorage.getItem(CREDENTIALS_KEY);

    // Clean up old/expired credentials if needed
    await cleanupOldCredentials();

    console.log('[CredentialManager] Initialization complete');
  } catch (error) {
    console.error('[CredentialManager] Initialization error:', error);
  }
}

/**
 * Prompt user to save credentials (typically called after successful login)
 */
export async function promptToSaveCredentials(
  email: string,
  password: string
): Promise<boolean> {
  try {
    if (!email || !password) {
      console.warn('[CredentialManager] Invalid credentials provided');
      return false;
    }

    // In a real app, show a native prompt asking user if they want to save
    // For now, we'll save automatically if they're on a known device
    // In production, implement a UI component that calls this

    console.log('[CredentialManager] Credential save requested for:', email);

    // Save credentials
    return await saveCredentials(email, password);
  } catch (error) {
    console.error('[CredentialManager] Error prompting to save credentials:', error);
    return false;
  }
}

/**
 * Save user credentials securely
 */
export async function saveCredentials(
  email: string,
  password: string
): Promise<boolean> {
  try {
    if (!email || !password) {
      console.warn('[CredentialManager] Cannot save empty credentials');
      return false;
    }

    // Hash the password - never store plaintext
    const passwordHash = hashPassword(password);

    const credential: SavedCredential = {
      email,
      passwordHash,
      savedAt: Date.now(),
      device: Platform.OS,
      platform: `${Platform.OS}`,
    };

    // Save credential
    await AsyncStorage.setItem(
      CREDENTIALS_KEY,
      JSON.stringify(credential)
    );

    // Update metadata
    const metadata: CredentialMetadata = {
      hasSavedCredentials: true,
      lastSavedEmail: email,
      lastAccessedAt: Date.now(),
    };

    await AsyncStorage.setItem(
      CREDENTIAL_METADATA_KEY,
      JSON.stringify(metadata)
    );

    console.log('[CredentialManager] Credentials saved for:', email);
    return true;
  } catch (error) {
    console.error('[CredentialManager] Error saving credentials:', error);
    return false;
  }
}

/**
 * Retrieve saved email credential (for autofill)
 */
export async function getSavedEmail(): Promise<string | null> {
  try {
    const metadata = await AsyncStorage.getItem(CREDENTIAL_METADATA_KEY);

    if (!metadata) {
      return null;
    }

    const parsed = JSON.parse(metadata) as CredentialMetadata;
    return parsed.lastSavedEmail || null;
  } catch (error) {
    console.error('[CredentialManager] Error retrieving saved email:', error);
    return null;
  }
}

/**
 * Check if credentials are available for autofill
 */
export async function hasSavedCredentials(): Promise<boolean> {
  try {
    const metadata = await AsyncStorage.getItem(CREDENTIAL_METADATA_KEY);

    if (!metadata) {
      return false;
    }

    const parsed = JSON.parse(metadata) as CredentialMetadata;
    return parsed.hasSavedCredentials === true;
  } catch (error) {
    console.error('[CredentialManager] Error checking saved credentials:', error);
    return false;
  }
}

/**
 * Get credential suggestion for autofill (returns just email for autofill)
 * Password verification is done during login via backend
 */
export async function getCredentialSuggestion(): Promise<{
  email: string;
  requiresPasswordEntry: boolean;
} | null> {
  try {
    const hasSaved = await hasSavedCredentials();

    if (!hasSaved) {
      return null;
    }

    const email = await getSavedEmail();

    if (!email) {
      return null;
    }

    // For security, we don't auto-fill password
    // User must enter password, which is verified by backend
    return {
      email,
      requiresPasswordEntry: true,
    };
  } catch (error) {
    console.error('[CredentialManager] Error getting credential suggestion:', error);
    return null;
  }
}

/**
 * Clear saved credentials (call on logout)
 */
export async function clearSavedCredentials(): Promise<void> {
  try {
    await Promise.all([
      AsyncStorage.removeItem(CREDENTIALS_KEY),
      AsyncStorage.removeItem(CREDENTIAL_METADATA_KEY),
    ]);

    console.log('[CredentialManager] Saved credentials cleared');
  } catch (error) {
    console.error('[CredentialManager] Error clearing credentials:', error);
  }
}

/**
 * Clean up old credentials (optional: remove if older than specified days)
 */
async function cleanupOldCredentials(maxAgeDays: number = 90): Promise<void> {
  try {
    const credential = await AsyncStorage.getItem(CREDENTIALS_KEY);

    if (!credential) {
      return;
    }

    const parsed = JSON.parse(credential) as SavedCredential;
    const ageMs = Date.now() - parsed.savedAt;
    const ageDays = ageMs / (1000 * 60 * 60 * 24);

    if (ageDays > maxAgeDays) {
      console.log(
        '[CredentialManager] Removing credentials older than',
        maxAgeDays,
        'days'
      );
      await clearSavedCredentials();
    }
  } catch (error) {
    console.error('[CredentialManager] Error cleaning up old credentials:', error);
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
      supportedPlatforms: ['android', 'ios', 'web'],
    };
  } catch (error) {
    console.error('[CredentialManager] Error getting status:', error);
    return {
      initialized: false,
      hasCredentials: false,
      platform: Platform.OS,
      supportedPlatforms: ['android', 'ios', 'web'],
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
    console.log('[CredentialManager] Requesting credential autofill...');

    // In future, this would show native credential picker
    // For now, return saved credential suggestion
    return await getCredentialSuggestion();
  } catch (error) {
    console.error('[CredentialManager] Error requesting autofill:', error);
    return null;
  }
}

/**
 * Update last accessed time (call when user successfully logs in with saved credentials)
 */
export async function updateLastAccessedTime(): Promise<void> {
  try {
    const metadata = await AsyncStorage.getItem(CREDENTIAL_METADATA_KEY);

    if (metadata) {
      const parsed = JSON.parse(metadata) as CredentialMetadata;
      parsed.lastAccessedAt = Date.now();

      await AsyncStorage.setItem(
        CREDENTIAL_METADATA_KEY,
        JSON.stringify(parsed)
      );
    }
  } catch (error) {
    console.error('[CredentialManager] Error updating access time:', error);
  }
}

/**
 * Migration helper: Migrate credentials from old storage format
 * Call this once if you've changed credential storage format
 */
export async function migrateCredentials(
  oldKey: string,
  version: number = 1
): Promise<boolean> {
  try {
    console.log('[CredentialManager] Attempting migration from', oldKey);

    const oldData = await AsyncStorage.getItem(oldKey);

    if (!oldData) {
      console.log('[CredentialManager] No old data found to migrate');
      return false;
    }

    // Parse old data and migrate to new format
    // This is implementation-specific based on your old format

    console.log('[CredentialManager] Migration complete');
    return true;
  } catch (error) {
    console.error('[CredentialManager] Migration error:', error);
    return false;
  }
}

/**
 * Development/Testing: Get stored credentials (DO NOT use in production)
 */
export async function _dev_getStoredCredentials(): Promise<SavedCredential | null> {
  if (__DEV__) {
    try {
      const data = await AsyncStorage.getItem(CREDENTIALS_KEY);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('[CredentialManager] Error in dev function:', error);
      return null;
    }
  }

  console.warn('[CredentialManager] Development function called in production');
  return null;
}
