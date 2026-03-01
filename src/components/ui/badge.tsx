import { View, Text } from 'react-native';
import { useThemeColors } from '../../context/theme-context';

interface BadgeProps {
    label: string;
    variant?: 'primary' | 'accent';
}

export default function Badge({ label, variant = 'primary' }: BadgeProps) {
    const { colors } = useThemeColors();
    const color = variant === 'accent' ? colors.accent : colors.primary;

    return (
        <View
            style={{
                alignSelf: 'flex-start',
                backgroundColor: color + '20',
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 5,
                borderWidth: 1,
                borderColor: color + '40',
                marginBottom: 12,
            }}
        >
            <Text
                style={{
                    fontSize: 11, fontWeight: '700', color,
                    letterSpacing: 1, textTransform: 'uppercase',
                }}
            >
                {label}
            </Text>
        </View>
    );
}