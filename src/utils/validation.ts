/**
 * Validation utilities for student registration and authentication
 */

import { postJson } from './api';

// DEBUG MODE: Set to true to skip pre-registration duplicate checks
// This allows the backend to handle all validation
// NOTE: These check endpoints have false positive issues, so we disable them
// The backend /api/students/register endpoint will validate duplicates
const SKIP_DUPLICATE_CHECKS = true;

/**
 * Check if a URN (University Roll Number) already exists in the database
 * @param urn - The URN to check
 * @returns Promise<boolean> - true if URN exists, false otherwise
 */
export async function checkURNExists(urn: string): Promise<boolean> {
    // Skip check if debug mode is enabled (rely on backend validation)
    if (SKIP_DUPLICATE_CHECKS) {
        console.log('[Validation] URN check SKIPPED (debug mode)');
        return false;
    }

    if (!urn || !urn.trim()) {
        return false;
    }

    try {
        const res = await postJson('/api/students/check-urn', { urn: urn.trim() }, 5000);
        const data = await res.json().catch(() => ({}));

        // Log for debugging
        console.log('[Validation] URN check response:', { urn: urn.trim(), exists: data.exists, status: res.status });

        // Only return true if explicitly set to true AND response is ok
        return data.exists === true && res.ok;
    } catch (error) {
        console.warn('[Validation] URN check failed:', error);
        // If check fails, return false to allow user to proceed (backend will validate)
        return false;
    }
}

/**
 * Check if a CRN (Class Roll Number) already exists in the database
 * @param crn - The CRN to check
 * @returns Promise<boolean> - true if CRN exists, false otherwise
 */
export async function checkCRNExists(crn: string): Promise<boolean> {
    // Skip check if debug mode is enabled (rely on backend validation)
    if (SKIP_DUPLICATE_CHECKS) {
        console.log('[Validation] CRN check SKIPPED (debug mode)');
        return false;
    }

    if (!crn || !crn.trim()) {
        return false;
    }

    try {
        const res = await postJson('/api/students/check-crn', { crn: crn.trim() }, 5000);
        const data = await res.json().catch(() => ({}));

        // Log for debugging
        console.log('[Validation] CRN check response:', { crn: crn.trim(), exists: data.exists, status: res.status });

        // Only return true if explicitly set to true AND response is ok
        return data.exists === true && res.ok;
    } catch (error) {
        console.warn('[Validation] CRN check failed:', error);
        return false;
    }
}

/**
 * Check if an email is already registered
 * @param email - The email to check
 * @returns Promise<boolean> - true if email exists, false otherwise
 */
export async function checkEmailExists(email: string): Promise<boolean> {
    try {
        const res = await postJson('/api/students/check-email', { email: email.toLowerCase().trim() }, 5000);
        const data = await res.json().catch(() => ({}));
        return data.exists === true;
    } catch (error) {
        console.warn('[Validation] Email check failed:', error);
        return false;
    }
}

/**
 * Convert backend error messages to user-friendly error messages
 * @param errorMsg - The error message from the backend
 * @returns string - User-friendly error message
 */
export function getErrorMessage(errorMsg: string): string {
    if (!errorMsg) return 'An error occurred. Please try again.';

    const lowerMsg = errorMsg.toLowerCase();

    // Check for duplicate/unique constraint errors
    if (lowerMsg.includes('duplicate') || lowerMsg.includes('unique') || lowerMsg.includes('already exists')) {
        // Try to identify which field has the duplicate
        if (lowerMsg.includes('urn')) {
            return 'This URN is already registered. Please use a different one or login.';
        }
        if (lowerMsg.includes('crn')) {
            return 'This CRN is already registered. Please use a different one.';
        }
        if (lowerMsg.includes('email')) {
            return 'This email is already registered. Please use a different one or login.';
        }
        // Generic duplicate message
        return 'This data is already registered. Please use different credentials or login.';
    }

    // Check for specific field validation errors
    if (lowerMsg.includes('urn')) {
        return 'URN is invalid or already in use. Please check and try again.';
    }
    if (lowerMsg.includes('crn')) {
        return 'CRN is invalid or already in use. Please check and try again.';
    }
    if (lowerMsg.includes('email')) {
        return 'Email is invalid or already in use. Please check and try again.';
    }
    if (lowerMsg.includes('password')) {
        return 'Password must be at least 6 characters.';
    }
    if (lowerMsg.includes('name')) {
        return 'Name is required and should be valid.';
    }

    // Return the original error message if none of the above match
    return errorMsg;
}
