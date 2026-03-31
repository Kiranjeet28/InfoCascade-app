import { useEffect, useRef } from 'react';
import { Animated, Text, TouchableOpacity, View } from 'react-native';
import { useThemeColors } from '../../context/theme-context';
import { ClassSlot } from '../../types';

interface Props {
    current: ClassSlot | null;
    next: ClassSlot | null;
    onTap?: () => void;
}

function getEndTime(time: string): string {
    const [h, m] = time.split(':').map(Number);
    const total = h * 60 + m + 60;
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function slotInfo(cls: ClassSlot) {
    const isProject = cls.data.subject === 'Minor Project' || cls.data.subject === 'Major Project';
    const isMandatory = cls.data.OtherDepartment === true && !isProject;

    const subject = cls.data.subject ?? cls.data.entries?.[0]?.subject ?? (isMandatory ? 'Mandatory Course' : 'Unknown');
    const room = cls.data.classRoom ?? cls.data.entries?.[0]?.classRoom ?? '';
    const teacher = cls.data.teacher ?? cls.data.entries?.[0]?.teacher ?? '';
    const typeLab = cls.data.Lab;
    const typeTut = cls.data.Tut;
    const typeElec = cls.data.elective;
    const typeKey = typeLab ? 'Lab' : typeTut ? 'Tut' : typeElec ? 'Elective' : null;
    return { subject, room, teacher, typeKey, time: cls.timeOfClass, end: getEndTime(cls.timeOfClass) };
}

// Circular progress ring showing minutes elapsed in current class
function ProgressRing({ elapsed, total = 50, color }: { elapsed: number; total?: number; color: string }) {
    const size = 44;
    const stroke = 3;
    const r = (size - stroke) / 2;
    const circ = 2 * Math.PI * r;
    const pct = Math.min(elapsed / total, 1);
    const dashOffset = circ * (1 - pct);

    return (
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
            {/* SVG not available natively — use View-based ring */}
            <View style={{
                width: size, height: size, borderRadius: size / 2,
                borderWidth: stroke + 1,
                borderColor: color + '20',
                position: 'absolute',
            }} />
            <View style={{
                width: size - (stroke + 1) * 2,
                height: size - (stroke + 1) * 2,
                borderRadius: size / 2,
                borderWidth: stroke,
                borderColor: color,
                borderTopColor: pct > 0.1 ? color : 'transparent',
                borderRightColor: pct > 0.35 ? color : 'transparent',
                borderBottomColor: pct > 0.6 ? color : 'transparent',
                borderLeftColor: pct > 0.85 ? color : 'transparent',
                transform: [{ rotate: '-90deg' }],
                position: 'absolute',
            }} />
            <Text style={{ fontSize: 10, fontWeight: '800', color }}>{Math.round(pct * 100)}%</Text>
        </View>
    );
}

export default function LiveClassBanner({ current, next, onTap }: Props) {
    const { colors } = useThemeColors();
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const slideAnim = useRef(new Animated.Value(16)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Entrance
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: false }),
            Animated.spring(slideAnim, { toValue: 0, tension: 70, friction: 10, useNativeDriver: false }),
        ]).start();

        // Live dot pulse
        if (current) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1.8, duration: 800, useNativeDriver: false }),
                    Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: false }),
                ])
            ).start();
        }
        return () => pulseAnim.stopAnimation();
    }, [current]);

    if (!current && !next) return null;

    const TYPE_COLOR: Record<string, string> = {
        Lab: colors.lab, Tut: colors.tut, Elective: colors.elective,
    };

    // ── Current class card ────────────────────────────────────────────────
    if (current) {
        const info = slotInfo(current);
        const accentColor = info.typeKey ? TYPE_COLOR[info.typeKey] : colors.accent;

        // Minutes elapsed
        const now = new Date();
        const nowMins = now.getHours() * 60 + now.getMinutes();
        const startMins = parseInt(info.time.split(':')[0]) * 60 + parseInt(info.time.split(':')[1]);
        const elapsed = Math.max(0, nowMins - startMins);

        return (
            <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }], marginBottom: 20 }}>
                <TouchableOpacity onPress={onTap} activeOpacity={0.92}>
                    {/* Main card */}
                    <View style={{
                        borderRadius: 22,
                        overflow: 'hidden',
                        borderWidth: 1.5,
                        borderColor: accentColor + '40',
                    }}>
                        {/* Coloured top stripe */}
                        <View style={{ height: 4, backgroundColor: accentColor }} />

                        <View style={{
                            backgroundColor: colors.surface,
                            padding: 18,
                        }}>
                            {/* Header row */}
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
                                {/* Live dot + label */}
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                                    <Animated.View style={{
                                        width: 8, height: 8, borderRadius: 4,
                                        backgroundColor: accentColor,
                                        transform: [{ scale: pulseAnim }],
                                    }} />
                                    <Text style={{ fontSize: 11, fontWeight: '800', color: accentColor, letterSpacing: 1.4 }}>
                                        HAPPENING NOW
                                    </Text>
                                </View>

                                {/* Type badge */}
                                {info.typeKey && (
                                    <View style={{
                                        backgroundColor: accentColor + '18', borderRadius: 7,
                                        paddingHorizontal: 9, paddingVertical: 3,
                                        borderWidth: 1, borderColor: accentColor + '40',
                                    }}>
                                        <Text style={{ fontSize: 10, fontWeight: '800', color: accentColor, letterSpacing: 0.8 }}>
                                            {info.typeKey.toUpperCase()}
                                        </Text>
                                    </View>
                                )}
                            </View>

                            {/* Subject + progress */}
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 14 }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 21, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.5, lineHeight: 26, marginBottom: 2 }}>
                                        {info.subject}
                                    </Text>
                                    {info.teacher ? (
                                        <Text style={{ fontSize: 13, color: colors.textSecondary, fontWeight: '500' }}>
                                            {info.teacher}
                                        </Text>
                                    ) : null}
                                </View>
                                <ProgressRing elapsed={elapsed} color={accentColor} />
                            </View>

                            {/* Footer meta row */}
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 0 }}>
                                {/* Time */}
                                <View style={{
                                    flexDirection: 'row', alignItems: 'center', gap: 5,
                                    backgroundColor: colors.surfaceElevated, borderRadius: 8,
                                    paddingVertical: 6, paddingHorizontal: 10, marginRight: 8,
                                }}>
                                    <Text style={{ fontSize: 11 }}>🕐</Text>
                                    <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary }}>
                                        {info.time} – {info.end}
                                    </Text>
                                </View>

                                {/* Room */}
                                {info.room ? (
                                    <View style={{
                                        flexDirection: 'row', alignItems: 'center', gap: 5,
                                        backgroundColor: colors.surfaceElevated, borderRadius: 8,
                                        paddingVertical: 6, paddingHorizontal: 10,
                                    }}>
                                        <Text style={{ fontSize: 11 }}>📍</Text>
                                        <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary }}>
                                            {info.room}
                                        </Text>
                                    </View>
                                ) : null}

                                {/* Tap hint */}
                                {onTap && (
                                    <Text style={{ marginLeft: 'auto', fontSize: 12, color: colors.textMuted }}>›</Text>
                                )}
                            </View>
                        </View>

                        {/* Next class footer strip */}
                        {next && (() => {
                            const nInfo = slotInfo(next);
                            return (
                                <View style={{
                                    backgroundColor: colors.primary + '0C',
                                    borderTopWidth: 1, borderTopColor: colors.border,
                                    flexDirection: 'row', alignItems: 'center',
                                    paddingVertical: 10, paddingHorizontal: 18, gap: 8,
                                }}>
                                    <Text style={{ fontSize: 10, fontWeight: '800', color: colors.primary, letterSpacing: 1 }}>
                                        NEXT
                                    </Text>
                                    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary, flex: 1 }} numberOfLines={1}>
                                        {nInfo.subject}
                                    </Text>
                                    <Text style={{ fontSize: 12, color: colors.textMuted, fontWeight: '600' }}>
                                        {nInfo.time}
                                    </Text>
                                </View>
                            );
                        })()}
                    </View>
                </TouchableOpacity>
            </Animated.View>
        );
    }

    // ── No current class, only next ───────────────────────────────────────
    const nInfo = slotInfo(next!);
    const nAccent = nInfo.typeKey ? TYPE_COLOR[nInfo.typeKey] : colors.primary;

    return (
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }], marginBottom: 20 }}>
            <TouchableOpacity onPress={onTap} activeOpacity={0.92}>
                <View style={{
                    borderRadius: 20, overflow: 'hidden',
                    borderWidth: 1, borderColor: colors.primary + '30',
                }}>
                    <View style={{ height: 3, backgroundColor: colors.primary + '60' }} />
                    <View style={{
                        backgroundColor: colors.surface,
                        padding: 18, flexDirection: 'row', alignItems: 'center', gap: 16,
                    }}>
                        {/* Time pill */}
                        <View style={{
                            backgroundColor: colors.primary + '15', borderRadius: 14,
                            paddingVertical: 12, paddingHorizontal: 14, alignItems: 'center',
                            borderWidth: 1, borderColor: colors.primary + '30',
                        }}>
                            <Text style={{ fontSize: 14, fontWeight: '800', color: colors.primary }}>{nInfo.time}</Text>
                            <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 2 }}>{nInfo.end}</Text>
                        </View>

                        {/* Info */}
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 11, fontWeight: '800', color: colors.primary, letterSpacing: 1, marginBottom: 4 }}>
                                UP NEXT
                            </Text>
                            <Text style={{ fontSize: 17, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 }} numberOfLines={2}>
                                {nInfo.subject}
                            </Text>
                            <View style={{ flexDirection: 'row', gap: 10 }}>
                                {nInfo.room && <Text style={{ fontSize: 12, color: colors.textSecondary }}>📍 {nInfo.room}</Text>}
                                {nInfo.teacher && <Text style={{ fontSize: 12, color: colors.textSecondary }} numberOfLines={1}>{nInfo.teacher}</Text>}
                            </View>
                        </View>
                        {onTap && <Text style={{ fontSize: 20, color: colors.textMuted }}>›</Text>}
                    </View>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
}