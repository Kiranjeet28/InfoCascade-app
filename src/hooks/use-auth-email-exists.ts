import { useEffect, useRef, useState } from "react";
import { checkEmailExists } from "../services/auth-service";
import type { AvailabilityStatus } from "../utils/availability";

export interface UseAuthEmailExistsResult {
  status: AvailabilityStatus;
  message: string;
  isChecking: boolean;
}

const EMAIL_CHECK_CACHE_TTL_MS = 5 * 60 * 1000;
type EmailCheckCacheEntry = {
  status: AvailabilityStatus;
  message: string;
  checkedAt: number;
};
const emailCheckCache = new Map<string, EmailCheckCacheEntry>();

/**
 * Consider an email "complete enough" to run the backend check when it:
 * - passes a basic email regex
 * - and ends with a common final TLD (ex: ".com")
 *
 * This prevents triggering debounce on every keystroke and avoids distracting UI
 * while the user is still typing the domain/TLD.
 */
function isCompleteEmailForCheck(trimmedEmail: string): boolean {
  // Basic "has @ and dot after @" check (same behavior as before)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmedEmail)) return false;

  const lower = trimmedEmail.toLowerCase();

  // Primary requirement from the prompt (".com"). You can expand this list later if desired.
  const completeTlds = [".com"];
  return completeTlds.some((tld) => lower.endsWith(tld));
}

/**
 * Login screen only: debounced `/api/auth/check-email` (auth account exists or not).
 * Do not use on register — that screen uses `useEmailAvailability` (students API).
 */
export function useAuthEmailExists(
  email: string,
  debounceMs = 400,
): UseAuthEmailExistsResult {
  const [status, setStatus] = useState<AvailabilityStatus>("idle");
  const [message, setMessage] = useState("");
  const seq = useRef(0);

  // Track the last "complete" email we actually scheduled/checked.
  // If user edits the email and it becomes a *different* complete email again,
  // we should schedule a new check.
  const lastScheduledCompleteEmailRef = useRef<string | null>(null);

  useEffect(() => {
    const trimmed = email.trim();

    if (!trimmed) {
      lastScheduledCompleteEmailRef.current = null;
      setStatus("idle");
      setMessage("");
      return;
    }

    // If it doesn't look like an email yet, keep UI neutral (don't show error while typing)
    // and do not schedule backend checks.
    const basicEmailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!basicEmailRegex.test(trimmed)) {
      lastScheduledCompleteEmailRef.current = null;
      setStatus("idle");
      setMessage("");
      return;
    }

    // Only check when the user has typed a "complete" email (ex: ends with ".com").
    if (!isCompleteEmailForCheck(trimmed)) {
      // Keep prior result if they are editing? To avoid stale guidance, reset to neutral.
      // This also prevents the UI from claiming "Account found" while user is mid-edit.
      lastScheduledCompleteEmailRef.current = null;
      setStatus("idle");
      setMessage("");
      return;
    }

    // Avoid rescheduling if the same complete email is still present (prevents spam).
    if (lastScheduledCompleteEmailRef.current === trimmed) {
      return;
    }
    lastScheduledCompleteEmailRef.current = trimmed;

    const cached = emailCheckCache.get(trimmed);
    if (cached && Date.now() - cached.checkedAt < EMAIL_CHECK_CACHE_TTL_MS) {
      setStatus(cached.status);
      setMessage(cached.message);
      return;
    }

    const id = ++seq.current;

    // Debounce backend call. While user is typing, keep UI neutral.
    setStatus("idle");
    setMessage("");

    const timer = setTimeout(async () => {
      try {
        if (id !== seq.current) return;
        setStatus("checking");
        setMessage("Checking...");

        const res = await checkEmailExists(trimmed);
        if (id !== seq.current) return;

        if (!res.success) {
          setStatus("error");
          setMessage(res.message || "Could not verify email");
          return;
        }

        if (res.exists) {
          setStatus("taken");
          setMessage("Account found. Enter your password.");
          emailCheckCache.set(trimmed, {
            status: "taken",
            message: "Account found. Enter your password.",
            checkedAt: Date.now(),
          });
        } else {
          setStatus("available");
          setMessage("No account for this email. Create one first.");
          emailCheckCache.set(trimmed, {
            status: "available",
            message: "No account for this email. Create one first.",
            checkedAt: Date.now(),
          });
        }
      } catch {
        if (id !== seq.current) return;
        setStatus("error");
        setMessage("Could not verify email. Try again.");
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [email, debounceMs]);

  return {
    status,
    message,
    isChecking: status === "checking",
  };
}
