import { useEffect, useState } from 'react';
import type { AvailabilityStatus } from '../utils/availability';
import { cancelPendingChecks, checkAvailabilityDebounced } from '../utils/availability';

export interface UseEmailCheckResult {
    status: AvailabilityStatus;
    message: string;
    isChecking: boolean;
}

/**
 * Student registration: checks `/api/students/check-availability` (email free vs taken).
 * Used by the register flow and other student URN/CRN checks — not for email/password login.
 *
 * For the login screen, use `useAuthEmailExists` instead (`/api/auth/check-email`).
 *
 * @param email - Email to check
 * @param debounceMs - Debounce delay in milliseconds (default: 300ms)
 * @returns Object with status, message, and isChecking flag
 */
export function useEmailAvailability(email: string, debounceMs: number = 300): UseEmailCheckResult {
    const [status, setStatus] = useState<AvailabilityStatus>('idle');
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (!email.trim()) {
            setStatus('idle');
            setMessage('');
            return;
        }

        // Basic email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setStatus('error');
            setMessage('Please enter a valid email address');
            return;
        }

        checkAvailabilityDebounced('email', email, (result: any) => {
            setStatus(result.status);
            setMessage(result.message || '');
        }, debounceMs);

        return () => {
            cancelPendingChecks();
        };
    }, [email, debounceMs]);

    return {
        status,
        message,
        isChecking: status === 'checking',
    };
}
