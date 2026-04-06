import { useEffect, useRef, useState } from 'react';
import { checkEmailExists } from '../services/auth-service';
import type { AvailabilityStatus } from '../utils/availability';

export interface UseAuthEmailExistsResult {
    status: AvailabilityStatus;
    message: string;
    isChecking: boolean;
}

/**
 * Login screen only: debounced `/api/auth/check-email` (auth account exists or not).
 * Do not use on register — that screen uses `useEmailAvailability` (students API).
 */
export function useAuthEmailExists(email: string, debounceMs = 400): UseAuthEmailExistsResult {
    const [status, setStatus] = useState<AvailabilityStatus>('idle');
    const [message, setMessage] = useState('');
    const seq = useRef(0);

    useEffect(() => {
        const trimmed = email.trim();
        if (!trimmed) {
            setStatus('idle');
            setMessage('');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(trimmed)) {
            setStatus('error');
            setMessage('Please enter a valid email address');
            return;
        }

        const id = ++seq.current;
        // Debounce backend call. While user is typing, keep UI neutral.
        setStatus('idle');
        setMessage('');

        const timer = setTimeout(async () => {
            try {
                if (id !== seq.current) return;
                setStatus('checking');
                setMessage('Checking...');

                const res = await checkEmailExists(trimmed);
                if (id !== seq.current) return;

                if (!res.success) {
                    setStatus('error');
                    setMessage(res.message || 'Could not verify email');
                    return;
                }

                if (res.exists) {
                    setStatus('taken');
                    setMessage('Account found. Enter your password.');
                } else {
                    setStatus('available');
                    setMessage('No account for this email. Create one first.');
                }
            } catch {
                if (id !== seq.current) return;
                setStatus('error');
                setMessage('Could not verify email. Try again.');
            }
        }, debounceMs);

        return () => clearTimeout(timer);
    }, [email, debounceMs]);

    return {
        status,
        message,
        isChecking: status === 'checking',
    };
}
