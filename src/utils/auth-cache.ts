import AsyncStorage from '@react-native-async-storage/async-storage';

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