import { Text } from 'react-native';
import { useThemeColors } from '../../context/theme-context';

interface SectionTitleProps {
    label: string;
}

export default function SectionTitle({ label }: SectionTitleProps) {
    const { colors } = useThemeColors();
    return (
        <Text
            style={{
                fontSize: 13, fontWeight: '700', color: colors.textSecondary,
                letterSpacing: 1, textTransform: 'uppercase', marginBottom: 14,
            }}
        >
            {label}
        </Text>
    );
}