import { View, Text } from 'react-native';
import { ClassTypeKey } from '../../types';
import { useThemeColors } from '../../context/theme-context';

interface ClassTypeBadgeProps {
    type: ClassTypeKey;
}

export default function ClassTypeBadge({ type }: ClassTypeBadgeProps) {
    const { colors } = useThemeColors();

    const CLASS_TYPE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
        Lab: { label: 'LAB', color: colors.lab, bg: colors.lab + '15' },
        Tut: { label: 'TUT', color: colors.tut, bg: colors.tut + '15' },
        elective: { label: 'ELECTIVE', color: colors.elective, bg: colors.elective + '15' },
        project: { label: 'PROJECT', color: colors.project, bg: colors.project + '15' },
    };

    if (!type || !CLASS_TYPE_CONFIG[type]) return null;
    const cfg = CLASS_TYPE_CONFIG[type];

    return (
        <View
            style={{
                position: 'absolute', top: 6, right: 6,
                paddingHorizontal: 6, paddingVertical: 2,
                borderRadius: 5, borderWidth: 1,
                backgroundColor: cfg.bg, borderColor: cfg.color + '50',
            }}
        >
            <Text style={{ fontSize: 9, fontWeight: '800', color: cfg.color, letterSpacing: 0.5 }}>
                {cfg.label}
            </Text>
        </View>
    );
}