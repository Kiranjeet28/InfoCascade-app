// ─── OTP Service ──────────────────────────────────────────────────────────────
// Handles OTP send & verify via backend endpoints
// Backend generates, stores (Redis) and verifies OTPs — frontend never sees the code

import { fetchWithTimeout, resolveApiBase } from '../utils/api';

// Derive API base at runtime (keeps behavior consistent with other helpers)
const API_URL = resolveApiBase();

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Validate Gmail email format
export function isValidGNDECEmail(email: string): boolean {
    const emailLower = email.toLowerCase().trim();
    return emailLower.endsWith('@gmail.com');
}

// ─── Send OTP (POST /api/otp/send) ───────────────────────────────────────────
// Backend generates the OTP, stores it in Redis and sends the email.
export async function sendOTP(email: string): Promise<{ success: boolean; message: string }> {
    if (!isValidGNDECEmail(email)) {
        return { success: false, message: 'Please enter a valid Gmail address (@gmail.com)' };
    }

    const emailKey = email.toLowerCase().trim();
    console.debug('[OTP] API_URL:', API_URL);

    const TIMEOUT_MS = 8000; // Reduced from 15s to 8s
    const MAX_RETRIES = 1;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
            const res = await fetchWithTimeout(`${API_URL}/api/otp/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: emailKey }),
            }, TIMEOUT_MS);

            const data = await res.json().catch(() => ({}));

            if (res.ok && (data.success || data.ok)) {
                return { success: true, message: data.message || 'OTP sent to your email!' };
            }

            console.error('OTP send failed', { status: res.status, body: data });
            return { success: false, message: data.message || `Failed to send OTP (${res.status}). Please try again.` };
        } catch (err: any) {
            console.error(`Attempt ${attempt + 1} error sending OTP:`, err?.name || err);
            if (attempt < MAX_RETRIES) {
                await new Promise((r) => setTimeout(r, 800 * Math.pow(2, attempt)));
                continue;
            }
            if (err?.name === 'AbortError') {
                return { success: false, message: 'Request timed out. Please try again.' };
            }
            return { success: false, message: 'Network error. Please check your connection and try again.' };
        }
    }
    return { success: false, message: 'Failed to send OTP. Please try again.' };
}

// ─── Verify OTP (POST /api/otp/verify) ───────────────────────────────────────
// Backend checks the OTP against its Redis store and returns success/failure.
export async function verifyOTP(email: string, otp: string): Promise<{ success: boolean; message: string }> {
    const emailKey = email.toLowerCase().trim();
    const otpTrimmed = otp.trim();

    if (!emailKey || !otpTrimmed) {
        return { success: false, message: 'Email and OTP are required.' };
    }

    try {
        const res = await fetchWithTimeout(`${API_URL}/api/otp/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: emailKey, otp: otpTrimmed }),
        }, 12000);

        const data = await res.json().catch(() => ({}));

        if (res.ok && (data.success || data.ok || data.verified)) {
            return { success: true, message: data.message || 'Email verified successfully!' };
        }

        return { success: false, message: data.message || `Verification failed (${res.status}).` };
    } catch (err: any) {
        console.error('Error verifying OTP:', err?.name || err);
        if (err?.name === 'AbortError') {
            return { success: false, message: 'Request timed out. Please try again.' };
        }
        return { success: false, message: 'Network error. Please check your connection and try again.' };
    }
}

// ─── Resend OTP (POST /api/otp/resend) ───────────────────────────────────────
// Invalidates the previous OTP and sends a fresh one via backend.
export async function resendOTP(email: string): Promise<{ success: boolean; message: string }> {
    if (!isValidGNDECEmail(email)) {
        return { success: false, message: 'Please enter a valid Gmail address (@gmail.com)' };
    }

    const emailKey = email.toLowerCase().trim();

    try {
        const res = await fetchWithTimeout(`${API_URL}/api/otp/resend`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: emailKey }),
        }, 15000);

        const data = await res.json().catch(() => ({}));

        if (res.ok && (data.success || data.ok)) {
            return { success: true, message: data.message || 'OTP resent to your email!' };
        }

        console.error('OTP resend failed', { status: res.status, body: data });
        return { success: false, message: data.message || `Failed to resend OTP (${res.status}).` };
    } catch (err: any) {
        console.error('Error resending OTP:', err?.name || err);
        if (err?.name === 'AbortError') {
            return { success: false, message: 'Request timed out. Please try again.' };
        }
        return { success: false, message: 'Network error. Please check your connection and try again.' };
    }
}

// ─── Clear helper (no-op) ─────────────────────────────────────────────────────
export function clearOTP(_email: string): void {
    // No-op: backend manages OTP lifecycle in Redis
}
