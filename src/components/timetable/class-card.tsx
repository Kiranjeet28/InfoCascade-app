import { View, Text } from 'react-native';
import { ClassSlot, ClassTypeKey } from '../../types';
import { useThemeColors } from '../../context/theme-context';
import ClassTypeBadge from './class-type-badge';

interface ClassCardProps {
    classData: ClassSlot;
    compact?: boolean;
}

export default function ClassCard({ classData, compact = false }: ClassCardProps) {
    const { colors } = useThemeColors();
    const { data } = classData;

    if (data.freeClass) {
        return (
            <View
                style={[
                    {
                        borderRadius: 12, padding: compact ? 8 : 12, borderLeftWidth: 3,
                        borderLeftColor: colors.textMuted, backgroundColor: colors.bg, alignItems: 'center',
                    },
                ]}
            >
                <Text style={{ fontSize: 13, color: colors.textMuted, fontStyle: 'italic' }}>Free Period</Text>
            </View>
        );
    }

    const isProject = data.subject === 'Minor Project' || data.subject === 'Major Project';
    const isMandatory = data.OtherDepartment === true && !isProject;

    if (isMandatory) {
        return (
            <View
                style={{
                    borderRadius: 12, padding: compact ? 8 : 12, borderLeftWidth: 3,
                    borderLeftColor: colors.warning, backgroundColor: colors.warning + '10',
                }}
            >
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textPrimary }}>Mandatory Course</Text>
            </View>
        );
    }

    const typeKey: ClassTypeKey = data.Lab
        ? 'Lab' : data.Tut
            ? 'Tut' : data.elective
                ? 'elective' : isProject
                    ? 'project' : null;

    const borderMap: Record<string, { border: string; bg: string }> = {
        Lab: { border: colors.lab, bg: colors.lab + '10' },
        Tut: { border: colors.tut, bg: colors.tut + '10' },
        elective: { border: colors.elective, bg: colors.elective + '10' },
        project: { border: colors.project, bg: colors.project + '10' },
        default: { border: colors.primary, bg: colors.primary + '10' },
    };
    const tc = borderMap[typeKey ?? 'default'];

    if (data.entries && data.entries.length > 0) {
        return (
            <View
                style={{
                    borderRadius: 12, padding: compact ? 8 : 12, borderLeftWidth: 3,
                    borderLeftColor: tc.border, backgroundColor: tc.bg, position: 'relative',
                }}
            >
                <ClassTypeBadge type={typeKey} />
                {data.entries.map((entry, idx) => (
                    <View key={idx} style={idx > 0 ? { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border } : undefined}>
                        <Text numberOfLines={compact ? 1 : 2}
                            style={{ fontSize: 14, fontWeight: '700', color: colors.textPrimary, marginBottom: 3, paddingRight: 40 }}>
                            {entry.subject}
                        </Text>
                        {!compact && (
                            <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 2 }}>{entry.teacher}</Text>
                        )}
                        <Text style={{ fontSize: 11, color: colors.primary, fontWeight: '500' }}>📍 {entry.classRoom}</Text>
                    </View>
                ))}
            </View>
        );
    }

    return (
        <View
            style={{
                borderRadius: 12, padding: compact ? 8 : 12, borderLeftWidth: 3,
                borderLeftColor: tc.border, backgroundColor: tc.bg, position: 'relative',
            }}
        >
            <ClassTypeBadge type={typeKey} />
            <Text numberOfLines={compact ? 1 : 2}
                style={{ fontSize: 14, fontWeight: '700', color: colors.textPrimary, marginBottom: 3, paddingRight: 40 }}>
                {data.subject}
            </Text>
            {!compact && data.teacher ? (
                <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 2 }}>{data.teacher}</Text>
            ) : null}
            {data.classRoom ? (
                <Text style={{ fontSize: 11, color: colors.primary, fontWeight: '500' }}>📍 {data.classRoom}</Text>
            ) : null}
        </View>
    );
}