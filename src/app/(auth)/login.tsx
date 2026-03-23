import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import LoginForm from '../../components/auth/login-form';
import BgBlobs from '../../components/layout/bg-blobs';
import { useAuth } from '../../context/auth-context';
import { useThemeColors } from '../../context/theme-context';

export default function LoginScreen() {
    const router = useRouter();
    const { colors, isDark } = useThemeColors();
    const auth = useAuth();

    // If already authenticated, render nothing and let root layout handle navigation
    if (auth.isAuthenticated) {
        return null;
    }

    return (
        <View style={{ flex: 1, backgroundColor: colors.bg, overflow: 'hidden' }}>
            <StatusBar style={isDark ? 'light' : 'dark'} />
            <BgBlobs />

            <LoginForm
                onLoginSuccess={() => {
                    // Auth context listener in root layout will trigger navigation
                    // when it detects isAuthenticated changed to true
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