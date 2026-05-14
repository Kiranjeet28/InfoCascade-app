import React, { useEffect, useRef } from "react";
import { View, Text, Animated } from "react-native";
import { useThemeColors } from "../../context/theme-context";

export const TypingIndicator: React.FC = () => {
  const { colors } = useThemeColors();
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const createAnimation = (dot: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: -8,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
      );
    };

    const anim1 = createAnimation(dot1, 0);
    const anim2 = createAnimation(dot2, 150);
    const anim3 = createAnimation(dot3, 300);

    anim1.start();
    anim2.start();
    anim3.start();

    return () => {
      anim1.stop();
      anim2.stop();
      anim3.stop();
    };
  }, []);

  return (
    <View
      style={{
        marginVertical: 6,
        paddingHorizontal: 4,
        flexDirection: "row",
        justifyContent: "flex-start",
      }}
    >
      <View
        style={{
          paddingHorizontal: 14,
          paddingVertical: 10,
          borderRadius: 18,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          flexDirection: "row",
          gap: 4,
          justifyContent: "center",
          alignItems: "center",
          minWidth: 60,
          height: 40,
        }}
      >
        <Animated.View
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: "#6366f1",
            transform: [{ translateY: dot1 }],
          }}
        />
        <Animated.View
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: "#6366f1",
            transform: [{ translateY: dot2 }],
          }}
        />
        <Animated.View
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: "#6366f1",
            transform: [{ translateY: dot3 }],
          }}
        />
      </View>
    </View>
  );
};
