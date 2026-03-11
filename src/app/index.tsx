import { useThemeColors } from '@/context/theme-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { getSession } from '../utils/auth-cache';

export default function StartPage() {
    const router = useRouter();
    const { colors } = useThemeColors();

    useEffect(() => {
        const checkAuth = async () => {
            try {
                // Check both session (token) and profile (department/group)
                const [session, profileRaw] = await Promise.all([
                    getSession(),
                    AsyncStorage.getItem('studentProfile'),
                ]);

                if (session?.token && profileRaw) {
                    // Fully logged in — go straight to home
                    router.replace('/(app)/home');
                } else {
                    // Missing session or profile — send to login
                    router.replace('/(auth)/login');
                }
            } catch (e) {
                console.error('Failed to check auth state', e);
                router.replace('/(auth)/login');
            }
        };

        checkAuth();
    }, []);

    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg }}>
            <ActivityIndicator size="large" color={colors.primary} />
        </View>
    );
}
