import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { InAppNotificationProvider } from '../context/in-app-notification-context';
import { ProfileProvider } from '../context/profile-context';
import { ThemeProvider, useThemeColors } from '../context/theme-context';

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