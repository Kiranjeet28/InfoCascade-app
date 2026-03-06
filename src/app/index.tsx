import { useThemeColors } from '@/context/theme-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

export default function StartPage() {
    const router = useRouter();
    const { colors } = useThemeColors();

    useEffect(() => {
        const checkProfile = async () => {
            try {
                // use the same storage key as `ProfileContext` ('studentProfile')
                const profile = await AsyncStorage.getItem('studentProfile');
                if (profile) {
                    router.replace('/(app)/home');
                } else {
                    router.replace('/(auth)/login');
                }
            } catch (e) {
                console.error('Failed to load user profile from storage', e);
                router.replace('/(auth)/login');
            }
        };

        checkProfile();
    }, []);

    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg }}>
            <ActivityIndicator size="large" color={colors.primary} />
        </View>
    );
}
