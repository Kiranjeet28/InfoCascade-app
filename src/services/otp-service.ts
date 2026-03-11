// ─── OTP Service ──────────────────────────────────────────────────────────────
// Handles OTP generation, storage, and verification (client-side simulation)
// In production, this should be handled by backend with real email sending

// Store OTPs in memory (in production, use backend + Redis/DB)
const otpStore: Map<string, { otp: string; expiresAt: number }> = new Map();

// Generate 6-digit OTP
export function generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Validate GNDEC email format
export function isValidGNDECEmail(email: string): boolean {
    const emailLower = email.toLowerCase().trim();
    return emailLower.endsWith('@gndec.ac.in');
}

// Send OTP to email (simulated - in production, call backend API)
export async function sendOTP(email: string): Promise<{ success: boolean; message: string }> {
    if (!isValidGNDECEmail(email)) {
        return { success: false, message: 'Please enter a valid GNDEC email (@gndec.ac.in)' };
    }

    const otp = generateOTP();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes expiry

    // Store OTP
    otpStore.set(email.toLowerCase().trim(), { otp, expiresAt });

    // In production, this would call backend API to send email
    // For now, simulate sending with console log and alert
    console.log(`📧 OTP for ${email}: ${otp}`);

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // For demo purposes, we'll show the OTP in an alert
    // Remove this in production!
    if (__DEV__) {
        // eslint-disable-next-line no-alert
        setTimeout(() => {
            alert(`Demo Mode - Your OTP is: ${otp}\n\nIn production, this will be sent to your email.`);
        }, 500);
    }

    return { success: true, message: 'OTP sent to your email!' };
}

// Verify OTP
export function verifyOTP(email: string, inputOTP: string): { success: boolean; message: string } {
    const emailKey = email.toLowerCase().trim();
    const stored = otpStore.get(emailKey);

    if (!stored) {
        return { success: false, message: 'No OTP found. Please request a new one.' };
    }

    if (Date.now() > stored.expiresAt) {
        otpStore.delete(emailKey);
        return { success: false, message: 'OTP expired. Please request a new one.' };
    }

    if (stored.otp !== inputOTP.trim()) {
        return { success: false, message: 'Invalid OTP. Please try again.' };
    }

    // OTP verified, remove from store
    otpStore.delete(emailKey);
    return { success: true, message: 'Email verified successfully!' };
}

// Clear OTP (for resend)
export function clearOTP(email: string): void {
    otpStore.delete(email.toLowerCase().trim());
}
