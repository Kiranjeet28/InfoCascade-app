import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { InAppNotificationProvider } from '../context/in-app-notification-context';
import { ProfileProvider } from '../context/profile-context';
import { ThemeProvider, useThemeColors } from '../context/theme-context';
import { clearSession, getSession } from '../utils/auth-cache';

function RootStack() {
  const { isDark } = useThemeColors();
  return (
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
  );
}

export default function RootLayout() {
  useEffect(() => {
    // Temporary debug: clear any potentially corrupt cached auth session
    (async () => {
      try {
        const s = await getSession();
        // eslint-disable-next-line no-console
        console.log('auth session at startup (before clear):', s);
        await clearSession();
        // eslint-disable-next-line no-console
        console.log('auth session cleared at startup');
      } catch (e) {
        // ignore
      }
    })();
  }, []);
  return (
    <ThemeProvider>
      <ProfileProvider>
        <InAppNotificationProvider>
          <RootStack />
        </InAppNotificationProvider>
      </ProfileProvider>
    </ThemeProvider>
  );
}