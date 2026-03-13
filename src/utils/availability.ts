/**
 * Availability Checking Utility with Debouncing
 * Validates email, URN, and CRN availability against backend
 */

import { resolveApiBase } from './api';

export type AvailabilityStatus = 'idle' | 'checking' | 'available' | 'taken' | 'error';

interface AvailabilityResult {
    status: AvailabilityStatus;
    message?: string;
}

interface CachedResult {
    value: string;
    result: AvailabilityResult;
    timestamp: number;
}

// Cache results for 30 minutes to avoid duplicate checks
const CACHE_DURATION = 30 * 60 * 1000;

// Store cached results per field type
const cache: Record<string, CachedResult> = {
    email: { value: '', result: { status: 'idle' }, timestamp: 0 },
    urn: { value: '', result: { status: 'idle' }, timestamp: 0 },
    crn: { value: '', result: { status: 'idle' }, timestamp: 0 },
};

// Store debounce timers
const timers: Record<string, NodeJS.Timeout | null> = {
    email: null,
    urn: null,
    crn: null,
};

/**
 * Check availability against backend with debouncing
 * @param type - Type of field to check (email | urn | crn)
 * @param value - Value to check
 * @param callback - Callback to handle result
 * @param debounceMs - Debounce delay in milliseconds (default: 400ms)
 */
export function checkAvailabilityDebounced(
    type: 'email' | 'urn' | 'crn',
    value: string,
    callback: (result: AvailabilityResult) => void,
    debounceMs: number = 400
): void {
    // Clear existing timer
    if (timers[type]) {
        clearTimeout(timers[type]!);
        timers[type] = null;
    }

    // Don't check empty values
    if (!value || !value.trim()) {
        callback({ status: 'idle' });
        return;
    }

    // Check cache first
    const cachedResult = cache[type];
    if (
        cachedResult.value === value.trim() &&
        Date.now() - cachedResult.timestamp < CACHE_DURATION
    ) {
        callback(cachedResult.result);
        return;
    }

    // Show "checking" status immediately
    callback({ status: 'checking' });

    // Set debounce timer
    timers[type] = setTimeout(async () => {
        try {
            const base = resolveApiBase().replace(/\/$/, '');
            const encodedValue = encodeURIComponent(value.trim());
            const url = `${base}/api/students/check-availability?type=${type}&value=${encodedValue}`;

            console.log(`[Availability] Checking ${type}:`, value.trim());

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);

            const res = await fetch(url, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            const data = await res.json().catch(() => ({}));

            console.log(`[Availability] ${type} response:`, { status: res.status, data });

            let result: AvailabilityResult;

            if (res.ok && data.available === true) {
                result = {
                    status: 'available',
                    message: `${type === 'email' ? 'Email' : type === 'urn' ? 'URN' : 'CRN'} is available ✓`,
                };
            } else if (res.ok && data.available === false) {
                result = {
                    status: 'taken',
                    message: data.message || `This ${type} is already registered`,
                };
            } else if (!res.ok && res.status === 400) {
                // Format validation error
                result = {
                    status: 'error',
                    message: data.error || data.message || 'Invalid format',
                };
            } else if (res.status >= 500) {
                result = {
                    status: 'error',
                    message: 'Server error. Please try again later.',
                };
            } else {
                result = {
                    status: 'error',
                    message: data.error || data.message || 'Unable to validate right now',
                };
            }

            // Cache the result
            cache[type] = {
                value: value.trim(),
                result,
                timestamp: Date.now(),
            };

            callback(result);
        } catch (error: any) {
            console.error(`[Availability] ${type} check failed:`, error?.message);

            const result: AvailabilityResult = {
                status: 'error',
                message:
                    error?.name === 'AbortError'
                        ? 'Validation timed out. Please try again.'
                        : 'Unable to validate right now',
            };

            callback(result);
        }
    }, debounceMs);
}

/**
 * Clear all cached results (useful after successful registration)
 */
export function clearAvailabilityCache(): void {
    Object.keys(cache).forEach((key) => {
        cache[key] = { value: '', result: { status: 'idle' }, timestamp: 0 };
    });
}

/**
 * Cancel pending availability checks
 */
export function cancelPendingChecks(): void {
    Object.values(timers).forEach((timer) => {
        if (timer) clearTimeout(timer);
    });
}
