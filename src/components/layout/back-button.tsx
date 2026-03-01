import { TouchableOpacity, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useThemeColors } from '../../context/theme-context';

interface BackButtonProps {
    label?: string;
    onPress?: () => void;
}

export default function BackButton({ label = '← Back', onPress }: BackButtonProps) {
    const router = useRouter();
    const { colors } = useThemeColors();

    return (
        <TouchableOpacity
            style={{ alignSelf: 'flex-start', marginBottom: 28, paddingVertical: 6 }}
            onPress={onPress ?? (() => router.back())}
        >
            <Text style={{ fontSize: 15, color: colors.textSecondary, fontWeight: '500' }}>
                {label}
            </Text>
        </TouchableOpacity>
    );
}