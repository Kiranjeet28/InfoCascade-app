import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { ErrorBoundary } from '../components/error-boundary';
import SplashScreenComponent from '../components/splash/splash-screen';
import { AuthProvider } from '../context/auth-context';
import { InAppNotificationProvider } from '../context/in-app-notification-context';
import { NotificationPreferencesProvider } from '../context/notification-preferences-context';
import { ProfileProvider } from '../context/profile-context';
import { ThemeProvider, useThemeColors } from '../context/theme-context';
import { getSession } from '../utils/auth-cache';
import { hideCustomSplash } from '../utils/custom-splash';

function RootStack() {
  const { isDark } = useThemeColors();
  const [splashVisible, setSplashVisible] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  const router = useRouter();
  const [routerReady, setRouterReady] = useState(false);

  // Ensure router is ready before navigation
  useEffect(() => {
    const timer = setTimeout(() => setRouterReady(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Hide splash screen after theme is applied and navigate based on auth state
  const initializeApp = useCallback(async () => {
    try {
      console.log('[App] Starting initialization...');

      let session: any = null;
      let profileRaw: any = null;

      try {
        [session, profileRaw] = await Promise.all([
          getSession().catch(err => {
            console.error('[App] Error getting session:', err);
            return null;
          }),
          AsyncStorage.getItem('studentProfile').catch(err => {
            console.error('[App] Error getting profile:', err);
            return null;
          }),
        ]);
      } catch (error) {
        console.error('[App] Error during parallel async checks:', error);
      }

      console.log('[App] Auth state: session=' + !!session?.token + ', hasProfile=' + !!profileRaw);

      setTimeout(() => {
        try {
          setSplashVisible(false);
          try {
            hideCustomSplash();
          } catch (splashErr) {
            console.warn('[App] Failed to hide custom splash:', splashErr);
          }

          if (!routerReady) {
            console.log('[App] Router not ready yet, waiting...');
            const waitTimer = setInterval(() => {
              if (routerReady) {
                clearInterval(waitTimer);
                performNavigation();
              }
            }, 50);
            return;
          }

          performNavigation();
        } catch (error) {
          console.error('[App] Error during splash hide:', error);
          setInitError('Failed to hide splash screen');
        }
      }, 1500);

      function performNavigation() {
        try {
          if (session?.token && profileRaw) {
            console.log('[App] Navigating to home (authenticated)');
            router.replace('/(app)/home');
          } else {
            console.log('[App] Navigating to login (unauthenticated)');
            router.replace('/(auth)/login');
          }
        } catch (navError) {
          console.error('[App] Navigation error:', navError);
          setInitError('Navigation failed');
        }
      }
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

          if (routerReady) {
            router.replace('/(auth)/login');
          }
        } catch (fallbackError) {
          console.error('[App] Fallback error handling failed:', fallbackError);
        }
      }, 1500);
    }
  }, [router, routerReady]);

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