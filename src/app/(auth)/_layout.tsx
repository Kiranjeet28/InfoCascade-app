// src/app/(auth)/_layout.tsx
import { Stack } from 'expo-router';

const screenOptions = { headerShown: false, animation: 'slide_from_bottom' } as const;

export default function AuthLayout() {
    return (
        <Stack screenOptions={screenOptions}>
            <Stack.Screen name="login" />
            <Stack.Screen name="register" />
            <Stack.Screen name="forgot-password" />
        </Stack>
    );
}