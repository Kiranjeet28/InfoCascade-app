import { Tabs } from 'expo-router';
import { Text, View } from 'react-native';
import { useThemeColors } from '../../context/theme-context';
import { useProfile } from '../../context/profile-context';

// Shows name initial when profile exists, otherwise emoji
function ProfileTabIcon({ focused }: { focused: boolean }) {
    const { colors } = useThemeColors();
    const { profile } = useProfile();
    const letter = profile?.name?.[0]?.toUpperCase();

    if (letter) {
        return (
            <View style={{
                width: 24, height: 24, borderRadius: 12,
                backgroundColor: focused ? colors.primary : colors.primary + '25',
                borderWidth: 1.5,
                borderColor: focused ? colors.primary : colors.primary + '60',
                justifyContent: 'center', alignItems: 'center',
            }}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: focused ? '#fff' : colors.primary }}>
                    {letter}
                </Text>
            </View>
        );
    }
    return <Text style={{ fontSize: 18 }}>👤</Text>;
}

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
                    borderTopWidth: 1,
                    height: 62,
                    paddingBottom: 8,
                },
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: colors.textMuted,
                tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
            }}
        >
            <Tabs.Screen
                name="home"
                options={{ title: 'Home', tabBarIcon: () => <TabIcon emoji="" /> }}
            />
            <Tabs.Screen
                name="timetable"
                options={{ title: 'Timetable', tabBarIcon: () => <TabIcon emoji="" /> }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profile',
                    tabBarIcon: ({ focused }) => <ProfileTabIcon focused={focused} />,
                }}
            />
        </Tabs>
    );
}