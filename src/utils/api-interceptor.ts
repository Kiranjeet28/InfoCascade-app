import { getJwtToken } from './auth-cache';

// ─── API Interceptor Setup ────────────────────────────────────────────────────

/**
 * Add JWT token to request headers if available
 * Call this function before making API requests
 */
export async function setupAuthHeaders(): Promise<HeadersInit> {
    const token = await getJwtToken();
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
}

/**
 * Wrapper for fetch that automatically includes auth headers
 */
export async function fetchWithAuth(
    input: RequestInfo,
    init: RequestInit = {},
    timeoutMs = 10000
): Promise<Response> {
    const authHeaders = await setupAuthHeaders();
    const mergedHeaders = { ...authHeaders, ...init.headers };

    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);

    return fetch(input, {
        ...init,
        headers: mergedHeaders,
        signal: controller.signal,
    }).finally(() => clearTimeout(id));
}

/**
 * Wrapper for POST requests with auth
 */
export async function postJsonWithAuth(
    path: string,
    body: any,
    timeoutMs = 12000
): Promise<Response> {
    const headers = await setupAuthHeaders();
    const response = await fetchWithAuth(path, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
    }, timeoutMs);

    return response;
}

/**
 * Wrapper for GET requests with auth
 */
export async function getJsonWithAuth(
    path: string,
    init: RequestInit = {},
    timeoutMs = 10000
): Promise<Response> {
    const headers = await setupAuthHeaders();
    return fetchWithAuth(path, {
        ...init,
        headers,
    }, timeoutMs);
}

// ─── Error Handling ───────────────────────────────────────────────────────────

/**
 * Handle API response errors, checking for auth-related issues
 */
export async function handleApiError(response: Response): Promise<never> {
    const data = await response.json().catch(() => ({}));

    // Check for token expiry
    if (response.status === 401) {
        const code = data.code || '';
        if (code === 'INVALID_TOKEN' || code === 'TOKEN_EXPIRED') {
            // Token expired - will be handled by caller
            throw new Error(data.message || 'Session expired. Please log in again.');
        }
    }

    throw new Error(data.message || `API Error: ${response.status}`);
}
