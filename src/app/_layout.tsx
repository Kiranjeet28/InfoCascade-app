import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import SplashScreenComponent from '../components/splash/splash-screen';
import { InAppNotificationProvider } from '../context/in-app-notification-context';
import { NotificationPreferencesProvider } from '../context/notification-preferences-context';
import { ProfileProvider } from '../context/profile-context';
import { ThemeProvider, useThemeColors } from '../context/theme-context';
import { hideCustomSplash } from '../utils/custom-splash';

function RootStack() {
  const { isDark } = useThemeColors();
  const [splashVisible, setSplashVisible] = useState(true);

  // Hide splash screen after theme is applied
  useEffect(() => {
    const timer = setTimeout(() => {
      setSplashVisible(false);
      hideCustomSplash();
    }, 1500); // Show splash for 1.5 seconds

    return () => clearTimeout(timer);
  }, []);

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
      <ProfileProvider>
        <NotificationPreferencesProvider>
          <InAppNotificationProvider>
            <RootStack />
          </InAppNotificationProvider>
        </NotificationPreferencesProvider>
      </ProfileProvider>
    </ThemeProvider>
  );
}