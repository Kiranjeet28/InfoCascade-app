import { Tabs } from 'expo-router';
import { Text, View } from 'react-native';
import AppIcon from '../../components/app-icon';
import { useProfile } from '../../context/profile-context';
import { useThemeColors } from '../../context/theme-context';

// Shows name initial when profile exists, otherwise emoji
function ProfileTabIcon({ focused }: { focused: boolean }) {
    const { colors } = useThemeColors();
    const { profile } = useProfile();
    const letter = profile?.name?.[0]?.toUpperCase();

    if (letter) {
        return (
            <View style={{
                width: 28, height: 28, borderRadius: 14,
                backgroundColor: focused ? colors.primary : colors.primary + '25',
                borderWidth: 1.5,
                borderColor: focused ? colors.primary : colors.primary + '60',
                justifyContent: 'center', alignItems: 'center',
            }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: focused ? '#fff' : colors.primary }}>
                    {letter}
                </Text>
            </View>
        );
    }
    return <AppIcon family="MaterialCommunityIcons" name="account" size={22} color={focused ? '#fff' : colors.primary} />;
}

function TabIcon({ name, family }: { name: string; family?: 'MaterialCommunityIcons' | 'Ionicons' | 'FontAwesome' }) {
    return <AppIcon name={name} family={family} size={24} />;
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
                options={{ title: 'Home', tabBarIcon: () => <TabIcon name="home" family="Ionicons" /> }}
            />
            <Tabs.Screen
                name="timetable"
                options={{ title: 'Timetable', tabBarIcon: () => <TabIcon name="calendar" family="Ionicons" /> }}
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