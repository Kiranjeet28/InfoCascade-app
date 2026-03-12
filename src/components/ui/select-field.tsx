import { Picker } from '@react-native-picker/picker';
import { useRef } from 'react';
import { Animated, Platform, Text, View } from 'react-native';
import { useThemeColors } from '../../context/theme-context';
import AppIcon from '../app-icon';

export interface SelectFieldProps {
    label: string;
    value: string;
    onValueChange: (value: string) => void;
    items: Array<{ label: string; value: string }>;
    placeholder?: string;
    icon?: string | { family?: 'MaterialCommunityIcons' | 'Ionicons' | 'FontAwesome'; name: string };
    disabled?: boolean;
}

export default function SelectField({
    label,
    value,
    onValueChange,
    items,
    placeholder = 'Select an option',
    icon,
    disabled = false,
}: SelectFieldProps) {
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
        <View style={{ marginBottom: 16, opacity: disabled ? 0.6 : 1 }}>
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
                    overflow: 'hidden',
                }}
            >
                {icon && (
                    <>
                        {typeof icon === 'string' ? (
                            <Text style={{ fontSize: 17, marginRight: 12 }}>{icon}</Text>
                        ) : (
                            <AppIcon family={icon.family ?? 'MaterialCommunityIcons'} name={icon.name} size={18} color={colors.textSecondary} />
                        )}
                    </>
                )}
                <Picker
                    selectedValue={value}
                    onValueChange={onValueChange}
                    enabled={!disabled}
                    style={{ flex: 1, color: colors.textPrimary }}
                    dropdownIconColor={disabled ? colors.textMuted : colors.textSecondary}
                    onFocus={onFocus}
                    onBlur={onBlur}
                >
                    <Picker.Item
                        label={placeholder}
                        value=""
                        color={Platform.OS === 'android' ? '#999' : colors.textMuted}
                    />
                    {items.map((item) => (
                        <Picker.Item
                            key={item.value}
                            label={item.label}
                            value={item.value}
                            color={Platform.OS === 'android' ? '#333' : colors.textPrimary}
                        />
                    ))}
                </Picker>
            </Animated.View>
        </View>
    );
}
