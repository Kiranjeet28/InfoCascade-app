import { fetchJson, fetchJsonAsync, postJsonAsync } from '@/utils/api';
import { mapApiErrorCode } from '@/utils/validators';

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
    maxAttempts?: number;
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

export interface EmailCheckResponse {
    success: boolean;
    exists: boolean;
    message?: string;
}

/** Trim + lowercase so send-OTP and verify-OTP hit the same key the server uses. */
export function normalizeAuthEmail(email: string): string {
    return email.trim().toLowerCase();
}

// ─── API Endpoints ────────────────────────────────────────────────────────────

/**
 * Sign up a new user with email, password, and name
 */
export async function signup(req: SignupRequest): Promise<SignupResponse> {
    try {
        const res = await postJsonAsync('/api/students/register', req, 12000);
        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.message || 'Signup failed');
        }

        return {
            success: data.success,
            token: data.token,
            user: {
                id: data.student?._id || data.user?.id,
                name: data.student?.name || data.user?.name,
                email: data.student?.email || data.user?.email,
            },
        } as SignupResponse;
    } catch (err) {
        console.error('Signup error:', err);
        throw err;
    }
}

function isAuthCheckEmailRouteMissing(res: Response, body: Record<string, unknown>): boolean {
    if (res.status !== 404) return false;
    const code = String(body?.code ?? '');
    const msg = String(body?.message ?? '').toLowerCase();
    return code === 'ROUTE_NOT_FOUND' || msg.includes('route not found');
}

/**
 * When `/api/auth/check-email` is not deployed, use the same student availability
 * endpoint as registration (GN email rules apply).
 */
async function checkEmailExistsStudentsFallback(trimmed: string): Promise<EmailCheckResponse> {
    const path = `/api/students/check-availability?type=email&value=${encodeURIComponent(trimmed)}`;
    const res = await fetchJsonAsync(path, {}, 10000);
    const data = (await res.json().catch(() => ({}))) as {
        available?: boolean;
        reason?: string;
        message?: string;
    };

    console.log('[Auth] Check email (students fallback) response:', { status: res.status, data });

    if (!res.ok) {
        return {
            success: false,
            exists: false,
            message: data.message || 'Failed to check email',
        };
    }

    if (data.available === true) {
        return {
            success: true,
            exists: false,
            message: 'No account for this email. Create one first.',
        };
    }

    if (data.available === false) {
        const reason = (data.reason || data.message || '').trim();
        if (
            reason &&
            /must be|valid.*@|invalid|format|gmail/i.test(reason) &&
            !/already|registered|taken/i.test(reason)
        ) {
            return {
                success: false,
                exists: false,
                message: reason,
            };
        }
        return {
            success: true,
            exists: true,
            message: 'Account found. Enter your password.',
        };
    }

    return {
        success: false,
        exists: false,
        message: 'Unable to verify email.',
    };
}

/**
 * Check if an email exists for login. Prefers `/api/auth/check-email/:email` when the
 * backend implements it; otherwise falls back to `/api/students/check-availability`
 * (avoids "Route not found" on servers that only expose the student API).
 */
export async function checkEmailExists(email: string): Promise<EmailCheckResponse> {
    const trimmed = normalizeAuthEmail(email);
    try {
        const res = await fetchJsonAsync(
            `/api/auth/check-email/${encodeURIComponent(trimmed)}`,
            {},
            10000
        );
        const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;

        console.log('[Auth] Check email response:', { status: res.status, exists: data.exists });

        if (res.ok) {
            return data as unknown as EmailCheckResponse;
        }

        if (isAuthCheckEmailRouteMissing(res, data)) {
            console.warn('[Auth] /api/auth/check-email not available, using students check-availability');
            return checkEmailExistsStudentsFallback(trimmed);
        }

        return {
            success: false,
            exists: false,
            message: (data.message as string) || 'Failed to check email',
        };
    } catch (err) {
        console.error('[Auth] Check email error:', {
            error: err instanceof Error ? err.message : String(err),
            email: trimmed,
        });
        return {
            success: false,
            exists: false,
            message: 'Failed to check email. Please try again.',
        };
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
        const res = await postJsonAsync('/api/students/sign', { identifier: email, password }, 12000);
        const data = await res.json();

        console.log('[Auth] Login response:', { status: res.status, success: data.success, code: data.code });

        // Handle different response codes
        if (res.ok && data.success) {
            // Backend returns 'student' object, map it to 'user'
            const user = data.student || data.user;
            return {
                success: true,
                code: data.code || 'LOGIN_SUCCESS',
                token: data.token,
                user: user ? {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                } : undefined,
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
        const res = await fetchJsonAsync(
            `/api/auth/check-otp-requirement/${encodeURIComponent(normalizeAuthEmail(email))}`,
            {},
            10000
        );
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
        const emailNorm = normalizeAuthEmail(email);
        console.log('[Auth] Sending OTP to:', emailNorm);
        const res = await postJsonAsync('/api/otp/send', { email: emailNorm }, 10000);
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
 * Called on Page 2 when user submits the 6-digit code.
 * Returns structured failures (401/400) instead of throwing so callers can read `code`
 * (many backends send USER_NOT_FOUND or INVALID_OTP on the same status).
 */
export async function verifyOtp(email: string, otp: string): Promise<OTPVerifyResponse> {
    try {
        const emailNorm = normalizeAuthEmail(email);
        const otpDigits = String(otp).replace(/\D/g, '').slice(0, 6);
        console.log('[Auth] Verifying OTP for:', emailNorm);
        const res = await postJsonAsync(
            '/api/otp/verify',
            { email: emailNorm, otp: otpDigits },
            12000
        );
        const data = (await res.json().catch(() => ({}))) as Record<string, any>;

        console.log('[Auth] Verify OTP response:', {
            status: res.status,
            success: data.success,
            code: data.code,
        });

        // Backend returns 'student' object, map it to 'user'
        const userObj = data.student || data.user;
        if (res.ok && data.success && data.token && userObj) {
            return {
                success: true,
                code: data.code || 'OTP_SUCCESS',
                token: data.token,
                user: {
                    id: userObj._id,
                    name: userObj.name,
                    email: userObj.email,
                },
                page: data.page,
            };
        }

        if (res.ok && !data.success) {
            return {
                success: false,
                code: data.code || 'INVALID_OTP',
                message: data.message,
            };
        }

        if (res.status === 401 || res.status === 400) {
            return {
                success: false,
                code: data.code || 'INVALID_OTP',
                message: data.message,
            };
        }

        if (res.status === 404) {
            return {
                success: false,
                code: data.code || 'ROUTE_NOT_FOUND',
                message: data.message || 'Verification service unavailable.',
            };
        }

        return {
            success: false,
            code: data.code || 'VERIFY_FAILED',
            message: data.message || 'Verification failed.',
        };
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
        const res = await postJsonAsync('/api/auth/logout', { email: normalizeAuthEmail(email) }, 10000);
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
    if (typeof error === 'string' && error.trim()) {
        const { userMessage, code } = mapApiErrorCode(error.trim());
        if (code !== 'UNKNOWN_ERROR') return userMessage;
    }

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

/**
 * OTP verify / resend: used when the request throws (network, etc.).
 * API error codes are handled via verifyOtp() return value, not here.
 */
export function mapOtpFlowErrorToUserMessage(
    error: unknown,
    defaultMessage: string = 'Something went wrong. Please try again.'
): string {
    if (error instanceof Error) {
        const msg = error.message.toLowerCase();
        if (msg.includes('timeout') || msg.includes('abort')) {
            return 'Request timed out. Check your connection and try again.';
        }
        if (msg.includes('network') || msg.includes('fetch') || msg.includes('failed to fetch')) {
            return 'Network error. Please check your connection.';
        }
        if (error.message.length > 0 && error.message.length < 200) return error.message;
    }
    return defaultMessage;
}
