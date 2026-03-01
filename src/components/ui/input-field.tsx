import { useRef } from 'react';
import { View, Text, TextInput, Animated } from 'react-native';
import { useThemeColors } from '../../context/theme-context';

interface InputFieldProps {
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    placeholder: string;
    icon: string;
    secureTextEntry?: boolean;
    autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
    keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad';
}

export default function InputField({
    label,
    value,
    onChangeText,
    placeholder,
    icon,
    secureTextEntry = false,
    autoCapitalize = 'none',
    keyboardType = 'default',
}: InputFieldProps) {
    const { colors } = useThemeColors();
    const borderAnim = useRef(new Animated.Value(0)).current;

    const borderColor = borderAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [colors.border, colors.primary],
    });

    const onFocus = () =>
        Animated.timing(borderAnim, { toValue: 1, duration: 200, useNativeDriver: false }).start();
    const onBlur = () =>
        Animated.timing(borderAnim, { toValue: 0, duration: 200, useNativeDriver: false }).start();

    return (
        <View style={{ marginBottom: 16 }}>
            <Text
                style={{
                    fontSize: 12, fontWeight: '700', color: colors.textSecondary,
                    marginBottom: 7, letterSpacing: 0.8, textTransform: 'uppercase',
                }}
            >
                {label}
            </Text>
            <Animated.View
                style={{
                    flexDirection: 'row', alignItems: 'center', borderWidth: 1.5,
                    borderRadius: 14, backgroundColor: colors.surface,
                    paddingHorizontal: 16, height: 54, borderColor,
                }}
            >
                <Text style={{ fontSize: 17, marginRight: 12 }}>{icon}</Text>
                <TextInput
                    style={{ flex: 1, fontSize: 15, color: colors.textPrimary, fontWeight: '500' }}
                    value={value}
                    onChangeText={onChangeText}
                    placeholder={placeholder}
                    placeholderTextColor={colors.textMuted}
                    secureTextEntry={secureTextEntry}
                    autoCapitalize={autoCapitalize}
                    keyboardType={keyboardType}
                    textContentType="none"
                    onFocus={onFocus}
                    onBlur={onBlur}
                />
            </Animated.View>
        </View>
    );
}