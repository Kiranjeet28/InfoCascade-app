/**
 * notification-navigation.ts
 *
 * Centralized setup for notification deep linking and navigation
 *
 * This module handles:
 * - Storing the navigation reference globally
 * - Setting up notification listeners with navigation integration
 * - Handling deep links from notification data
 * - Managing app opened from killed state via notification
 *
 * Usage in your root navigator:
 * ```tsx
 * import { setNotificationNavigationRef } from '../notification-navigation';
 *
 * export function RootNavigator() {
 *   const navigationRef = useNavigationContainerRef();
 *
 *   useEffect(() => {
 *     if (navigationRef?.isReady?.()) {
 *       setNotificationNavigationRef(navigationRef);
 *     }
 *   }, [navigationRef]);
 *
 *   return (
 *     <NavigationContainer ref={navigationRef}>
 *       {/* your navigation structure */}
 *     </NavigationContainer>
 *   );
 * }
 * ```
 */

import { NavigationContainerRef } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Global reference to navigation
let navigationRef: NavigationContainerRef<any> | null = null;
let isDeepLinkingSetup = false;

/**
 * Set the navigation reference for notification deep linking
 * Call this from your root navigator after it's initialized
 *
 * @param ref - The navigation container ref
 *
 * @example
 * ```tsx
 * const navigationRef = useNavigationContainerRef();
 * useEffect(() => {
 *   if (navigationRef?.isReady?.()) {
 *     setNotificationNavigationRef(navigationRef);
 *   }
 * }, [navigationRef]);
 * ```
 */
export function setNotificationNavigationRef(ref: NavigationContainerRef<any>) {
  navigationRef = ref;
  console.log('[NotificationNavigation] Navigation reference set');

  // Setup listeners when navigation is ready
  if (navigationRef?.isReady?.() && !isDeepLinkingSetup) {
    setupDeepLinking();
  }
}

/**
 * Get the current navigation reference
 * Useful for testing or checking if navigation is available
 */
export function getNotificationNavigationRef() {
  return navigationRef;
}

/**
 * Check if navigation is ready for deep linking
 */
export function isNavigationReady(): boolean {
  return navigationRef?.isReady?.() ?? false;
}

/**
 * Internal: Setup all notification listeners with deep linking
 */
function setupDeepLinking() {
  if (!navigationRef?.isReady?.()) {
    console.warn('[NotificationNavigation] Navigation not ready for deep linking setup');
    return;
  }

  if (isDeepLinkingSetup) {
    console.log('[NotificationNavigation] Deep linking already setup');
    return;
  }

  try {
    console.log('[NotificationNavigation] Setting up notification deep linking...');

    // ───────────────────────────────────────────────────────────────────
    // 1. HANDLE NOTIFICATION RESPONSES (user taps notification)
    // ───────────────────────────────────────────────────────────────────
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data || {};
        const { title, body } = response.notification.request.content;

        console.log('[NotificationNavigation] User tapped notification:', {
          title,
          body,
          data,
        });

        if (navigationRef?.isReady?.()) {
          handleDeepLink(data);
        } else {
          console.warn('[NotificationNavigation] Navigation not ready for deep link');
        }
      }
    );

    // ───────────────────────────────────────────────────────────────────
    // 2. HANDLE APP OPENED FROM NOTIFICATION (killed state)
    // ───────────────────────────────────────────────────────────────────
    handleLastNotificationResponse();

    isDeepLinkingSetup = true;
    console.log('[NotificationNavigation] Deep linking setup complete');

    return () => {
      responseSubscription.remove();
    };
  } catch (error) {
    console.error('[NotificationNavigation] Error setting up deep linking:', error);
  }
}

/**
 * Handle the last notification response (app opened from killed state)
 * This runs once when the module initializes
 */
function handleLastNotificationResponse() {
  Notifications.getLastNotificationResponseAsync()
    .then((response) => {
      if (!response) {
        console.log('[NotificationNavigation] App not opened from notification');
        return;
      }

      const data = response.notification.request.content.data || {};
      const { title, body } = response.notification.request.content;

      console.log('[NotificationNavigation] App opened from notification (killed state):', {
        title,
        body,
        data,
      });

      // Small delay to ensure navigation container is ready
      const timer = setTimeout(() => {
        if (navigationRef?.isReady?.() && Object.keys(data).length > 0) {
          handleDeepLink(data);
        }
      }, 500);

      return () => clearTimeout(timer);
    })
    .catch((error) => {
      console.error('[NotificationNavigation] Error checking last notification:', error);
    });
}

/**
 * Internal: Execute deep link based on notification data
 * This is where you define how each notification type navigates
 */
function handleDeepLink(data: Record<string, any>) {
  if (!navigationRef?.isReady?.()) {
    console.warn('[NotificationNavigation] Navigation not ready for deep link execution');
    return;
  }

  try {
    console.log('[NotificationNavigation] Executing deep link:', data);

    // ───────────────────────────────────────────────────────────────────
    // CLASS NOTIFICATIONS
    // ───────────────────────────────────────────────────────────────────
    if (data.type === 'class-start' || data.type === 'class-reminder') {
      navigationRef.navigate('Timetable', {
        classSubject: data.subject,
        classTime: data.classTime,
        room: data.room,
        notificationType: data.type,
      });
      return;
    }

    // ───────────────────────────────────────────────────────────────────
    // TEST NOTIFICATIONS
    // ───────────────────────────────────────────────────────────────────
    if (data.type === 'test') {
      console.log('[NotificationNavigation] Test notification - no navigation');
      return;
    }

    // ───────────────────────────────────────────────────────────────────
    // GENERIC DEEP LINK SUPPORT
    // ───────────────────────────────────────────────────────────────────
    if (data.deepLink && typeof data.deepLink === 'string') {
      const [screen, params] = parseDeepLink(data.deepLink);
      navigationRef.navigate(screen, params);
      return;
    }

    // ───────────────────────────────────────────────────────────────────
    // URL-BASED DEEP LINKING
    // ───────────────────────────────────────────────────────────────────
    if (data.url && typeof data.url === 'string') {
      const [screen, params] = parseUrlDeepLink(data.url);
      if (screen) {
        navigationRef.navigate(screen, params);
      }
      return;
    }

    console.warn('[NotificationNavigation] No route found for notification data:', data);
  } catch (error) {
    console.error('[NotificationNavigation] Error executing deep link:', error);
  }
}

/**
 * Internal: Parse a deep link string into screen and params
 * Format: "ScreenName" or "ScreenName?param1=value1&param2=value2"
 *
 * @example
 * parseDeepLink("Timetable?subject=Math&time=10:00")
 * // Returns: ["Timetable", { subject: "Math", time: "10:00" }]
 */
function parseDeepLink(deepLink: string): [string, Record<string, any>] {
  const [screen, queryString] = deepLink.split('?');
  const params: Record<string, any> = {};

  if (queryString) {
    const pairs = queryString.split('&');
    pairs.forEach((pair) => {
      const [key, value] = pair.split('=');
      if (key && value) {
        params[decodeURIComponent(key)] = decodeURIComponent(value);
      }
    });
  }

  return [screen.trim(), params];
}

/**
 * Internal: Parse a URL-based deep link
 * Format: "infocascade://timetable?subject=Math&time=10:00"
 */
function parseUrlDeepLink(url: string): [string | null, Record<string, any>] {
  try {
    const parsed = new URL(url);

    // Define your URL schemes and routes here
    const routes: Record<string, string> = {
      'infocascade': 'Timetable',
      'class': 'Timetable',
    };

    const scheme = parsed.protocol.replace('://', '');
    const screen = routes[scheme];

    if (!screen) {
      console.warn('[NotificationNavigation] Unknown URL scheme:', scheme);
      return [null, {}];
    }

    const params: Record<string, any> = {};
    parsed.searchParams.forEach((value, key) => {
      params[key] = value;
    });

    return [screen, params];
  } catch (error) {
    console.error('[NotificationNavigation] Error parsing URL deep link:', error);
    return [null, {}];
  }
}

/**
 * Utility: Send a test notification to verify deep linking works
 * Useful for development and debugging
 */
export async function sendTestNotificationForDeepLinking() {
  if (Platform.OS === 'web') {
    console.log('[NotificationNavigation] Test notification not supported on web');
    return;
  }

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '✅ Test Notification',
        body: 'This is a test. Tap me to navigate to Timetable!',
        data: {
          type: 'test',
          subject: 'Test Class',
          classTime: '10:00',
          room: 'Lab 1',
        },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 2,
      },
    });

    console.log('[NotificationNavigation] Test notification scheduled');
  } catch (error) {
    console.error('[NotificationNavigation] Error sending test notification:', error);
  }
}

/**
 * Utility: Log all scheduled notifications for debugging
 */
export async function logAllScheduledNotifications() {
  if (Platform.OS === 'web') {
    console.log('[NotificationNavigation] Logging not supported on web');
    return;
  }

  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    console.log('[NotificationNavigation] === SCHEDULED NOTIFICATIONS ===');
    console.log(`Total: ${scheduled.length}`);

    scheduled.forEach((notif, index) => {
      console.log(`[${index}]`, {
        id: notif.identifier,
        title: notif.content.title,
        body: notif.content.body,
        data: notif.content.data,
        trigger: notif.trigger,
      });
    });

    console.log('[NotificationNavigation] === END ===');
  } catch (error) {
    console.error('[NotificationNavigation] Error logging notifications:', error);
  }
}

/**
 * Utility: Verify notification setup is complete
 * Returns health check information
 */
export async function checkNotificationHealth(): Promise<{
  navigationReady: boolean;
  deepLinkingSetup: boolean;
  scheduledCount: number;
  lastResponse: string;
}> {
  const health = {
    navigationReady: isNavigationReady(),
    deepLinkingSetup: isDeepLinkingSetup,
    scheduledCount: 0,
    lastResponse: 'N/A',
  };

  if (Platform.OS !== 'web') {
    try {
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      health.scheduledCount = scheduled.length;

      const lastResponse = await Notifications.getLastNotificationResponseAsync();
      if (lastResponse) {
        health.lastResponse = lastResponse.notification.request.content.title || 'Unknown';
      }
    } catch (error) {
      console.error('[NotificationNavigation] Error checking health:', error);
    }
  }

  console.log('[NotificationNavigation] Health check:', health);
  return health;
}

/**
 * Initialize notification navigation system
 * Call this from your app root after navigation is ready
 *
 * @param ref - Navigation container ref
 *
 * @example
 * ```tsx
 * useEffect(() => {
 *   initializeNotificationNavigation(navigationRef);
 * }, [navigationRef]);
 * ```
 */
export async function initializeNotificationNavigation(ref: NavigationContainerRef<any>) {
  setNotificationNavigationRef(ref);

  // Wait a moment for everything to be ready
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Log health check
  const health = await checkNotificationHealth();
  console.log('[NotificationNavigation] Initialization complete:', health);
}
