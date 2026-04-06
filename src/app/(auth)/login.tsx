import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import LoginForm from '../../components/auth/login-form';
import BgBlobs from '../../components/layout/bg-blobs';
import { useThemeColors } from '../../context/theme-context';

export default function LoginScreen() {
    const router = useRouter();
    const { colors, isDark } = useThemeColors();

    const handleLoginSuccess = () => {
        // Navigation handled by App layout
    };

    const handleSwitchToSignup = () => {
        router.push('/(auth)/register');
    };

    const handleSwitchToForgotPassword = () => {
        router.push('/(auth)/forgot-password');
    };

    return (
        <View style={{ flex: 1, backgroundColor: colors.bg, overflow: 'hidden' }}>
            <StatusBar style={isDark ? 'light' : 'dark'} />
            <BgBlobs />
            <LoginForm
                onLoginSuccess={handleLoginSuccess}
                onSwitchToSignup={handleSwitchToSignup}
                onSwitchToForgotPassword={handleSwitchToForgotPassword}
            />
        </View>
    );
}