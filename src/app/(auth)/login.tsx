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

    // Navigate to home when authenticated
    useEffect(() => {
        console.log('[LoginScreen] Auth state:', { isAuthenticated: auth.isAuthenticated, user: auth.user?.email });

        if (auth.isAuthenticated && auth.user) {
            console.log('[LoginScreen] Redirecting to home...');
            setTimeout(async () => {
                console.log('[LoginScreen] Calling router.replace to /(app)/home');
                router.replace('/(app)/home');
            }, 500);
        }
    }, [auth.isAuthenticated, auth.user]);

    return (
        <View style={{ flex: 1, backgroundColor: colors.bg, overflow: 'hidden' }}>
            <StatusBar style={isDark ? 'light' : 'dark'} />
            <BgBlobs />

            <LoginForm
                onLoginSuccess={async () => {
                    try {
                        console.log('[LoginForm Callback] onLoginSuccess called');
                        console.log('[LoginForm Callback] Navigating to home directly');
                        // Skip permission requests during navigation - they'll be requested in home screen if needed
                        // Just navigate immediately
                        router.replace('/(app)/home');
                    } catch (err) {
                        console.error('[LoginForm Callback] Navigation error:', err);
                    }
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
