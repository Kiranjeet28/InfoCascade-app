// src/app/(app)/_layout.tsx
import { Tabs, useRouter } from 'expo-router';
import { useThemeColors } from '../../context/theme-context';
import { Text, TouchableOpacity } from 'react-native';

function TabIcon({ emoji }: { emoji: string }) {
    return <Text style={{ fontSize: 18 }}>{emoji}</Text>;
}

export default function AppLayout() {
    const { colors } = useThemeColors();
    const router = useRouter();
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
            <Tabs.Screen 
                name="profile" 
                options={{ 
                    title: 'Profile', 
                    tabBarIcon: () => <TabIcon emoji="👤" />,
                    headerShown: true,
                    headerStyle: {
                        backgroundColor: colors.surface,
                    },
                    headerTitleStyle: {
                        color: colors.textPrimary,
                    },
                    headerRight: () => (
                        <TouchableOpacity onPress={() => console.log('Edit profile pressed')} style={{ marginRight: 15 }}>
                            <Text style={{ fontSize: 24, color: colors.primary }}>✎</Text>
                        </TouchableOpacity>
                    ),
                }} 
            />
        </Tabs>
    );
}