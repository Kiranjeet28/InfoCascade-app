/**
 * Splash Screen Management
 * Handles theme-based splash screen visibility with smooth transitions
 */

import * as SplashScreen from 'expo-splash-screen';
import { Appearance } from 'react-native';

// Keep splash screen visible by default
SplashScreen.preventAutoHideAsync().catch(() => {
    // Error may be thrown in development if splash screen already hidden
});

/**
 * Determine current theme (respects system preference)
 */
export function getCurrentTheme(): 'light' | 'dark' {
    const colorScheme = Appearance.getColorScheme();
    return colorScheme === 'dark' ? 'dark' : 'light';
}

/**
 * Hide splash screen with smooth transition
 */
export async function hideSplashScreen(): Promise<void> {
    try {
        await SplashScreen.hideAsync();
    } catch (error) {
        console.warn('Failed to hide splash screen:', error);
    }
}

