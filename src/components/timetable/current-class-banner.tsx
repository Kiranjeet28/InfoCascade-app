import { useRef, useEffect } from 'react';
import { View, Text, Animated } from 'react-native';
import { ClassSlot } from '../../types';
import { useThemeColors } from '../../context/theme-context';

interface LiveClassBannerProps {
    current: ClassSlot | null;
    next: ClassSlot | null;
}

function formatSlotInfo(cls: ClassSlot | null) {
    if (!cls) return null;
    const { data, timeOfClass } = cls;
    if (data.freeClass) return { time: timeOfClass, subject: 'Free Period', room: '' };
    const subject = data.subject ?? data.entries?.[0]?.subject ?? 'Unknown';
    const room = data.classRoom ?? data.entries?.[0]?.classRoom ?? '';
    return { time: timeOfClass, subject, room };
}

export default function LiveClassBanner({ current, next }: LiveClassBannerProps) {
    const { colors } = useThemeColors();
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        if (current) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1.4, duration: 800, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
                ])
            ).start();
        }
    }, [current]);

    const curr = formatSlotInfo(current);
    const nxt = formatSlotInfo(next);

    return (
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
            {/* Current class */}
            {curr ? (
                <View
                    style={{
                        flex: 2, backgroundColor: colors.accent + '10', borderRadius: 16,
                        padding: 16, borderWidth: 1.5, borderColor: colors.accent + '30',
                    }}
                >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                        <Animated.View
                            style={{
                                width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent,
                                transform: [{ scale: pulseAnim }],
                            }}
                        />
                        <Text style={{ fontSize: 10, fontWeight: '800', color: colors.accent, letterSpacing: 1 }}>
                            LIVE NOW
                        </Text>
                        <Text style={{ marginLeft: 'auto', fontSize: 11, color: colors.textMuted, fontWeight: '600' }}>
                            {curr.time}
                        </Text>
                    </View>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 }}>
                        {curr.subject}
                    </Text>
                    {curr.room ? (
                        <Text style={{ fontSize: 11, color: colors.textSecondary }}>📍 {curr.room}</Text>
                    ) : null}
                </View>
            ) : (
                <View
                    style={{
                        flex: 2, backgroundColor: colors.surface, borderRadius: 16,
                        padding: 16, borderWidth: 1, borderColor: colors.border,
                        alignItems: 'center', justifyContent: 'center', gap: 8,
                    }}
                >
                    <Text style={{ fontSize: 24 }}>☕</Text>
                    <Text style={{ fontSize: 13, color: colors.textMuted }}>No class right now</Text>
                </View>
            )}

            {/* Next class */}
            {nxt && (
                <View
                    style={{
                        flex: 1, backgroundColor: colors.primary + '10', borderRadius: 16,
                        padding: 14, borderWidth: 1, borderColor: colors.primary + '30', justifyContent: 'center',
                    }}
                >
                    <Text style={{ fontSize: 10, fontWeight: '800', color: colors.primary, letterSpacing: 1, marginBottom: 6 }}>
                        NEXT UP
                    </Text>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 }}>
                        {nxt.subject}
                    </Text>
                    <Text style={{ fontSize: 11, color: colors.textSecondary }}>at {nxt.time}</Text>
                </View>
            )}
        </View>
    );
}