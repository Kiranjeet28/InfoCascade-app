/**
 * Firebase Initialization Configuration
 * - Supports Web, Android APK, iOS, and Expo Go
 * - Uses google-services.json credentials
 */

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getMessaging } from 'firebase/messaging';

const firebaseConfig = {
    apiKey: 'AIzaSyASeJSVNWpwvNTrFh4Ud_SV3yetUg_oWiA',
    authDomain: 'info-765f3.firebaseapp.com',
    projectId: 'info-765f3',
    storageBucket: 'info-765f3.firebasestorage.app',
    messagingSenderId: '887025246114',
    appId: '1:887025246114:android:bad11d79c6c95c53425cfb',
};

let app: any;
let auth: any;
let messaging: any;

try {
    // Initialize Firebase
    app = initializeApp(firebaseConfig);
    console.log('[Firebase] Initialized successfully');

    // Initialize Auth
    auth = getAuth(app);
    console.log('[Firebase Auth] Initialized');

    // Initialize Cloud Messaging (for notifications)
    // Note: Web and Android require different setup
    try {
        messaging = getMessaging(app);
        console.log('[Firebase Messaging] Initialized');
    } catch (e) {
        console.warn('[Firebase Messaging] Not available in this environment:', (e as Error).message);
    }
} catch (error) {
    console.error('[Firebase] Initialization failed:', error);
}

export { app, auth, messaging };
export default app;
