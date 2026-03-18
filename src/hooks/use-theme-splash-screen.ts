/**
 * Hook for managing theme-based splash screen
 * Automatically shows appropriate splash based on system theme
 */

import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { hideSplashScreen } from '../utils/splash-screen';

/**
 * Use this hook in your root layout to handle theme-aware splash screen
 * Automatically hides splash after a short delay for smooth transition
 */
export function useThemeSplashScreen() {
    const colorScheme = useColorScheme();

    useEffect(() => {
        // Hide splash after theme is determined
        // Small delay (300ms) ensures smooth visual transition
        const timer = setTimeout(() => {
            hideSplashScreen();
        }, 300);

        return () => clearTimeout(timer);
    }, [colorScheme]);

    return {
        isDark: colorScheme === 'dark',
        colorScheme: colorScheme ?? 'light',
    };
}
