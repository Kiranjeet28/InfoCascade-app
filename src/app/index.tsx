import { useThemeColors } from '@/context/theme-context';
import { ActivityIndicator, View } from 'react-native';

/**
 * This is a fallback screen. 
 * Navigation is handled in _layout.tsx during splash screen.
 * This page should not be reached under normal circumstances.
 */
export default function StartPage() {
    const { colors } = useThemeColors();

    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg }}>
            <ActivityIndicator size="large" color={colors.primary} />
        </View>
    );
}
