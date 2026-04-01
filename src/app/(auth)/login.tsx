import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import LoginForm from '../../components/auth/login-form';
import BgBlobs from '../../components/layout/bg-blobs';
import { useAuth } from '../../context/auth-context';
import { useThemeColors } from '../../context/theme-context';

export default function LoginScreen() {
    const router = useRouter();
    const { colors, isDark } = useThemeColors();
    const auth = useAuth();

    // If already authenticated, navigate to profile
    useEffect(() => {
        if (auth.isAuthenticated && auth.user) {
            console.log('[LoginScreen] Authenticated, navigating to profile');
            router.replace('/(app)/profile');
        }
    }, [auth.isAuthenticated, auth.user, router]);

    return (
        <View style={{ flex: 1, backgroundColor: colors.bg, overflow: 'hidden' }}>
            <StatusBar style={isDark ? 'light' : 'dark'} />
            <BgBlobs />

            <LoginForm
                onLoginSuccess={() => {
                    // Navigation happens in useEffect above when auth.isAuthenticated changes
                }}
                onSwitchToSignup={() => {
                    router.push('/(auth)/register');
                }}
                onSwitchToForgotPassword={() => {
                    router.push('/(auth)/forgot-password');
                }}
            />
        </View>
    );
}