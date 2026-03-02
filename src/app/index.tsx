import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, View } from 'react-native';
import { useThemeColors } from '@/context/theme-context';

export default function StartPage() {
    const router = useRouter();
    const { colors } = useThemeColors();

    useEffect(() => {
        const checkProfile = async () => {
            try {
                const profile = await AsyncStorage.getItem('user-profile');
                if (profile) {
                    router.replace('/home');
                } else {
                    router.replace('/login');
                }
            } catch (e) {
                console.error('Failed to load user profile from storage', e);
                router.replace('/login');
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
