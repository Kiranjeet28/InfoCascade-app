import React from "react";
import { TouchableOpacity, Text } from "react-native";
import { useRouter } from "expo-router";

interface AssistantButtonProps {
  className?: string;
}

export const AssistantButton: React.FC<AssistantButtonProps> = ({
  className,
}) => {
  const router = useRouter();

  const handlePress = () => {
    (router as any).push("/chat");
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      className={`bg-blue-600 p-3 rounded-full ${className}`}
    >
      <Text className="text-white font-bold">AI Assistant</Text>
    </TouchableOpacity>
  );
};
