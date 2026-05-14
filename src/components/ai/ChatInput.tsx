import React, { useState } from "react";
import { View, TextInput, TouchableOpacity, Text } from "react-native";
import { useThemeColors } from "../../context/theme-context";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSend, disabled }) => {
  const [message, setMessage] = useState("");
  const { colors } = useThemeColors();

  const handleSend = () => {
    if (message.trim()) {
      onSend(message.trim());
      setMessage("");
    }
  };

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-end",
        gap: 8,
      }}
    >
      <View
        style={{
          flex: 1,
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: colors.surface,
          borderRadius: 24,
          paddingHorizontal: 16,
          paddingVertical: 2,
          borderWidth: 1.5,
          borderColor: disabled ? colors.border : "#6366f1",
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <TextInput
          value={message}
          onChangeText={setMessage}
          placeholder="Ask me anything..."
          placeholderTextColor={colors.textMuted}
          multiline
          maxLength={500}
          style={{
            flex: 1,
            color: colors.textPrimary,
            fontSize: 15,
            paddingVertical: 12,
            maxHeight: 100,
          }}
          editable={!disabled}
          returnKeyType="send"
          onSubmitEditing={handleSend}
        />
        <Text
          style={{
            fontSize: 12,
            color: colors.textSecondary,
            marginLeft: 8,
          }}
        >
          {message.length}/500
        </Text>
      </View>

      <TouchableOpacity
        onPress={handleSend}
        disabled={disabled || !message.trim()}
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor:
            disabled || !message.trim() ? colors.textMuted : "#6366f1",
          justifyContent: "center",
          alignItems: "center",
          opacity: disabled || !message.trim() ? 0.5 : 1,
        }}
      >
        <Text style={{ fontSize: 20 }}>📤</Text>
      </TouchableOpacity>
    </View>
  );
};
