import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { Animated, Text, TouchableOpacity, View } from 'react-native';
import BgBlobs from '../components/layout/bg-blobs';
import { useThemeColors } from '../context/theme-context';

export default function StartScreen() {
  const router = useRouter();
  const { colors, isDark } = useThemeColors();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 8, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 1600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1600, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View
      style={{
        flex: 1, backgroundColor: colors.bg,
        justifyContent: 'space-between', paddingVertical: 60,
        paddingHorizontal: 28, overflow: 'hidden',
      }}
    >
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <BgBlobs />

      {/* Hero content */}
      <Animated.View
        style={{
          flex: 1, alignItems: 'center', justifyContent: 'center',
          opacity: fadeAnim, transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
        }}
      >
        {/* Logo */}
        <Animated.View style={{ marginBottom: 32, transform: [{ scale: pulseAnim }] }}>
          <View
            style={{
              width: 100, height: 100, borderRadius: 50,
              borderWidth: 2, borderColor: '#6C63FF40',
              justifyContent: 'center', alignItems: 'center',
              backgroundColor: colors.surface,
            }}
          >
            <View
              style={{
                width: 72, height: 72, borderRadius: 36,
                backgroundColor: '#6C63FF20', justifyContent: 'center', alignItems: 'center',
                borderWidth: 1.5, borderColor: '#6C63FF60',
              }}
            >
              <Text style={{ fontSize: 32 }}>⏱</Text>
            </View>
          </View>
        </Animated.View>

        {/* Brand name */}
        <Text style={{ fontSize: 44, fontWeight: '800', color: colors.textPrimary, letterSpacing: -1.5, lineHeight: 46 }}>
          TimeTable
        </Text>
        <Text style={{ fontSize: 44, fontWeight: '800', color: colors.primary, letterSpacing: -1.5, lineHeight: 46, marginBottom: 16 }}>
          Scrap
        </Text>
        <Text style={{ fontSize: 15, color: colors.textSecondary, letterSpacing: 0.3, marginBottom: 32 }}>
          Your schedule, beautifully organized
        </Text>

        {/* Feature pills */}
        <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
          {['📅 Daily View', '🔔 Live Class', '👤 Profiles'].map((pill, i) => (
            <View
              key={i}
              style={{
                paddingHorizontal: 14, paddingVertical: 8,
                backgroundColor: colors.surfaceElevated, borderRadius: 20,
                borderWidth: 1, borderColor: colors.border,
              }}
            >
              <Text style={{ fontSize: 12, color: colors.textSecondary, fontWeight: '500' }}>{pill}</Text>
            </View>
          ))}
        </View>
      </Animated.View>

      {/* CTA Buttons */}
      <Animated.View style={{ gap: 14, opacity: fadeAnim }}>
        <TouchableOpacity
          style={{
            backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 18,
            paddingHorizontal: 24, flexDirection: 'row', alignItems: 'center',
            justifyContent: 'center', gap: 8,
            shadowColor: '#6C63FF', shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.4, shadowRadius: 16, elevation: 8,
          }}
          onPress={() => router.push('/register')}
          activeOpacity={0.85}
        >
          <Text style={{ fontSize: 17, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.3 }}>
            Create Account
          </Text>
          <Text style={{ fontSize: 18, color: '#FFFFFF', fontWeight: '700' }}>→</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            borderRadius: 16, paddingVertical: 18, alignItems: 'center', justifyContent: 'center',
            borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface,
          }}
          onPress={() => router.push('/login')}
          activeOpacity={0.85}
        >
          <Text style={{ fontSize: 17, fontWeight: '600', color: colors.textPrimary, letterSpacing: 0.3 }}>
            Sign In
          </Text>
        </TouchableOpacity>

        <Text style={{ fontSize: 12, color: colors.textMuted, textAlign: 'center', marginTop: 8 }}>
          By continuing, you agree to our{' '}
          <Text style={{ color: colors.primary, fontWeight: '600' }}>Terms of Service</Text>
        </Text>
      </Animated.View>
    </View>
  );
}