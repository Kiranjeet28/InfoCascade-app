import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Resolves the API base URL from multiple sources with priority:
 * 1. Environment variable EXPO_PUBLIC_API_URL (.env files)
 * 2. Development debugger host detection (Expo Go)
 * 3. Platform-specific defaults for local development
 * 
 * Works across all platforms: Web, Android APK, iOS, Expo Go
 * 
 * IMPORTANT: APK builds embed EXPO_PUBLIC_API_URL at build time.
 * Once built, the URL cannot be changed without rebuilding.
 */
export function resolveApiBase(): string {
    // Priority 1: Explicit environment variable (from .env, .env.production, etc.)
    const envUrl = process.env.EXPO_PUBLIC_API_URL;
    if (envUrl && envUrl.trim()) {
        console.log('[API] Using environment URL:', envUrl.trim());
        return envUrl.trim().replace(/\/$/, '');
    }

    console.warn('[API] No EXPO_PUBLIC_API_URL found in environment, using fallback');

    // Priority 2: Development mode - detect debugger host (Expo Go)
    const manifest: any = (Constants as any).manifest || (Constants as any).manifest2;
    const dbg = manifest && manifest.debuggerHost;
    if (dbg && typeof dbg === 'string') {
        const host = dbg.split(':')[0];
        console.log('[API] Using debugger host:', host);
        return `http://${host}:5000`;
    }

    // Priority 3: Platform-specific defaults for local development
    if (Platform.OS === 'android') {
        console.log('[API] Using Android fallback: 10.0.2.2:5000');
        return 'http://10.0.2.2:5000';
    }
    if (Platform.OS === 'ios') {
        console.log('[API] Using iOS fallback: localhost:5000');
        return 'http://localhost:5000';
    }
    if (Platform.OS === 'web') {
        console.log('[API] Using Web fallback: localhost:5000');
        return 'http://localhost:5000';
    }

    // Fallback
    console.log('[API] Using ultimate fallback: 127.0.0.1:5000');
    return 'http://127.0.0.1:5000';
}

export function fetchWithTimeout(input: RequestInfo, init: RequestInit = {}, timeoutMs = 10000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    return fetch(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(id));
}

export async function postJson(path: string, body: any, timeoutMs = 12000) {
    const base = resolveApiBase().replace(/\/$/, ''); // Remove trailing slash if exists
    const pathWithSlash = path.startsWith('/') ? path : `/${path}`;
    const url = `${base}${pathWithSlash}`;
    const res = await fetchWithTimeout(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    }, timeoutMs);
    return res;
}

export async function fetchJson(path: string, init: RequestInit = {}, timeoutMs = 12000) {
    const base = resolveApiBase().replace(/\/$/, ''); // Remove trailing slash if exists
    const pathWithSlash = path.startsWith('/') ? path : `/${path}`;
    const url = `${base}${pathWithSlash}`;
    const res = await fetchWithTimeout(url, init, timeoutMs);
    return res;
}

export default { resolveApiBase, fetchWithTimeout, postJson, fetchJson };
