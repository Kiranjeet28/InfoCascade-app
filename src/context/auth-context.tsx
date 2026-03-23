import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { clearJwtAuth } from '../utils/auth-cache';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuthUser {
    id: string;
    name: string;
    email: string;
}

export interface AuthContextType {
    // Auth state
    isAuthenticated: boolean;
    user: AuthUser | null;
    token: string | null;
    loading: boolean;

    // Login attempt tracking
    attemptsRemaining: number;
    totalAttempts: number;

    error: string;

    // Form data
    formData: {
        email: string;
        password: string;
    };

    // Actions
    setFormData: (data: Partial<AuthContextType['formData']>) => void;
    setEmail: (email: string) => void;
    setPassword: (password: string) => void;
    setError: (error: string) => void;
    setLoading: (loading: boolean) => void;

    // Login attempt tracking
    recordFailedAttempt: (attemptsRemaining: number) => void;
    resetAttempts: () => void;

    // Auth actions
    setAuthData: (user: AuthUser, token: string) => Promise<void>;
    logout: () => Promise<void>;
    clearError: () => void;
}

// ─── Default Context ──────────────────────────────────────────────────────────

const defaultContext: AuthContextType = {
    isAuthenticated: false,
    user: null,
    token: null,
    loading: false,
    attemptsRemaining: 3,
    totalAttempts: 0,
    error: '',
    formData: { email: '', password: '' },
    setFormData: () => { },
    setEmail: () => { },
    setPassword: () => { },
    setError: () => { },
    setLoading: () => { },
    recordFailedAttempt: () => { },
    resetAttempts: () => { },
    setAuthData: async () => { },
    logout: async () => { },
    clearError: () => { },
};

const AuthContext = createContext<AuthContextType>(defaultContext);

// ─── Storage Keys ─────────────────────────────────────────────────────────────

const AUTH_TOKEN_KEY = 'auth_token';
const AUTH_USER_KEY = 'auth_user';

interface StoredAuth {
    token: string;
    user: AuthUser;
    savedAt: number;
}

// ─── Provider ──────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState<AuthUser | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const [attemptsRemaining, setAttemptsRemaining] = useState(3);
    const [totalAttempts, setTotalAttempts] = useState(0);

    const [error, setError] = useState('');

    const [formData, setFormDataState] = useState({
        email: '',
        password: '',
    });

    const [initialCheckDone, setInitialCheckDone] = useState(false);

    // ── Check cached auth on app load ──────────────────────────────────────
    useEffect(() => {
        async function checkCachedAuth() {
            try {
                console.log('[AuthProvider] Checking cached auth...');

                let storedToken = null;
                let storedUser = null;

                try {
                    storedToken = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
                } catch (err) {
                    console.warn('[AuthProvider] Error reading token:', err);
                }

                try {
                    storedUser = await AsyncStorage.getItem(AUTH_USER_KEY);
                } catch (err) {
                    console.warn('[AuthProvider] Error reading user:', err);
                }

                if (storedToken && storedUser) {
                    try {
                        const parsed = JSON.parse(storedUser) as StoredAuth;
                        if (parsed?.user?.id && parsed?.user?.email) {
                            console.log('[AuthProvider] Cached auth valid, restoring session');
                            setToken(storedToken);
                            setUser(parsed.user);
                            setIsAuthenticated(true);
                        } else {
                            console.warn('[AuthProvider] Cached auth invalid format, clearing');
                            await Promise.all([
                                AsyncStorage.removeItem(AUTH_TOKEN_KEY),
                                AsyncStorage.removeItem(AUTH_USER_KEY),
                            ]);
                        }
                    } catch (parseErr) {
                        console.warn('[AuthProvider] Error parsing stored user:', parseErr);
                        await Promise.all([
                            AsyncStorage.removeItem(AUTH_TOKEN_KEY),
                            AsyncStorage.removeItem(AUTH_USER_KEY),
                        ]).catch(err => console.warn('[AuthProvider] Error clearing corrupted data:', err));
                    }
                }
            } catch (err) {
                console.error('[AuthProvider] Unexpected error checking cached auth:', err);
            } finally {
                setInitialCheckDone(true);
            }
        }

        checkCachedAuth();
    }, []);

    // ── Helper functions ───────────────────────────────────────────────────

    const setFormData = (data: Partial<AuthContextType['formData']>) => {
        setFormDataState((prev) => ({ ...prev, ...data }));
    };

    const setAuthData = async (authUser: AuthUser, authToken: string) => {
        try {
            console.log('[AuthContext] Setting auth data for user:', authUser.email);
            setUser(authUser);
            setToken(authToken);
            setIsAuthenticated(true);
            console.log('[AuthContext] Auth data set. isAuthenticated:', true);

            const stored: StoredAuth = {
                token: authToken,
                user: authUser,
                savedAt: Date.now(),
            };
            await Promise.all([
                AsyncStorage.setItem(AUTH_TOKEN_KEY, authToken),
                AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(stored)),
            ]);
            console.log('[AuthContext] Auth data persisted to storage');

            resetAttempts();
            clearError();
        } catch (err) {
            console.error('Error saving auth data:', err);
        }
    };

    const logout = async () => {
        try {
            setIsAuthenticated(false);
            setUser(null);
            setToken(null);
            setFormDataState({ email: '', password: '' });
            resetAttempts();
            setError('');

            await clearJwtAuth();
        } catch (err) {
            console.error('Error during logout:', err);
        }
    };

    const clearError = () => setError('');

    const recordFailedAttempt = (attemptsRemaining: number) => {
        setTotalAttempts((prev) => prev + 1);
        setAttemptsRemaining(attemptsRemaining);
    };

    const resetAttempts = () => {
        setAttemptsRemaining(3);
        setTotalAttempts(0);
    };

    const setEmail = (email: string) => {
        setFormDataState((prev) => ({ ...prev, email }));
    };

    const setPassword = (password: string) => {
        setFormDataState((prev) => ({ ...prev, password }));
    };

    const value: AuthContextType = {
        isAuthenticated,
        user,
        token,
        loading,
        attemptsRemaining,
        totalAttempts,
        error,
        formData,
        setFormData,
        setEmail,
        setPassword,
        setError,
        setLoading,
        recordFailedAttempt,
        resetAttempts,
        setAuthData,
        logout,
        clearError,
    };

    if (!initialCheckDone) {
        return null;
    }

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
}
