/**
 * Splash Screen Utilities
 * Manage custom splash screen visibility
 */

import * as SplashScreen from 'expo-splash-screen';

/**
 * Hide the custom splash screen with animation
 */
export async function hideCustomSplash(): Promise<void> {
    try {
        await SplashScreen.hideAsync();
    } catch (error) {
        console.warn('Failed to hide splash screen:', error);
    }
}

/**
 * Show the custom splash screen
 * (Note: showAsync is not available in current expo-splash-screen version)
 */
export async function showCustomSplash(): Promise<void> {
    try {
        // Current version of expo-splash-screen doesn't provide showAsync
        // This is a placeholder for future use
        console.log('Show splash screen requested');
    } catch (error) {
        console.warn('Failed to show splash screen:', error);
    }
}
