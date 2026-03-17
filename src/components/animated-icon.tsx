import { Colors } from '@/constants/theme';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Dimensions, StyleSheet, useColorScheme, View } from 'react-native';
import Animated, { Easing, Keyframe } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

const INITIAL_SCALE_FACTOR = Dimensions.get('screen').height / 90;
const DURATION = 600;
const screenWidth = Dimensions.get('window').width;
const isMobile = screenWidth < 768;

// Responsive sizes for mobile and web
const ICON_SIZE = isMobile ? 140 : 128;
const ICON_IMAGE_SIZE = isMobile ? 82 : 76;
const GLOW_SIZE = isMobile ? 220 : 201;

export function AnimatedSplashOverlay() {
  const [visible, setVisible] = useState(true);
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const themeColors = isDark ? Colors.dark : Colors.light;

  if (!visible) return null;

  const splashKeyframe = new Keyframe({
    0: {
      transform: [{ scale: INITIAL_SCALE_FACTOR }],
      opacity: 1,
    },
    20: {
      opacity: 1,
    },
    70: {
      opacity: 0,
      easing: Easing.elastic(0.7),
    },
    100: {
      opacity: 0,
      transform: [{ scale: 1 }],
      easing: Easing.elastic(0.7),
    },
  });

  return (
    <Animated.View
      entering={splashKeyframe.duration(DURATION).withCallback((finished) => {
        'worklet';
        if (finished) {
          scheduleOnRN(setVisible, false);
        }
      })}
      style={[styles.backgroundSolidColor, { backgroundColor: themeColors.bg }]}
    />
  );
}

const keyframe = new Keyframe({
  0: {
    transform: [{ scale: INITIAL_SCALE_FACTOR }],
  },
  100: {
    transform: [{ scale: 1 }],
    easing: Easing.elastic(0.7),
  },
});

const logoKeyframe = new Keyframe({
  0: {
    transform: [{ scale: 1.3 }],
    opacity: 0,
  },
  40: {
    transform: [{ scale: 1.3 }],
    opacity: 0,
    easing: Easing.elastic(0.7),
  },
  100: {
    opacity: 1,
    transform: [{ scale: 1 }],
    easing: Easing.elastic(0.7),
  },
});

const glowKeyframe = new Keyframe({
  0: {
    transform: [{ rotateZ: '0deg' }],
  },
  100: {
    transform: [{ rotateZ: '7200deg' }],
  },
});

export function AnimatedIcon() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const themeColors = isDark ? Colors.dark : Colors.light;

  return (
    <View style={styles.iconContainer}>
      <Animated.View entering={glowKeyframe.duration(60 * 1000 * 4)} style={styles.glow}>
        <Image style={styles.glow} source={require('@/assets/images/logo-glow.png')} />
      </Animated.View>

      <Animated.View entering={keyframe.duration(DURATION)} style={[styles.background, { backgroundColor: themeColors.primary }]} />
      <Animated.View style={styles.imageContainer} entering={logoKeyframe.duration(DURATION)}>
        <Image style={styles.image} source={require('@/assets/images/expo-logo.png')} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  imageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  glow: {
    width: GLOW_SIZE,
    height: GLOW_SIZE,
    position: 'absolute',
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: ICON_SIZE,
    height: ICON_SIZE,
    zIndex: 100,
  },
  image: {
    position: 'absolute',
    width: ICON_IMAGE_SIZE,
    height: ICON_IMAGE_SIZE * 0.93,
  },
  background: {
    borderRadius: 0,
    width: ICON_SIZE,
    height: ICON_SIZE,
    position: 'absolute',
  },
  backgroundSolidColor: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
  },
});
