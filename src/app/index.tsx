import { useThemeColors } from '@/context/theme-context';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

/**
 * This is a fallback screen. 
 * Navigation is handled in _layout.tsx during splash screen.
 * This page should not be reached under normal circumstances.
 */
export default function StartPage() {
    const router = useRouter();
    const { colors } = useThemeColors();

    useEffect(() => {
        // Fallback navigation (should not reach here normally)
        // Navigate to login as a fallback
        const timer = setTimeout(() => {
            router.replace('/(auth)/login');
        }, 500);

        return () => clearTimeout(timer);
    }, [router]);

    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg }}>
            <ActivityIndicator size="large" color={colors.primary} />
        </View>
    );
}
