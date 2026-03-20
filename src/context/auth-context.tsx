import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';

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
    requiresOTP: boolean;

    // UI state
    page: 1 | 2; // 1: Login, 2: OTP
    error: string;

    // OTP state
    otpSent: boolean;
    otpResendCountdown: number;

    // Form data
    formData: {
        email: string;
        password: string;
        otp: string;
    };

    // Actions
    setFormData: (data: Partial<AuthContextType['formData']>) => void;
    setEmail: (email: string) => void;
    setPassword: (password: string) => void;
    setOtp: (otp: string) => void;
    setError: (error: string) => void;
    setPage: (page: 1 | 2) => void;
    setLoading: (loading: boolean) => void;
    setOtpSent: (sent: boolean) => void;
    setOtpResendCountdown: (countdown: number) => void;

    // Login attempt tracking
    recordFailedAttempt: (attemptsRemaining: number) => void;
    recordOTPRequired: () => void;
    resetAttempts: () => void;

    // Auth actions
    setAuthData: (user: AuthUser, token: string) => Promise<void>;
    logout: () => Promise<void>;
    clearError: () => void;
    backToLoginPage: () => void;
}

// ─── Default Context ──────────────────────────────────────────────────────────

const defaultContext: AuthContextType = {
    isAuthenticated: false,
    user: null,
    token: null,
    loading: false,
    attemptsRemaining: 3,
    totalAttempts: 0,
    requiresOTP: false,
    page: 1,
    error: '',
    otpSent: false,
    otpResendCountdown: 0,
    formData: { email: '', password: '', otp: '' },
    setFormData: () => { },
    setEmail: () => { },
    setPassword: () => { },
    setOtp: () => { },
    setError: () => { },
    setPage: () => { },
    setLoading: () => { },
    setOtpSent: () => { },
    setOtpResendCountdown: () => { },
    recordFailedAttempt: () => { },
    recordOTPRequired: () => { },
    resetAttempts: () => { },
    setAuthData: async () => { },
    logout: async () => { },
    clearError: () => { },
    backToLoginPage: () => { },
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
    const [requiresOTP, setRequiresOTP] = useState(false);

    const [page, setPage] = useState<1 | 2>(1);
    const [error, setError] = useState('');

    const [otpSent, setOtpSent] = useState(false);
    const [otpResendCountdown, setOtpResendCountdown] = useState(0);

    const [formData, setFormDataState] = useState({
        email: '',
        password: '',
        otp: '',
    });

    const [initialCheckDone, setInitialCheckDone] = useState(false);

    // ── Check cached auth on app load ──────────────────────────────────────
    useEffect(() => {
        async function checkCachedAuth() {
            try {
                const storedToken = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
                const storedUser = await AsyncStorage.getItem(AUTH_USER_KEY);

                if (storedToken && storedUser) {
                    const parsed = JSON.parse(storedUser) as StoredAuth;
                    // Note: In production, you'd verify the token here via API
                    setToken(storedToken);
                    setUser(parsed.user);
                    setIsAuthenticated(true);
                }
            } catch (err) {
                console.error('Error checking cached auth:', err);
            } finally {
                setInitialCheckDone(true);
            }
        }

        checkCachedAuth();
    }, []);

    // ── Resend countdown timer ─────────────────────────────────────────────
    useEffect(() => {
        if (otpResendCountdown <= 0) return;

        const timer = setTimeout(() => {
            setOtpResendCountdown(otpResendCountdown - 1);
        }, 1000);

        return () => clearTimeout(timer);
    }, [otpResendCountdown]);

    // ── Helper functions ───────────────────────────────────────────────────

    const setFormData = (data: Partial<AuthContextType['formData']>) => {
        setFormDataState((prev) => ({ ...prev, ...data }));
    };

    const setAuthData = async (authUser: AuthUser, authToken: string) => {
        try {
            // Save to state
            setUser(authUser);
            setToken(authToken);
            setIsAuthenticated(true);

            // Save to AsyncStorage
            const stored: StoredAuth = {
                token: authToken,
                user: authUser,
                savedAt: Date.now(),
            };
            await Promise.all([
                AsyncStorage.setItem(AUTH_TOKEN_KEY, authToken),
                AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(stored)),
            ]);

            // Reset auth form
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
            setFormDataState({ email: '', password: '', otp: '' });
            resetAttempts();
            setPage(1);
            setError('');

            await Promise.all([
                AsyncStorage.removeItem(AUTH_TOKEN_KEY),
                AsyncStorage.removeItem(AUTH_USER_KEY),
            ]);
        } catch (err) {
            console.error('Error during logout:', err);
        }
    };

    const clearError = () => setError('');

    const recordFailedAttempt = (attemptsRemaining: number) => {
        setTotalAttempts((prev) => prev + 1);
        setAttemptsRemaining(attemptsRemaining);
    };

    const recordOTPRequired = () => {
        setRequiresOTP(true);
        setPage(2);
        setOtpSent(true);
    };

    const resetAttempts = () => {
        setAttemptsRemaining(3);
        setTotalAttempts(0);
        setRequiresOTP(false);
        setOtpSent(false);
        setOtpResendCountdown(0);
        setPage(1);
    };

    const backToLoginPage = () => {
        setPage(1);
        setOtp('');
        setError('');
        setOtpSent(false);
        // Keep email for retry
    };

    const setOtp = (otp: string) => {
        setFormDataState((prev) => ({ ...prev, otp }));
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
        requiresOTP,
        page,
        error,
        otpSent,
        otpResendCountdown,
        formData,
        setFormData,
        setEmail,
        setPassword,
        setOtp,
        setError,
        setPage,
        setLoading,
        setOtpSent,
        setOtpResendCountdown,
        recordFailedAttempt,
        recordOTPRequired,
        resetAttempts,
        setAuthData,
        logout,
        clearError,
        backToLoginPage,
    };

    if (!initialCheckDone) {
        return null; // Or a splash screen
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
