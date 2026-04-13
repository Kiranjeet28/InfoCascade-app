/**
 * Firebase MUST be imported before any other Firebase usage
 */
import "@/utils/firebaseConfig";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, usePathname, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useRef, useState } from "react";
import { ErrorBoundary } from "../components/error-boundary";
import SplashScreenComponent from "../components/splash/splash-screen";
import { AuthProvider, useAuth } from "../context/auth-context";
import { ProfileProvider } from "../context/profile-context";
import { ThemeProvider, useThemeColors } from "../context/theme-context";
import { getJwtToken, getSession } from "../utils/auth-cache";
import { hideCustomSplash } from "../utils/custom-splash";
import { initFCM } from "../services/fcm";

function RootStack() {
  const { isDark } = useThemeColors();
  // Track initialization state to avoid flashing between splash and content
  const [splashVisible, setSplashVisible] = useState(true);
  const [initComplete, setInitComplete] = useState(false);
  const router = useRouter();
  const segments = useSegments();
  const pathname = usePathname();
  const auth = useAuth();
  const [legacySessionPresent, setLegacySessionPresent] = useState<
    boolean | null
  >(null);

  // Prevent duplicate redirects during startup flicker
  const lastRedirectRef = useRef<string | null>(null);
  const redirectTimerRef = useRef<NodeJS.Timeout | null>(null);

  const authScreens = new Set(["login", "register", "forgot-password"]);
  const settingsScreens = new Set(["settings"]);

  const pathFirstSegment = (pathname ?? "")
    .split("?")[0]
    .split("#")[0]
    .split("/")
    .filter(Boolean)[0];

  const isAuthRoute =
    (segments?.some((s) => s === "(auth)" || authScreens.has(String(s))) ??
      false) ||
    pathFirstSegment === "(auth)" ||
    (pathFirstSegment ? authScreens.has(pathFirstSegment) : false);

  const isSettingsRoute =
    (segments?.some(
      (s) => s === "(settings)" || settingsScreens.has(String(s)),
    ) ??
      false) ||
    pathFirstSegment === "(settings)" ||
    (pathFirstSegment ? settingsScreens.has(pathFirstSegment) : false);

  const isRootRoute = !pathFirstSegment || pathFirstSegment === "index";

  // Compute auth state outside of effects to avoid recreations
  const jwtAuthed = !!auth.token && !!auth.user;
  const legacyAuthed = legacySessionPresent === true;
  const isAuthed = jwtAuthed || legacyAuthed;

  // Legacy session support (URN-based auth_session). Some flows (e.g. registration)
  // rely on this for access to app routes.
  useEffect(() => {
    if (!auth.isInitialized) return;

    let cancelled = false;
    (async () => {
      // If JWT auth is present, legacy session doesn't matter for routing.
      if (auth.token && auth.user) {
        if (!cancelled) setLegacySessionPresent(false);
        return;
      }

      const session = await getSession();
      if (!cancelled) setLegacySessionPresent(!!session);
    })();

    return () => {
      cancelled = true;
    };
  }, [auth.isInitialized, auth.token, auth.user]);

  // Initialize app and hide splash screen
  // Optimized to reduce flickering by minimizing delays
  const initializeApp = useCallback(async () => {
    try {
      console.log("[App] Starting initialization...");

      try {
        // Check cache in parallel for faster initialization
        await Promise.all([
          getSession().catch((err) => {
            console.error("[App] Error getting session:", err);
            return null;
          }),
          AsyncStorage.getItem("studentProfile").catch((err) => {
            console.error("[App] Error getting profile:", err);
            return null;
          }),
          getJwtToken().catch((err) => {
            console.error("[App] Error getting JWT token:", err);
            return null;
          }),
        ]);

        // Initialize FCM
        try {
          await initFCM();
        } catch (fcmErr) {
          console.warn("[App] FCM initialization warning:", fcmErr);
        }
      } catch (error) {
        console.error("[App] Error during parallel async checks:", error);
      }

      // Mark initialization as complete. Splash hiding is gated by auth readiness.
      setInitComplete(true);
    } catch (error) {
      console.error("[App] Failed to initialize app:", error);

      // Ensure init completes even on error. Splash hiding is gated by auth readiness.
      setInitComplete(true);
    }
  }, []);

  useEffect(() => {
    initializeApp();
  }, [initializeApp]);

  // Gate for hiding splash: don't hide until:
  // 1. App initialization complete
  // 2. Auth initialized
  // 3. Auth state decisively resolved (either JWT or legacy session check complete)
  const canHideSplash =
    initComplete &&
    auth.isInitialized &&
    (jwtAuthed ? true : legacySessionPresent !== null);

  // Hide splash only once when fully ready, and only after gates are stable
  useEffect(() => {
    if (!splashVisible) return;
    if (!canHideSplash) return;

    console.log("[App] Ready - hiding splash screen");
    setSplashVisible(false);
    try {
      hideCustomSplash();
    } catch (splashErr) {
      console.warn("[App] Failed to hide custom splash:", splashErr);
    }
  }, [canHideSplash, splashVisible]);

  // Auth guard: keep navigation in sync with auth state & current route.
  // FIX: This must be a standard `useEffect(fn, deps)` call. The previous code
  // accidentally used an invalid signature, so the redirect logic could fail
  // on fresh installs (leading to the app getting stuck on the fallback route).
  useEffect(() => {
    // Only run auth guard after:
    // - Auth is initialized
    // - Legacy session check complete
    // - Splash is hidden (UI is stable)
    if (!auth.isInitialized) return;
    if (!canHideSplash) return;
    if (splashVisible) return;

    // Avoid redirecting to login until we've checked legacy session
    if (!jwtAuthed && legacySessionPresent === null) return;

    let targetRoute: "/(auth)/login" | "/(app)/home" | null = null;

    // Determine target route based on auth state and current route
    if (!isAuthed) {
      // Fresh install / no cache: route to login
      if (!isAuthRoute && !isSettingsRoute) {
        targetRoute = "/(auth)/login";
      }
    } else {
      // Cached session: route to home (if on auth or root)
      if (isAuthRoute || isRootRoute) {
        targetRoute = "/(app)/home";
      }
    }

    // Only redirect if:
    // 1. We have a target route
    // 2. It's different from the last redirect (prevent loops)
    if (targetRoute && lastRedirectRef.current !== targetRoute) {
      console.log("[App] Redirecting:", `${pathname} → ${targetRoute}`);
      lastRedirectRef.current = targetRoute;

      router.replace(targetRoute);

      // Clear redirect ref after a delay to allow for rapid route changes
      // (e.g., logout then login in quick succession)
      if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
      redirectTimerRef.current = setTimeout(() => {
        lastRedirectRef.current = null;
      }, 500);
    }
  }, [
    auth.isInitialized,
    canHideSplash,
    splashVisible,
    jwtAuthed,
    legacySessionPresent,
    isAuthed,
    isAuthRoute,
    isSettingsRoute,
    isRootRoute,
    pathname,
    router,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current);
      }
    };
  }, []);

  return (
    <>
      {splashVisible ? (
        <SplashScreenComponent />
      ) : (
        <>
          <StatusBar style={isDark ? "light" : "dark"} />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(app)" />
            <Stack.Screen name="(settings)" />
          </Stack>
        </>
      )}
    </>
  );
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <ProfileProvider>
            <RootStack />
          </ProfileProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
