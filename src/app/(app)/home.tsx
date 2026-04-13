import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import AppIcon from "../../components/app-icon";
import BgBlobs from "../../components/layout/bg-blobs";
import { useProfile } from "../../context/profile-context";
import { useThemeColors } from "../../context/theme-context";
import { getEndTime, useLiveClass } from "../../hooks/Useliveclass";
import { useNextClassNotifications } from "../../hooks/use-next-class-notifications";
import { ClassSlot } from "../../types";
import { fetchJson } from "../../utils/api";

// ── Extract readable info from a ClassSlot ─────────────────────────────────
function slotInfo(cls: ClassSlot) {
  const isProject =
    cls.data.subject === "Minor Project" ||
    cls.data.subject === "Major Project";
  const isMandatory = cls.data.OtherDepartment === true && !isProject;

  const subject =
    cls.data.subject ??
    cls.data.entries?.[0]?.subject ??
    (isMandatory ? "Mandatory Course" : "Unknown");
  const room = cls.data.classRoom ?? cls.data.entries?.[0]?.classRoom ?? "";
  const teacher =
    (cls.data as any).teacherName ??
    (cls.data.entries?.[0] as any)?.teacherName ??
    (cls.data as any).teacher ??
    (cls.data.entries?.[0] as any)?.teacher ??
    (cls.data as any).teacher_name ??
    (cls.data.entries?.[0] as any)?.teacher_name ??
    "";
  const type =
    (cls.data as any).classType ??
    (cls.data.entries?.[0] as any)?.classType ??
    (cls.data as any).class_type ??
    (cls.data.entries?.[0] as any)?.class_type ??
    "";
  return {
    subject,
    room,
    teacher,
    type,
    time: cls.timeOfClass,
    end: getEndTime(cls.timeOfClass),
  };
}

// ── Current class card ─────────────────────────────────────────────────────
function CurrentClassCard({
  cls,
  onPress,
}: {
  cls: ClassSlot;
  onPress: () => void;
}) {
  const { colors } = useThemeColors();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const info = slotInfo(cls);

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.6,
          duration: 900,
          useNativeDriver: false,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: false,
        }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [pulseAnim]);

  const typeColors: Record<string, string> = {
    LAB: "#FF8C42",
    TUT: "#00D9AA",
    ELECTIVE: "#A78BFA",
    PROJECT: "#F472B6",
  };
  const typeColor = typeColors[info.type?.toUpperCase()] ?? colors.accent;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.88}
      style={{
        backgroundColor: colors.accent + "10",
        borderRadius: 20,
        padding: 20,
        marginBottom: 12,
        borderWidth: 1.5,
        borderColor: colors.accent + "40",
      }}
    >
      {/* Badge row */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginBottom: 14,
          gap: 8,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Animated.View
            style={{
              width: 9,
              height: 9,
              borderRadius: 5,
              backgroundColor: colors.accent,
              transform: [{ scale: pulseAnim }],
            }}
          />
          <Text
            style={{
              fontSize: 11,
              fontWeight: "800",
              color: colors.accent,
              letterSpacing: 1.2,
            }}
          >
            LIVE NOW
          </Text>
        </View>
        {info.type ? (
          <View
            style={{
              backgroundColor: typeColor + "20",
              borderRadius: 6,
              paddingHorizontal: 8,
              paddingVertical: 2,
              borderWidth: 1,
              borderColor: typeColor + "40",
            }}
          >
            <Text
              style={{
                fontSize: 10,
                fontWeight: "800",
                color: typeColor,
                letterSpacing: 0.8,
              }}
            >
              {info.type.toUpperCase()}
            </Text>
          </View>
        ) : null}
        <Text
          style={{
            marginLeft: "auto",
            fontSize: 12,
            color: colors.textMuted,
            fontWeight: "600",
          }}
        >
          {info.time} – {info.end}
        </Text>
      </View>

      {/* Subject */}
      <Text
        style={{
          fontSize: 20,
          fontWeight: "800",
          color: colors.textPrimary,
          letterSpacing: -0.5,
          marginBottom: 8,
        }}
      >
        {info.subject}
      </Text>

      {/* Room + teacher */}
      <View style={{ flexDirection: "row", gap: 16 }}>
        {info.room ? (
          <Text
            style={{
              fontSize: 13,
              color: colors.textSecondary,
              fontWeight: "500",
            }}
          >
            📍 {info.room}
          </Text>
        ) : null}
        {info.teacher ? (
          <Text
            style={{
              fontSize: 13,
              color: colors.textSecondary,
              fontWeight: "500",
            }}
          >
            Instructor: {info.teacher}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

// ── Next class card ────────────────────────────────────────────────────────
function NextClassCard({
  cls,
  onPress,
}: {
  cls: ClassSlot;
  onPress: () => void;
}) {
  const { colors } = useThemeColors();
  const info = slotInfo(cls);
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.88}
      style={{
        backgroundColor: colors.primary + "0D",
        borderRadius: 20,
        padding: 18,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: colors.primary + "30",
        flexDirection: "row",
        alignItems: "center",
        gap: 16,
      }}
    >
      {/* Time pill */}
      <View
        style={{
          backgroundColor: colors.primary + "18",
          borderRadius: 14,
          paddingVertical: 10,
          paddingHorizontal: 12,
          alignItems: "center",
          minWidth: 60,
          borderWidth: 1,
          borderColor: colors.primary + "30",
        }}
      >
        <Text
          style={{ fontSize: 13, fontWeight: "800", color: colors.primary }}
        >
          {info.time}
        </Text>
        <Text
          style={{
            fontSize: 10,
            color: colors.textMuted,
            fontWeight: "500",
            marginTop: 2,
          }}
        >
          {info.end}
        </Text>
      </View>

      {/* Info */}
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: 10,
            fontWeight: "800",
            color: colors.primary,
            letterSpacing: 1,
            marginBottom: 4,
          }}
        >
          NEXT UP
        </Text>
        <Text
          style={{
            fontSize: 16,
            fontWeight: "700",
            color: colors.textPrimary,
            marginBottom: 4,
          }}
        >
          {info.subject}
        </Text>
        <View style={{ flexDirection: "row", gap: 12 }}>
          {info.room ? (
            <Text style={{ fontSize: 12, color: colors.textSecondary }}>
              📍 {info.room}
            </Text>
          ) : null}
          {info.teacher ? (
            <Text style={{ fontSize: 12, color: colors.textSecondary }}>
              Instructor: {info.teacher}
            </Text>
          ) : null}
        </View>
      </View>
      <Text style={{ fontSize: 20, color: colors.textMuted }}>›</Text>
    </TouchableOpacity>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const router = useRouter();
  const { colors, isDark } = useThemeColors();
  const {
    profile,
    hasProfile,
    getDepartmentLabel,
    loading: profileLoading,
  } = useProfile();
  const { current, next, refresh: refreshLiveClass } = useLiveClass();
  const {
    isInitialized: notifInitialized,
    isEnabled: notifEnabled,
    setEnabled: setNotificationsEnabled,
    scheduleNotification,
    scheduledClass,
  } = useNextClassNotifications();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const [backendInfo, setBackendInfo] = useState<any>(null);
  const [backendLoading, setBackendLoading] = useState(true);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [scheduledCount, setScheduledCount] = useState(0);

  // Debug logging
  useEffect(() => {
    console.log("[HomeScreen] Component mounted/updated:", {
      profileLoading,
      hasProfile,
      profileName: profile?.name,
    });
  }, [profileLoading, hasProfile, profile]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: false,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 60,
        friction: 9,
        useNativeDriver: false,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  // Refresh "Next Class" data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      refreshLiveClass();
    }, [refreshLiveClass]),
  );

  // Fetch backend root info for status/debugging
  const fetchBackendInfo = useCallback(async () => {
    try {
      setBackendLoading(true);
      const res = await fetchJson("/");
      if (!res.ok) {
        setBackendError(`Server returned ${res.status}`);
        setBackendInfo(null);
      } else {
        const json = await res.json().catch(() => null);
        setBackendInfo(json ?? { ok: true });
        setBackendError(null);
      }
    } catch (e: any) {
      setBackendError(String(e?.message ?? e));
      setBackendInfo(null);
    } finally {
      setBackendLoading(false);
    }
  }, []);

  // Schedule notifications when next class data updates
  useEffect(() => {
    if (notifInitialized && notifEnabled && next) {
      // Get all classes for today to pass to notification scheduler
      const classesToSchedule = [current, next].filter(Boolean) as ClassSlot[];
      scheduleNotification(classesToSchedule);
    }
  }, [next, notifInitialized, notifEnabled, scheduleNotification, current]);

  // Refresh notifications for current session
  const refreshNotifications = useCallback(async () => {
    console.log("[HomeScreen] Refreshing notifications...");
    if (notifInitialized && notifEnabled && next) {
      const classesToSchedule = [current, next].filter(Boolean) as ClassSlot[];
      await scheduleNotification(classesToSchedule);
    }
  }, [notifInitialized, notifEnabled, next, scheduleNotification, current]);

  // Sync scheduled count with hook state
  useEffect(() => {
    if (notifEnabled && scheduledClass) {
      setScheduledCount(1);
    } else {
      setScheduledCount(0);
    }
  }, [notifEnabled, scheduledClass]);

  useEffect(() => {
    fetchBackendInfo();
  }, [fetchBackendInfo]);

  // Pull-to-refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([fetchBackendInfo(), refreshNotifications()]);
    } catch (e) {
      console.error("Refresh error:", e);
    } finally {
      setRefreshing(false);
    }
  }, [fetchBackendInfo, refreshNotifications]);

  // If profile is missing after profile store finished loading, redirect to login
  useEffect(() => {
    if (!profileLoading && !hasProfile) {
      router.replace("/(auth)/login");
    }
  }, [profileLoading, hasProfile, router]);

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";

  // Show loading screen while profile is loading
  if (profileLoading) {
    console.log("[HomeScreen] Rendering loading state");
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.bg,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <StatusBar style={isDark ? "light" : "dark"} />
        <BgBlobs />
        <ActivityIndicator size="large" color={colors.primary} />
        <Text
          style={{
            marginTop: 16,
            fontSize: 15,
            color: colors.textSecondary,
            fontWeight: "500",
          }}
        >
          Loading your profile...
        </Text>
      </View>
    );
  }

  console.log("[HomeScreen] Rendering main content, hasProfile=", hasProfile);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <BgBlobs />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 60,
          paddingBottom: 40,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
            progressBackgroundColor={colors.surface}
          />
        }
      >
        <Animated.View
          style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
        >
          <View style={{ minHeight: 100 }}>
            {/* ── Header Section ── */}
            <View style={{ marginBottom: 32 }}>
              <Text
                style={{
                  fontSize: 13,
                  color: colors.textSecondary,
                  fontWeight: "500",
                  marginBottom: 4,
                }}
              >
                {greeting} 👋
              </Text>
              <Text
                style={{
                  fontSize: 28,
                  fontWeight: "800",
                  color: colors.textPrimary,
                  letterSpacing: -0.8,
                  marginBottom: 2,
                }}
              >
                Welcome Back
              </Text>
              {profile?.name && (
                <Text
                  style={{
                    fontSize: 16,
                    color: colors.accent,
                    fontWeight: "600",
                  }}
                >
                  {profile.name}
                </Text>
              )}
            </View>

            {/* ── Header Controls ── */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                marginBottom: 28,
              }}
            >
              {/* Notification Bell */}
              {Platform.OS !== "web" && (
                <TouchableOpacity
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    backgroundColor: notifEnabled
                      ? colors.accent + "20"
                      : colors.surface,
                    borderWidth: 1.5,
                    borderColor: notifEnabled
                      ? colors.accent + "50"
                      : colors.border,
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                  onPress={() => {
                    if (notifEnabled) {
                      refreshNotifications();
                    } else {
                      setNotificationsEnabled(!notifEnabled);
                    }
                  }}
                  activeOpacity={0.75}
                >
                  <AppIcon
                    family="Ionicons"
                    name={notifEnabled ? "notifications" : "notifications-off"}
                    size={20}
                    color={notifEnabled ? colors.accent : colors.textSecondary}
                  />
                  {notifEnabled && scheduledCount > 0 && (
                    <View
                      style={{
                        position: "absolute",
                        top: -4,
                        right: -4,
                        backgroundColor: colors.accent,
                        borderRadius: 10,
                        minWidth: 20,
                        height: 20,
                        justifyContent: "center",
                        alignItems: "center",
                        borderWidth: 2,
                        borderColor: colors.bg,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 10,
                          fontWeight: "800",
                          color: "#fff",
                        }}
                      >
                        {scheduledCount}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              )}
              {/* Spacer to prevent layout shift */}
              <View style={{ width: 4 }} />
              {/* Profile Avatar */}
              <TouchableOpacity
                style={{
                  flex: 1,
                  height: 48,
                  borderRadius: 12,
                  backgroundColor: colors.surface,
                  borderWidth: 1.5,
                  borderColor: colors.border,
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingHorizontal: 16,
                }}
                onPress={() => router.push("/(app)/profile")}
                activeOpacity={0.75}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      backgroundColor: profile?.name
                        ? "#6C63FF20"
                        : colors.surfaceElevated,
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    {profile?.name ? (
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: "800",
                          color: "#6C63FF",
                        }}
                      >
                        {profile.name[0].toUpperCase()}
                      </Text>
                    ) : (
                      <AppIcon
                        family="MaterialCommunityIcons"
                        name="account"
                        size={16}
                        color={colors.textSecondary}
                      />
                    )}
                  </View>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "600",
                      color: colors.textPrimary,
                    }}
                  >
                    {profile?.name ? "My Profile" : "Set Profile"}
                  </Text>
                </View>
                <AppIcon
                  family="Ionicons"
                  name="chevron-forward"
                  size={18}
                  color={colors.textMuted}
                />
              </TouchableOpacity>
            </View>

            {/* ── Notification Banner (Android) ── */}
            {Platform.OS !== "web" && !notifEnabled && hasProfile && (
              <TouchableOpacity
                onPress={() => setNotificationsEnabled(true)}
                style={{
                  backgroundColor: colors.accent + "12",
                  borderRadius: 16,
                  padding: 14,
                  marginBottom: 20,
                  borderWidth: 1,
                  borderColor: colors.accent + "30",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <AppIcon
                  family="Ionicons"
                  name="notifications"
                  size={22}
                  color={colors.accent}
                />
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "700",
                      color: colors.textPrimary,
                      marginBottom: 2,
                    }}
                  >
                    Enable Class Notifications
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.textSecondary }}>
                    Get notified when your classes start
                  </Text>
                </View>
                <Text style={{ fontSize: 20, color: colors.accent }}>›</Text>
              </TouchableOpacity>
            )}

            {/* ── Now & Next Section removed ── */}

            {/* ── Main Action Tiles ── */}
            <View style={{ marginBottom: 28, gap: 12 }}>
              {/* Timetable Tile */}
              <TouchableOpacity
                onPress={() => router.push("/(app)/timetable")}
                activeOpacity={0.8}
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: 20,
                  padding: 20,
                  borderWidth: 1.5,
                  borderColor: "#6C63FF40",
                  overflow: "hidden",
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 16,
                  }}
                >
                  <View
                    style={{
                      width: 60,
                      height: 60,
                      borderRadius: 16,
                      backgroundColor: "#6C63FF15",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <AppIcon
                      family="Ionicons"
                      name="calendar"
                      size={28}
                      color="#6C63FF"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "700",
                        color: colors.textPrimary,
                        marginBottom: 4,
                      }}
                    >
                      Timetable
                    </Text>
                    <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                      View your class schedule
                    </Text>
                  </View>
                  <Text style={{ fontSize: 24, color: colors.textMuted }}>
                    ›
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Profile Tile */}
              <TouchableOpacity
                onPress={() => router.push("/(app)/profile")}
                activeOpacity={0.8}
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: 20,
                  padding: 20,
                  borderWidth: 1.5,
                  borderColor: "#00D9AA40",
                  overflow: "hidden",
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 16,
                  }}
                >
                  <View
                    style={{
                      width: 60,
                      height: 60,
                      borderRadius: 16,
                      backgroundColor: "#00D9AA15",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <AppIcon
                      family="MaterialCommunityIcons"
                      name="account-circle"
                      size={28}
                      color="#00D9AA"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "700",
                        color: colors.textPrimary,
                        marginBottom: 4,
                      }}
                    >
                      Profile
                    </Text>
                    <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                      Manage your information
                    </Text>
                  </View>
                  <Text style={{ fontSize: 24, color: colors.textMuted }}>
                    ›
                  </Text>
                </View>
              </TouchableOpacity>

              {/* AI Assistant Tile */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  Alert.alert(
                    "🤖 Coming Soon",
                    "AI Assistant feature will be available soon",
                  );
                }}
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: 20,
                  padding: 20,
                  borderWidth: 1.5,
                  borderColor: "#FF8C4240",
                  overflow: "hidden",
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 16,
                  }}
                >
                  <View
                    style={{
                      width: 60,
                      height: 60,
                      borderRadius: 16,
                      backgroundColor: "#FF8C4215",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <AppIcon
                      family="MaterialCommunityIcons"
                      name="robot"
                      size={28}
                      color="#FF8C42"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "700",
                        color: colors.textPrimary,
                        marginBottom: 4,
                      }}
                    >
                      AI Assistant
                    </Text>
                    <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                      Smart learning companion
                    </Text>
                  </View>
                  <Text style={{ fontSize: 24, color: colors.textMuted }}>
                    ›
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Classroom Navigation Tile */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  Alert.alert(
                    "📍 Coming Soon",
                    "Classroom Navigation feature will be available soon",
                  );
                }}
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: 20,
                  padding: 20,
                  borderWidth: 1.5,
                  borderColor: "#A78BFA40",
                  overflow: "hidden",
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 16,
                  }}
                >
                  <View
                    style={{
                      width: 60,
                      height: 60,
                      borderRadius: 16,
                      backgroundColor: "#A78BFA15",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <AppIcon
                      family="Ionicons"
                      name="navigate"
                      size={28}
                      color="#A78BFA"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "700",
                        color: colors.textPrimary,
                        marginBottom: 4,
                      }}
                    >
                      Classroom Navigation
                    </Text>
                    <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                      Find your classroom easily
                    </Text>
                  </View>
                  <Text style={{ fontSize: 24, color: colors.textMuted }}>
                    ›
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Test Button Tile */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  Alert.alert("Test Button", "Test button pressed!");
                }}
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: 20,
                  padding: 20,
                  borderWidth: 1.5,
                  borderColor: "#FF444440",
                  overflow: "hidden",
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 16,
                  }}
                >
                  <View
                    style={{
                      width: 60,
                      height: 60,
                      borderRadius: 16,
                      backgroundColor: "#FF444415",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <AppIcon
                      family="Ionicons"
                      name="flask"
                      size={28}
                      color="#FF4444"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "700",
                        color: colors.textPrimary,
                        marginBottom: 4,
                      }}
                    >
                      Test Button
                    </Text>
                    <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                      For testing purposes
                    </Text>
                  </View>
                  <Text style={{ fontSize: 24, color: colors.textMuted }}>
                    ›
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* ── Profile Card Section ── */}
            {hasProfile && (
              <>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "800",
                    color: colors.textPrimary,
                    marginBottom: 16,
                    letterSpacing: -0.5,
                  }}
                >
                  Profile Information
                </Text>
                {profile ? (
                  <View
                    style={{
                      backgroundColor: colors.surface,
                      borderRadius: 20,
                      padding: 20,
                      marginBottom: 20,
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        marginBottom: 16,
                      }}
                    >
                      <View
                        style={{
                          width: 56,
                          height: 56,
                          borderRadius: 14,
                          backgroundColor: "#6C63FF15",
                          borderWidth: 2,
                          borderColor: "#6C63FF40",
                          justifyContent: "center",
                          alignItems: "center",
                          marginRight: 14,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 24,
                            fontWeight: "800",
                            color: "#6C63FF",
                          }}
                        >
                          {profile.name ? profile.name[0].toUpperCase() : "?"}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            fontSize: 17,
                            fontWeight: "700",
                            color: colors.textPrimary,
                            marginBottom: 2,
                          }}
                        >
                          {profile.name}
                        </Text>
                        <Text
                          style={{ fontSize: 12, color: colors.textSecondary }}
                        >
                          Student ID • {getDepartmentLabel()}
                        </Text>
                      </View>
                    </View>

                    <View
                      style={{
                        height: 1,
                        backgroundColor: colors.border,
                        marginBottom: 16,
                      }}
                    />

                    <View style={{ marginBottom: 20 }}>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          marginBottom: 12,
                        }}
                      >
                        <View
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 10,
                            backgroundColor: "#6C63FF10",
                            justifyContent: "center",
                            alignItems: "center",
                            marginRight: 12,
                          }}
                        >
                          <AppIcon
                            family="MaterialCommunityIcons"
                            name="book-open"
                            size={20}
                            color="#6C63FF"
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{
                              fontSize: 12,
                              color: colors.textMuted,
                              fontWeight: "600",
                              marginBottom: 2,
                            }}
                          >
                            Department
                          </Text>
                          <Text
                            style={{
                              fontSize: 15,
                              fontWeight: "700",
                              color: colors.textPrimary,
                            }}
                          >
                            {getDepartmentLabel()}
                          </Text>
                        </View>
                      </View>

                      <View
                        style={{ flexDirection: "row", alignItems: "center" }}
                      >
                        <View
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 10,
                            backgroundColor: "#00D9AA10",
                            justifyContent: "center",
                            alignItems: "center",
                            marginRight: 12,
                          }}
                        >
                          <AppIcon
                            family="MaterialCommunityIcons"
                            name="users-group"
                            size={20}
                            color="#00D9AA"
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{
                              fontSize: 12,
                              color: colors.textMuted,
                              fontWeight: "600",
                              marginBottom: 2,
                            }}
                          >
                            Group
                          </Text>
                          <Text
                            style={{
                              fontSize: 15,
                              fontWeight: "700",
                              color: colors.textPrimary,
                            }}
                          >
                            {profile.group}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={{
                        backgroundColor: "#6C63FF15",
                        borderRadius: 12,
                        paddingVertical: 12,
                        paddingHorizontal: 16,
                        borderWidth: 1,
                        borderColor: "#6C63FF30",
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                      }}
                      onPress={() => router.push("/(app)/profile")}
                    >
                      <AppIcon
                        family="MaterialCommunityIcons"
                        name="pencil"
                        size={16}
                        color="#6C63FF"
                      />
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: "600",
                          color: "#6C63FF",
                        }}
                      >
                        Edit Profile
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View
                    style={{
                      backgroundColor: colors.surface,
                      borderRadius: 20,
                      padding: 24,
                      marginBottom: 20,
                      borderWidth: 1,
                      borderColor: colors.border,
                      alignItems: "center",
                    }}
                  >
                    <View
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: 16,
                        backgroundColor: colors.surfaceElevated,
                        justifyContent: "center",
                        alignItems: "center",
                        marginBottom: 16,
                      }}
                    >
                      <AppIcon
                        family="Ionicons"
                        name="information-circle"
                        size={32}
                        color={colors.textSecondary}
                      />
                    </View>
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "700",
                        color: colors.textPrimary,
                        marginBottom: 8,
                      }}
                    >
                      Complete Your Profile
                    </Text>
                    <Text
                      style={{
                        fontSize: 13,
                        color: colors.textSecondary,
                        textAlign: "center",
                        lineHeight: 19,
                        marginBottom: 20,
                      }}
                    >
                      Add your department and group information to get your
                      personalized timetable.
                    </Text>
                    <TouchableOpacity
                      style={{
                        backgroundColor: "#6C63FF",
                        borderRadius: 12,
                        paddingVertical: 12,
                        paddingHorizontal: 28,
                      }}
                      onPress={() => router.push("/(app)/profile")}
                    >
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: "700",
                          color: "#fff",
                        }}
                      >
                        Complete Now
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}
