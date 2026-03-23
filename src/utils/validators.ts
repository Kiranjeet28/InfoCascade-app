// ─── Email Validation (Gmail) ─────────────────────────────────────────────────────────

const GMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;

export function isValidGmail(email: string): boolean {
    return GMAIL_REGEX.test(email.trim());
}

export function getGmailError(email: string): string | null {
    if (!email.trim()) return 'Gmail address is required';
    if (!isValidGmail(email)) return 'Please enter a valid Gmail address (must end with @gmail.com)';
    return null;
}

// Legacy email validation (kept for backwards compatibility)
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
    return EMAIL_REGEX.test(email.trim());
}

export function getEmailError(email: string): string | null {
    if (!email.trim()) return 'Email is required';
    if (!isValidEmail(email)) return 'Please enter a valid email address';
    return null;
}

// ─── URN/CRN Validation ───────────────────────────────────────────────────────

export function isValidURN(urn: string): boolean {
    return /^\d{7}$/.test(urn.trim());
}

export function isValidCRN(crn: string): boolean {
    return /^\d{7}$/.test(crn.trim());
}

export function getURNError(urn: string): string | null {
    if (!urn.trim()) return 'URN is required';
    if (!isValidURN(urn)) return 'URN must be exactly 7 digits';
    return null;
}

export function getCRNError(crn: string): string | null {
    if (!crn.trim()) return 'CRN is required';
    if (!isValidCRN(crn)) return 'CRN must be exactly 7 digits';
    return null;
}

// ─── Password Validation ──────────────────────────────────────────────────────

export interface PasswordChecks {
    hasAlphabet: boolean;
    hasNumber: boolean;
    hasSpecialChar: boolean;
    isLongEnough: boolean; // >= 8 chars
}

export function validatePassword(password: string): PasswordChecks {
    return {
        hasAlphabet: /[a-zA-Z]/.test(password),
        hasNumber: /[0-9]/.test(password),
        hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
        isLongEnough: password.length >= 8,
    };
}

export function isPasswordStrong(password: string): boolean {
    const checks = validatePassword(password);
    return checks.hasAlphabet && checks.hasNumber && checks.hasSpecialChar && checks.isLongEnough;
}

export function getPasswordError(password: string, skipStrengthCheck = false): string | null {
    if (!password) return 'Password is required';
    if (password.length < 8) return 'Password must be at least 8 characters';

    if (!skipStrengthCheck) {
        const checks = validatePassword(password);
        if (!checks.hasAlphabet) return 'Password must contain both uppercase and lowercase letters';
        if (!checks.hasNumber) return 'Password must contain at least one number';
        if (!checks.hasSpecialChar) return 'Password must contain special characters (!@#$%^&*)';
    }

    return null;
}

// ─── OTP Validation ───────────────────────────────────────────────────────────

export function isValidOtp(otp: string): boolean {
    return /^\d{6}$/.test(otp);
}

export function getOtpError(otp: string): string | null {
    if (!otp) return 'OTP is required';
    if (otp.length < 6) return 'Enter all 6 digits';
    if (!isValidOtp(otp)) return 'OTP must be 6 digits';
    return null;
}

// ─── Name Validation ──────────────────────────────────────────────────────────

export function isValidName(name: string): boolean {
    return name.trim().length >= 2;
}

export function getNameError(name: string): string | null {
    if (!name.trim()) return 'Name is required';
    if (!isValidName(name)) return 'Name must be at least 2 characters';
    return null;
}

// ─── Error Code Mapping ───────────────────────────────────────────────────────

export interface ApiErrorInfo {
    code: string;
    userMessage: string;
    actionable: boolean;
}

export function mapApiErrorCode(code: string): ApiErrorInfo {
    const errorMap: Record<string, ApiErrorInfo> = {
        // Login/Password errors
        'INVALID_PASSWORD': {
            code: 'INVALID_PASSWORD',
            userMessage: 'Invalid password. Please try again.',
            actionable: true,
        },
        'USER_NOT_FOUND': {
            code: 'USER_NOT_FOUND',
            userMessage: 'User not found. Please sign up first.',
            actionable: true,
        },
        'OTP_VERIFICATION_REQUIRED': {
            code: 'OTP_VERIFICATION_REQUIRED',
            userMessage: 'Too many failed attempts. OTP verification required.',
            actionable: false,
        },

        // Signup errors
        'WEAK_PASSWORD': {
            code: 'WEAK_PASSWORD',
            userMessage: 'Password must be at least 8 characters with letters, numbers, and special characters.',
            actionable: true,
        },
        'USER_EMAIL_ALREADY_EXISTS': {
            code: 'USER_EMAIL_ALREADY_EXISTS',
            userMessage: 'This email is already registered. Please log in instead.',
            actionable: true,
        },

        // OTP errors
        'INVALID_OTP': {
            code: 'INVALID_OTP',
            userMessage: 'Invalid or expired OTP. Please try again or request a new code.',
            actionable: true,
        },
        'OTP_EXPIRED': {
            code: 'OTP_EXPIRED',
            userMessage: 'OTP has expired. Please request a new one.',
            actionable: true,
        },

        // Token errors
        'INVALID_TOKEN': {
            code: 'INVALID_TOKEN',
            userMessage: 'Session expired. Please log in again.',
            actionable: false,
        },
        'TOKEN_EXPIRED': {
            code: 'TOKEN_EXPIRED',
            userMessage: 'Your session has expired. Please log in again.',
            actionable: false,
        },

        // Generic errors
        'NETWORK_ERROR': {
            code: 'NETWORK_ERROR',
            userMessage: 'Network error. Please check your connection.',
            actionable: true,
        },
        'SERVER_ERROR': {
            code: 'SERVER_ERROR',
            userMessage: 'Server error. Please try again later.',
            actionable: true,
        },
    };

    return errorMap[code] || {
        code: 'UNKNOWN_ERROR',
        userMessage: 'An error occurred. Please try again.',
        actionable: true,
    };
}

// ─── Network Validation ───────────────────────────────────────────────────────

export function isNetworkError(error: unknown): boolean {
    if (error instanceof Error) {
        const msg = error.message.toLowerCase();
        return msg.includes('network') || msg.includes('timeout') || msg.includes('fetch');
    }
    return false;
}

export function getNetworkErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message.toLowerCase().includes('timeout')) {
        return 'Request timed out. Please check your connection.';
    }
    return 'Network error. Please check your connection.';
}

// ─── Form Validation ──────────────────────────────────────────────────────────

export interface LoginFormErrors {
    email?: string;
    password?: string;
}

export interface SignupFormErrors {
    name?: string;
    email?: string;
    password?: string;
}

export function validateLoginForm(email: string, password: string): LoginFormErrors {
    const errors: LoginFormErrors = {};

    const emailError = getEmailError(email);
    if (emailError) errors.email = emailError;

    if (!password) errors.password = 'Password is required';

    return errors;
}

export function validateSignupForm(name: string, email: string, password: string): SignupFormErrors {
    const errors: SignupFormErrors = {};

    const nameError = getNameError(name);
    if (nameError) errors.name = nameError;

    const emailError = getEmailError(email);
    if (emailError) errors.email = emailError;

    const passwordError = getPasswordError(password);
    if (passwordError) errors.password = passwordError;

    return errors;
}

export function hasFormErrors(errors: Record<string, string | undefined>): boolean {
    return Object.values(errors).some((err) => err !== undefined);
}
