import { fetchJson, postJson } from '@/utils/api';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuthUser {
    id: string;
    name: string;
    email: string;
}

export interface LoginResponse {
    success: boolean;
    code: string;
    token?: string;
    user?: AuthUser;
    page?: number;
    attemptsRemaining?: number;
    failedAttempts?: number;
    warning?: string;
    requireOTP?: boolean;
    message?: string;
}

export interface SignupRequest {
    name: string;
    email: string;
    password: string;
}

export interface SignupResponse {
    success: boolean;
    token: string;
    user: AuthUser;
}

export interface OTPSendResponse {
    success: boolean;
    message: string;
}

export interface OTPVerifyRequest {
    email: string;
    otp: string;
}

export interface OTPVerifyResponse {
    success: boolean;
    code: string;
    token?: string;
    user?: AuthUser;
    page?: number;
    message?: string;
}

export interface TokenVerifyResponse {
    success: boolean;
    valid: boolean;
    user?: AuthUser;
}

// ─── API Endpoints ────────────────────────────────────────────────────────────

/**
 * Sign up a new user with email, password, and name
 */
export async function signup(req: SignupRequest): Promise<SignupResponse> {
    try {
        const res = await postJson('/api/auth/signup', req, 12000);
        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.message || 'Signup failed');
        }

        return data as SignupResponse;
    } catch (err) {
        console.error('Signup error:', err);
        throw err;
    }
}

/**
 * Login with email and password
 * Returns different responses based on password attempts:
 * - 200: Success (token + user)
 * - 401: Wrong password (attemptsRemaining + warning)
 * - 403: Max attempts reached (requireOTP = true, page = 2)
 */
export async function login(email: string, password: string): Promise<LoginResponse> {
    try {
        const res = await postJson('/api/auth/login', { email, password }, 12000);
        const data = await res.json();

        console.log('[Auth] Login response:', { status: res.status, success: data.success, code: data.code });

        // Handle different response codes
        if (res.ok && data.success) {
            return {
                success: true,
                code: data.code || 'LOGIN_SUCCESS',
                token: data.token,
                user: data.user,
                page: 1,
            };
        }

        if (res.status === 401) {
            return {
                success: false,
                code: data.code || 'INVALID_PASSWORD',
                attemptsRemaining: data.attemptsRemaining || 0,
                failedAttempts: data.failedAttempts || 0,
                warning: data.warning || 'Invalid password',
                message: data.message,
            };
        }

        if (res.status === 403) {
            return {
                success: false,
                code: data.code || 'OTP_VERIFICATION_REQUIRED',
                requireOTP: true,
                page: 2,
                message: data.message || 'Too many failed attempts. OTP verification required.',
            };
        }

        // Other errors (e.g., user not found)
        throw new Error(data.message || 'Login failed');
    } catch (err) {
        console.error('[Auth] Login error:', {
            error: err instanceof Error ? err.message : String(err),
            email,
        });
        throw err;
    }
}

/**
 * Check if OTP verification is required for an email
 * Useful to determine which page to show on initial load
 */
export async function checkOtpRequirement(email: string): Promise<{ requireOTP: boolean; page: 1 | 2 }> {
    try {
        const res = await fetchJson(`/api/auth/check-otp-requirement/${encodeURIComponent(email)}`, {}, 10000);
        const data = await res.json();

        if (res.ok) {
            return {
                requireOTP: data.requireOTP || false,
                page: (data.page || 1) as 1 | 2,
            };
        }

        // Default to page 1 if check fails
        return { requireOTP: false, page: 1 };
    } catch (err) {
        console.error('Check OTP requirement error:', err);
        return { requireOTP: false, page: 1 };
    }
}

/**
 * Send OTP to email
 * Called after switching to Page 2, or when user clicks Resend
 */
export async function sendOtp(email: string): Promise<OTPSendResponse> {
    try {
        console.log('[Auth] Sending OTP to:', email);
        const res = await postJson('/api/otp/send', { email }, 10000);
        const data = await res.json();

        console.log('[Auth] Send OTP response:', { status: res.status, success: data.success });

        if (!res.ok) {
            throw new Error(data.message || 'Failed to send OTP');
        }

        return data as OTPSendResponse;
    } catch (err) {
        console.error('[Auth] Send OTP error:', {
            error: err instanceof Error ? err.message : String(err),
            email,
        });
        throw err;
    }
}

/**
 * Verify OTP code for login
 * Called on Page 2 when user submits the 6-digit code
 */
export async function verifyOtp(email: string, otp: string): Promise<OTPVerifyResponse> {
    try {
        console.log('[Auth] Verifying OTP for:', email);
        const res = await postJson('/api/auth/login-otp', { email, otp }, 12000);
        const data = await res.json();

        console.log('[Auth] Verify OTP response:', { status: res.status, success: data.success });

        if (!res.ok) {
            throw new Error(data.message || 'Invalid OTP');
        }

        return data as OTPVerifyResponse;
    } catch (err) {
        console.error('Verify OTP error:', err);
        throw err;
    }
}

/**
 * Verify if current token is valid
 * Call this on app load to check if user is still authenticated
 */
export async function verifyToken(token: string): Promise<TokenVerifyResponse> {
    try {
        const res = await fetchJson('/api/auth/verify', {
            headers: { Authorization: `Bearer ${token}` },
        }, 10000);
        const data = await res.json();

        if (!res.ok) {
            return { success: false, valid: false };
        }

        return data as TokenVerifyResponse;
    } catch (err) {
        console.error('Verify token error:', err);
        return { success: false, valid: false };
    }
}

/**
 * Logout user (optional - clears session on backend)
 */
export async function logout(email: string): Promise<{ success: boolean; message: string }> {
    try {
        const res = await postJson('/api/auth/logout', { email }, 10000);
        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.message || 'Logout failed');
        }

        return data;
    } catch (err) {
        console.error('Logout error:', err);
        throw err;
    }
}

// ─── Error Mapping ────────────────────────────────────────────────────────────

export function mapErrorToUserMessage(error: unknown, defaultMessage: string = 'An error occurred'): string {
    if (error instanceof Error) {
        const msg = error.message.toLowerCase();

        // Map specific error codes/messages
        if (msg.includes('invalid password')) return 'Invalid password. Please try again.';
        if (msg.includes('user not found')) return 'User not found. Please sign up first.';
        if (msg.includes('weak password')) return 'Password must be at least 8 characters.';
        if (msg.includes('email already')) return 'Email already registered.';
        if (msg.includes('invalid otp')) return 'Invalid or expired OTP. Please try again.';
        if (msg.includes('otp verification required')) return 'Too many failed attempts. OTP verification required.';
        if (msg.includes('timeout')) return 'Request timeout. Please check your connection.';
        if (msg.includes('network')) return 'Network error. Please check your connection.';

        return error.message;
    }

    return defaultMessage;
}
