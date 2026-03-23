// src/app/(auth)/_layout.tsx
import { Stack } from 'expo-router';

const screenOptions = { headerShown: false, animation: 'slide_from_bottom' } as const;

export default function AuthLayout() {
    return (
        <Stack screenOptions={screenOptions}>
            <Stack.Screen name="login" options={{ title: 'Login' }} />
            <Stack.Screen name="register" options={{ title: 'Register' }} />
            <Stack.Screen name="forgot-password" options={{ title: 'Forgot Password' }} />
        </Stack>
    );
}