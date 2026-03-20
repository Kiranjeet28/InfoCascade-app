import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform, View } from 'react-native';
import LoginForm from '../../components/auth/login-form';
import OTPVerification from '../../components/auth/otp-verification';
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
        if (auth.isAuthenticated && auth.user) {
            // Request permissions after a short delay
            setTimeout(async () => {
                // Register service worker on web if available
                if (Platform.OS === 'web' && typeof window !== 'undefined' && 'serviceWorker' in navigator) {
                    try {
                        await (navigator as any).serviceWorker.register('/service-worker.js').catch(() => {
                            // Service worker registration failed, continue anyway
                        });
                    } catch (e) {
                        console.warn('Service worker registration skipped:', e);
                    }
                }
                await requestAllPermissionsSequentially();
                router.replace('/(app)/home');
            }, 900);
        }
    }, [auth.isAuthenticated, auth.user]);

    return (
        <View style={{ flex: 1, backgroundColor: colors.bg, overflow: 'hidden' }}>
            <StatusBar style={isDark ? 'light' : 'dark'} />
            <BgBlobs />

            {auth.page === 1 ? (
                <LoginForm
                    onLoginSuccess={() => {
                        // Auth state will handle navigation
                    }}
                    onSwitchToSignup={() => {
                        router.push('/(auth)/register');
                    }}
                    onSwitchToForgotPassword={() => {
                        router.push('/(auth)/forgot-password');
                    }}
                />
            ) : (
                <OTPVerification
                    onVerifySuccess={() => {
                        // Auth state will handle navigation
                    }}
                    onBackToLogin={() => {
                        // Keep on login page but show login form
                    }}
                />
            )}
        </View>
    );
}