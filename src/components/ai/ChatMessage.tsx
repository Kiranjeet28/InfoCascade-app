import React from "react";
import { View, Text } from "react-native";
import { useThemeColors } from "../../context/theme-context";

interface ChatMessageProps {
  message: string;
  isUser: boolean;
  timestamp?: Date;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  isUser,
  timestamp,
}) => {
  const { colors } = useThemeColors();

  const formatTime = (date?: Date) => {
    if (!date) return "";
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${hours}:${minutes}`;
  };

  return (
    <View
      style={{
        marginVertical: 6,
        flexDirection: "row",
        justifyContent: isUser ? "flex-end" : "flex-start",
        paddingHorizontal: 4,
      }}
    >
      <View
        style={{
          maxWidth: "85%",
          paddingHorizontal: 14,
          paddingVertical: 10,
          borderRadius: 18,
          backgroundColor: isUser ? "#6366f1" : colors.surface,
          borderWidth: isUser ? 0 : 1,
          borderColor: isUser ? "transparent" : colors.border,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.1,
          shadowRadius: 3,
          elevation: 2,
        }}
      >
        <Text
          style={{
            fontSize: 15,
            color: isUser ? "#ffffff" : colors.textPrimary,
            lineHeight: 20,
          }}
        >
          {message}
        </Text>
        {timestamp && (
          <Text
            style={{
              fontSize: 11,
              color: isUser ? "rgba(255, 255, 255, 0.7)" : colors.textSecondary,
              marginTop: 4,
              textAlign: "right",
            }}
          >
            {formatTime(timestamp)}
          </Text>
        )}
      </View>
    </View>
  );
};
