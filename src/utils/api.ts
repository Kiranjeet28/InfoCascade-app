import Constants from 'expo-constants';
import { Platform } from 'react-native';

export function resolveApiBase(): string {
    const manifest: any = (Constants as any).manifest || (Constants as any).manifest2;
    const dbg = manifest && manifest.debuggerHost;
    if (dbg && typeof dbg === 'string') {
        const host = dbg.split(':')[0];
        return `http://${host}:5000`;
    }
    if (Platform.OS === 'android') return 'http://10.0.2.2:5000';
    return 'http://127.0.0.1:5000';
}

export function fetchWithTimeout(input: RequestInfo, init: RequestInit = {}, timeoutMs = 10000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    return fetch(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(id));
}

export async function postJson(path: string, body: any, timeoutMs = 12000) {
    const base = resolveApiBase();
    const url = path.startsWith('http') ? path : `${base}${path.startsWith('/') ? '' : '/'}${path}`;
    const res = await fetchWithTimeout(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    }, timeoutMs);
    return res;
}

export async function fetchJson(path: string, init: RequestInit = {}, timeoutMs = 12000) {
    const base = resolveApiBase();
    const url = path.startsWith('http') ? path : `${base}${path.startsWith('/') ? '' : '/'}${path}`;
    const res = await fetchWithTimeout(url, init, timeoutMs);
    return res;
}

export default { resolveApiBase, fetchWithTimeout, postJson, fetchJson };
