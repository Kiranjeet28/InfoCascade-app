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

    useEffect(() => {
        if (auth.isAuthenticated && auth.user) {
            router.replace('/(app)/home');
        }
    }, [auth.isAuthenticated, auth.user, router]);

    // If already authenticated, render nothing at all.
    // This prevents LoginForm (and its useAuthEmailExists hook) from
    // mounting and reacting to cached formData while the navigation
    // transition is in progress — which is what caused the border blink.
    if (auth.isAuthenticated) {
        return null;
    }

    return (
        <View style={{ flex: 1, backgroundColor: colors.bg, overflow: 'hidden' }}>
            <StatusBar style={isDark ? 'light' : 'dark'} />
            <BgBlobs />

            <LoginForm
                onLoginSuccess={() => {
                    router.replace('/(app)/home');
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