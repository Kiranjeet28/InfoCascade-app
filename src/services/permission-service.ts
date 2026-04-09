/**
 * Permission Service
 * Handles app permissions including push notifications
 */

import { registerForPushNotificationsAsync } from '../utils/notifications';

/**
 * Request all permissions sequentially
 * Currently focuses on push notification permissions
 */
export async function requestAllPermissionsSequentially(): Promise<void> {
    try {
        // Request push notification permissions
        await registerForPushNotificationsAsync();
        console.log('All permissions requested successfully');
    } catch (error) {
        console.error('Error requesting permissions:', error);
        throw error;
    }
}
