import React, { useState, useRef, useEffect } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  View,
  Text,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { TypingIndicator } from "./TypingIndicator";
import { aiService } from "../../services/ai-service";
import { useThemeColors } from "../../context/theme-context";
import { useRouter } from "expo-router";
import { TouchableOpacity } from "react-native";

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp?: Date;
}

export const ChatbotWindow: React.FC = () => {
  const { colors, isDark } = useThemeColors();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Hello! 👋 I'm your GNDEC Assistant. I can help you with information about the college, courses, campus life, and more. What would you like to know?",
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  const handleSend = async (message: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      text: message,
      isUser: true,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsTyping(true);

    try {
      const response = await aiService.chat(message);
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response,
        isUser: false,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "😔 Sorry, I encountered an error. Please try again.",
        isUser: false,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Header */}
      <View
        style={{
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          paddingHorizontal: 16,
          paddingVertical: 12,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            padding: 8,
          }}
        >
          <Text style={{ fontSize: 28, color: colors.textPrimary }}>←</Text>
        </TouchableOpacity>

        <View style={{ flex: 1, alignItems: "center", marginLeft: 12 }}>
          <Text
            style={{
              fontSize: 18,
              fontWeight: "700",
              color: colors.textPrimary,
            }}
          >
            🤖 GNDEC Assistant
          </Text>
          <Text
            style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}
          >
            Always here to help
          </Text>
        </View>

        <View style={{ width: 40 }} />
      </View>

      {/* Messages Container */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={90}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ChatMessage
              message={item.text}
              isUser={item.isUser}
              timestamp={item.timestamp}
            />
          )}
          contentContainerStyle={{
            paddingHorizontal: 12,
            paddingVertical: 12,
          }}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
        />

        {isTyping && <TypingIndicator />}
      </KeyboardAvoidingView>

      {/* Input Area */}
      <View
        style={{
          backgroundColor: colors.bg,
          paddingHorizontal: 12,
          paddingVertical: 12,
          paddingBottom: Platform.OS === "ios" ? 20 : 12,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}
      >
        <ChatInput onSend={handleSend} disabled={isTyping} />
      </View>
    </SafeAreaView>
  );
};
