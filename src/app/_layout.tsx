import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
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
  const router = useRouter();

  // Hide splash screen after theme is applied and navigate based on auth state
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Check auth state during splash screen
        const [session, profileRaw] = await Promise.all([
          getSession(),
          AsyncStorage.getItem('studentProfile'),
        ]);

        // Hide splash after initialization
        setTimeout(() => {
          setSplashVisible(false);
          hideCustomSplash();

          // Navigate based on auth state after splash is hidden
          if (session?.token && profileRaw) {
            // User is logged in, go directly to home
            router.replace('/(app)/home');
          } else {
            // User not logged in, go to login
            router.replace('/(auth)/login');
          }
        }, 1500); // Show splash for 1.5 seconds
      } catch (error) {
        console.error('Failed to initialize app:', error);
        setTimeout(() => {
          setSplashVisible(false);
          hideCustomSplash();
          router.replace('/(auth)/login');
        }, 1500);
      }
    };

    initializeApp();
  }, [router]);

  return (
    <>
      {splashVisible ? (
        <SplashScreenComponent onFinish={() => setSplashVisible(false)} />
      ) : (
        <>
          <StatusBar style={isDark ? 'light' : 'dark'} />
          <Stack screenOptions={{ headerShown: false }}>
            {/* Splash / landing */}
            <Stack.Screen name="index" />
            {/* Auth screens (login, register) — no tab bar */}
            <Stack.Screen name="(auth)" />
            {/* Main app with tab bar (home, timetable, profile) */}
            <Stack.Screen name="(app)" />
            {/* Standalone screens pushed on top — no tab bar */}

          </Stack>
        </>
      )}
    </>
  );
}

export default function RootLayout() {
  return (
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
  );
}