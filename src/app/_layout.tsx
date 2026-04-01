import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
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
  const [initError, setInitError] = useState<string | null>(null);
  const router = useRouter();
  const [routerReady, setRouterReady] = useState(false);
  const auth = useAuth();
  const navigationDoneRef = useRef(false); // Prevent navigation loops

  // Ensure router is ready before navigation
  useEffect(() => {
    const timer = setTimeout(() => setRouterReady(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Listen for auth state changes and navigate accordingly during initial load
  // (After splash screen hides and app initializes)
  useEffect(() => {
    if (!routerReady || splashVisible) return;
    if (!auth.isInitialized) return; // Wait for auth context to check cache
    if (navigationDoneRef.current) return; // Already navigated, don't do it again

    // Only perform initial navigation after splash completes
    // Subsequent navigation is handled by screen-level useEffects (e.g., LoginScreen)
    if (auth.isAuthenticated && auth.user && auth.token) {
      console.log('[App] Initial auth detected, navigating to profile');
      navigationDoneRef.current = true;
      router.replace('/(app)/profile');
    } else if (!auth.isAuthenticated) {
      console.log('[App] No auth detected, navigating to login');
      navigationDoneRef.current = true;
      router.replace('/(auth)/login');
    }
  }, [routerReady, splashVisible, auth.isInitialized, auth.isAuthenticated, auth.user, auth.token, router]);

  // Hide splash screen after theme is applied - NO NAVIGATION HERE, let useEffect handle it
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

      // Just hide the splash - auth state will trigger navigation
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
          setInitError('Failed to hide splash screen');
          setSplashVisible(false);
        }
      }, 1500);
    } catch (error) {
      console.error('[App] Failed to initialize app:', error);
      setInitError(error instanceof Error ? error.message : 'Unknown error');

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
      }, 1500);
    }
  }, []);

  useEffect(() => {
    if (routerReady) {
      initializeApp();
    }
  }, [routerReady, initializeApp]);

  return (
    <>
      {splashVisible ? (
        <SplashScreenComponent onFinish={() => setSplashVisible(false)} />
      ) : (
        <>
          <StatusBar style={isDark ? 'light' : 'dark'} />
          {initError ? (
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(auth)" />
            </Stack>
          ) : (
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(app)" />
            </Stack>
          )}
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