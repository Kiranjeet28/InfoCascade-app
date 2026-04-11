import { Stack } from 'expo-router';

const screenOptions = {
  headerShown: false,
  animation: 'slide_from_bottom',
  presentation: 'modal',
} as const;

export default function SettingsLayout() {
  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen
        name="settings"
        options={{
          title: 'Settings',
        }}
      />
    </Stack>
  );
}
