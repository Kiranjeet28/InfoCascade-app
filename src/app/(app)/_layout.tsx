// src/app/(app)/_layout.tsx
import { Tabs } from 'expo-router';
import { useThemeColors } from '../../context/theme-context';
import { Text } from 'react-native';

function TabIcon({ emoji }: { emoji: string }) {
    return <Text style={{ fontSize: 18 }}>{emoji}</Text>;
}

export default function AppLayout() {
    const { colors } = useThemeColors();
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: colors.surface,
                    borderTopColor: colors.border,
                    height: 60,
                },
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: colors.textMuted,
                tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginBottom: 6 },
            }}
        >
            <Tabs.Screen name="home" options={{ title: 'Home', tabBarIcon: () => <TabIcon emoji="🏠" /> }} />
            <Tabs.Screen name="timetable" options={{ title: 'Timetable', tabBarIcon: () => <TabIcon emoji="📅" /> }} />
            <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: () => <TabIcon emoji="👤" /> }} />
            <Tabs.Screen name="about" options={{ title: 'About', tabBarIcon: () => <TabIcon emoji="ℹ️" /> }} />
        </Tabs>
    );
}