import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Old URN-based session (for backwards compatibility with student login) ──

const SESSION_KEY = 'auth_session';
// 30 days default TTL
const DEFAULT_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export interface AuthSession {
    urn: string;
    token: string;
    name: string;
    savedAt: number;
}

export async function saveSession(data: Omit<AuthSession, 'savedAt'>): Promise<void> {
    const session: AuthSession = { ...data, savedAt: Date.now() };
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

// Returns session if present and not expired. ttlMs defaults to 30 days.
export async function getSession(ttlMs = DEFAULT_SESSION_TTL_MS): Promise<AuthSession | null> {
    try {
        const raw = await AsyncStorage.getItem(SESSION_KEY);
        if (!raw) return null;
        const session = JSON.parse(raw) as AuthSession;
        if (!session.savedAt) return session;
        if (Date.now() - session.savedAt > ttlMs) {
            await AsyncStorage.removeItem(SESSION_KEY);
            return null;
        }
        return session;
    } catch {
        return null;
    }
}

export async function clearSession(): Promise<void> {
    await AsyncStorage.removeItem(SESSION_KEY);
}

// ─── New JWT-based authentication (for email/password login) ──────────────────

// Must match auth-context.tsx (email/password login) so getJwtToken() sees tokens after sign-in
const JWT_TOKEN_KEY = 'auth_token';
const JWT_USER_KEY = 'auth_user';
const JWT_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface JwtUser {
    id: string;
    name: string;
    email: string;
}

export interface StoredJwtAuth {
    token: string;
    user: JwtUser;
    savedAt: number;
}

/**
 * Check if JWT token exists and is still valid
 */
export async function hasValidJwtToken(ttlMs = JWT_TOKEN_TTL_MS): Promise<boolean> {
    try {
        const token = await AsyncStorage.getItem(JWT_TOKEN_KEY);
        if (!token) return false;

        const userData = await AsyncStorage.getItem(JWT_USER_KEY);
        if (!userData) return false;

        const parsed = JSON.parse(userData) as StoredJwtAuth;
        if (!parsed.savedAt) return true;

        // Check if token has expired
        if (Date.now() - parsed.savedAt > ttlMs) {
            await clearJwtAuth();
            return false;
        }

        return true;
    } catch {
        return false;
    }
}

/**
 * Get JWT token from storage
 */
export async function getJwtToken(): Promise<string | null> {
    try {
        let token = await AsyncStorage.getItem(JWT_TOKEN_KEY);
        if (!token) {
            token = await AsyncStorage.getItem('auth_jwt_token');
            if (token) {
                await AsyncStorage.setItem(JWT_TOKEN_KEY, token);
                await AsyncStorage.removeItem('auth_jwt_token');
            }
        }
        return token;
    } catch {
        return null;
    }
}

/**
 * Get stored JWT user from storage
 */
export async function getJwtUser(): Promise<JwtUser | null> {
    try {
        let raw = await AsyncStorage.getItem(JWT_USER_KEY);
        if (!raw) {
            raw = await AsyncStorage.getItem('auth_jwt_user');
            if (raw) {
                await AsyncStorage.setItem(JWT_USER_KEY, raw);
                await AsyncStorage.removeItem('auth_jwt_user');
            }
        }
        if (!raw) return null;
        const parsed = JSON.parse(raw) as StoredJwtAuth;
        return parsed.user;
    } catch {
        return null;
    }
}

/**
 * Clear JWT authentication (called on logout or token expiry)
 */
export async function clearJwtAuth(): Promise<void> {
    try {
        await Promise.all([
            AsyncStorage.removeItem(JWT_TOKEN_KEY),
            AsyncStorage.removeItem(JWT_USER_KEY),
            AsyncStorage.removeItem('auth_jwt_token'),
            AsyncStorage.removeItem('auth_jwt_user'),
        ]);
    } catch {
        // Ignore errors
    }
}
