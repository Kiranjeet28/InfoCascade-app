/**
 * Hook for managing user credentials with Google Credential Manager / Smart Lock
 * Handles saving, retrieving, and clearing credentials securely
 */

import { useCallback, useEffect, useState } from 'react';
import {
  clearSavedCredentials,
  getCredentialManagerStatus,
  getCredentialSuggestion,
  getSavedEmail,
  hasSavedCredentials,
  initializeCredentialManager,
  promptToSaveCredentials,
  saveCredentials,
  updateLastAccessedTime,
} from '../services/google-credential-manager';

interface UseCredentialManagerResult {
  // Status
  isInitialized: boolean;
  hasSaved: boolean;
  loading: boolean;

  // Autofill
  suggestedEmail: string | null;
  canAutofill: boolean;

  // Actions
  saveCredentialOnLogin: (email: string, password: string) => Promise<boolean>;
  clearCredentials: () => Promise<void>;
  getSavedEmail: () => Promise<string | null>;
  recordSuccessfulLogin: () => Promise<void>;
}

export function useCredentialManager(): UseCredentialManagerResult {
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [suggestedEmail, setSuggestedEmail] = useState<string | null>(null);
  const [canAutofill, setCanAutofill] = useState(false);

  // Initialize credential manager on mount
  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);

        // Initialize the credential manager
        await initializeCredentialManager();

        // Check if credentials are saved
        const saved = await hasSavedCredentials();
        setHasSaved(saved);

        if (saved) {
          // Get suggested email for autofill
          const email = await getSavedEmail();
          setSuggestedEmail(email);
          setCanAutofill(!!email);
        }

        setIsInitialized(true);
        console.log('[useCredentialManager] Initialized');
      } catch (error) {
        console.error('[useCredentialManager] Initialization error:', error);
        setIsInitialized(true); // Still mark as initialized even on error
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  // Save credentials (typically called after successful login)
  const saveCredentialOnLogin = useCallback(
    async (email: string, password: string): Promise<boolean> => {
      try {
        // Show native prompt to user (in future: native credential picker)
        // For now, we save with user's consent from login flow
        const success = await promptToSaveCredentials(email, password);

        if (success) {
          setHasSaved(true);
          setSuggestedEmail(email);
          setCanAutofill(true);
          console.log('[useCredentialManager] Credentials saved');
        }

        return success;
      } catch (error) {
        console.error('[useCredentialManager] Error saving credentials:', error);
        return false;
      }
    },
    []
  );

  // Clear saved credentials (call on logout)
  const clearCredentials = useCallback(async () => {
    try {
      await clearSavedCredentials();
      setHasSaved(false);
      setSuggestedEmail(null);
      setCanAutofill(false);
      console.log('[useCredentialManager] Credentials cleared');
    } catch (error) {
      console.error('[useCredentialManager] Error clearing credentials:', error);
    }
  }, []);

  // Get saved email for autofill
  const getSavedEmailCallback = useCallback(async (): Promise<string | null> => {
    try {
      const email = await getSavedEmail();
      return email;
    } catch (error) {
      console.error('[useCredentialManager] Error getting saved email:', error);
      return null;
    }
  }, []);

  // Record successful login with saved credentials
  const recordSuccessfulLogin = useCallback(async () => {
    try {
      await updateLastAccessedTime();
      console.log('[useCredentialManager] Login recorded');
    } catch (error) {
      console.error('[useCredentialManager] Error recording login:', error);
    }
  }, []);

  return {
    isInitialized,
    hasSaved,
    loading,
    suggestedEmail,
    canAutofill,
    saveCredentialOnLogin,
    clearCredentials,
    getSavedEmail: getSavedEmailCallback,
    recordSuccessfulLogin,
  };
}
