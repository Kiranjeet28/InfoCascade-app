// ...existing code...
import { useRouter } from 'expo-router';
import React, { useRef } from 'react';
import { Animated, Text, TouchableOpacity, View } from 'react-native';
import { useThemeColors } from '../../context/theme-context';

interface HeaderProps {
    title?: string;
    showNav?: boolean;
}

export default function Header({ title = 'InfoCascade', showNav = true }: HeaderProps) {
    const router = useRouter();
    const { colors } = useThemeColors();
    const scaleLogin = useRef(new Animated.Value(1)).current;
    const scaleReg = useRef(new Animated.Value(1)).current;

    const press = (anim: Animated.Value) =>
        Animated.spring(anim, { toValue: 0.93, useNativeDriver: true }).start();
    const release = (anim: Animated.Value) =>
        Animated.spring(anim, { toValue: 1, useNativeDriver: true }).start();

    return (
        <View
            style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                paddingHorizontal: 20, paddingVertical: 14,
                backgroundColor: colors.bg, borderBottomWidth: 1, borderBottomColor: colors.border,
            }}
        >
            {/* Brand */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                <View
                    style={{
                        width: 34, height: 34, borderRadius: 10,
                        backgroundColor: colors.primary + '20',
                        borderWidth: 1.5, borderColor: colors.primary + '50',
                        justifyContent: 'center', alignItems: 'center',
                    }}
                >
                    <Text style={{ fontSize: 16 }}>⏱</Text>
                </View>
                <Text
                    numberOfLines={1}
                    style={{ fontSize: 17, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.5, flexShrink: 1 }}
                >
                    {title}
                </Text>
            </View>

            {/* Nav buttons */}
            {showNav && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Animated.View style={{ transform: [{ scale: scaleLogin }] }}>
                        <TouchableOpacity
                            style={{
                                paddingVertical: 8, paddingHorizontal: 16, borderRadius: 10,
                                borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface,
                            }}
                            onPress={() => router.push('/login')}
                            onPressIn={() => press(scaleLogin)}
                            onPressOut={() => release(scaleLogin)}
                            activeOpacity={1}
                        >
                            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary }}>Login</Text>
                        </TouchableOpacity>
                    </Animated.View>

                    <Animated.View style={{ transform: [{ scale: scaleReg }] }}>
                        <TouchableOpacity
                            style={{
                                paddingVertical: 8, paddingHorizontal: 16, borderRadius: 10,
                                backgroundColor: colors.primary,
                                boxShadow: '0px 4px 8px rgba(108,99,255,0.35)', elevation: 5,
                            }}
                            onPress={() => router.push('/register')}
                            onPressIn={() => press(scaleReg)}
                            onPressOut={() => release(scaleReg)}
                            activeOpacity={1}
                        >
                            <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF' }}>Register</Text>
                        </TouchableOpacity>
                    </Animated.View>
                </View>
            )}
        </View>
    );
}
// ...existing code...