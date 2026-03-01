import { ScrollView, TouchableOpacity, Text, View } from 'react-native';
import { useThemeColors } from '../../context/theme-context';
import { WEEK_DAYS } from '../../constants/theme';

type WeekDay = typeof WEEK_DAYS[number];

interface DaySelectorProps {
    selectedDay: string;
    todayDay: string;
    onSelect: (day: string) => void;
}

export default function DaySelector({ selectedDay, todayDay, onSelect }: DaySelectorProps) {
    const { colors } = useThemeColors();

    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: 20 }}
            contentContainerStyle={{ gap: 8, paddingRight: 8 }}
        >
            {WEEK_DAYS.map((day) => {
                const isToday = day === todayDay;
                const isSelected = selectedDay === day;

                return (
                    <TouchableOpacity
                        key={day}
                        style={[
                            {
                                paddingVertical: 10, paddingHorizontal: 18, borderRadius: 12,
                                backgroundColor: colors.surface, borderWidth: 1,
                                borderColor: colors.border, alignItems: 'center',
                            },
                            isSelected && { backgroundColor: colors.primary, borderColor: colors.primary },
                            isToday && !isSelected && { borderColor: colors.primary + '60' },
                        ]}
                        onPress={() => onSelect(day)}
                        activeOpacity={0.8}
                    >
                        <Text
                            style={[
                                { fontSize: 14, fontWeight: '700', color: colors.textSecondary },
                                isSelected && { color: '#fff' },
                            ]}
                        >
                            {day.slice(0, 3)}
                        </Text>
                        {isToday && (
                            <View
                                style={{
                                    width: 4, height: 4, borderRadius: 2, marginTop: 4,
                                    backgroundColor: isSelected ? '#fff' : colors.primary,
                                }}
                            />
                        )}
                    </TouchableOpacity>
                );
            })}
        </ScrollView>
    );
}