/**
 * Firebase Initialization Configuration
 * - Supports Web, Android APK, iOS, and Expo Go
 * - Uses google-services.json credentials
 */

import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { Platform } from "react-native";

const firebaseConfig = {
  apiKey: "AIzaSyASeJSVNWpwvNTrFh4Ud_SV3yetUg_oWiA",
  authDomain: "info-765f3.firebaseapp.com",
  projectId: "info-765f3",
  storageBucket: "info-765f3.firebasestorage.app",
  messagingSenderId: "887025246114",
  appId: "1:887025246114:android:bad11d79c6c95c53425cfb",
};

let app: any;
let auth: any;
let messaging: any;

// Check if Firebase is already initialized
const apps = getApps();

if (apps.length === 0) {
  try {
    // Initialize Firebase only if not already initialized
    app = initializeApp(firebaseConfig);
    console.log("[Firebase] Initialized successfully");

    // Initialize Auth
    auth = getAuth(app);
    console.log("[Firebase Auth] Initialized");

    // Initialize Cloud Messaging (for notifications)
    // Only available on native platforms (Android/iOS), not on web
    if (Platform.OS !== "web") {
      try {
        const { getMessaging } = require("firebase/messaging");
        messaging = getMessaging(app);
        console.log("[Firebase Messaging] Initialized");
      } catch (e) {
        console.warn(
          "[Firebase Messaging] Not available:",
          (e as Error).message,
        );
      }
    } else {
      console.log("[Firebase Messaging] Skipped on web platform");
    }
  } catch (error) {
    console.error("[Firebase] Initialization failed:", error);
  }
} else {
  // Use existing Firebase app
  app = apps[0];
  auth = getAuth(app);
  console.log("[Firebase] Using existing app instance");

  if (Platform.OS !== "web") {
    try {
      const { getMessaging } = require("firebase/messaging");
      messaging = getMessaging(app);
      console.log("[Firebase Messaging] Using existing messaging instance");
    } catch (e) {
      console.warn("[Firebase Messaging] Not available:", (e as Error).message);
    }
  }
}

export { app, auth, messaging };
export default app;
