import { useRef } from "react";
import {
  Animated,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import { useThemeColors } from "../../context/theme-context";
import AppIcon from "../app-icon";

export interface InputFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  icon?:
    | string
    | {
        family?: "MaterialCommunityIcons" | "Ionicons" | "FontAwesome";
        name: string;
      };
  secureTextEntry?: boolean;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  keyboardType?: "default" | "numeric" | "email-address" | "phone-pad";
  autoComplete?: TextInputProps["autoComplete"];
  textContentType?: TextInputProps["textContentType"];
  importantForAutofill?: TextInputProps["importantForAutofill"];
  autoCorrect?: boolean;
  editable?: boolean;
  error?: string;
  helperText?: string;
  multiline?: boolean;
  numberOfLines?: number;
}

export default function InputField({
  label,
  value,
  onChangeText,
  placeholder,
  icon,
  secureTextEntry = false,
  autoCapitalize = "none",
  keyboardType = "default",
  autoComplete,
  textContentType,
  importantForAutofill,
  autoCorrect,
  editable = true,
  error,
  helperText,
  multiline = false,
  numberOfLines = 1,
}: InputFieldProps) {
  const { colors } = useThemeColors();
  const borderAnim = useRef(new Animated.Value(0)).current;

  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [
      error ? colors.error : colors.border,
      error ? colors.error : colors.primary,
    ],
  });

  const onFocus = () =>
    Animated.timing(borderAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: false,
    }).start();
  const onBlur = () =>
    Animated.timing(borderAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();

  return (
    <View style={{ marginBottom: error || helperText ? 20 : 16 }}>
      <Text
        style={{
          fontSize: 12,
          fontWeight: "700",
          color: colors.textSecondary,
          marginBottom: 7,
          letterSpacing: 0.8,
          textTransform: "uppercase",
        }}
      >
        {label}
      </Text>
      <Animated.View
        style={{
          flexDirection: "row",
          alignItems: multiline ? "flex-start" : "center",
          borderWidth: 1.5,
          borderRadius: 14,
          backgroundColor: colors.surface,
          paddingHorizontal: 16,
          paddingVertical: multiline ? 12 : 0,
          height: multiline ? undefined : 54,
          borderColor,
        }}
      >
        {icon && (
          <View style={{ paddingTop: multiline ? 2 : 0, marginRight: 12 }}>
            {typeof icon === "string" ? (
              <Text style={{ fontSize: 17 }}>{icon}</Text>
            ) : (
              <AppIcon
                family={icon.family ?? "MaterialCommunityIcons"}
                name={icon.name}
                size={18}
                color={colors.textSecondary}
              />
            )}
          </View>
        )}
        <TextInput
          style={{
            flex: 1,
            fontSize: 15,
            color: editable ? colors.textPrimary : colors.textMuted,
            fontWeight: "500",
            minHeight: multiline ? 80 : undefined,
          }}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          secureTextEntry={secureTextEntry}
          autoCapitalize={autoCapitalize}
          keyboardType={keyboardType}
          autoComplete={autoComplete}
          textContentType={textContentType}
          importantForAutofill={importantForAutofill}
          autoCorrect={autoCorrect}
          onFocus={onFocus}
          onBlur={onBlur}
          editable={editable}
          multiline={multiline}
          numberOfLines={numberOfLines}
        />
      </Animated.View>
      {(error || helperText) && (
        <Text
          style={{
            fontSize: 12,
            color: error ? colors.error : colors.textMuted,
            marginTop: 6,
            fontWeight: error ? "600" : "400",
          }}
        >
          {error || helperText}
        </Text>
      )}
    </View>
  );
}
