import AsyncStorage from '@react-native-async-storage/async-storage';

const SESSION_KEY = 'auth_session';

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

export async function getSession(): Promise<AuthSession | null> {
    try {
        const raw = await AsyncStorage.getItem(SESSION_KEY);
        return raw ? (JSON.parse(raw) as AuthSession) : null;
    } catch {
        return null;
    }
}

export async function clearSession(): Promise<void> {
    await AsyncStorage.removeItem(SESSION_KEY);
}