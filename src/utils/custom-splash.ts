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
 */
export async function showCustomSplash(): Promise<void> {
    try {
        await SplashScreen.showAsync();
    } catch (error) {
        console.warn('Failed to show splash screen:', error);
    }
}
