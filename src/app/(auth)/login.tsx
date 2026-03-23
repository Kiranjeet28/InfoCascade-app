import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform, View } from 'react-native';
import LoginForm from '../../components/auth/login-form';
import BgBlobs from '../../components/layout/bg-blobs';
import { useAuth } from '../../context/auth-context';
import { useThemeColors } from '../../context/theme-context';
import { requestAllPermissionsSequentially } from '../../services/permission-service';

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
                if (Platform.OS === 'web' && typeof window !== 'undefined' && 'serviceWorker' in navigator) {
                    try {
                        await (navigator as any).serviceWorker.register('/service-worker.js').catch(() => { });
                    } catch (e) {
                        console.warn('Service worker registration skipped:', e);
                    }
                }
                await requestAllPermissionsSequentially();
                console.log('[LoginScreen] Calling router.replace to /(app)/home');
                router.replace('/(app)/home');
            }, 900);
        }
    }, [auth.isAuthenticated, auth.user]);

    return (
        <View style={{ flex: 1, backgroundColor: colors.bg, overflow: 'hidden' }}>
            <StatusBar style={isDark ? 'light' : 'dark'} />
            <BgBlobs />

            <LoginForm
                onLoginSuccess={async () => {
                    console.log('[LoginForm Callback] onLoginSuccess called');
                    // Direct navigation - don't wait for useEffect
                    if (Platform.OS === 'web' && typeof window !== 'undefined' && 'serviceWorker' in navigator) {
                        try {
                            await (navigator as any).serviceWorker.register('/service-worker.js').catch(() => { });
                        } catch (e) {
                            console.warn('Service worker registration skipped:', e);
                        }
                    }
                    await requestAllPermissionsSequentially();
                    console.log('[LoginForm Callback] Navigating to home');
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
