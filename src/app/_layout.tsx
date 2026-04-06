import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, usePathname, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { ErrorBoundary } from '../components/error-boundary';
import SplashScreenComponent from '../components/splash/splash-screen';
import { AuthProvider, useAuth } from '../context/auth-context';
import { InAppNotificationProvider } from '../context/in-app-notification-context';
import { NotificationPreferencesProvider } from '../context/notification-preferences-context';
import { ProfileProvider } from '../context/profile-context';
import { ThemeProvider, useThemeColors } from '../context/theme-context';
import { getJwtToken, getSession } from '../utils/auth-cache';
import { hideCustomSplash } from '../utils/custom-splash';

function RootStack() {
  const { isDark } = useThemeColors();
  const [splashVisible, setSplashVisible] = useState(true);
  const router = useRouter();
  const segments = useSegments();
  const pathname = usePathname();
  const auth = useAuth();
  const [legacySessionPresent, setLegacySessionPresent] = useState<boolean | null>(null);

  const authScreens = new Set(['login', 'register', 'forgot-password']);

  const pathFirstSegment = (pathname ?? '')
    .split('?')[0]
    .split('#')[0]
    .split('/')
    .filter(Boolean)[0];

  const isAuthRoute =
    (segments?.some((s) => s === '(auth)' || authScreens.has(String(s))) ?? false) ||
    (pathFirstSegment ? authScreens.has(pathFirstSegment) : false);

  const isRootRoute =
    !pathFirstSegment ||
    (segments?.length ?? 0) === 0 ||
    segments?.[0] === 'index';

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

  // Auth guard: keep navigation in sync with auth state & current route
  useEffect(() => {
    if (!auth.isInitialized) return;
    if (splashVisible) return;

    const jwtAuthed = !!auth.token && !!auth.user;
    const legacyAuthed = legacySessionPresent === true;

    // Avoid redirecting to login until we've checked legacy session.
    if (!jwtAuthed && legacySessionPresent === null) return;

    const isAuthed = jwtAuthed || legacyAuthed;

    const replaceIfNeeded = (href: string) => {
      // Avoid firing replace repeatedly during render loops
      // (on web, pathname doesn't include group names like /(auth))
      router.replace(href);
    };

    // If not signed in, force auth routes only
    if (!isAuthed) {
      if (!isAuthRoute) replaceIfNeeded('/(auth)/login');
      return;
    }

    // If signed in, keep users out of auth screens and off the root fallback
    if (isAuthRoute || isRootRoute) {
      replaceIfNeeded('/(app)/profile');
    }
  }, [auth.isInitialized, auth.token, auth.user, legacySessionPresent, isAuthRoute, isRootRoute, router, splashVisible]);

  // Initialize app and hide splash screen
  const initializeApp = useCallback(async () => {
    try {
      console.log('[App] Starting initialization...');

      try {
        // Check cache in parallel
        await Promise.all([
          getSession().catch(err => {
            console.error('[App] Error getting session:', err);
            return null;
          }),
          AsyncStorage.getItem('studentProfile').catch(err => {
            console.error('[App] Error getting profile:', err);
            return null;
          }),
          getJwtToken().catch(err => {
            console.error('[App] Error getting JWT token:', err);
            return null;
          }),
        ]);
      } catch (error) {
        console.error('[App] Error during parallel async checks:', error);
      }

      // Hide the splash screen after a short delay
      setTimeout(() => {
        try {
          console.log('[App] Hiding splash screen');
          setSplashVisible(false);
          try {
            hideCustomSplash();
          } catch (splashErr) {
            console.warn('[App] Failed to hide custom splash:', splashErr);
          }
        } catch (error) {
          console.error('[App] Error during splash hide:', error);
          setSplashVisible(false);
        }
      }, 800);
    } catch (error) {
      console.error('[App] Failed to initialize app:', error);

      setTimeout(() => {
        try {
          setSplashVisible(false);
          try {
            hideCustomSplash();
          } catch (splashErr) {
            console.warn('[App] Failed to hide splash on error:', splashErr);
          }
        } catch (fallbackError) {
          console.error('[App] Fallback error handling failed:', fallbackError);
        }
      }, 800);
    }
  }, []);

  useEffect(() => {
    initializeApp();
  }, [initializeApp]);

  return (
    <>
      {splashVisible ? (
        <SplashScreenComponent onFinish={() => setSplashVisible(false)} />
      ) : (
        <>
          <StatusBar style={isDark ? 'light' : 'dark'} />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(app)" />
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
            <NotificationPreferencesProvider>
              <InAppNotificationProvider>
                <RootStack />
              </InAppNotificationProvider>
            </NotificationPreferencesProvider>
          </ProfileProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}