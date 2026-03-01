import { useRef } from 'react';
import { TouchableOpacity, Text, Animated, ActivityIndicator } from 'react-native';
import { useThemeColors } from '../../context/theme-context';

interface PrimaryButtonProps {
    title: string;
    onPress: () => void;
    disabled?: boolean;
    loading?: boolean;
    variant?: 'primary' | 'outline';
    fullWidth?: boolean;
}

export default function PrimaryButton({
    title,
    onPress,
    disabled,
    loading,
    variant = 'primary',
    fullWidth = true,
}: PrimaryButtonProps) {
    const { colors } = useThemeColors();
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const onPressIn = () =>
        Animated.spring(scaleAnim, { toValue: 0.95, useNativeDriver: true, tension: 120, friction: 8 }).start();
    const onPressOut = () =>
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 120, friction: 8 }).start();

    const isPrimary = variant === 'primary';

    return (
        <Animated.View style={{ transform: [{ scale: scaleAnim }], width: fullWidth ? '100%' : undefined }}>
            <TouchableOpacity
                style={[
                    {
                        paddingVertical: 16,
                        paddingHorizontal: 24,
                        borderRadius: 14,
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: 52,
                    },
                    isPrimary
                        ? {
                            backgroundColor: colors.primary,
                            shadowColor: '#6C63FF',
                            shadowOffset: { width: 0, height: 6 },
                            shadowOpacity: 0.35,
                            shadowRadius: 12,
                            elevation: 6,
                        }
                        : {
                            backgroundColor: 'transparent',
                            borderWidth: 1.5,
                            borderColor: colors.border,
                        },
                    (disabled || loading) && { opacity: 0.5 },
                ]}
                onPress={onPress}
                onPressIn={onPressIn}
                onPressOut={onPressOut}
                disabled={disabled || loading}
                activeOpacity={1}
            >
                {loading ? (
                    <ActivityIndicator size="small" color={isPrimary ? '#FFFFFF' : colors.primary} />
                ) : (
                    <Text
                        style={{
                            color: isPrimary ? '#FFFFFF' : colors.textSecondary,
                            fontWeight: '700',
                            fontSize: 15,
                            letterSpacing: 0.2,
                        }}
                    >
                        {title}
                    </Text>
                )}
            </TouchableOpacity>
        </Animated.View>
    );
}